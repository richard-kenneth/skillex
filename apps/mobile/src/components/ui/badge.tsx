import React from 'react';
import { View, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent } from '@/constants/theme';
import { cn } from '@/lib/style-utils';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'accent';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  /** Shared accent name from business helpers: "purple" | "green" | "red" | "blue" | "amber" ... */
  accent?: string;
  style?: ViewStyle;
}

export function Badge({
  children,
  variant = 'default',
  accent,
  style,
}: BadgeProps) {
  const theme = useTheme();
  const accentPalette = accent ? getAccent(accent) : null;

  const base: ViewStyle = {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[2.5],
    paddingVertical: SPACING[0.5],
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  };

  const variants: Record<Variant, ViewStyle & { color: string }> = {
    default: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      color: theme.primaryForeground,
    },
    secondary: {
      backgroundColor: theme.secondary,
      borderColor: theme.secondary,
      color: theme.secondaryForeground,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.border,
      color: theme.foreground,
    },
    destructive: {
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderColor: 'rgba(239,68,68,0.3)',
      color: '#f87171',
    },
    success: {
      backgroundColor: 'rgba(34,197,94,0.15)',
      borderColor: 'rgba(34,197,94,0.3)',
      color: '#4ade80',
    },
    accent: accentPalette
      ? {
          backgroundColor: accentPalette.bg,
          borderColor: accentPalette.border,
          color: accentPalette.main,
        }
      : {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
          color: theme.primaryForeground,
        },
  };

  const chosen = variants[variant];

  return (
    <View style={cn(base, chosen, { color: undefined } as any, style)}>
      <ThemedText
        type="smallBold"
        style={{
          color: chosen.color,
          fontSize: FONT_SIZE.sm,
          lineHeight: 18,
        }}
      >
        {children}
      </ThemedText>
    </View>
  );
}
