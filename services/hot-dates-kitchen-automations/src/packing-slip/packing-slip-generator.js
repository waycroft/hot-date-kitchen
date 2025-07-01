import logger from '../utils/logger'
import puppeteer from 'puppeteer';
import { validateFulfillmentOrder } from '../utils/validation';
import { htmlTemplate } from './packing-slip-template';
import { DateTime } from 'luxon';
import { getDefaultVariantDisplayName } from '../utils/utils';

const getName = (fulfillmentOrder) => `${fulfillmentOrder.destination.firstName} ${fulfillmentOrder.destination.lastName}`;

const getToAddress = (fulfillmentOrder) => `
${fulfillmentOrder.destination.address1}<br>
${fulfillmentOrder.destination.address2 ? fulfillmentOrder.destination.address2 + '<br>' : ''}
${fulfillmentOrder.destination.city} ${fulfillmentOrder.destination.province}, ${fulfillmentOrder.destination.zip} ${fulfillmentOrder.destination.countryCode}<br>
${fulfillmentOrder.destination.phone ? fulfillmentOrder.destination.phone + '<br>' : ''}
${fulfillmentOrder.destination.email}
`;

// do we need this for the packing slip?
const getFromAddress = (fulfillmentOrder) => `
${fulfillmentOrder.assignedLocation.address1}<br>
${fulfillmentOrder.assignedLocation.address2}{${fulfillmentOrder.assignedLocation.address2 ? '<br>' : ''}}
${fulfillmentOrder.assignedLocation.city} ${fulfillmentOrder.assignedLocation.province}, ${fulfillmentOrder.assignedLocation.zip} ${fulfillmentOrder.assignedLocation.countryCode}<br>
${fulfillmentOrder.assignedLocation.phone}
`;

// TODO: do we actually need the Order? Or can we pull everything we need from fulfillmentOrder fields
const createHtml = async (fulfillmentOrder, order, errors) => {
  const lineItems = fulfillmentOrder.lineItems.nodes;
  try {
    let htmlString = htmlTemplate;
    htmlString = htmlString
      .replace('{{ order_id }}', fulfillmentOrder.orderName)
	  // TODO: orderProcessedAt is not the same as the order's "createdAt" date. Will this be a problem?
      .replace('{{ order_date }}', DateTime.fromISO(fulfillmentOrder.orderProcessedAt).toLocaleString(DateTime.DATE_MED))
      .replace('{{ customer_name }}', getName(fulfillmentOrder))
      .replace('{{ customer_address }}', getToAddress(fulfillmentOrder));

    let tableRows = '';
    for (let i = 0; i < lineItems.length; i++) {
	  const displayName = getDefaultVariantDisplayName(lineItems[i].variant.displayName)
	  const newRow = `<tr>
        <td>${displayName}</td>
        <td>${lineItems[i].totalQuantity}</td>
      </tr>`
	  tableRows += newRow
	}

    htmlString = htmlString.replace('{{ table_body }}', tableRows);
    return htmlString;
  } catch (err) {
    logger.error(err)
    errors.push(err.message);
  }
};

const convertToPdf = async (htmlString, errors) => {
  try {
    const browser = await puppeteer.launch({
        // We can get away with this because we are NOT browsing the open web. Just creating PDFs.
        args: ['--no-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlString, { waitUntil: 'networkidle0' })
	// TODO: Will Hauser accept A4 size? Does it matter?
    const pdf = await page.pdf({ format: 'A4' })
    await browser.close();
    return pdf;
  } catch (err) {
    logger.error(err)
    errors.push(err.message);
  }
};

/**
 * @typedef CreatePdfsResponse
 * @property {Uint8Array[]} pdfs
 * @property {string[]} errors
 */
/**
 * Creates packing slip pdfs from a batch of fulfillmentOrders.
 * Returns { pdfs: Uint8Array[], errors: string[] }
 * @param {FulfillmentOrder[]} fulfillmentOrders
 * @param {Order} order
 * @returns {Promise<CreatePdfsResponse>}
 */

const createPackingSlipPdfs = async (fulfillmentOrders, order) => {
  const start = performance.now();
  const pdfs = [];
  const errors = [];
  let fulfillmentOrderCount = 0;
  for(let i=0;i<fulfillmentOrders.length;i++) {
    process.stdout.write(`\rProcessing packing slip: ${fulfillmentOrderCount+1}/${fulfillmentOrders.length}`);
    // check for missing required fields
    errors.push(
      ...validateFulfillmentOrder(fulfillmentOrders[i])
    );
    if (errors.length > 0) {
      errors.push(`Packing slip for order ${fulfillmentOrders[i].id} not processed.`);
      // required field missing, early out
      continue;
    }
    const htmlString = await createHtml(fulfillmentOrders[i], order, errors);
    pdfs.push(await convertToPdf(htmlString, errors));
    ++fulfillmentOrderCount;
  }
  const end = performance.now();
  logger.debug(`\nCreated ${fulfillmentOrderCount} packing slips in ${(end - start)/1000} seconds.`);
  return {
    pdfs,
    errors
  };
};

export {
  createPackingSlipPdfs
};
