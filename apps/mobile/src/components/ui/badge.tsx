import React from 'react';
import { View, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, getAccent } from '@/constants/theme';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'accent' | 'warning';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  dot?: boolean;
  accent?: string;
  style?: ViewStyle;
}

export function Badge({
  children,
  variant = 'secondary',
  dot = false,
  accent,
  style,
}: BadgeProps) {
  const theme = useTheme();
  const accentPalette = accent ? getAccent(accent) : null;

  const base: ViewStyle = {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[2.5],
    paddingVertical: 3,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  };

  type VariantStyle = ViewStyle & { _textColor: string; _dotColor: string };

  const variants: Record<Variant, VariantStyle> = {
    default: {
      backgroundColor: theme.primary,
      _textColor: theme.primaryForeground,
      _dotColor: theme.primaryForeground,
    },
    secondary: {
      backgroundColor: theme.secondary,
      borderWidth: 1,
      borderColor: theme.border,
      _textColor: theme.mutedForeground,
      _dotColor: theme.mutedForeground,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
      _textColor: theme.foreground,
      _dotColor: theme.mutedForeground,
    },
    destructive: {
      backgroundColor: theme.destructive,
      _textColor: theme.destructiveForeground,
      _dotColor: theme.destructiveForeground,
    },
    success: {
      backgroundColor: getAccent('green').bg,
      borderWidth: 1,
      borderColor: getAccent('green').border,
      _textColor: getAccent('green').main,
      _dotColor: getAccent('green').main,
    },
    warning: {
      backgroundColor: getAccent('amber').bg,
      borderWidth: 1,
      borderColor: getAccent('amber').border,
      _textColor: getAccent('amber').main,
      _dotColor: getAccent('amber').main,
    },
    accent: accentPalette
      ? {
          backgroundColor: accentPalette.bg,
          borderWidth: 1,
          borderColor: accentPalette.border,
          _textColor: accentPalette.main,
          _dotColor: accentPalette.main,
        }
      : {
          backgroundColor: theme.secondary,
          _textColor: theme.mutedForeground,
          _dotColor: theme.mutedForeground,
        },
  };

  const chosen = variants[variant];
  const { _textColor, _dotColor, ...viewStyle } = chosen;

  return (
    <View style={[base, viewStyle, style]}>
      {dot && (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: _dotColor,
            flexShrink: 0,
          }}
        />
      )}
      <ThemedText
        type="badge"
        style={{
          color: _textColor,
        }}
      >
        {children}
      </ThemedText>
    </View>
  );
}
