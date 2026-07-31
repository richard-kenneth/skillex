import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider as AppThemeProvider } from "@/hooks/theme-context";
import { useTheme } from "@/hooks/use-theme";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  setupRealtimeNotifications,
} from "@/lib/push-notifications";
import { registerGlobals } from "@livekit/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { I18nProvider } from "lib/i18n";
import { useEffect } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../../lib/query-client";

SplashScreen.preventAutoHideAsync();
registerGlobals();

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppInner() {
  const theme = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="notifications"
            options={{
              headerShown: true,
              headerTitle: "Notifications",
              headerTransparent: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.foreground,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="users/[id]"
            options={{
              headerShown: true,
              headerTitle: "Profile",
              headerTransparent: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.foreground,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="exchanges/[id]"
            options={{
              headerShown: true,
              headerTitle: "Exchange",
              headerTransparent: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.foreground,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="requests/[id]"
            options={{
              headerShown: true,
              headerTitle: "Request",
              headerTransparent: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.foreground,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="room/[id]"
            options={{
              headerShown: true,
              headerTitle: "Session",
              headerTransparent: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.foreground,
              headerShadowVisible: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();

    // Register for push notifications on app launch
    registerForPushNotifications().catch(console.error);

    // Set up notification listeners for foreground/tap
    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        // Handle foreground notification
        console.log(
          "Notification received:",
          notification.request.content.title,
        );
      },
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data?.exchangeId) {
          router.push(`/exchanges/${data.exchangeId}` as any);
        } else if (data?.requestId) {
          router.push(`/requests/${data.requestId}` as any);
        } else if (data?.type === "notification") {
          router.push("/notifications" as any);
        }
      },
    );

    // Set up SSE stream for real-time notifications (mirrors web)
    const cleanupStream = setupRealtimeNotifications(
      (notification) => {
        // Show toast for real-time notification
        console.log("Real-time notification:", notification.title);
      },
      () => {
        // Unread count updated - could update badge here
        console.log("Unread count updated");
      },
      (err) => {
        console.warn("SSE notification stream error:", err);
      },
    );

    return () => {
      cleanupListeners();
      cleanupStream();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <I18nProvider defaultLocale="en">
              <ToastProvider>
                <AppInner />
              </ToastProvider>
            </I18nProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
