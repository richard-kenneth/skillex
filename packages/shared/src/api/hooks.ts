import type {
  QueryClient,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import type {
  CreateExchangeRequestPayload,
  CreateReviewPayload,
  ProposeSlotsDto,
  ProposeTermsAndSlotsDto,
  UpdateAvailabilityDto,
} from "../schemas/exchange.schema";
import { SendMessageDto } from "../schemas/exchange.schema";
import { PurchasePointsDto, WithdrawPointsDto } from "../schemas/points.schema";
import type { UpdateProfileDto } from "../schemas/profile.schema";
import { AddSkillDto } from "../schemas/skills.schema";
import type {
  RecordingConsentPayload,
  StartRecordingPayload,
  StopRecordingPayload,
} from "../schemas/video.schema";
import type {
  Bank,
  Exchange,
  ExchangeRequest,
  FeeConfig,
  MatchesResponse,
  Notification,
  NotificationPreferences,
  PointsTransaction,
  RecordingEstimate,
  Review,
  SessionChatHistory,
  Skill,
  SkillCategory,
  UserSkill,
} from "../types";
import type { ApiClient } from "./client";

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
    options?: Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">,
  ) {
    return useQuery<T, Error>({
      queryKey: QUERY_KEYS.users.me,
      queryFn: () => client.users.me(),
      ...options,
    });
  }

  function useUserById<T = any>(
    id: string,
    options?: Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">,
  ) {
    return useQuery<T, Error>({
      queryKey: QUERY_KEYS.users.byId(id),
      queryFn: () => client.users.byId(id),
      enabled: !!id,
      ...options,
    });
  }

  function useUpdateProfile(
    options?: Omit<
      UseMutationOptions<any, Error, UpdateProfileDto>,
      "mutationFn"
    >,
  ) {
    return useMutation<any, Error, UpdateProfileDto>({
      mutationFn: (payload) => client.users.updateProfile(payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useGetUploadPresignedUrl() {
    return useMutation({
      mutationFn: async ({
        fileName,
        fileType,
        type,
      }: {
        fileName: string;
        fileType: string;
        type: "avatar" | "exchange";
      }) => {
        const response = await client.uploads.getPresignedUrl({
          fileName,
          fileType,
          type,
        });
        return response;
      },
    });
  }

  function useConfirmAvatar() {
    return useMutation({
      mutationFn: async ({ key }: { key: string }) => {
        const response = await client.uploads.confirmAvatar(key);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Skills
  // ─────────────────────────────────────────────────────────────────────
  function useSkills(
    params?: { search?: string; categoryId?: string },
    options?: Omit<
      UseQueryOptions<Skill[], Error, Skill[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Skill[], Error>({
      queryKey: [QUERY_KEYS.skills.list, params?.search, params?.categoryId],
      queryFn: () => client.skills.list(params?.search, params?.categoryId),
      ...options,
    });
  }

  function useSkillCategories(
    options?: Omit<
      UseQueryOptions<SkillCategory[], Error, SkillCategory[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<SkillCategory[], Error>({
      queryKey: QUERY_KEYS.skills.categories,
      queryFn: () => client.skills.categories(),
      ...options,
    });
  }

  function useAddUserSkill(
    options?: Omit<
      UseMutationOptions<UserSkill, Error, AddSkillDto>,
      "mutationFn"
    >,
  ) {
    return useMutation<UserSkill, Error, AddSkillDto>({
      mutationFn: (payload) => client.skills.addUserSkill(payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useRemoveUserSkill(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.skills.removeUserSkill(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.me });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Exchanges / Matches / Requests
  // ─────────────────────────────────────────────────────────────────────
  function useExchanges(
    options?: Omit<
      UseQueryOptions<Exchange[], Error, Exchange[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Exchange[], Error>({
      queryKey: QUERY_KEYS.exchanges.list,
      queryFn: () => client.exchanges.list(),
      ...options,
    });
  }

  function useExchangeById(
    id: string,
    options?: Omit<
      UseQueryOptions<Exchange, Error, Exchange>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Exchange, Error>({
      queryKey: QUERY_KEYS.exchanges.byId(id),
      queryFn: () => client.exchanges.byId(id),
      enabled: !!id,
      ...options,
    });
  }

  function useMatches(
    options?: Omit<
      UseQueryOptions<MatchesResponse, Error, MatchesResponse>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<MatchesResponse, Error>({
      queryKey: QUERY_KEYS.exchanges.matches,
      queryFn: () => client.exchanges.matches(),
      ...options,
    });
  }

  function useRequests(
    options?: Omit<
      UseQueryOptions<any[], Error, any[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<any[], Error>({
      queryKey: QUERY_KEYS.exchanges.requests,
      queryFn: () => client.exchanges.requests(),
      ...options,
    });
  }

  function useRequestById(
    id: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">,
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.exchanges.requestById(id),
      queryFn: () => client.exchanges.requestById(id),
      enabled: !!id,
      ...options,
    });
  }

  function useCreateRequest(
    options?: Omit<
      UseMutationOptions<ExchangeRequest, Error, CreateExchangeRequestPayload>,
      "mutationFn"
    >,
  ) {
    return useMutation<ExchangeRequest, Error, CreateExchangeRequestPayload>({
      mutationFn: (p) => client.exchanges.createRequest(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.matches,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useAcceptRequest(
    options?: Omit<UseMutationOptions<Exchange, Error, string>, "mutationFn">,
  ) {
    return useMutation<Exchange, Error, string>({
      mutationFn: (id) => client.exchanges.acceptRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useRejectRequest(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.rejectRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useCancelRequest(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.cancelRequest(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useSendRequestMessage(
    options?: Omit<
      UseMutationOptions<
        void,
        Error,
        { requestId: string; payload: SendMessageDto }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      void,
      Error,
      { requestId: string; payload: SendMessageDto }
    >({
      mutationFn: ({ requestId, payload }) =>
        client.exchanges.sendMessage(requestId, payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useProposeSlots(
    options?: Omit<
      UseMutationOptions<void, Error, ProposeSlotsDto>,
      "mutationFn"
    >,
  ) {
    return useMutation<void, Error, ProposeSlotsDto>({
      mutationFn: (p) => client.exchanges.proposeSlots(p),
      ...options,
    });
  }

  function useProposeTermsAndSlots(
    options?: Omit<
      UseMutationOptions<
        void,
        Error,
        { requestId: string; payload: ProposeTermsAndSlotsDto }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      void,
      Error,
      { requestId: string; payload: ProposeTermsAndSlotsDto }
    >({
      mutationFn: ({ requestId, payload }) =>
        client.exchanges.proposeTermsAndSlots(requestId, payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useAcceptTermsAndSlots(
    options?: Omit<
      UseMutationOptions<void, Error, { requestId: string; slotIds: string[] }>,
      "mutationFn"
    >,
  ) {
    return useMutation<void, Error, { requestId: string; slotIds: string[] }>({
      mutationFn: ({ requestId, slotIds }) =>
        client.exchanges.acceptTermsAndSlots(requestId, slotIds),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useUpdateAvailability(
    options?: Omit<
      UseMutationOptions<
        void,
        Error,
        { requestId: string; payload: UpdateAvailabilityDto }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      void,
      Error,
      { requestId: string; payload: UpdateAvailabilityDto }
    >({
      mutationFn: ({ requestId, payload }) =>
        client.exchanges.updateAvailability(requestId, payload),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.exchanges.requests,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useMarkExchangeComplete(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.exchanges.markComplete(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useUpdateSessionStatus(
    options?: Omit<
      UseMutationOptions<
        void,
        Error,
        { exchangeId: string; sessionId: string; status: string }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      void,
      Error,
      { exchangeId: string; sessionId: string; status: string }
    >({
      mutationFn: ({ exchangeId, sessionId, status }) =>
        client.exchanges.updateSessionStatus(exchangeId, sessionId, status),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useRecordingPlayback(
    options?: Omit<UseMutationOptions<any, Error, string>, "mutationFn">,
  ) {
    return useMutation<any, Error, string>({
      mutationFn: (recordingId) => client.video.record.playback(recordingId),
      ...options,
    });
  }

  function useExchangeChatMessages(
    exchangeId: string,
    options?: Omit<
      UseQueryOptions<any[], Error, any[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<any[], Error>({
      queryKey: ["exchanges", exchangeId, "chat"],
      queryFn: () => client.exchanges.chat.list(exchangeId),
      enabled: !!exchangeId,
      ...options,
    });
  }

  function useSendExchangeChatMessage(
    options?: Omit<
      UseMutationOptions<
        any,
        Error,
        {
          exchangeId: string;
          payload:
            | {
                content?: string;
                fileKey?: string;
                fileName?: string;
                fileType?: string;
              }
            | string;
        }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      any,
      Error,
      {
        exchangeId: string;
        payload:
          | {
              content?: string;
              fileKey?: string;
              fileName?: string;
              fileType?: string;
            }
          | string;
      }
    >({
      mutationFn: ({ exchangeId, payload }) =>
        client.exchanges.chat.send(exchangeId, payload),
      onSuccess: (...args) => {
        const [, vars] = args;
        queryClient.invalidateQueries({
          queryKey: ["exchanges", vars.exchangeId, "chat"],
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useExchangeChatUploadUrl(
    options?: Omit<
      UseMutationOptions<
        { uploadUrl: string; key: string },
        Error,
        { exchangeId: string; fileName: string; contentType: string }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      { uploadUrl: string; key: string },
      Error,
      { exchangeId: string; fileName: string; contentType: string }
    >({
      mutationFn: ({ exchangeId, fileName, contentType }) =>
        client.exchanges.chat.uploadUrl(exchangeId, { fileName, contentType }),
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Points
  // ─────────────────────────────────────────────────────────────────────
  function usePointsBalance(
    options?: Omit<
      UseQueryOptions<number, Error, number>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<number, Error>({
      queryKey: QUERY_KEYS.points.balance,
      queryFn: () => client.points.balance() as Promise<number>,
      ...options,
    });
  }

  function usePointsTransactions(
    options?: Omit<
      UseQueryOptions<PointsTransaction[], Error, PointsTransaction[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<PointsTransaction[], Error>({
      queryKey: QUERY_KEYS.points.transactions,
      queryFn: () => client.points.transactions(),
      ...options,
    });
  }

  function useBanks(
    options?: Omit<
      UseQueryOptions<Bank[], Error, Bank[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Bank[], Error>({
      queryKey: QUERY_KEYS.points.banks,
      queryFn: () => client.points.banks(),
      ...options,
    });
  }

  function useFeeConfig(
    options?: Omit<
      UseQueryOptions<FeeConfig, Error, FeeConfig>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<FeeConfig, Error>({
      queryKey: QUERY_KEYS.points.feeConfig,
      queryFn: () => client.points.feeConfig(),
      ...options,
    });
  }

  function useRates(
    options?: Omit<
      UseQueryOptions<Record<string, number>, Error, Record<string, number>>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Record<string, number>, Error>({
      queryKey: QUERY_KEYS.points.rates,
      queryFn: () => client.points.rates(),
      ...options,
    });
  }

  function usePurchasePoints(
    options?: Omit<
      UseMutationOptions<any, Error, PurchasePointsDto>,
      "mutationFn"
    >,
  ) {
    return useMutation<any, Error, PurchasePointsDto>({
      mutationFn: (p) => client.points.purchase(p),
      ...options,
    });
  }

  function useWithdrawPoints(
    options?: Omit<
      UseMutationOptions<void, Error, WithdrawPointsDto>,
      "mutationFn"
    >,
  ) {
    return useMutation<void, Error, WithdrawPointsDto>({
      mutationFn: (p) => client.points.withdraw(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.points.transactions,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useResolveAccount(
    options?: Omit<
      UseMutationOptions<
        any,
        Error,
        { accountNumber: string; bankCode: string }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<any, Error, { accountNumber: string; bankCode: string }>(
      {
        mutationFn: (p) => client.points.resolveAccount(p),
        ...options,
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Notifications
  // ─────────────────────────────────────────────────────────────────────
  function useNotifications(
    options?: Omit<
      UseQueryOptions<Notification[], Error, Notification[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Notification[], Error>({
      queryKey: QUERY_KEYS.notifications.list,
      queryFn: () => client.notifications.list(),
      ...options,
    });
  }

  function useMarkNotificationRead(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.notifications.markRead(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.list,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.unreadCount,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useMarkAllNotificationsRead(
    options?: Omit<UseMutationOptions<void, Error, void>, "mutationFn">,
  ) {
    return useMutation<void, Error, void>({
      mutationFn: () => client.notifications.markAllRead(),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.list,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.unreadCount,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useDeleteNotification(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (id) => client.notifications.delete(id),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.list,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.unreadCount,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useUpdateNotificationPreferences(
    options?: Omit<
      UseMutationOptions<
        NotificationPreferences,
        Error,
        Partial<NotificationPreferences>
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      NotificationPreferences,
      Error,
      Partial<NotificationPreferences>
    >({
      mutationFn: (p) => client.notifications.updatePreferences(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.notifications.preferences,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Reviews
  // ─────────────────────────────────────────────────────────────────────
  function useMyReviews(
    options?: Omit<
      UseQueryOptions<Review[], Error, Review[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Review[], Error>({
      queryKey: QUERY_KEYS.reviews.mine,
      queryFn: () => client.reviews.mine(),
      ...options,
    });
  }

  function useReviewsByUserId(
    userId: string,
    options?: Omit<
      UseQueryOptions<Review[], Error, Review[]>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<Review[], Error>({
      queryKey: QUERY_KEYS.reviews.byUserId(userId),
      queryFn: () => client.reviews.byUserId(userId),
      enabled: !!userId,
      ...options,
    });
  }

  function useCreateReview(
    options?: Omit<
      UseMutationOptions<Review, Error, CreateReviewPayload>,
      "mutationFn"
    >,
  ) {
    return useMutation<Review, Error, CreateReviewPayload>({
      mutationFn: (p) => client.reviews.create(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reviews.mine });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exchanges.list });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Referrals
  // ─────────────────────────────────────────────────────────────────────
  function useReferralCode(
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">,
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.referrals.code,
      queryFn: () => client.referrals.code(),
      ...options,
    });
  }

  function useReferralStats(
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">,
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.referrals.stats,
      queryFn: () => client.referrals.stats(),
      ...options,
    });
  }

  function useApplyReferralCode(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (code) => client.referrals.apply(code),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.referrals.code });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.referrals.stats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Video / LiveKit
  // ─────────────────────────────────────────────────────────────────────
  function useVideoSessionDetails(
    roomId: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">,
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.video.session(roomId),
      queryFn: () => client.video.sessionDetails(roomId),
      enabled: !!roomId,
      ...options,
    });
  }

  function useVideoToken(
    room: string,
    options?: Omit<UseQueryOptions<any, Error, any>, "queryKey" | "queryFn">,
  ) {
    return useQuery<any, Error>({
      queryKey: QUERY_KEYS.video.token(room),
      queryFn: () => client.video.token(room),
      enabled: !!room,
      ...options,
    });
  }

  function useRecordingEstimate(
    options?: Omit<
      UseMutationOptions<RecordingEstimate, Error, string>,
      "mutationFn"
    >,
  ) {
    return useMutation<RecordingEstimate, Error, string>({
      mutationFn: (r) => client.video.record.estimate(r),
      ...options,
    });
  }

  function useSubmitRecordingConsent(
    options?: Omit<
      UseMutationOptions<void, Error, RecordingConsentPayload>,
      "mutationFn"
    >,
  ) {
    return useMutation<void, Error, RecordingConsentPayload>({
      mutationFn: (p) => client.video.record.consent(p),
      ...options,
    });
  }

  function useStartRecording(
    options?: Omit<
      UseMutationOptions<
        { approvedMinutes?: number },
        Error,
        StartRecordingPayload
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      { approvedMinutes?: number },
      Error,
      StartRecordingPayload
    >({
      mutationFn: (p) => client.video.record.start(p),
      ...options,
    });
  }

  function useStopRecording(
    options?: Omit<
      UseMutationOptions<void, Error, StopRecordingPayload>,
      "mutationFn"
    >,
  ) {
    return useMutation<void, Error, StopRecordingPayload>({
      mutationFn: (p) => client.video.record.stop(p),
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.points.balance });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.points.transactions,
        });
        return options?.onSuccess?.(...args);
      },
      ...options,
    });
  }

  function useSessionChatMessages(
    exchangeSessionId: string,
    options?: Omit<
      UseQueryOptions<SessionChatHistory, Error, SessionChatHistory>,
      "queryKey" | "queryFn"
    >,
  ) {
    return useQuery<SessionChatHistory, Error>({
      queryKey: QUERY_KEYS.video.chat(exchangeSessionId),
      queryFn: () => client.video.chat.list(exchangeSessionId),
      enabled: !!exchangeSessionId,
      ...options,
    });
  }

  function useSendSessionChatMessage(
    options?: Omit<
      UseMutationOptions<
        any,
        Error,
        { exchangeSessionId: string; message: string }
      >,
      "mutationFn"
    >,
  ) {
    return useMutation<
      any,
      Error,
      { exchangeSessionId: string; message: string }
    >({
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
    });
  }

  function useMarkSessionChatRead(
    options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
  ) {
    return useMutation<void, Error, string>({
      mutationFn: (exchangeSessionId) =>
        client.video.chat.read(exchangeSessionId),
      ...options,
    });
  }

  return {
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
  };
}

export type ApiHooks = ReturnType<typeof createApiHooks>;
