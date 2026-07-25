import React, { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { cn } from '@/lib/style-utils';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    loading,
    disabled,
    leftIcon,
    rightIcon,
    children,
    style,
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  };

  const variants: Record<Variant, ViewStyle> = {
    default: {
      backgroundColor: theme.primary,
    },
    secondary: {
      backgroundColor: theme.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: theme.destructive,
    },
    link: {
      backgroundColor: 'transparent',
    },
  };

  const sizes: Record<Size, ViewStyle> = {
    sm: {
      paddingHorizontal: SPACING[3],
      paddingVertical: SPACING[1.5],
      minHeight: 32,
      gap: SPACING[1],
    },
    md: {
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[2],
      minHeight: 40,
      gap: SPACING[2],
    },
    lg: {
      paddingHorizontal: SPACING[6],
      paddingVertical: SPACING[3],
      minHeight: 48,
      gap: SPACING[2],
    },
    icon: {
      padding: 0,
      width: 40,
      height: 40,
    },
  };

  const textColors: Record<Variant, string> = {
    default: theme.primaryForeground,
    secondary: theme.secondaryForeground,
    outline: theme.foreground,
    ghost: theme.foreground,
    destructive: theme.destructiveForeground,
    link: theme.primary,
  };

  const textSizes: Record<Size, { fontSize: number; fontWeight: any }> = {
    sm: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
    md: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
    lg: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
    icon: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  };

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) =>
        cn(
          base,
          variants[variant],
          sizes[size],
          pressed && { opacity: variant === 'link' ? 0.6 : 0.85 },
          isDisabled && { opacity: 0.5 },
          style
        )
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size={size === 'sm' || size === 'icon' ? 'small' : 'small'}
          color={textColors[variant]}
        />
      ) : (
        <>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text
              style={[
                { color: textColors[variant] },
                textSizes[size],
                variant === 'link' && { textDecorationLine: 'underline' as const },
              ]}
              numberOfLines={1}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
