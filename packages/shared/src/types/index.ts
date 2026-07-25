// ─── Prisma Enum Re-exports (kept in sync with schema.prisma) ────────────────
export enum SkillType {
  OFFERING = "OFFERING",
  SEEKING = "SEEKING",
}

export enum RequestStatus {
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  COMMITTED = "COMMITTED",
  CANCELLED = "CANCELLED",
}

export enum ExchangeStatus {
  COMMITTED = "COMMITTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  CANCELLED = "CANCELLED",
}

export enum TransactionType {
  PURCHASE = "PURCHASE",
  ESCROW_LOCK = "ESCROW_LOCK",
  ESCROW_RELEASE = "ESCROW_RELEASE",
  EXCHANGE_COMMISSION = "EXCHANGE_COMMISSION",
  FACILITATION_FEE = "FACILITATION_FEE",
  PENALTY = "PENALTY",
  CONVERSION = "CONVERSION",
  WITHDRAWAL = "WITHDRAWAL",
  REFERRAL_REWARD = "REFERRAL_REWARD",
  REFERRAL_BONUS = "REFERRAL_BONUS",
  RECORDING_FEE = "RECORDING_FEE",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum ReferralStatus {
  PENDING = "PENDING",
  CONVERTED = "CONVERTED",
}

export enum SlotStatus {
  PROPOSED = "PROPOSED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export enum ReviewTag {
  GREAT_TEACHER = "GREAT_TEACHER",
  PATIENT = "PATIENT",
  KNOWLEDGEABLE = "KNOWLEDGEABLE",
  ON_TIME = "ON_TIME",
  CLEAR_EXPLANATIONS = "CLEAR_EXPLANATIONS",
  GOOD_COMMUNICATOR = "GOOD_COMMUNICATOR",
  WELL_PREPARED = "WELL_PREPARED",
  WOULD_EXCHANGE_AGAIN = "WOULD_EXCHANGE_AGAIN",
  NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
  UNRESPONSIVE = "UNRESPONSIVE",
}

export enum NotificationType {
  EXCHANGE_REQUEST_RECEIVED = "EXCHANGE_REQUEST_RECEIVED",
  EXCHANGE_REQUEST_ACCEPTED = "EXCHANGE_REQUEST_ACCEPTED",
  EXCHANGE_REQUEST_REJECTED = "EXCHANGE_REQUEST_REJECTED",
  EXCHANGE_REQUEST_CANCELLED = "EXCHANGE_REQUEST_CANCELLED",
  EXCHANGE_TERMS_PROPOSED = "EXCHANGE_TERMS_PROPOSED",
  EXCHANGE_TERMS_AGREED = "EXCHANGE_TERMS_AGREED",
  EXCHANGE_CHAT_MESSAGE = "EXCHANGE_CHAT_MESSAGE",
  SESSION_SCHEDULED = "SESSION_SCHEDULED",
  SESSION_COMPLETED = "SESSION_COMPLETED",
  SESSION_CANCELLED = "SESSION_CANCELLED",
  SESSION_REMINDER = "SESSION_REMINDER",
  POINTS_RECEIVED = "POINTS_RECEIVED",
  POINTS_WITHDREW = "POINTS_WITHDREW",
  REFERRAL_APPLIED = "REFERRAL_APPLIED",
  REVIEW_RECEIVED = "REVIEW_RECEIVED",
  SYSTEM = "SYSTEM",
}

// ─── Entity Types ────────────────────────────────────────────────────────────
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  sponsorName?: string | null;
  sponsorLogo?: string | null;
  sponsorUrl?: string | null;
  skills?: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: SkillCategory | null;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  type: SkillType;
  experienceLevel?: string | null;
  skill: Skill;
}

export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  bio?: string | null;
  createdAt: string;
  pointsBalance: number;
  preferredCurrency?: string | null;
  referralCode?: string | null;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  skills?: UserSkill[];
  receivedReviews?: Review[];
  givenReviews?: Review[];
}

export interface ExchangeUser {
  id: string;
  name: string | null;
  image: string | null;
  email?: string;
}

export interface ProposedSlot {
  id: string;
  requestId: string;
  proposerId: string;
  skillId: string;
  dayOfWeek: number;
  startTime: string;
  status: SlotStatus;
  skill?: Skill;
}

export interface ExchangeRequest {
  id: string;
  senderId: string;
  receiverId: string;
  requestedSkillId: string;
  offeredSkillId?: string | null;
  status: RequestStatus;
  pointsProposal: number;
  pointsPayerId?: string | null;
  pointsProposedBy?: string | null;
  requestedSkillSessions: number;
  requestedSkillDuration: number;
  offeredSkillSessions: number;
  offeredSkillDuration: number;
  senderAgreed: boolean;
  receiverAgreed: boolean;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: ExchangeUser;
  receiver?: ExchangeUser;
  requestedSkill?: Skill;
  offeredSkill?: Skill | null;
  exchange?: Exchange | null;
  proposedSlots?: ProposedSlot[];
}

export interface ExchangeSession {
  id: string;
  exchangeId: string;
  skillId: string;
  scheduledAt: string;
  completedAt?: string | null;
  duration: number;
  status: SessionStatus;
  skill?: Skill;
}

export interface Exchange {
  id: string;
  requestId: string;
  senderId: string;
  receiverId: string;
  taughtSkillId: string;
  receivedSkillId?: string | null;
  pointsAmount: number;
  pointsPayerId?: string | null;
  escrowLocked: boolean;
  requestedSkillSessions: number;
  requestedSkillDuration: number;
  offeredSkillSessions: number;
  offeredSkillDuration: number;
  completedSessions: number;
  status: ExchangeStatus;
  senderCompleted: boolean;
  receiverCompleted: boolean;
  committedAt: string;
  completedAt?: string | null;
  sender?: ExchangeUser;
  receiver?: ExchangeUser;
  taughtSkill?: Skill;
  receivedSkill?: Skill | null;
  sessions?: ExchangeSession[];
  reviews?: Review[];
}

export interface MatchUser {
  id: string;
  name: string | null;
  image: string | null;
  bio?: string | null;
  skills: UserSkill[];
  receivedReviews?: Review[];
}

export interface PerfectMatch {
  user: MatchUser;
  offeringSkill: Skill;
  seekingSkill: Skill;
  matchScore: number;
}

export interface PartialMatch {
  user: MatchUser;
  direction: "they_can_teach_you" | "you_can_teach_them";
  skill: Skill;
  matchScore: number;
}

export interface MatchesResponse {
  perfectMatches: PerfectMatch[];
  partialMatches: PartialMatch[];
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  exchangeId: string;
  rating: number;
  tags: ReviewTag[];
  createdAt: string;
  reviewer?: ExchangeUser;
  reviewee?: ExchangeUser;
  exchange?: {
    id: string;
    taughtSkill: { name: string };
    receivedSkill?: { name: string } | null;
  };
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: string | NotificationType;
  read: boolean;
  link?: string | null;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType | string;
  status: TransactionStatus | string;
  referenceId?: string | null;
  description?: string | null;
  fiatAmount?: number | null;
  fiatCurrency?: string | null;
  flwRef?: string | null;
  createdAt: string;
}

export interface Bank {
  id: number;
  code: string;
  name: string;
}

export interface FeeConfig {
  exchangeCommissionRate: number;
  facilitationFee: number;
  withdrawalSpread: number;
  minWithdrawalPoints: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: ReferralStatus;
  referrerRewarded: boolean;
  refereeRewarded: boolean;
  bonusAwarded: number;
  createdAt: string;
  convertedAt?: string | null;
  referrer?: ExchangeUser;
  referee?: ExchangeUser;
}

export interface SessionChatMessage {
  id: string;
  exchangeSessionId: string;
  senderId: string;
  message: string;
  timestamp: string;
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface ExchangeChatMessage {
  id: string;
  exchangeId: string;
  senderId: string;
  content?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: string;
  sender?: ExchangeUser;
}

export interface AppConfig {
  exchangeCommissionRate: number;
  facilitationFee: number;
  withdrawalSpread: number;
  minWithdrawalPoints: number;
  referralRewardReferrer: number;
  referralRewardReferee: number;
  referralBonusPerExchange: number;
  referralBonusCap: number;
  referralMonthlyCap: number;
  recordingPointsPerMinute: number;
}

export interface RecordingEstimate {
  rate: number;
  userBalance: number;
  maxAffordableMinutes: number;
  remainingSessionMinutes: number;
}

export interface VideoTokenResponse {
  token: string;
  url: string;
}

export interface SessionTiming {
  session: {
    id: string;
    scheduledAt: string;
    duration: number;
    endsAt: string;
  } | null;
}

export interface ResolveAccountResult {
  success: boolean;
  accountName?: string;
  message?: string;
}

export interface PurchaseInitiationResult {
  txRef: string;
  amount: number;
  fiatAmount: number;
  fiatCurrency: string;
  customer: {
    email: string;
    name: string;
    phone_number: string;
  };
  paymentLink?: string;
}
