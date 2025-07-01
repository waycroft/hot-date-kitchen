// We should always validate that webhooks are coming from Shopify
import { timingSafeEqual } from 'node:crypto'

export function validateShopifyWebhookHmac(hmacHeader, bodyBuffer, webhookSecret) {
	return timingSafeEqual(
		Buffer.from(new Bun.CryptoHasher('sha256', webhookSecret).update(bodyBuffer).digest('base64')),
		Buffer.from(hmacHeader)
	)
}
