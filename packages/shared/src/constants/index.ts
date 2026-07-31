import { NotificationType, ReviewTag, TransactionType } from "../types";

// ─── Notification Icons & Colors (shared across web + mobile) ─────────────
export const NOTIFICATION_TYPE_META: Record<
  string,
  { icon: string; colorClass: string }
> = {
  [NotificationType.EXCHANGE_REQUEST_RECEIVED]: {
    icon: "Inbox",
    colorClass: "purple",
  },
  [NotificationType.EXCHANGE_REQUEST_ACCEPTED]: {
    icon: "CheckCircle",
    colorClass: "green",
  },
  [NotificationType.EXCHANGE_TERMS_AGREED]: {
    icon: "CheckCircle",
    colorClass: "green",
  },
  [NotificationType.EXCHANGE_REQUEST_REJECTED]: {
    icon: "AlertCircle",
    colorClass: "red",
  },
  [NotificationType.EXCHANGE_REQUEST_CANCELLED]: {
    icon: "AlertCircle",
    colorClass: "red",
  },
  [NotificationType.EXCHANGE_CHAT_MESSAGE]: {
    icon: "MessageSquare",
    colorClass: "blue",
  },
  [NotificationType.SESSION_SCHEDULED]: {
    icon: "Calendar",
    colorClass: "amber",
  },
  [NotificationType.SESSION_REMINDER]: {
    icon: "Calendar",
    colorClass: "amber",
  },
  [NotificationType.SESSION_COMPLETED]: {
    icon: "CheckCircle",
    colorClass: "green",
  },
  [NotificationType.SESSION_CANCELLED]: {
    icon: "AlertCircle",
    colorClass: "red",
  },
  [NotificationType.POINTS_RECEIVED]: {
    icon: "Coins",
    colorClass: "emerald",
  },
  [NotificationType.POINTS_WITHDREW]: {
    icon: "Coins",
    colorClass: "emerald",
  },
  [NotificationType.REFERRAL_APPLIED]: {
    icon: "Sparkles",
    colorClass: "indigo",
  },
  [NotificationType.REVIEW_RECEIVED]: {
    icon: "Star",
    colorClass: "amber",
  },
  DEFAULT: {
    icon: "Bell",
    colorClass: "zinc",
  },
};

export function getNotificationMeta(type: string) {
  return NOTIFICATION_TYPE_META[type] ?? NOTIFICATION_TYPE_META.DEFAULT;
}

// ─── Exchange Status Colors ────────────────────────────────────────────────
export const EXCHANGE_STATUS_COLORS: Record<string, string> = {
  COMMITTED: "blue",
  IN_PROGRESS: "yellow",
  COMPLETED: "green",
  CANCELLED: "red",
};

export function getExchangeStatusColor(status: string): string {
  return EXCHANGE_STATUS_COLORS[status] ?? "zinc";
}

// ─── Request Status Colors ─────────────────────────────────────────────────
export const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: "amber",
  REJECTED: "red",
  COMMITTED: "green",
  CANCELLED: "zinc",
};

export function getRequestStatusColor(status: string): string {
  return REQUEST_STATUS_COLORS[status] ?? "zinc";
}

// ─── Transaction Type Config (shared across display layers) ────────────────
export interface TransactionMeta {
  labelKey: string;
  color: string;
  icon: string;
}

export const TRANSACTION_TYPE_META: Record<string, TransactionMeta> = {
  [TransactionType.PURCHASE]: {
    labelKey: "transaction.purchase",
    color: "green",
    icon: "Plus",
  },
  [TransactionType.ESCROW_LOCK]: {
    labelKey: "transaction.escrowHeld",
    color: "amber",
    icon: "Lock",
  },
  [TransactionType.ESCROW_RELEASE]: {
    labelKey: "transaction.escrowReleased",
    color: "blue",
    icon: "Unlock",
  },
  [TransactionType.EXCHANGE_COMMISSION]: {
    labelKey: "transaction.platformService",
    color: "violet",
    icon: "Zap",
  },
  [TransactionType.FACILITATION_FEE]: {
    labelKey: "transaction.facilitationFee",
    color: "orange",
    icon: "Banknote",
  },
  [TransactionType.PENALTY]: {
    labelKey: "transaction.penalty",
    color: "red",
    icon: "Zap",
  },
  [TransactionType.WITHDRAWAL]: {
    labelKey: "transaction.withdrawal",
    color: "pink",
    icon: "ArrowDownRight",
  },
  [TransactionType.REFERRAL_REWARD]: {
    labelKey: "transaction.referralReward",
    color: "indigo",
    icon: "Gift",
  },
  [TransactionType.REFERRAL_BONUS]: {
    labelKey: "transaction.referralBonus",
    color: "indigo",
    icon: "Sparkles",
  },
  [TransactionType.RECORDING_FEE]: {
    labelKey: "transaction.recordingFee",
    color: "crimson",
    icon: "Video",
  },
};

export function getTransactionMeta(type: string): TransactionMeta {
  return (
    TRANSACTION_TYPE_META[type] ?? {
      labelKey: type,
      color: "zinc",
      icon: "Coins",
    }
  );
}

// ─── Review Tags Display Labels ────────────────────────────────────────────
export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
  [ReviewTag.GREAT_TEACHER]: "Great Teacher",
  [ReviewTag.PATIENT]: "Patient",
  [ReviewTag.KNOWLEDGEABLE]: "Knowledgeable",
  [ReviewTag.ON_TIME]: "On Time",
  [ReviewTag.CLEAR_EXPLANATIONS]: "Clear Explanations",
  [ReviewTag.GOOD_COMMUNICATOR]: "Good Communicator",
  [ReviewTag.WELL_PREPARED]: "Well Prepared",
  [ReviewTag.WOULD_EXCHANGE_AGAIN]: "Would Exchange Again",
  [ReviewTag.NEEDS_IMPROVEMENT]: "Needs Improvement",
  [ReviewTag.UNRESPONSIVE]: "Unresponsive",
};

export function getReviewTagLabel(tag: ReviewTag | string): string {
  return REVIEW_TAG_LABELS[tag as ReviewTag] ?? tag.replace(/_/g, " ");
}

// ─── Day Names ─────────────────────────────────────────────────────────────
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── Notification Filter Categories ────────────────────────────────────────
export const EXCHANGE_NOTIFICATION_TYPES = [
  NotificationType.EXCHANGE_REQUEST_RECEIVED,
  NotificationType.EXCHANGE_REQUEST_ACCEPTED,
  NotificationType.EXCHANGE_REQUEST_REJECTED,
  NotificationType.EXCHANGE_REQUEST_CANCELLED,
  NotificationType.EXCHANGE_TERMS_PROPOSED,
  NotificationType.EXCHANGE_TERMS_AGREED,
  NotificationType.SESSION_SCHEDULED,
  NotificationType.SESSION_COMPLETED,
  NotificationType.SESSION_CANCELLED,
  NotificationType.SESSION_REMINDER,
];

export const POINTS_NOTIFICATION_TYPES = [
  NotificationType.POINTS_RECEIVED,
  NotificationType.POINTS_WITHDREW,
  NotificationType.REFERRAL_APPLIED,
];

// ─── Query Keys ────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  users: {
    me: ["users", "me"] as const,
    byId: (id: string) => ["users", id] as const,
    skills: ["users", "skills"] as const,
  },
  exchanges: {
    list: ["exchanges"] as const,
    byId: (id: string) => ["exchanges", id] as const,
    matches: ["exchanges", "matches"] as const,
    requests: ["exchanges", "requests"] as const,
    requestById: (id: string) => ["exchanges", "requests", id] as const,
  },
  points: {
    balance: ["points", "balance"] as const,
    transactions: ["points", "transactions"] as const,
    banks: ["points", "banks"] as const,
    feeConfig: ["points", "fee-config"] as const,
    rates: ["points", "rates"] as const,
  },
  notifications: {
    list: ["notifications"] as const,
    unreadCount: ["unread-notifications-count"] as const,
    preferences: ["notifications", "preferences"] as const,
  },
  reviews: {
    mine: ["reviews", "me"] as const,
    byUserId: (userId: string) => ["reviews", "user", userId] as const,
  },
  referrals: {
    code: ["referrals", "code"] as const,
    stats: ["referrals", "stats"] as const,
  },
  skills: {
    list: ["skills"] as const,
    categories: ["skills", "categories"] as const,
  },
  video: {
    session: (id: string) => ["video", "session", id] as const,
    token: (room: string) => ["video", "token", room] as const,
    estimate: (room: string) => ["video", "estimate", room] as const,
    chat: (sessionId: string) => ["video", "chat", sessionId] as const,
  },
} as const;

// ─── Exchange / Session progress helpers ───────────────────────────────────
export function calculateExchangeProgress(exchange: {
  requestedSkillSessions: number;
  offeredSkillSessions: number;
  completedSessions: number;
  receivedSkillId?: string | null;
}): number {
  const totalSessions =
    exchange.requestedSkillSessions +
    (exchange.receivedSkillId ? exchange.offeredSkillSessions : 0);
  if (totalSessions === 0) return 0;
  return Math.round((exchange.completedSessions / totalSessions) * 100);
}

export function calculateAverageRating(
  reviews: Array<{ rating: number }> | null | undefined
): number {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Number((sum / reviews.length).toFixed(1));
}

// ─── Onboarding completion checker ─────────────────────────────────────────
export interface OnboardingFlags {
  hasName: boolean;
  hasBio: boolean;
  hasImage: boolean;
  hasOfferingSkills: boolean;
  hasSeekingSkills: boolean;
}

export function isOnboardingComplete(flags: OnboardingFlags): boolean {
  return (
    flags.hasName &&
    flags.hasBio &&
    flags.hasImage &&
    flags.hasOfferingSkills &&
    flags.hasSeekingSkills
  );
}

export function onboardingProgress(flags: OnboardingFlags): number {
  const keys: (keyof OnboardingFlags)[] = [
    "hasName",
    "hasBio",
    "hasImage",
    "hasOfferingSkills",
    "hasSeekingSkills",
  ];
  const done = keys.filter((k) => flags[k]).length;
  return Math.round((done / keys.length) * 100);
}

// ─── Date / Time Formatting helpers (locale-agnostic primitives) ───────────
export function formatDateShort(dateStr: string, locale?: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale ?? "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeShort(
  dateStr: string,
  locale?: string
): string {
  try {
    return new Date(dateStr).toLocaleString(locale ?? "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ─── Referral code generator (front-end safe, server validates uniqueness) ─
export function generateReferralCode(nameOrSeed?: string): string {
  const seed = nameOrSeed?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4) ?? "SKIL";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seed.toUpperCase()}${rand}`;
}
