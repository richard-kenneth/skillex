import React from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps extends ViewProps {
  variant?: "default" | "glass" | "accent" | "outline";
  glow?: boolean;
}

export function Card({
  style,
  children,
  variant = "default",
  glow,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case "glass":
        return {
          backgroundColor: theme.glassBackground,
          borderColor: theme.glassBorder,
        };
      case "accent":
        return {
          backgroundColor: theme.secondary,
          borderColor: theme.border,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: theme.border,
        };
      default:
        return {
          backgroundColor: theme.card,
          borderColor: theme.border,
        };
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: RADIUS["2xl"],
          borderWidth: 1,
          overflow: "hidden",
        },
        getVariantStyle(),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export interface PressableCardProps extends PressableProps {
  variant?: "default" | "glass" | "accent" | "outline";
  glow?: boolean;
}

export function PressableCard({
  style,
  children,
  variant = "default",
  glow,
  onPressIn,
  onPressOut,
  ...rest
}: PressableCardProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    onPressOut?.(e);
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "glass":
        return {
          backgroundColor: theme.glassBackground,
          borderColor: theme.glassBorder,
        };
      case "accent":
        return {
          backgroundColor: theme.secondary,
          borderColor: theme.border,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: theme.border,
        };
      default:
        return {
          backgroundColor: theme.card,
          borderColor: theme.border,
        };
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          borderRadius: RADIUS["2xl"],
          borderWidth: 1,
          overflow: "hidden",
        },
        getVariantStyle(),
        animatedStyle,
        style as any,
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Card sub-components ────────────────────────────────────────────────────

export function CardHeader({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[
        { padding: SPACING[4], paddingBottom: SPACING[2], gap: SPACING[0.5] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}) {
  return (
    <ThemedText type="cardTitle" style={style} numberOfLines={numberOfLines}>
      {children}
    </ThemedText>
  );
}

export function CardDescription({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}) {
  return (
    <ThemedText
      type="caption"
      muted
      style={[{ marginTop: 2 }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </ThemedText>
  );
}

export function CardContent({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[
        { paddingHorizontal: SPACING[4], paddingBottom: SPACING[4] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function CardFooter({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          padding: SPACING[4],
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
