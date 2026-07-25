import React, { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Text,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, FONT_WEIGHT } from '@/constants/theme';
import { cn } from '@/lib/style-utils';
import { ThemedText } from '@/components/themed-text';

export interface InputProps extends Omit<TextInputProps, 'placeholderTextColor'> {
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
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View style={cn({ gap: SPACING[2] }, containerStyle)}>
      {label ? (
        <ThemedText
          type="smallBold"
          style={{
            fontSize: FONT_SIZE.sm,
            color: theme.foreground,
            marginLeft: SPACING[0.5],
          }}
        >
          {label}
        </ThemedText>
      ) : null}
      <View
        style={cn(
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: hasError ? '#ef4444' : theme.input,
            backgroundColor: theme.background,
            paddingHorizontal: SPACING[3],
            minHeight: multiline ? 100 : 44,
            gap: SPACING[2],
          },
          inputWrapperStyle
        )}
      >
        {leftSlot ? (
          <View style={styles.slot}>{leftSlot}</View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={placeholderTextColor ?? theme.mutedForeground}
          style={[
            {
              flex: 1,
              color: theme.foreground,
              fontSize: FONT_SIZE.md,
              paddingVertical: SPACING[2],
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 100 : undefined,
            },
            style,
          ]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...rest}
        />
        {rightSlot ? (
          <View style={styles.slot}>{rightSlot}</View>
        ) : null}
      </View>
      {description && !hasError ? (
        <ThemedText
          type="small"
          style={{
            fontSize: FONT_SIZE.sm,
            color: theme.mutedForeground,
            marginLeft: SPACING[0.5],
          }}
        >
          {description}
        </ThemedText>
      ) : null}
      {hasError ? (
        <Text
          style={{
            fontSize: FONT_SIZE.sm,
            color: '#f87171',
            marginLeft: SPACING[0.5],
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export const Textarea = forwardRef<TextInput, InputProps>(function Textarea(
  props,
  ref
) {
  return (
    <Input
      ref={ref}
      multiline
      numberOfLines={6}
      textAlignVertical="top"
      {...props}
    />
  );
});

export interface LabelProps {
  children: React.ReactNode;
  style?: any;
  htmlFor?: string;
}

export function Label({ children, style }: LabelProps) {
  const theme = useTheme();
  return (
    <ThemedText
      type="smallBold"
      style={{
        fontSize: FONT_SIZE.sm,
        color: theme.foreground,
        fontWeight: FONT_WEIGHT.semibold,
        marginLeft: SPACING[0.5],
        marginBottom: SPACING[1],
      }}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
