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
  useProposeTermsAndSlots,
  useAcceptTermsAndSlots,
  useUpdateAvailability,
  useMarkExchangeComplete,
  useUpdateSessionStatus,
  useRecordingPlayback,
  useExchangeChatMessages,
  useSendExchangeChatMessage,
  useExchangeChatUploadUrl,
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
  useUpdateNotificationPreferences,
  // Reviews
  useMyReviews,
  useReviewsByUserId,
  useCreateReview,
  // Referrals
  useReferralCode,
  useReferralStats,
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
  // Uploads
  useGetUploadPresignedUrl,
  useConfirmAvatar,
} = hooks;
