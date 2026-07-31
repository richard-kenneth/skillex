/**
 * Shared notification service — used by both web and mobile to reduce duplication.
 * Provides notification types, API client methods, SSE connection, and push token registration.
 */
import type { Notification, NotificationPreferences } from "../types";

// ─── Notification Types ──────────────────────────────────────────────────────

export { NotificationType } from "../types";

export interface NotificationStreamEvent {
  type: "NOTIFICATION_CREATED" | "COUNT_UPDATED";
  notification?: Notification;
}

// ─── Notification API Client ──────────────────────────────────────────────────

export interface NotificationApiClient {
  getNotifications: (limit?: number) => Promise<Notification[]>;
  getUnreadCount: () => Promise<{ count: number }>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getPreferences: () => Promise<NotificationPreferences>;
  updatePreferences: (
    prefs: Partial<NotificationPreferences>,
  ) => Promise<NotificationPreferences>;
  registerPushToken: (token: string, platform: string) => Promise<void>;
  unregisterPushToken: (token: string) => Promise<void>;
  testPush: () => Promise<void>;
}

/**
 * Create a notification API client for a given base URL.
 * Used by both web and mobile.
 */
export function createNotificationClient(
  baseUrl: string,
  getAuthHeaders: () => Promise<Record<string, string>>,
): NotificationApiClient {
  const request = async <T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...options.headers,
      },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Notification API error: ${res.status}`);
    return res.json();
  };

  return {
    getNotifications: (limit = 50) =>
      request<Notification[]>(`/notifications?limit=${limit}`),

    getUnreadCount: () =>
      request<{ count: number }>(`/notifications/unread-count`),

    markAsRead: (id: string) =>
      request<void>(`/notifications/${id}/read`, { method: "PATCH" }),

    markAllAsRead: () =>
      request<void>(`/notifications/read-all`, { method: "PATCH" }),

    deleteNotification: (id: string) =>
      request<void>(`/notifications/${id}`, { method: "DELETE" }),

    getPreferences: () =>
      request<NotificationPreferences>(`/notifications/preferences`),

    updatePreferences: (prefs) =>
      request<NotificationPreferences>(`/notifications/preferences`, {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }),

    registerPushToken: (token: string, platform: string) =>
      request<void>(`/notifications/push-token`, {
        method: "POST",
        body: JSON.stringify({ token, platform }),
      }),

    unregisterPushToken: (token: string) =>
      request<void>(`/notifications/push-token`, {
        method: "DELETE",
        body: JSON.stringify({ token }),
      }),

    testPush: () =>
      request<void>(`/notifications/test-push`, { method: "POST" }),
  };
}

// ─── SSE Stream Helper ───────────────────────────────────────────────────────

/**
 * Create an SSE connection for real-time notifications.
 * Works with both web (EventSource) and mobile (react-native-sse).
 *
 * On web: uses native EventSource
 * On mobile: uses react-native-sse EventSource (passed in)
 */
export function createNotificationStream(
  baseUrl: string,
  getAuthHeaders: () => Promise<Record<string, string>>,
  EventSourceImpl: typeof EventSource,
  onNotification: (notification: Notification) => void,
  onCountUpdate: () => void,
  onError?: (err: any) => void,
): () => void {
  let eventSource: EventSource | null = null;
  let closed = false;

  const connect = async () => {
    if (closed) return;
    const headers = await getAuthHeaders();    

    // For web, EventSource doesn't support custom headers, so we use the URL with cookie auth
    // For mobile (react-native-sse), headers are supported
    const EventSourceCtor = EventSourceImpl || EventSource;

    const isBrowserWeb = typeof window !== "undefined" && EventSourceCtor === window.EventSource;

    // react-native-sse supports headers in the constructor
    if (!isBrowserWeb) {      
      eventSource = new (EventSourceCtor as any)(
        `${baseUrl}/notifications/stream`,
        { headers },
      );
    } else {      
      // Web EventSource - uses cookies for auth
      eventSource = new EventSourceCtor(`${baseUrl}/notifications/stream`, {
        withCredentials: true,
      });
    }

    eventSource?.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as NotificationStreamEvent;
        if (data.type === "NOTIFICATION_CREATED" && data.notification) {
          onNotification(data.notification);
        } else if (data.type === "COUNT_UPDATED") {
          onCountUpdate();
        }
      } catch (err) {
        console.error("Error parsing notification stream event:", err);
      }
    });

    if (eventSource) {
      eventSource.onerror = (err: any) => {
        if (onError) {
          onError(err);
        } else {
          console.warn("SSE connection error for notifications:", err);
        }
        // Reconnect after 5 seconds
        if (!closed) {
          eventSource?.close();
          setTimeout(connect, 5000);
        }
      };
    }
  };

  connect();

  // Return cleanup function
  return () => {
    closed = true;
    eventSource?.close();
  };
}

// ─── Notification Type Config ─────────────────────────────────────────────────

export interface NotificationTypeConfig {
  icon: string;
  color: string;
  label: string;
}

export function getNotificationTypeConfig(
  type: string,
): NotificationTypeConfig {
  switch (type) {
    case "EXCHANGE_REQUEST_RECEIVED":
      return { icon: "📥", color: "#3b82f6", label: "New Request" };
    case "EXCHANGE_REQUEST_ACCEPTED":
      return { icon: "✅", color: "#22c55e", label: "Request Accepted" };
    case "EXCHANGE_REQUEST_REJECTED":
      return { icon: "❌", color: "#ef4444", label: "Request Rejected" };
    case "EXCHANGE_TERMS_PROPOSED":
      return { icon: "📋", color: "#8b5cf6", label: "Terms Proposed" };
    case "EXCHANGE_TERMS_AGREED":
      return { icon: "🤝", color: "#22c55e", label: "Terms Agreed" };
    case "EXCHANGE_CHAT_MESSAGE":
      return { icon: "💬", color: "#06b6d4", label: "New Message" };
    case "SESSION_SCHEDULED":
      return { icon: "📅", color: "#3b82f6", label: "Session Scheduled" };
    case "SESSION_COMPLETED":
      return { icon: "🎉", color: "#22c55e", label: "Session Completed" };
    case "SESSION_CANCELLED":
      return { icon: "🚫", color: "#ef4444", label: "Session Cancelled" };
    case "SESSION_REMINDER":
      return { icon: "⏰", color: "#f59e0b", label: "Session Reminder" };
    case "POINTS_RECEIVED":
      return { icon: "💰", color: "#22c55e", label: "Points Received" };
    case "POINTS_WITHDREW":
      return { icon: "💸", color: "#f59e0b", label: "Points Withdrawn" };
    case "REFERRAL_APPLIED":
      return { icon: "🎁", color: "#8b5cf6", label: "Referral Applied" };
    case "REVIEW_RECEIVED":
      return { icon: "⭐", color: "#f59e0b", label: "Review Received" };
    case "SYSTEM":
      return { icon: "🔔", color: "#71717a", label: "System" };
    default:
      return { icon: "🔔", color: "#71717a", label: "Notification" };
  }
}
