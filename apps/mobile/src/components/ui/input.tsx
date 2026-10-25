import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Text,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import {
  FONT_SIZE,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  ANIMATION,
} from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: any;
  inputWrapperStyle?: any;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  description?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    containerStyle,
    inputWrapperStyle,
    leftSlot,
    rightSlot,
    description,
    style,
    placeholderTextColor,
    multiline,
    numberOfLines,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const hasError = !!error;
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = hasError
    ? theme.destructive
    : isFocused
      ? theme.foreground
      : theme.border;

  return (
    <View style={[{ gap: SPACING[1.5] }, containerStyle]}>
      {label ? (
        <ThemedText type="label" style={{ marginLeft: SPACING[0.5] }}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor,
            backgroundColor: theme.background,
            paddingHorizontal: SPACING[3],
            minHeight: multiline ? 100 : 44,
            gap: SPACING[2],
          },
          inputWrapperStyle,
        ]}
      >
        {leftSlot ? <View style={styles.slot}>{leftSlot}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={placeholderTextColor ?? theme.mutedForeground}
          style={[
            {
              flex: 1,
              color: theme.foreground,
              fontSize: FONT_SIZE.md,
              fontWeight: "400",
              paddingVertical: SPACING[2.5],
              textAlignVertical: multiline ? "top" : "center",
              minHeight: multiline ? 100 : undefined,
            },
            style,
          ]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot ? <View style={styles.slot}>{rightSlot}</View> : null}
      </View>
      {description && !hasError ? (
        <ThemedText type="caption" muted style={{ marginLeft: SPACING[0.5] }}>
          {description}
        </ThemedText>
      ) : null}
      {hasError ? (
        <Text
          style={{
            fontSize: FONT_SIZE.sm,
            color: theme.destructive,
            marginLeft: SPACING[0.5],
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export const Textarea = forwardRef<TextInput, InputProps>(
  function Textarea(props, ref) {
    return (
      <Input
        ref={ref}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        {...props}
      />
    );
  },
);

export interface LabelProps {
  children?: React.ReactNode;
  label?: string;
  style?: any;
  htmlFor?: string;
}

export function Label({ children, label, style }: LabelProps) {
  return (
    <ThemedText type="label" style={style}>
      {label ?? children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
