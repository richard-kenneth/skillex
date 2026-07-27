import { ToastProvider } from "@/components/ui/toast";
import { useTheme } from "@/hooks/use-theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../../lib/query-client";
import { I18nProvider } from "lib/i18n";
import { registerGlobals } from '@livekit/react-native';

SplashScreen.preventAutoHideAsync();
registerGlobals();

function AppInner() {
  const theme = useTheme();
  return (
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
      <StatusBar style="light" />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider defaultLocale="en">
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <ToastProvider>
                <AppInner />
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
