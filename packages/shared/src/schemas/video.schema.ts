import * as v from "valibot";

export const RecordingConsentSchema = v.strictObject({
  exchangeSessionId: v.pipe(v.string(), v.uuid("Invalid exchange session ID.")),
  consented: v.boolean(),
});

export type RecordingConsentPayload = v.InferInput<
  typeof RecordingConsentSchema
>;
export type RecordingConsentDto = v.InferOutput<typeof RecordingConsentSchema>;

export const StartRecordingSchema = v.strictObject({
  exchangeSessionId: v.pipe(v.string(), v.uuid("Invalid exchange session ID.")),
});

export type StartRecordingPayload = v.InferInput<typeof StartRecordingSchema>;
export type StartRecordingDto = v.InferOutput<typeof StartRecordingSchema>;

export const StopRecordingSchema = v.strictObject({
  exchangeSessionId: v.pipe(v.string(), v.uuid("Invalid exchange session ID.")),
});

export type StopRecordingPayload = v.InferInput<typeof StopRecordingSchema>;
export type StopRecordingDto = v.InferOutput<typeof StopRecordingSchema>;

export const SaveSessionChatSchema = v.strictObject({
  messages: v.pipe(
    v.array(
      v.strictObject({
        message: v.pipe(v.string(), v.minLength(1, "Message cannot be empty.")),
        timestamp: v.pipe(v.string(), v.isoTimestamp("Invalid timestamp.")),
      }),
    ),
    v.minLength(1, "At least one message is required."),
  ),
});

export type SaveSessionChatPayload = v.InferInput<typeof SaveSessionChatSchema>;
export type SaveSessionChatDto = v.InferOutput<typeof SaveSessionChatSchema>;

export const SendSessionChatMessageSchema = v.strictObject({
  message: v.pipe(v.string(), v.minLength(1, "Message cannot be empty.")),
});

export type SendSessionChatMessagePayload = v.InferInput<
  typeof SendSessionChatMessageSchema
>;
export type SendSessionChatMessageDto = v.InferOutput<
  typeof SendSessionChatMessageSchema
>;
