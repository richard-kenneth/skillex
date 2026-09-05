import * as v from "valibot";

export const JoinWaitlistSchema = v.strictObject({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Email is required."),
    v.email("Please provide a valid email address."),
  ),
  name: v.optional(v.pipe(v.string(), v.trim())),
  source: v.optional(v.string()),
});

export type JoinWaitlistPayload = v.InferInput<typeof JoinWaitlistSchema>;
export type JoinWaitlistDto = v.InferOutput<typeof JoinWaitlistSchema>;
