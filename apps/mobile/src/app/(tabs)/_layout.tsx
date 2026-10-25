import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Platform, Keyboard } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  Coins,
  User,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import {
  RADIUS,
  SPACING,
  ICON_SIZE,
  SHADOWS,
  ANIMATION,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "lib/i18n";
import { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";

function AnimatedTabItem({
  route,
  isFocused,
  options,
  onPress,
  IconComponent,
  label,
}: {
  route: any;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  IconComponent: (props: { color: string; size: number }) => React.ReactNode;
  label: string;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 12, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(
      1,
      (ANIMATION.spring as any) ?? { damping: 15, stiffness: 150 },
    );
  };

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarButtonTestID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabItem}
      >
        <View
          style={[
            styles.iconWrapper,
            isFocused && {
              backgroundColor: theme.secondary,
              borderRadius: RADIUS.pill,
            },
          ]}
        >
          {IconComponent({
            color: isFocused ? theme.foreground : theme.mutedForeground,
            size: ICON_SIZE.lg,
          })}
        </View>

        <ThemedText
          type="badge"
          style={{
            color: isFocused ? theme.foreground : theme.mutedForeground,
            fontWeight: isFocused ? "600" : "400",
            fontSize: 10,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT("nav");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const icons: Record<
    string,
    (props: { color: string; size: number }) => React.ReactNode
  > = {
    index: (props) => <LayoutDashboard {...props} />,
    matches: (props) => <Users {...props} />,
    exchanges: (props) => <RefreshCw {...props} />,
    points: (props) => <Coins {...props} />,
    profile: (props) => <User {...props} />,
  };

  const labels: Record<string, string> = {
    index: t("dashboard"),
    matches: t("matches"),
    exchanges: t("exchanges"),
    points: t("points"),
    profile: t("profile"),
  };

  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarFloatingWrapper,
        {
          bottom: bottomInset,
        },
      ]}
    >
      <View
        style={[
          styles.glassDockContainer,
          {
            backgroundColor: theme.tabBarBackground,
            borderColor: theme.tabBarBorder,
          },
          SHADOWS.lg,
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const IconComponent = icons[route.name] ?? icons.index;
          const label = labels[route.name] || options.title || route.name;

          return (
            <AnimatedTabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              IconComponent={IconComponent}
              label={label}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const t = useT("nav");
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t("dashboard") }} />
      <Tabs.Screen name="matches" options={{ title: t("matches") }} />
      <Tabs.Screen name="exchanges" options={{ title: t("exchanges") }} />
      <Tabs.Screen name="points" options={{ title: t("points") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarFloatingWrapper: {
    position: "absolute",
    left: SPACING[3],
    right: SPACING[3],
    alignItems: "center",
  },
  glassDockContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 520,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingVertical: SPACING[1.5],
    paddingHorizontal: SPACING[2],
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 38,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
