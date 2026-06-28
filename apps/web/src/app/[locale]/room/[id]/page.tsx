"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useChat,
  useDataChannel,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  type RecordingConsentPayload,
  type StartRecordingPayload,
  type StopRecordingPayload,
} from "@skil-ex2/shared";
import { Track } from "livekit-client";
import {
  AlertCircle,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Square,
  Video,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
}



type RecordingState =
  | "idle"
  | "requesting_consent"
  | "waiting_for_partner"
  | "starting"
  | "recording"
  | "processing";

/** Messages sent over the 'recording' data channel */
type RecordingSignal =
  | { type: "consent_request" }
  | { type: "consent_accept" }
  | { type: "consent_decline" }
  | { type: "consent_error" }
  | { type: "recording_started"; approvedMinutes?: number; stopAt?: number }
  | { type: "recording_stopped" }
  | { type: "recording_completed" }
  | { type: "recording_failed" };

interface RecordingEstimate {
  rate: number;
  userBalance: number;
  maxAffordableMinutes: number;
  remainingSessionMinutes: number;
}

interface SessionTiming {
  session: {
    id: string;
    scheduledAt: string;
    duration: number;
    endsAt: string;
  } | null;
}

const API = process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL;

/* ─── Main Page ─────────────────────────────────────── */

export default function RoomPage() {
  const t = useTranslations("room");
  const c = useTranslations("common");

  const params = useParams();
  const roomNameOrId = params.id as string;
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [exchangeSessionId, setExchangeSessionId] = useState<string>("");
  const [exchangeId, setExchangeId] = useState<string>("");

  const [sessionTiming, setSessionTiming] = useState<SessionTiming | null>(
    null,
  );

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/");
      return;
    }

    if (!roomNameOrId) return;

    const setupRoom = async () => {
      try {
        // Resolve session details first
        const sessionResp = await fetch(
          `${API}/video/session/${encodeURIComponent(roomNameOrId)}`,
          { credentials: "include" },
        );
        if (!sessionResp.ok) {
          const sessionData = await sessionResp.json().catch(() => null);
          throw new Error(
            sessionData?.message || `${t("failedGetVideoToken")}: ${sessionResp.statusText}`,
          );
        }
        const sessionDetails = await sessionResp.json();
        setExchangeSessionId(sessionDetails.sessionId);
        setExchangeId(sessionDetails.exchangeId);
        setSessionTiming({
          session: {
            id: sessionDetails.sessionId,
            scheduledAt: sessionDetails.scheduledAt,
            duration: sessionDetails.duration,
            endsAt: sessionDetails.endsAt,
          },
        });

        // Now request video token for the resolved sessionId
        const tokenResp = await fetch(
          `${API}/video/token?room=${encodeURIComponent(sessionDetails.sessionId)}`,
          { credentials: "include" },
        );
        if (!tokenResp.ok) {
          const tokenData = await tokenResp.json().catch(() => null);
          throw new Error(
            tokenData?.message || `${t("failedGetVideoToken")}: ${tokenResp.statusText}`,
          );
        }
        const tokenData = await tokenResp.json();
        setToken(tokenData.token);
        setServerUrl(tokenData.url);
      } catch (e: unknown) {
        console.error(e);
        const message = e instanceof Error ? e.message : c("unknownError");
        setError(message);
      }
    };

    setupRoom();
  }, [roomNameOrId, session, isPending, router, t, c]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-xl mt-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("videoConnectionError")}</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            {error}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            if (exchangeId) {
              router.push(`/exchanges/${exchangeId}`);
            } else {
              router.back();
            }
          }}
          className="mt-4"
          variant="outline"
        >
          {c("goBack")}
        </Button>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          {t("connectingToRoom")}
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: "calc(100vh - 3.5rem)" }}
      onDisconnected={() => router.push(`/exchanges/${exchangeId}`)}
    >
      <RoomContent
        roomName={roomNameOrId}
        exchangeSessionId={exchangeSessionId}
        sessionTiming={sessionTiming}
        exchangeId={exchangeId}
      />
    </LiveKitRoom>
  );
}

/* ─── Room Content (inside LiveKitRoom) ───────────── */

function RoomContent({
  roomName,
  exchangeSessionId,
  sessionTiming,
  exchangeId,
}: {
  roomName: string;
  exchangeSessionId: string;
  sessionTiming: SessionTiming | null;
  exchangeId: string;
}) {
  const t = useTranslations("room");
  const c = useTranslations("common");

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [estimate, setEstimate] = useState<RecordingEstimate | null>(null);
  const [isCheckingEstimate, setIsCheckingEstimate] = useState(false);
  const [recordingStopAt, setRecordingStopAt] = useState<number | null>(null);

  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Safety timeout for "processing" state
  useEffect(() => {
    if (recordingState === "processing") {
      const timer = setTimeout(() => {
        console.warn(
          "[Recording] Processing timeout reached. Reverting to idle.",
        );
        setRecordingState("idle");
        toast.error(t("processingTimeout"));
      }, 60000); // 60 seconds

      return () => clearTimeout(timer);
    }
  }, [recordingState, t]);



  /* ─── Data channel for recording consent signaling ──── */
  const encoder = useRef(new TextEncoder());
  const decoder = useRef(new TextDecoder());

  const { send: sendRecordingSignal } = useDataChannel("recording");

  const sendSignal = useCallback(
    (signal: RecordingSignal) => {
      console.log("[Recording] Sending signal:", signal);
      const payload = encoder.current.encode(JSON.stringify(signal));
      sendRecordingSignal(payload, { reliable: true });
    },
    [sendRecordingSignal],
  );

  // Note: These actions will be used by the message handler
  const handleStartRecording = useCallback(async () => {
    if (!exchangeSessionId) return;
    console.log("[Recording] Trigging start recording API...");
    try {
      const body: StartRecordingPayload = { exchangeSessionId };
      const resp = await fetch(`${API}/video/recording/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log("[Recording] Start API succeeded", data);
        setRecordingState("recording");
        setShowConsentDialog(false);
        const approvedMinutes = data.approvedMinutes || 0;
        let stopAt = approvedMinutes ? Date.now() + approvedMinutes * 60 * 1000 : undefined;
        if (stopAt && sessionTiming?.session?.endsAt) {
          const sessionEndTime = new Date(sessionTiming.session.endsAt).getTime();
          stopAt = Math.min(stopAt, sessionEndTime);
        }
        sendSignal({ type: "recording_started", approvedMinutes, stopAt });
        if (stopAt) {
          setRecordingStopAt(stopAt);
        }
      } else {
        const err = await resp
          .json()
          .catch(() => ({ message: c("unknownError") }));
        console.error("[Recording] Start API failed:", err);
        toast.error(t("startRecordingFailed", { error: err.message || c("unknownError") }));
        setRecordingState("idle");
        sendSignal({ type: "consent_error" });
      }
    } catch (err) {
      console.error("[Recording] Start API exception:", err);
      setRecordingState("idle");
      sendSignal({ type: "consent_error" });
    }
  }, [exchangeSessionId, sendSignal, sessionTiming, t, c]);

  const onRecordingMessage = useCallback(
    (msg: { payload: Uint8Array }) => {
      const decoded = decoder.current.decode(msg.payload);
      console.log("[Recording] Received signal:", decoded);
      try {
        const signal: RecordingSignal = JSON.parse(decoded);

        switch (signal.type) {
          case "consent_request":
            console.log("[Recording] Show consent dialog");
            setShowConsentDialog(true);
            setRecordingState("requesting_consent");
            break;
          case "consent_accept":
            console.log("[Recording] Partner accepted, starting recording...");
            setRecordingState("starting");
            handleStartRecording();
            break;
          case "consent_decline":
            console.log("[Recording] Partner declined");
            setRecordingState("idle");
            setShowConsentDialog(false);
            break;
          case "consent_error":
            console.error(
              "[Recording] Partner encountered an error during consent",
            );
            setRecordingState("idle");
            setShowConsentDialog(false);
            toast.error(t("partnerConsentFailed"));
            break;
          case "recording_started":
            console.log("[Recording] Recording is now active", signal);
            setRecordingState("recording");
            setShowConsentDialog(false);
            if (signal.stopAt) {
              let stopAt = signal.stopAt;
              if (sessionTiming?.session?.endsAt) {
                const sessionEndTime = new Date(sessionTiming.session.endsAt).getTime();
                stopAt = Math.min(stopAt, sessionEndTime);
              }
              setRecordingStopAt(stopAt);
            }
            break;
          case "recording_stopped":
            console.log("[Recording] Recording stopped, processing...");
            setRecordingState("processing");
            setRecordingStopAt(null);
            break;

          case "recording_completed":
            console.log("[Recording] Recording completed!");
            setRecordingState("idle");
            setRecordingStopAt(null);
            toast.success(t("recordingSuccess"));
            break;

          case "recording_failed":
            console.error("[Recording] Recording failed during processing");
            setRecordingState("idle");
            setRecordingStopAt(null);
            toast.error(t("recordingFailed"));
            break;
        }
      } catch (err) {
        console.error("[Recording] Failed to parse message:", err);
      }
    },
    [decoder, handleStartRecording, sessionTiming, t],
  );

  // Listen to ALL data packets (including those from backend which have no topic)
  useDataChannel(onRecordingMessage);

  const handleCheckEstimate = useCallback(async () => {
    if (!exchangeSessionId) return;
    setIsCheckingEstimate(true);
    try {
      const resp = await fetch(
        `${API}/video/recording/estimate?room=${encodeURIComponent(exchangeSessionId)}`,
        { credentials: "include" },
      );
      if (!resp.ok) {
        throw new Error("Failed to get recording estimate");
      }
      const data = await resp.json();
      setEstimate(data);
      setShowEstimateDialog(true);
    } catch (err) {
      console.error(err);
      toast.error(t("failedGetEstimate") || "Failed to check recording estimate.");
    } finally {
      setIsCheckingEstimate(false);
    }
  }, [exchangeSessionId, t]);

  /* ─── Recording actions ─────────────────────────────── */

  // User clicks "Record" → send consent request to partner + submit own consent
  const handleRequestRecording = useCallback(async () => {
    if (!exchangeSessionId) {
      console.error("[Recording] Cannot start: exchangeSessionId is missing");
      return;
    }

    console.log(
      "[Recording] Requesting recording for session:",
      exchangeSessionId,
    );

    // Submit our own consent to the server
    try {
      const body: RecordingConsentPayload = {
        exchangeSessionId,
        consented: true,
      };
      const resp = await fetch(`${API}/video/recording/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("[Recording] Own consent failed:", errorData);
        toast.error(t("consentInitFailed"));
        setRecordingState("idle");
        return;
      }
    } catch (err) {
      console.error("[Recording] Failed to submit initial consent:", err);
      toast.error(t("connectRecordingFailed"));
      setRecordingState("idle");
      return;
    }

    // Signal partner to show their consent dialog
    sendSignal({ type: "consent_request" });
    setRecordingState("waiting_for_partner");
  }, [exchangeSessionId, sendSignal, t]);

  // User responds to consent dialog
  const handleConsentSubmit = useCallback(
    async (consented: boolean) => {
      setShowConsentDialog(false);
      console.log("[Recording] User responded to consent:", consented);

      if (!consented) {
        sendSignal({ type: "consent_decline" });
        setRecordingState("idle");
        return;
      }

      // Submit consent to server
      try {
        const body: RecordingConsentPayload = {
          exchangeSessionId,
          consented: true,
        };
        const resp = await fetch(`${API}/video/recording/consent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          console.error("[Recording] Partner consent failed:", errorData);
          toast.error(t("submitConsentFailed"));
          sendSignal({ type: "consent_error" }); // Inform requester that we failed
          setRecordingState("idle");
          return;
        }
      } catch (err) {
        console.error("[Recording] Failed to submit partner consent:", err);
        toast.error(t("networkErrorConsent"));
        sendSignal({ type: "consent_error" }); // Inform requester that we failed
        setRecordingState("idle");
        return;
      }

      // Tell partner we accepted — they will start the recording
      sendSignal({ type: "consent_accept" });
      setRecordingState("starting"); // will switch to "recording" when partner signals back
    },
    [exchangeSessionId, sendSignal, t],
  );

  const handleCancelRecordingRequest = useCallback(() => {
    setRecordingState("idle");
    sendSignal({ type: "consent_decline" });
  }, [sendSignal]);

  const handleStopRecording = useCallback(async () => {
    if (!exchangeSessionId) return;
    console.log("[Recording] Triggering stop recording API...");
    try {
      const body: StopRecordingPayload = { exchangeSessionId };
      const resp = await fetch(`${API}/video/recording/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        console.log("[Recording] Stop API succeeded");
        setRecordingState("processing");
        setRecordingStopAt(null);
        sendSignal({ type: "recording_stopped" });
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error("[Recording] Stop API failed:", errorData);
        toast.error(
          t("stopRecordingFailed", { error: (errorData as { message?: string }).message || c("unknownError") }),
        );
      }
    } catch (err) {
      console.error("[Recording] Stop API exception:", err);
    }
  }, [exchangeSessionId, sendSignal, t, c]);

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col relative">
      {/* Room header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="px-3 py-1 bg-black/50 backdrop-blur border border-white/10 rounded-full text-white text-sm font-medium">
          {t("roomLabel", { name: roomName })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsChatOpen((prev) => {
              const next = !prev;
              if (next) {
                setUnreadCount(0);
                // Mark as read on the server
                if (exchangeSessionId) {
                  fetch(`${API}/video/chat/${exchangeSessionId}/read`, {
                    method: "PATCH",
                    credentials: "include",
                  }).catch(() => {});
                }
              }
              return next;
            });
          }}
          className={`h-8 gap-1.5 border-white/10 backdrop-blur text-white hover:text-white relative ${
            isChatOpen
              ? "bg-primary/30 hover:bg-primary/40"
              : "bg-black/50 hover:bg-black/70"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {t("chat")}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {exchangeSessionId && (
          <RecordingControls
            recordingState={recordingState}
            onCheckEstimate={handleCheckEstimate}
            onStopRecording={handleStopRecording}
            onCancelRecordingRequest={handleCancelRecordingRequest}
            isCheckingEstimate={isCheckingEstimate}
            recordingStopAt={recordingStopAt}
          />
        )}

        {/* Session Timer */}
        {sessionTiming?.session && (
          <SessionTimer
            endsAt={sessionTiming.session.endsAt}
            duration={sessionTiming.session.duration}
            exchangeId={exchangeId}
          />
        )}
      </div>

      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <MyVideoConference chatOpen={isChatOpen} />
          <RoomAudioRenderer />
          <ControlBar variation="minimal" />
        </div>

        {/* Chat panel — persistent chat using useChat hook */}
        <PersistentChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          exchangeSessionId={exchangeSessionId}
          onNewMessage={() => {
            if (!isChatOpenRef.current) {
              setUnreadCount((c) => c + 1);
            }
          }}
          onInitialUnread={(count) => {
            if (!isChatOpenRef.current && count > 0) {
              setUnreadCount(count);
            }
          }}
        />
      </div>

      <ConsentDialog open={showConsentDialog} onSubmit={handleConsentSubmit} />
      <EstimateDialog
        open={showEstimateDialog}
        estimate={estimate}
        onClose={() => setShowEstimateDialog(false)}
        onConfirm={handleRequestRecording}
      />
    </div>
  );
}

/* ─── Persistent Chat Panel (using useChat hook) ────── */

function PersistentChatPanel({
  isOpen,
  onClose,
  exchangeSessionId,
  onNewMessage,
  onInitialUnread,
}: {
  isOpen: boolean;
  onClose: () => void;
  exchangeSessionId: string;
  onNewMessage: () => void;
  onInitialUnread: (count: number) => void;
}) {
  const t = useTranslations("room");
  const c = useTranslations("common");

  const { chatMessages, send, isSending } = useChat();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLiveCountRef = useRef(chatMessages.length);
  const isOpenRef = useRef(isOpen);

  // Keep isOpenRef in sync for use in cleanup
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Mark as read on unmount if panel was open (e.g. user leaves room)
  useEffect(() => {
    return () => {
      if (isOpenRef.current && exchangeSessionId) {
        fetch(`${API}/video/chat/${exchangeSessionId}/read`, {
          method: "PATCH",
          credentials: "include",
        }).catch(() => {});
      }
    };
  }, [exchangeSessionId]);

  // Fetch history on mount — API now returns { messages, unreadCount }
  useEffect(() => {
    if (!exchangeSessionId) return;
    fetch(`${API}/video/chat/${exchangeSessionId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: { messages: ChatMessage[]; unreadCount: number }) => {
        setHistory(data.messages);
        if (data.unreadCount > 0) {
          onInitialUnread(data.unreadCount);
        }
      })
      .catch((err) => console.error("[Chat] History fetch failed:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeSessionId]);

  // Combine history and real-time livekit messages
  const allMessages = useMemo(() => {
    const historical = history.map((msg) => ({
      message: msg.message,
      from: {
        identity: msg.senderId,
        name: msg.sender?.name,
      },
      timestamp: new Date(msg.timestamp).getTime(),
    }));

    const combined = [...historical, ...chatMessages];

    // Deduplicate by (sender + message + timestamp rounded to 5s)
    const seen = new Set<string>();
    const unique = combined.filter((msg) => {
      const key = `${msg.from?.identity}-${msg.message}-${Math.floor(msg.timestamp / 5000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => a.timestamp - b.timestamp);
  }, [history, chatMessages]);

  // Track only LIVE messages for unread notification
  // If panel is open, mark as read instead of incrementing unread count
  useEffect(() => {
    if (chatMessages.length > prevLiveCountRef.current) {
      if (isOpen) {
        // User can see the new message — update lastReadAt on server
        fetch(`${API}/video/chat/${exchangeSessionId}/read`, {
          method: "PATCH",
          credentials: "include",
        }).catch(() => {});
      } else {
        onNewMessage();
      }
    }
    prevLiveCountRef.current = chatMessages.length;
  }, [chatMessages.length, onNewMessage, isOpen, exchangeSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const handleSend = useCallback(async () => {
    const msg = inputValue.trim();
    if (!msg || isSending) return;

    setInputValue("");

    // Send via LiveKit data channel (real-time display)
    await send(msg);

    // Persist to backend (fire-and-forget)
    if (exchangeSessionId) {
      fetch(`${API}/video/chat/${exchangeSessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg }),
      }).catch((err) => {
        console.warn("[Chat] Failed to persist message:", err);
      });
    }
  }, [inputValue, isSending, send, exchangeSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`border-l border-white/10 bg-zinc-900/80 backdrop-blur flex flex-col transition-all duration-200 ${
        isOpen ? "w-80" : "w-0 overflow-hidden"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 min-w-[320px]">
        <h3 className="text-sm font-semibold text-white">{t("chat")}</h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-w-[320px]">
        {allMessages.length === 0 && (
          <p className="text-zinc-500 text-xs text-center mt-8">
            {t("noMessages")}
          </p>
        )}
        {allMessages.map((msg, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-primary/80">
                {msg.from?.name || msg.from?.identity || c("unknown")}
              </span>
              <span className="text-[10px] text-zinc-600">
                {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed wrap-break-word">
              {msg.message}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/10 min-w-[320px]">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="flex-1 bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none placeholder:text-zinc-500"
          />
          <Button
            size="sm"
            onClick={handleSend}
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

/* ─── Session Timer ───────────────────────────────────── */

function SessionTimer({
  endsAt,
  duration,
  exchangeId,
}: {
  endsAt: string;
  duration: number;
  exchangeId: string;
}) {
  const t = useTranslations("room");
  const [remaining, setRemaining] = useState<string>("");
  const [isWarning, setIsWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const endTime = new Date(endsAt).getTime();

    const update = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setRemaining("0:00");
        setIsExpired(true);
        toast.error(
          t("sessionEndedDisconnect"),
        );
        // Auto-disconnect after 30 seconds grace
        setTimeout(() => {
          router.push(`/exchanges/${exchangeId}`);
        }, 30000);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);

      // Warning when 5 minutes remain
      if (minutes <= 5 && !isWarning) {
        setIsWarning(true);
        toast.warning(t("sessionWarning", { minutes }));
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, duration, isWarning, router, exchangeId]);

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm font-medium animate-pulse">
        <Clock className="h-3 w-3" />
        {t("sessionEnded")}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
        isWarning
          ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
          : "bg-black/50 border-white/10 text-white"
      }`}
    >
      <Clock className="h-3 w-3" />
      {remaining}
    </div>
  );
}

/* ─── Recording Controls ──────────────────────────────── */

function RecordingControls({
  recordingState,
  onCheckEstimate,
  onStopRecording,
  onCancelRecordingRequest,
  isCheckingEstimate,
  recordingStopAt,
}: {
  recordingState: RecordingState;
  onCheckEstimate: () => void;
  onStopRecording: () => void;
  onCancelRecordingRequest: () => void;
  isCheckingEstimate: boolean;
  recordingStopAt: number | null;
}) {
  const t = useTranslations("room");
  const c = useTranslations("common");
  if (recordingState === "recording") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm font-medium">
          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          {t("recording")}
          {recordingStopAt && <RecordingTimer stopAt={recordingStopAt} />}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onStopRecording}
          className="h-8 gap-1.5 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          <Square className="h-3 w-3 fill-current" />
          {t("stopBtn")}
        </Button>
      </div>
    );
  }

  if (recordingState === "waiting_for_partner") {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        {t("waitingPartner")}
        <button
          onClick={() => {
            onCancelRecordingRequest();
          }}
          className="ml-2 underline hover:text-amber-400 cursor-pointer"
        >
          {c("cancel")}
        </button>
      </div>
    );
  }

  if (recordingState === "requesting_consent") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("waitingForConsent")}
      </span>
    );
  }

  if (recordingState === "starting" || recordingState === "processing") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        {recordingState === "starting" ? t("startingRecording") : t("processing")}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isCheckingEstimate}
      onClick={onCheckEstimate}
      className="h-8 gap-1.5 border-white/10 backdrop-blur bg-black/50 hover:bg-black/70 text-white hover:text-white"
    >
      {isCheckingEstimate ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Video className="h-4 w-4" />
      )}
      {t("recordSession")}
    </Button>
  );
}

function RecordingTimer({ stopAt }: { stopAt: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [colorClass, setColorClass] = useState<string>("text-white");

  useEffect(() => {
    const update = () => {
      const remainingMs = stopAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("0:00");
        setColorClass("text-red-500 font-bold");
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);

      if (minutes < 1) {
        setColorClass("text-red-500 font-semibold animate-pulse");
      } else if (minutes < 2) {
        setColorClass("text-amber-500 font-semibold");
      } else {
        setColorClass("text-emerald-400 font-medium");
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [stopAt]);

  return <span className={`ml-1.5 ${colorClass}`}>{timeLeft}</span>;
}

function EstimateDialog({
  open,
  estimate,
  onClose,
  onConfirm,
}: {
  open: boolean;
  estimate: RecordingEstimate | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("room");
  const c = useTranslations("common");

  if (!estimate) return null;

  const { rate, userBalance, maxAffordableMinutes, remainingSessionMinutes } = estimate;
  const fullSessionCost = remainingSessionMinutes * rate;
  const isInsufficient = maxAffordableMinutes < 1;
  const isPartial = maxAffordableMinutes < remainingSessionMinutes && maxAffordableMinutes >= 1;
  const isHealthy = maxAffordableMinutes >= remainingSessionMinutes;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-zinc-900 text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="h-5 w-5 text-primary" />
            {t("billingEstimateTitle")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t("billingEstimateDesc", { rate })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-zinc-400">{t("yourBalance")}</span>
            <span className="font-semibold text-white">{userBalance} pts</span>
          </div>

          {isHealthy && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400">
              <p className="font-medium text-emerald-300">
                {t("estimateHealthyTitle")}
              </p>
              <p className="text-xs mt-1 leading-relaxed text-emerald-400/90">
                {t("estimateHealthyDesc", {
                  rate,
                  minutes: remainingSessionMinutes,
                  cost: fullSessionCost,
                })}
              </p>
            </div>
          )}

          {isPartial && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400">
              <p className="font-medium text-amber-300">
                ⚠️ {t("estimatePartialTitle")}
              </p>
              <p className="text-xs mt-1 leading-relaxed text-amber-400/90">
                {t("estimatePartialDesc", {
                  minutes: maxAffordableMinutes,
                })}
              </p>
            </div>
          )}

          {isInsufficient && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400">
              <p className="font-medium text-red-300">
                🚫 {t("estimateInsufficientTitle")}
              </p>
              <p className="text-xs mt-1 leading-relaxed text-red-400/90">
                {t("estimateInsufficientDesc", { minRequired: rate })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2 pt-2 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-zinc-800 hover:text-white text-zinc-300 bg-transparent">
            {c("cancel")}
          </Button>
          {!isInsufficient && (
            <Button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {t("proceed")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Consent Dialog ──────────────────────────────────── */

function ConsentDialog({
  open,
  onSubmit,
}: {
  open: boolean;
  onSubmit: (consented: boolean) => void;
}) {
  const t = useTranslations("room");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSubmit(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-400" />
            {t("consentDialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
              {t("consentDialogDesc")}
            <p className="text-sm text-amber-400">
              {t("consentDialogWarning")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onSubmit(false)}>
            {t("iDecline")}
          </Button>
          <Button
            onClick={() => onSubmit(true)}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {t("iConsent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Video Grid ──────────────────────────────────────── */

function MyVideoConference({ chatOpen }: { chatOpen: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout
      tracks={tracks}
      style={{
        height: chatOpen ? "calc(100vh - 120px)" : "calc(100vh - 120px)",
      }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}
