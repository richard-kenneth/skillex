import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useT } from "lib/i18n";
import {
  ActionSheet,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PressableCard,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  useToast,
} from "@/components/ui";
import { CustomHeader } from "@/components/ui/custom-header";
import {
  FONT_SIZE,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
  getAccent,
  SHADOWS,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useCurrentUser,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUpdateNotificationPreferences,
} from "@/lib/api-hooks";
import {
  EXCHANGE_NOTIFICATION_TYPES,
  POINTS_NOTIFICATION_TYPES,
  formatDateTimeShort,
  getNotificationMeta,
} from "@skil-ex2/shared";
import { useNavigation, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleDot,
  Coins,
  Handshake,
  MessageCircle,
  MoreHorizontal,
  Star,
  Trash2,
  UserPlus,
  Video,
} from "lucide-react-native";
import React from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterTab = "all" | "exchanges" | "points" | "system";

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
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT('notifications');

  const [tab, setTab] = React.useState<FilterTab>("all");
  const [sheetOpen, setSheetOpen] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const notifQ = useNotifications({});
  const markReadQ = useMarkNotificationRead();
  const markAllQ = useMarkAllNotificationsRead();
  const deleteQ = useDeleteNotification();
  const updatePrefsQ = useUpdateNotificationPreferences();
  const userQ = useCurrentUser();

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([notifQ.refetch(), userQ.refetch()]);
    setRefreshing(false);
  }, [notifQ, userQ]);

  const items = React.useMemo(() => {
    const all = notifQ.data ?? [];
    if (tab === "all") return all;
    if (tab === "exchanges")
      return all.filter((n: any) =>
        EXCHANGE_NOTIFICATION_TYPES.includes(n.type),
      );
    if (tab === "points")
      return all.filter((n: any) => POINTS_NOTIFICATION_TYPES.includes(n.type));
    return all.filter(
      (n: any) =>
        !EXCHANGE_NOTIFICATION_TYPES.includes(n.type) &&
        !POINTS_NOTIFICATION_TYPES.includes(n.type),
    );
  }, [notifQ.data, tab]);

  const unreadCount = (notifQ.data ?? []).filter((n: any) => !n.read).length;
  const unexchCount = (notifQ.data ?? []).filter(
    (n: any) => !n.read && EXCHANGE_NOTIFICATION_TYPES.includes(n.type),
  ).length;
  const unptsCount = (notifQ.data ?? []).filter(
    (n: any) => !n.read && POINTS_NOTIFICATION_TYPES.includes(n.type),
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader
        title="Notifications 🔔"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        showBack={true}
        showNotifications={false}
        rightAction={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CheckCheck size={14} color={theme.foreground} />}
              onPress={async () => {
                try {
                  await markAllQ.mutateAsync();
                  toast.toast({ title: t('markedAllRead'), variant: 'success' });
                } catch {
                  toast.toast({ title: t('couldNotMarkAllRead'), variant: 'error' });
                }
              }}
            >
              Mark all
            </Button>
          ) : undefined
        }
      />

      <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, flex: 1, alignSelf: "center" }}>
        <View style={{ paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] }}>
          <Tabs<FilterTab>
            variant="pills"
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: t('filterAll'), badge: unreadCount || undefined },
              {
                value: "exchanges",
                label: t('filterExchanges'),
                badge: unexchCount || undefined,
              },
              {
                value: "points",
                label: t('filterPoints'),
                badge: unptsCount || undefined,
              },
              { value: "system", label: t('filterSystem') },
            ]}
          />
        </View>

        <FlatList
          data={items as any[]}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING[4],
            paddingBottom: insets.bottom + 90,
            gap: SPACING[2.5],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.mutedForeground}
              colors={["#6366f1"]}
            />
          }
          ListEmptyComponent={
            notifQ.isLoading ? (
              <View style={{ gap: SPACING[2] }}>
                <Skeleton width="100%" height={70} rounded />
                <Skeleton width="100%" height={70} rounded />
              </View>
            ) : (
              <View
                style={{
                  padding: SPACING[8],
                  borderRadius: RADIUS.xl,
                  backgroundColor: "rgba(24, 24, 27, 0.6)",
                  borderWidth: 1,
                  borderColor: "rgba(63, 63, 70, 0.4)",
                  alignItems: "center",
                  gap: SPACING[3],
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: RADIUS.pill,
                    backgroundColor: getAccent("indigo").bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bell size={24} color={theme.foreground} />
                </View>
                <ThemedText type="default" style={{ fontWeight: '600', color: theme.foreground }}>
                  {t('noNotificationsTitle')}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: "center" }}>
                  {t('noNotificationsDesc')}
                </ThemedText>
              </View>
            )
          }
          renderItem={({ item: n }) => {
            const meta = getNotificationMeta(n.type);
            const palette = getAccent(meta.colorClass);
            const isUnread = !n.read;

            return (
              <PressableCard
                key={n.id}
                onPress={() => {
                  if (!n.read) markReadQ.mutate(n.id);
                  if (n.link) router.push(n.link as any);
                }}
                style={{
                  padding: SPACING[3.5],
                  flexDirection: "row",
                  gap: SPACING[3],
                  alignItems: "center",
                  borderColor: isUnread ? "rgba(99, 102, 241, 0.4)" : "rgba(63, 63, 70, 0.4)",
                  backgroundColor: isUnread ? "rgba(99, 102, 241, 0.08)" : "rgba(24, 24, 27, 0.7)",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: RADIUS.xl,
                    backgroundColor: palette.bg,
                    borderWidth: 1,
                    borderColor: palette.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {iconFor(n.type, palette.main)}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        fontSize: FONT_SIZE.md,
                        color: theme.foreground,
                        fontWeight: isUnread ? "800" : "600",
                      }}
                      numberOfLines={1}
                    >
                      {n.title}
                    </ThemedText>
                    {isUnread && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#6366f1",
                        }}
                      />
                    )}
                  </View>
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.mutedForeground,
                      fontSize: FONT_SIZE.sm,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {n.message}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.mutedForeground,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {formatDateTimeShort(n.createdAt)}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => setSheetOpen(n.id)}
                  hitSlop={10}
                  style={{ padding: SPACING[1] }}
                >
                  <MoreHorizontal size={18} color="#71717a" />
                </Pressable>

                <ActionSheet
                  open={sheetOpen === n.id}
                  onClose={() => setSheetOpen(null)}
                  title={t('actionsTitle')}
                  options={[
                    ...(!n.read
                      ? [
                          {
                            label: t('markAsRead'),
                            icon: (
                              <CheckCheck
                                size={16}
                                color={theme.foreground}
                              />
                            ),
                            onPress: () => {
                              markReadQ.mutate(n.id);
                              toast.toast({ title: t('markedRead') });
                            },
                          },
                        ]
                      : []),
                    {
                      label: t('delete'),
                      destructive: true,
                      icon: <Trash2 size={16} color="#ef4444" />,
                      onPress: () => {
                        deleteQ.mutate(n.id);
                        toast.toast({ title: t('deleted') });
                      },
                    },
                  ]}
                />
              </PressableCard>
            );
          }}
        />
      </View>
    </View>
  );
}
