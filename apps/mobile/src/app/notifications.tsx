import React from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  SkeletonText,
  Separator,
  Switch,
  Tabs,
  useToast,
  ActionSheet,
  Alert as UIAlert,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/api-hooks';
import {
  EXCHANGE_NOTIFICATION_TYPES,
  POINTS_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_META,
  getNotificationMeta,
  formatDateTimeShort,
} from '@skil-ex2/shared';
import {
  Bell,
  CheckCheck,
  Trash2,
  MoreHorizontal,
  CircleDot,
  MessageCircle,
  Handshake,
  Star,
  Coins,
  CalendarClock,
  Video,
  UserPlus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react-native';
import { cn } from '@/lib/style-utils';

type FilterTab = 'all' | 'exchanges' | 'points' | 'system';

const iconFor = (type: string, color: string) => {
  const map: Record<string, React.ReactNode> = {
    EXCHANGE_REQUEST_CREATED: <Handshake size={16} color={color} />,
    EXCHANGE_REQUEST_ACCEPTED: <CheckCheck size={16} color={color} />,
    EXCHANGE_REQUEST_REJECTED: <Handshake size={16} color={color} />,
    EXCHANGE_STARTED: <Video size={16} color={color} />,
    EXCHANGE_COMPLETED: <CheckCheck size={16} color={color} />,
    EXCHANGE_MESSAGE: <MessageCircle size={16} color={color} />,
    EXCHANGE_CANCELLED: <Handshake size={16} color={color} />,
    POINTS_EARNED: <Coins size={16} color={color} />,
    POINTS_PURCHASED: <Coins size={16} color={color} />,
    POINTS_WITHDRAWAL_REQUESTED: <Coins size={16} color={color} />,
    POINTS_WITHDRAWAL_COMPLETED: <Coins size={16} color={color} />,
    REVIEW_RECEIVED: <Star size={16} color={color} />,
    SESSION_REMINDER: <CalendarClock size={16} color={color} />,
    SESSION_STARTED: <Video size={16} color={color} />,
    REFERRAL_COMPLETED: <UserPlus size={16} color={color} />,
  };
  return map[type] ?? <Bell size={16} color={color} />;
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [tab, setTab] = React.useState<FilterTab>('all');
  const [sheetOpen, setSheetOpen] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const notifQ = useNotifications({});
  const markReadQ = useMarkNotificationRead();
  const markAllQ = useMarkAllNotificationsRead();
  const deleteQ = useDeleteNotification();
  const prefsQ = useNotificationPreferences();
  const updatePrefsQ = useUpdateNotificationPreferences();

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([notifQ.refetch(), prefsQ.refetch()]);
    setRefreshing(false);
  }, [notifQ, prefsQ]);

  const items = React.useMemo(() => {
    const all = notifQ.data ?? [];
    if (tab === 'all') return all;
    if (tab === 'exchanges') return all.filter((n: any) => EXCHANGE_NOTIFICATION_TYPES.includes(n.type));
    if (tab === 'points') return all.filter((n: any) => POINTS_NOTIFICATION_TYPES.includes(n.type));
    return all.filter(
      (n: any) => !EXCHANGE_NOTIFICATION_TYPES.includes(n.type) && !POINTS_NOTIFICATION_TYPES.includes(n.type)
    );
  }, [notifQ.data, tab]);

  const unreadCount = (notifQ.data ?? []).filter((n: any) => !n.readAt).length;
  const unexchCount = (notifQ.data ?? []).filter((n: any) => !n.readAt && EXCHANGE_NOTIFICATION_TYPES.includes(n.type)).length;
  const unptsCount = (notifQ.data ?? []).filter((n: any) => !n.readAt && POINTS_NOTIFICATION_TYPES.includes(n.type)).length;

  React.useEffect(() => {
    nav.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: SPACING[2],
            paddingVertical: SPACING[1],
            borderRadius: RADIUS.md,
          }}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={theme.foreground} />
        </Pressable>
      ),
      headerTitle: 'Notifications',
    });
  }, [nav, router, theme]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1, paddingHorizontal: SPACING[5], gap: SPACING[3], paddingTop: SPACING[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.md,
                  backgroundColor: getAccent('blue').bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} color={getAccent('blue').main} />
              </View>
              <View>
                <ThemedText type="default" style={{ fontSize: FONT_SIZE.lg, fontWeight: '800' }}>
                  {unreadCount} unread
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                  {(notifQ.data?.length ?? 0)} total
                </ThemedText>
              </View>
            </View>
            <Button
              size="sm"
              variant="outline"
              disabled={markAllQ.isPending || unreadCount === 0}
              onPress={async () => {
                await markAllQ.mutateAsync();
                toast.toast({ title: 'All marked as read', variant: 'success' });
              }}
              leftIcon={<CheckCheck size={14} color={theme.foreground} />}
            >
              Mark all
            </Button>
          </View>

          <Tabs<FilterTab>
            variant="pills"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'all', label: 'All', badge: unreadCount || undefined },
              { value: 'exchanges', label: 'Exchanges', badge: unexchCount || undefined },
              { value: 'points', label: 'Points', badge: unptsCount || undefined },
              { value: 'system', label: 'System' },
            ]}
          />

          <FlatList
            data={items as any[]}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{
              paddingBottom: insets.bottom + SPACING[10],
              gap: SPACING[2],
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} colors={[theme.primary]} />
            }
            ItemSeparatorComponent={() => <Separator style={{ marginVertical: SPACING[1] }} />}
            ListEmptyComponent={
              notifQ.isLoading ? (
                <View style={{ gap: SPACING[3], padding: SPACING[2] }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} width="100%" height={72} />
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    padding: SPACING[8],
                    alignItems: 'center',
                    gap: SPACING[3],
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: RADIUS.pill,
                      backgroundColor: theme.backgroundElement,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bell size={22} color={theme.mutedForeground} />
                  </View>
                  <ThemedText type="default" style={{ fontWeight: '700' }}>
                    Nothing here yet
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}
                  >
                    Notifications for exchanges, points and more will appear here.
                  </ThemedText>
                </View>
              )
            }
            renderItem={({ item: n }) => {
              const meta = getNotificationMeta(n.type as any);
              const accentColor = getAccent(meta.colorClass.replace('text-', '') as any);
              const palette = meta.colorClass ? accentColor : { main: theme.foreground, bg: theme.muted };
              return (
                <Pressable
                  onPress={async () => {
                    if (!n.readAt) {
                      try {
                        await markReadQ.mutateAsync(n.id);
                      } catch {}
                    }
                    // Navigate based on type
                    if (n.data?.exchangeId) {
                      router.push(`/exchanges/${n.data.exchangeId}` as any);
                    } else if (n.data?.exchangeRequestId) {
                      router.push(`/requests/${n.data.exchangeRequestId}` as any);
                    } else if (n.data?.userId) {
                      router.push(`/users/${n.data.userId}` as any);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: SPACING[3],
                    padding: SPACING[3],
                    borderRadius: RADIUS.md,
                    backgroundColor: n.readAt ? 'transparent' : `${getAccent('indigo').bg}`,
                    borderWidth: n.readAt ? 0 : 1,
                    borderColor: n.readAt ? 'transparent' : getAccent('indigo').border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: RADIUS.pill,
                      backgroundColor: palette.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {iconFor(n.type, palette.main)}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                        {n.title}
                      </ThemedText>
                      {!n.readAt ? (
                        <CircleDot size={12} color={theme.primary} fill={theme.primary} />
                      ) : null}
                    </View>
                    {n.message ? (
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.mutedForeground,
                          fontSize: FONT_SIZE.sm,
                          lineHeight: 18,
                        }}
                        numberOfLines={3}
                      >
                        {n.message}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="small" style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 4 }}>
                      {formatDateTimeShort(n.createdAt)}
                    </ThemedText>
                  </View>
                  <Pressable
                    hitSlop={10}
                    style={{ padding: SPACING[1] }}
                    onPress={() => setSheetOpen(n.id)}
                  >
                    <MoreHorizontal size={16} color={theme.mutedForeground} />
                  </Pressable>
                  <ActionSheet
                    open={sheetOpen === n.id}
                    onClose={() => setSheetOpen(null)}
                    title="Notification options"
                    options={[
                      {
                        label: n.readAt ? 'Mark as unread' : 'Mark as read',
                        icon: <CheckCheck size={18} color={theme.foreground} />,
                        onPress: async () => {
                          if (n.readAt) {
                            // Unread not available on API — noop
                          } else {
                            await markReadQ.mutateAsync(n.id);
                          }
                        },
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={18} color={theme.destructive as any} />,
                        destructive: true,
                        onPress: async () => {
                          await deleteQ.mutateAsync(n.id);
                          toast.toast({ title: 'Deleted', variant: 'success' });
                        },
                      },
                    ]}
                  />
                </Pressable>
              );
            }}
          />

          {/* Prefs panel */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Quick toggles.</CardDescription>
            </CardHeader>
            <CardContent style={{ gap: SPACING[4] }}>
              <Switch
                label="In-app notifications"
                description="Show toasts inside the app."
                value={prefsQ.data?.channels?.inApp !== false}
                onValueChange={async (v) => {
                  const base = prefsQ.data?.channels ?? {};
                  await updatePrefsQ.mutateAsync({ channels: { ...base, inApp: v } });
                  await prefsQ.refetch();
                }}
              />
              <Switch
                label="Push notifications"
                description="Deliver to device when app is closed."
                value={prefsQ.data?.channels?.push ?? false}
                onValueChange={async (v) => {
                  const base = prefsQ.data?.channels ?? {};
                  await updatePrefsQ.mutateAsync({ channels: { ...base, push: v } });
                  await prefsQ.refetch();
                }}
              />
            </CardContent>
          </Card>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}
