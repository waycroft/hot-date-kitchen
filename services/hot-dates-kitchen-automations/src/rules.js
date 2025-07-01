import jsonata from "jsonata";
import logger from "./utils/logger";

export class NoSuitableRatesError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "NoSuitableRatesError";
  }
}

export default async function (easypostShipment) {
  // TODO: Implement rules
  // Until an interface for rules is designed, just hardcode the rules, which are:
  // This function should return an easypost rate ID

  const rates = easypostShipment.rates;

  if (Array.isArray(rates) && rates.length === 0) {
    throw new NoSuitableRatesError("Easypost shipment returned zero rates");
  }

  const zone = easypostShipment.usps_zone;

  logger.debug("Rates:\n" + JSON.stringify(rates, null, 2));

  let chosenRate;

  // Farzad's logic
  const ratesFor2DaysOrLess = await jsonata(
    "$[delivery_days<=2] ~> $sort(function($l, $r) {$number($l.rate) > $number($r.rate)})",
  ).evaluate(rates);

  logger.debug(
    "Rates for 2 days or less:\n" +
      JSON.stringify(ratesFor2DaysOrLess, null, 2),
  );

  if (ratesFor2DaysOrLess === undefined) {
    throw new NoSuitableRatesError("No rates for 2 days or less");
  }

  // 1. Only choose rates that have expected delivery of 2 days or less
  // 2. If the usps zone is 3 or higher, don't choose USPS as the carrier (zones 1-2 can use any carrier)
  if (zone > 2) {
    const nonUSPSRates = ratesFor2DaysOrLess.filter(
      (rate) => rate.carrier !== "USPS",
    );
    logger.debug(
      "Cheapest non-USPS rate:\n" + JSON.stringify(nonUSPSRates?.[0], null, 2),
    );
    chosenRate = nonUSPSRates?.[0]?.id;
  } else {
    chosenRate = ratesFor2DaysOrLess?.[0]?.id;
  }

  logger.debug(
    "Cheapest rate:\n" + JSON.stringify(ratesFor2DaysOrLess?.[0], null, 2),
  );

  if (chosenRate === undefined) {
    throw new NoSuitableRatesError(`chosenRate: ${chosenRate}`);
  }

  return chosenRate;
}
