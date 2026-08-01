import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ArrowLeft, Search } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, ICON_SIZE } from '@/constants/theme';
import { useCurrentUser, useNotifications } from '@/lib/api-hooks';

interface CustomHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showUser?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  rightAction?: React.ReactNode;
  style?: any;
}

export function CustomHeader({
  title,
  subtitle,
  showBack = false,
  showUser = false,
  showNotifications = true,
  showSearch = false,
  rightAction,
  style,
}: CustomHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userQ = useCurrentUser();
  const user = userQ.data;

  const notifQ = useNotifications({});
  const unreadCount = (notifQ.data as any[])?.filter((n: any) => !n.read)?.length ?? 0;

  return (
    <View
      style={[
        {
          paddingTop: Math.max(insets.top, 12) + 4,
          paddingHorizontal: SPACING[4],
          paddingBottom: SPACING[3],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: theme.secondary, borderColor: theme.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ArrowLeft size={ICON_SIZE.md} color={theme.foreground} />
          </Pressable>
        ) : showUser ? (
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={styles.userSection}
          >
            <Avatar
              uri={user?.avatar}
              fallback={user?.name || user?.username || 'U'}
              size={36}
            />
            <View style={styles.userText}>
              <ThemedText type="cardTitle" numberOfLines={1}>
                {user?.name?.split(' ')[0] || user?.username || 'Hi'}
              </ThemedText>
              <ThemedText type="caption" muted numberOfLines={1}>
                {user?.role || 'Skill Exchanger'}
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <View style={styles.titleSection}>
            {title ? (
              <ThemedText type="sectionTitle" numberOfLines={1}>
                {title}
              </ThemedText>
            ) : null}
            {subtitle ? (
              <ThemedText type="caption" muted numberOfLines={1} style={{ marginTop: 2 }}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        )}

        <View style={styles.actions}>
          {showSearch && (
            <Pressable
              onPress={() => router.push('/explore' as any)}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: theme.secondary, borderColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Search size={ICON_SIZE.sm} color={theme.foreground} />
            </Pressable>
          )}

          {rightAction}

          {showNotifications && (
            <Pressable
              onPress={() => router.push('/notifications' as any)}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: theme.secondary, borderColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Bell size={ICON_SIZE.sm} color={theme.foreground} />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.notifDot,
                    {
                      backgroundColor: theme.destructive,
                      borderColor: theme.background,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2.5],
    flex: 1,
  },
  userText: {
    justifyContent: 'center',
    flex: 1,
  },
  titleSection: {
    justifyContent: 'center',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
