/**
 * Push notification service for mobile app.
 * Uses the shared notification client from @skillex/shared for API calls.
 * Handles push token registration, permission requests, and notification handling.
 * Mirrors the web push implementation for easier maintainability.
 */
import {
  createNotificationClient,
  createNotificationStream,
  type NotificationApiClient,
} from "@skillex/shared";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { authClient } from "lib/auth";
import { Platform } from "react-native";
import EventSource from "react-native-sse";
import * as Device from 'expo-device';

const API_BASE = `${
  process.env.EXPO_PUBLIC_API_BASE_URL!
}/api`;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushTokenResult {
  token: string | null;
  granted: boolean;
  error?: string;
}

// Lazy-initialize the shared notification client
let notifClient: NotificationApiClient | null = null;

function getNotifClient(): NotificationApiClient {
  if (!notifClient) {
    notifClient = createNotificationClient(API_BASE, async () => {
      const session = await authClient.getSession();
        
      const headers: Record<string, string> = {};

      if (session?.data?.session?.token) {
        headers["Authorization"] = `Bearer ${session.data.session.token}`;
      }
      return headers;
    });
  }
  return notifClient;
}

const projectId = 
  Constants.expoConfig?.extra?.eas?.projectId ?? 
  Constants.easConfig?.projectId;

if (!projectId) {
  throw new Error("Project ID not found in app config");
}

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotifications(): Promise<PushTokenResult> {
  try {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return { token: null, granted: false, error: "Simulator not supported" };
    }
    // Request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return { token: null, granted: false, error: "Permission not granted" };
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    // Set up Android channels before registering with backend
    if (Platform.OS === "android") {
      await setupAndroidChannels();
    }

    // Wrap the backend call in a separate try/catch so network 
    // failures don't mask the fact that the token was generated successfully
    try {
      await getNotifClient().registerPushToken(token, Platform.OS);
    } catch (apiError) {
      console.error("Failed to sync token to backend:", apiError);
      // Depending on your logic, you might want to retry this later
    }

    return { token, granted: true };
  } catch (error: any) {
    console.error("Push notification registration failed:", error);
    return {
      token: null,
      granted: false,
      error: error?.message ?? "Unknown error",
    };
  }
}

/**
 * Set up Android notification channels
 */
async function setupAndroidChannels() {
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6366f1",
  });

  await Notifications.setNotificationChannelAsync("exchanges", {
    name: "Exchange Updates",
    description: "Notifications about your skill exchanges",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6366f1",
  });

  await Notifications.setNotificationChannelAsync("points", {
    name: "Points & Wallet",
    description: "Notifications about points and transactions",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#f59e0b",
  });

  await Notifications.setNotificationChannelAsync("sessions", {
    name: "Session Reminders",
    description: "Reminders for upcoming sessions",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3b82f6",
  });
}

/**
 * Unregister push token from backend
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    }).catch(() => null);

    if (tokenData) {
      await getNotifClient().unregisterPushToken(tokenData.data);
    }
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
}

/**
 * Check if notifications are enabled
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Set up notification received listener (for foreground notifications)
 */
export function setupNotificationListeners(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void,
): () => void {
  const notificationListener =
    Notifications.addNotificationReceivedListener(onNotification);
  const responseListener =
    Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

/**
 * Set up SSE stream for real-time notifications (mirrors web's RealtimeNotificationsProvider)
 * Uses the shared createNotificationStream from @skillex/shared
 */
export function setupRealtimeNotifications(
  onNotification: (notification: any) => void,
  onCountUpdate: () => void,
  onError?: (err: any) => void,
): () => void {

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    "Accept": "text/event-stream",
    "Content-Type": "application/json",
  };

  // 1. Web relies on cookies (withCredentials: true), so headers stay empty
  if (Platform.OS === 'web') {
    return headers;
  }

  // 2. Mobile needs the explicit token from Better-Auth
  try {
    const session = await authClient.getSession();
    
    if (session?.data?.session?.token) {
      headers['Authorization'] = `Bearer ${session.data.session.token}`;
    }
  } catch (error) {
    console.error("Failed to fetch Better-Auth token for SSE:", error);
  }

  return headers;
};


  return createNotificationStream(
    API_BASE,
    getAuthHeaders, // Auth headers (cookie-based)
    EventSource as any, // react-native-sse EventSource
    onNotification,
    onCountUpdate,
    onError,
  );
}

/**
 * Schedule a local notification (for session reminders, etc.)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Date | Notifications.NotificationTriggerInput,
  data?: Record<string, any>,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: trigger as Notifications.NotificationTriggerInput,
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
