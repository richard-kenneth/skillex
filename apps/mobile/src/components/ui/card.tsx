import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, SHADOWS } from '@/constants/theme';
import { cn } from '@/lib/style-utils';

export interface CardProps extends ViewProps {}

export function Card({ style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={cn(
        {
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
        SHADOWS.sm,
        style
      )}
      {...rest}
    >
      {children}
    </View>
  );
}

export interface CardHeaderProps extends ViewProps {}

export function CardHeader({ style, children, ...rest }: CardHeaderProps) {
  return (
    <View style={cn({ padding: SPACING[5], gap: SPACING[1.5] }, style)} {...rest}>
      {children}
    </View>
  );
}

export interface CardTitleProps {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}

export function CardTitle({ children, style, numberOfLines }: CardTitleProps) {
  return (
    <ThemedText
      type="default"
      style={[
        { fontSize: 18, fontWeight: '700', lineHeight: 26, letterSpacing: -0.2 },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </ThemedText>
  );
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}

export function CardDescription({
  children,
  style,
  numberOfLines,
}: CardDescriptionProps) {
  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      style={[{ fontSize: 13, lineHeight: 20 }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </ThemedText>
  );
}

export interface CardContentProps extends ViewProps {}

export function CardContent({ style, children, ...rest }: CardContentProps) {
  return (
    <View
      style={cn(
        { paddingHorizontal: SPACING[5], paddingBottom: SPACING[5] },
        style
      )}
      {...rest}
    >
      {children}
    </View>
  );
}

export interface CardFooterProps extends ViewProps {}

export function CardFooter({ style, children, ...rest }: CardFooterProps) {
  return (
    <View
      style={cn(
        {
          padding: SPACING[5],
          borderTopWidth: StyleSheet.hairlineWidth,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
