import { ToastProvider } from "@/components/ui/toast";
import { posthog } from "@/lib/posthog";
import { ThemeProvider as AppThemeProvider } from "@/hooks/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { useThemeContext } from "@/hooks/theme-context";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  setupRealtimeNotifications,
} from "@/lib/push-notifications";
import { registerGlobals } from "@livekit/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { I18nProvider } from "lib/i18n";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { type ReactNode, useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { identifyUser, resetUser, trackScreen } from "@/lib/analytics";
import { useSession } from "../../lib/auth";
import { queryClient } from "../../lib/query-client";

SplashScreen.preventAutoHideAsync();
registerGlobals();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootErrorFallback() {
  return <View style={{ flex: 1 }} />;
}

function PostHogErrorTracking({ children }: { children: ReactNode }) {
  if (!posthog) {
    return children;
  }

  return (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary fallback={RootErrorFallback}>
        {children}
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}

function PostHogIdentity() {
  const { data: session } = useSession();
  const lastIdentifiedUserId = useRef<string | undefined>(undefined);
  const user = session?.user;

  useEffect(() => {
    if (!user?.id) {
      if (lastIdentifiedUserId.current) {
        resetUser();
      }
      lastIdentifiedUserId.current = undefined;
      return;
    }

    if (lastIdentifiedUserId.current === user.id) {
      return;
    }

    lastIdentifiedUserId.current = user.id;
    identifyUser(user.id, {
      email: user.email,
      name: user.name,
    });
  }, [user?.email, user?.id, user?.name]);

  return null;
}

function PostHogScreenTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      trackScreen(pathname);
    }
  }, [pathname]);

  return null;
}

function AppInner() {
  const theme = useTheme();
  const { resolvedTheme } = useThemeContext();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: Platform.OS === "ios" ? "default" : "slide_from_right",
          animationDuration: 250,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false, animation: "fade_from_bottom" }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerTitle: "Notifications",
            headerTransparent: false,
            headerStyle: { backgroundColor: theme.glassBackground },
            headerTintColor: theme.foreground,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: "600", fontSize: 17 },
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="users/[id]"
          options={{
            headerShown: true,
            headerTitle: "Profile",
            headerTransparent: false,
            headerStyle: { backgroundColor: theme.glassBackground },
            headerTintColor: theme.foreground,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: "600", fontSize: 17 },
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="exchanges/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="requests/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
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
            headerTitleStyle: { fontWeight: "600", fontSize: 17 },
            headerBackButtonDisplayMode: "minimal",
            animation: "slide_from_right",
          }}
        />
      </Stack>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();

    registerForPushNotifications().catch(console.error);

    const cleanupListeners = setupNotificationListeners(
      (notification) => {
        console.log(
          "Notification received:",
          notification.request.content.title,
        );
      },
      (response) => {
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

    const cleanupStream = setupRealtimeNotifications(
      (notification) => {
        console.log("Real-time notification:", notification.title);
      },
      () => {
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
        <PostHogErrorTracking>
          <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
              <I18nProvider defaultLocale="en">
                <ToastProvider>
                  <PostHogIdentity />
                  <PostHogScreenTracker />
                  <AppInner />
                </ToastProvider>
              </I18nProvider>
            </AppThemeProvider>
          </QueryClientProvider>
        </PostHogErrorTracking>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
