import * as v from "valibot";

export const PurchasePointsSchema = v.strictObject({
  amount: v.pipe(
    v.number(),
    v.integer("Amount must be a whole number."),
    v.minValue(1, "Must purchase at least 1 point."),
    v.maxValue(10000, "Cannot purchase more than 10,000 points at once."),
  ),
});

export type PurchasePointsPayload = v.InferInput<typeof PurchasePointsSchema>;
export type PurchasePointsDto = v.InferOutput<typeof PurchasePointsSchema>;

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
  pointsAmount: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(0, "Points amount cannot be negative."),
    ),
    0,
  ),
  completionCriteria: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "Completion criteria must be under 500 characters."),
    ),
  ),
});

export type CommitExchangePayload = v.InferInput<typeof CommitExchangeSchema>;
export type CommitExchangeDto = v.InferOutput<typeof CommitExchangeSchema>;
