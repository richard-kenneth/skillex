import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS } from '@/constants/theme';
import { cn } from '@/lib/style-utils';
import { Image as ExpoImage } from 'expo-image';

interface AvatarProps {
  uri?: string | null;
  fallback?: string;
  size?: number;
  style?: any;
  rounded?: boolean;
}

export function Avatar({
  uri,
  fallback,
  size = 40,
  style,
  rounded = true,
}: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      style={cn(
        {
          width: size,
          height: size,
          borderRadius: rounded ? RADIUS.pill : RADIUS.md,
          backgroundColor: theme.muted,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        style
      )}
    >
      {uri ? (
        <ExpoImage
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <ThemedText
          style={{
            fontSize: Math.round(size * 0.4),
            fontWeight: '700',
            color: theme.foreground,
          }}
          numberOfLines={1}
        >
          {(fallback ?? '?').trim().charAt(0).toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}
