/**
 * Canonical PostHog Analytics Event Definitions
 * 
 * Shared across Next.js (web), Expo React Native (mobile), and NestJS (api).
 * Pure TypeScript, zero platform-specific dependencies.
 */

export const AnalyticsEvent = {
  // Auth
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Skills
  SKILL_ADDED: 'skill_added',
  SKILL_REMOVED: 'skill_removed',

  // Profile
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_AVATAR_UPLOADED: 'profile_avatar_uploaded',

  // Exchanges & Requests
  EXCHANGE_REQUEST_CREATED: 'exchange_request_created',
  EXCHANGE_TERMS_PROPOSED: 'exchange_terms_proposed',
  EXCHANGE_TERMS_ACCEPTED: 'exchange_terms_accepted',
  EXCHANGE_AVAILABILITY_UPDATED: 'exchange_availability_updated',
  EXCHANGE_REQUEST_REJECTED: 'exchange_request_rejected',
  EXCHANGE_REQUEST_CANCELLED: 'exchange_request_cancelled',
  EXCHANGE_MARKED_COMPLETE: 'exchange_marked_complete',
  EXCHANGE_REVIEW_SUBMITTED: 'exchange_review_submitted',
  SESSION_STATUS_UPDATED: 'session_status_updated',

  // Points & Payments
  POINTS_PURCHASE_INITIATED: 'points_purchase_initiated',
  POINTS_PURCHASE_COMPLETED: 'points_purchase_completed',
  POINTS_WITHDRAWAL_REQUESTED: 'points_withdrawal_requested',

  // Referrals
  REFERRAL_LINK_COPIED: 'referral_link_copied',
  REFERRAL_LINK_SHARED: 'referral_link_shared',

  // Video Sessions & Recording
  RECORDING_STARTED: 'recording_started',
  RECORDING_REQUESTED: 'recording_requested',
  RECORDING_STOPPED: 'recording_stopped',

  // Onboarding
  ONBOARDING_DISMISSED: 'onboarding_dismissed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Landing Page & Pre-launch
  WAITLIST_SIGNUP: 'waitlist_signup',
  PROFILE_SETUP_CLICKED: 'profile_setup_clicked',
  CATEGORY_TAB_CLICKED: 'category_tab_clicked',
  FAQ_EXPANDED: 'faq_expanded',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export interface AnalyticsEventProperties {
  // Auth
  [AnalyticsEvent.USER_SIGNED_UP]: { method: 'email' | 'google' | string };
  [AnalyticsEvent.USER_SIGNED_IN]: { method: 'email' | 'google' | string };
  [AnalyticsEvent.USER_SIGNED_OUT]: Record<string, never>;

  // Skills
  [AnalyticsEvent.SKILL_ADDED]: {
    skill_type: 'offer' | 'request' | string;
    category?: string;
  };
  [AnalyticsEvent.SKILL_REMOVED]: {
    skill_type: 'offer' | 'request' | string;
  };

  // Profile
  [AnalyticsEvent.PROFILE_UPDATED]: {
    has_name?: boolean;
    has_headline?: boolean;
    has_bio?: boolean;
    skills_count?: number;
  };
  [AnalyticsEvent.PROFILE_AVATAR_UPLOADED]: Record<string, never>;

  // Exchanges & Requests
  [AnalyticsEvent.EXCHANGE_REQUEST_CREATED]: {
    requested_skill?: string;
    offered_skill?: string;
    duration_minutes?: number;
  };
  [AnalyticsEvent.EXCHANGE_TERMS_PROPOSED]: {
    exchange_id?: string;
    duration_minutes?: number;
  };
  [AnalyticsEvent.EXCHANGE_TERMS_ACCEPTED]: {
    exchange_id?: string;
  };
  [AnalyticsEvent.EXCHANGE_AVAILABILITY_UPDATED]: {
    exchange_id?: string;
  };
  [AnalyticsEvent.EXCHANGE_REQUEST_REJECTED]: {
    request_id?: string;
  };
  [AnalyticsEvent.EXCHANGE_REQUEST_CANCELLED]: {
    request_id?: string;
  };
  [AnalyticsEvent.EXCHANGE_MARKED_COMPLETE]: {
    exchange_id: string;
    duration_minutes?: number;
  };
  [AnalyticsEvent.EXCHANGE_REVIEW_SUBMITTED]: {
    exchange_id: string;
    rating: number;
  };
  [AnalyticsEvent.SESSION_STATUS_UPDATED]: {
    status: string;
    exchange_id?: string;
  };

  // Points & Payments
  [AnalyticsEvent.POINTS_PURCHASE_INITIATED]: {
    points: number;
    amount?: number;
    currency?: string;
  };
  [AnalyticsEvent.POINTS_PURCHASE_COMPLETED]: {
    userId: string;
    points: number;
    txRef?: string;
    flwRef?: string;
    amount?: number;
    currency?: string;
  };
  [AnalyticsEvent.POINTS_WITHDRAWAL_REQUESTED]: {
    points: number;
    currency?: string;
  };

  // Referrals
  [AnalyticsEvent.REFERRAL_LINK_COPIED]: Record<string, never>;
  [AnalyticsEvent.REFERRAL_LINK_SHARED]: {
    share_method: 'native' | 'clipboard' | string;
  };

  // Video Sessions & Recording
  [AnalyticsEvent.RECORDING_STARTED]: {
    approved_minutes?: number;
  };
  [AnalyticsEvent.RECORDING_REQUESTED]: Record<string, never>;
  [AnalyticsEvent.RECORDING_STOPPED]: Record<string, never>;

  // Onboarding
  [AnalyticsEvent.ONBOARDING_DISMISSED]: {
    step?: string;
  };
  [AnalyticsEvent.ONBOARDING_COMPLETED]: {
    total_steps?: number;
    completed_steps?: number;
    skipped_steps?: number;
  };

  // Landing Page & Pre-launch
  [AnalyticsEvent.WAITLIST_SIGNUP]: {
    source: string;
    already_joined?: boolean;
  };
  [AnalyticsEvent.PROFILE_SETUP_CLICKED]: {
    source: 'hero' | 'footer' | string;
  };
  [AnalyticsEvent.CATEGORY_TAB_CLICKED]: {
    category: string;
  };
  [AnalyticsEvent.FAQ_EXPANDED]: {
    question_key: string;
  };
}
