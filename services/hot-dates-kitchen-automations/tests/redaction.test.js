import { test, expect } from "bun:test";
import mockFulfillmentOrder from "./mock-data/fulfillmentOrder";
import mockOrder from "./mock-data/order";
import { containsPII, redactPII } from "../src/utils/redactPII";

test("containsPII returns true if obj has PII", () => {
  const unredactedFulfillmentOrder = mockFulfillmentOrder;
  expect(containsPII(unredactedFulfillmentOrder.destination)).toBe(true);
});

test("redactFulfillmentOrder redacts sensitive data", () => {
  const fulfillmentOrder = mockFulfillmentOrder;
  const redactedFulfillmentOrder = redactPII(fulfillmentOrder);
  //console.debug(JSON.stringify(redactedFulfillmentOrder, null, 2))
  expect(containsPII(redactedFulfillmentOrder)).toBe(false);
  // sanity checks
  expect(redactedFulfillmentOrder.destination.address1).toBe("[REDACTED]");
  expect(redactedFulfillmentOrder.destination.email).toBe("[REDACTED]");
  expect(redactedFulfillmentOrder.destination.firstName).toBe("[REDACTED]");
});

test("redactOrder redacts sensitive data", () => {
  const order = mockOrder;
  const redactedOrder = redactPII(order);
  //console.debug(JSON.stringify(redactedOrder, null, 2))
  expect(containsPII(redactedOrder)).toBe(false);
  // sanity checks
  expect(redactedOrder.email).toBe("[REDACTED]");
  expect(redactedOrder.customer.defaultAddress.address1).toBe("[REDACTED]");
  expect(redactedOrder.paymentDetails.creditCardNumber).toBe("[REDACTED]");
});
