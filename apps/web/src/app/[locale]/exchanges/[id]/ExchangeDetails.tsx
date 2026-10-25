"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useRouter } from "@/i18n/navigation";
import { calculatePointsBreakdown } from "@skillex/shared";
import {
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  Coins,
  Download,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Paperclip,
  Play,
  Send,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AnalyticsEvent, track } from "@/lib/analytics";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const API = `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api`;

const statusColors: Record<string, string> = {
  COMMITTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const sessionStatusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  MISSED: "bg-red-500/20 text-red-400 border-red-500/30",
  CANCELLED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

interface SessionRecording {
  id: string;
  recordingKey: string | null;
  recordingStatus: string;
  recordingExpiresAt: string | null;
  createdAt: string;
}

interface ExchangeSession {
  id: string;
  skillId: string;
  scheduledAt: string;
  completedAt: string | null;
  duration: number;
  status: string;
  skill: { id: string; name: string };
  recordings: SessionRecording[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  content?: string | null;
  message?: string; // session chat uses 'message'
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt?: string;
  timestamp?: string;
  sender: { id: string; name: string; image: string | null };
}

export default function ExchangeDetails({
  exchange,
  currentUser,
}: {
  exchange: {
    id: string;
    requestId: string;
    status: string;
    senderId: string;
    senderCompleted: boolean;
    receiverCompleted: boolean;
    taughtSkillId: string;
    taughtSkill: { id: string; name: string };
    receivedSkillId?: string | null;
    receivedSkill?: { id: string; name: string } | null;
    requestedSkillSessions: number;
    requestedSkillDuration: number;
    offeredSkillSessions: number;
    offeredSkillDuration: number;
    pointsAmount: number;
    pointsPayerId: string;
    escrowLocked: boolean;
    sender: { id: string; name: string; image: string | null };
    receiver: { id: string; name: string; image: string | null };
    sessions: ExchangeSession[];
    reviews?: { id: string; reviewerId: string }[];
  };
  currentUser: { id: string; name: string; image: string | null };
}) {
  const router = useRouter();
  const t = useTranslations("exchanges");
  const tc = useTranslations("common");
  const tr = useTranslations("review");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);

  const hasReviewed = exchange.reviews?.some((r) => r.reviewerId === currentUser.id);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    onConfirm: () => {},
  });

  const handleSessionStatusClick = (sessionId: string, status: string) => {
    const isCompleted = status === "COMPLETED";
    setConfirmModal({
      isOpen: true,
      title: isCompleted ? tc("confirm") : t("missed"),
      description: isCompleted 
        ? t("confirmMarkCompleted") 
        : t("confirmMarkMissed"),
      confirmText: isCompleted ? t("markedComplete") : t("markMissed"),
      onConfirm: () => updateSessionStatus(sessionId, status),
    });
  };

  const handleCompleteExchangeClick = () => {
    setConfirmModal({
      isOpen: true,
      title: t("markComplete"),
      description: t("markCompleteDesc"),
      confirmText: t("markComplete"),
      onConfirm: completeExchange,
    });
  };

  // Recording playback
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Session chat viewer
  const [sessionChatMessages, setSessionChatMessages] = useState<ChatMessage[]>(
    [],
  );
  const [sessionChatOpen, setSessionChatOpen] = useState(false);

  const isSender = exchange.senderId === currentUser.id;
  const otherUser = isSender ? exchange.receiver : exchange.sender;
  const iAmCompleted = isSender
    ? exchange.senderCompleted
    : exchange.receiverCompleted;

  const partnerCompleted = isSender
    ? exchange.receiverCompleted
    : exchange.senderCompleted;

  const isTwoWay = !!exchange.receivedSkill;

  // Derive teacher for a given session based on skillId
  const getTeacherForSession = (session: ExchangeSession) => {
    if (session.skillId === exchange.taughtSkillId) {
      return exchange.receiver;
    }
    return exchange.sender;
  };

  const isCurrentUserTeacher = (session: ExchangeSession) => {
    const teacher = getTeacherForSession(session);
    return teacher.id === currentUser.id;
  };

  const getDurationForSession = (session: ExchangeSession) => {
    return (
      session.duration ||
      (session.skillId === exchange.taughtSkillId
        ? exchange.requestedSkillDuration
        : exchange.offeredSkillDuration)
    );
  };

  // Group sessions by skill for two-way exchanges
  const taughtSessions = (exchange.sessions || []).filter(
    (s: ExchangeSession) => s.skillId === exchange.taughtSkillId,
  );
  const receivedSessions = isTwoWay
    ? (exchange.sessions || []).filter(
        (s: ExchangeSession) => s.skillId !== exchange.taughtSkillId,
      )
    : [];

  const totalSessions =
    exchange.requestedSkillSessions +
    (isTwoWay ? exchange.offeredSkillSessions : 0);
  const completedSessionsCount =
    exchange.sessions?.filter((s: ExchangeSession) => s.status === "COMPLETED")
      .length || 0;
  const progress =
    totalSessions > 0
      ? Math.round((completedSessionsCount / totalSessions) * 100)
      : 0;

  useEffect(() => {
    const eventSource = new EventSource(`${API}/exchanges/stream`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Refresh if it's a general update for this exchange or a session update within it
        if (data.exchangeId === exchange.id || data.requestId === exchange.requestId) {
          router.refresh();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [exchange.id, exchange.requestId, router]);

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      setUpdating(sessionId);
      const res = await fetch(
        `${API}/exchanges/${exchange.id}/sessions/${sessionId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        },
      );

      if (!res.ok) throw new Error(t("failedUpdateSession"));
      toast.success(t("sessionMarkedAs", { status: status.toLowerCase() }));
      router.refresh();
    } catch {
      toast.error(t("failedUpdateSession"));
    } finally {
      setUpdating(null);
    }
  };

  const completeExchange = async () => {
    try {
      setUpdating("exchange");
      const res = await fetch(`${API}/exchanges/${exchange.id}/complete`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error(t("failedCompleteExchange"));
      toast.success(t("exchangeMarkedCompleted"));

      const data = await res.json();
      if (data.status === "COMPLETED") {
        track(AnalyticsEvent.EXCHANGE_MARKED_COMPLETE, {
          exchange_id: exchange.id,
        });
        setIsReviewModalOpen(true);
      }
      router.refresh();
    } catch {
      toast.error(t("failedCompleteExchange"));
    } finally {
      setUpdating(null);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const submitReview = async () => {
    try {
      setUpdating("review");
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          exchangeId: exchange.id,
          rating,
          tags:
            selectedTags.length > 0 ? selectedTags : ["WOULD_EXCHANGE_AGAIN"],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || tr("failedSubmitReview"));
      }

      track(AnalyticsEvent.EXCHANGE_REVIEW_SUBMITTED, {
        exchange_id: exchange.id,
        rating,
      });
      toast.success(tr("reviewSubmitted"));
      setIsReviewModalOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : tc("errorOccurred");
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  // Watch recording
  const handleWatchRecording = async (recordingId: string) => {
    try {
      setUpdating(`playback-${recordingId}`);
      const res = await fetch(
        `${API}/video/recording/${recordingId}/playback`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || t("failedLoadRecording"));
      }
      const data = await res.json();
      setPlaybackUrl(data.url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("failedLoadRecording");
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  // View session chat
  const handleViewSessionChat = async (sessionId: string) => {
    try {
      const res = await fetch(`${API}/video/chat/${sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("failedLoadSessionChat"));
      const data = await res.json();
      setSessionChatMessages(data.messages);
      setSessionChatOpen(true);

      // Mark as read when viewing
      fetch(`${API}/video/chat/${sessionId}/read`, {
        method: "PATCH",
        credentials: "include",
      }).catch(() => {});
    } catch {
      toast.error(t("failedLoadSessionChat"));
    }
  };

  const reviewTags = [
    { value: "GREAT_TEACHER", label: tr("greatTeacher") },
    { value: "PATIENT", label: tr("patient") },
    { value: "KNOWLEDGEABLE", label: tr("knowledgeable") },
    { value: "ON_TIME", label: tr("onTime") },
    { value: "CLEAR_EXPLANATIONS", label: tr("clearExplanations") },
    { value: "GOOD_COMMUNICATOR", label: tr("goodCommunicator") },
    { value: "WELL_PREPARED", label: tr("wellPrepared") },
    { value: "WOULD_EXCHANGE_AGAIN", label: tr("wouldExchangeAgain") },
    { value: "NEEDS_IMPROVEMENT", label: tr("needsImprovement") },
    { value: "UNRESPONSIVE", label: tr("unresponsive") },
  ];

  const renderSessionCard = (session: ExchangeSession) => {
    const sessionDate = new Date(session.scheduledAt);
    const teacher = getTeacherForSession(session);
    const duration = getDurationForSession(session);
    const isTeacher = isCurrentUserTeacher(session);

    const recordings = session.recordings || [];

    return (
      <Card key={session.id} className="bg-card/40">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">
                  {sessionDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h4>
                <span className="text-muted-foreground text-sm">
                  {sessionDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${sessionStatusColors[session.status]}`}
                >
                  {t(session.status.toLowerCase())}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="font-medium">{session.skill?.name}</span>
                <span>•</span>
                <span>{duration}m</span>
                <span>•</span>
                <span>
                  {isTeacher
                    ? t("youTeach")
                    : t("teaches", { name: teacher.name })}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Session chat button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewSessionChat(session.id)}
                className="gap-1.5 text-xs"
              >
                <MessageSquare className="h-3 w-3" />
                {t("chat")}
              </Button>

              {(session.status === "SCHEDULED" ||
                session.status === "IN_PROGRESS") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    router.push(`/room/${session.id}`)
                  }
                >
                  <Video className="h-4 w-4 mr-2" /> {t("joinRoom")}
                </Button>
              )}

              {session.status === "SCHEDULED" && (
                <div className="flex gap-2">
                  {!isTeacher && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-green-500 hover:text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() =>
                        handleSessionStatusClick(session.id, "COMPLETED")
                      }
                      disabled={updating === session.id}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleSessionStatusClick(session.id, "MISSED")}
                    disabled={updating === session.id}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Recordings List */}
          {recordings.length > 0 && (
            <div className="border-t border-border/20 pt-3 flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("recordings")}
              </p>
              <div className="flex flex-wrap gap-2">
                {recordings.map((rec, idx) => {
                  const isExpired =
                    rec.recordingExpiresAt &&
                    new Date() > new Date(rec.recordingExpiresAt);
                  const isCompleted = rec.recordingStatus === "COMPLETED";
                  const isProcessing = rec.recordingStatus === "PROCESSING";

                  return (
                    <div key={rec.id} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !isCompleted ||
                          isExpired ||
                          updating === `playback-${rec.id}`
                        }
                        onClick={() => handleWatchRecording(rec.id)}
                        className="h-7 px-2 text-[10px] gap-1"
                      >
                        {updating === `playback-${rec.id}` ? (
                          <Loader2 className="h-2 w-2 animate-spin" />
                        ) : (
                          <Play className="h-2 w-2" />
                        )}
                        {t("part", { num: recordings.length - idx })}
                        {isProcessing && ` (${t("processing")})`}
                        {isExpired && ` (${t("expired")})`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-border/40 pb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/exchanges")}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                {exchange.taughtSkill.name}
                {isTwoWay && exchange.receivedSkill && (
                  <span className="text-muted-foreground font-normal">
                    ↔ {exchange.receivedSkill?.name}
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <span>{tc("with", { name: otherUser.name })}</span>
                <Badge
                  variant="outline"
                  className={statusColors[exchange.status]}
                >
                  {t(exchange.status.toLowerCase())}
                </Badge>
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("progress")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tc("progressOf", {
                    completed: completedSessionsCount,
                    total: tc("sessions_count", { count: totalSessions }),
                  })}
                </p>
                <div className="mt-2 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  {t("points")}
                  {exchange.pointsAmount > 0 && (
                    <TooltipProvider delay={300}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="center"
                          className="w-72 p-4 z-100 shadow-md border bg-popover text-popover-foreground"
                        >
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                              {tc("pointsBreakdown")}
                            </h4>
                            <div className="text-sm space-y-1 text-muted-foreground">
                              <div className="flex justify-between">
                                <span>{tc("grossAmount")}:</span>
                                <span className="text-foreground font-medium">
                                  {
                                    calculatePointsBreakdown(
                                      exchange.pointsAmount,
                                    ).gross
                                  }{" "}
                                  {tc("points")}
                                </span>
                              </div>
                              <div className="flex justify-between text-red-500/80">
                                <span>{tc("platformFee")}:</span>
                                <span>
                                  -
                                  {
                                    calculatePointsBreakdown(
                                      exchange.pointsAmount,
                                    ).fee
                                  }{" "}
                                  {tc("points")}
                                </span>
                              </div>
                              <div className="flex justify-between font-medium text-emerald-500 pt-1 border-t border-border/40">
                                <span>{tc("netGain")}:</span>
                                <span>
                                  {
                                    calculatePointsBreakdown(
                                      exchange.pointsAmount,
                                    ).net
                                  }{" "}
                                  {tc("points")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {exchange.pointsPayerId === currentUser.id ? (
                    <>
                      {tc("points_count", {
                        count: calculatePointsBreakdown(exchange.pointsAmount)
                          .gross,
                      })}
                      <Coins className="h-5 w-5 text-amber-500" />
                    </>
                  ) : (
                    <>
                      {tc("points_count", {
                        count: calculatePointsBreakdown(exchange.pointsAmount)
                          .net,
                      })}
                      <Coins className="h-5 w-5 text-amber-500" />
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    {exchange.pointsAmount === 0
                      ? t("evenExchange")
                      : exchange.pointsPayerId === currentUser.id
                        ? tc("totalCost")
                        : tc("netGain")}
                    {exchange.escrowLocked && ` • ${t("escrowed")}`}
                  </div>
                  {exchange.pointsAmount > 0 &&
                    exchange.pointsPayerId !== currentUser.id && (
                      <span className="opacity-70 text-[10px]">
                        {tc("afterPlatformFee", {
                          amount: calculatePointsBreakdown(
                            exchange.pointsAmount,
                          ).net,
                        })}
                      </span>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("completion")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold flex flex-col gap-2">
                  <span>
                    {exchange.status === "COMPLETED"
                      ? t("finished")
                      : iAmCompleted
                        ? t("awaitingPartner")
                        : t("active")}
                  </span>
                  {exchange.status !== "COMPLETED" && partnerCompleted && (
                    <span className="text-xs font-normal text-emerald-500 flex items-center gap-1 mt-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {t("partnerMarkedComplete", { name: otherUser.name })}
                    </span>
                  )}
                </div>
                {exchange.status !== "COMPLETED" && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={handleCompleteExchangeClick}
                    disabled={iAmCompleted || updating === "exchange"}
                  >
                    {iAmCompleted ? t("markedComplete") : t("markComplete")}
                  </Button>
                )}
                {exchange.status === "COMPLETED" && (
                  <Button
                    size="sm"
                    variant={hasReviewed ? "secondary" : "outline"}
                    className="mt-2 w-full gap-2"
                    onClick={() => !hasReviewed && setIsReviewModalOpen(true)}
                    disabled={hasReviewed}
                  >
                    <Star className={`h-4 w-4 ${hasReviewed ? "fill-amber-400 text-amber-400" : ""}`} />
                    {hasReviewed ? tr("reviewSubmitted") : t("leaveReview")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions + Chat Tabs */}
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="sessions">
                {t("allSessions")} ({exchange.sessions?.length || 0})
              </TabsTrigger>
              {isTwoWay && (
                <>
                  <TabsTrigger value="taught">
                    {exchange.taughtSkill.name} ({taughtSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="received">
                    {exchange.receivedSkill?.name || t("receivedSkill")} (
                    {receivedSessions.length})
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="chat">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                {t("chat")}
              </TabsTrigger>
              <TabsTrigger value="details">{t("details")}</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-3">
              {!exchange.sessions || exchange.sessions.length === 0 ? (
                <div className="py-12 text-center border rounded-lg bg-card/20">
                  <p className="text-muted-foreground">{t("noSessions")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exchange.sessions.map((s: ExchangeSession) =>
                    renderSessionCard(s),
                  )}
                </div>
              )}
            </TabsContent>

            {isTwoWay && (
              <>
                <TabsContent value="taught" className="space-y-3">
                  {taughtSessions.length === 0 ? (
                    <div className="py-12 text-center border rounded-lg bg-card/20">
                      <p className="text-muted-foreground">
                        {t("noSkillSessionsYet", {
                          skill: exchange.taughtSkill.name,
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {taughtSessions.map((s: ExchangeSession) =>
                        renderSessionCard(s),
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="received" className="space-y-3">
                  {receivedSessions.length === 0 ? (
                    <div className="py-12 text-center border rounded-lg bg-card/20">
                      <p className="text-muted-foreground">
                        {t("noSkillSessionsYet", {
                          skill:
                            exchange.receivedSkill?.name || t("receivedSkill"),
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {receivedSessions.map((s: ExchangeSession) =>
                        renderSessionCard(s),
                      )}
                    </div>
                  )}
                </TabsContent>
              </>
            )}

            {/* Exchange Chat Tab */}
            <TabsContent value="chat" className="space-y-3">
              <ExchangeChatTab
                exchangeId={exchange.id}
                currentUserId={currentUser.id}
              />
            </TabsContent>

            <TabsContent
              value="details"
              className="bg-card/40 p-6 rounded-xl border border-border/50"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-foreground/80 mb-4 uppercase tracking-wider">
                    {t("exchangeParticipants")}
                  </h3>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={currentUser.image || ""} />
                        <AvatarFallback>
                          {currentUser.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{t("myRole")}</p>
                        <p className="text-xs text-muted-foreground">
                          {isSender ? t("sender") : t("receiver")}
                        </p>
                      </div>
                    </div>
                    <ArrowRightLeft className="text-muted-foreground h-5 w-5" />
                    <div className="flex items-center gap-3">
                      <Avatar previewable src={otherUser.image || ""}>
                        <AvatarImage src={otherUser.image || ""} />
                        <AvatarFallback>
                          {otherUser.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium hover:underline hover:text-primary transition-colors">
                          <Link href={`/users/${otherUser.id}`}>
                            {otherUser.name}
                          </Link>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isSender ? t("receiver") : t("sender")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isTwoWay && (
                  <div className="border-t border-border/40 pt-4">
                    <h3 className="font-semibold text-sm text-foreground/80 mb-3 uppercase tracking-wider">
                      {t("skillsBeingExchanged")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-card/50 rounded-lg border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("teaches", { name: exchange.receiver.name })}
                        </p>
                        <p className="font-medium">
                          {exchange.taughtSkill.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {exchange.requestedSkillSessions} {tc("sessions")} ×{" "}
                          {exchange.requestedSkillDuration}m
                        </p>
                      </div>
                      <div className="p-3 bg-card/50 rounded-lg border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("teaches", { name: exchange.sender.name })}
                        </p>
                        <p className="font-medium">
                          {exchange.receivedSkill?.name || tc("optional")}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {exchange.offeredSkillSessions} {tc("sessions")} ×{" "}
                          {exchange.offeredSkillDuration}m
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Floating Summary Card for desktop */}
        <div className="hidden lg:block w-80 space-y-6 sticky top-24">
          <Card className="bg-linear-to-br from-card to-card/50 border-border/50 shadow-lg">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg">{t("exchangeSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("totalSessions")}
                  </span>
                  <span className="font-medium">{totalSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("completed")}
                  </span>
                  <span className="font-medium">{completedSessionsCount}</span>
                </div>
                {isTwoWay && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {exchange.taughtSkill.name}
                      </span>
                      <span className="font-medium">
                        {
                          taughtSessions.filter(
                            (s: ExchangeSession) => s.status === "COMPLETED",
                          ).length
                        }
                        /{taughtSessions.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {exchange.receivedSkill?.name || t("receivedSkill")}
                      </span>

                      <span className="font-medium">
                        {
                          receivedSessions.filter(
                            (s: ExchangeSession) => s.status === "COMPLETED",
                          ).length
                        }
                        /{receivedSessions.length}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm items-start">
                  <span className="text-muted-foreground">{t("points")}</span>
                  <div className="text-right">
                    <div className="font-medium text-amber-500 flex items-center justify-end gap-1">
                      {exchange.pointsPayerId === currentUser.id
                        ? tc("points_count", {
                            count: calculatePointsBreakdown(
                              exchange.pointsAmount,
                            ).gross,
                          })
                        : tc("points_count", {
                            count: calculatePointsBreakdown(
                              exchange.pointsAmount,
                            ).net,
                          })}
                      <Coins className="h-4 w-4" />
                    </div>
                    <div className="text-[10px] opacity-70">
                      {exchange.pointsAmount === 0
                        ? t("evenExchange")
                        : exchange.pointsPayerId === currentUser.id
                          ? tc("totalCost")
                          : tc("netGain")}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recording Playback Dialog */}
      <Dialog
        open={!!playbackUrl}
        onOpenChange={(v) => {
          if (!v) {
            setPlaybackUrl(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              {t("sessionRecording")}
            </DialogTitle>
          </DialogHeader>
          {playbackUrl && (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={playbackUrl}
                controls
                autoPlay
                className="w-full max-h-[60vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Chat History Dialog */}
      <Dialog open={sessionChatOpen} onOpenChange={setSessionChatOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("sessionChatHistory")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {sessionChatMessages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("noChatMessages")}
              </p>
            ) : (
              sessionChatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={msg.sender.image || ""} />
                    <AvatarFallback className="text-[10px]">
                      {msg.sender.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">
                        {msg.sender.id === currentUser.id
                          ? tc("you").charAt(0).toUpperCase() +
                            tc("you").slice(1)
                          : msg.sender.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(
                          msg.timestamp || msg.createdAt || "",
                        ).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 wrap-break-word">
                      {msg.message || msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("title")}</DialogTitle>
            <DialogDescription>
              {tr("description", { name: otherUser.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center gap-6">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    rating >= star ? "text-amber-400" : "text-zinc-700"
                  }`}
                >
                  <Star className="h-10 w-10 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium">
              {tr("starsOutOf5", { rating })}
            </p>

            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {tr("selectTags")}
              </p>
              <div className="flex flex-wrap gap-2">
                {reviewTags.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selectedTags.includes(tag.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card/50 text-muted-foreground border-border/50 hover:border-border"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewModalOpen(false)}
            >
              {tr("later")}
            </Button>
            <Button onClick={submitReview} disabled={updating === "review"}>
              {tr("submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmModal.isOpen}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmModal.title}</DialogTitle>
            <DialogDescription className="text-left pt-2">
              {confirmModal.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {confirmModal.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Exchange Chat Tab ───────────────────────────────── */

function ExchangeChatTab({
  exchangeId,
  currentUserId,
}: {
  exchangeId: string;
  currentUserId: string;
}) {
  const t = useTranslations("exchanges");
  const tc = useTranslations("common");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/exchanges/${exchangeId}/chat`, {
        credentials: "include",
      });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendTextMessage = async () => {
    const msg = inputValue.trim();
    if (!msg || isSending) return;

    setIsSending(true);
    setInputValue("");

    try {
      const res = await fetch(`${API}/exchanges/${exchangeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: msg }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      } else {
        toast.error(t("failedSendMessage"));
        setInputValue(msg); // restore
      }
    } catch {
      toast.error(t("failedSendMessage"));
      setInputValue(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Get presigned upload URL
      const uploadRes = await fetch(
        `${API}/exchanges/${exchangeId}/chat/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
          }),
        },
      );

      if (!uploadRes.ok) throw new Error(t("failedGetUploadUrl"));
      const { uploadUrl, key } = await uploadRes.json();

      // 2. Upload file to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error(t("failedUploadFile"));

      // 3. Send chat message with file reference
      const msgRes = await fetch(`${API}/exchanges/${exchangeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileKey: key,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (msgRes.ok) {
        const newMsg = await msgRes.json();
        setMessages((prev) => [...prev, newMsg]);
        toast.success(t("fileSharedSuccess"));
      }
    } catch {
      toast.error(t("failedUploadFile"));
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="border rounded-xl bg-card/30 flex flex-col"
      style={{ height: "500px" }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("noMessagesStartConvo")}
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={msg.sender?.image || ""} />
                <AvatarFallback className="text-xs">
                  {msg.sender?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isMe
                      ? tc("you").charAt(0).toUpperCase() + tc("you").slice(1)
                      : msg.sender?.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(msg.createdAt || "").toLocaleTimeString(
                      undefined,
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
                {msg.content && (
                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      isMe
                        ? "bg-primary/20 text-foreground"
                        : "bg-muted/40 text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                {msg.fileName && (
                  <div className="mt-1 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {msg.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {msg.fileType}
                      </p>
                    </div>
                    {msg.fileUrl && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Download className="h-4 w-4 text-primary hover:text-primary/80" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="flex-1 bg-muted/30 text-foreground text-sm px-3 py-2 rounded-lg border border-border/30 focus:border-primary/50 focus:outline-none placeholder:text-muted-foreground/50"
          />
          <Button
            size="sm"
            onClick={sendTextMessage}
            disabled={!inputValue.trim() || isSending}
            className="h-9 w-9 p-0 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
