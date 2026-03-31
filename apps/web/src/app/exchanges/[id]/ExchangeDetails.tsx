"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Coins,
  CheckCircle2,
  Video,
  XCircle,
  Star,
  BookOpen,
  MessageSquare,
  Play,
  Send,
  Paperclip,
  FileText,
  Download,
  Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  };
  currentUser: { id: string; name: string; image: string | null };
}) {

  const router = useRouter();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [updating, setUpdating] = useState<string | null>(null);

  // Recording playback
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Session chat viewer
  const [sessionChatMessages, setSessionChatMessages] = useState<
    ChatMessage[]
  >([]);
  const [sessionChatOpen, setSessionChatOpen] = useState(false);

  const isSender = exchange.senderId === currentUser.id;
  const otherUser = isSender ? exchange.receiver : exchange.sender;
  const iAmCompleted = isSender
    ? exchange.senderCompleted
    : exchange.receiverCompleted;

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
    return session.duration || (session.skillId === exchange.taughtSkillId
      ? exchange.requestedSkillDuration
      : exchange.offeredSkillDuration);
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

      if (!res.ok) throw new Error("Failed to update session");
      toast.success(`Session marked as ${status.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Failed to update session status");
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

      if (!res.ok) throw new Error("Failed to complete exchange");
      toast.success("Exchange marked as completed");

      const data = await res.json();
      if (data.status === "COMPLETED") {
        setIsReviewModalOpen(true);
      }
      router.refresh();
    } catch {
      toast.error("Failed to complete exchange");
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
      await fetch(`${API}/reviews`, {
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

      toast.success("Review submitted successfully!");
      setIsReviewModalOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load recording";
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
        throw new Error(err?.message || "Failed to load recording");
      }
      const data = await res.json();
      setPlaybackUrl(data.url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load recording";
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
      if (!res.ok) throw new Error("Failed to load chat");
      const data = await res.json();
      setSessionChatMessages(data.messages);
      setSessionChatOpen(true);

      // Mark as read when viewing
      fetch(`${API}/video/chat/${sessionId}/read`, {
        method: "PATCH",
        credentials: "include",
      }).catch(() => {});
    } catch {
      toast.error("Failed to load session chat");
    }
  };

  const reviewTags = [
    { value: "GREAT_TEACHER", label: "Great Teacher" },
    { value: "PATIENT", label: "Patient" },
    { value: "KNOWLEDGEABLE", label: "Knowledgeable" },
    { value: "ON_TIME", label: "On Time" },
    { value: "CLEAR_EXPLANATIONS", label: "Clear Explanations" },
    { value: "GOOD_COMMUNICATOR", label: "Good Communicator" },
    { value: "WELL_PREPARED", label: "Well Prepared" },
    { value: "WOULD_EXCHANGE_AGAIN", label: "Would Exchange Again" },
    { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
    { value: "UNRESPONSIVE", label: "Unresponsive" },
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
                  {sessionDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h4>
                <span className="text-muted-foreground text-sm">
                  {sessionDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${sessionStatusColors[session.status]}`}
                >
                  {session.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="font-medium">{session.skill?.name}</span>
                <span>•</span>
                <span>{duration}m</span>
                <span>•</span>
                <span>
                  {isTeacher ? "You teach" : `${teacher.name} teaches`}
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
                Chat
              </Button>

              {(session.status === "SCHEDULED" ||
                session.status === "IN_PROGRESS") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    router.push(`/room/${exchange.id}?sessionId=${session.id}`)
                  }
                >
                  <Video className="h-4 w-4 mr-2" /> Join Room
                </Button>
              )}

              {session.status === "SCHEDULED" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-600 border-green-500/30 hover:bg-green-500/10"
                    onClick={() => updateSessionStatus(session.id, "COMPLETED")}
                    disabled={updating === session.id}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => updateSessionStatus(session.id, "MISSED")}
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
                Recordings
              </p>
              <div className="flex flex-wrap gap-2">
                {recordings.map((rec, idx) => {
                  const isExpired = rec.recordingExpiresAt && new Date() > new Date(rec.recordingExpiresAt);
                  const isCompleted = rec.recordingStatus === 'COMPLETED';
                  const isProcessing = rec.recordingStatus === 'PROCESSING';

                  return (
                    <div key={rec.id} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isCompleted || isExpired || updating === `playback-${rec.id}`}
                        onClick={() => handleWatchRecording(rec.id)}
                        className="h-7 px-2 text-[10px] gap-1"
                      >
                        {updating === `playback-${rec.id}` ? (
                          <Loader2 className="h-2 w-2 animate-spin" />
                        ) : (
                          <Play className="h-2 w-2" />
                        )}
                        Part {recordings.length - idx}
                        {isProcessing && " (Processing...)"}
                        {isExpired && " (Expired)"}
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
                <span>With {otherUser.name}</span>
                <Badge
                  variant="outline"
                  className={statusColors[exchange.status]}
                >
                  {exchange.status}
                </Badge>
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedSessionsCount} of {totalSessions} sessions
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {exchange.pointsAmount}{" "}
                  <Coins className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {exchange.pointsAmount === 0
                    ? "Even skill exchange"
                    : exchange.pointsPayerId === currentUser.id
                      ? "You paid"
                      : "They paid"}
                  {exchange.escrowLocked && " • Escrowed"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold flex items-center gap-2">
                  {exchange.status === "COMPLETED"
                    ? "Finished ✓"
                    : iAmCompleted
                      ? "Awaiting partner"
                      : "Active"}
                </div>
                {exchange.status !== "COMPLETED" && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={completeExchange}
                    disabled={iAmCompleted || updating === "exchange"}
                  >
                    {iAmCompleted ? "✓ Marked Complete" : "Mark as Complete"}
                  </Button>
                )}
                {exchange.status === "COMPLETED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full gap-2"
                    onClick={() => setIsReviewModalOpen(true)}
                  >
                    <Star className="h-4 w-4" /> Leave a Review
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sessions + Chat Tabs */}
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="sessions">
                All Sessions ({exchange.sessions?.length || 0})
              </TabsTrigger>
              {isTwoWay && (
                <>
                  <TabsTrigger value="taught">
                    {exchange.taughtSkill.name} ({taughtSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="received">
                    {exchange.receivedSkill?.name || "Received Skill"} ({receivedSessions.length})
                  </TabsTrigger>

                </>
              )}
              <TabsTrigger value="chat">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-3">
              {!exchange.sessions || exchange.sessions.length === 0 ? (
                <div className="py-12 text-center border rounded-lg bg-card/20">
                  <p className="text-muted-foreground">
                    No sessions scheduled yet.
                  </p>
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
                        No {exchange.taughtSkill.name} sessions yet.
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
                        No {exchange.receivedSkill?.name || "received skill"} sessions yet.
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
                otherUser={otherUser}
              />
            </TabsContent>

            <TabsContent
              value="details"
              className="bg-card/40 p-6 rounded-xl border border-border/50"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-foreground/80 mb-4 uppercase tracking-wider">
                    Exchange Participants
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
                        <p className="text-sm font-medium">You</p>
                        <p className="text-xs text-muted-foreground">
                          {isSender ? "Sender" : "Receiver"}
                        </p>
                      </div>
                    </div>
                    <ArrowRightLeft className="text-muted-foreground h-5 w-5" />
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={otherUser.image || ""} />
                        <AvatarFallback>
                          {otherUser.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{otherUser.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isSender ? "Receiver" : "Sender"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isTwoWay && (
                  <div className="border-t border-border/40 pt-4">
                    <h3 className="font-semibold text-sm text-foreground/80 mb-3 uppercase tracking-wider">
                      Skills Being Exchanged
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-card/50 rounded-lg border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {exchange.receiver.name} teaches
                        </p>
                        <p className="font-medium">
                          {exchange.taughtSkill.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {exchange.requestedSkillSessions} sessions ×{" "}
                          {exchange.requestedSkillDuration}m
                        </p>
                      </div>
                      <div className="p-3 bg-card/50 rounded-lg border border-border/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {exchange.sender.name} teaches
                        </p>
                        <p className="font-medium">
                          {exchange.receivedSkill?.name || "N/A"}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {exchange.offeredSkillSessions} sessions ×{" "}
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
              <CardTitle className="text-lg">Exchange Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Sessions</span>
                  <span className="font-medium">{totalSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
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
                        {exchange.receivedSkill?.name || "Received Skill"}
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-medium text-amber-500">
                    {exchange.pointsAmount} pts
                  </span>
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
              Session Recording
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
              Session Chat History
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {sessionChatMessages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No chat messages in this session.
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
                          ? "You"
                          : msg.sender.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(
                          msg.timestamp || msg.createdAt || "",
                        ).toLocaleTimeString([], {
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
            <DialogTitle>Review your Exchange</DialogTitle>
            <DialogDescription>
              How was your experience with {otherUser.name}?
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
            <p className="text-sm font-medium">{rating} out of 5 stars</p>

            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Tags (select all that apply)
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
              Later
            </Button>
            <Button onClick={submitReview} disabled={updating === "review"}>
              Submit Review
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
  otherUser: { id: string; name: string; image: string | null };
}) {
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
        toast.error("Failed to send message");
        setInputValue(msg); // restore
      }
    } catch {
      toast.error("Failed to send message");
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

      if (!uploadRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key } = await uploadRes.json();

      // 2. Upload file to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Failed to upload file");

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
        toast.success("File shared successfully");
      }
    } catch {
      toast.error("Failed to upload file");
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
    <div className="border rounded-xl bg-card/30 flex flex-col" style={{ height: "500px" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Send a message or share a document!
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
                    {isMe ? "You" : msg.sender?.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(msg.createdAt || "").toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
            placeholder="Type a message..."
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
