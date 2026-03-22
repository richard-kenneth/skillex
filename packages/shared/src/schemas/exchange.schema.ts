import * as v from "valibot";

export const CreateExchangeRequestSchema = v.strictObject({
  receiverId: v.pipe(v.string(), v.length(32, "Invalid receiver ID.")),
  requestedSkillId: v.pipe(v.string(), v.uuid("Invalid requested skill ID.")),
  offeredSkillId: v.optional(
    v.pipe(v.string(), v.uuid("Invalid offered skill ID.")),
  ),
  pointsProposal: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(0, "Points cannot be negative."),
    ),
    0,
  ),
  pointsPayerId: v.optional(
    v.pipe(v.string(), v.length(32, "Invalid payer ID.")),
  ),
  requestedSkillSessions: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1, "Must be at least 1 session."),
    ),
    1,
  ),
  requestedSkillDuration: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(15, "Minimum duration is 15 minutes."),
    ),
    60,
  ),
  offeredSkillSessions: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
    0,
  ),
  offeredSkillDuration: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
    0,
  ),
});

export type CreateExchangeRequestPayload = v.InferInput<
  typeof CreateExchangeRequestSchema
>;
export type CreateExchangeRequestDto = v.InferOutput<
  typeof CreateExchangeRequestSchema
>;

export const SendMessageSchema = v.strictObject({
  messageKey: v.picklist([
    "INTERESTED_IN_EXCHANGE",
    "PROPOSE_TERMS",
    "AGREE_TO_TERMS",
    "PROPOSE_SLOTS",
    "ACCEPT_SLOTS",
    "PROPOSE_SCHEDULE",
    "AVAILABLE_WEEKDAYS",
    "AVAILABLE_WEEKENDS",
    "NEED_MORE_TIME",
    "REQUEST_RESCHEDULE",
    "CONFIRM_SESSION",
    "SESSION_WENT_WELL",
    "SESSION_HAD_ISSUES",
    "READY_TO_COMPLETE",
    "THANKS_FOR_EXCHANGE",
  ]),
  pointsProposal: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(0, "Points cannot be negative."),
    ),
  ),
  pointsPayerId: v.optional(
    v.pipe(v.string(), v.length(32, "Invalid payer ID.")),
  ),
  requestedSkillSessions: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1, "Must be at least 1 session."),
    ),
  ),
  requestedSkillDuration: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(15, "Minimum duration is 15 minutes."),
    ),
  ),
  offeredSkillSessions: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
  ),
  offeredSkillDuration: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
  ),
});

export type SendMessagePayload = v.InferInput<typeof SendMessageSchema>;
export type SendMessageDto = v.InferOutput<typeof SendMessageSchema>;

export const ProposeSlotsSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.uuid("Invalid request ID.")),
  slots: v.pipe(
    v.array(
      v.strictObject({
        skillId: v.pipe(v.string(), v.uuid("Invalid skill ID.")),
        dayOfWeek: v.pipe(
          v.number(),
          v.integer(),
          v.minValue(0, "Day must be 0-6."),
          v.maxValue(6, "Day must be 0-6."),
        ),
        startTime: v.pipe(
          v.string(),
          v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm format."),
        ),
      }),
    ),
    v.minLength(1, "At least one slot is required."),
  ),
});

export type ProposeSlotsPayload = v.InferInput<typeof ProposeSlotsSchema>;
export type ProposeSlotsDto = v.InferOutput<typeof ProposeSlotsSchema>;

export const AcceptSlotsSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.uuid("Invalid request ID.")),
  slotIds: v.pipe(
    v.array(v.pipe(v.string(), v.uuid("Invalid slot ID."))),
    v.minLength(1, "At least one slot ID is required."),
  ),
});

export type AcceptSlotsPayload = v.InferInput<typeof AcceptSlotsSchema>;
export type AcceptSlotsDto = v.InferOutput<typeof AcceptSlotsSchema>;

export const ProposeTermsAndSlotsSchema = v.strictObject({
  requestedSkillSessions: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1, "Must be at least 1 session.")),
    1
  ),
  requestedSkillDuration: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(15, "Minimum duration is 15 minutes.")),
    60
  ),
  offeredSkillSessions: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
    0
  ),
  offeredSkillDuration: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Cannot be negative.")),
    0
  ),
  pointsProposal: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0, "Points cannot be negative.")),
    0
  ),
  pointsPayerId: v.optional(
    v.nullable(v.pipe(v.string(), v.length(32, "Invalid payer ID.")))
  ),
  slots: v.array(
    v.strictObject({
      skillId: v.pipe(v.string(), v.uuid("Invalid skill ID.")),
      dayOfWeek: v.pipe(
        v.number(),
        v.integer(),
        v.minValue(0, "Day must be 0-6."),
        v.maxValue(6, "Day must be 0-6.")
      ),
      startTime: v.pipe(
        v.string(),
        v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm format.")
      ),
    })
  ),
});

export type ProposeTermsAndSlotsPayload = v.InferInput<typeof ProposeTermsAndSlotsSchema>;
export type ProposeTermsAndSlotsDto = v.InferOutput<typeof ProposeTermsAndSlotsSchema>;

export const UpdateAvailabilitySchema = v.strictObject({
  days: v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6))),
  timeSlots: v.array(v.string()) // e.g. ["Morning (9am-12pm)", "Afternoon (1pm-5pm)"]
});

export type UpdateAvailabilityPayload = v.InferInput<typeof UpdateAvailabilitySchema>;
export type UpdateAvailabilityDto = v.InferOutput<typeof UpdateAvailabilitySchema>;

