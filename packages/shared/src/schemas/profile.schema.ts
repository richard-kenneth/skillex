import * as v from "valibot";

const BetterAuthUpdateProfileSchema = v.strictObject({
  name: v.pipe(
    v.string(),
    v.minLength(2, "Name must be at least 2 characters."),
  ),
});
const IndirectUpdateProfileSchema = v.strictObject({
  image: v.optional(
    v.union([
      v.pipe(
        v.string(),
        v.url("Please enter a valid URL for the avatar image."),
      ),
      v.literal(""),
    ]),
  ),
});

export const UpdateProfileSchema = v.strictObject({
  bio: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "Bio must be less than 500 characters."),
    ),
  ),
});

export const ProfileFormSchema = v.strictObject({
  ...UpdateProfileSchema.entries,
  ...BetterAuthUpdateProfileSchema.entries,
  ...IndirectUpdateProfileSchema.entries,
});

export type ProfileFormPayload = v.InferInput<typeof ProfileFormSchema>;
export type UpdateProfileDto = v.InferOutput<typeof UpdateProfileSchema>;
