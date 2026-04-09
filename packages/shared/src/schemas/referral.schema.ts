import * as v from "valibot";

export const ApplyReferralSchema = v.strictObject({
  referralCode: v.pipe(
    v.string(),
    v.nonEmpty("Referral code is required."),
    v.minLength(6, "Referral code must be at least 6 characters."),
    v.maxLength(12, "Referral code must be at most 12 characters."),
  ),
});

export type ApplyReferralPayload = v.InferInput<typeof ApplyReferralSchema>;
export type ApplyReferralDto = v.InferOutput<typeof ApplyReferralSchema>;
