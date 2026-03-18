import * as v from "valibot";

export const ConfirmAvatarSchema = v.strictObject({
  key: v.pipe(
    v.string(),
    v.description("R2 key for the uploaded avatar"),
    v.check((input) => input.startsWith("avatars/"), "Invalid avatar key"),
  ),
});

export type ConfirmAvatarPayload = v.InferInput<typeof ConfirmAvatarSchema>;
export type ConfirmAvatarDto = v.InferOutput<typeof ConfirmAvatarSchema>;

export const GetPresignedUrlSchema = v.strictObject({
  fileName: v.pipe(v.string(), v.minLength(1, "fileName is required")),
  fileType: v.pipe(v.string(), v.minLength(1, "fileType is required")),
  type: v.optional(
    v.union([v.literal("avatar"), v.literal("document")]),
    "avatar",
  ),
});

export type GetPresignedUrlPayload = v.InferInput<typeof GetPresignedUrlSchema>;
export type GetPresignedUrlDto = v.InferOutput<typeof GetPresignedUrlSchema>;
