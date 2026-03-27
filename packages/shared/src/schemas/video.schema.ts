import * as v from "valibot";

export const RecordingConsentSchema = v.strictObject({
  exchangeSessionId: v.pipe(v.string(), v.uuid("Invalid exchange session ID.")),
  consented: v.boolean(),
});

export type RecordingConsentPayload = v.InferInput<typeof RecordingConsentSchema>;
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
