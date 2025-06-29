# TODO

- [ ] Buy response: "phoneNumber: none is not an allowed value" returned from Easypost, supposedly because phone was not provided by customer at Shopify checkout?

## Deployment
- [ ] Pre-flight: [Shopify webhooks best practices](https://shopify.dev/docs/apps/build/webhooks/best-practices)
- [ ] Deploy to EC2

## App
- [ ] Order cancellations: is automation required for cancelling fulfillment?
- [ ] Merchant-managed vs third-party fulfillment: Technically Hot Date Kitchen uses 3p fulfillment, and ought to be making a "fulfillment request", but internally, we assign our 3p provider as a "merchant-managed" location in Shopify. Will this cause major issues, such as when our fulfillment provider rejects a fulfillment request?

# LATER

- [ ] Logic for orders with multiple fulfillment locations
