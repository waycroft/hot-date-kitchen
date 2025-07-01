const mockOrder = {
  id: 1234567890,
  email: "jane.doe@example.com",
  createdAt: "2025-06-13T12:00:00-04:00",
  totalPrice: "199.99",
  currency: "USD",
  financialStatus: "paid",
  fulfillmentStatus: "fulfilled",
  customer: {
    id: 987654321,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    phone: "+1234567890",
    note: "VIP customer",
    defaultAddress: {
      address1: "123 Maple Street",
      address2: "Apt 4B",
      city: "Brooklyn",
      province: "New York",
      provinceCode: "NY",
      country: "United States",
      countryCode: "US",
      zip: "11201",
      phone: "+1234567890",
      company: "Doe Industries",
      name: "Jane Doe"
    }
  },
  billingAddress: {
    firstName: "Jane",
    lastName: "Doe",
    address1: "123 Maple Street",
    address2: "Apt 4B",
    city: "Brooklyn",
    province: "New York",
    provinceCode: "NY",
    country: "United States",
    countryCode: "US",
    zip: "11201",
    phone: "+1234567890",
    name: "Jane Doe",
    company: "Doe Industries"
  },
  shippingAddress: {
    firstName: "Jane",
    lastName: "Doe",
    address1: "123 Maple Street",
    address2: "Apt 4B",
    city: "Brooklyn",
    province: "New York",
    provinceCode: "NY",
    country: "United States",
    countryCode: "US",
    zip: "11201",
    phone: "+1234567890",
    name: "Jane Doe",
    company: "Doe Industries"
  },
  lineItems: [
    {
      id: 111,
      title: "Custom Mug",
      quantity: 2,
      price: "24.99",
      sku: "MUG-CUSTOM",
      properties: [
        {
          name: "Engraving",
          value: "Happy Birthday John"
        }
      ]
    }
  ],
  note: "Leave package at side door",
  noteAttributes: [
    {
      name: "Gift",
      value: "Yes"
    },
    {
      name: "Gift Note",
      value: "Happy Anniversary!"
    }
  ],
  tags: "VIP, Repeat Buyer",
  paymentGatewayNames: ["shopify_payments"],
  paymentDetails: {
    creditCardBin: "424242",
    creditCardCompany: "Visa",
    creditCardNumber: "•••• •••• •••• 4242",
    expirationMonth: "12",
    expirationYear: "2027",
    name: "Jane Doe"
  },
  sourceName: "web"
};

export default mockOrder;