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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
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
    onPressIn,
    onPressOut,
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    onPressOut?.(e);
  };

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const variants: Record<Variant, ViewStyle> = {
    default: {
      backgroundColor: theme.primary,
    },
    primary: {
      backgroundColor: theme.primary,
    },
    secondary: {
      backgroundColor: theme.secondary,
      borderWidth: 1,
      borderColor: theme.border,
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
      borderRadius: RADIUS.md,
      gap: SPACING[1.5],
    },
    md: {
      paddingHorizontal: SPACING[4],
      paddingVertical: SPACING[2.5],
      minHeight: 40,
      borderRadius: RADIUS.lg,
      gap: SPACING[2],
    },
    lg: {
      paddingHorizontal: SPACING[6],
      paddingVertical: SPACING[3],
      minHeight: 48,
      borderRadius: RADIUS.xl,
      gap: SPACING[2],
    },
    icon: {
      padding: 0,
      width: 40,
      height: 40,
      borderRadius: RADIUS.lg,
    },
  };

  const textColors: Record<Variant, string> = {
    default: theme.primaryForeground,
    primary: theme.primaryForeground,
    secondary: theme.secondaryForeground,
    outline: theme.foreground,
    ghost: theme.foreground,
    destructive: theme.destructiveForeground,
    link: theme.foreground,
  };

  const textVariant = size === 'sm' ? TYPOGRAPHY.buttonSm : TYPOGRAPHY.button;

  return (
    <AnimatedPressable
      ref={ref}
      disabled={isDisabled}
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        base,
        variants[variant],
        sizes[size],
        animatedStyle,
        isDisabled && { opacity: 0.5 },
        style as any,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <>
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text
              style={[
                textVariant,
                { color: textColors[variant] },
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
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
