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
import { useSession } from "@/lib/auth-client";
import {
  Chat,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
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
  Loader2,
  MessageSquare,
  Square,
  Video,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────── */

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
  | { type: "recording_started" }
  | { type: "recording_stopped" }
  | { type: "recording_completed" }
  | { type: "recording_failed" };

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

/* ─── Main Page ─────────────────────────────────────── */

export default function RoomPage() {
  const params = useParams();
  const roomName = params.id as string;
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Fetch exchange session ID for recording API calls
  const [exchangeSessionId, setExchangeSessionId] = useState<string>("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
      return;
    }

    if (session?.user) {
      const setupRoom = async () => {
        try {
          const resp = await fetch(
            `${API}/video/token?room=${encodeURIComponent(roomName)}`,
            { credentials: "include" },
          );
          if (!resp.ok) {
            const data = await resp.json().catch(() => null);
            throw new Error(
              data?.message || `Failed to get video token: ${resp.statusText}`,
            );
          }
          const data = await resp.json();
          setToken(data.token);
          setServerUrl(data.url);
        } catch (e: unknown) {
          console.error(e);
          const message = e instanceof Error ? e.message : "Unknown error";
          setError(message);
        }
      };
      setupRoom();
    }
  }, [roomName, session, isPending, router]);

  // Fetch exchange session ID
  useEffect(() => {
    if (!roomName) return;
    const fetchSession = async () => {
      try {
        const resp = await fetch(`${API}/exchanges/${roomName}`, {
          credentials: "include",
        });
        if (resp.ok) {
          const exchange = await resp.json();
          const sessions = exchange?.sessions;
          if (sessions?.length > 0) {
            const sorted = [...sessions].sort(
              (a: { scheduledAt: string }, b: { scheduledAt: string }) =>
                new Date(b.scheduledAt).getTime() -
                new Date(a.scheduledAt).getTime(),
            );
            setExchangeSessionId(sorted[0].id);
          }
        }
      } catch {
        // Non-critical — recording just won't be available
      }
    };
    fetchSession();
  }, [roomName]);

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
          <AlertTitle>Video Connection Error</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            {error}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.back()}
          className="mt-4"
          variant="outline"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Connecting to room...
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
      onDisconnected={() => router.push(`/exchanges`)}
    >
      <RoomContent roomName={roomName} exchangeSessionId={exchangeSessionId} />
    </LiveKitRoom>
  );
}

/* ─── Room Content (inside LiveKitRoom) ───────────── */

function RoomContent({
  roomName,
  exchangeSessionId,
}: {
  roomName: string;
  exchangeSessionId: string;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [showConsentDialog, setShowConsentDialog] = useState(false);

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
        toast.error(
          "Recording processing is taking longer than expected. You can try starting a new recording if needed.",
        );
      }, 60000); // 60 seconds

      return () => clearTimeout(timer);
    }
  }, [recordingState]);

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
        console.log("[Recording] Start API succeeded");
        setRecordingState("recording");
        setShowConsentDialog(false);
        sendSignal({ type: "recording_started" });
      } else {
        const err = await resp
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("[Recording] Start API failed:", err);
        toast.error(
          `Failed to start recording: ${err.message || "Unknown error"}`,
        );
        setRecordingState("idle");
        sendSignal({ type: "consent_error" });
      }
    } catch (err) {
      console.error("[Recording] Start API exception:", err);
      setRecordingState("idle");
      sendSignal({ type: "consent_error" });
    }
  }, [exchangeSessionId, sendSignal]);

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
            toast.error(
              "Partner's consent submission failed. Please try again.",
            );
            break;
          case "recording_started":
            console.log("[Recording] Recording is now active");
            setRecordingState("recording");
            setShowConsentDialog(false);
            break;
          case "recording_stopped":
            console.log("[Recording] Recording stopped, processing...");
            setRecordingState("processing");
            break;

          case "recording_completed":
            console.log("[Recording] Recording completed!");
            setRecordingState("idle");
            toast.success("Recording saved and processed successfully.");
            break;

          case "recording_failed":
            console.error("[Recording] Recording failed during processing");
            setRecordingState("idle");
            toast.error(
              "Recording processing failed. Please check backend logs.",
            );
            break;
        }
      } catch (err) {
        console.error("[Recording] Failed to parse message:", err);
      }
    },
    [decoder, handleStartRecording],
  );

  // Listen to ALL data packets (including those from backend which have no topic)
  useDataChannel(onRecordingMessage);

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
        toast.error("Failed to initialize recording consent.");
        setRecordingState("idle");
        return;
      }
    } catch (err) {
      console.error("[Recording] Failed to submit initial consent:", err);
      toast.error("Failed to connect to recording service.");
      setRecordingState("idle");
      return;
    }

    // Signal partner to show their consent dialog
    sendSignal({ type: "consent_request" });
    setRecordingState("waiting_for_partner");
  }, [exchangeSessionId, sendSignal]);

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
          toast.error("Failed to submit your consent. Please try again.");
          sendSignal({ type: "consent_error" }); // Inform requester that we failed
          setRecordingState("idle");
          return;
        }
      } catch (err) {
        console.error("[Recording] Failed to submit partner consent:", err);
        toast.error("Network error while submitting consent.");
        sendSignal({ type: "consent_error" }); // Inform requester that we failed
        setRecordingState("idle");
        return;
      }

      // Tell partner we accepted — they will start the recording
      sendSignal({ type: "consent_accept" });
      setRecordingState("starting"); // will switch to "recording" when partner signals back
    },
    [exchangeSessionId, sendSignal],
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
        sendSignal({ type: "recording_stopped" });
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error("[Recording] Stop API failed:", errorData);
        toast.error(
          `Failed to stop recording: ${errorData.message || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error("[Recording] Stop API exception:", err);
    }
  }, [exchangeSessionId, sendSignal]);

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col relative">
      {/* Room header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="px-3 py-1 bg-black/50 backdrop-blur border border-white/10 rounded-full text-white text-sm font-medium">
          Room: {roomName}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsChatOpen((prev) => {
              const next = !prev;
              if (next) setUnreadCount(0);
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
          Chat
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {exchangeSessionId && (
          <RecordingControls
            recordingState={recordingState}
            onRequestRecording={handleRequestRecording}
            onStopRecording={handleStopRecording}
            onCancelRecordingRequest={handleCancelRecordingRequest}
          />
        )}
      </div>

      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <MyVideoConference chatOpen={isChatOpen} />
          <RoomAudioRenderer />
          <ControlBar variation="minimal" />
        </div>

        {/* Chat panel — always mounted, hidden via CSS */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
          }}
          onNewMessage={() => {
            if (!isChatOpenRef.current) {
              setUnreadCount((c) => c + 1);
            }
          }}
        />
      </div>

      <ConsentDialog open={showConsentDialog} onSubmit={handleConsentSubmit} />
    </div>
  );
}

/* ─── Chat Panel ──────────────────────────────────────── */

function ChatPanel({
  isOpen,
  onClose,
  onNewMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNewMessage: () => void;
}) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          onNewMessage();
          break;
        }
      }
    });

    const messageList = container.querySelector(".lk-chat-messages");
    if (messageList) {
      observer.observe(messageList, { childList: true });
    } else {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [onNewMessage]);

  return (
    <div
      ref={chatContainerRef}
      className={`border-l border-white/10 bg-zinc-900/80 backdrop-blur flex flex-col transition-all duration-200 ${
        isOpen ? "w-80" : "w-0 overflow-hidden"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 min-w-[320px]">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Chat
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 320,
        }}
      />
    </div>
  );
}

/* ─── Recording Controls ──────────────────────────────── */

function RecordingControls({
  recordingState,
  onRequestRecording,
  onStopRecording,
  onCancelRecordingRequest,
}: {
  recordingState: RecordingState;
  onRequestRecording: () => void;
  onStopRecording: () => void;
  onCancelRecordingRequest: () => void;
}) {
  if (recordingState === "recording") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm font-medium">
          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          Recording
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onStopRecording}
          className="h-8 gap-1.5 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          <Square className="h-3 w-3 fill-current" />
          Stop
        </Button>
      </div>
    );
  }

  if (recordingState === "waiting_for_partner") {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        Waiting for partner...
        <button
          onClick={() => {
            onCancelRecordingRequest(); // Call the new prop
          }}
          className="ml-2 underline hover:text-amber-400 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (recordingState === "requesting_consent") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        Waiting for consent
      </span>
    );
  }

  if (recordingState === "starting" || recordingState === "processing") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        {recordingState === "starting" ? "Starting..." : "Processing..."}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRequestRecording}
      className="h-8 gap-1.5 border-white/10 backdrop-blur bg-black/50 hover:bg-black/70 text-white hover:text-white"
    >
      <Video className="h-4 w-4" />
      Record
    </Button>
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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSubmit(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-400" />
            Record This Session
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              Your partner is requesting to record this session. The recording
              will be saved as a video file and stored securely.
            </p>
            <p className="text-sm text-amber-400">
              ⚠️ Both participants must agree before recording begins.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onSubmit(false)}>
            Decline
          </Button>
          <Button
            onClick={() => onSubmit(true)}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            I Consent to Recording
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
