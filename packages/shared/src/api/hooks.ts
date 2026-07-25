import type {
  UseMutationOptions,
  UseQueryOptions,
  QueryClient,
} from "@tanstack/react-query";
import type { ApiClient } from "./client";
import { QUERY_KEYS } from "../constants";
import type {
  Bank,
  CreateReviewPayload,
  Exchange,
  FeeConfig,
  MatchesResponse,
  Notification,
  NotificationPreferences,
  PointsTransaction,
  RecordingConsentPayload,
  RecordingEstimate,
  Review,
  Skill,
  SkillCategory,
  StartRecordingPayload,
  StopRecordingPayload,
  UpdateProfileDto,
  UserSkill,
} from "../types";
import type {
  CreateExchangeRequestPayload,
  ProposeSlotsDto,
  PurchasePointsDto,
  SendMessageDto,
  WithdrawPointsDto,
} from "../schemas";
import { useQuery, useMutation } from "@tanstack/react-query";

export interface CreateApiHooksOptions {
  client: ApiClient;
  queryClient: QueryClient;
}

/**
 * Shared TanStack Query hooks factory.
 * Accepts an ApiClient (from createApiClient) + QueryClient instance.
 * Returns pre-wired useQuery / useMutation hooks for the entire domain.
 *
 * Usage (web):
 *   const api = createApiClient({ baseUrl, withCredentials: true });
 *   const queryClient = new QueryClient();
 *   export const apiHooks = createApiHooks({ client: api, queryClient });
 *
 * Usage (mobile):
 *   const api = createApiClient({ baseUrl, getAuthHeaders: async () => ({ Authorization: ... }) });
 *   const queryClient = new QueryClient();
 *   export const apiHooks = createApiHooks({ client: api, queryClient });
 */
export function createApiHooks({ client, queryClient }: CreateApiHooksOptions) {
  // ─────────────────────────────────────────────────────────────────────
  //  Users
  // ─────────────────────────────────────────────────────────────────────
  function useCurrentUser<T = any>(
    options?: Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">
  ) {
    return useQuery<T, Error>({
      queryKey: QUERY_KEYS.users.me,
      queryFn: () => client.users.me(),
      ...(options as any),
    });
  }

  function useUserById<T = any>(
    id: string,
    options?: Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">
  ) {
    return useQuery<T, Error>({
      queryKey: QUERY_KEYS.users.byId(id),
      queryFn: () => client.users.byId(id),
      enabled: !!id,
      ...(options as any),
    });
  }

  function useUpdateProfile(
    options?: Omit<
      UseMutationOptions<any, Error, UpdateProfileDto>,
      "mutationFn"
    >
  ) {
    return useMutation<any, Error, UpdateProfileDto>({
      mutationFn: (payload) => client.users.updateProfile(payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useUploadImage(
    options?: Omit<UseMutationOptions<any, Error, FormData>, "mutationFn">
  ) {
    return useMutation<any, Error, FormData>({
      mutationFn: (fd) => client.users.uploadImage(fd),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Skills
  // ─────────────────────────────────────────────────────────────────────
  function useSkills(
    params?: { search?: string; categoryId?: string },
    options?: Omit<UseQueryOptions<Skill[], Error, Skill[]>, "queryKey" | "queryFn">
  ) {
    return useQuery<Skill[], Error>({
      queryKey: [QUERY_KEYS.skills.list, params?.search, params?.categoryId],
      queryFn: () => client.skills.list(params?.search, params?.categoryId),
      ...(options as any),
    });
  }

  function useSkillCategories(
    options?: Omit<
      UseQueryOptions<SkillCategory[], Error, SkillCategory[]>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<SkillCategory[], Error>({
      queryKey: QUERY_KEYS.skills.categories,
      queryFn: () => client.skills.categories(),
      ...(options as any),
    });
  }

  function useAddUserSkill(
    options?: Omit<
      UseMutationOptions<
        UserSkill,
        Error,
        { skillId: string; type: "OFFERING" | "SEEKING"; experienceLevel?: string }
      >,
      "mutationFn"
    >
  ) {
    return useMutation<UserSkill, Error, any>({
      mutationFn: (payload) => client.skills.addUserSkill(payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useRemoveUserSkill(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.skills.removeUserSkill(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Exchanges / Matches / Requests
  // ─────────────────────────────────────────────────────────────────────
  function useExchanges(
    options?: Omit<UseQueryOptions<Exchange[], Error, Exchange[]>, "queryKey" | "queryFn">
  ) {
    return useQuery<Exchange[], Error>({
      queryKey: QUERY_KEYS.exchanges.list,
      queryFn: () => client.exchanges.list(),
      ...(options as any),
    });
  }

  function useExchangeById(
    id: string,
    options?: Omit<UseQueryOptions<Exchange, Error, Exchange>, "queryKey" | "queryFn">
  ) {
    return useQuery<Exchange, Error>({
      queryKey: QUERY_KEYS.exchanges.byId(id),
      queryFn: () => client.exchanges.byId(id),
      enabled: !!id,
      ...(options as any),
    });
  }

  function useMatches(
    options?: Omit<
      UseQueryOptions<MatchesResponse, Error, MatchesResponse>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<MatchesResponse, Error>({
      queryKey: QUERY_KEYS.exchanges.matches,
      queryFn: () => client.exchanges.matches(),
      ...(options as any),
    });
  }

  function useRequests(
    options?: Omit<
      UseQueryOptions<any[], Error, any[]>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<any[], Error>({
      queryKey: QUERY_KEYS.exchanges.requests,
      queryFn: () => client.exchanges.requests(),
      ...(options as any),
    });
  }

  function useRequestById(
    id: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.exchanges.requestById(id),
      queryFn: () => client.exchanges.requestById(id),
      enabled: !!id,
      ...(options as any),
    });
  }

  function useCreateRequest(
    options?: Omit<
      UseMutationOptions<any, Error, CreateExchangeRequestPayload>,
      "mutationFn"
    >
  ) {
    return useMutation<any, Error, CreateExchangeRequestPayload>({
      mutationFn: (p) => client.exchanges.createRequest(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.requests });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.matches });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useAcceptRequest(
    options?: Omit<UseMutationOptions<Exchange, Error, string>, "mutationFn">
  ) {
    return useMutation<Exchange, Error, string>({
      mutationFn: (id) => client.exchanges.acceptRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.requests });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useRejectRequest(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.rejectRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.requests });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useCancelRequest(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.cancelRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.requests });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useSendRequestMessage(
    options?: Omit<
      UseMutationOptions<void, Error, { requestId: string; payload: SendMessageDto }>,
      "mutationFn"
    >
  ) {
    return useMutation<void, Error, { requestId: string; payload: SendMessageDto }>({
      mutationFn: ({ requestId, payload }) =>
        client.exchanges.sendMessage(requestId, payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.requests });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useProposeSlots(
    options?: Omit<UseMutationOptions<void, Error, ProposeSlotsDto>, "mutationFn">
  ) {
    return useMutation<void, Error, ProposeSlotsDto>({
      mutationFn: (p) => client.exchanges.proposeSlots(p),
      ...options,
    } as any);
  }

  function useMarkExchangeComplete(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.markComplete(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Points
  // ─────────────────────────────────────────────────────────────────────
  function usePointsBalance(
    options?: Omit<UseQueryOptions<number, Error, number>, "queryKey" | "queryFn">
  ) {
    return useQuery<number, Error>({
      queryKey: QUERY_KEYS.points.balance,
      queryFn: () => client.points.balance() as Promise<number>,
      ...(options as any),
    });
  }

  function usePointsTransactions(
    options?: Omit<
      UseQueryOptions<PointsTransaction[], Error, PointsTransaction[]>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<PointsTransaction[], Error>({
      queryKey: QUERY_KEYS.points.transactions,
      queryFn: () => client.points.transactions(),
      ...(options as any),
    });
  }

  function useBanks(
    options?: Omit<UseQueryOptions<Bank[], Error, Bank[]>, "queryKey" | "queryFn">
  ) {
    return useQuery<Bank[], Error>({
      queryKey: QUERY_KEYS.points.banks,
      queryFn: () => client.points.banks(),
      ...(options as any),
    });
  }

  function useFeeConfig(
    options?: Omit<UseQueryOptions<FeeConfig, Error, FeeConfig>, "queryKey" | "queryFn">
  ) {
    return useQuery<FeeConfig, Error>({
      queryKey: QUERY_KEYS.points.feeConfig,
      queryFn: () => client.points.feeConfig(),
      ...(options as any),
    });
  }

  function useRates(
    options?: Omit<
      UseQueryOptions<Record<string, number>, Error, Record<string, number>>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<Record<string, number>, Error>({
      queryKey: QUERY_KEYS.points.rates,
      queryFn: () => client.points.rates(),
      ...(options as any),
    });
  }

  function usePurchasePoints(
    options?: Omit<
      UseMutationOptions<any, Error, PurchasePointsDto>,
      "mutationFn"
    >
  ) {
    return useMutation<any, Error, PurchasePointsDto>({
      mutationFn: (p) => client.points.purchase(p),
      ...options,
    } as any);
  }

  function useWithdrawPoints(
    options?: Omit<
      UseMutationOptions<void, Error, WithdrawPointsDto>,
      "mutationFn"
    >
  ) {
    return useMutation<void, Error, WithdrawPointsDto>({
      mutationFn: (p) => client.points.withdraw(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.transactions });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useResolveAccount(
    options?: Omit<
      UseMutationOptions<any, Error, { accountNumber: string; bankCode: string }>,
      "mutationFn"
    >
  ) {
    return useMutation<any, Error, { accountNumber: string; bankCode: string }>({
      mutationFn: (p) => client.points.resolveAccount(p),
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Notifications
  // ─────────────────────────────────────────────────────────────────────
  function useNotifications(
    options?: Omit<
      UseQueryOptions<Notification[], Error, Notification[]>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<Notification[], Error>({
      queryKey: QUERY_KEYS.notifications.list,
      queryFn: () => client.notifications.list(),
      ...(options as any),
    });
  }

  function useMarkNotificationRead(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.notifications.markRead(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useMarkAllNotificationsRead(
    options?: Omit<UseMutationOptions<void, Error, void>, "mutationFn">
  ) {
    return useMutation<void, Error, void>({
      mutationFn: () => client.notifications.markAllRead(),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useDeleteNotification(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.notifications.delete(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useNotificationPreferences(
    options?: Omit<
      UseQueryOptions<NotificationPreferences, Error, NotificationPreferences>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<NotificationPreferences, Error>({
      queryKey: QUERY_KEYS.notifications.preferences,
      queryFn: () => client.notifications.preferences(),
      ...(options as any),
    });
  }

  function useUpdateNotificationPreferences(
    options?: Omit<
      UseMutationOptions<NotificationPreferences, Error, Partial<NotificationPreferences>>,
      "mutationFn"
    >
  ) {
    return useMutation<NotificationPreferences, Error, Partial<NotificationPreferences>>({
      mutationFn: (p) => client.notifications.updatePreferences(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.preferences });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Reviews
  // ─────────────────────────────────────────────────────────────────────
  function useMyReviews(
    options?: Omit<UseQueryOptions<Review[], Error, Review[]>, "queryKey" | "queryFn">
  ) {
    return useQuery<Review[], Error>({
      queryKey: QUERY_KEYS.reviews.mine,
      queryFn: () => client.reviews.mine(),
      ...(options as any),
    });
  }

  function useReviewsByUserId(
    userId: string,
    options?: Omit<UseQueryOptions<Review[], Error, Review[]>, "queryKey" | "queryFn">
  ) {
    return useQuery<Review[], Error>({
      queryKey: QUERY_KEYS.reviews.byUserId(userId),
      queryFn: () => client.reviews.byUserId(userId),
      enabled: !!userId,
      ...(options as any),
    });
  }

  function useCreateReview(
    options?: Omit<
      UseMutationOptions<Review, Error, CreateReviewPayload>,
      "mutationFn"
    >
  ) {
    return useMutation<Review, Error, CreateReviewPayload>({
      mutationFn: (p) => client.reviews.create(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reviews.mine });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Referrals
  // ─────────────────────────────────────────────────────────────────────
  function useReferralTracking(
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.referrals.tracking,
      queryFn: () => client.referrals.tracking(),
      ...(options as any),
    });
  }

  function useApplyReferralCode(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (code) => client.referrals.apply(code),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.referrals.tracking });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Video / LiveKit
  // ─────────────────────────────────────────────────────────────────────
  function useVideoSessionDetails(
    roomId: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.video.session(roomId),
      queryFn: () => client.video.sessionDetails(roomId),
      enabled: !!roomId,
      ...(options as any),
    });
  }

  function useVideoToken(
    room: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.video.token(room),
      queryFn: () => client.video.token(room),
      enabled: !!room,
      ...(options as any),
    });
  }

  function useRecordingEstimate(
    room: string,
    options?: Omit<UseQueryOptions<RecordingEstimate, Error, RecordingEstimate>, "queryKey" | "queryFn">
  ) {
    return useQuery<RecordingEstimate, Error>({
      queryKey: QUERY_KEYS.video.estimate(room),
      queryFn: () => client.video.record.estimate(room),
      enabled: !!room,
      ...(options as any),
    });
  }

  function useSubmitRecordingConsent(
    options?: Omit<
      UseMutationOptions<void, Error, RecordingConsentPayload>,
      "mutationFn"
    >
  ) {
    return useMutation<void, Error, RecordingConsentPayload>({
      mutationFn: (p) => client.video.record.consent(p),
      ...options,
    } as any);
  }

  function useStartRecording(
    options?: Omit<
      UseMutationOptions<{ approvedMinutes?: number }, Error, StartRecordingPayload>,
      "mutationFn"
    >
  ) {
    return useMutation<{ approvedMinutes?: number }, Error, StartRecordingPayload>({
      mutationFn: (p) => client.video.record.start(p),
      ...options,
    } as any);
  }

  function useStopRecording(
    options?: Omit<UseMutationOptions<void, Error, StopRecordingPayload>, "mutationFn">
  ) {
    return useMutation<void, Error, StopRecordingPayload>({
      mutationFn: (p) => client.video.record.stop(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.transactions });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useSessionChatMessages(
    exchangeSessionId: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.video.chat(exchangeSessionId),
      queryFn: () => client.video.chat.list(exchangeSessionId),
      enabled: !!exchangeSessionId,
      ...(options as any),
    });
  }

  function useSendSessionChatMessage(
    options?: Omit<
      UseMutationOptions<any, Error, { exchangeSessionId: string; message: string }>,
      "mutationFn"
    >
  ) {
    return useMutation<any, Error, { exchangeSessionId: string; message: string }>({
      mutationFn: ({ exchangeSessionId, message }) =>
        client.video.chat.send(exchangeSessionId, message),
      onSuccess: (...args) => {
        const [, vars] = args;
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.video.chat(vars.exchangeSessionId),
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    } as any);
  }

  function useMarkSessionChatRead(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (exchangeSessionId) =>
        client.video.chat.read(exchangeSessionId),
      ...options,
    } as any);
  }

  return {
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
  };
}

export type ApiHooks = ReturnType<typeof createApiHooks>;
