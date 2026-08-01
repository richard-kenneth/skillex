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
  getAccent,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useAcceptRequest,
  useCancelRequest,
  useCurrentUser,
  usePointsBalance,
  useRejectRequest,
  useRequestById,
  useSendRequestMessage,
} from "@/lib/api-hooks";
import {
  calculatePointsBreakdown,
  DAY_NAMES_LONG,
  DAY_NAMES_SHORT,
  formatDateTimeShort,
  getRequestStatusColor,
} from "@skil-ex2/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
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
  Moon,
  MoreHorizontal,
  Sparkles,
  Sunrise,
  Sunset,
  User,
  XCircle,
} from "lucide-react-native";
import React from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type Tab = "messages" | "terms";

const QUICK_REPLIES = [
  { key: "AVAILABLE_WEEKDAYS", label: "Weekdays" },
  { key: "AVAILABLE_WEEKENDS", label: "Weekends" },
  { key: "NEED_MORE_TIME", label: "Need time" },
  { key: "REQUEST_RESCHEDULE", label: "Reschedule" },
];

const TIME_SLOTS = [
  { val: "Morning", label: "Morning", Icon: Sunrise },
  { val: "Afternoon", label: "Afternoon", Icon: Sunset },
  { val: "Evening", label: "Evening", Icon: CloudMoon },
  { val: "Night", label: "Night", Icon: Moon },
];

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const q = useRequestById(id!);
  const acceptQ = useAcceptRequest();
  const rejectQ = useRejectRequest();
  const cancelQ = useCancelRequest();
  const msgQ = useSendRequestMessage();
  const userQ = useCurrentUser();
  const balanceQ = usePointsBalance();

  const [tab, setTab] = React.useState<Tab>("messages");
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirmAccept, setConfirmAccept] = React.useState(false);
  const [confirmReject, setConfirmReject] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  const [reqSessions, setReqSessions] = React.useState("1");
  const [reqDuration, setReqDuration] = React.useState("60");
  const [offSessions, setOffSessions] = React.useState("1");
  const [offDuration, setOffDuration] = React.useState("60");
  const [counterPoints, setCounterPoints] = React.useState("0");
  const [counterPayerIsMe, setCounterPayerIsMe] = React.useState(true);
  const [reqDays, setReqDays] = React.useState<string[]>([]);
  const [reqTime, setReqTime] = React.useState("");
  const [offDays, setOffDays] = React.useState<string[]>([]);
  const [offTime, setOffTime] = React.useState("");
  const [availDays, setAvailDays] = React.useState<string[]>([]);
  const [availTimes, setAvailTimes] = React.useState<string[]>([]);
  const [proposing, setProposing] = React.useState(false);

  const request = q.data as any;
  const loading = q.isLoading;
  const currentUserId = (userQ.data as any)?.id;
  const balance = (balanceQ.data as any)?.balance ?? 0;
  const isSender = request?.senderId === currentUserId;
  const otherUser = isSender ? request?.receiver : request?.sender;
  const isPending = request?.status === "PENDING";
  const isCommitted = request?.status === "COMMITTED";
  const counterPointsNum = parseInt(counterPoints) || 0;
  const isPayerInCurrentProposal = request?.pointsPayerId === currentUserId;
  const hasInsufficientPointsToAccept =
    isPayerInCurrentProposal && balance < (request?.pointsProposal || 0);

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

  const toggleDay = (
    days: string[],
    setDays: (v: string[]) => void,
    dayString: string,
    maxDays: number,
  ) => {
    if (days.includes(dayString)) {
      setDays(days.filter((d) => d !== dayString));
    } else if (days.length < maxDays) {
      setDays([...days, dayString]);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["bottom"]}
    >
      <ThemedView type="background" style={{ flex: 1, alignItems: "center" }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING[5],
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
              paddingTop: SPACING[2],
            }}
          >
            <HeaderCard
              loading={loading}
              request={request}
              otherUser={otherUser}
              isSender={isSender}
              statusColor={getRequestStatusColor(request?.status)}
              onActions={() => setActionsOpen(true)}
            />

            <Tabs<Tab>
              variant="underline"
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "messages",
                  label: "Messages",
                  badge: request?.messages?.length || undefined,
                },
                { value: "terms", label: "Terms & Schedule" },
              ]}
            />

            {tab === "messages" && (
              <MessagesBody
                loading={loading}
                request={request}
                currentUserId={currentUserId}
                otherUser={otherUser}
                isPending={isPending}
                onQuickReply={async (key) => {
                  try {
                    await msgQ.mutateAsync({ requestId: id!, payload: { messageKey: key } } as any);
                    toast.toast({ title: "Message sent", variant: "success" });
                    await q.refetch();
                  } catch (e: any) {
                    toast.toast({
                      title: "Failed",
                      description: e?.message ?? "Try again",
                      variant: "error",
                    });
                  }
                }}
                sending={msgQ.isPending}
              />
            )}

            {tab === "terms" && (
              <TermsBody
                loading={loading}
                request={request}
                currentUserId={currentUserId}
                otherUser={otherUser}
                isPending={isPending}
                isSender={isSender}
                counterPointsNum={counterPointsNum}
                counterPayerIsMe={counterPayerIsMe}
                hasInsufficientPointsToAccept={hasInsufficientPointsToAccept}
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
                availDays={availDays}
                setAvailDays={setAvailDays}
                availTimes={availTimes}
                setAvailTimes={setAvailTimes}
                onPropose={async () => {
                  setProposing(true);
                  try {
                    const pts = parseInt(counterPoints) || 0;
                    const slots: any[] = [];
                    if (reqDays.length > 0 && reqTime) {
                      reqDays.forEach((day) => {
                        slots.push({
                          skillId: request.requestedSkillId,
                          dayOfWeek: parseInt(day),
                          startTime: reqTime,
                        });
                      });
                    }
                    if (
                      request.offeredSkillId &&
                      offDays.length > 0 &&
                      offTime
                    ) {
                      offDays.forEach((day) => {
                        slots.push({
                          skillId: request.offeredSkillId,
                          dayOfWeek: parseInt(day),
                          startTime: offTime,
                        });
                      });
                    }
                    const body = {
                      requestedSkillSessions: parseInt(reqSessions) || 1,
                      requestedSkillDuration: parseInt(reqDuration) || 60,
                      offeredSkillSessions: parseInt(offSessions) || 0,
                      offeredSkillDuration: parseInt(offDuration) || 0,
                      pointsProposal: pts,
                      pointsPayerId:
                        pts > 0
                          ? counterPayerIsMe
                            ? currentUserId
                            : otherUser?.id
                          : null,
                      slots,
                    };
                    await msgQ.mutateAsync({
                      requestId: id!,
                      messageKey: "PROPOSE_TERMS",
                      ...body,
                    } as any);
                    toast.toast({ title: "Proposal sent", variant: "success" });
                    setReqDays([]);
                    setReqTime("");
                    setOffDays([]);
                    setOffTime("");
                    await q.refetch();
                  } catch (e: any) {
                    toast.toast({
                      title: "Failed to propose",
                      description: e?.message ?? "Try again",
                      variant: "error",
                    });
                  } finally {
                    setProposing(false);
                  }
                }}
                onAccept={() => setConfirmAccept(true)}
                acceptLoading={acceptQ.isPending}
                amIAgreed={
                  isSender ? !!request?.senderAgreed : !!request?.receiverAgreed
                }
                balance={balance}
              />
            )}

            {/* CTA strip */}
            {!loading && request ? (
              <ActionStrip
                status={request.status}
                isCommitted={isCommitted}
                exchangeId={request.exchange?.id}
                onAccept={() => setConfirmAccept(true)}
                onReject={() => setConfirmReject(true)}
                onCancel={() => setConfirmCancel(true)}
                acceptLoading={acceptQ.isPending}
                onGoToExchange={() =>
                  router.push(`/exchanges/${request.exchange?.id}` as any)
                }
              />
            ) : null}
          </View>
        </ScrollView>
      </ThemedView>

      <ActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Request actions"
        options={[
          {
            label: "View partner profile",
            icon: <User size={18} color={theme.foreground} />,
            onPress: () =>
              otherUser?.id && router.push(`/users/${otherUser.id}` as any),
          },
          {
            label: "Report issue",
            icon: <AlertTriangle size={18} color={theme.destructive as any} />,
            subtitle: "Flag this request with support",
            onPress: () =>
              toast.toast({
                title: "Report sent",
                description: "Support will reach out shortly.",
                variant: "info",
              }),
          },
        ]}
      />

      <AlertDialog
        open={confirmAccept}
        onOpenChange={setConfirmAccept}
        title={
          hasInsufficientPointsToAccept
            ? "Insufficient points balance"
            : "Accept this exchange request?"
        }
        description={
          hasInsufficientPointsToAccept
            ? `You need ${request?.pointsProposal ?? 0} points to accept (balance: ${balance}). Purchase points first, or propose the other user pays.`
            : "You will be bound by the proposed schedule & terms. This will create an active exchange."
        }
        confirmLabel={
          hasInsufficientPointsToAccept ? "Go to points" : "Accept request"
        }
        onConfirm={async () => {
          if (hasInsufficientPointsToAccept) {
            router.push("/(tabs)/points" as any);
            return;
          }
          try {
            await acceptQ.mutateAsync(id!);
            toast.toast({ title: "Request accepted", variant: "success" });
            await q.refetch();
            await balanceQ.refetch();
          } catch (e: any) {
            toast.toast({
              title: "Could not accept",
              description: e?.message ?? "Try again",
              variant: "error",
            });
          }
        }}
      />

      <AlertDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this request?"
        description="This cannot be undone."
        confirmLabel="Reject"
        destructive
        onConfirm={async () => {
          try {
            await rejectQ.mutateAsync(id!);
            toast.toast({ title: "Request rejected", variant: "info" });
            router.back();
          } catch (e: any) {
            toast.toast({ title: "Could not reject", variant: "error" });
          }
        }}
      />

      <AlertDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel your request?"
        description="The other user will be notified."
        confirmLabel="Cancel request"
        destructive
        onConfirm={async () => {
          try {
            await cancelQ.mutateAsync(id!);
            toast.toast({ title: "Request cancelled", variant: "info" });
            router.back();
          } catch (e: any) {
            toast.toast({ title: "Could not cancel", variant: "error" });
          }
        }}
      />
    </SafeAreaView>
  );
}

/* ---------- Header ---------- */

function HeaderCard({
  loading,
  request,
  otherUser,
  isSender,
  statusColor,
  onActions,
}: {
  loading: boolean;
  request: any;
  otherUser: any;
  isSender: boolean;
  statusColor: string;
  onActions: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Card>
      <CardContent style={{ paddingTop: SPACING[5], gap: SPACING[4] }}>
        {loading ? (
          <SkeletonText lines={5} />
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Badge variant="accent" accent={statusColor}>
                {labelForRequestStatus(request.status)}
              </Badge>
              <Pressable
                hitSlop={10}
                onPress={onActions}
                style={{ padding: SPACING[2] }}
              >
                <MoreHorizontal size={18} color={theme.mutedForeground} />
              </Pressable>
            </View>

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
                size={56}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <ThemedText
                  type="title"
                  style={{ fontSize: FONT_SIZE.xl, fontWeight: '600' }}
                >
                  {otherUser?.name ?? "Peer"}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color: theme.mutedForeground,
                    fontSize: FONT_SIZE.sm,
                  }}
                >
                  {isSender ? "Your request to them" : "Request they sent you"}
                </ThemedText>
              </View>
            </Pressable>

            <View style={{ gap: SPACING[2] }}>
              <SkillRow
                accent="blue"
                icon={<BookOpen size={16} color={getAccent("blue").main} />}
                title="You want to learn"
                name={
                  (isSender
                    ? request.requestedSkill?.name
                    : request.offeredSkill?.name) ?? "—"
                }
              />
              {request.offeredSkill ? (
                <SkillRow
                  accent="emerald"
                  icon={
                    <GraduationCap
                      size={16}
                      color={getAccent("emerald").main}
                    />
                  }
                  title="You offer in return"
                  name={
                    (isSender
                      ? request.offeredSkill?.name
                      : request.requestedSkill?.name) ?? "—"
                  }
                />
              ) : null}
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
                Requested {formatDateTimeShort(request.createdAt)}
              </ThemedText>
            </View>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SkillRow({
  accent,
  icon,
  title,
  name,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  name?: string;
}) {
  const theme = useTheme();
  const palette = getAccent(accent);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING[3],
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: RADIUS.md,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText
          type="small"
          style={{
            fontSize: 11,
            color: palette.main,
            textTransform: "uppercase" as const,
          }}
        >
          {title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {name ?? "—"}
        </ThemedText>
      </View>
    </View>
  );
}

/* ---------- Messages ---------- */

function MessagesBody({
  loading,
  request,
  currentUserId,
  otherUser,
  isPending,
  onQuickReply,
  sending,
}: {
  loading: boolean;
  request: any;
  currentUserId?: string;
  otherUser: any;
  isPending: boolean;
  onQuickReply: (key: string) => Promise<void>;
  sending: boolean;
}) {
  const theme = useTheme();
  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={8} />
        </CardContent>
      </Card>
    );
  const messages = request?.messages ?? [];
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader
        style={{
          paddingBottom: SPACING[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border as any,
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
              backgroundColor: getAccent("indigo").bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageSquare size={18} color={getAccent("indigo").main} />
          </View>
          <View style={{ flex: 1 }}>
            <CardTitle>Negotiation chat</CardTitle>
            <CardDescription>Proposals and quick replies</CardDescription>
          </View>
        </View>
      </CardHeader>
      <CardContent style={{ gap: SPACING[3], maxHeight: 520 }}>
        <ScrollView
          nestedScrollEnabled
          style={{ maxHeight: 400, marginHorizontal: -SPACING[2] }}
          contentContainerStyle={{
            paddingHorizontal: SPACING[2],
            gap: SPACING[3],
          }}
        >
          {messages.length === 0 ? (
            <View
              style={{
                padding: SPACING[4],
                alignItems: "center",
                gap: SPACING[2],
              }}
            >
              <MessageSquare size={24} color={theme.mutedForeground} />
              <ThemedText
                type="small"
                style={{ color: theme.mutedForeground, textAlign: "center" }}
              >
                No messages yet. Use the Terms tab to propose times, or send a
                quick reply.
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
                        maxWidth: "85%",
                        padding: SPACING[3],
                        borderRadius: RADIUS.md,
                        borderTopRightRadius: isMe ? 4 : RADIUS.md,
                        borderTopLeftRadius: isMe ? RADIUS.md : 4,
                        backgroundColor: isMe
                          ? theme.primary
                          : theme.backgroundElement,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: theme.border,
                        gap: 4,
                      }}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{
                          fontSize: 10,
                          opacity: 0.7,
                          color: isMe ? "#fff" : theme.mutedForeground,
                        }}
                      >
                        {isMe ? "You" : (otherUser?.name ?? "Peer")}
                      </ThemedText>
                      {msg.messageKey === "PROPOSE_TERMS" ? (
                        <View style={{ gap: SPACING[2] }}>
                          <ThemedText
                            type="small"
                            style={{
                              color: isMe ? "#fff" : theme.foreground,
                              fontSize: FONT_SIZE.sm,
                              fontWeight: "600",
                            }}
                          >
                            Proposed new terms
                          </ThemedText>
                          <View
                            style={{
                              padding: SPACING[2],
                              borderRadius: RADIUS.sm,
                              backgroundColor: isMe
                                ? "rgba(255,255,255,0.12)"
                                : getAccent("indigo").bg,
                              gap: 4,
                            }}
                          >
                            <MiniRow
                              label={request.requestedSkill?.name}
                              value={`${msg.requestedSkillSessions || 1}x ${msg.requestedSkillDuration || 60}m`}
                              isMe={isMe}
                            />
                            {(msg.offeredSkillSessions ?? 0) > 0 &&
                            request.offeredSkill ? (
                              <MiniRow
                                label={request.offeredSkill?.name}
                                value={`${msg.offeredSkillSessions || 1}x ${msg.offeredSkillDuration || 60}m`}
                                isMe={isMe}
                              />
                            ) : null}
                            {(msg.pointsProposal ?? 0) > 0 ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  marginTop: 2,
                                }}
                              >
                                <Coins
                                  size={12}
                                  color={getAccent("amber").main}
                                />
                                <ThemedText
                                  type="smallBold"
                                  style={{
                                    color: isMe
                                      ? "#fff"
                                      : getAccent("amber").main,
                                    fontSize: FONT_SIZE.sm,
                                  }}
                                >
                                  {msg.pointsProposal} pts
                                  {msg.pointsPayerId === currentUserId
                                    ? " (you pay)"
                                    : msg.pointsPayerId
                                      ? " (they pay)"
                                      : ""}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <ThemedText
                          type="small"
                          style={{
                            color: isMe ? "#fff" : theme.foreground,
                            fontSize: FONT_SIZE.sm,
                          }}
                        >
                          {translateQuickReply(msg.messageKey)}
                        </ThemedText>
                      )}
                      <ThemedText
                        type="small"
                        style={{
                          fontSize: 10,
                          opacity: 0.6,
                          color: isMe ? "#fff" : theme.mutedForeground,
                          marginTop: 2,
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
              style={{ fontSize: 11, color: theme.mutedForeground }}
            >
              QUICK REPLIES
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
                >
                  {r.label}
                </Button>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: SPACING[3] }}>
            <Badge variant="accent" accent="green">
              {isPending ? "Negotiating" : "Request finalized"}
            </Badge>
            <ThemedText
              type="small"
              style={{
                color: theme.mutedForeground,
                fontSize: FONT_SIZE.sm,
                marginTop: SPACING[1],
              }}
            >
              {isPending ? "" : "Chat is locked"}
            </ThemedText>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function MiniRow({
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
        gap: SPACING[4],
      }}
    >
      <ThemedText
        type="small"
        style={{
          color: isMe ? "rgba(255,255,255,0.8)" : theme.mutedForeground,
          fontSize: 11,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={{ color: isMe ? "#fff" : theme.foreground, fontSize: 11 }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/* ---------- Terms ---------- */

function TermsBody({
  loading,
  request,
  currentUserId,
  otherUser,
  isPending,
  isSender,
  counterPointsNum,
  counterPayerIsMe,
  hasInsufficientPointsToAccept,
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
  availDays,
  setAvailDays,
  availTimes,
  setAvailTimes,
  onPropose,
  onAccept,
  acceptLoading,
  amIAgreed,
  balance,
  proposing,
}: any) {
  const theme = useTheme();
  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={8} />
        </CardContent>
      </Card>
    );

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

  const otherAvail = isSender
    ? request.receiverAvailability
    : request.senderAvailability;
  const pointsBreakdown =
    counterPointsNum > 0 ? calculatePointsBreakdown(counterPointsNum) : null;

  return (
    <View style={{ gap: SPACING[4] }}>
      {/* Availability */}
      <Card>
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
                backgroundColor: getAccent("violet").bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays size={18} color={getAccent("violet").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Share when you're usually free</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          {otherAvail &&
          ((otherAvail.days?.length ?? 0) > 0 ||
            (otherAvail.timeSlots?.length ?? 0) > 0) ? (
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent("blue").bg,
                borderWidth: 1,
                borderColor: getAccent("blue").border,
                gap: SPACING[1],
              }}
            >
              <ThemedText
                type="smallBold"
                style={{
                  fontSize: 11,
                  color: getAccent("blue").main,
                  textTransform: "uppercase" as const,
                }}
              >
                {otherUser?.name ?? "Their"} availability
              </ThemedText>
              <ThemedText type="small" style={{ fontSize: FONT_SIZE.sm }}>
                Days:{" "}
                {otherAvail.days
                  ?.map((d: number) => DAY_NAMES_LONG[d])
                  .join(", ") || "Any"}
              </ThemedText>
              <ThemedText type="small" style={{ fontSize: FONT_SIZE.sm }}>
                Times: {otherAvail.timeSlots?.join(", ") || "Any"}
              </ThemedText>
            </View>
          ) : null}

          {isPending ? (
            <View style={{ gap: SPACING[3] }}>
              <View style={{ gap: SPACING[2] }}>
                <Label label="My free days" />
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
                <Label label="My free times" />
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: SPACING[1.5],
                  }}
                >
                  {TIME_SLOTS.map(({ val, label, Icon }) => {
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
                            color={selected ? "#fff" : theme.mutedForeground}
                          />
                          <ThemedText type="smallBold" style={{ fontSize: 11 }}>
                            {label}
                          </ThemedText>
                        </Pressable>
                      </Badge>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
        </CardContent>
      </Card>

      {/* Current agreement */}
      <Card>
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
              <Handshake size={18} color={getAccent("indigo").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Current agreement</CardTitle>
              <CardDescription>Latest proposal on the table</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3] }}>
          <View style={{ gap: SPACING[2] }}>
            <AgreementRow
              name={request.sender?.name ?? "Sender"}
              agreed={!!request.senderAgreed}
              isMe={request.senderId === currentUserId}
            />
            <AgreementRow
              name={request.receiver?.name ?? "Receiver"}
              agreed={!!request.receiverAgreed}
              isMe={request.receiverId === currentUserId}
            />
          </View>

          {request.proposedSlots?.length > 0 ? (
            <View
              style={{
                gap: SPACING[2],
                paddingTop: SPACING[2],
                borderTopWidth: 1,
                borderTopColor: theme.border as any,
              }}
            >
              <ThemedText
                type="smallBold"
                style={{
                  fontSize: 11,
                  color: theme.mutedForeground,
                  textTransform: "uppercase" as const,
                }}
              >
                Proposed slots
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
                        padding: SPACING[2],
                        borderRadius: RADIUS.sm,
                        borderWidth: 1,
                        borderColor: isAccepted
                          ? getAccent("emerald").border
                          : theme.border,
                        backgroundColor: isAccepted
                          ? getAccent("emerald").bg
                          : theme.background,
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
                          style={{ fontSize: FONT_SIZE.sm }}
                        >
                          {skillName}
                        </ThemedText>
                        <Badge
                          variant="accent"
                          accent={isAccepted ? "green" : "amber"}
                        >
                          {isAccepted ? "Accepted" : "Pending"}
                        </Badge>
                      </View>
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.mutedForeground,
                          fontSize: FONT_SIZE.sm,
                        }}
                      >
                        {DAY_NAMES_LONG[slot.dayOfWeek]} at {slot.startTime} ·
                        Proposed by{" "}
                        {isMe ? "you" : (slot.proposer?.name ?? "peer")}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </CardContent>
      </Card>

      {/* Propose new terms */}
      {isPending ? (
        <Card>
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
                  backgroundColor: getAccent("blue").bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarCheck size={18} color={getAccent("blue").main} />
              </View>
              <View style={{ flex: 1 }}>
                <CardTitle>Propose new terms</CardTitle>
                <CardDescription>
                  Set sessions, schedule, and points
                </CardDescription>
              </View>
            </View>
          </CardHeader>
          <CardContent style={{ gap: SPACING[4] }}>
            <SkillTermEditor
              label={`${request.requestedSkill?.name ?? "Requested"} (want to learn)`}
              accent="blue"
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
            {request.offeredSkill ? (
              <SkillTermEditor
                label={`${request.offeredSkill?.name ?? "Offered"} (I'll teach)`}
                accent="emerald"
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

            <View style={{ gap: SPACING[2] }}>
              <Label label="Points (optional)" />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING[2],
                }}
              >
                <Coins size={16} color={getAccent("amber").main} />
                <Input
                  value={counterPoints}
                  onChangeText={setCounterPoints}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>
              {counterPointsNum > 0 ? (
                <View style={{ gap: SPACING[2] }}>
                  <View style={{ flexDirection: "row", gap: SPACING[2] }}>
                    <Pressable
                      onPress={() => setCounterPayerIsMe(true)}
                      style={{
                        flex: 1,
                        padding: SPACING[2],
                        borderRadius: RADIUS.sm,
                        borderWidth: 1,
                        borderColor: counterPayerIsMe
                          ? theme.primary
                          : theme.border,
                        backgroundColor: counterPayerIsMe
                          ? getAccent("indigo").bg
                          : theme.background,
                        alignItems: "center",
                      }}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ fontSize: FONT_SIZE.sm }}
                      >
                        I pay
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setCounterPayerIsMe(false)}
                      style={{
                        flex: 1,
                        padding: SPACING[2],
                        borderRadius: RADIUS.sm,
                        borderWidth: 1,
                        borderColor: !counterPayerIsMe
                          ? theme.primary
                          : theme.border,
                        backgroundColor: !counterPayerIsMe
                          ? getAccent("indigo").bg
                          : theme.background,
                        alignItems: "center",
                      }}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ fontSize: FONT_SIZE.sm }}
                      >
                        They pay
                      </ThemedText>
                    </Pressable>
                  </View>
                  {pointsBreakdown ? (
                    <View
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.sm,
                        backgroundColor: theme.backgroundElement,
                        gap: 4,
                      }}
                    >
                      <Row
                        label="Gross"
                        value={`${pointsBreakdown.gross} pts`}
                      />
                      <Row
                        label="Platform fee (10%)"
                        value={`-${pointsBreakdown.fee} pts`}
                        dim
                      />
                      <Separator />
                      <Row
                        label={counterPayerIsMe ? "You pay" : "You receive net"}
                        value={`${counterPayerIsMe ? pointsBreakdown.gross : pointsBreakdown.net} pts`}
                        strong
                        accent={counterPayerIsMe ? "red" : "green"}
                      />
                      {counterPayerIsMe && balance < pointsBreakdown.gross ? (
                        <ThemedText
                          type="small"
                          style={{
                            fontSize: 11,
                            color: theme.destructive,
                            marginTop: SPACING[1],
                          }}
                        >
                          Balance too low ({balance} pts available)
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={{ gap: SPACING[2] }}>
              <Button
                loading={proposing}
                leftIcon={<Sparkles size={16} color="#fff" />}
                onPress={onPropose}
                style={{ width: "100%" }}
              >
                Send proposal
              </Button>
              {!amIAgreed && (
                <Button
                  variant="outline"
                  onPress={onAccept}
                  disabled={acceptLoading}
                  leftIcon={
                    acceptLoading ? undefined : (
                      <CheckCircle2 size={16} color={getAccent("green").main} />
                    )
                  }
                  style={{
                    width: "100%",
                    backgroundColor: getAccent("green").bg,
                    borderColor: getAccent("green").border,
                  }}
                >
                  {acceptLoading ? "Accepting…" : "Accept current terms"}
                </Button>
              )}
              {hasInsufficientPointsToAccept && counterPointsNum === 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[2],
                    padding: SPACING[2],
                    borderRadius: RADIUS.sm,
                    backgroundColor: getAccent("red").bg,
                    borderWidth: 1,
                    borderColor: getAccent("red").border,
                  }}
                >
                  <Info size={14} color={getAccent("red").main} />
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: 11,
                      color: getAccent("red").main,
                      flex: 1,
                    }}
                  >
                    Insufficient points to accept ({balance} available)
                  </ThemedText>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      ) : null}
    </View>
  );
}

function SkillTermEditor({
  label,
  accent,
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
  const palette = getAccent(accent);
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
  return (
    <View
      style={{
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        gap: SPACING[3],
      }}
    >
      <ThemedText
        type="smallBold"
        style={{
          fontSize: 12,
          color: palette.main,
          textTransform: "uppercase" as const,
        }}
      >
        {label}
      </ThemedText>
      <View style={{ flexDirection: "row", gap: SPACING[2] }}>
        <View style={{ flex: 1 }}>
          <Label label="Sessions" />
          <Input
            value={sessions}
            onChangeText={setSessions}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Label label="Minutes each" />
          <Input
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="60"
          />
        </View>
      </View>
      <View style={{ gap: SPACING[1] }}>
        <Label label="Days" />
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[1] }}
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
      <View>
        <Label label="Start time" />
        <Input value={time} onChangeText={setTime} placeholder="e.g. 18:00" />
      </View>
    </View>
  );
}

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
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <ThemedText type="small" style={{ fontSize: FONT_SIZE.md }}>
        {name}{" "}
        {isMe && (
          <ThemedText type="small" style={{ color: theme.mutedForeground }}>
            (you)
          </ThemedText>
        )}
      </ThemedText>
      <Badge variant="accent" accent={agreed ? "green" : "amber"}>
        {agreed ? "Accepted" : "Pending"}
      </Badge>
    </View>
  );
}

function Row({ label, value, dim, strong, accent }: any) {
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
          color: dim ? theme.mutedForeground : theme.foreground,
          fontSize: FONT_SIZE.sm,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? "default" : "small"}
        style={{
          color: accent ? getAccent(accent).main : theme.foreground,
          fontSize: FONT_SIZE.sm,
          fontWeight: strong ? "800" : "500",
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/* ---------- Action Strip ---------- */

function ActionStrip({
  status,
  isCommitted,
  exchangeId,
  onAccept,
  onReject,
  onCancel,
  acceptLoading,
  onGoToExchange,
}: any) {
  const theme = useTheme();
  if (isCommitted && exchangeId) {
    return (
      <Card style={{ borderColor: getAccent("green").border }}>
        <CardContent style={{ gap: SPACING[3] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[2],
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.md,
                backgroundColor: getAccent("green").bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} color={getAccent("green").main} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="default" style={{ fontWeight: '600' }}>
                Exchange is live!
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}
              >
                Negotiation complete — proceed to your exchange room.
              </ThemedText>
            </View>
          </View>
          <Button
            leftIcon={<ArrowRight size={16} color="#fff" />}
            onPress={onGoToExchange}
          >
            Go to exchange room
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (status === "PENDING") {
    const isIncomingForMe = false; // handled via caller passed functions
    return (
      <Card>
        <CardContent style={{ gap: SPACING[3] }}>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            {onAccept ? (
              <Button
                style={{ flex: 1 }}
                onPress={onAccept}
                loading={acceptLoading}
                leftIcon={<CheckCircle2 size={16} color="#fff" />}
              >
                Accept
              </Button>
            ) : null}
            {onReject ? (
              <Button
                style={{ flex: 1 }}
                variant="destructive"
                onPress={onReject}
                leftIcon={<XCircle size={16} color="#fff" />}
              >
                Reject
              </Button>
            ) : null}
            {onCancel ? (
              <Button
                style={{ flex: 1 }}
                variant="outline"
                onPress={onCancel}
                leftIcon={<Ban size={16} color={theme.foreground} />}
              >
                Cancel
              </Button>
            ) : null}
          </View>
        </CardContent>
      </Card>
    );
  }
  return null;
}

/* ---------- helpers ---------- */

function labelForRequestStatus(s: string) {
  switch (s) {
    case "PENDING":
      return "Pending";
    case "COMMITTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return s.replace(/_/g, " ");
  }
}

function translateQuickReply(k: string) {
  switch (k) {
    case "AVAILABLE_WEEKDAYS":
      return "I'm available on weekdays.";
    case "AVAILABLE_WEEKENDS":
      return "I'm available on weekends.";
    case "NEED_MORE_TIME":
      return "I need a little more time — checking my schedule.";
    case "REQUEST_RESCHEDULE":
      return "Let's try rescheduling — those times don't work for me.";
    default:
      return k.replace(/_/g, " ");
  }
}

function formatTimeShort(dateStr: string | Date) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
