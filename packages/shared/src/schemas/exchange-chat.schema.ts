import * as v from "valibot";

export const SendExchangeChatSchema = v.strictObject({
  content: v.optional(
    v.pipe(v.string(), v.minLength(1, "Message cannot be empty.")),
  ),
  fileKey: v.optional(v.string()),
  fileName: v.optional(v.string()),
  fileType: v.optional(v.string()),
});

export type SendExchangeChatPayload = v.InferInput<
  typeof SendExchangeChatSchema
>;
export type SendExchangeChatDto = v.InferOutput<typeof SendExchangeChatSchema>;

export const ExchangeChatUploadSchema = v.strictObject({
  fileName: v.pipe(v.string(), v.minLength(1, "File name is required.")),
  contentType: v.pipe(v.string(), v.minLength(1, "Content type is required.")),
});

export type ExchangeChatUploadPayload = v.InferInput<
  typeof ExchangeChatUploadSchema
>;
export type ExchangeChatUploadDto = v.InferOutput<
  typeof ExchangeChatUploadSchema
>;
