import * as v from "valibot";

export const PurchasePointsSchema = v.strictObject({
  amount: v.pipe(
    v.number(),
    v.integer("Amount must be a whole number."),
    v.minValue(500, "Must purchase at least 500 points."),
    v.maxValue(100000, "Cannot purchase more than 100,000 points at once."),
  ),
  currency: v.optional(v.string()),
  redirectUrl: v.optional(v.pipe(v.string(), v.url())),
});

export type PurchasePointsPayload = v.InferInput<typeof PurchasePointsSchema>;
export type PurchasePointsDto = v.InferOutput<typeof PurchasePointsSchema>;

export const WithdrawPointsSchema = v.strictObject({
  amount: v.pipe(
    v.number(),
    v.integer("Amount must be a whole number."),
    v.minValue(100, "Must withdraw at least 100 points."),
  ),
  bankCode: v.pipe(v.string(), v.nonEmpty("Bank code is required.")),
  accountNumber: v.pipe(v.string(), v.nonEmpty("Account number is required.")),
});

export type WithdrawPointsPayload = v.InferInput<typeof WithdrawPointsSchema>;
export type WithdrawPointsDto = v.InferOutput<typeof WithdrawPointsSchema>;

export const CommitExchangeSchema = v.strictObject({
  sessionCount: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1, "At least 1 session required."),
      v.maxValue(20, "Cannot exceed 20 sessions."),
    ),
    1,
  ),
  sessionDuration: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(15, "Minimum session duration is 15 minutes."),
      v.maxValue(180, "Maximum session duration is 180 minutes."),
    ),
    60,
  ),
});

export type CommitExchangePayload = v.InferInput<typeof CommitExchangeSchema>;
export type CommitExchangeDto = v.InferOutput<typeof CommitExchangeSchema>;
