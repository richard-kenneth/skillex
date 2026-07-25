import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SPACING } from '@/constants/theme';
import { cn } from '@/lib/style-utils';
import { ThemedText } from '@/components/themed-text';

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

  return (
    <View style={cn({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[4] }, style)}>
      <View style={{ flex: 1, gap: SPACING[0.5] }}>
        {label ? (
          <ThemedText type="smallBold" style={{ fontSize: 14, color: theme.foreground }}>
            {label}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText type="small" style={{ fontSize: 12, color: theme.mutedForeground }}>
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        onPress={() => !disabled && onValueChange(!value)}
        style={[
          {
            width: 36,
            height: 20,
            borderRadius: 9999,
            justifyContent: 'center',
            paddingHorizontal: 2,
            backgroundColor: value ? theme.primary : theme.muted,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 9999,
            backgroundColor: '#ffffff',
            alignSelf: value ? 'flex-end' : 'flex-start',
            ...StyleSheet.absoluteFillObject,
            marginTop: 2,
            marginLeft: value ? 18 : 2,
          }}
        />
      </Pressable>
    </View>
  );
}

export function Separator({ style, orientation = 'horizontal' }: { style?: any; orientation?: 'horizontal' | 'vertical' }) {
  const theme = useTheme();
  return (
    <View
      style={cn(
        orientation === 'horizontal'
          ? { height: StyleSheet.hairlineWidth, width: '100%', backgroundColor: theme.border }
          : { width: StyleSheet.hairlineWidth, height: '100%', backgroundColor: theme.border },
        style
      )}
    />
  );
}

export function Progress({
  value,
  style,
}: {
  value: number; // 0 - 100
  style?: any;
}) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      style={cn(
        {
          width: '100%',
          height: 8,
          borderRadius: 9999,
          overflow: 'hidden',
          backgroundColor: `${theme.muted}55`,
        },
        style
      )}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: theme.primary,
          borderRadius: 9999,
        }}
      />
    </View>
  );
}
