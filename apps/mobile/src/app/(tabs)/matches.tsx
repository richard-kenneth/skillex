import React, { useState, useMemo } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut, FadeInUp } from "react-native-reanimated";
import {
  Users,
  Handshake,
  Inbox,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  ChevronRight,
  GraduationCap,
  BookOpen,
  UserPlus,
  Star,
  ArrowRightLeft,
  Search,
  Sparkles,
  Coins,
  Send,
  X,
  MessageSquare,
  Check,
} from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";
import {
  FONT_SIZE,
  RADIUS,
  SPACING,
  getAccent,
  MAX_CONTENT_WIDTH,
  ICON_SIZE,
} from "@/constants/theme";
import { useI18n, useT } from "lib/i18n";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  PressableCard,
  SkeletonText,
  Tabs,
  useToast,
  AlertDialog,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui";
import { CustomHeader } from "@/components/ui/custom-header";
import { ThemedText } from "@/components/themed-text";
import { AnalyticsEvent, track } from "@/lib/analytics";
import {
  useMatches,
  useRequests,
  useCurrentUser,
  useCreateRequest,
  useAcceptRequest,
  useCancelRequest,
  useRejectRequest,
} from "@/lib/api-hooks";
import {
  getRequestStatusColor,
  formatDateShort,
  calculateAverageRating,
  calculatePointsBreakdown,
} from "@skillex/shared";

type PrimaryTab = "discover" | "requests";
type RequestSubTab = "received" | "sent";

export default function MatchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT("matches");

  const [tab, setTab] = useState<PrimaryTab>("discover");
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>("received");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatchForDialog, setSelectedMatchForDialog] = useState<
    any | null
  >(null);

  const matchesQ = useMatches();
  const requestsQ = useRequests();
  const currentUserQ = useCurrentUser();

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      matchesQ.refetch(),
      requestsQ.refetch(),
      currentUserQ.refetch(),
    ]);
    setRefreshing(false);
  };

  const matchesData = matchesQ.data as any;
  const perfectMatches: any[] = matchesData?.perfectMatches ?? [];
  const partialMatches: any[] = matchesData?.partialMatches ?? [];

  const requestsData = requestsQ.data as any;
  const currentUserId = currentUserQ.data?.id;

  const incoming: any[] =
    requestsData?.["received"] ??
    (Array.isArray(requestsData)
      ? requestsData.filter((r: any) => r.receiverId === currentUserId)
      : []);

  const outgoing: any[] =
    requestsData?.["sent"] ??
    (Array.isArray(requestsData)
      ? requestsData.filter((r: any) => r.senderId === currentUserId)
      : []);

  const totalMatchesCount = perfectMatches.length + partialMatches.length;
  const totalRequestsCount = incoming.length + outgoing.length;

  const currentUserSkills = currentUserQ.data?.skills ?? [];
  const seekingCount = currentUserSkills.filter(
    (s: any) => s.type === "SEEKING",
  ).length;
  const noSeekingSkills = !currentUserQ.isLoading && seekingCount === 0;

  // Filter users by search query
  const filterUsers = (users: any[]) => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(q);
      const bioMatch = u.bio?.toLowerCase().includes(q);
      const skillsList = u.skills || [];
      const skillMatch = skillsList.some((s: any) => {
        const skillName = s.skill?.name || s.name || "";
        return skillName.toLowerCase().includes(q);
      });
      const canTeachMatch = (u.canTeachMe || []).some((s: any) =>
        s.name?.toLowerCase().includes(q),
      );
      const canLearnMatch = (u.canLearnFromMe || []).some((s: any) =>
        s.name?.toLowerCase().includes(q),
      );
      return (
        nameMatch || bioMatch || skillMatch || canTeachMatch || canLearnMatch
      );
    });
  };

  const filteredPerfect = useMemo(
    () => filterUsers(perfectMatches),
    [search, perfectMatches],
  );
  const filteredPartial = useMemo(
    () => filterUsers(partialMatches),
    [search, partialMatches],
  );
  const totalFilteredCount = filteredPerfect.length + filteredPartial.length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader
        title={t("matchesAndRequests")}
        subtitle={t("matchesAndRequestsDesc")}
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
        {/* Primary Top Tab Bar: Matches vs Requests */}
        <View
          style={{
            paddingHorizontal: SPACING[4],
            paddingTop: SPACING[3],
            paddingBottom: SPACING[2],
          }}
        >
          <Tabs<PrimaryTab>
            variant="pills"
            value={tab}
            onChange={setTab}
            fullWidth
            items={[
              { value: "discover", label: t("discoverLabel") ?? "Matches" },
              { value: "requests", label: t("requestsLabel") ?? "Requests" },
            ]}
          />
        </View>

        {/* Smooth Animated Content Switcher when navigating top tabs */}
        <Animated.View
          key={tab}
          entering={FadeIn.duration(220)}
          style={{ flex: 1 }}
        >
          {tab === "discover" ? (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: SPACING[4],
                paddingBottom: insets.bottom + 100,
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={theme.mutedForeground}
                  colors={[theme.mutedForeground]}
                />
              }
            >
              {/* Search Bar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.secondary,
                  borderRadius: RADIUS.xl,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: SPACING[3.5],
                  height: 44,
                  gap: SPACING[2.5],
                  marginBottom: SPACING[4],
                }}
              >
                <Search size={18} color={theme.mutedForeground} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t("searchPlaceholder")}
                  placeholderTextColor={theme.mutedForeground}
                  style={{
                    flex: 1,
                    color: theme.foreground,
                    fontSize: FONT_SIZE.md,
                    paddingVertical: 0,
                  }}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <X size={16} color={theme.mutedForeground} />
                  </Pressable>
                )}
              </View>

              {/* Empty Seeking Skills Prompt Banner */}
              {noSeekingSkills ? (
                <View style={{ marginBottom: SPACING[4] }}>
                  <Card
                    variant="glass"
                    style={{ borderColor: getAccent("amber").border }}
                  >
                    <CardContent
                      style={{
                        padding: SPACING[5],
                        alignItems: "center",
                        gap: SPACING[3],
                      }}
                    >
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: getAccent("amber").bg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Sparkles size={24} color={getAccent("amber").main} />
                      </View>
                      <ThemedText
                        type="cardTitle"
                        style={{ textAlign: "center" }}
                      >
                        {t("addSkillsTitle")}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        muted
                        style={{ textAlign: "center", maxWidth: 300 }}
                      >
                        {t("addSkillsDesc")}
                      </ThemedText>
                      <Button
                        size="sm"
                        variant="default"
                        onPress={() => router.push("/(tabs)/profile" as any)}
                        leftIcon={
                          <UserPlus size={14} color={theme.primaryForeground} />
                        }
                      >
                        {t("manageSkills")}
                      </Button>
                    </CardContent>
                  </Card>
                </View>
              ) : null}

              {/* Zero Filtered Search Results or Loading */}
              {matchesQ.isLoading ? (
                <View style={{ gap: SPACING[3] }}>
                  <SkeletonText lines={5} />
                  <SkeletonText lines={5} />
                </View>
              ) : totalFilteredCount === 0 && !noSeekingSkills ? (
                <Card variant="glass" style={{ marginBottom: SPACING[4] }}>
                  <CardContent
                    style={{
                      padding: SPACING[6],
                      alignItems: "center",
                      gap: SPACING[3],
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: theme.secondary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Users size={24} color={theme.mutedForeground} />
                    </View>
                    <ThemedText
                      type="cardTitle"
                      style={{ textAlign: "center" }}
                    >
                      {search ? t("noMatchingResults") : t("noMatchesTitle")}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      muted
                      style={{ textAlign: "center", maxWidth: 300 }}
                    >
                      {search
                        ? t("noMatchingResultsDesc", { query: search })
                        : (t("noMatchesDesc") ??
                          "We couldn't find any matches based on your skills right now. Try adding more skills!")}
                    </ThemedText>
                    {search ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => setSearch("")}
                      >
                        {t("clearSearch")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onPress={() => router.push("/(tabs)/profile" as any)}
                        leftIcon={
                          <UserPlus size={14} color={theme.primaryForeground} />
                        }
                      >
                        {t("manageSkills")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Perfect Matches Section */}
                  {filteredPerfect.length > 0 && (
                    <View style={{ marginBottom: SPACING[4] }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: SPACING[2],
                          marginBottom: 4,
                        }}
                      >
                        <Sparkles size={20} color="#f59e0b" />
                        <ThemedText type="sectionTitle">
                          {t("perfectMatchesTitle")}
                        </ThemedText>
                        <Badge variant="accent" accent="amber">
                          {filteredPerfect.length}
                        </Badge>
                      </View>
                      <ThemedText
                        type="caption"
                        muted
                        style={{ marginBottom: SPACING[3] }}
                      >
                        {t("perfectMatchesDesc")}
                      </ThemedText>

                      {filteredPerfect.map((m: any) => (
                        <View key={m.id} style={{ marginBottom: SPACING[3] }}>
                          <MatchCard
                            match={m}
                            perfect
                            currentUserSkills={currentUserSkills}
                            onPressCard={() =>
                              router.push(`/users/${m.id}` as any)
                            }
                            onPressRequest={() => setSelectedMatchForDialog(m)}
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  {/* More Matches Section */}
                  {filteredPartial.length > 0 && (
                    <View style={{ marginBottom: SPACING[4] }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: SPACING[2],
                          marginBottom: 4,
                        }}
                      >
                        <Users size={20} color={theme.primary} />
                        <ThemedText type="sectionTitle">
                          {t("moreMatchesTitle")}
                        </ThemedText>
                        <Badge variant="secondary">
                          {filteredPartial.length}
                        </Badge>
                      </View>
                      <ThemedText
                        type="caption"
                        muted
                        style={{ marginBottom: SPACING[3] }}
                      >
                        {t("moreMatchesDesc")}
                      </ThemedText>

                      {filteredPartial.map((m: any) => (
                        <View key={m.id} style={{ marginBottom: SPACING[3] }}>
                          <MatchCard
                            match={m}
                            currentUserSkills={currentUserSkills}
                            onPressCard={() =>
                              router.push(`/users/${m.id}` as any)
                            }
                            onPressRequest={() => setSelectedMatchForDialog(m)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          ) : (
            /* Requests View Section */
            <View style={{ flex: 1 }}>
              {/* Sub-Header Segment Toggle for Received vs Sent inside Requests */}
              <View
                style={{
                  paddingHorizontal: SPACING[4],
                  paddingBottom: SPACING[3],
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: theme.secondary,
                    borderRadius: RADIUS.lg,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Pressable
                    onPress={() => setRequestSubTab("received")}
                    style={{
                      flex: 1,
                      paddingVertical: SPACING[2],
                      borderRadius: RADIUS.md,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      backgroundColor:
                        requestSubTab === "received"
                          ? theme.card
                          : "transparent",
                    }}
                  >
                    <Inbox
                      size={15}
                      color={
                        requestSubTab === "received"
                          ? theme.foreground
                          : theme.mutedForeground
                      }
                    />
                    <ThemedText
                      type="label"
                      style={{
                        fontSize: 13,
                        color:
                          requestSubTab === "received"
                            ? theme.foreground
                            : theme.mutedForeground,
                      }}
                    >
                      {t("received")}
                    </ThemedText>
                    {incoming.length > 0 && (
                      <Badge
                        variant="accent"
                        accent="indigo"
                        style={{ paddingHorizontal: 6, paddingVertical: 1 }}
                      >
                        {incoming.length}
                      </Badge>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setRequestSubTab("sent")}
                    style={{
                      flex: 1,
                      paddingVertical: SPACING[2],
                      borderRadius: RADIUS.md,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      backgroundColor:
                        requestSubTab === "sent" ? theme.card : "transparent",
                    }}
                  >
                    <Send
                      size={14}
                      color={
                        requestSubTab === "sent"
                          ? theme.foreground
                          : theme.mutedForeground
                      }
                    />
                    <ThemedText
                      type="label"
                      style={{
                        fontSize: 13,
                        color:
                          requestSubTab === "sent"
                            ? theme.foreground
                            : theme.mutedForeground,
                      }}
                    >
                      {t("sent")}
                    </ThemedText>
                    {outgoing.length > 0 && (
                      <Badge
                        variant="secondary"
                        style={{ paddingHorizontal: 6, paddingVertical: 1 }}
                      >
                        {outgoing.length}
                      </Badge>
                    )}
                  </Pressable>
                </View>
              </View>

              <Animated.View
                key={requestSubTab}
                entering={FadeIn.duration(180)}
                style={{ flex: 1 }}
              >
                <RequestsList
                  requests={requestSubTab === "received" ? incoming : outgoing}
                  direction={requestSubTab}
                  loading={requestsQ.isLoading}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  insetsBottom={insets.bottom}
                  currentUserId={currentUserId}
                />
              </Animated.View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Exchange Request Dialog Modal */}
      {selectedMatchForDialog && (
        <RequestDialogModal
          open={!!selectedMatchForDialog}
          onOpenChange={(open) => {
            if (!open) setSelectedMatchForDialog(null);
          }}
          matchUser={selectedMatchForDialog}
          currentUser={currentUserQ.data}
        />
      )}
    </View>
  );
}

// ─── MatchCard Component ───────────────────────────────────────────────────

function MatchCard({
  match,
  perfect,
  currentUserSkills,
  onPressCard,
  onPressRequest,
}: {
  match: any;
  perfect?: boolean;
  currentUserSkills: any[];
  onPressCard: () => void;
  onPressRequest: () => void;
}) {
  const theme = useTheme();
  const t = useT("matches");
  const user = match;
  const avgRating = user.reviews?.length
    ? calculateAverageRating(user.reviews)
    : 0;

  // Normalize offerings & seekings from match payload format
  const rawSkills: any[] = user.skills || [];
  const offeringList = rawSkills.filter((s) => s.type === "OFFERING");
  const seekingList = rawSkills.filter((s) => s.type === "SEEKING");

  const canTeachMe =
    offeringList.length > 0
      ? offeringList
      : (user.canTeachMe || []).map((s: any) => ({ id: s.id, skill: s }));

  const canLearnFromMe =
    seekingList.length > 0
      ? seekingList
      : (user.canLearnFromMe || []).map((s: any) => ({ id: s.id, skill: s }));

  const mySeekingIds = new Set(
    currentUserSkills
      .filter((s) => s.type === "SEEKING")
      .map((s) => s.skill?.id || s.skillId)
      .filter(Boolean),
  );

  const myOfferingIds = new Set(
    currentUserSkills
      .filter((s) => s.type === "OFFERING")
      .map((s) => s.skill?.id || s.skillId)
      .filter(Boolean),
  );

  return (
    <PressableCard
      onPress={onPressCard}
      variant="glass"
      style={{ padding: SPACING[4], gap: SPACING[3.5] }}
    >
      {/* Tapping anywhere in card header/body navigates to user profile */}
      <View
        style={{
          flexDirection: "row",
          gap: SPACING[3],
          alignItems: "flex-start",
        }}
      >
        <Avatar uri={user.image} fallback={user.name ?? "U"} size={48} />
        <View style={{ flex: 1, gap: 3 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: SPACING[1.5],
            }}
          >
            <View
              style={{
                flexShrink: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.md }}>
                {user.name ?? t("anonymousUser")}
              </ThemedText>
              <ChevronRight size={16} color={theme.mutedForeground} />
            </View>

            {perfect && (
              <Badge
                variant="accent"
                accent="amber"
                dot
                style={{ paddingVertical: 2 }}
              >
                {t("perfectMatchBadge")}
              </Badge>
            )}
          </View>

          {/* Rating & Exchange stats */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: SPACING[2],
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <ThemedText
                type="caption"
                style={{ fontWeight: "600", color: theme.foreground }}
              >
                {avgRating > 0 ? avgRating.toFixed(1) : t("new")}
              </ThemedText>
            </View>
            {user.exchangesCompleted ? (
              <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                · {t("exchangesCompleted", { count: user.exchangesCompleted })}
              </ThemedText>
            ) : null}
          </View>

          {user.bio ? (
            <ThemedText
              type="caption"
              muted
              numberOfLines={2}
              style={{ marginTop: 2, fontSize: 12 }}
            >
              {user.bio}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Skills Sections */}
      <View style={{ gap: SPACING[2.5] }}>
        {/* Can Teach (Offering) */}
        {canTeachMe.length > 0 && (
          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[1],
              }}
            >
              <GraduationCap size={13} color={getAccent("emerald").main} />
              <ThemedText
                type="caption"
                style={{
                  color: getAccent("emerald").main,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                {t("canTeach")}
              </ThemedText>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {canTeachMe.map((item: any) => {
                const skillObj = item.skill || item;
                const skillId = skillObj.id;
                const skillName = skillObj.name || "Skill";
                const isMatched = mySeekingIds.has(skillId);
                const category = skillObj.category;
                const sponsorName = category?.sponsorName;

                return (
                  <View key={item.id || skillId} style={{ gap: 2 }}>
                    <Badge
                      variant={isMatched ? "accent" : "secondary"}
                      accent={isMatched ? "emerald" : undefined}
                      style={{
                        paddingHorizontal: SPACING[2.5],
                        paddingVertical: 3,
                      }}
                    >
                      {skillName} {isMatched ? "✓" : ""}
                    </Badge>
                    {sponsorName ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 1.5,
                          borderRadius: RADIUS.pill,
                          backgroundColor: getAccent("indigo").bg,
                          borderWidth: 1,
                          borderColor: getAccent("indigo").border,
                          alignSelf: "flex-start",
                        }}
                      >
                        {category?.sponsorLogo ? (
                          <Image
                            source={{ uri: category.sponsorLogo }}
                            style={{ width: 12, height: 12, borderRadius: 2 }}
                          />
                        ) : null}
                        <ThemedText
                          type="caption"
                          style={{
                            fontSize: 9,
                            color: getAccent("indigo").main,
                            fontWeight: "600",
                          }}
                        >
                          {t("sponsoredByName", { name: sponsorName })}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Wants to Learn (Seeking) */}
        {canLearnFromMe.length > 0 && (
          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[1],
              }}
            >
              <BookOpen size={13} color={getAccent("indigo").main} />
              <ThemedText
                type="caption"
                style={{
                  color: getAccent("indigo").main,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                {t("wantsToLearn")}
              </ThemedText>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {canLearnFromMe.map((item: any) => {
                const skillObj = item.skill || item;
                const skillId = skillObj.id;
                const skillName = skillObj.name || "Skill";
                const isMatched = myOfferingIds.has(skillId);

                return (
                  <Badge
                    key={item.id || skillId}
                    variant={isMatched ? "accent" : "outline"}
                    accent={isMatched ? "indigo" : undefined}
                    style={{
                      paddingHorizontal: SPACING[2.5],
                      paddingVertical: 3,
                    }}
                  >
                    {skillName} {isMatched ? "✓" : ""}
                  </Badge>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Primary Action Button: Full-width Request Exchange */}
      <View style={{ paddingTop: SPACING[1] }}>
        <Button
          size="sm"
          variant="default"
          leftIcon={
            <ArrowRightLeft size={14} color={theme.primaryForeground} />
          }
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onPressRequest();
          }}
        >
          {t("requestExchange")}
        </Button>
      </View>
    </PressableCard>
  );
}

// ─── RequestDialogModal (Exchange Request Dialog) ─────────────────────────

function RequestDialogModal({
  open,
  onOpenChange,
  matchUser,
  currentUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchUser: any;
  currentUser: any;
}) {
  const theme = useTheme();
  const t = useT("matches");
  const toast = useToast();
  const createRequestMutation = useCreateRequest();

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(0);
  const [payerIsMe, setPayerIsMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rawMatchSkills: any[] = matchUser.skills || [];
  const matchOfferings = rawMatchSkills.filter((s) => s.type === "OFFERING");
  const availableToLearn =
    matchOfferings.length > 0
      ? matchOfferings
      : (matchUser.canTeachMe || []).map((s: any) => ({ id: s.id, skill: s }));

  const rawMySkills: any[] = currentUser?.skills || [];
  const myOfferings = rawMySkills.filter((s) => s.type === "OFFERING");

  const handleSend = async () => {
    if (!selectedSkillId) {
      setErrorMsg(t("selectSkillToLearn"));
      return;
    }

    setErrorMsg(null);
    try {
      await createRequestMutation.mutateAsync({
        receiverId: matchUser.id,
        requestedSkillId: selectedSkillId,
        offeredSkillId: selectedOfferId ?? undefined,
        pointsProposal: pointsAmount > 0 ? pointsAmount : undefined,
        pointsPayerId:
          pointsAmount > 0
            ? payerIsMe
              ? currentUser?.id
              : matchUser.id
            : undefined,
      });

      track(AnalyticsEvent.EXCHANGE_REQUEST_CREATED, {
        offered_skill: selectedOfferId ?? undefined,
        requested_skill: selectedSkillId ?? undefined,
      });
      toast.toast({
        title: t("exchangeRequestSent"),
        description: t("exchangeRequestSentDesc", {
          name: matchUser.name ?? t("user"),
        }),
        variant: "success",
      });
      onOpenChange(false);
    } catch (e: any) {
      setErrorMsg(e?.message ?? t("failedToSendExchangeRequest"));
    }
  };

  const pointsBreakdown = calculatePointsBreakdown(pointsAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[2.5],
          }}
        >
          <Avatar uri={matchUser.image} fallback={matchUser.name} size={36} />
          <View style={{ flex: 1 }}>
            <DialogTitle style={{ fontSize: FONT_SIZE.md }}>
              {t("requestSkillExchange")}
            </DialogTitle>
            <DialogDescription style={{ marginTop: 0 }}>
              {t("connectWithName", { name: matchUser.name ?? t("user") })}
            </DialogDescription>
          </View>
        </View>
      </DialogHeader>

      <DialogContent style={{ maxHeight: 420 }}>
        <View style={{ gap: SPACING[4], paddingBottom: SPACING[4] }}>
          {/* Step 1: Select skill to learn */}
          <View style={{ gap: SPACING[2] }}>
            <ThemedText type="label">
              1. {t("whatToLearnQuestion")}{" "}
              <ThemedText style={{ color: theme.destructive }}>*</ThemedText>
            </ThemedText>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: SPACING[2],
              }}
            >
              {availableToLearn.map((item: any) => {
                const sObj = item.skill || item;
                const isSelected = selectedSkillId === sObj.id;
                return (
                  <Pressable
                    key={item.id || sObj.id}
                    onPress={() => setSelectedSkillId(sObj.id)}
                  >
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      style={{
                        paddingHorizontal: SPACING[3],
                        paddingVertical: SPACING[1.5],
                        borderRadius: RADIUS.lg,
                      }}
                    >
                      {sObj.name} {isSelected ? "✓" : ""}
                    </Badge>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Step 2: Select skill to offer */}
          {myOfferings.length > 0 && (
            <View style={{ gap: SPACING[2] }}>
              <ThemedText type="label">
                2. {t("whatToOfferQuestion")}{" "}
                <ThemedText type="caption" muted>
                  ({t("optional")})
                </ThemedText>
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: SPACING[2],
                }}
              >
                {myOfferings.map((item: any) => {
                  const sObj = item.skill || item;
                  const isSelected = selectedOfferId === sObj.id;
                  return (
                    <Pressable
                      key={item.id || sObj.id}
                      onPress={() =>
                        setSelectedOfferId(isSelected ? null : sObj.id)
                      }
                    >
                      <Badge
                        variant={isSelected ? "accent" : "secondary"}
                        accent={isSelected ? "indigo" : undefined}
                        style={{
                          paddingHorizontal: SPACING[3],
                          paddingVertical: SPACING[1.5],
                          borderRadius: RADIUS.lg,
                        }}
                      >
                        {sObj.name} {isSelected ? "✓" : ""}
                      </Badge>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 3: {t('pointsProposal')} for Uneven Exchanges */}
          <View
            style={{
              gap: SPACING[3],
              padding: SPACING[3.5],
              borderRadius: RADIUS.xl,
              backgroundColor: theme.secondary,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[2],
              }}
            >
              <Coins size={18} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <ThemedText type="label" style={{ fontSize: 13 }}>
                  {t("pointsProposal")}
                </ThemedText>
                <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                  {t("forUnevenExchangesShort")}
                </ThemedText>
              </View>
            </View>

            {/* Input & Quick presets */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[2],
              }}
            >
              <TextInput
                keyboardType="numeric"
                value={pointsAmount ? String(pointsAmount) : ""}
                onChangeText={(val) => {
                  const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
                  setPointsAmount(isNaN(num) ? 0 : Math.max(0, num));
                }}
                placeholder="0"
                placeholderTextColor={theme.mutedForeground}
                style={{
                  width: 90,
                  height: 38,
                  backgroundColor: theme.background,
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: SPACING[3],
                  color: theme.foreground,
                  fontSize: FONT_SIZE.md,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              />
              <ThemedText type="bodySmall" style={{ fontWeight: "600" }}>
                {t("points")}
              </ThemedText>

              {/* Quick Preset Buttons */}
              <View
                style={{ flexDirection: "row", gap: 4, marginLeft: "auto" }}
              >
                {[10, 25, 50].map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => setPointsAmount(amt)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: RADIUS.md,
                      backgroundColor:
                        pointsAmount === amt ? theme.primary : theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          pointsAmount === amt
                            ? theme.primaryForeground
                            : theme.foreground,
                        fontWeight: "600",
                      }}
                    >
                      +{amt}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Payer Selector Segment */}
            {pointsAmount > 0 && (
              <Animated.View
                entering={FadeInUp.duration(200)}
                style={{ gap: SPACING[2.5] }}
              >
                <View style={{ flexDirection: "row", gap: SPACING[2] }}>
                  <Pressable
                    onPress={() => setPayerIsMe(true)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: RADIUS.md,
                      backgroundColor: payerIsMe
                        ? getAccent("emerald").bg
                        : theme.background,
                      borderWidth: 1,
                      borderColor: payerIsMe
                        ? getAccent("emerald").border
                        : theme.border,
                      alignItems: "center",
                    }}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: payerIsMe
                          ? getAccent("emerald").main
                          : theme.mutedForeground,
                        fontWeight: "600",
                      }}
                    >
                      {t("iWillPay")}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setPayerIsMe(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: RADIUS.md,
                      backgroundColor: !payerIsMe
                        ? getAccent("indigo").bg
                        : theme.background,
                      borderWidth: 1,
                      borderColor: !payerIsMe
                        ? getAccent("indigo").border
                        : theme.border,
                      alignItems: "center",
                    }}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: !payerIsMe
                          ? getAccent("indigo").main
                          : theme.mutedForeground,
                        fontWeight: "600",
                      }}
                    >
                      {t("theyWillPay")}
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Calculation Breakdown */}
                <View
                  style={{
                    padding: SPACING[2.5],
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.background,
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ThemedText type="caption" muted>
                      {payerIsMe ? t("grossPayment") : t("grossReceived")}:
                    </ThemedText>
                    <ThemedText type="caption" style={{ fontWeight: "600" }}>
                      {pointsBreakdown.gross} pts
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ThemedText
                      type="caption"
                      muted
                      style={{ color: getAccent("red").main }}
                    >
                      {t("platformFeePercent", { percent: 10 })}:
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: getAccent("red").main }}
                    >
                      -{pointsBreakdown.fee} pts
                    </ThemedText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 4,
                      marginTop: 2,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.border,
                    }}
                  >
                    <ThemedText type="label" style={{ fontSize: 12 }}>
                      {payerIsMe ? t("totalYouPay") : t("netYouReceive")}:
                    </ThemedText>
                    <ThemedText
                      type="label"
                      style={{
                        fontSize: 12,
                        color: payerIsMe
                          ? getAccent("red").main
                          : getAccent("emerald").main,
                      }}
                    >
                      {payerIsMe
                        ? `${pointsBreakdown.gross} pts`
                        : `+${pointsBreakdown.net} pts`}
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Error Banner */}
          {errorMsg && (
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.lg,
                backgroundColor: getAccent("red").bg,
                borderWidth: 1,
                borderColor: getAccent("red").border,
              }}
            >
              <ThemedText
                type="caption"
                style={{ color: getAccent("red").main }}
              >
                {errorMsg}
              </ThemedText>
            </View>
          )}
        </View>
      </DialogContent>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          onPress={() => onOpenChange(false)}
          disabled={createRequestMutation.isPending}
        >
          {t("cancel")}
        </Button>
        <Button
          variant="default"
          size="sm"
          onPress={handleSend}
          disabled={!selectedSkillId || createRequestMutation.isPending}
          leftIcon={
            createRequestMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.primaryForeground} />
            ) : (
              <Send size={14} color={theme.primaryForeground} />
            )
          }
        >
          {createRequestMutation.isPending ? t("sending") : t("sendRequest")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ─── RequestsList Component ────────────────────────────────────────────────

function RequestsList({
  requests,
  direction,
  loading,
  refreshing,
  onRefresh,
  insetsBottom,
  currentUserId,
}: {
  requests: any[];
  direction: "received" | "sent";
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  insetsBottom: number;
  currentUserId?: string;
}) {
  const theme = useTheme();
  const t = useT("matches");

  const acceptQ = useAcceptRequest();
  const rejectQ = useRejectRequest();
  const cancelQ = useCancelRequest();
  const toast = useToast();
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingHorizontal: SPACING[4],
          paddingBottom: insetsBottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.mutedForeground}
            colors={[theme.mutedForeground]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: SPACING[3] }}>
              <SkeletonText lines={4} />
              <SkeletonText lines={4} />
            </View>
          ) : (
            <View
              style={{
                padding: SPACING[6],
                alignItems: "center",
                gap: SPACING[3],
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: theme.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {direction === "received" ? (
                  <Inbox size={24} color={theme.mutedForeground} />
                ) : (
                  <Send size={24} color={theme.mutedForeground} />
                )}
              </View>
              <ThemedText type="cardTitle" style={{ textAlign: "center" }}>
                {direction === "received"
                  ? (t("noReceivedRequests") ?? "No Received Requests")
                  : (t("noSentRequests") ?? "No Sent Requests")}
              </ThemedText>
              <ThemedText
                type="caption"
                muted
                style={{ textAlign: "center", maxWidth: 280 }}
              >
                {direction === "received"
                  ? (t("noReceivedRequestsDesc") ??
                    "You don't have any incoming exchange requests right now.")
                  : (t("noSentRequestsDesc") ??
                    "You haven't sent any exchange requests yet. Explore matches to connect!")}
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: SPACING[3] }}>
            <RequestCard
              request={item}
              direction={direction}
              currentUserId={currentUserId}
              onOpen={() => router.push(`/requests/${item.id}` as any)}
              onAccept={async () => {
                try {
                  await acceptQ.mutateAsync(item.id);
                  toast.toast({
                    title: t("requestAccepted"),
                    variant: "success",
                  });
                } catch (e: any) {
                  toast.toast({
                    title: t("couldNotAccept"),
                    description: e?.message ?? t("tryAgain"),
                    variant: "error",
                  });
                }
              }}
              onReject={async () => {
                try {
                  await rejectQ.mutateAsync(item.id);
                  toast.toast({ title: t("requestRejected"), variant: "info" });
                } catch (e: any) {
                  toast.toast({
                    title: t("couldNotRejectRequest"),
                    variant: "error",
                  });
                }
              }}
              onCancel={async () => {
                try {
                  await cancelQ.mutateAsync(item.id);
                  toast.toast({
                    title: t("requestCancelled"),
                    variant: "info",
                  });
                } catch (e: any) {
                  toast.toast({
                    title: t("couldNotCancelRequest"),
                    variant: "error",
                  });
                }
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

// ─── RequestCard Component ─────────────────────────────────────────────────

export function RequestCard({
  request,
  direction,
  onOpen,
  onAccept,
  onReject,
  onCancel,
  currentUserId,
}: {
  request: any;
  direction: "received" | "sent";
  onOpen: () => void;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  currentUserId?: string;
}) {
  const theme = useTheme();
  const t = useT("matches");
  const statusColor = getRequestStatusColor(request.status);
  const { locale } = useI18n();
  const otherUser =
    direction === "received" ? request.sender : request.receiver;

  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const requestedSkillName =
    request.requestedSkill?.name ||
    request.requestedSkillName ||
    t("requestedSkill");
  const requestedSessions = request.requestedSkillSessions ?? 1;
  const requestedDuration = request.requestedSkillDuration ?? 60;

  const offeredSkillName =
    request.offeredSkill?.name || request.offeredSkillName;
  const offeredSessions = request.offeredSkillSessions ?? 1;
  const offeredDuration = request.offeredSkillDuration ?? 60;

  const senderName =
    request.senderId === currentUserId
      ? t("youCap")
      : (request.sender?.name ?? t("sender"));
  const receiverName =
    request.receiverId === currentUserId
      ? t("youCap")
      : (request.receiver?.name ?? t("receiver"));

  const getRequestStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return t("statusPending");
      case "COMMITTED":
        return t("statusCommitted");
      case "REJECTED":
        return t("statusRejected");
      case "CANCELLED":
        return t("statusCancelled");
      default:
        return status?.replace("_", " ") ?? "";
    }
  };

  return (
    <PressableCard
      onPress={onOpen}
      variant="glass"
      style={{ padding: SPACING[4], gap: SPACING[3] }}
    >
      {/* Header: User Avatar, Name, Status */}
      <View
        style={{
          flexDirection: "row",
          gap: SPACING[3],
          alignItems: "flex-start",
        }}
      >
        <Avatar
          uri={otherUser?.image}
          fallback={otherUser?.name ?? "U"}
          size={44}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: SPACING[1.5],
            }}
          >
            <ThemedText type="label" style={{ fontSize: FONT_SIZE.md }}>
              {direction === "received"
                ? t("fromName", { name: otherUser?.name ?? t("user") })
                : t("toName", { name: otherUser?.name ?? t("user") })}
            </ThemedText>
            <Badge variant="accent" accent={statusColor}>
              {getRequestStatusText(request.status)}
            </Badge>
          </View>

          {/* Requested & Offered Skills Breakdown */}
          <View style={{ gap: 4, marginTop: 2 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                {direction === "received" ? t("wantsToLearn") : t("requested")}
              </ThemedText>
              <Badge variant="accent" accent="emerald">
                {requestedSkillName}
              </Badge>
              <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                (
                {t("sessionCount", {
                  count: requestedSessions,
                  duration: requestedDuration,
                })}
                )
              </ThemedText>
            </View>

            {offeredSkillName && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                  {t("offering")}
                </ThemedText>
                <Badge variant="accent" accent="indigo">
                  {offeredSkillName}
                </Badge>
                <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                  (
                  {t("sessionCount", {
                    count: offeredSessions,
                    duration: offeredDuration,
                  })}
                  )
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Agreement Status Breakdown Box */}
      <View
        style={{
          gap: 4,
          padding: SPACING[2.5],
          borderRadius: RADIUS.md,
          backgroundColor: theme.secondary,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <ThemedText type="caption" muted style={{ fontSize: 11 }}>
            {senderName}:
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: request.senderAgreed
                ? getAccent("emerald").main
                : getAccent("amber").main,
            }}
          >
            {request.senderAgreed ? t("agreedCheck") : t("reviewing")}
          </ThemedText>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <ThemedText type="caption" muted style={{ fontSize: 11 }}>
            {receiverName}:
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: request.receiverAgreed
                ? getAccent("emerald").main
                : getAccent("amber").main,
            }}
          >
            {request.receiverAgreed ? t("agreedCheck") : t("reviewing")}
          </ThemedText>
        </View>
      </View>

      {/* Points Proposal Indicator */}
      {request.pointsProposal > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[2],
            paddingHorizontal: SPACING[3],
            paddingVertical: SPACING[2],
            borderRadius: RADIUS.md,
            backgroundColor: getAccent("amber").bg,
            borderWidth: 1,
            borderColor: getAccent("amber").border,
          }}
        >
          <Coins size={14} color={getAccent("amber").main} />
          <ThemedText
            type="caption"
            style={{ color: getAccent("amber").main, fontWeight: "600" }}
          >
            {t("pointsPaidBy", {
              points: request.pointsProposal,
              payer:
                request.pointsPayerId === currentUserId
                  ? t("you")
                  : (otherUser?.name ?? t("them")),
            })}
          </ThemedText>
        </View>
      )}

      {/* Negotiation Button: View Exchange */}
      <Button
        variant="outline"
        size="sm"
        onPress={onOpen}
        leftIcon={<MessageSquare size={14} color={theme.foreground} />}
      >
        {t("viewExchange")}
      </Button>

      {/* Date & Link */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[1],
          }}
        >
          <Clock size={12} color={theme.mutedForeground} />
          <ThemedText type="caption" muted>
            {formatDateShort(request.createdAt, locale)}
          </ThemedText>
        </View>
      </View>

      {/* Action Buttons for Pending Requests */}
      {direction === "received" && request.status === "PENDING" ? (
        <View
          style={{
            flexDirection: "row",
            gap: SPACING[2],
            paddingTop: SPACING[1],
          }}
        >
          <Button
            style={{ flex: 1 }}
            size="sm"
            variant="default"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onAccept?.();
            }}
            leftIcon={
              <CheckCircle2 size={14} color={theme.primaryForeground} />
            }
          >
            {t("accept")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              setConfirmReject(true);
            }}
            leftIcon={<XCircle size={14} color="#fff" />}
          >
            {t("reject")}
          </Button>
        </View>
      ) : direction === "sent" && request.status === "PENDING" ? (
        <View style={{ paddingTop: SPACING[1] }}>
          <Button
            size="sm"
            variant="outline"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              setConfirmCancel(true);
            }}
            leftIcon={<Ban size={14} color={theme.foreground} />}
          >
            {t("cancelRequest")}
          </Button>
        </View>
      ) : null}

      <AlertDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title={t("rejectExchangeRequest")}
        description={t("rejectExchangeRequestDesc")}
        confirmLabel={t("reject")}
        destructive
        onConfirm={() => onReject?.()}
      />
      <AlertDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t("cancelExchangeRequest")}
        description={t("cancelExchangeRequestDesc")}
        confirmLabel={t("cancelRequest")}
        destructive
        onConfirm={() => onCancel?.()}
      />
    </PressableCard>
  );
}
