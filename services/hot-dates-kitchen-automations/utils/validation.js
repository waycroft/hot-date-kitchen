/**
 * Returns an list of missing required fields
 * @param {fulfillmentOrder} fulfillmentOrders
 * @returns {string[]} errors
 */
export const validateFulfillmentOrder = (fulfillmentOrder) => {
  const errors = [];
  const requiredFields = [
    'id',
  ];

  errors.push(
    ...requiredFields.filter(
      (field) => !fulfillmentOrder[field])
        .map((field) => `${field} is missing in order ${fulfillmentOrder.id ?? 'Unknown'}.`)
  );

  const destination = fulfillmentOrder.destination;
  errors.push(
    ...validateDestination(destination)
  );

  const assignedLocation = fulfillmentOrder.assignedLocation;
  errors.push(
    ...validateAssignedLocation(assignedLocation)
  );

  const lineItems = fulfillmentOrder.lineItems.nodes;
  for (let i=0;i<lineItems.length;i++) {
    errors.push(
      ...validateLineItem(lineItems[i], fulfillmentOrder.id)
    );
  }

  // TODO: Do we need to ensure there is enough inventory? Or does Shopify do that automatically?

  return errors;
};

const validateDestination = (destination, orderId) => {
  const requiredFields = [
    'firstName',
    'lastName',
    'address1',
    'city',
    'province',
    'zip',
    'countryCode',
  ];

  return requiredFields.filter(
    (field) => !destination[field])
      .map((field) => `destination.${field} is missing in order ${orderId ?? 'Unknown'}.`)
}

const validateAssignedLocation = (assignedLocation, orderId) => {
  const requiredFields = [
    'address1',
    'city',
    'province',
    'zip',
    'countryCode',
  ];

  return requiredFields.filter(
    (field) => !assignedLocation[field])
      .map((field) => `assignedLocation.${field} is missing in order ${orderId ?? 'Unknown'}.`)
}

// TODO: Consider what fields could be missing (and thus need to be validated) vs which fields we'll invariably expect
const validateLineItem = (lineItem, orderId) => {
  const requiredFields = []

  return requiredFields.filter((field) => !lineItem[field])
    .map((field) => `${field} is missing in line item ${lineItem.id || 'Unknown'} in order ${orderId || 'Unknown'}`);
};

