import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import {
  FONT_SIZE,
  RADIUS,
  SPACING,
  getAccent,
  MAX_CONTENT_WIDTH,
  ICON_SIZE,
} from "@/constants/theme";
import { useT } from "lib/i18n";
import {
  Avatar,
  Badge,
  Button,
  PressableCard,
  SkeletonText,
  Tabs,
} from "@/components/ui";
import { Progress } from "@/components/ui/form";
import { CustomHeader } from "@/components/ui/custom-header";
import { ThemedText } from "@/components/themed-text";
import { useCurrentUser, useExchanges } from "@/lib/api-hooks";
import {
  getExchangeStatusColor,
  calculateExchangeProgress,
  calculatePointsBreakdown,
  formatDateShort,
  formatDateTimeShort,
} from "@skillex/shared";
import {
  ArrowRightLeft,
  Handshake,
  CalendarCheck,
  Video,
  ChevronRight,
  Coins,
  Users,
  Clock,
  Lock,
  MessageCircle,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Filter = "all" | "active" | "completed" | "cancelled";

export default function ExchangesListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT("exchanges");

  const exchangesQ = useExchanges();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [refreshing, setRefreshing] = React.useState(false);

  const all = exchangesQ.data ?? [];

  const filtered = React.useMemo(() => {
    if (filter === "active")
      return all.filter((e: any) =>
        ["COMMITTED", "IN_PROGRESS", "ACCEPTED", "SCHEDULED"].includes(
          e.status,
        ),
      );
    if (filter === "completed")
      return all.filter((e: any) => e.status === "COMPLETED");
    if (filter === "cancelled")
      return all.filter((e: any) =>
        ["CANCELLED", "REJECTED", "EXPIRED"].includes(e.status),
      );
    return all;
  }, [all, filter]);

  const activeCount = all.filter((e: any) =>
    ["COMMITTED", "IN_PROGRESS", "ACCEPTED", "SCHEDULED"].includes(e.status),
  ).length;
  const completedCount = all.filter(
    (e: any) => e.status === "COMPLETED",
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader
        title={t("title")}
        subtitle={t("activeCompletedCount", {
          active: activeCount,
          completed: completedCount,
        })}
        showNotifications
        showSearch
      />

      <View
        style={{
          width: "100%",
          maxWidth: MAX_CONTENT_WIDTH,
          flex: 1,
          alignSelf: "center",
        }}
      >
        <View
          style={{ paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] }}
        >
          <Tabs<Filter>
            variant="pills"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: t("statusAll") },
              {
                value: "active",
                label: t("statusActive"),
                badge: activeCount || undefined,
              },
              {
                value: "completed",
                label: t("statusCompleted"),
                badge: completedCount || undefined,
              },
              { value: "cancelled", label: t("statusCancelled") },
            ]}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING[4],
            paddingBottom: insets.bottom + 100,
            gap: SPACING[3],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await exchangesQ.refetch();
                setRefreshing(false);
              }}
              tintColor={theme.mutedForeground}
              colors={[theme.mutedForeground]}
            />
          }
          ListEmptyComponent={
            exchangesQ.isLoading ? (
              <View style={{ gap: SPACING[3] }}>
                <SkeletonText lines={4} />
                <SkeletonText lines={4} />
              </View>
            ) : (
              <View
                style={{
                  padding: SPACING[6],
                  borderRadius: RADIUS.xl,
                  backgroundColor: theme.secondary,
                  alignItems: "center",
                  gap: SPACING[3],
                  marginVertical: SPACING[4],
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: theme.background,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Handshake size={28} color={theme.mutedForeground} />
                </View>
                <ThemedText type="cardTitle" style={{ textAlign: "center" }}>
                  {t("noExchangesTitle")}
                </ThemedText>
                <ThemedText
                  type="caption"
                  muted
                  style={{ textAlign: "center", maxWidth: 280 }}
                >
                  {t("noExchangesDesc")}
                </ThemedText>
                <Button
                  size="sm"
                  variant="default"
                  onPress={() => router.push("/(tabs)/matches" as any)}
                  leftIcon={<Users size={14} color={theme.primaryForeground} />}
                >
                  {t("findMatches")}
                </Button>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(index * 40)}
            >
              <ExchangeRowCard
                exchange={item}
                onPress={() => router.push(`/exchanges/${item.id}` as any)}
              />
            </Animated.View>
          )}
        />
      </View>
    </View>
  );
}

export function ExchangeRowCard({
  exchange,
  onPress,
}: {
  exchange: any;
  onPress: () => void;
}) {
  const theme = useTheme();
  const t = useT("exchanges");
  const statusColor = getExchangeStatusColor(exchange.status);
  const userQ = useCurrentUser();
  const user = userQ.data;
  const isSender = exchange.senderId === user?.id;
  const otherUser = isSender
    ? exchange.receiver
    : (exchange.sender ?? exchange.otherUser);

  // Skills
  const taughtName =
    exchange.taughtSkillName ?? exchange.taughtSkill?.name ?? "Skill";
  const receivedName =
    exchange.receivedSkillName ?? exchange.receivedSkill?.name;
  const isTwoWay = !!receivedName;

  // Progress calculations
  const progress = calculateExchangeProgress(exchange);
  const totalSessions =
    (exchange.requestedSkillSessions ?? 0) +
    (isTwoWay ? (exchange.offeredSkillSessions ?? 0) : 0);
  const completedSessions =
    exchange.completedSessions ??
    exchange.sessions?.filter((s: any) => s.status === "COMPLETED").length ??
    0;

  // Points calculation
  const pointsVal = exchange.pointsAmount ?? exchange.pointsValue ?? 0;
  const isPayer = exchange.pointsPayerId
    ? exchange.pointsPayerId === user?.id
    : isSender;
  const pointsBreakdown =
    pointsVal > 0 ? calculatePointsBreakdown(pointsVal) : null;
  const displayPoints = pointsBreakdown
    ? isPayer
      ? pointsBreakdown.gross
      : pointsBreakdown.net
    : 0;

  const nextSession = exchange.sessions?.find(
    (s: any) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS",
  );

  return (
    <PressableCard
      onPress={onPress}
      style={{ padding: SPACING[4], gap: SPACING[3] }}
    >
      {/* Title & Skills header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: SPACING[2],
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <ThemedText
              type="cardTitle"
              style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}
            >
              {taughtName}
            </ThemedText>
            {isTwoWay ? (
              <>
                <ArrowRightLeft size={12} color={theme.primary} />
                <ThemedText
                  type="cardTitle"
                  style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}
                >
                  {receivedName}
                </ThemedText>
              </>
            ) : null}
          </View>

          {/* Peer & Relationship */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[2],
            }}
          >
            <Avatar
              uri={otherUser?.image}
              fallback={otherUser?.name}
              size={22}
            />
            <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.sm }}>
              {isSender ? t("learningFrom") : t("teaching")}{" "}
              <ThemedText
                type="caption"
                style={{ fontWeight: "600", color: theme.foreground }}
              >
                {otherUser?.name ?? t("peerTrader")}
              </ThemedText>
            </ThemedText>
          </View>
        </View>

        <Badge variant="accent" accent={statusColor}>
          {labelForStatus(exchange.status, t)}
        </Badge>
      </View>

      {/* Progress bar */}
      <View style={{ gap: SPACING[1.5], marginTop: 2 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
            {t("progress")}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              fontWeight: "700",
              fontSize: FONT_SIZE.xs,
              color: theme.primary,
            }}
          >
            {progress}%
          </ThemedText>
        </View>
        <Progress value={progress} />
      </View>

      {/* Meta Chips Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[2] }}>
        {totalSessions > 0 ? (
          <MetaChip
            icon={<Clock size={12} color={theme.mutedForeground} />}
            label={t("sessionsCount", {
              completed: completedSessions,
              total: totalSessions,
            })}
          />
        ) : null}

        {pointsVal > 0 ? (
          <MetaChip
            accent="amber"
            icon={<Coins size={12} color={getAccent("amber").main} />}
            label={
              exchange.escrowLocked
                ? t("pointsEscrowed", { points: displayPoints })
                : `${displayPoints} pts`
            }
          />
        ) : null}

        {nextSession?.scheduledAt || nextSession?.startTime ? (
          <MetaChip
            accent="indigo"
            icon={<Video size={12} color={getAccent("indigo").main} />}
            label={t("sessionLabel", {
              date: formatDateTimeShort(
                nextSession.scheduledAt ?? nextSession.startTime,
              ),
            })}
          />
        ) : exchange.committedAt || exchange.createdAt ? (
          <MetaChip
            icon={<CalendarCheck size={12} color={theme.mutedForeground} />}
            label={t("startedLabel", {
              date: formatDateShort(exchange.committedAt ?? exchange.createdAt),
            })}
          />
        ) : null}

        {exchange.unreadCount ||
        exchange.hasUnreadChat ||
        exchange.unreadMessagesCount ? (
          <MetaChip
            accent="indigo"
            icon={<MessageCircle size={12} color={getAccent("indigo").main} />}
            label={t("newChat")}
          />
        ) : null}
      </View>

      {/* Card footer link */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: SPACING[1],
          borderTopWidth: 1,
          borderTopColor: theme.border + "60",
        }}
      >
        <ThemedText
          type="caption"
          style={{
            color: theme.primary,
            fontWeight: "600",
            fontSize: FONT_SIZE.xs,
          }}
        >
          {t("viewExchangeDetails")}
        </ThemedText>
        <ChevronRight size={14} color={theme.primary} />
      </View>
    </PressableCard>
  );
}

function labelForStatus(s: string, t: (k: string) => string) {
  switch (s) {
    case "COMMITTED":
      return t("committed");
    case "IN_PROGRESS":
      return t("in_progress") ?? "In Progress";
    case "COMPLETED":
      return t("completed") ?? "Completed";
    case "CANCELLED":
      return t("cancelled") ?? "Cancelled";
    case "ACCEPTED":
      return t("accepted") ?? "Accepted";
    case "SCHEDULED":
      return t("scheduled") ?? "Scheduled";
    case "PENDING":
      return t("pending") ?? "Pending";
    case "REJECTED":
      return t("rejected") ?? "Rejected";
    case "EXPIRED":
      return t("expired") ?? "Expired";
    default:
      return s ? s.replace(/_/g, " ") : t("active");
  }
}

function MetaChip({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  accent?: string;
}) {
  const theme = useTheme();
  const palette = accent ? getAccent(accent) : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING[1.5],
        paddingHorizontal: SPACING[2.5],
        paddingVertical: 4,
        borderRadius: RADIUS.md,
        backgroundColor: palette ? palette.bg : theme.secondary,
        borderWidth: 1,
        borderColor: palette ? palette.border : theme.border,
      }}
    >
      {icon}
      <ThemedText
        type="badge"
        style={{
          color: palette ? palette.main : theme.mutedForeground,
          fontSize: FONT_SIZE.xs,
        }}
      >
        {label}
      </ThemedText>
    </View>
  );
}
