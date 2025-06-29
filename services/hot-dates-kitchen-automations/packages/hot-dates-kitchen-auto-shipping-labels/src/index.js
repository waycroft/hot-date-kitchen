import * as Sentry from "@sentry/bun";
import { ShopifyClient } from 'shopify'
import { EasyPostClient } from 'easypost'
import { EmailClient } from 'email'
import { Order, Fulfillment } from './gql'
import rules, { NoSuitableRatesError } from './rules'
import { createPackingSlipPdfs } from '../packing-slip/packing-slip-generator'
import constants from './constants'
import { DateTime } from 'luxon'
import shopifyCarriers from './carrier-mapping.json'
import logger from '../utils/logger.js'
import { redactPII } from "../utils/redactPII.js";
import retry from "../utils/retry.js";
import { extractNumberFromShopifyGuid } from "../utils/utils.js";
import { validateShopifyWebhookHmac } from "../utils/webhook-validation.js";

const env = Bun.env.NODE_ENV

if (env === 'production') {
	Sentry.init({
		dsn: Bun.env.SENTRY_DSN,
		sendDefaultPii: true,
	})
}

/**
 * @param {Request} req
 */
async function purchaseShippingLabelsHandler(reqBody) {
	const { admin_graphql_api_id: orderId } = reqBody

	// Instantiate Shopify client
	const shopify = new ShopifyClient()

	// Instantiate EasyPost client
	const easypost = new EasyPostClient()

	// Instantiate Email client
	const mailClient = new EmailClient()

	// Get order by id
	const order = (await shopify.gqlQuery(Order.byId, { id: orderId })).data.order
	logger.debug('order: ', JSON.stringify(redactPII(order), null, 2));

	// We'll be generating shipping labels for each fulfillment order, so we'll loop through each fulfillment order and generate a shipping label for each
	// Some info about Shopify fulfillment:
	// Each FulfillmentOrder represents items assigned to a specific location/service
	// Each Fulfillment represents an actual shipment going out
	// One Fulfillment can satisfy multiple FulfillmentOrders if they're from the same location and ship together
	// See the lifecycle of a FulfillmentOrder here: https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder
	const fulfillmentOrders = order.fulfillmentOrders.nodes
	logger.debug(`Order ${order.name} has ${fulfillmentOrders.length} fulfillmentOrders`)
	for (const fulfillmentOrder of fulfillmentOrders) {
		if (env === "production") {
			if (fulfillmentOrder.status === "CLOSED") {
				// Protects against duplicate webhooks (although the real way is to use the shopify header and a persistence layer)
				logger.debug("fulfillmentOrder already CLOSED, skipping")
				continue
			}
		} else {
			logger.debug(JSON.stringify(redactPII(fulfillmentOrder), null, 2));
		}

		const shipment = {
			from_address: {
				name: constants.fulfillment_centers.HAUSER,
				street1: fulfillmentOrder.assignedLocation.address1,
				street2: fulfillmentOrder.assignedLocation.address2,
				city: fulfillmentOrder.assignedLocation.city,
				state: fulfillmentOrder.assignedLocation.province,
				zip: fulfillmentOrder.assignedLocation.zip,
				country: fulfillmentOrder.assignedLocation.countryCode,
				phone: fulfillmentOrder.assignedLocation.phone,
			},
			to_address: {
				name: fulfillmentOrder.destination.firstName + ' ' + fulfillmentOrder.destination.lastName,
				street1: fulfillmentOrder.destination.address1,
				street2: fulfillmentOrder.destination.address2,
				city: fulfillmentOrder.destination.city,
				state: fulfillmentOrder.destination.province,
				zip: fulfillmentOrder.destination.zip,
				country: fulfillmentOrder.destination.countryCode,
				phone: fulfillmentOrder.destination.phone,
				email: fulfillmentOrder.destination.email,
			},
			parcel: {
				// Easypost parcel always requires weight in ounces.
				// TODO: Are dimensions required?
				mode: env === "production" ? 'production' : 'test',
				weight: fulfillmentOrder.lineItems.nodes.reduce((acc, item) => {
					if (item.weight.unit === 'POUNDS') {
						return acc + item.weight.value * 16
					} else if (item.weight.unit === 'OUNCES') {
						return acc + item.weight.value
					} else {
						throw new Error(`Item has weight specified in units ${item.weight.unit}. Please update the product's weight in the Admin in either pounds or ounces.`)
					}
				}, 0),
			},
		}
		//logger.debug('Shipment:\n' + JSON.stringify(shipment, null, 2));

		// The "rates" list returned by "create shipment" can sometimes return different results between calls, and some results might pass rules, while others don't. So we implement a gentle retry to see if we get a better roll of the die.
		// TODO: Are there repercussions for creating multiple shipments? I'm assuming the only real repercussion is *purchasing* a shipment...but worth looking into.
		let chosenRateId
		let shipmentResponse
		try {
			chosenRateId = await retry(async function() {
				// Create shipment
				shipmentResponse = await easypost.createShipment(shipment)
				logger.debug('Shipment response:\n' + JSON.stringify(shipmentResponse, null, 2));

				if (!shipmentResponse.rates) {
					throw new Error('Shipment response from Easypost returned no rates')
				}

				// Choose a rate
				return await rules(shipmentResponse)
		}, [NoSuitableRatesError], { maxRetries: 3, retryInterval: 30000 }) // Wait a while to see if new rates available (an immediate retry seems to return the same options, but waiting a while seems to do better)
		} catch(e) {
			// Email shop owner about no suitable rate found
			const shopifyOrderUrl = `${Bun.env.SHOPIFY_ADMIN_BASE_URL}/orders/${extractNumberFromShopifyGuid(order.id)}`
			const emailMessage = {
				from: Bun.env.FULFILLMENTS_FROM_EMAIL,
				to: env === "production" ? Bun.env.SHOP_OWNER_EMAIL : Bun.env.TEST_TO_EMAIL,
				subject: `Order ${order.name} - No suitable shipping rate found`,
				body: {
					text: `Order: ${order.name}
Available rates that were rejected:
${shipmentResponse?.rates ? shipmentResponse.rates.map(rate =>
	`${rate.carrier} ${rate.service}: $${rate.rate} (${rate.delivery_days} days)`
).join('\n') : 'No rates available'}

View order in Shopify Admin: ${shopifyOrderUrl}

Error: ${e.message}`
				}
			}

			if (Bun.env.SEND_LIVE_EMAILS === "true") {
				await mailClient.sendMail(emailMessage)
				logger.info(`Sent no suitable rate email for order ${order.name}`)
			} else {
				logger.debug("Would have sent no suitable rate email:")
				logger.debug(JSON.stringify(emailMessage, null, 2))
			}

			// Re-throw the error to maintain the existing error handling flow
			throw e
		}

		// Buy the rate
		const buyResponse = await easypost.buyShipment(shipmentResponse.id, chosenRateId)
		logger.debug('Buy response:\n' + JSON.stringify(redactPII(buyResponse), null, 2))

		// Create Shopify Fulfillment, which closes a FulfillmentOrder
		// https://shopify.dev/docs/apps/build/orders-fulfillment/order-management-apps/build-fulfillment-solutions
		// https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate
		// TODO: LATER: A multi-location concern, but: typically, each fulfillment order corresponds to a separate fulfillment, and multiple fulfillment orders usually arise from having multiple locations. However, there are edge cases where a single Fulfillment could be created to address multiple fulfillment orders, although these aren't that common. If those edge cases arise, the below conditional would need to be adjusted.
		if (fulfillmentOrder.supportedActions.map(obj => obj.action).includes("CREATE_FULFILLMENT")) {
			// Create fullfillment
			const fulfillment = {
				lineItemsByFulfillmentOrder: [
					{
						fulfillmentOrderId: fulfillmentOrder.id,
						// By not specifying fulfillmentOrderLineItems, we automatically fulfill the entire order (i.e. we do not perform a partial fulfillment).
					},
				],
				notifyCustomer: false,
				originAddress: {
					address1: fulfillmentOrder.assignedLocation.address1,
					address2: fulfillmentOrder.assignedLocation.address2,
					city: fulfillmentOrder.assignedLocation.city,
					countryCode: fulfillmentOrder.assignedLocation.countryCode,
					provinceCode: fulfillmentOrder.assignedLocation.province,
					zip: fulfillmentOrder.assignedLocation.zip,
				},
				trackingInfo: {
					company: shopifyCarriers[buyResponse.selected_rate.carrier], // enum, case sensitive: https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentTrackingInfo#supported-tracking-companies. Shopify will allow you to click in the UI to get shipping info if the correct company is set.
					number: buyResponse.tracker.tracking_code,
				},
			}
			if (env === "production") {
				await shopify.gqlQuery(Fulfillment.create, { fulfillment: fulfillment })
			} else {
				logger.debug(`Would have created Fulfillment for FulfillmentOrder ${fulfillmentOrder.id}:`)
				logger.debug(JSON.stringify(redactPII(fulfillment), null, 2))
			}
		}

		// Create packing slip pdf
		const pdfsReponse = await createPackingSlipPdfs([fulfillmentOrder], order);
		if (pdfsReponse.errors.length > 0) {
			logger.error(
				JSON.stringify({
					errors: pdfsReponse.errors,
				}, null, 2),
			)
			return
		}

		if (pdfsReponse.pdfs === undefined) {
			logger.error("`pdfsResponse.pdfs[]` is undefined, something went wrong")
		}

		logger.debug('Packing slip PDFs generated')
		logger.debug(pdfsReponse.pdfs.length)

		const packingSlipPdf = pdfsReponse.pdfs[0];
		// Debugging
		//await Bun.write('/Users/waycroft/Downloads/packingSlip.pdf', packingSlipPdf)

		// Email packing slip and shipping label
		const message = {
				from: Bun.env.FULFILLMENTS_FROM_EMAIL,
				to: env === "production" ? Bun.env.FULFILLMENTS_TO_EMAIL : Bun.env.TEST_TO_EMAIL,
				subject: "Hot Dates Kitchen: Fulfillment order",
				body: {
					text: `Shipping label link: ${buyResponse.postage_label.label_url}\n\nPacking slip attached.`
				},
				attachments: [
					{
						filename: `packing slip - ${DateTime.now().toISO()}.pdf`, content: Buffer.from(packingSlipPdf)
					}
				]
			}
		if (Bun.env.SEND_LIVE_EMAILS === "true") {
			await mailClient.sendMail(message)
		} else {
			logger.debug("Would have sent message (file contents replaced with length):")
			const debugMessage = {
				...message,
				attachments: message.attachments.map((att) => {
					return {
						filename: att.filename,
						contentLength: att.content ? att.content.length : null,
						href: att.href ? att.href : undefined
					}
				})
			}
			logger.debug(JSON.stringify(debugMessage, null, 2))
		}
	}
}

const server = Bun.serve({
	port: 3000,
	routes: {
		'/health': new Response('OK'),
		'/favicon.ico': new Response('Not found', { status: 404 }),
		'/hooks/purchase-shipping-labels': {
			POST: async (req) => {
				// Get raw body for HMAC validation
				const rawBody = await req.arrayBuffer()
				const bodyBuffer = Buffer.from(rawBody)

				// Validate Shopify webhook HMAC
				if (env === 'production') {
					const hmacHeader = req.headers.get('X-Shopify-Hmac-SHA256')

					if (!hmacHeader) {
						return new Response('Unauthorized', { status: 401 })
					}

					const webhookSecret = Bun.env.SHOPIFY_WEBHOOK_SECRET

					if (!validateShopifyWebhookHmac(hmacHeader, bodyBuffer, webhookSecret)) {
						logger.warn('Shopify webhook authentication failed')
						return new Response('Unauthorized', { status: 401 })
					}
				}

				// Parse JSON body after validation
				const body = JSON.parse(bodyBuffer.toString('utf8'))

				// For debugging
				//await Bun.write('sample-payload-2.json', JSON.stringify(body, null, 2))
				purchaseShippingLabelsHandler(body).catch(e => {
					logger.error(e)
					if (env === "production") {
						Sentry.captureException(e)
					}
				})
				return new Response('ok')
			},
		},
	},
})

if (server) {
	logger.info(`Bun server running on port ${server.port}`)
	logger.info(`Environment: ${env}`)
	if (Sentry.getClient() && Sentry.isEnabled()) logger.info('Sentry client established.')
	logger.info(`Shopify API base URL: ${Bun.env.SHOPIFY_API_BASE_URL_GQL}`)
	logger.info(`SEND_LIVE_EMAILS set to: ${Bun.env.SEND_LIVE_EMAILS}`)
}
