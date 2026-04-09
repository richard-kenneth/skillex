import Decimal from "decimal.js";

// Configure global settings to use Banker's Rounding standard
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN,
});

// Platform standard rating: 1 Point = $0.01 USD
export const POINT_TO_USD_RATE = 0.01;

// Internal fallback for zero-decimal currencies (used only if Intl logic fails)
const FALLBACK_ZERO_DECIMAL_CURRENCIES = [
  "NGN",
  "JPY",
  "KRW",
  "XAF",
  "XOF",
  "UGX",
  "TZS",
  "RWF",
  "BIF",
  "DJF",
  "GNF",
  "KMF",
  "PYG",
  "VND",
];

/**
 * Dynamically gets the standard number of fraction digits for any currency.
 * Evaluates the exchange rate to determine if fractions are mathematically worthless.
 */
export const getCurrencyDecimals = (
  currency: string,
  rate?: number,
): number => {
  // Smart Dynamic Check:
  // If 1 USD = > 50 units (meaning 1 unit is worth < $0.02), sub-units/kobo are safely ignored.
  if (rate !== undefined && rate > 50) {
    return 0;
  }

  try {
    return (
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    // Fallback if currency is unrecognized by Intl
    return FALLBACK_ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())
      ? 0
      : 2;
  }
};

/**
 * Applies smart precision rounding to a currency amount using decimal.js standard
 * - Leaves zero-decimal currencies as whole numbers to prevent gateway rejection.
 * - Perfectly handles Banker's Rounding (Round Half to Even) avoiding float bias.
 */
export const applyCurrencyPrecision = (
  amount: number,
  currency: string,
  rate?: number,
): number => {
  const decimals = getCurrencyDecimals(currency, rate);

  // Rely solely on decimal.js arithmetic for precise banking standard rounding
  return new Decimal(amount).toDecimalPlaces(decimals).toNumber();
};
