const mockFulfillmentOrder = {
  id: "123",
  assignedLocation: {
    address1: "123 Road Street",
    address2: "",
    city: "Date Town",
    state: "NY",
    zip: "47150",
    countryCode: "USA",
    phone: "666-1234",
  },
  orderName: "order",
  status: "Processing",
  destination: {
    email: "bobsmith1@protontmail.com",
    firstName: "bob",
    lastName: "smith",
    address1: "123 Avenue Blvd",
    address2: "Apt 3",
    city: "New Albany",
    state: "IN",
    zip: "47150",
    countryCode: "USA",
    phone: "555-1234",
  },
  lineItems: {
    nodes: [
      {
        id: 1,
        variantTitle: "hot dates",
        quantity: 2,
        price: 12.99,
        sku: "3883947324",
        weight: {
          value: 1,
          unit: 2,
        },
      },
      {
        id: 2,
        variantTitle: "warm dates",
        quantity: 1,
        price: 11.99,
        sku: "3883947325",
        weight: {
          value: 1,
          unit: 2,
        },
      },
    ],
  },
};

export default mockFulfillmentOrder;
