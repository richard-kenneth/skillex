import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui";
import {
  FONT_SIZE,
  getAccent,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useCurrentUser,
  useExchanges,
  useMyReviews,
  useNotifications,
  useReferralCode,
  useReferralStats,
} from "@/lib/api-hooks";
import {
  calculateAverageRating,
  calculateExchangeProgress,
  getExchangeStatusColor,
  isOnboardingComplete,
  OnboardingFlags,
  onboardingProgress,
} from "@skil-ex2/shared";
import { useRouter } from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Gift,
  Handshake,
  Plus,
  Repeat2,
  Settings,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react-native";
import React from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userQ = useCurrentUser();
  const exchangesQ = useExchanges();
  const reviewsQ = useMyReviews();
  const notifQ = useNotifications({});
  const referralCodeQ = useReferralCode()
  const referralStatsQ = useReferralStats();

  const referralLoading = referralCodeQ.isLoading || referralStatsQ.isLoading;

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      userQ.refetch(),
      exchangesQ.refetch(),
      reviewsQ.refetch(),
      notifQ.refetch(),
      referralStatsQ.refetch(),
    ]);
    setRefreshing(false);
  }, [userQ, exchangesQ, reviewsQ, notifQ, referralCodeQ, referralStatsQ]);

  const user = userQ.data;
  const exchanges = exchangesQ.data ?? [];
  const activeExchanges = exchanges.filter((e: any) =>
    ["ACCEPTED", "IN_PROGRESS", "SCHEDULED"].includes(e.status),
  );
  const completedCount = exchanges.filter(
    (e: any) => e.status === "COMPLETED",
  ).length;
  const averageRating = reviewsQ.data
    ? calculateAverageRating(reviewsQ.data as any[])
    : 0;
  const reviewCount = reviewsQ.data?.length ?? 0;

  const onboardingFlags: OnboardingFlags = React.useMemo(
    () => ({
      hasCompletedProfile: !!(
        user?.name &&
        (user as any).bio &&
        (user as any).location
      ),
      hasOfferingSkills: !!((user as any)?.userSkills ?? []).some(
        (s: any) => s.type === "OFFERING",
      ),
      hasSeekingSkills: !!((user as any)?.userSkills ?? []).some(
        (s: any) => s.type === "SEEKING",
      ),
    }),
    [user],
  );
  const complete = isOnboardingComplete(onboardingFlags);
  const progress = onboardingProgress(onboardingFlags);
  
  const unreadCount = (notifQ.data ?? []).filter((n: any) => !n.read).length;
  const offeringSkills = ((user as any)?.userSkills ?? []).filter(
    (s: any) => s.type === "OFFERING",
  );
  const seekingSkills = ((user as any)?.userSkills ?? []).filter(
    (s: any) => s.type === "SEEKING",
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
      edges={["top"]}
    >
      <ThemedView
        type="background"
        style={{
          flex: 1,
          alignItems: "center",
        }}
      >
        {/* Header */}
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            paddingHorizontal: SPACING[5],
            paddingTop: SPACING[2],
            paddingBottom: SPACING[4],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: SPACING[3],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[3],
              flex: 1,
            }}
          >
            <Pressable onPress={() => router.push("/(tabs)/profile" as any)}>
              <Avatar
                uri={(user as any)?.image}
                fallback={(user as any)?.name}
                size={44}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <ThemedText
                type="small"
                style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}
              >
                Welcome back
              </ThemedText>
              <ThemedText
                type="title"
                style={{
                  fontSize: FONT_SIZE.xl,
                  fontWeight: "800",
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {user
                  ? ((user as any).name?.split(" ")[0] ?? "Friend")
                  : "Loading…"}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.backgroundElement,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Bell size={18} color={theme.foreground} />
              {unreadCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 9999,
                    backgroundColor: theme.destructive,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: "#fff", fontSize: 10, lineHeight: 12 }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.backgroundElement,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Settings size={18} color={theme.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + SPACING[10],
            paddingHorizontal: SPACING[5],
            gap: SPACING[4],
            width: "100%",
            alignItems: "center",
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          style={{ width: "100%" }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_CONTENT_WIDTH,
              gap: SPACING[4],
            }}
          >
            {/* Onboarding Card */}
            {user && !complete ? (
              <Card style={{ borderColor: `${getAccent("indigo").border}` }}>
                <CardHeader>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[2],
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: RADIUS.md,
                        backgroundColor: getAccent("indigo").bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={18} color={getAccent("indigo").main} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CardTitle>Finish setting up your profile</CardTitle>
                      <CardDescription>
                        Complete these quick steps to start exchanging skills.
                      </CardDescription>
                    </View>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: SPACING[4] }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[3],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          height: 8,
                          borderRadius: 9999,
                          backgroundColor: theme.muted,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${progress}%`,
                            backgroundColor: theme.primary,
                          }}
                        />
                      </View>
                    </View>
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary, fontSize: FONT_SIZE.sm }}
                    >
                      {progress}%
                    </ThemedText>
                  </View>
                  <View style={{ gap: SPACING[2] }}>
                    <OnboardingRow
                      done={onboardingFlags.hasCompletedProfile}
                      title="Complete your profile"
                      subtitle="Add bio + location"
                      onPress={() => router.push("/(tabs)/profile" as any)}
                    />
                    <OnboardingRow
                      done={onboardingFlags.hasOfferingSkills}
                      title="Add a skill you can teach"
                      subtitle="Let others learn from you"
                      onPress={() => router.push("/(tabs)/profile" as any)}
                    />
                    <OnboardingRow
                      done={onboardingFlags.hasSeekingSkills}
                      title="Add a skill you want to learn"
                      subtitle="Get matched with a teacher"
                      onPress={() => router.push("/(tabs)/profile" as any)}
                    />
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {/* Stats 2x2 Grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: SPACING[3],
              }}
            >
              <StatCard
                icon={<Repeat2 size={16} color={getAccent("indigo").main} />}
                color="indigo"
                label="Active Exchanges"
                loading={exchangesQ.isLoading}
                value={
                  exchangesQ.isLoading
                    ? undefined
                    : activeExchanges.length.toString()
                }
              />
              <StatCard
                icon={<Users size={16} color={getAccent("emerald").main} />}
                color="emerald"
                label="Skills Shared"
                loading={userQ.isLoading}
                value={
                  userQ.isLoading ? undefined : offeringSkills.length.toString()
                }
              />
              <StatCard
                icon={<Star size={16} color={getAccent("amber").main} />}
                color="amber"
                label="Average Rating"
                loading={reviewsQ.isLoading}
                value={
                  reviewsQ.isLoading
                    ? undefined
                    : `${averageRating.toFixed(1)}★`
                }
                subtitle={
                  reviewsQ.isLoading
                    ? undefined
                    : `${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                }
              />
              <StatCard
                icon={<Zap size={16} color={getAccent("violet").main} />}
                color="violet"
                label="Total Impact"
                loading={exchangesQ.isLoading}
                value={
                  exchangesQ.isLoading ? undefined : completedCount.toString()
                }
                subtitle={
                  exchangesQ.isLoading ? undefined : "completed exchanges"
                }
              />
            </View>

            {/* Skills Overview */}
            {user ? (
              <Card>
                <CardHeader>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View>
                      <CardTitle>Your Skills</CardTitle>
                      <CardDescription>Tap to manage</CardDescription>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => router.push("/(tabs)/profile" as any)}
                    >
                      Manage
                    </Button>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: SPACING[4] }}>
                  <View style={{ gap: SPACING[2] }}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        fontSize: FONT_SIZE.sm,
                        color: theme.mutedForeground,
                      }}
                    >
                      You teach
                    </ThemedText>
                    {offeringSkills.length === 0 ? (
                      <EmptySkillsRow
                        variant="offering"
                        onAdd={() => router.push("/(tabs)/profile" as any)}
                      />
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: SPACING[2],
                        }}
                      >
                        {offeringSkills.map((s: any) => (
                          <Badge key={s.id} variant="accent" accent="emerald">
                            {s.skill?.name ?? s.skillName}
                            {s.level ? ` · ${s.level}` : ""}
                          </Badge>
                        ))}
                      </View>
                    )}
                  </View>
                  <Separator />
                  <View style={{ gap: SPACING[2] }}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        fontSize: FONT_SIZE.sm,
                        color: theme.mutedForeground,
                      }}
                    >
                      You want to learn
                    </ThemedText>
                    {seekingSkills.length === 0 ? (
                      <EmptySkillsRow
                        variant="seeking"
                        onAdd={() => router.push("/(tabs)/profile" as any)}
                      />
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: SPACING[2],
                        }}
                      >
                        {seekingSkills.map((s: any) => (
                          <Badge key={s.id} variant="accent" accent="blue">
                            {s.skill?.name ?? s.skillName}
                          </Badge>
                        ))}
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <SkeletonCard />
              </Card>
            )}

            {/* Active Exchanges */}
            <Card>
              <CardHeader>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <CardTitle>Active Exchanges</CardTitle>
                    <CardDescription>Keep the momentum going</CardDescription>
                  </View>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => router.push("/(tabs)/exchanges" as any)}
                  >
                    View all
                  </Button>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {exchangesQ.isLoading ? (
                  <View style={{ gap: SPACING[3] }}>
                    <SkeletonText lines={3} />
                    <SkeletonText lines={3} />
                  </View>
                ) : activeExchanges.length === 0 ? (
                  <EmptyExchanges
                    onExplore={() => router.push("/(tabs)/matches" as any)}
                  />
                ) : (
                  activeExchanges.slice(0, 3).map((ex: any) => {
                    const other = (ex as any).otherUser ?? {};
                    const colorName = getExchangeStatusColor(ex.status);
                    const progress = calculateExchangeProgress(ex);
                    return (
                      <Pressable
                        key={ex.id}
                        onPress={() =>
                          router.push(`/exchanges/${ex.id}` as any)
                        }
                        style={{
                          borderRadius: RADIUS.md,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.backgroundElement,
                          padding: SPACING[4],
                          gap: SPACING[3],
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            gap: SPACING[3],
                            alignItems: "center",
                          }}
                        >
                          <Avatar
                            uri={other.image}
                            fallback={other.name}
                            size={40}
                          />
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <ThemedText
                                type="default"
                                style={{
                                  fontWeight: "700",
                                  fontSize: FONT_SIZE.md,
                                }}
                              >
                                {other.name ?? "Peer"}
                              </ThemedText>
                              <Badge variant="accent" accent={colorName}>
                                {ex.status
                                  .replace("_", " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase(),
                                  )}
                              </Badge>
                            </View>
                            <ThemedText
                              type="small"
                              style={{
                                color: theme.mutedForeground,
                                fontSize: FONT_SIZE.sm,
                                marginTop: 2,
                              }}
                            >
                              {(ex as any).taughtSkillName} ↔{" "}
                              {(ex as any).receivedSkillName}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={{ gap: SPACING[1.5] }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                            }}
                          >
                            <ThemedText
                              type="small"
                              style={{
                                fontSize: FONT_SIZE.sm,
                                color: theme.mutedForeground,
                              }}
                            >
                              Progress
                            </ThemedText>
                            <ThemedText
                              type="smallBold"
                              style={{
                                fontSize: FONT_SIZE.sm,
                                color: theme.foreground,
                              }}
                            >
                              {progress}%
                            </ThemedText>
                          </View>
                          <View
                            style={{
                              height: 6,
                              borderRadius: 9999,
                              overflow: "hidden",
                              backgroundColor: `${theme.muted}66`,
                            }}
                          >
                            <View
                              style={{
                                height: "100%",
                                width: `${progress}%`,
                                backgroundColor: theme.primary,
                              }}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Referral Card */}
            <Card style={{ borderColor: `${getAccent("violet").border}` }}>
              <CardHeader>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[3],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: RADIUS.md,
                      backgroundColor: getAccent("violet").bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Gift size={20} color={getAccent("violet").main} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>Invite friends, earn points</CardTitle>
                    <CardDescription>
                      Share your link and earn 200 points per referral
                    </CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {referralLoading ? (
                  <SkeletonText lines={2} />
                ) : (
                  <>
                    <View
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.md,
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.border,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: SPACING[3],
                      }}
                    >
                      <ThemedText
                        type="default"
                        style={{
                          flex: 1,
                          fontSize: FONT_SIZE["2xl"],
                          fontWeight: "600",
                          letterSpacing: 0.5,
                          color: theme.primary,
                          textAlign: "center",
                        }}
                        numberOfLines={1}
                      >
                        {referralCodeQ.data}
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: "row", gap: SPACING[2] }}>
                      <StatChip
                        icon={<Users size={14} color={theme.mutedForeground} />}
                        label="Referrals"
                        value={referralStatsQ.data?.totalReferrals ?? 0}
                      />
                      <StatChip
                        icon={<Zap size={14} color={theme.mutedForeground} />}
                        label="Earned"
                        value={`${referralStatsQ.data?.pointsEarned ?? 0} pts`}
                      />
                    </View>
                    <Button
                      size="md"
                      variant="default"
                      leftIcon={<ChevronRight size={16} color="#fff" />}
                      onPress={() => router.push("/(tabs)/profile" as any)}
                    >
                      Track referrals
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  subtitle?: string;
  color: string;
  loading?: boolean;
}) {
  const theme = useTheme();
  const palette = getAccent(color);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        padding: SPACING[4],
        gap: SPACING[2],
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: RADIUS.sm,
          backgroundColor: palette.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      {loading ? (
        <View style={{ gap: SPACING[1.5] }}>
          <Skeleton width={56} height={26} rounded />
          <Skeleton width="80%" height={12} rounded />
        </View>
      ) : (
        <>
          <ThemedText
            type="title"
            style={{
              fontSize: FONT_SIZE["2xl"],
              fontWeight: "800",
              letterSpacing: -0.3,
              color: theme.foreground,
            }}
          >
            {value ?? "—"}
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}
          >
            {label}
            {subtitle ? ` · ${subtitle}` : ""}
          </ThemedText>
        </>
      )}
    </View>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: SPACING[2.5],
        borderRadius: RADIUS.md,
        backgroundColor: theme.backgroundElement,
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING[2],
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <ThemedText
          type="small"
          style={{ color: theme.mutedForeground, fontSize: 11 }}
        >
          {label}
        </ThemedText>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function OnboardingRow({
  done,
  title,
  subtitle,
  onPress,
}: {
  done: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING[3],
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        backgroundColor: theme.backgroundElement,
        borderWidth: 1,
        borderColor: done ? `${getAccent("emerald").border}` : theme.border,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9999,
          backgroundColor: done ? getAccent("emerald").bg : theme.muted,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: done ? getAccent("emerald").border : "transparent",
        }}
      >
        {done ? (
          <CheckCircle2 size={16} color={getAccent("emerald").main} />
        ) : (
          <Target size={14} color={theme.mutedForeground} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText
          type="smallBold"
          style={{
            fontSize: FONT_SIZE.md,
            color: done ? theme.mutedForeground : theme.foreground,
            textDecorationLine: done ? "line-through" : "none",
          }}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={{
            color: theme.mutedForeground,
            fontSize: FONT_SIZE.sm,
            marginTop: 1,
          }}
        >
          {subtitle}
        </ThemedText>
      </View>
      <ChevronRight size={16} color={theme.mutedForeground} />
    </Pressable>
  );
}

function EmptySkillsRow({
  variant,
  onAdd,
}: {
  variant: "offering" | "seeking";
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onAdd}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING[3],
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: theme.border,
      }}
    >
      <Plus size={16} color={theme.mutedForeground} />
      <ThemedText
        type="small"
        style={{
          color: theme.mutedForeground,
          fontSize: FONT_SIZE.sm,
          flex: 1,
        }}
      >
        No {variant === "offering" ? "teaching" : "learning"} skills yet
      </ThemedText>
      <Button size="sm" variant="ghost">
        Add
      </Button>
    </Pressable>
  );
}

function EmptyExchanges({ onExplore }: { onExplore: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: SPACING[6],
        borderRadius: RADIUS.md,
        backgroundColor: theme.backgroundElement,
        alignItems: "center",
        gap: SPACING[3],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: RADIUS.pill,
          backgroundColor: getAccent("blue").bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Handshake size={24} color={getAccent("blue").main} />
      </View>
      <ThemedText
        type="default"
        style={{ fontWeight: "700", textAlign: "center" }}
      >
        No active exchanges yet
      </ThemedText>
      <ThemedText
        type="small"
        style={{
          color: theme.mutedForeground,
          textAlign: "center",
          fontSize: FONT_SIZE.sm,
        }}
      >
        Find your perfect skill match and start learning today.
      </ThemedText>
      <Button onPress={onExplore} leftIcon={<Users size={16} color="#fff" />}>
        Browse matches
      </Button>
    </View>
  );
}
