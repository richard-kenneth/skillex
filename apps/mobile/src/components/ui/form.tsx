import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, RADIUS, ANIMATION } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";

// ─── Switch ─────────────────────────────────────────────────────────────────

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  style?: ViewStyle;
}

export function Switch({
  value,
  onValueChange,
  disabled,
  label,
  description,
  style,
}: SwitchProps) {
  const theme = useTheme();
  const thumbX = useSharedValue(value ? 18 : 2);

  React.useEffect(() => {
    thumbX.value = withTiming(value ? 18 : 2, { duration: ANIMATION.fast });
  }, [value, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: SPACING[4],
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: SPACING[0.5] }}>
        {label ? <ThemedText type="body">{label}</ThemedText> : null}
        {description ? (
          <ThemedText type="caption" muted>
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        onPress={() => !disabled && onValueChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          backgroundColor: value ? theme.primary : theme.muted,
          opacity: disabled ? 0.4 : 1,
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: value
                ? theme.primaryForeground
                : theme.mutedForeground,
            },
            thumbStyle,
          ]}
        />
      </Pressable>
    </View>
  );
}

// ─── Separator ──────────────────────────────────────────────────────────────

export function Separator({
  style,
  orientation = "horizontal",
}: {
  style?: any;
  orientation?: "horizontal" | "vertical";
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        orientation === "horizontal"
          ? {
              height: StyleSheet.hairlineWidth,
              width: "100%",
              backgroundColor: theme.border,
            }
          : {
              width: StyleSheet.hairlineWidth,
              height: "100%",
              backgroundColor: theme.border,
            },
        style,
      ]}
    />
  );
}

// ─── Progress ───────────────────────────────────────────────────────────────

export function Progress({
  value,
  style,
  color,
}: {
  value: number;
  style?: any;
  color?: string;
}) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  const width = useSharedValue(clamped);

  React.useEffect(() => {
    width.value = withTiming(clamped, { duration: ANIMATION.normal });
  }, [clamped, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={[
        {
          width: "100%",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.secondary,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            backgroundColor: color ?? theme.foreground,
            borderRadius: 3,
          },
          barStyle,
        ]}
      />
    </View>
  );
}
