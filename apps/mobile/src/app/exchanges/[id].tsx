import React, { useRef, useEffect } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
  StyleSheet,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as v from "valibot";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { StorageAccessFramework, readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView, isPictureInPictureSupported } from "expo-video";
import { Image as ExpoImage } from "expo-image";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  GraduationCap,
  HandCoins,
  Handshake,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Play,
  Send,
  ShieldCheck,
  Star,
  User,
  Video,
  X,
  XCircle,
  Zap,
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
  Progress,
  Separator,
  SkeletonText,
  Tabs,
  Textarea,
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
  useCreateReview,
  useCurrentUser,
  useExchangeById,
  useExchangeChatMessages,
  useExchangeChatUploadUrl,
  useMarkExchangeComplete,
  useMarkSessionChatRead,
  useRecordingPlayback,
  useSendExchangeChatMessage,
  useSessionChatMessages,
  useUpdateSessionStatus,
} from "@/lib/api-hooks";
import {
  calculateExchangeProgress,
  calculatePointsBreakdown,
  CreateReviewSchema,
  formatDateShort,
  formatDateTimeShort,
  getExchangeStatusColor,
} from "@skil-ex2/shared";
import { ReviewCard } from "../(tabs)/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from 'expo/fetch'
import { useEvent } from "expo";

type Tab = "overview" | "sessions" | "chat" | "details" | "review";
type SessionFilter = "all" | "taught" | "received";

function InAppVideoPlayer({ url }: { url: string }) {
  const videoViewRef = useRef<VideoView>(null);
  const isPiPSupported = isPictureInPictureSupported();
  const fullscreenIntervalRef = useRef<NodeJS.Timeout>(null);
  
  
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.preservesPitch = true;
    p.staysActiveInBackground = true;
    p.play();
  });

  const handleStartPiP = async () => {
    try {
      if (videoViewRef.current) {
        await videoViewRef.current.startPictureInPicture();
      }
    } catch (e) {
      console.warn('[PiP] Could not start PiP:', e);
    }
  };

  return (
    <View style={{ gap: SPACING[2] }}>
      <VideoView
        ref={videoViewRef}
        style={styles.video}
        player={player}
        fullscreenOptions={{ enable: true, orientation: 'landscape', autoExitOnRotate: true }}
        allowsPictureInPicture
        startsPictureInPictureAutomatically
      />
      {isPiPSupported ? (
        <Pressable
          onPress={handleStartPiP}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: RADIUS.pill,
            backgroundColor: 'rgba(24, 24, 27, 0.8)',
            borderWidth: 1,
            borderColor: '#27272a',
          }}
        >
          <ExternalLink size={14} color="#a1a1aa" />
          <ThemedText type="smallBold" style={{ fontSize: 11, color: '#a1a1aa' }}>
            Picture in Picture
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ExchangeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const q = useExchangeById(id!);
  const completeQ = useMarkExchangeComplete();
  const reviewQ = useCreateReview();
  const updateSessionStatusQ = useUpdateSessionStatus();
  const recordingPlaybackQ = useRecordingPlayback();
  const currentUserQ = useCurrentUser();
  const currentUser = currentUserQ.data as any;

  // Modals & Sheets
  const [playbackUrl, setPlaybackUrl] = React.useState<string | null>(null);
  const [sessionChatOpen, setSessionChatOpen] = React.useState(false);
  const [sessionChatTitle, setSessionChatTitle] = React.useState("Session Chat History");
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const sessionChatQ = useSessionChatMessages(activeSessionId ?? "", {
    enabled: !!activeSessionId,
  });
  const markSessionChatReadQ = useMarkSessionChatRead();

  const [pointsModalOpen, setPointsModalOpen] = React.useState(false);

  const [tab, setTab] = React.useState<Tab>("overview");
  const [sessionFilter, setSessionFilter] = React.useState<SessionFilter>("all");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [confirmComplete, setConfirmComplete] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // Review states
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagSheet, setTagSheet] = React.useState(false);

  const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
    try {
      await updateSessionStatusQ.mutateAsync({
        exchangeId: id!,
        sessionId,
        status,
      });
      toast.toast({ title: `Session marked as ${status.toLowerCase()}`, variant: "success" });
      q.refetch();
    } catch {
      toast.toast({ title: "Failed to update session status", variant: "error" });
    }
  };

  const handleWatchRecording = async (recordingId: string) => {
    try {
      const data = await recordingPlaybackQ.mutateAsync(recordingId);
      if (data?.url) {
        setPlaybackUrl(data.url);
      }
    } catch {
      toast.toast({ title: "Failed to load recording", variant: "error" });
    }
  };

  // Open READ-ONLY Session Chat History using React Query hooks
  const handleViewSessionChat = (sessionId: string, skillName?: string) => {
    setSessionChatTitle(skillName ? `Session Chat (${skillName})` : "Session Chat History");
    setActiveSessionId(sessionId);
    setSessionChatOpen(true);
    markSessionChatReadQ.mutate(sessionId);
  };

  const exchange = q.data as any;
  const loading = q.isLoading;
  const statusColor = getExchangeStatusColor(exchange?.status);
  const progress = exchange ? calculateExchangeProgress(exchange) : 0;

  const isSender = exchange?.senderId === currentUser?.id;
  const other = isSender ? (exchange?.receiver ?? exchange?.otherUser) : (exchange?.sender ?? exchange?.otherUser);
  const partnerCompleted = isSender ? exchange?.receiverCompleted : exchange?.senderCompleted;
  const iAmCompleted = isSender ? exchange?.senderCompleted : exchange?.receiverCompleted;

  const pointsVal = exchange?.pointsAmount ?? exchange?.pointsValue ?? 0;
  const isPayer = exchange?.pointsPayerId ? exchange.pointsPayerId === currentUser?.id : isSender;
  const points = pointsVal > 0 ? calculatePointsBreakdown(pointsVal) : null;
  const displayPoints = points ? (isPayer ? points.gross : points.net) : 0;

  const sessions = exchange?.sessions ?? [];
  const taughtSkill = exchange?.taughtSkill ?? { name: exchange?.taughtSkillName ?? "Skill" };
  const receivedSkill = exchange?.receivedSkill ?? (exchange?.receivedSkillName ? { name: exchange.receivedSkillName } : null);
  const isTwoWay = !!receivedSkill;

  const taughtSessions = sessions.filter((s: any) => s.skillId === exchange?.taughtSkillId);
  const receivedSessions = isTwoWay ? sessions.filter((s: any) => s.skillId !== exchange?.taughtSkillId) : [];

  const totalSessionsCount = (exchange?.requestedSkillSessions ?? 0) + (isTwoWay ? (exchange?.offeredSkillSessions ?? 0) : 0);
  const completedSessionsCount = sessions.filter((s: any) => s.status === "COMPLETED").length;

  const canComplete = exchange?.status === "IN_PROGRESS" || exchange?.status === "ACCEPTED" || exchange?.status === "SCHEDULED" || exchange?.status === "COMMITTED";
  const canReview = exchange?.status === "COMPLETED" && !exchange?.myReview;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["bottom"]}>
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
            borderBottomColor: theme.border + "40",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.md,
              backgroundColor: theme.secondary,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            <ArrowLeft size={18} color={theme.foreground} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center", paddingHorizontal: SPACING[2] }}>
            <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: FONT_SIZE.md }}>
              {taughtSkill.name} {isTwoWay ? `↔ ${receivedSkill?.name}` : ""}
            </ThemedText>
            <ThemedText type="caption" muted numberOfLines={1} style={{ fontSize: FONT_SIZE.xs }}>
              with {other?.name ?? "Peer Trader"}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => setSheetOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.md,
              backgroundColor: theme.secondary,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            <MoreHorizontal size={18} color={theme.foreground} />
          </Pressable>
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
                setRefreshing(false);
              }}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          style={{ width: "100%" }}
        >
          <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: SPACING[4], paddingTop: SPACING[3] }}>
            {/* Top User & Skills Hero Card */}
            <Card style={{ backgroundColor: theme.card }}>
              <CardContent style={{ paddingTop: SPACING[4], gap: SPACING[3] }}>
                {loading ? (
                  <SkeletonText lines={4} />
                ) : (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Pressable
                        onPress={() => other?.id && router.push(`/users/${other.id}` as any)}
                        style={{ flexDirection: "row", alignItems: "center", gap: SPACING[3], flex: 1 }}
                      >
                        <Avatar uri={other?.image} fallback={other?.name} size={48} />
                        <View style={{ flex: 1 }}>
                          <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}>
                            {other?.name ?? "Peer Trader"}
                          </ThemedText>
                          <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
                            {isSender ? "Learning from" : "Teaching"} • {totalSessionsCount} session{totalSessionsCount !== 1 ? "s" : ""}
                          </ThemedText>
                        </View>
                      </Pressable>

                      <Badge variant="accent" accent={statusColor}>
                        {labelForStatus(exchange?.status)}
                      </Badge>
                    </View>

                    {/* Skill Cards Row */}
                    <View style={{ gap: SPACING[2] }}>
                      <SkillRow
                        accent="emerald"
                        icon={<GraduationCap size={16} color={getAccent("emerald").main} />}
                        title={isSender ? "You learn" : "You teach"}
                        name={taughtSkill.name}
                        detail={`${exchange?.requestedSkillSessions ?? 1} sessions × ${exchange?.requestedSkillDuration ?? 60}m`}
                      />
                      {isTwoWay ? (
                        <SkillRow
                          accent="indigo"
                          icon={<BookOpen size={16} color={getAccent("indigo").main} />}
                          title={isSender ? "You teach" : "You learn"}
                          name={receivedSkill?.name}
                          detail={`${exchange?.offeredSkillSessions ?? 1} sessions × ${exchange?.offeredSkillDuration ?? 60}m`}
                        />
                      ) : null}
                    </View>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3 Summary Cards Grid */}
            {!loading && (
              <View style={{ gap: SPACING[3] }}>
                {/* 1. Progress Card */}
                <Card>
                  <CardHeader style={{ paddingBottom: 0 }}>
                    <CardTitle style={{ fontSize: FONT_SIZE.sm, color: theme.mutedForeground }}>
                      Exchange Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent style={{ gap: SPACING[2] }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                      <ThemedText type="title" style={{ fontSize: FONT_SIZE["2xl"], fontWeight: "800", color: theme.primary }}>
                        {progress}%
                      </ThemedText>
                      <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
                        {completedSessionsCount} of {totalSessionsCount || sessions.length} sessions completed
                      </ThemedText>
                    </View>
                    <Progress value={progress} />
                  </CardContent>
                </Card>

                {/* 2. Points & Escrow Card */}
                <Card>
                  <CardHeader style={{ paddingBottom: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <CardTitle style={{ fontSize: FONT_SIZE.sm, color: theme.mutedForeground }}>
                        Points & Escrow
                      </CardTitle>
                      {points ? (
                        <Pressable
                          onPress={() => setPointsModalOpen(true)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                          hitSlop={8}
                        >
                          <Info size={14} color={theme.primary} />
                          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", fontSize: FONT_SIZE.xs }}>
                            Breakdown
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  </CardHeader>
                  <CardContent style={{ gap: SPACING[1.5] }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
                      <ThemedText type="title" style={{ fontSize: FONT_SIZE["2xl"], fontWeight: "800" }}>
                        {displayPoints}
                      </ThemedText>
                      <Coins size={22} color={getAccent("amber").main} />
                      {exchange?.escrowLocked ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingHorizontal: SPACING[2],
                            paddingVertical: 2,
                            borderRadius: RADIUS.sm,
                            backgroundColor: getAccent("amber").bg,
                            borderWidth: 1,
                            borderColor: getAccent("amber").border,
                            marginLeft: SPACING[2],
                          }}
                        >
                          <Lock size={10} color={getAccent("amber").main} />
                          <ThemedText type="caption" style={{ fontSize: 10, color: getAccent("amber").main, fontWeight: "700" }}>
                            Escrowed
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
                      {pointsVal === 0
                        ? "Direct skill exchange with zero points"
                        : isPayer
                          ? "Gross cost deducted upon completion"
                          : "Net gain credited upon completion (after 15% fee)"}
                    </ThemedText>
                  </CardContent>
                </Card>

                {/* 3. Completion Card */}
                <Card>
                  <CardHeader style={{ paddingBottom: 0 }}>
                    <CardTitle style={{ fontSize: FONT_SIZE.sm, color: theme.mutedForeground }}>
                      Exchange Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent style={{ gap: SPACING[2.5] }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <ThemedText type="default" style={{ fontWeight: "700", fontSize: FONT_SIZE.md }}>
                        {exchange?.status === "COMPLETED"
                          ? "Exchange Completed 🎉"
                          : iAmCompleted
                            ? "Awaiting Partner Confirmation"
                            : "Exchange Active"}
                      </ThemedText>
                    </View>

                    {exchange?.status !== "COMPLETED" && partnerCompleted ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: SPACING[2],
                          padding: SPACING[2.5],
                          borderRadius: RADIUS.md,
                          backgroundColor: getAccent("emerald").bg,
                          borderWidth: 1,
                          borderColor: getAccent("emerald").border,
                        }}
                      >
                        <CheckCircle2 size={16} color={getAccent("emerald").main} />
                        <ThemedText type="caption" style={{ color: getAccent("emerald").main, fontSize: FONT_SIZE.xs, flex: 1, fontWeight: "600" }}>
                          {other?.name} has marked this exchange as complete.
                        </ThemedText>
                      </View>
                    ) : null}

                    {canComplete ? (
                      <Button
                        size="sm"
                        variant={iAmCompleted ? "outline" : "default"}
                        onPress={() => setConfirmComplete(true)}
                        loading={completeQ.isPending}
                        disabled={iAmCompleted}
                        leftIcon={<CheckCircle2 size={16} color={iAmCompleted ? theme.mutedForeground : "#fff"} />}
                      >
                        {iAmCompleted ? "Marked Complete" : "Mark Exchange Complete"}
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </View>
            )}

            {/* Navigation Tabs */}
            <Tabs<Tab>
              variant="underline"
              value={tab}
              onChange={setTab}
              items={[
                { value: "overview", label: "Overview" },
                { value: "sessions", label: "Sessions" },
                { value: "chat", label: "Chat" },
                { value: "details", label: "Details" },
                { value: "review", label: "Review" },
              ]}
            />

            {/* Tab Contents */}
            {tab === "overview" && (
              <OverviewBody
                exchange={exchange}
                loading={loading}
                points={points}
                other={other}
              />
            )}

            {tab === "sessions" && (
              <SessionsBody
                sessions={sessions}
                taughtSessions={taughtSessions}
                receivedSessions={receivedSessions}
                taughtSkillName={taughtSkill.name}
                receivedSkillName={receivedSkill?.name}
                isTwoWay={isTwoWay}
                sessionFilter={sessionFilter}
                setSessionFilter={setSessionFilter}
                loading={loading}
                onJoin={(sid: string) => router.push(`/room/${sid}` as any)}
                exchangeId={id!}
                onUpdateStatus={handleUpdateSessionStatus}
                onWatchRecording={handleWatchRecording}
                onViewSessionChat={handleViewSessionChat}
                currentUserId={currentUser?.id}
                exchange={exchange}
              />
            )}

            {tab === "chat" && (
              <ExchangeChatBody exchangeId={id!} currentUserId={currentUser?.id} />
            )}

            {tab === "details" && (
              <DetailsBody
                exchange={exchange}
                currentUser={currentUser}
                otherUser={other}
                isSender={isSender}
                isTwoWay={isTwoWay}
                loading={loading}
              />
            )}

            {tab === "review" && (
              <ReviewBody
                exchange={exchange}
                canReview={canReview}
                loading={loading}
                onSubmit={async () => {
                  try {
                    const parsed = v.parse(CreateReviewSchema, {
                      exchangeId: id!,
                      forUserId: other?.id,
                      rating,
                      comment: comment || undefined,
                      tags: tags.length ? tags : undefined,
                    });
                    await reviewQ.mutateAsync(parsed);
                    toast.toast({ title: "Review submitted!", variant: "success" });
                    setComment("");
                    setTags([]);
                    await q.refetch();
                  } catch (e: any) {
                    if (e instanceof v.ValiError) {
                      toast.toast({
                        title: "Invalid review",
                        description: (e.issues[0] as any)?.message ?? "Please check inputs",
                        variant: "error",
                      });
                      return;
                    }
                    toast.toast({ title: "Could not submit review", variant: "error" });
                  }
                }}
                submitting={reviewQ.isPending}
                rating={rating}
                setRating={setRating}
                comment={comment}
                setComment={setComment}
                tags={tags}
                setTags={setTags}
                openTags={() => setTagSheet(true)}
              />
            )}
          </View>
        </ScrollView>
      </ThemedView>

      {/* Points Breakdown Modal */}
      <Modal
        visible={pointsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPointsModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: SPACING[5],
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              backgroundColor: theme.card,
              borderRadius: RADIUS.xl,
              padding: SPACING[5],
              gap: SPACING[4],
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
                <Coins size={20} color={getAccent("amber").main} />
                <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}>
                  Points Breakdown
                </ThemedText>
              </View>
              <Pressable onPress={() => setPointsModalOpen(false)} hitSlop={8}>
                <X size={18} color={theme.mutedForeground} />
              </Pressable>
            </View>

            {points ? (
              <View style={{ gap: SPACING[3] }}>
                <Row label="Gross Amount" value={`${points.gross} pts`} />
                <Row label="Platform Fee (15%)" value={`-${points.fee} pts`} dim />
                <Separator />
                <Row label="Net Gain" value={`${points.net} pts`} strong accent="emerald" main />
              </View>
            ) : (
              <ThemedText type="small" muted>No points details available.</ThemedText>
            )}

            <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs, lineHeight: 18 }}>
              Points are held safely in escrow during active sessions and released immediately when both trading partners mark the exchange as complete.
            </ThemedText>

            <Button size="sm" variant="default" onPress={() => setPointsModalOpen(false)}>
              Got it
            </Button>
          </View>
        </View>
      </Modal>

      {/* READ-ONLY Session Chat History Modal (as requested: NO text input!) */}
      <Modal
        visible={sessionChatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionChatOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              height: "75%",
              backgroundColor: theme.background,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              padding: SPACING[4],
              gap: SPACING[3],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
                <MessageSquare size={18} color={theme.primary} />
                <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.lg, fontWeight: "700" }}>
                  {sessionChatTitle}
                </ThemedText>
              </View>
              <Pressable onPress={() => setSessionChatOpen(false)} hitSlop={8}>
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>

            <Separator />

            {sessionChatQ.isLoading ? (
              <SkeletonText lines={5} />
            ) : !(sessionChatQ.data?.messages?.length ?? sessionChatQ.data?.length) ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING[2] }}>
                <MessageCircle size={32} color={theme.mutedForeground} />
                <ThemedText type="default" style={{ fontWeight: "700" }}>
                  No room chat messages logged
                </ThemedText>
                <ThemedText type="caption" muted style={{ textAlign: "center", maxWidth: 260 }}>
                  Messages sent inside the LiveKit video call room will appear here as history.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={(sessionChatQ.data as any)?.messages ?? (sessionChatQ.data as any) ?? []}
                keyExtractor={(m, idx) => m.id ?? String(idx)}
                contentContainerStyle={{ gap: SPACING[3] }}
                renderItem={({ item: m }) => {
                  const mine = m.senderId === currentUser?.id || m.sender?.id === currentUser?.id;
                  const timeStr = new Date(m.timestamp || m.createdAt || "").toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <View style={{ flexDirection: "row", gap: SPACING[2.5], alignItems: "flex-start" }}>
                      <Avatar uri={m.sender?.image} fallback={m.sender?.name} size={32} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
                          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.xs }}>
                            {mine ? "You" : m.sender?.name ?? "User"}
                          </ThemedText>
                          <ThemedText type="caption" muted style={{ fontSize: 10 }}>
                            {timeStr}
                          </ThemedText>
                        </View>
                        <View
                          style={{
                            padding: SPACING[3],
                            borderRadius: RADIUS.md,
                            backgroundColor: theme.secondary,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <ThemedText type="small" style={{ fontSize: FONT_SIZE.sm }}>
                            {m.message ?? m.content}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <Button size="sm" variant="outline" onPress={() => setSessionChatOpen(false)}>
              Close Chat History
            </Button>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Video Recording Playback Modal */}
      <Modal
        visible={!!playbackUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaybackUrl(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: SPACING[4] }}>
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: theme.card, borderRadius: RADIUS.xl, padding: SPACING[4], gap: SPACING[4] }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.lg }}>
                Session Recording Playback
              </ThemedText>
              <Pressable onPress={() => setPlaybackUrl(null)} hitSlop={8}>
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>

            {playbackUrl ? (
              <InAppVideoPlayer url={playbackUrl} />
            ) : null}

            <Button size="sm" variant="outline" onPress={() => setPlaybackUrl(null)}>
              Close
            </Button>
          </View>
        </View>
      </Modal>

      {/* Action Sheet */}
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Exchange Actions"
        options={[
          {
            label: "View partner profile",
            icon: <ArrowLeft size={18} color={theme.foreground} />,
            onPress: () => other?.id && router.push(`/users/${other.id}` as any),
          },
          {
            label: "Report issue",
            icon: <AlertTriangle size={18} color={theme.destructive as any} />,
            subtitle: "Flag this exchange with support",
            onPress: () =>
              toast.toast({
                title: "Report sent",
                description: "Support will reach out shortly.",
                variant: "info",
              }),
          },
        ]}
      />

      {/* Confirm Complete Dialog */}
      <AlertDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Mark exchange complete?"
        description="Both partners will be able to leave a review and points will be finalized."
        confirmLabel="Mark complete"
        onConfirm={async () => {
          await completeQ.mutateAsync(id!);
          toast.toast({ title: "Exchange completed", variant: "success" });
          await q.refetch();
        }}
      />

      {/* Quality Tag Selector Sheet */}
      <ActionSheet
        open={tagSheet}
        onClose={() => setTagSheet(false)}
        title="Review qualities"
        description="Select all that apply."
        options={(
          Object.keys(REVIEW_TAG_LABELS) as (keyof typeof REVIEW_TAG_LABELS)[]
        ).map((k) => {
          const active = tags.includes(k);
          return {
            label: REVIEW_TAG_LABELS[k],
            onPress: () => {
              setTags((prev) =>
                prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
              );
            },
            icon: active ? (
              <CheckCircle2 size={18} color={theme.primary} />
            ) : (
              <CheckCircle2 size={18} color={theme.mutedForeground} />
            ),
          };
        })}
      />
    </SafeAreaView>
  );
}

const REVIEW_TAG_LABELS = {
  GREAT_TEACHER: "Great teacher",
  PATIENT: "Patient",
  KNOWLEDGEABLE: "Knowledgeable",
  ON_TIME: "On time",
  CLEAR_EXPLANATIONS: "Clear explanations",
  GOOD_COMMUNICATOR: "Good communicator",
  WELL_PREPARED: "Well prepared",
  WOULD_EXCHANGE_AGAIN: "Would exchange again",
  NEEDS_IMPROVEMENT: "Needs improvement",
  UNRESPONSIVE: "Unresponsive",
};

function SkillRow({
  accent,
  icon,
  title,
  name,
  detail,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  name?: string;
  detail?: string;
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
          width: 36,
          height: 36,
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
            fontSize: 10,
            color: palette.main,
            textTransform: "uppercase",
            fontWeight: "700",
          }}
        >
          {title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {name ?? "—"}
        </ThemedText>
        {detail ? (
          <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/* ============================================================================
 * SESSIONS BODY (WITH SPLIT BY SKILL FEATURE & IMPROVED SESSION CARDS)
 * ========================================================================= */

function SessionsBody({
  sessions,
  taughtSessions,
  receivedSessions,
  taughtSkillName,
  receivedSkillName,
  isTwoWay,
  sessionFilter,
  setSessionFilter,
  loading,
  onJoin,
  onUpdateStatus,
  onWatchRecording,
  onViewSessionChat,
  currentUserId,
  exchange,
}: any) {
  const theme = useTheme();

  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={6} />
        </CardContent>
      </Card>
    );

  const displayedSessions =
    sessionFilter === "taught"
      ? taughtSessions
      : sessionFilter === "received"
        ? receivedSessions
        : sessions;

  return (
    <View style={{ gap: SPACING[4] }}>
      {/* Skill Split Filter Pills */}
      {isTwoWay && (
        <Tabs<SessionFilter>
          variant="pills"
          value={sessionFilter}
          onChange={setSessionFilter}
          items={[
            { value: "all", label: `All (${sessions?.length ?? 0})` },
            { value: "taught", label: `${taughtSkillName ?? 'Taught'} (${taughtSessions?.length ?? 0})` },
            { value: "received", label: `${receivedSkillName ?? 'Received'} (${receivedSessions?.length ?? 0})` },
          ]}
        />
      )}

      {displayedSessions.length === 0 ? (
        <Card>
          <CardContent
            style={{
              paddingVertical: SPACING[8],
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
              <CalendarClock size={26} color={getAccent("indigo").main} />
            </View>
            <ThemedText type="default" style={{ fontWeight: "700" }}>
              No sessions found
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: theme.mutedForeground,
                textAlign: "center",
                fontSize: FONT_SIZE.sm,
                maxWidth: 280,
              }}
            >
              Coordinate date and time with your partner in the Chat tab.
            </ThemedText>
          </CardContent>
        </Card>
      ) : (
        <View style={{ gap: SPACING[3] }}>
          {displayedSessions.map((s: any) => {
            const isLive = s.status === "LIVE";
            const isScheduled = s.status === "SCHEDULED";
            const isCompleted = s.status === "COMPLETED";
            const isMissed = s.status === "MISSED";
            const isCancelled = s.status === "CANCELLED";
            const isDone = isCompleted || isMissed || isCancelled;
            const recordings = s.recordings || [];

            // Derive teacher info
            const isTaughtSkill = s.skillId === exchange?.taughtSkillId;
            const teacherName = isTaughtSkill ? exchange?.receiver?.name : exchange?.sender?.name;
            const isCurrentUserTeacher = (isTaughtSkill ? exchange?.receiver?.id : exchange?.sender?.id) === currentUserId;

            const sessionDate = s.scheduledAt ?? s.startTime;
            const durationMinutes = s.duration ?? (isTaughtSkill ? exchange?.requestedSkillDuration : exchange?.offeredSkillDuration) ?? 60;

            return (
              <Card key={s.id} style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                <CardContent style={{ gap: SPACING[3.5], padding: SPACING[4] }}>
                  {/* Header Row */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: SPACING[2] }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[3], flex: 1 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: RADIUS.md,
                          backgroundColor: isLive
                            ? getAccent("red").bg
                            : isCompleted
                              ? getAccent("green").bg
                              : getAccent("indigo").bg,
                          borderWidth: 1,
                          borderColor: isLive
                            ? getAccent("red").border
                            : isCompleted
                              ? getAccent("green").border
                              : getAccent("indigo").border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Video
                          size={20}
                          color={
                            isLive
                              ? getAccent("red").main
                              : isCompleted
                                ? getAccent("green").main
                                : getAccent("indigo").main
                          }
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <ThemedText type="cardTitle" style={{ fontSize: FONT_SIZE.md, fontWeight: "700" }}>
                          {String(s.skill?.name ?? (isTaughtSkill ? taughtSkillName : receivedSkillName) ?? "")}
                        </ThemedText>
                        <ThemedText type="caption" muted style={{ fontSize: FONT_SIZE.xs }}>
                          {sessionDate ? formatDateTimeShort(sessionDate) : "Scheduled session"} • {durationMinutes} min
                        </ThemedText>
                      </View>
                    </View>

                    <Badge variant={isCancelled ? "destructive" : isCompleted ? "accent" : "outline"} accent={isCompleted ? "green" : undefined}>
                      {String(s.status ?? "")}
                    </Badge>
                  </View>

                  {/* Teacher & Role Callout */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2], padding: SPACING[2.5], borderRadius: RADIUS.md, backgroundColor: theme.secondary }}>
                    <BookOpen size={14} color={theme.primary} />
                    <ThemedText type="caption" style={{ fontSize: FONT_SIZE.xs, color: theme.foreground }}>
                      {isCurrentUserTeacher ? "You teach this session" : `${teacherName ?? "Partner"} teaches this session`}
                    </ThemedText>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={{ flexDirection: "row", gap: SPACING[2], flexWrap: "wrap", alignItems: "center" }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => onViewSessionChat(s.id, s.skill?.name)}
                      leftIcon={<MessageSquare size={14} color={theme.foreground} />}
                    >
                      Session Chat
                    </Button>

                    {!isDone && (
                      <Button
                        size="sm"
                        variant={isLive ? "default" : "secondary"}
                        onPress={() => onJoin(s.id)}
                        leftIcon={isLive ? <Zap size={14} color="#fff" /> : <Video size={14} color={theme.foreground} />}
                      >
                        {isLive ? "Join Live" : "Join Room"}
                      </Button>
                    )}
                  </View>

                  {/* Session Status Actions */}
                  {isScheduled && (
                    <View style={{ flexDirection: "row", gap: SPACING[2], paddingTop: SPACING[1], borderTopWidth: 1, borderTopColor: theme.border + "40" }}>
                      {!isCurrentUserTeacher && (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => onUpdateStatus(s.id, "COMPLETED")}
                          leftIcon={<CheckCircle2 size={14} color={getAccent("green").main} />}
                          style={{ flex: 1 }}
                        >
                          Mark Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => onUpdateStatus(s.id, "MISSED")}
                        leftIcon={<XCircle size={14} color={getAccent("red").main} />}
                        style={{ flex: !isCurrentUserTeacher ? 1 : undefined }}
                      >
                        Mark Missed
                      </Button>
                    </View>
                  )}

                  {/* Recordings Section */}
                  {recordings.length > 0 && (
                    <View style={{ paddingTop: SPACING[2], borderTopWidth: 1, borderTopColor: theme.border + "40", gap: SPACING[2] }}>
                      <ThemedText type="caption" style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", color: theme.mutedForeground }}>
                        Session Recordings
                      </ThemedText>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[2] }}>
                        {recordings.map((rec: any, idx: number) => {
                          const isExpired = rec.recordingExpiresAt && new Date() > new Date(rec.recordingExpiresAt);
                          const isProcessing = rec.recordingStatus === "PROCESSING";
                          const isReady = rec.recordingStatus === "COMPLETED";

                          // Formulate status label cleanly without returning empty string ""
                          const statusSuffix = isProcessing ? " (Processing)" : isExpired ? " (Expired)" : "";

                          return (
                            <Button
                              key={rec.id}
                              size="sm"
                              variant="outline"
                              disabled={!isReady || isExpired}
                              onPress={() => onWatchRecording(rec.id)}
                              leftIcon={<Play size={14} color={theme.foreground} />}
                            >
                              {`Part ${recordings.length - idx}${statusSuffix}`}
                            </Button>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ============================================================================
 * EXCHANGE CHAT BODY (WITH FULL ATTACHMENT / FILE UPLOAD SUPPORT)
 * ========================================================================= */

/* ============================================================================
 * CHAT MESSAGE ITEM (MEMOIZED TO PREVENT FLICKERING ON POLLING REFETCHES)
 * ========================================================================= */

const ChatMessageItem = React.memo(
  function ChatMessageItem({
    m,
    currentUserId,
    onPreviewImage,
    onDownloadFile,
  }: {
    m: any;
    currentUserId: string;
    onPreviewImage: (url: string) => void;
    onDownloadFile: (url: string, fileName?: string) => void;
  }) {
    const theme = useTheme();
    const mine = m.senderId === currentUserId;
    const isImage = m.fileType?.startsWith("image/");

    return (
      <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
        <View style={{ flexDirection: "row", gap: SPACING[2], alignItems: "flex-end", maxWidth: "85%" }}>
          {!mine && <Avatar uri={m.sender?.image} fallback={m.sender?.name} size={28} />}
          <View style={{ flex: 1, alignItems: mine ? "flex-end" : "flex-start" }}>
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                borderTopRightRadius: mine ? 4 : RADIUS.md,
                borderTopLeftRadius: mine ? RADIUS.md : 4,
                backgroundColor: mine ? theme.primary : theme.secondary,
                borderWidth: mine ? 0 : 1,
                borderColor: theme.border,
              }}
            >
              {/* Text message */}
              {m.content ? (
                <ThemedText
                  type="small"
                  style={{ color: mine ? "#fff" : theme.foreground, fontSize: FONT_SIZE.sm }}
                >
                  {m.content}
                </ThemedText>
              ) : null}

              {/* Image Attachment Thumbnail Preview */}
              {isImage && m.fileUrl ? (
                <Pressable onPress={() => onPreviewImage(m.fileUrl)} hitSlop={4} style={{ marginTop: m.content ? SPACING[2] : 0 }}>
                  <ExpoImage
                    source={{ uri: m.fileUrl }}
                    recyclingKey={m.id || m.fileUrl}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={150}
                    style={{ width: 220, height: 140, borderRadius: RADIUS.sm }}
                  />
                </Pressable>
              ) : null}

              {/* Non-Image File Attachment Card */}
              {!isImage && m.fileName ? (
                <View style={{ marginTop: m.content ? SPACING[2] : 0, gap: SPACING[2] }}>
                  <Pressable
                    onPress={() => m.fileUrl && onDownloadFile(m.fileUrl, m.fileName)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[2],
                      padding: SPACING[2.5],
                      borderRadius: RADIUS.sm,
                      backgroundColor: mine ? "rgba(255,255,255,0.15)" : theme.background,
                    }}
                  >
                    <FileText size={16} color={mine ? "#fff" : theme.primary} />
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        type="smallBold"
                        numberOfLines={1}
                        style={{ fontSize: FONT_SIZE.xs, color: mine ? "#fff" : theme.foreground }}
                      >
                        {m.fileName}
                      </ThemedText>
                    </View>
                    <Download size={14} color={mine ? "#fff" : theme.primary} />
                  </Pressable>
                </View>
              ) : null}

              <ThemedText
                type="caption"
                style={{
                  fontSize: 10,
                  color: mine ? "rgba(255,255,255,0.7)" : theme.mutedForeground,
                  marginTop: 4,
                  alignSelf: "flex-end",
                }}
              >
                {m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.m.id === next.m.id &&
    prev.m.createdAt === next.m.createdAt &&
    prev.currentUserId === next.currentUserId
);

/* ============================================================================
 * EXCHANGE CHAT BODY (WITH FULL ATTACHMENT / FILE UPLOAD SUPPORT)
 * ========================================================================= */

function ExchangeChatBody({ exchangeId, currentUserId }: { exchangeId: string; currentUserId: string }) {
  const theme = useTheme();
  const toast = useToast();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const [text, setText] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  // React Query hooks for exchange chat
  const { data: messages = [], isLoading: loading } = useExchangeChatMessages(exchangeId, {
    refetchInterval: 4000,
  });
  const sendMsgMutation = useSendExchangeChatMessage();
  const uploadUrlMutation = useExchangeChatUploadUrl();

  // Scroll to bottom when messages list updates
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSendText = async () => {
    if (!text.trim() || sendMsgMutation.isPending || uploading) return;
    const msgContent = text.trim();
    setText("");

    try {
      await sendMsgMutation.mutateAsync({
        exchangeId,
        payload: { content: msgContent },
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      toast.toast({ title: "Failed to send message", variant: "error" });
      setText(msgContent);
    }
  };

  // Upload attachment file (Image, Document, Camera)
  const uploadAttachment = async (fileUri: string, fileName: string, mimeType: string) => {
    try {
      setUploading(true);
      setUploadProgress(fileName);

      // Step 1: Request presigned upload URL via API hook mutation
      const { uploadUrl, key } = await uploadUrlMutation.mutateAsync({
        exchangeId,
        fileName,
        contentType: mimeType,
      });

      
      // Step 2: Upload file
      const file = new File(fileUri);
      const fileUploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: file,
      });

      if (!fileUploadRes.ok || fileUploadRes.status < 200 || fileUploadRes.status >= 300) {
        throw new Error("File upload to storage failed");
      }

      // Step 3: Send chat message with file reference via API hook mutation
      await sendMsgMutation.mutateAsync({
        exchangeId,
        payload: {
          fileKey: key,
          fileName,
          fileType: mimeType,
        },
      });

      toast.toast({ title: "File shared successfully", variant: "success" });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      toast.toast({ title: "File upload failed", description: err?.message, variant: "error" });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Pick from Photo Library
  const handlePickImage = async () => {
    setAttachmentSheetOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      await uploadAttachment(asset.uri, fileName, mimeType);
    }
  };

  // Take Photo via Camera
  const handleTakePhoto = async () => {
    setAttachmentSheetOpen(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.toast({ title: "Camera permission required", variant: "error" });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `camera_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      await uploadAttachment(asset.uri, fileName, mimeType);
    }
  };

  // Pick Document / File
  const handlePickDocument = async () => {
    setAttachmentSheetOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const fileName = file.name ?? `doc_${Date.now()}`;
        const mimeType = file.mimeType ?? "application/octet-stream";
        await uploadAttachment(file.uri, fileName, mimeType);
      }
    } catch {
      toast.toast({ title: "Document picker cancelled", variant: "info" });
    }
  };

  // Direct File Download & Save Prompt (Lets user select destination folder!)
  const handleDownloadAndSaveFile = async (url: string, fileName?: string) => {
    try {
      toast.toast({ title: "Downloading file...", variant: "info" });
      const name = fileName || url.split('/').pop()?.split('?')[0] || `file_${Date.now()}`;
      const ext = name.split('.').pop()?.toLowerCase() || '';

      let mimeType = "application/octet-stream";
      if (["jpg", "jpeg"].includes(ext)) mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "gif") mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "mp4") mimeType = "video/mp4";
      else if (ext === "mp3") mimeType = "audio/mpeg";
      else if (ext === "zip") mimeType = "application/zip";
      else if (ext === "txt") mimeType = "text/plain";

      const targetFile = new File(Paths.cache, name);
      const downloadedFile = await File.downloadFileAsync(url, targetFile, { idempotent: true });

      const isAndroid = Platform.OS === 'android';
      if(isAndroid){
        ``
        const SAVED_DIR_KEY = '@app_downloads_directory_uri';

        try {
          let directoryUri = await AsyncStorage.getItem(SAVED_DIR_KEY);

          // Ask ONLY if permission hasn't been granted previously
          if (!directoryUri) {
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem(SAVED_DIR_KEY, directoryUri);
            } else {
              toast.toast({ title: "Permission denied", variant: "error" });
              return;
            }
          }

          const base64Data = await readAsStringAsync(downloadedFile.uri, {
            encoding: EncodingType.Base64,
          });
          const createdFileUri = await StorageAccessFramework.createFileAsync(
            directoryUri,
            name,
            mimeType
          );
          await StorageAccessFramework.writeAsStringAsync(createdFileUri, base64Data, {
            encoding: EncodingType.Base64,
          });
          toast.toast({ title: "Saved successfully!", variant: "success" });
          return;
        } catch(error) {
          const errMsg = (error && typeof error.toString === 'function') 
            ? error.toString() 
            : String(error);
          if (errMsg.includes("isn't writable")) {
            Alert.alert("Error", "You cannot select this folder. Try creating a new folder inside the folder you selected, and choose that instead.");
          } else {
            // Fallback to Sharing dialog if SAF is declined or fails
          }
          
        }
      }

      // iOS or Android SAF fallback: Native Share/Save sheet
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadedFile.uri, {
          dialogTitle: `Save ${name}`,
          mimeType,
        });
      } else {
        toast.toast({ title: "File downloaded", description: downloadedFile.uri, variant: "success" });
      }
    } catch (err: any) {
      toast.toast({ title: "Save failed", description: err?.message, variant: "error" });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      style={{ flex: 1 }}
    >
      <Card style={{ minHeight: 440, maxHeight: 540, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
        <CardContent style={{ flex: 1, padding: SPACING[3], gap: SPACING[2], justifyContent: "space-between" }}>
          {loading ? (
            <SkeletonText lines={5} />
          ) : messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING[3] }}>
              <MessageCircle size={32} color={theme.primary} />
              <ThemedText type="default" style={{ fontWeight: "700" }}>
                No messages yet
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: "center", maxWidth: 260 }}>
                Send a message or share files to coordinate with your exchange partner.
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ gap: SPACING[3], paddingVertical: SPACING[2] }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m: any) => (
                <ChatMessageItem
                  key={m.id ?? m.createdAt}
                  m={m}
                  currentUserId={currentUserId}
                  onPreviewImage={setPreviewImageUrl}
                  onDownloadFile={handleDownloadAndSaveFile}
                />
              ))}
            </ScrollView>
          )}

          {/* Uploading Banner Indicator */}
          {uploading && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[2],
                padding: SPACING[2],
                borderRadius: RADIUS.sm,
                backgroundColor: getAccent("indigo").bg,
                borderWidth: 1,
                borderColor: getAccent("indigo").border,
              }}
            >
              <Loader2 size={14} color={getAccent("indigo").main} />
              <ThemedText type="caption" style={{ color: getAccent("indigo").main, fontSize: FONT_SIZE.xs, flex: 1, fontWeight: "600" }}>
                Uploading {uploadProgress ?? "file"}...
              </ThemedText>
            </View>
          )}

          {/* Send & Attachment Input Bar */}
          <View
            style={{
              flexDirection: "row",
              gap: SPACING[2],
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingTop: SPACING[2.5],
            }}
          >
            {/* Attachment Paperclip Button */}
            <Pressable
              onPress={() => setAttachmentSheetOpen(true)}
              disabled={uploading || sendMsgMutation.isPending}
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.secondary,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? (
                <Loader2 size={18} color={theme.primary} />
              ) : (
                <Paperclip size={18} color={theme.foreground} />
              )}
            </Pressable>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message…"
              placeholderTextColor={theme.mutedForeground}
              style={{
                flex: 1,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.secondary,
                color: theme.foreground,
                paddingHorizontal: SPACING[4],
                paddingVertical: SPACING[2.5],
                fontSize: FONT_SIZE.md,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onSubmitEditing={handleSendText}
              returnKeyType="send"
              editable={!sendMsgMutation.isPending && !uploading}
            />
            <Pressable
              onPress={handleSendText}
              disabled={!text.trim() || sendMsgMutation.isPending || uploading}
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                backgroundColor: !text.trim() || sendMsgMutation.isPending || uploading ? theme.muted : theme.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sendMsgMutation.isPending ? (
                <Loader2 size={16} color="#fff" />
              ) : (
                <Send size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </CardContent>

        {/* Attachment Selection Sheet */}
        <ActionSheet
          open={attachmentSheetOpen}
          onClose={() => setAttachmentSheetOpen(false)}
          title="Share Attachment"
          description="Select attachment source"
          options={[
            {
              label: "Take photo",
              icon: <Camera size={18} color={theme.primary} />,
              onPress: handleTakePhoto,
            },
            {
              label: "Get from Photos",
              icon: <ImageIcon size={18} color={theme.primary} />,
              onPress: handlePickImage,
            },
            {
              label: "Add File",
              icon: <FileText size={18} color={theme.primary} />,
              onPress: handlePickDocument,
            },
          ]}
        />

        {/* Fullscreen Image Preview Modal with Download & Save prompt */}
        <Modal
          visible={!!previewImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "space-between" }}>
            {/* Header Bar with Download & Close */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: SPACING[4],
                paddingVertical: SPACING[3],
                zIndex: 10,
              }}
            >
              <ThemedText type="smallBold" style={{ color: "#fff", fontSize: FONT_SIZE.md }}>
                Image Preview
              </ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[3] }}>
                <Pressable
                  onPress={() => previewImageUrl && handleDownloadAndSaveFile(previewImageUrl)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: RADIUS.pill,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  hitSlop={8}
                >
                  <Download size={20} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setPreviewImageUrl(null)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: RADIUS.pill,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  hitSlop={8}
                >
                  <X size={20} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* Centered Image */}
            {previewImageUrl && (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ExpoImage
                  source={{ uri: previewImageUrl }}
                  cachePolicy="memory-disk"
                  contentFit="contain"
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </Card>
    </KeyboardAvoidingView>
  );
}

/* ============================================================================
 * DETAILS TAB BODY (PARTICIPANTS & SKILLS BREAKDOWN MATCHING WEB)
 * ========================================================================= */

function DetailsBody({ exchange, currentUser, otherUser, isSender, isTwoWay, loading }: any) {
  const theme = useTheme();

  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={6} />
        </CardContent>
      </Card>
    );

  return (
    <View style={{ gap: SPACING[4] }}>
      {/* Participants Card */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: FONT_SIZE.sm, color: theme.mutedForeground, textTransform: "uppercase" }}>
            Exchange Participants
          </CardTitle>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            {/* Me */}
            <View style={{ alignItems: "center", gap: SPACING[1.5] }}>
              <Avatar uri={currentUser?.image} fallback={currentUser?.name} size={48} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                {currentUser?.name ?? "You"}
              </ThemedText>
              <Badge variant="outline">{isSender ? "Sender" : "Receiver"}</Badge>
            </View>

            <ArrowRightLeft size={22} color={theme.mutedForeground} />

            {/* Partner */}
            <View style={{ alignItems: "center", gap: SPACING[1.5] }}>
              <Avatar uri={otherUser?.image} fallback={otherUser?.name} size={48} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                {otherUser?.name ?? "Partner"}
              </ThemedText>
              <Badge variant="outline">{isSender ? "Receiver" : "Sender"}</Badge>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Skills Being Exchanged Details */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: FONT_SIZE.sm, color: theme.mutedForeground, textTransform: "uppercase" }}>
            Skills Being Exchanged
          </CardTitle>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3] }}>
          <View style={{ padding: SPACING[3], borderRadius: RADIUS.md, backgroundColor: theme.secondary, gap: 4 }}>
            <ThemedText type="caption" muted style={{ fontSize: 11 }}>
              Taught Skill
            </ThemedText>
            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
              {exchange?.taughtSkill?.name ?? "Skill"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.xs }}>
              {exchange?.requestedSkillSessions ?? 1} sessions × {exchange?.requestedSkillDuration ?? 60} min
            </ThemedText>
          </View>

          {isTwoWay && exchange?.receivedSkill && (
            <View style={{ padding: SPACING[3], borderRadius: RADIUS.md, backgroundColor: theme.secondary, gap: 4 }}>
              <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                Received Skill (Return)
              </ThemedText>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                {exchange?.receivedSkill?.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.xs }}>
                {exchange?.offeredSkillSessions ?? 1} sessions × {exchange?.offeredSkillDuration ?? 60} min
              </ThemedText>
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  );
}

function OverviewBody({ exchange, loading, points, other }: any) {
  const theme = useTheme();
  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={6} />
        </CardContent>
      </Card>
    );

  return (
    <View style={{ gap: SPACING[4] }}>
      {/* Points Card */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
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
              <HandCoins size={18} color={getAccent("amber").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Points breakdown</CardTitle>
              <CardDescription>Split for value & commission</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3] }}>
          {points ? (
            <>
              <Row label="Gross value" value={`${points.gross} pts`} />
              <Row label="Platform fee (15%)" value={`-${points.fee} pts`} dim />
              <Separator />
              <Row label="Net to facilitator" value={`${points.net} pts`} strong accent="amber" main />
            </>
          ) : (
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              No points amount set for this exchange.
            </ThemedText>
          )}
        </CardContent>
      </Card>

      {/* Event Timeline Card */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
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
              <CalendarCheck size={18} color={getAccent("violet").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Key events for this exchange.</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: 0, paddingHorizontal: 0 }}>
          <TimelineDot
            icon={<Handshake size={14} color={theme.primary} />}
            label="Exchange created"
            at={exchange?.committedAt ?? exchange?.createdAt}
            accent="indigo"
          />
          {exchange?.acceptedAt ? (
            <TimelineDot
              icon={<CheckCircle2 size={14} color={getAccent("emerald").main} />}
              label="Accepted"
              at={exchange.acceptedAt}
              accent="emerald"
            />
          ) : null}
          {exchange?.completedAt ? (
            <TimelineDot
              icon={<FileCheck size={14} color={getAccent("blue").main} />}
              label="Completed"
              at={exchange.completedAt}
              accent="blue"
            />
          ) : null}
          {exchange?.cancelledAt ? (
            <TimelineDot
              icon={<XCircle size={14} color={getAccent("red").main} />}
              label="Cancelled"
              at={exchange.cancelledAt}
              accent="red"
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Security & Protection */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
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
              <ShieldCheck size={18} color={getAccent("blue").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Trusted exchange</CardTitle>
              <CardDescription>All sessions take place in our secure LiveKit rooms.</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          <ThemedText type="small" style={{ color: theme.mutedForeground, lineHeight: 20 }}>
            Sessions are recorded only with mutual consent and points are held in escrow until the exchange is marked complete by both sides.
          </ThemedText>
        </CardContent>
      </Card>
    </View>
  );
}

function ReviewBody({
  exchange,
  canReview,
  loading,
  onSubmit,
  submitting,
  rating,
  setRating,
  comment,
  setComment,
  tags,
  openTags,
}: any) {
  const theme = useTheme();
  const theirReview = exchange?.theirReview;
  const myReview = exchange?.myReview;

  return (
    <View style={{ gap: SPACING[4] }}>
      {canReview ? (
        <Card style={{ borderColor: getAccent("amber").border }}>
          <CardHeader>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}>
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
                <Star size={18} color={getAccent("amber").main} fill={getAccent("amber").main} />
              </View>
              <View style={{ flex: 1 }}>
                <CardTitle>Leave a review</CardTitle>
                <CardDescription>Rate your experience with your exchange partner.</CardDescription>
              </View>
            </View>
          </CardHeader>
          <CardContent style={{ gap: SPACING[4] }}>
            <View style={{ alignItems: "center", gap: SPACING[2] }}>
              <View style={{ flexDirection: "row", gap: SPACING[2] }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= rating;
                  return (
                    <Pressable key={n} onPress={() => setRating(n)} hitSlop={10}>
                      <Star
                        size={32}
                        color={active ? getAccent("amber").main : theme.mutedForeground}
                        fill={active ? getAccent("amber").main : "transparent"}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.lg, color: getAccent("amber").main }}>
                {rating} / 5
              </ThemedText>
            </View>

            <Textarea
              label="How did it go?"
              value={comment}
              onChangeText={setComment}
              placeholder="Share what you liked or feedback for improvement…"
              numberOfLines={4}
              description={`${comment.length}/500`}
            />

            <Pressable
              onPress={openTags}
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
            >
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm, marginBottom: SPACING[1] }}>
                Qualities ({tags.length}/8)
              </ThemedText>
              {tags.length === 0 ? (
                <ThemedText type="small" style={{ color: theme.mutedForeground }}>
                  Tap to select qualities…
                </ThemedText>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[2] }}>
                  {tags.map((t: string) => (
                    <Badge key={t} variant="accent" accent="indigo">
                      {REVIEW_TAG_LABELS[t as keyof typeof REVIEW_TAG_LABELS] ?? t}
                    </Badge>
                  ))}
                </View>
              )}
            </Pressable>

            <Button onPress={onSubmit} loading={submitting} leftIcon={<CheckCircle2 size={16} color="#fff" />}>
              Submit Review
            </Button>
          </CardContent>
        </Card>
      ) : myReview ? (
        <ReviewCard review={myReview} />
      ) : !loading ? (
        <Card>
          <CardContent style={{ paddingVertical: SPACING[6], alignItems: "center", gap: SPACING[2] }}>
            <ThemedText type="default" style={{ fontWeight: "700", textAlign: "center" }}>
              Complete exchange to leave a review
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: "center", fontSize: FONT_SIZE.sm }}>
              Reviews unlock once both trading partners mark the exchange as complete.
            </ThemedText>
          </CardContent>
        </Card>
      ) : null}

      {theirReview ? (
        <>
          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md, marginLeft: SPACING[0.5] }}>
            Their review for you
          </ThemedText>
          <ReviewCard review={theirReview} />
        </>
      ) : null}
    </View>
  );
}

function Row({ label, value, dim, strong, accent, main }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <ThemedText
        type="small"
        style={{
          color: dim ? theme.mutedForeground : theme.foreground,
          fontSize: FONT_SIZE.md,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? "default" : "small"}
        style={{
          color: main ? getAccent(accent ?? "amber").main : theme.foreground,
          fontSize: FONT_SIZE.md,
          fontWeight: strong ? "800" : "500",
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function TimelineDot({
  icon,
  label,
  at,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  at?: string;
  accent: string;
}) {
  const theme = useTheme();
  const palette = getAccent(accent);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING[3], paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: RADIUS.pill,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {label}
        </ThemedText>
        {at ? (
          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
            {formatDateTimeShort(at)}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function labelForStatus(s: string) {
  switch (s) {
    case "COMMITTED":
      return "Committed";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "ACCEPTED":
      return "Accepted";
    case "SCHEDULED":
      return "Scheduled";
    case "PENDING":
      return "Pending";
    case "REJECTED":
      return "Rejected";
    case "EXPIRED":
      return "Expired";
    default:
      return s ? s.replace(/_/g, " ") : "Active";
  }
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: 240,
    borderRadius: RADIUS.lg,
    // backgroundColor: "#000",
  },
});