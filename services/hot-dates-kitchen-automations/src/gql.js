// Collection of gql queries/mutations

// Get shop locations
export const Shop = {
	locations: `
    query GetShopLocations {
      locations(first: 5) {
        edges {
          node {
            id
            name
            address {
              address1
              address2
              city
              province
              zip
              country
              countryCode
              formatted
            }
          }
        }
      }
    }
    `,
}

export const Order = {
	byId: `
    query GetOrderById($id: ID!) {
      order(id: $id) {
        id
		createdAt
        name
        email
        phone
        processedAt
        shippingAddress {
          name
          company
          street1: address1
          street2: address2
          city
          province
          zip: zip
          country
          phone
        }
        fulfillmentOrders(first: 10) {
            nodes {
              id
              assignedLocation {
			  	name
                address1
                address2
                city
                province
                zip
                countryCode
                phone
              }
              orderName
			  orderProcessedAt
			  requestStatus
			  supportedActions {
			  	action
			  }
              status
              destination {
                email
                firstName
                lastName
                address1
                address2
                city
                province
                zip
                countryCode
                phone
              }
              lineItems(first: 25) {
                nodes {
                  id
				  totalQuantity
				  remainingQuantity
				  inventoryItemId
                  variant {
				  	displayName
				  }
                  sku
                  weight {
                    value
                    unit
                  }
                }
              }
          }
        }
      }
    }
  `,
}
export const Fulfillment = {
  create: `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!, $message: String) {
	  fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
	    fulfillment {
		  id
		  status
		  displayStatus
	    }
	    userErrors {
	      field
	      message
	    }
	  }
	}
  `,
}
