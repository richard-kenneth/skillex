import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider as AppThemeProvider } from "@/hooks/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { registerGlobals } from "@livekit/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider defaultLocale="en">
            <AppThemeProvider>
              <ToastProvider>
                <AppInner />
              </ToastProvider>
            </AppThemeProvider>
          </I18nProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
