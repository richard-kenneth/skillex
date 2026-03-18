import * as v from "valibot";

export const CreateExchangeRequestSchema = v.strictObject({
  receiverId: v.pipe(v.string(), v.length(32, "Invalid receiver ID.")),
  requestedSkillId: v.pipe(v.string(), v.uuid("Invalid requested skill ID.")),
  offeredSkillId: v.optional(
    v.pipe(v.string(), v.uuid("Invalid offered skill ID.")),
  ),
  message: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "Message must be less than 500 characters."),
    ),
  ),
});

export type CreateExchangeRequestPayload = v.InferInput<
  typeof CreateExchangeRequestSchema
>;
export type CreateExchangeRequestDto = v.InferOutput<
  typeof CreateExchangeRequestSchema
>;
