import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useT } from "lib/i18n";
import {

  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CloudMoon,
  Coins,
  GraduationCap,
  Handshake,
  Info,
  MessageSquare,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Sunset,
  User,
  X,
  XCircle,
} from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  ActionSheet,
  AlertDialog,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  SkeletonText,
  Tabs,
  useToast,
} from "@/components/ui";
import {
  FONT_SIZE,
  FONT_WEIGHT,
  getAccent,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useAcceptRequest,
  useAcceptTermsAndSlots,
  useCancelRequest,
  useCurrentUser,
  usePointsBalance,
  useProposeTermsAndSlots,
  useRejectRequest,
  useRequestById,
  useSendRequestMessage,
  useUpdateAvailability,
} from "@/lib/api-hooks";
import {
  calculatePointsBreakdown,
  DAY_NAMES_LONG,
  DAY_NAMES_SHORT,
  formatDateTimeShort,
  getRequestStatusColor,
} from "@skil-ex2/shared";
import { AnalyticsEvent, track } from "@/lib/analytics";

type Tab = "messages" | "terms" | "availability";

const QUICK_REPLIES = [
  { key: "AVAILABLE_WEEKDAYS", labelKey: "availableWeekdays" },
  { key: "AVAILABLE_WEEKENDS", labelKey: "availableWeekends" },
  { key: "NEED_MORE_TIME", labelKey: "needMoreTime" },
  { key: "REQUEST_RESCHEDULE", labelKey: "needReschedule" },
];

const TIME_SLOTS = [
  { val: "Morning", labelKey: "morning", Icon: Sunrise },
  { val: "Afternoon", labelKey: "afternoon", Icon: Sunset },
  { val: "Evening", labelKey: "evening", Icon: CloudMoon },
  { val: "Night", labelKey: "night", Icon: Moon },
];

const TIME_PRESETS_AMPM = [
  { label: "9:00 AM", value: "09:00" },
  { label: "10:30 AM", value: "10:30" },
  { label: "12:00 PM", value: "12:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "8:00 PM", value: "20:00" },
];

const POINT_PRESETS = [0, 10, 25, 50, 100];

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT('requests');
  const router = useRouter();

  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Poll every 3s so chat, proposals, and statuses auto-update in real-time
  const q = useRequestById(id!, { refetchInterval: 3000 });
  const userQ = useCurrentUser();
  const balanceQ = usePointsBalance();

  const msgQ = useSendRequestMessage();
  const proposeQ = useProposeTermsAndSlots();
  const acceptSlotsQ = useAcceptTermsAndSlots();
  const updateAvailQ = useUpdateAvailability();

  const acceptQ = useAcceptRequest();
  const rejectQ = useRejectRequest();
  const cancelQ = useCancelRequest();

  const [tab, setTab] = React.useState<Tab>("messages");
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirmAccept, setConfirmAccept] = React.useState(false);
  const [confirmReject, setConfirmReject] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  // Breakdown modal state
  const [breakdownModalOpen, setBreakdownModalOpen] = React.useState(false);
  const [breakdownData, setBreakdownData] = React.useState<{
    pts: number;
    payerIsMe: boolean;
  } | null>(null);

  // Propose form state
  const [reqSessions, setReqSessions] = React.useState("1");
  const [reqDuration, setReqDuration] = React.useState("60");
  const [offSessions, setOffSessions] = React.useState("1");
  const [offDuration, setOffDuration] = React.useState("60");
  const [counterPoints, setCounterPoints] = React.useState("0");
  const [counterPayerIsMe, setCounterPayerIsMe] = React.useState(true);

  // Slot states (24h string values sent to API e.g. "18:00")
  const [reqDays, setReqDays] = React.useState<string[]>([]);
  const [reqTime, setReqTime] = React.useState("18:00");
  const [offDays, setOffDays] = React.useState<string[]>([]);
  const [offTime, setOffTime] = React.useState("18:00");

  // Availability states
  const [availDays, setAvailDays] = React.useState<string[]>([]);
  const [availTimes, setAvailTimes] = React.useState<string[]>([]);

  const request = q.data as any;
  const loading = q.isLoading;
  const currentUserId = (userQ.data as any)?.id;
  const balance =
    typeof balanceQ.data === "number"
      ? balanceQ.data
      : (balanceQ.data as any)?.balance ?? 0;
  const isSender = request?.senderId === currentUserId;
  const otherUser = isSender ? request?.receiver : request?.sender;
  const amIAgreed = isSender
    ? !!request?.senderAgreed
    : !!request?.receiverAgreed;
  const isPending = request?.status === "PENDING";
  const isCommitted = request?.status === "COMMITTED";

  const counterPointsNum = parseInt(counterPoints) || 0;
  const isPayerInCurrentProposal = request?.pointsPayerId === currentUserId;
  const hasInsufficientPointsToAccept =
    isPayerInCurrentProposal && balance < (request?.pointsProposal || 0);
  const hasInsufficientPointsToPropose =
    counterPayerIsMe && balance < counterPointsNum;

  React.useEffect(() => {
    if (request) {
      setReqSessions(request.requestedSkillSessions?.toString() || "1");
      setReqDuration(request.requestedSkillDuration?.toString() || "60");
      setOffSessions(request.offeredSkillSessions?.toString() || "1");
      setOffDuration(request.offeredSkillDuration?.toString() || "60");
      setCounterPoints(request.pointsProposal?.toString() || "0");
      if (request.pointsPayerId && currentUserId) {
        setCounterPayerIsMe(request.pointsPayerId === currentUserId);
      }
      const myAvail = isSender
        ? request.senderAvailability
        : request.receiverAvailability;
      if (myAvail) {
        setAvailDays(myAvail.days?.map((d: number) => d.toString()) || []);
        setAvailTimes(myAvail.timeSlots || []);
      }
      if (request.proposedSlots && request.proposedSlots.length > 0) {
        const otherSlots = request.proposedSlots.filter(
          (s: any) => s.proposerId !== currentUserId,
        );
        const slotsToUse =
          otherSlots.length > 0 ? otherSlots : request.proposedSlots;
        const reqSlots = slotsToUse.filter(
          (s: any) => s.skillId === request.requestedSkillId,
        );
        if (reqSlots.length > 0) {
          setReqDays(reqSlots.map((s: any) => s.dayOfWeek.toString()));
          setReqTime(reqSlots[0].startTime);
        }
        if (request.offeredSkillId) {
          const offSlots = slotsToUse.filter(
            (s: any) => s.skillId === request.offeredSkillId,
          );
          if (offSlots.length > 0) {
            setOffDays(offSlots.map((s: any) => s.dayOfWeek.toString()));
            setOffTime(offSlots[0].startTime);
          }
        }
      }
    }
  }, [request, currentUserId, isSender]);

  const handlePropose = async () => {
    try {
      const pts = parseInt(counterPoints) || 0;
      const slots: { skillId: string; dayOfWeek: number; startTime: string }[] =
        [];

      if (reqDays.length > 0 && reqTime) {
        reqDays.forEach((day) => {
          slots.push({
            skillId: request.requestedSkillId,
            dayOfWeek: parseInt(day),
            startTime: reqTime,
          });
        });
      }

      if (request.offeredSkillId && offDays.length > 0 && offTime) {
        offDays.forEach((day) => {
          slots.push({
            skillId: request.offeredSkillId,
            dayOfWeek: parseInt(day),
            startTime: offTime,
          });
        });
      }

      const payload = {
        requestedSkillSessions: parseInt(reqSessions) || 1,
        requestedSkillDuration: parseInt(reqDuration) || 60,
        offeredSkillSessions: parseInt(offSessions) || 0,
        offeredSkillDuration: parseInt(offDuration) || 0,
        pointsProposal: pts,
        pointsPayerId:
          pts > 0 ? (counterPayerIsMe ? currentUserId : otherUser?.id) : null,
        slots,
      };

      await proposeQ.mutateAsync({ requestId: id!, payload });
      track(AnalyticsEvent.EXCHANGE_TERMS_PROPOSED, {
        exchange_id: id || undefined,
        duration_minutes: (payload.requestedSkillSessions || 0) * 60,
      });
      toast.toast({ title: t("proposalSubmitted"), variant: "success" });
      await q.refetch();
    } catch (e: any) {
      toast.toast({
        title: t("couldNotProposeTerms"),
        description: e?.message ?? t("checkInputsAndTry"),
        variant: "error",
      });
    }
  };

  const handleAcceptTerms = async () => {
    if (hasInsufficientPointsToAccept) {
      router.push("/(tabs)/points" as any);
      return;
    }
    try {
      if (request.proposedSlots && request.proposedSlots.length > 0) {
        const slotIds = request.proposedSlots.map((s: any) => s.id);
        await acceptSlotsQ.mutateAsync({ requestId: id!, slotIds });
      } else {
        await acceptQ.mutateAsync(id!);
      }
      track(AnalyticsEvent.EXCHANGE_TERMS_ACCEPTED, {
        exchange_id: id || undefined,
      });
      toast.toast({ title: t("termsAccepted"), variant: "success" });
      await q.refetch();
      await balanceQ.refetch();
    } catch (e: any) {
      toast.toast({
        title: t("failedAcceptTerms"),
        description: e?.message ?? t("tryAgain"),
        variant: "error",
      });
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      const payload = {
        days: availDays.map((d) => parseInt(d)),
        timeSlots: availTimes,
      };
      await updateAvailQ.mutateAsync({ requestId: id!, payload });
      track(AnalyticsEvent.EXCHANGE_AVAILABILITY_UPDATED, {
        exchange_id: id || undefined,
      });
      toast.toast({ title: t("availabilitySaved"), variant: "success" });
      await q.refetch();
    } catch (e: any) {
      toast.toast({
        title: t("failedSaveAvailability"),
        description: e?.message ?? t("tryAgain"),
        variant: "error",
      });
    }
  };

  const openBreakdown = (pts: number, payerIsMe: boolean) => {
    setBreakdownData({ pts, payerIsMe });
    setBreakdownModalOpen(true);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "bottom"]}
    >
      <ThemedView type="background" style={{ flex: 1, alignItems: "center" }}>
        {/* Top Navbar */}
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SPACING[4],
            paddingVertical: SPACING[3],
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <Pressable
            hitSlop={12}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/matches");
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[2],
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={18} color={theme.foreground} />
            </View>
            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
              {t("negotiation")}
            </ThemedText>
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!loading && request ? (
              <Badge
                variant="outline"
                style={{
                  borderColor:
                    request.status === "COMMITTED"
                      ? getAccent("emerald").main
                      : request.status === "PENDING"
                        ? getAccent("amber").main
                        : theme.border,
                }}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    fontSize: 11,
                    color:
                      request.status === "COMMITTED"
                        ? getAccent("emerald").main
                        : request.status === "PENDING"
                          ? getAccent("amber").main
                          : theme.mutedForeground,
                  }}
                >
                  {labelForRequestStatus(request.status)}
                </ThemedText>
              </Badge>
            ) : null}

            <Pressable
              hitSlop={10}
              onPress={() => setActionsOpen(true)}
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreHorizontal size={18} color={theme.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING[4],
            paddingBottom: insets.bottom + SPACING[10],
            width: "100%",
            alignItems: "center",
            gap: SPACING[4],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await q.refetch();
                await balanceQ.refetch();
                setRefreshing(false);
              }}
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
              paddingTop: SPACING[3],
            }}
          >
            {/* Peer & Exchange Header Card */}
            <HeaderHeroCard
              loading={loading}
              request={request}
              otherUser={otherUser}
              isSender={isSender}
            />

            {/* Navigation Tabs */}
            <Tabs<Tab>
              variant="underline"
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "messages",
                  label: t("chat"),
                  badge: request?.messages?.length || undefined,
                },
                { value: "terms", label: t("termsAndScheduling") },
                { value: "availability", label: t("generalAvailability") },
              ]}
            />

            {/* Chat Tab Section */}
            {tab === "messages" && (
              <ChatTabSection
                loading={loading}
                request={request}
                currentUserId={currentUserId}
                otherUser={otherUser}
                isPending={isPending}
                onQuickReply={async (key) => {
                  try {
                    await msgQ.mutateAsync({
                      requestId: id!,
                      payload: { messageKey: key as any },
                    });
                    toast.toast({ title: t("messageSent"), variant: "success" });
                    await q.refetch();
                  } catch (e: any) {
                    toast.toast({
                      title: t("couldNotSend"),
                      description: e?.message ?? t("tryAgain"),
                      variant: "error",
                    });
                  }
                }}
                sending={msgQ.isPending}
                onOpenBreakdown={openBreakdown}
                onSwitchTab={setTab}
              />
            )}

            {/* Terms & Agreement Tab Section */}
            {tab === "terms" && (
              <TermsTabSection
                loading={loading}
                request={request}
                currentUserId={currentUserId}
                otherUser={otherUser}
                isPending={isPending}
                isSender={isSender}
                amIAgreed={amIAgreed}
                counterPointsNum={counterPointsNum}
                counterPayerIsMe={counterPayerIsMe}
                hasInsufficientPointsToAccept={hasInsufficientPointsToAccept}
                hasInsufficientPointsToPropose={hasInsufficientPointsToPropose}
                reqSessions={reqSessions}
                setReqSessions={setReqSessions}
                reqDuration={reqDuration}
                setReqDuration={setReqDuration}
                offSessions={offSessions}
                setOffSessions={setOffSessions}
                offDuration={offDuration}
                setOffDuration={setOffDuration}
                counterPoints={counterPoints}
                setCounterPoints={setCounterPoints}
                setCounterPayerIsMe={setCounterPayerIsMe}
                reqDays={reqDays}
                setReqDays={setReqDays}
                reqTime={reqTime}
                setReqTime={setReqTime}
                offDays={offDays}
                setOffDays={setOffDays}
                offTime={offTime}
                setOffTime={setOffTime}
                onPropose={handlePropose}
                proposeLoading={proposeQ.isPending}
                onAccept={() => setConfirmAccept(true)}
                onReject={() => setConfirmReject(true)}
                onCancel={() => setConfirmCancel(true)}
                acceptLoading={acceptSlotsQ.isPending || acceptQ.isPending}
                balance={balance}
                onOpenBreakdown={openBreakdown}
                onGoToExchange={() =>
                  router.push(`/exchanges/${request.exchange?.id}` as any)
                }
              />
            )}

            {/* Availability Tab Section */}
            {tab === "availability" && (
              <AvailabilityTabSection
                loading={loading}
                request={request}
                otherUser={otherUser}
                isPending={isPending}
                isSender={isSender}
                availDays={availDays}
                setAvailDays={setAvailDays}
                availTimes={availTimes}
                setAvailTimes={setAvailTimes}
                onUpdateAvail={handleUpdateAvailability}
                updatingAvail={updateAvailQ.isPending}
              />
            )}
          </View>
        </ScrollView>
      </ThemedView>

      {/* Points & Commission Breakdown Sheet Modal */}
      <Modal
        visible={breakdownModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBreakdownModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: SPACING[4],
          }}
          onPress={() => setBreakdownModalOpen(false)}
        >
          <Pressable
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: theme.card,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              borderColor: theme.border,
              padding: SPACING[5],
              gap: SPACING[4],
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
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
                    backgroundColor: getAccent("amber").bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Coins size={20} color={getAccent("amber").main} />
                </View>
                <ThemedText
                  type="subtitle"
                  style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}
                >
                  {t("pointsFeeBreakdown")}
                </ThemedText>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => setBreakdownModalOpen(false)}
              >
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>

            {breakdownData && (
              <View style={{ gap: SPACING[3] }}>
                {(() => {
                  const bd = calculatePointsBreakdown(breakdownData.pts);
                  return (
                    <View
                      style={{
                        padding: SPACING[4],
                        borderRadius: RADIUS.lg,
                        backgroundColor: theme.secondary,
                        borderWidth: 1,
                        borderColor: theme.border,
                        gap: SPACING[2.5],
                      }}
                    >
                      <FeeRow
                        label={t("grossProposalAmount")}
                        value={`${bd.gross} pts`}
                      />
                      <FeeRow
                        label={t("platformFeePercent", { percent: 10 })}
                        value={`-${bd.fee} pts`}
                        danger
                      />
                      <Separator style={{ marginVertical: 2 }} />
                      <FeeRow
                        label={
                          breakdownData.payerIsMe
                            ? t("totalPointsYouPay")
                            : t("netPointsYouReceive")
                        }
                        value={`${breakdownData.payerIsMe ? bd.gross : bd.net} pts`}
                        strong
                        accent={breakdownData.payerIsMe ? "red" : "green"}
                      />
                    </View>
                  );
                })()}

                <View
                  style={{
                    flexDirection: "row",
                    gap: SPACING[2.5],
                    alignItems: "flex-start",
                    padding: SPACING[3],
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.secondary,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <ShieldCheck
                    size={18}
                    color={theme.foreground}
                    style={{ marginTop: 2 }}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: FONT_SIZE.xs,
                      color: theme.mutedForeground,
                      flex: 1,
                      lineHeight: 16,
                    }}
                  >
                    {t("feeExplanationText")}
                  </ThemedText>
                </View>
              </View>
            )}

            <Button
              onPress={() => setBreakdownModalOpen(false)}
              style={{ width: "100%" }}
            >
              {t("close")}
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Action Sheet */}
      <ActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={t('requestActions')}
        options={[
          {
            label: t("viewPartnerProfile"),
            icon: <User size={18} color={theme.foreground} />,
            onPress: () =>
              otherUser?.id && router.push(`/users/${otherUser.id}` as any),
          },
          ...(isPending && !isSender
            ? [
                {
                  label: t("acceptRequest"),
                  icon: (
                    <CheckCircle2 size={18} color={getAccent("green").main} />
                  ),
                  onPress: () => setConfirmAccept(true),
                },
                {
                  label: t("rejectRequestAction"),
                  icon: (
                    <XCircle size={18} color={theme.destructive as any} />
                  ),
                  onPress: () => setConfirmReject(true),
                },
              ]
            : []),
          ...(isPending && isSender
            ? [
                {
                  label: t("cancelRequestAction"),
                  icon: <Ban size={18} color={theme.destructive as any} />,
                  onPress: () => setConfirmCancel(true),
                },
              ]
            : []),
          {
            label: t("reportIssue"),
            icon: <AlertTriangle size={18} color={theme.destructive as any} />,
            subtitle: t("reportIssueSubtitle"),
            onPress: () =>
              toast.toast({
                title: t("reportSubmitted"),
                description: t("reportSubmittedDesc"),
                variant: "info",
              }),
          },
        ]}
      />

      {/* Confirm Accept Dialog with Explicit Terms Summary */}
      <AlertDialog
        open={confirmAccept}
        onOpenChange={setConfirmAccept}
        title={
          hasInsufficientPointsToAccept
            ? t("insufficientPointsBalance")
            : t("confirmAcceptTermsTitle")
        }
        description={
          hasInsufficientPointsToAccept
            ? t("insufficientPointsAcceptDesc", { required: request?.pointsProposal ?? 0, balance })
            : t("confirmAcceptTermsDesc", {
                requestedSkill: request?.requestedSkill?.name ?? "",
                requestedSessions: request?.requestedSkillSessions || 1,
                requestedDuration: request?.requestedSkillDuration || 60,
                offeredText: request?.offeredSkill
                  ? t("confirmOfferedSkillSnippet", {
                      skill: request?.offeredSkill?.name ?? "",
                      sessions: request?.offeredSkillSessions || 1,
                      duration: request?.offeredSkillDuration || 60,
                    })
                  : "",
                pointsText:
                  request?.pointsProposal > 0
                    ? t("confirmPointsSnippet", {
                        points: request.pointsProposal,
                        payer:
                          request.pointsPayerId === currentUserId
                            ? t("iPay")
                            : t("theyPay"),
                      })
                    : "",
              })
        }
        confirmLabel={
          hasInsufficientPointsToAccept ? t("getPoints") : t("iAgreeAndAccept")
        }
        onConfirm={handleAcceptTerms}
      />

      {/* Confirm Reject Dialog */}
      <AlertDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title={t('rejectRequest')}
        description={t('rejectRequestDesc')}
        confirmLabel={t('reject')}
        destructive
        onConfirm={async () => {
          try {
            await rejectQ.mutateAsync(id!);
            track(AnalyticsEvent.EXCHANGE_REQUEST_REJECTED, { request_id: id! });
            toast.toast({ title: t("requestRejected"), variant: "info" });
            router.back();
          } catch (e: any) {
            toast.toast({
              title: t("couldNotReject"),
              description: e?.message ?? t("tryAgain"),
              variant: "error",
            });
          }
        }}
      />

      {/* Confirm Cancel Dialog */}
      <AlertDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t('cancelYourRequest')}
        description={t('cancelYourRequestDesc')}
        confirmLabel={t('cancelRequest')}
        destructive
        onConfirm={async () => {
          try {
            await cancelQ.mutateAsync(id!);
            track(AnalyticsEvent.EXCHANGE_REQUEST_CANCELLED, { request_id: id! });
            toast.toast({ title: t("requestCancelled"), variant: "info" });
            router.back();
          } catch (e: any) {
            toast.toast({
              title: t("couldNotCancel"),
              description: e?.message ?? t("tryAgain"),
              variant: "error",
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

/* ============================================================================
 * HEADER HERO CARD
 * ========================================================================= */

function HeaderHeroCard({
  loading,
  request,
  otherUser,
  isSender,
}: {
  loading: boolean;
  request: any;
  otherUser: any;
  isSender: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT('requests');
  const c = useT('common');

  const peerAvail = getPeerAvailabilityInfo(request, isSender, otherUser, t);

  return (
    <Card style={{ borderColor: theme.border }}>
      <CardContent style={{ paddingTop: SPACING[4], gap: SPACING[3.5] }}>
        {loading ? (
          <SkeletonText lines={4} />
        ) : (
          <>
            <Pressable
              style={{
                flexDirection: "row",
                gap: SPACING[3],
                alignItems: "center",
              }}
              onPress={() =>
                otherUser?.id && router.push(`/users/${otherUser.id}` as any)
              }
            >
              <Avatar
                uri={otherUser?.image}
                fallback={otherUser?.name}
                size={50}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText
                  type="title"
                  style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}
                >
                  {otherUser?.name ?? c("peer")}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color: theme.mutedForeground,
                    fontSize: FONT_SIZE.xs,
                  }}
                >
                  {isSender
                    ? t("skillRequestSentByYou")
                    : t("skillRequestReceivedFromPeer")}
                </ThemedText>
              </View>
            </Pressable>

            {/* Skills Exchange Card */}
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.lg,
                backgroundColor: theme.secondary,
                borderWidth: 1,
                borderColor: theme.border,
                gap: SPACING[2],
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING[2.5],
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.background,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BookOpen size={15} color={theme.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: 10,
                      color: theme.mutedForeground,
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    {t("targetSkillLearn")}
                  </ThemedText>
                  <ThemedText
                    type="smallBold"
                    style={{ fontSize: FONT_SIZE.sm }}
                  >
                    {isSender
                      ? request.requestedSkill?.name
                      : request.offeredSkill?.name ?? "—"}
                  </ThemedText>
                </View>
              </View>

              {request.offeredSkill ? (
                <>
                  <Separator />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[2.5],
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: RADIUS.md,
                        backgroundColor: theme.background,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <GraduationCap size={15} color={theme.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="small"
                        style={{
                          fontSize: 10,
                          color: theme.mutedForeground,
                          textTransform: "uppercase",
                          fontWeight: "700",
                        }}
                      >
                        {t("offeredSkillTeach")}
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={{ fontSize: FONT_SIZE.sm }}
                      >
                        {isSender
                          ? request.offeredSkill?.name
                          : request.requestedSkill?.name ?? "—"}
                      </ThemedText>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            {/* Peer Availability Callout Banner */}
            <View
              style={{
                padding: SPACING[2.5],
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[2],
              }}
            >
              <CalendarDays size={14} color={theme.foreground} />
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="smallBold"
                  style={{ fontSize: 11, color: theme.foreground }}
                >
                  {t("peerAvailabilityTitle", { name: otherUser?.name ?? c("peer") })}: {peerAvail.days}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ fontSize: 10, color: theme.mutedForeground }}
                >
                  {t("availTimes", { times: peerAvail.times })}
                </ThemedText>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[1.5],
              }}
            >
              <Clock size={12} color={theme.mutedForeground} />
              <ThemedText
                type="small"
                style={{ fontSize: 11, color: theme.mutedForeground }}
              >
                {t("requestCreatedDate", { date: formatDateTimeShort(request.createdAt) })}
              </ThemedText>
            </View>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * CHAT TAB SECTION WITH AUTO-SCROLL TO BOTTOM
 * ========================================================================= */

function ChatTabSection({
  loading,
  request,
  currentUserId,
  otherUser,
  isPending,
  onQuickReply,
  sending,
  onOpenBreakdown,
  onSwitchTab,
}: {
  loading: boolean;
  request: any;
  currentUserId?: string;
  otherUser: any;
  isPending: boolean;
  onQuickReply: (key: string) => Promise<void>;
  sending: boolean;
  onOpenBreakdown: (pts: number, payerIsMe: boolean) => void;
  onSwitchTab: (tab: Tab) => void;
}) {
  // 1. Declare ALL hooks at the top level
  const theme = useTheme();
  const t = useT('requests');
  const c = useT('common');
  const chatScrollRef = React.useRef<ScrollView>(null);

  const messages = request?.messages ?? [];

  // Auto scroll to bottom whenever messages list changes
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 2. Early returns AFTER all hooks are called
  if (loading) {
    return (
      <Card style={{ borderColor: theme.border }}>
        <CardContent>
          <SkeletonText lines={8} />
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={{ gap: SPACING[3] }}>
      {/* Active Terms Banner at top of chat */}
      <Pressable
        onPress={() => onSwitchTab("terms")}
        style={{
          padding: SPACING[3],
          borderRadius: RADIUS.lg,
          backgroundColor: theme.secondary,
          borderWidth: 1,
          borderColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText
            type="small"
            style={{
              fontSize: 10,
              color: theme.mutedForeground,
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            {t("currentProposedTerms")}
          </ThemedText>
          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.xs }}>
            {request.requestedSkill?.name}: {request.requestedSkillSessions || 1}x {request.requestedSkillDuration || 60}m
            {(request.pointsProposal ?? 0) > 0 ? ` · ${request.pointsProposal} ${c("points")}` : ""}
          </ThemedText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ThemedText
            type="smallBold"
            style={{ fontSize: 11, color: theme.foreground }}
          >
            {t("reviewAndRespond")}
          </ThemedText>
          <ArrowRight size={14} color={theme.foreground} />
        </View>
      </Pressable>

      <Card style={{ borderColor: theme.border }}>
        <CardHeader
          style={{
            paddingBottom: SPACING[3],
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[2],
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={16} color={theme.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle style={{ fontSize: FONT_SIZE.md }}>
                {t("negotiationThread")}
              </CardTitle>
              <CardDescription style={{ fontSize: FONT_SIZE.xs }}>
                {t("realTimeMessagesHistory")}
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3.5] }}>
          <ScrollView
            ref={chatScrollRef}
            onContentSizeChange={() => {
              chatScrollRef.current?.scrollToEnd({ animated: true });
            }}
            onLayout={() => {
              chatScrollRef.current?.scrollToEnd({ animated: false });
            }}
            nestedScrollEnabled
            style={{ maxHeight: 420, marginHorizontal: -SPACING[2] }}
            contentContainerStyle={{
              paddingHorizontal: SPACING[2],
              gap: SPACING[3],
            }}
          >
            {messages.length === 0 ? (
              <View
                style={{
                  padding: SPACING[6],
                  alignItems: "center",
                  gap: SPACING[2],
                }}
              >
                <MessageSquare size={28} color={theme.mutedForeground} />
                <ThemedText
                  type="small"
                  style={{ color: theme.mutedForeground, textAlign: "center" }}
                >
                  {t("noMessagesYet")}
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: SPACING[3] }}>
                {messages.map((msg: any) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <View
                      key={msg.id}
                      style={{ alignItems: isMe ? "flex-end" : "flex-start" }}
                    >
                      <View
                        style={{
                          maxWidth: "88%",
                          padding: SPACING[3],
                          borderRadius: RADIUS.lg,
                          borderTopRightRadius: isMe ? 4 : RADIUS.lg,
                          borderTopLeftRadius: isMe ? RADIUS.lg : 4,
                          backgroundColor: isMe
                            ? theme.primary
                            : theme.secondary,
                          borderWidth: isMe ? 0 : 1,
                          borderColor: theme.border,
                          gap: 4,
                        }}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            fontSize: 10,
                            opacity: 0.8,
                            color: isMe
                              ? theme.primaryForeground
                              : theme.mutedForeground,
                          }}
                        >
                          {isMe ? c("you") : (otherUser?.name ?? c("peer"))}
                        </ThemedText>

                        {msg.messageKey === "PROPOSE_TERMS" ? (
                          <View style={{ gap: SPACING[2] }}>
                            <ThemedText
                              type="smallBold"
                              style={{
                                color: isMe
                                  ? theme.primaryForeground
                                  : theme.foreground,
                                fontSize: FONT_SIZE.xs,
                              }}
                            >
                              {t("msg_PROPOSE_TERMS")}
                            </ThemedText>
                            <View
                              style={{
                                padding: SPACING[2.5],
                                borderRadius: RADIUS.md,
                                backgroundColor: isMe
                                  ? "rgba(255,255,255,0.15)"
                                  : theme.background,
                                borderWidth: 1,
                                borderColor: isMe
                                  ? "rgba(255,255,255,0.2)"
                                  : theme.border,
                                gap: 6,
                              }}
                            >
                              <MiniTermRow
                                label={request.requestedSkill?.name}
                                value={`${msg.requestedSkillSessions || 1}x ${msg.requestedSkillDuration || 60}m`}
                                isMe={isMe}
                              />
                              {(msg.offeredSkillSessions ?? 0) > 0 &&
                              request.offeredSkill ? (
                                <MiniTermRow
                                  label={request.offeredSkill?.name}
                                  value={`${msg.offeredSkillSessions || 1}x ${msg.offeredSkillDuration || 60}m`}
                                  isMe={isMe}
                                />
                              ) : null}

                              {(msg.pointsProposal ?? 0) > 0 ? (
                                <View style={{ gap: 4, marginTop: 2 }}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Coins
                                        size={14}
                                        color={getAccent("amber").main}
                                      />
                                      <ThemedText
                                        type="smallBold"
                                        style={{
                                          color: isMe
                                            ? theme.primaryForeground
                                            : getAccent("amber").main,
                                          fontSize: FONT_SIZE.xs,
                                        }}
                                      >
                                        {msg.pointsProposal} {c("points")}
                                      </ThemedText>
                                    </View>

                                    <Pressable
                                      hitSlop={6}
                                      onPress={() =>
                                        onOpenBreakdown(
                                          msg.pointsProposal,
                                          msg.pointsPayerId === currentUserId,
                                        )
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <Info
                                        size={12}
                                        color={
                                          isMe
                                            ? theme.primaryForeground
                                            : theme.foreground
                                        }
                                      />
                                      <ThemedText
                                        type="small"
                                        style={{
                                          fontSize: 10,
                                          textDecorationLine: "underline",
                                          color: isMe
                                            ? theme.primaryForeground
                                            : theme.foreground,
                                        }}
                                      >
                                        {t("feeBreakdown")}
                                      </ThemedText>
                                    </Pressable>
                                  </View>
                                  <ThemedText
                                    type="small"
                                    style={{
                                      fontSize: 10,
                                      opacity: 0.65,
                                      color: isMe
                                        ? theme.primaryForeground
                                        : theme.mutedForeground,
                                    }}
                                  >
                                    {t("payerLabel", {
                                      payer:
                                        msg.pointsPayerId === currentUserId
                                          ? c("you")
                                          : (otherUser?.name ?? c("peer")),
                                    })}
                                  </ThemedText>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        ) : (
                          <ThemedText
                            type="small"
                            style={{
                              color: isMe
                                ? theme.primaryForeground
                                : theme.foreground,
                              fontSize: FONT_SIZE.xs,
                              lineHeight: 18,
                            }}
                          >
                            {translateQuickReply(msg.messageKey, t)}
                          </ThemedText>
                        )}

                        <ThemedText
                          type="small"
                          style={{
                            fontSize: 10,
                            opacity: 0.65,
                            color: isMe
                              ? theme.primaryForeground
                              : theme.mutedForeground,
                            marginTop: 2,
                            alignSelf: "flex-end",
                          }}
                        >
                          {formatTimeShort(msg.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {isPending ? (
            <View style={{ gap: SPACING[2], paddingTop: SPACING[2] }}>
              <ThemedText
                type="smallBold"
                style={{
                  fontSize: 11,
                  color: theme.mutedForeground,
                  textTransform: "uppercase",
                }}
              >
                {t("quickReplies")}
              </ThemedText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: SPACING[2],
                }}
              >
                {QUICK_REPLIES.map((r) => (
                  <Button
                    key={r.key}
                    size="sm"
                    variant="outline"
                    onPress={() => onQuickReply(r.key)}
                    disabled={sending}
                    style={{ borderRadius: RADIUS.pill }}
                  >
                    {t(r.labelKey)}
                  </Button>
                ))}
              </View>
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: SPACING[3],
                gap: 4,
              }}
            >
              <Badge variant="outline">{t("negotiationFinalized")}</Badge>
              <ThemedText
                type="small"
                style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.xs }}
              >
                {t("chatLocked")}
              </ThemedText>
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  );
}

function MiniTermRow({
  label,
  value,
  isMe,
}: {
  label: string;
  value: string;
  isMe: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: SPACING[3],
      }}
    >
      <ThemedText
        type="small"
        style={{
          color: isMe ? theme.primaryForeground : theme.mutedForeground,
          fontSize: 11,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={{
          color: isMe ? theme.primaryForeground : theme.foreground,
          fontSize: 11,
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/* ============================================================================
 * TERMS & AGREEMENT TAB SECTION
 * ========================================================================= */

function TermsTabSection({
  loading,
  request,
  currentUserId,
  otherUser,
  isPending,
  isSender,
  amIAgreed,
  counterPointsNum,
  counterPayerIsMe,
  hasInsufficientPointsToAccept,
  hasInsufficientPointsToPropose,
  reqSessions,
  setReqSessions,
  reqDuration,
  setReqDuration,
  offSessions,
  setOffSessions,
  offDuration,
  setOffDuration,
  counterPoints,
  setCounterPoints,
  setCounterPayerIsMe,
  reqDays,
  setReqDays,
  reqTime,
  setReqTime,
  offDays,
  setOffDays,
  offTime,
  setOffTime,
  onPropose,
  proposeLoading,
  onAccept,
  onReject,
  onCancel,
  acceptLoading,
  balance,
  onOpenBreakdown,
  onGoToExchange,
}: any) {
  const theme = useTheme();
  const t = useT('requests');
  const c = useT('common');

  if (loading) {
    return (
      <Card style={{ borderColor: theme.border }}>
        <CardContent>
          <SkeletonText lines={10} />
        </CardContent>
      </Card>
    );
  }

  const pointsBreakdown =
    counterPointsNum > 0 ? calculatePointsBreakdown(counterPointsNum) : null;
  const isCommitted = request.status === "COMMITTED";
  const peerAvail = getPeerAvailabilityInfo(request, isSender, otherUser, t);

  return (
    <View style={{ gap: SPACING[4] }}>
      {/* Current Agreement State & Action Card (Action buttons directly embedded right next to terms!) */}
      <Card style={{ borderColor: theme.border }}>
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
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Handshake size={16} color={theme.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle style={{ fontSize: FONT_SIZE.md }}>
                {t("agreementAndProposedTerms")}
              </CardTitle>
              <CardDescription style={{ fontSize: FONT_SIZE.xs }}>
                {t("reviewActiveProposalDesc")}
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3.5] }}>
          {/* Party Agreement Badges */}
          <View style={{ gap: SPACING[2] }}>
            <AgreementRow
              name={request.sender?.name ?? c("sender")}
              agreed={!!request.senderAgreed}
              isMe={request.senderId === currentUserId}
            />
            <AgreementRow
              name={request.receiver?.name ?? c("receiver")}
              agreed={!!request.receiverAgreed}
              isMe={request.receiverId === currentUserId}
            />
          </View>

          {/* Active Proposed Slots Display in 12h AM/PM Format */}
          {request.proposedSlots?.length > 0 ? (
            <View
              style={{
                gap: SPACING[2],
                paddingTop: SPACING[2],
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <ThemedText
                type="smallBold"
                style={{
                  fontSize: 11,
                  color: theme.mutedForeground,
                  textTransform: "uppercase",
                }}
              >
                {t("proposedScheduleSlots")}
              </ThemedText>
              <View style={{ gap: SPACING[2] }}>
                {request.proposedSlots.map((slot: any) => {
                  const skillName =
                    slot.skillId === request.requestedSkillId
                      ? request.requestedSkill?.name
                      : request.offeredSkill?.name;
                  const isMe = slot.proposerId === currentUserId;
                  const isAccepted = slot.status === "ACCEPTED";
                  return (
                    <View
                      key={slot.id}
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.md,
                        borderWidth: 1,
                        borderColor: isAccepted
                          ? getAccent("emerald").border
                          : theme.border,
                        backgroundColor: isAccepted
                          ? getAccent("emerald").bg
                          : theme.secondary,
                        gap: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ fontSize: FONT_SIZE.xs }}
                        >
                          {skillName}
                        </ThemedText>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: isAccepted
                              ? getAccent("emerald").main
                              : getAccent("amber").main,
                          }}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              fontSize: 10,
                              color: isAccepted
                                ? getAccent("emerald").main
                                : getAccent("amber").main,
                            }}
                          >
                            {isAccepted ? t("agreed") : t("statusPending")}
                          </ThemedText>
                        </Badge>
                      </View>
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.foreground,
                          fontSize: FONT_SIZE.xs,
                          fontWeight: "500",
                          marginTop: 2,
                        }}
                      >
                        📅 {DAY_NAMES_LONG[slot.dayOfWeek]} at {formatTimeToAMPM(slot.startTime)}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.mutedForeground,
                          fontSize: 11,
                        }}
                      >
                        {t("proposedBy", { name: isMe ? c("you") : (slot.proposer?.name ?? c("peer")) })}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* COMMITTED Banner */}
          {isCommitted && request.exchange?.id ? (
            <View style={{ gap: SPACING[2.5], paddingTop: SPACING[2] }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING[2.5],
                  padding: SPACING[3],
                  borderRadius: RADIUS.md,
                  backgroundColor: getAccent("green").bg,
                  borderWidth: 1,
                  borderColor: getAccent("green").border,
                }}
              >
                <CheckCircle2 size={20} color={getAccent("green").main} />
                <ThemedText
                  type="small"
                  style={{
                    fontSize: 12,
                    color: getAccent("green").main,
                    flex: 1,
                    fontWeight: "600",
                  }}
                >
                  {t("negotiationCompleteActive")}
                </ThemedText>
              </View>
              <Button
                leftIcon={<ArrowRight size={16} color={theme.primaryForeground} />}
                onPress={onGoToExchange}
                style={{ width: "100%" }}
              >
                {t("goToExchangeWorkspace")}
              </Button>
            </View>
          ) : null}

          {/* Action Buttons Directly Embedded Next To What User Is Agreeing To! */}
          {isPending ? (
            <View
              style={{
                gap: SPACING[2],
                paddingTop: SPACING[3],
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              {hasInsufficientPointsToAccept && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[2],
                    padding: SPACING[2.5],
                    borderRadius: RADIUS.md,
                    backgroundColor: getAccent("red").bg,
                    borderWidth: 1,
                    borderColor: getAccent("red").border,
                  }}
                >
                  <Info size={16} color={getAccent("red").main} />
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: 11,
                      color: getAccent("red").main,
                      flex: 1,
                    }}
                  >
                    {t("needPointsToAccept", { pts: request?.pointsProposal ?? 0, balance })}
                  </ThemedText>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: SPACING[2] }}>
                {!amIAgreed && (
                  <Button
                    style={{ flex: 1 }}
                    onPress={onAccept}
                    loading={acceptLoading}
                    leftIcon={
                      acceptLoading ? undefined : (
                        <CheckCircle2
                          size={16}
                          color={theme.primaryForeground}
                        />
                      )
                    }
                  >
                    {t("acceptTerms")}
                  </Button>
                )}

                {onReject && !isSender ? (
                  <Button
                    style={{ flex: amIAgreed ? 1 : 0.8 }}
                    variant="destructive"
                    onPress={onReject}
                    leftIcon={
                      <XCircle
                        size={16}
                        color={theme.destructiveForeground}
                      />
                    }
                  >
                    {t("reject")}
                  </Button>
                ) : null}

                {onCancel && isSender ? (
                  <Button
                    style={{ flex: amIAgreed ? 1 : 0.8 }}
                    variant="outline"
                    onPress={onCancel}
                    leftIcon={<Ban size={16} color={theme.foreground} />}
                  >
                    {t("cancelRequestAction")}
                  </Button>
                ) : null}
              </View>
            </View>
          ) : null}
        </CardContent>
      </Card>

      {/* Propose New Terms Form (when PENDING) */}
      {isPending ? (
        <Card style={{ borderColor: theme.border }}>
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
                  width: 32,
                  height: 32,
                  borderRadius: RADIUS.md,
                  backgroundColor: theme.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarCheck size={16} color={theme.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <CardTitle style={{ fontSize: FONT_SIZE.md }}>
                  {t("proposeCounterTerms")}
                </CardTitle>
                <CardDescription style={{ fontSize: FONT_SIZE.xs }}>
                  {t("modifySessionScheduleDesc")}
                </CardDescription>
              </View>
            </View>
          </CardHeader>
          <CardContent style={{ gap: SPACING[4] }}>
            {/* Peer Stated Free Times Callout inside Propose Form so User sees it when picking slots */}
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: theme.secondary,
                borderWidth: 1,
                borderColor: theme.border,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CalendarDays size={14} color={theme.foreground} />
                <ThemedText
                  type="smallBold"
                  style={{ fontSize: 11, color: theme.foreground }}
                >
                  {t("peerFreeDaysAndTimes", { name: otherUser?.name ?? c("peer") })}
                </ThemedText>
              </View>
              <ThemedText
                type="small"
                style={{ fontSize: 11, color: theme.mutedForeground }}
              >
                {t("daysTimesSummary", { days: peerAvail.days, times: peerAvail.times })}
              </ThemedText>
            </View>

            {/* Skill 1 Editor */}
            <SkillTermCard
              label={t("requestedSkillLearnLabel", { skill: request.requestedSkill?.name ?? "" })}
              sessions={reqSessions}
              setSessions={setReqSessions}
              duration={reqDuration}
              setDuration={setReqDuration}
              days={reqDays}
              setDays={setReqDays}
              time={reqTime}
              setTime={setReqTime}
              maxDays={parseInt(reqSessions) || 1}
            />

            {/* Skill 2 Editor (if swap) */}
            {request.offeredSkill ? (
              <SkillTermCard
                label={t("offeredSkillTeachLabel", { skill: request.offeredSkill?.name ?? "" })}
                sessions={offSessions}
                setSessions={setOffSessions}
                duration={offDuration}
                setDuration={setOffDuration}
                days={offDays}
                setDays={setOffDays}
                time={offTime}
                setTime={setOffTime}
                maxDays={parseInt(offSessions) || 1}
              />
            ) : null}

            {/* Dedicated Points Negotiation Section */}
            <PointsNegotiationCard
              counterPoints={counterPoints}
              setCounterPoints={setCounterPoints}
              counterPayerIsMe={counterPayerIsMe}
              setCounterPayerIsMe={setCounterPayerIsMe}
              pointsBreakdown={pointsBreakdown}
              counterPointsNum={counterPointsNum}
              balance={balance}
              onOpenBreakdown={onOpenBreakdown}
            />

            <View style={{ gap: SPACING[2], paddingTop: SPACING[2] }}>
              {hasInsufficientPointsToPropose && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[2],
                    padding: SPACING[3],
                    borderRadius: RADIUS.md,
                    backgroundColor: getAccent("red").bg,
                    borderWidth: 1,
                    borderColor: getAccent("red").border,
                  }}
                >
                  <Info size={16} color={getAccent("red").main} />
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: 11,
                      color: getAccent("red").main,
                      flex: 1,
                    }}
                  >
                    {t("needPointsToPropose", { pts: counterPointsNum, balance })}
                  </ThemedText>
                </View>
              )}

              <Button
                loading={proposeLoading}
                disabled={hasInsufficientPointsToPropose}
                leftIcon={<Sparkles size={16} color={theme.primaryForeground} />}
                onPress={onPropose}
                style={{ width: "100%" }}
              >
                {t("submitProposal")}
              </Button>
            </View>
          </CardContent>
        </Card>
      ) : null}
    </View>
  );
}

/* ============================================================================
 * POINTS NEGOTIATION CARD
 * ========================================================================= */

function PointsNegotiationCard({
  counterPoints,
  setCounterPoints,
  counterPayerIsMe,
  setCounterPayerIsMe,
  pointsBreakdown,
  counterPointsNum,
  balance,
  onOpenBreakdown,
}: any) {
  const theme = useTheme();
  const t = useT('requests');
  const c = useT('common');

  return (
    <View
      style={{
        padding: SPACING[3.5],
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.secondary,
        gap: SPACING[3],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[2],
          }}
        >
          <Coins size={18} color={getAccent("amber").main} />
          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.xs }}>
            {t("pointsAdjustmentOptional")}
          </ThemedText>
        </View>

        <ThemedText
          type="small"
          style={{ fontSize: 11, color: theme.mutedForeground }}
        >
          {t("balancePts", { balance })}
        </ThemedText>
      </View>

      {/* Payer Toggle Buttons */}
      <View
        style={{
          flexDirection: "row",
          borderRadius: RADIUS.md,
          backgroundColor: theme.background,
          padding: 3,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Pressable
          onPress={() => setCounterPayerIsMe(true)}
          style={{
            flex: 1,
            paddingVertical: SPACING[2],
            borderRadius: RADIUS.sm,
            backgroundColor: counterPayerIsMe
              ? theme.primary
              : "transparent",
            alignItems: "center",
          }}
        >
          <ThemedText
            type="smallBold"
            style={{
              fontSize: FONT_SIZE.xs,
              color: counterPayerIsMe
                ? theme.primaryForeground
                : theme.foreground,
            }}
          >
            {t("iPayPoints")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setCounterPayerIsMe(false)}
          style={{
            flex: 1,
            paddingVertical: SPACING[2],
            borderRadius: RADIUS.sm,
            backgroundColor: !counterPayerIsMe
              ? theme.primary
              : "transparent",
            alignItems: "center",
          }}
        >
          <ThemedText
            type="smallBold"
            style={{
              fontSize: FONT_SIZE.xs,
              color: !counterPayerIsMe
                ? theme.primaryForeground
                : theme.foreground,
            }}
          >
            {t("theyPayPoints")}
          </ThemedText>
        </Pressable>
      </View>

      {/* Input + Stepper Buttons */}
      <View style={{ gap: SPACING[2] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[2],
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              value={counterPoints}
              onChangeText={setCounterPoints}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable
              onPress={() => {
                const current = parseInt(counterPoints) || 0;
                setCounterPoints(Math.max(0, current - 10).toString());
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={16} color={theme.foreground} />
            </Pressable>

            <Pressable
              onPress={() => {
                const current = parseInt(counterPoints) || 0;
                setCounterPoints((current + 10).toString());
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={16} color={theme.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Quick Presets */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: SPACING[1.5],
          }}
        >
          {POINT_PRESETS.map((pt) => {
            const isSelected = counterPointsNum === pt;
            return (
              <Pressable
                key={pt}
                onPress={() => setCounterPoints(pt.toString())}
                style={{
                  paddingHorizontal: SPACING[2.5],
                  paddingVertical: SPACING[1],
                  borderRadius: RADIUS.pill,
                  backgroundColor: isSelected
                    ? theme.primary
                    : theme.background,
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <ThemedText
                  type="small"
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isSelected
                      ? theme.primaryForeground
                      : theme.foreground,
                  }}
                >
                  {pt === 0 ? t("clearPoints") : `${pt} ${c("points")}`}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Breakdown Summary Box */}
      {pointsBreakdown ? (
        <View
          style={{
            padding: SPACING[3],
            borderRadius: RADIUS.md,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 4,
          }}
        >
          <FeeRow
            label={t("grossProposal")}
            value={`${pointsBreakdown.gross} ${c("points")}`}
          />
          <FeeRow
            label={t("platformFeePercent", { percent: 10 })}
            value={`-${pointsBreakdown.fee} ${c("points")}`}
            danger
          />
          <Separator style={{ marginVertical: 2 }} />
          <FeeRow
            label={counterPayerIsMe ? t("youPayTotal") : t("youReceiveNet")}
            value={`${counterPayerIsMe ? pointsBreakdown.gross : pointsBreakdown.net} ${c("points")}`}
            strong
            accent={counterPayerIsMe ? "red" : "green"}
          />

          <Pressable
            onPress={() => onOpenBreakdown(counterPointsNum, counterPayerIsMe)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            <Info size={12} color={theme.mutedForeground} />
            <ThemedText
              type="small"
              style={{
                fontSize: 10,
                color: theme.mutedForeground,
                textDecorationLine: "underline",
              }}
            >
              {t("viewPlatformFeeDetails")}
            </ThemedText>
          </Pressable>

          {counterPayerIsMe && balance < pointsBreakdown.gross ? (
            <ThemedText
              type="small"
              style={{
                fontSize: 11,
                color: theme.destructive,
                marginTop: SPACING[1],
                fontWeight: "600",
              }}
            >
              {t("insufficientBalancePts", { balance })}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================================
 * AVAILABILITY TAB SECTION
 * ========================================================================= */

function AvailabilityTabSection({
  loading,
  request,
  otherUser,
  isPending,
  isSender,
  availDays,
  setAvailDays,
  availTimes,
  setAvailTimes,
  onUpdateAvail,
  updatingAvail,
}: any) {
  const theme = useTheme();
  const t = useT('requests');
  const c = useT('common');

  if (loading) {
    return (
      <Card style={{ borderColor: theme.border }}>
        <CardContent>
          <SkeletonText lines={6} />
        </CardContent>
      </Card>
    );
  }

  const toggleAvailDay = (idx: number) => {
    const s = idx.toString();
    setAvailDays((prev: string[]) =>
      prev.includes(s) ? prev.filter((d) => d !== s) : [...prev, s],
    );
  };

  const toggleAvailTime = (val: string) => {
    setAvailTimes((prev: string[]) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  };

  const peerAvail = getPeerAvailabilityInfo(request, isSender, otherUser, t);

  return (
    <View style={{ gap: SPACING[4] }}>
      <Card style={{ borderColor: theme.border }}>
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
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays size={16} color={theme.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle style={{ fontSize: FONT_SIZE.md }}>
                {t("generalAvailability")}
              </CardTitle>
              <CardDescription style={{ fontSize: FONT_SIZE.xs }}>
                {t("overallFreeDaysTimesDesc")}
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          {/* Peer's Stated Availability Banner */}
          <View
            style={{
              padding: SPACING[3],
              borderRadius: RADIUS.md,
              backgroundColor: theme.secondary,
              borderWidth: 1,
              borderColor: theme.border,
              gap: SPACING[1],
            }}
          >
            <ThemedText
              type="smallBold"
              style={{
                fontSize: 11,
                color: theme.foreground,
                textTransform: "uppercase",
              }}
            >
              {t("peerAvailabilityTitle", { name: otherUser?.name ?? c("peer") })}
            </ThemedText>
            <ThemedText type="small" style={{ fontSize: FONT_SIZE.xs }}>
              {t("availDays", { days: peerAvail.days })}
            </ThemedText>
            <ThemedText type="small" style={{ fontSize: FONT_SIZE.xs }}>
              {t("availTimes", { times: peerAvail.times })}
            </ThemedText>
          </View>

          {isPending ? (
            <View style={{ gap: SPACING[3] }}>
              <ThemedText
                type="small"
                style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.xs }}
              >
                {t("setFreeTimesHelp", { name: otherUser?.name ?? c("peer") })}
              </ThemedText>

              <View style={{ gap: SPACING[2] }}>
                <Label label={t("myFreeDays")} />
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: SPACING[1.5],
                  }}
                >
                  {DAY_NAMES_SHORT.map((d, idx) => {
                    const selected = availDays.includes(idx.toString());
                    return (
                      <Badge
                        key={idx}
                        variant={selected ? "default" : "outline"}
                        style={
                          (selected
                            ? {}
                            : { backgroundColor: theme.background }) as any
                        }
                      >
                        <Pressable
                          hitSlop={6}
                          onPress={() => toggleAvailDay(idx)}
                        >
                          <ThemedText type="smallBold" style={{ fontSize: 11 }}>
                            {d}
                          </ThemedText>
                        </Pressable>
                      </Badge>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: SPACING[2] }}>
                <Label label={t("myFreeTimes")} />
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: SPACING[1.5],
                  }}
                >
                  {TIME_SLOTS.map(({ val, labelKey, Icon }) => {
                    const selected = availTimes.includes(val);
                    return (
                      <Badge
                        key={val}
                        variant={selected ? "default" : "outline"}
                        style={
                          (selected
                            ? {}
                            : { backgroundColor: theme.background }) as any
                        }
                      >
                        <Pressable
                          hitSlop={6}
                          onPress={() => toggleAvailTime(val)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon
                            size={12}
                            color={selected ? theme.primaryForeground : theme.mutedForeground}
                          />
                          <ThemedText type="smallBold" style={{ fontSize: 11 }}>
                            {t(labelKey)}
                          </ThemedText>
                        </Pressable>
                      </Badge>
                    );
                  })}
                </View>
              </View>

              <Button
                size="sm"
                variant="outline"
                loading={updatingAvail}
                onPress={onUpdateAvail}
                style={{ marginTop: SPACING[1] }}
              >
                {t("saveAvailability")}
              </Button>
            </View>
          ) : null}
        </CardContent>
      </Card>
    </View>
  );
}

/* ============================================================================
 * SKILL TERM CARD SUBCOMPONENT WITH NATIVE DATETIMEPICKER
 * ========================================================================= */

function SkillTermCard({
  label,
  sessions,
  setSessions,
  duration,
  setDuration,
  days,
  setDays,
  time,
  setTime,
  maxDays,
}: any) {
  const theme = useTheme();
  const t = useT('requests');


  const toggleDay = (idx: number) => {
    const s = idx.toString();
    setDays((prev: string[]) =>
      prev.includes(s)
        ? prev.filter((d) => d !== s)
        : prev.length < maxDays
          ? [...prev, s]
          : prev,
    );
  };

  const bumpSessions = (delta: number) => {
    const current = parseInt(sessions) || 1;
    const next = Math.max(1, current + delta);
    setSessions(next.toString());
  };

  const bumpDuration = (delta: number) => {
    const current = parseInt(duration) || 60;
    const next = Math.max(15, current + delta);
    setDuration(next.toString());
  };

  return (
    <View
      style={{
        padding: SPACING[3.5],
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.secondary,
        gap: SPACING[3],
      }}
    >
      <ThemedText
        type="smallBold"
        style={{
          fontSize: 12,
          color: theme.foreground,
          textTransform: "uppercase",
        }}
      >
        {label}
      </ThemedText>

      {/* Steppers for Sessions & Duration */}
      <View style={{ flexDirection: "row", gap: SPACING[2.5] }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Label label={t("sessions")} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Pressable
              onPress={() => bumpSessions(-1)}
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={14} color={theme.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Input
                value={sessions}
                onChangeText={setSessions}
                keyboardType="numeric"
                style={{ textAlign: "center" }}
              />
            </View>
            <Pressable
              onPress={() => bumpSessions(1)}
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={14} color={theme.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Label label={t("minutesEach")} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Pressable
              onPress={() => bumpDuration(-15)}
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={14} color={theme.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Input
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                style={{ textAlign: "center" }}
              />
            </View>
            <Pressable
              onPress={() => bumpDuration(15)}
              style={{
                width: 34,
                height: 34,
                borderRadius: RADIUS.md,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={14} color={theme.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Days Selection */}
      <View style={{ gap: SPACING[1.5] }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Label label={t("selectDays")} />
          <ThemedText
            type="small"
            style={{ fontSize: 10, color: theme.mutedForeground }}
          >
            {t("maxDaysCount", { max: maxDays })}
          </ThemedText>
        </View>

        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[1.5] }}
        >
          {DAY_NAMES_SHORT.map((d, idx) => {
            const selected = days.includes(idx.toString());
            const disabled = !selected && days.length >= maxDays;
            return (
              <Badge
                key={idx}
                variant={selected ? "default" : "outline"}
                style={
                  [
                    selected ? {} : { backgroundColor: theme.background },
                    disabled ? { opacity: 0.4 } : null,
                  ] as any
                }
              >
                <Pressable
                  hitSlop={4}
                  onPress={() => !disabled && toggleDay(idx)}
                  disabled={disabled}
                >
                  <ThemedText type="smallBold" style={{ fontSize: 11 }}>
                    {d}
                  </ThemedText>
                </Pressable>
              </Badge>
            );
          })}
        </View>
      </View>

      {/* Native DateTimePicker Integration */}
      <NativeTimePickerField
        value={time}
        onChange={setTime}
        label={t("startTime")}
      />
    </View>
  );
}

/* Native Time Picker Component powered by @react-native-community/datetimepicker */
function NativeTimePickerField({
  value,
  onChange,
  label = "Start Time",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  const theme = useTheme();
  const t = useT('requests');
  const [showPicker, setShowPicker] = React.useState(false);

  const dateValue = React.useMemo(() => {
    const d = new Date();
    if (!value) return d;
    const parts = value.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h)) d.setHours(h);
    if (!isNaN(m)) d.setMinutes(m);
    return d;
  }, [value]);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate && event.type !== "dismissed") {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      onChange(`${hours}:${minutes}`);
    }
  };

  return (
    <View style={{ gap: SPACING[1.5] }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Label label={label} />
        <ThemedText
          type="smallBold"
          style={{ fontSize: FONT_SIZE.xs, color: theme.foreground }}
        >
          {formatTimeToAMPM(value)}
        </ThemedText>
      </View>

      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: SPACING[3],
          paddingVertical: SPACING[2.5],
          borderRadius: RADIUS.md,
          backgroundColor: theme.background,
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
          <Clock size={16} color={theme.foreground} />
          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
            {formatTimeToAMPM(value) || t("selectTime")}
          </ThemedText>
        </View>

        <Badge variant="secondary" style={{ backgroundColor: theme.secondary }}>
          <ThemedText
            type="small"
            style={{ fontSize: 10, color: theme.mutedForeground }}
          >
            {t("tapToOpenPicker")}
          </ThemedText>
        </Badge>
      </Pressable>

      {/* AM/PM Time Presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING[1.5], paddingTop: 4 }}
      >
        {TIME_PRESETS_AMPM.map((item) => {
          const isSelected = value === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              style={{
                paddingHorizontal: SPACING[2.5],
                paddingVertical: SPACING[1],
                borderRadius: RADIUS.pill,
                backgroundColor: isSelected
                  ? theme.primary
                  : theme.background,
                borderWidth: 1,
                borderColor: isSelected ? theme.primary : theme.border,
              }}
            >
              <ThemedText
                type="small"
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isSelected
                    ? theme.primaryForeground
                    : theme.foreground,
                }}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {showPicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal
              transparent
              animationType="fade"
              visible={showPicker}
              onRequestClose={() => setShowPicker(false)}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: SPACING[4],
                }}
                onPress={() => setShowPicker(false)}
              >
                <Pressable
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    backgroundColor: theme.card,
                    borderRadius: RADIUS.xl,
                    padding: SPACING[4],
                    gap: SPACING[3],
                    alignItems: "center",
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <ThemedText
                    type="subtitle"
                    style={{ fontSize: FONT_SIZE.md }}
                  >
                    {t("selectStartTime")}
                  </ThemedText>

                  <DateTimePicker
                    value={dateValue}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleChange}
                    textColor={theme.foreground}
                  />

                  <Button
                    onPress={() => setShowPicker(false)}
                    style={{ width: "100%" }}
                  >
                    {t("doneWithTime", { time: formatTimeToAMPM(value) })}
                  </Button>
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            <DateTimePicker
              value={dateValue}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleChange}
            />
          )}
        </>
      )}
    </View>
  );
}

/* ============================================================================
 * HELPERS & MISC COMPONENTS
 * ========================================================================= */

function AgreementRow({
  name,
  agreed,
  isMe,
}: {
  name: string;
  agreed: boolean;
  isMe: boolean;
}) {
  const theme = useTheme();
  const t = useT('requests');
  const c = useT('common');

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <ThemedText type="small" style={{ fontSize: FONT_SIZE.sm }}>
        {name}{" "}
        {isMe && (
          <ThemedText type="small" style={{ color: theme.mutedForeground }}>
            ({c("you")})
          </ThemedText>
        )}
      </ThemedText>
      <Badge
        variant="outline"
        style={{
          borderColor: agreed
            ? getAccent("emerald").main
            : getAccent("amber").main,
        }}
      >
        <ThemedText
          type="smallBold"
          style={{
            fontSize: 10,
            color: agreed
              ? getAccent("emerald").main
              : getAccent("amber").main,
          }}
        >
          {agreed ? t("agreed") : t("statusPending")}
        </ThemedText>
      </Badge>
    </View>
  );
}

function FeeRow({ label, value, danger, strong, accent }: any) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <ThemedText
        type="small"
        style={{
          color: danger ? theme.destructive : theme.foreground,
          fontSize: FONT_SIZE.xs,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? "default" : "small"}
        style={{
          color: accent
            ? getAccent(accent).main
            : danger
              ? theme.destructive
              : theme.foreground,
          fontSize: FONT_SIZE.xs,
          fontWeight: strong ? "700" : "500",
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function getPeerAvailabilityInfo(request: any, isSender: boolean, otherUser: any, t?: any) {
  const avail = isSender
    ? request?.receiverAvailability ?? otherUser?.availability
    : request?.senderAvailability ?? otherUser?.availability;

  const days =
    avail?.days && avail.days.length > 0
      ? avail.days.map((d: number) => DAY_NAMES_LONG[d]).join(", ")
      : t ? t("flexibleAnyDay") : "";

  const times =
    avail?.timeSlots && avail.timeSlots.length > 0
      ? avail.timeSlots.join(", ")
      : t ? t("flexibleAnyTime") : "";

  return { days, times };
}

function labelForRequestStatus(s: string, t?: any) {
  switch (s) {
    case "PENDING":
      return t ? t("statusPending") : s;
    case "COMMITTED":
      return t ? t("statusCommitted") : s;
    case "REJECTED":
      return t ? t("statusRejected") : s;
    case "CANCELLED":
      return t ? t("statusCancelled") : s;
    default:
      return s.replace(/_/g, " ");
  }
}

function translateQuickReply(k: string, t?: any) {
  if (!k) return "";
  return t ? t(`msg_${k}`) : k.replace(/_/g, " ");
}

function formatTimeShort(dateStr: string | Date) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeToAMPM(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}
