/**
 * Shared React Query hooks — produced by the platform-agnostic factory
 * from `@skil-ex2/shared`. Re-export these throughout the mobile app.
 */
import { createApiHooks } from '@skil-ex2/shared';
import { api } from './api-shared';
import { queryClient } from './query-client';

export const hooks = createApiHooks({ client: api, queryClient });

export const {
  // Users
  useCurrentUser,
  useUserById,
  useUpdateProfile,
  useUploadImage,
  // Skills
  useSkills,
  useSkillCategories,
  useAddUserSkill,
  useRemoveUserSkill,
  // Exchanges
  useExchanges,
  useExchangeById,
  useMatches,
  useRequests,
  useRequestById,
  useCreateRequest,
  useAcceptRequest,
  useRejectRequest,
  useCancelRequest,
  useSendRequestMessage,
  useProposeSlots,
  useMarkExchangeComplete,
  // Points
  usePointsBalance,
  usePointsTransactions,
  useBanks,
  useFeeConfig,
  useRates,
  usePurchasePoints,
  useWithdrawPoints,
  useResolveAccount,
  // Notifications
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  // Reviews
  useMyReviews,
  useReviewsByUserId,
  useCreateReview,
  // Referrals
  useReferralTracking,
  useApplyReferralCode,
  // Video
  useVideoSessionDetails,
  useVideoToken,
  useRecordingEstimate,
  useSubmitRecordingConsent,
  useStartRecording,
  useStopRecording,
  useSessionChatMessages,
  useSendSessionChatMessage,
  useMarkSessionChatRead,
} = hooks;
