import type { CreateExchangeRequestPayload, CreateReviewPayload, ProposeSlotsDto, ProposeTermsAndSlotsDto, UpdateAvailabilityDto } from "../schemas/exchange.schema";
import { SendMessageDto } from "../schemas/exchange.schema";
import { PurchasePointsDto, WithdrawPointsDto } from "../schemas/points.schema";
import type { ProfileFormPayload, UpdateProfileDto } from "../schemas/profile.schema";
import { AddSkillDto } from "../schemas/skills.schema";
import type { RecordingConsentPayload, StartRecordingPayload, StopRecordingPayload } from "../schemas/video.schema";
import type {
  Bank,
  Exchange,
  ExchangeChatMessage,
  ExchangeRequest,
  FeeConfig,
  MatchesResponse,
  Notification,
  NotificationPreferences,
  PointsTransaction,
  PurchaseInitiationResult,
  RecordingEstimate,
  Referral,
  ReferralCodeData,
  ReferralStats,
  ResolveAccountResult,
  Review,
  SessionChatHistory,
  SessionChatMessage, Skill,
  SkillCategory,
  UserSkill,
  VideoTokenResponse
} from "../types";

export type FetchImpl = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: FetchImpl;
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  withCredentials?: boolean;
}

/**
 * Platform-agnostic API client factory.
 * - Takes a base URL and optional fetch impl + auth headers provider
 * - Works identically on Next.js (browser fetch + cookie credentials) and Expo (fetch + bearer token)
 */
export function createApiClient(config: ApiClientConfig) {
  const {
    baseUrl,
    fetchImpl = (typeof globalThis !== "undefined" && "fetch" in globalThis
      ? (globalThis.fetch as FetchImpl)
      : undefined)!,
    getAuthHeaders,
    withCredentials = false,
  } = config;

  if (!fetchImpl) {
    throw new Error(
      "[createApiClient] No fetch implementation available and none provided."
    );
  }

  async function request<T = unknown>(
    endpoint: string,
    init: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(init.headers ?? {});

    if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (getAuthHeaders) {
      const auth = await getAuthHeaders();
      const authHeaders = new Headers(auth);
      authHeaders.forEach((value, key) => {
        if (!headers.has(key)) headers.set(key, value);
      });
    }

    const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const res = await fetchImpl(url, {
      ...init,
      headers,
      ...(withCredentials ? ({ credentials: "include" } as any) : {}),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return data as T;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Users
  // ─────────────────────────────────────────────────────────────────────────
  const users = {
    me: () => request<any>(`/users/me`),
    byId: (id: string) => request<any>(`/users/${id}`),
    updateProfile: (payload: UpdateProfileDto) =>
      request<any>(`/users/me`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    uploadImage: (formData: FormData) =>
      request<any>(`/uploads`, {
        method: "POST",
        body: formData as any,
      }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Skills
  // ─────────────────────────────────────────────────────────────────────────
  const skills = {
    list: (search?: string, categoryId?: string) => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (categoryId) params.set("categoryId", categoryId);
      const qs = params.toString();
      return request<Skill[]>(`/skills${qs ? `?${qs}` : ""}`);
    },
    categories: () => request<SkillCategory[]>(`/skills/categories`),
    addUserSkill: (payload: AddSkillDto) =>
      request<UserSkill>(`/skills/user`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    removeUserSkill: (id: string) =>
      request<void>(`/skills/user/${id}`, { method: "DELETE" }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Exchanges / Matches / Requests
  // ─────────────────────────────────────────────────────────────────────────
  const exchanges = {
    list: () => request<Exchange[]>(`/exchanges`),
    byId: (id: string) => request<Exchange>(`/exchanges/${id}`),
    matches: () => request<MatchesResponse>(`/exchanges/matches`),
    requests: () => request<ExchangeRequest[]>(`/exchanges/requests`),
    requestById: (id: string) =>
      request<ExchangeRequest>(`/exchanges/requests/${id}`),
    createRequest: (payload: CreateExchangeRequestPayload) =>
      request<ExchangeRequest>(`/exchanges/request`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    acceptRequest: (id: string) =>
      request<Exchange>(`/exchanges/requests/${id}/accept`, {
        method: "POST",
      }),
    rejectRequest: (id: string) =>
      request<void>(`/exchanges/requests/${id}/reject`, {
        method: "POST",
      }),
    cancelRequest: (id: string) =>
      request<void>(`/exchanges/requests/${id}/cancel`, {
        method: "PATCH",
      }),
    sendMessage: (requestId: string, payload: SendMessageDto) =>
      request<void>(`/exchanges/requests/${requestId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    proposeSlots: (payload: ProposeSlotsDto) =>
      request<void>(`/exchanges/slots`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    proposeTermsAndSlots: (requestId: string, payload: ProposeTermsAndSlotsDto) =>
      request<void>(`/exchanges/requests/${requestId}/propose`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    acceptSlots: (requestId: string, slotIds: string[]) =>
      request<void>(`/exchanges/requests/${requestId}/accept-slots`, {
        method: "POST",
        body: JSON.stringify({ requestId, slotIds }),
      }),
    acceptTermsAndSlots: (requestId: string, slotIds: string[]) =>
      request<void>(`/exchanges/requests/${requestId}/accept-slots`, {
        method: "POST",
        body: JSON.stringify({ requestId, slotIds }),
      }),
    updateAvailability: (requestId: string, payload: UpdateAvailabilityDto) =>
      request<void>(`/exchanges/requests/${requestId}/availability`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    markComplete: (id: string) =>
      request<void>(`/exchanges/${id}/complete`, { method: "POST" }),
    updateSessionStatus: (exchangeId: string, sessionId: string, status: string) =>
      request<void>(`/exchanges/${exchangeId}/sessions/${sessionId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    chat: {
      list: (exchangeId: string) =>
        request<any[]>(`/exchanges/${exchangeId}/chat`),
      send: (
        exchangeId: string,
        payload: { content?: string; fileKey?: string; fileName?: string; fileType?: string } | string
      ) =>
        request<any>(`/exchanges/${exchangeId}/chat`, {
          method: "POST",
          body: JSON.stringify(typeof payload === "string" ? { content: payload } : payload),
        }),
      uploadUrl: (
        exchangeId: string,
        payload: { fileName: string; contentType: string }
      ) =>
        request<{ uploadUrl: string; key: string }>(`/exchanges/${exchangeId}/chat/upload`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Points
  // ─────────────────────────────────────────────────────────────────────────
  const points = {
    balance: () =>
      request<{ balance: number } | number>(`/points/balance`).then((res) =>
        typeof res === "number" ? res : (res as any).balance ?? res
      ),
    transactions: () =>
      request<PointsTransaction[]>(`/points/transactions`),
    banks: () => request<Bank[]>(`/points/banks`),
    feeConfig: () => request<FeeConfig>(`/points/fee-config`),
    rates: () => request<Record<string, number>>(`/points/rates`),
    purchase: (payload: PurchasePointsDto) =>
      request<PurchaseInitiationResult>(`/points/purchase`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    withdraw: (payload: WithdrawPointsDto) =>
      request<void>(`/points/withdraw`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    resolveAccount: (payload: {
      accountNumber: string;
      bankCode: string;
    }) =>
      request<ResolveAccountResult>(`/points/resolve-account`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Notifications
  // ─────────────────────────────────────────────────────────────────────────
  const notifications = {
    list: () => request<Notification[]>(`/notifications`),
    markRead: (id: string) =>
      request<void>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      request<void>(`/notifications/read-all`, { method: "PATCH" }),
    delete: (id: string) =>
      request<void>(`/notifications/${id}`, { method: "DELETE" }),
    updatePreferences: (prefs: Partial<NotificationPreferences>) =>
      request<NotificationPreferences>(`/notifications/preferences`, {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }),
    subscribePush: (subscription: any) =>
      request<void>(`/notifications/push-subscription`, {
        method: "POST",
        body: JSON.stringify(subscription),
      }),
    testPush: () =>
      request<void>(`/notifications/test-push`, { method: "POST" }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Reviews
  // ─────────────────────────────────────────────────────────────────────────
  const reviews = {
    mine: () => request<Review[]>(`/reviews/user/me`),
    byUserId: (userId: string) =>
      request<Review[]>(`/reviews/user/${userId}`),
    create: (payload: CreateReviewPayload) =>
      request<Review>(`/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Referrals
  // ─────────────────────────────────────────────────────────────────────────
  const referrals = {
    code: () =>
      request<ReferralCodeData | string>(`/referrals/my-code`).then((res) =>
        typeof res === "string" ? res : res.referralCode ?? res
      ),
    stats: () =>
      request<ReferralStats>(`/referrals/stats`),
    apply: (code: string) =>
      request<void>(`/referrals/apply`, {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Video / LiveKit / Session Chat / Recording
  // ─────────────────────────────────────────────────────────────────────────
  const video = {
    sessionDetails: (roomId: string) =>
      request<{
        sessionId: string;
        exchangeId: string;
        scheduledAt: string;
        duration: number;
        endsAt: string;
      }>(`/video/session/${encodeURIComponent(roomId)}`),
    token: (room: string) =>
      request<VideoTokenResponse>(
        `/video/token?room=${encodeURIComponent(room)}`
      ),
    record: {
      estimate: (room: string) =>
        request<RecordingEstimate>(
          `/video/recording/estimate?room=${encodeURIComponent(room)}`
        ),
      consent: (payload: RecordingConsentPayload) =>
        request<void>(`/video/recording/consent`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      start: (payload: StartRecordingPayload) =>
        request<{ approvedMinutes?: number }>(`/video/recording/start`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      stop: (payload: StopRecordingPayload) =>
        request<void>(`/video/recording/stop`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      playback: (recordingId: string) =>
        request<{ url: string }>(`/video/recording/${recordingId}/playback`),
    },
    chat: {
      list: (exchangeSessionId: string) =>
        request<SessionChatHistory>(
          `/video/chat/${exchangeSessionId}`
        ),
      send: (exchangeSessionId: string, message: string) =>
        request<SessionChatMessage>(`/video/chat/${exchangeSessionId}`, {
          method: "POST",
          body: JSON.stringify({ message }),
        }),
      read: (exchangeSessionId: string) =>
        request<void>(`/video/chat/${exchangeSessionId}/read`, {
          method: "PATCH",
        }),
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Better-Auth profile helper (name/image)
  // ─────────────────────────────────────────────────────────────────────────
  const auth = {
    updateProfile: (payload: ProfileFormPayload) =>
      request<any>(`/users/auth-profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  };

  return {
    request,
    users,
    skills,
    exchanges,
    points,
    notifications,
    reviews,
    referrals,
    video,
    auth,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
