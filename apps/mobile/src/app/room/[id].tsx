import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  Separator,
  Tabs,
  SkeletonText,
  useToast,
  AlertDialog,
  Progress,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { useT } from 'lib/i18n';
import {
  useVideoSessionDetails,
  useVideoToken,
  useRecordingEstimate,
  useSubmitRecordingConsent,
  useStartRecording,
  useStopRecording,
  useSessionChatMessages,
  useSendSessionChatMessage,
  useMarkSessionChatRead,
  useCurrentUser,
  usePointsBalance,
} from '@/lib/api-hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  QUERY_KEYS,
  formatTimeRemaining,
  formatDateTimeShort,
  type RecordingConsentPayload,
  type StartRecordingPayload,
  type StopRecordingPayload,
} from '@skil-ex2/shared';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Circle,
  Square,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  CalendarClock,
  Info,
  Coins,
  Users,
  MonitorUp,
  SquareX,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { cn } from '@/lib/style-utils';
import {
  LiveKitRoom,
  useRoomContext,
  useParticipants,
  useDataChannel,
  VideoTrack,
  AudioSession,
} from '@livekit/react-native';
import { Track, VideoCaptureOptions } from 'livekit-client';

/* ─── Recording & Signal Types ───────────────────────── */
type RecordingState =
  | 'idle'
  | 'requesting_consent'
  | 'waiting_for_partner'
  | 'starting'
  | 'recording'
  | 'processing';

type RecordingSignal =
  | { type: 'consent_request' }
  | { type: 'consent_accept' }
  | { type: 'consent_decline' }
  | { type: 'consent_error' }
  | { type: 'recording_started'; approvedMinutes?: number; stopAt?: number }
  | { type: 'recording_stopped' }
  | { type: 'recording_completed' }
  | { type: 'recording_failed' }
  | { type: 'chat_sent' };

interface RecordingEstimateData {
  rate: number;
  userBalance: number;
  maxAffordableMinutes: number;
  remainingSessionMinutes: number;
}

interface ChatMessageItem {
  id: string;
  senderId: string;
  message: string;
  timestamp: string;
  sender?: {
    id: string;
    name: string;
    image: string | null;
  };
}

/* ─── LiveKit Data Channel Signal Handler ─────────────── */
function RecordingDataChannelHandler({
  onInboundSignal,
  setSendSignal,
}: {
  onInboundSignal: (rawString: string) => void;
  setSendSignal: (fn: (signal: RecordingSignal) => void) => void;
}) {
  const { send } = useDataChannel('recording', (message) => {
    try {
      const Decoder = (globalThis as any).TextDecoder ?? String;
      const rawString =
        typeof Decoder === 'function' && Decoder !== String
          ? new Decoder().decode(message.payload)
          : String.fromCharCode.apply(null, Array.from(message.payload));
      onInboundSignal(rawString);
    } catch (e) {
      console.warn('[DataChannel] Error decoding message:', e);
    }
  });

  useEffect(() => {
    if (send) {
      setSendSignal((signal: RecordingSignal) => {
        try {
          const Encoder = (globalThis as any).TextEncoder;
          const str = JSON.stringify(signal);
          const payload = Encoder
            ? new Encoder().encode(str)
            : new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
          send(payload, { reliable: true });
        } catch (e) {
          console.warn('[DataChannel] Error sending signal:', e);
        }
      });
    }
  }, [send, setSendSignal]);

  return null;
}

/* ─── Main Room Screen ────────────────────────────────── */
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT('room');
  const c = useT('common');

  const roomNameOrId = id!;

  /* ─── Session Details & Token queries ──── */
  const detailsQ = useVideoSessionDetails(roomNameOrId);
  const userQ = useCurrentUser();
  const pointsQ = usePointsBalance();
  const currentUser = userQ.data as any;

  const queryClient = useQueryClient();

  const exchangeSessionId = detailsQ.data?.session?.id ?? detailsQ.data?.sessionId ?? detailsQ.data?.id ?? roomNameOrId;
  const exchangeId = detailsQ.data?.exchangeId ?? detailsQ.data?.session?.exchangeId ?? '';

  const tokenQ = useVideoToken(exchangeSessionId);
  const token = (tokenQ.data as any)?.token ?? '';
  const serverUrl = (tokenQ.data as any)?.url ?? '';

  /* ─── Recording State Machine ──── */
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingStopAt, setRecordingStopAt] = useState<number | null>(null);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [estimate, setEstimate] = useState<RecordingEstimateData | null>(null);
  const [isCheckingEstimate, setIsCheckingEstimate] = useState(false);

  const estimateQ = useRecordingEstimate();
  const consentQ = useSubmitRecordingConsent();
  const startRecQ = useStartRecording();
  const stopRecQ = useStopRecording();

  /* ─── Chat & Drawer State ──── */
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  const [confirmLeave, setConfirmLeave] = useState(false);

  /* ─── Real-time Timer ──── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Safety processing timeout
  useEffect(() => {
    if (recordingState === 'processing') {
      const timer = setTimeout(() => {
        setRecordingState('idle');
        toast.toast({ title: t('processingTimeout'), variant: 'error' });
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [recordingState, t, toast]);

  /* ─── Data Channel Signal Emitter ──── */
  const sendSignalRef = useRef<((signal: RecordingSignal) => void) | null>(null);
  const setSendSignal = useCallback((fn: (signal: RecordingSignal) => void) => {
    sendSignalRef.current = fn;
  }, []);

  const sendSignal = useCallback((signal: RecordingSignal) => {
    if (sendSignalRef.current) {
      sendSignalRef.current(signal);
    } else {
      console.log('[Recording] Signal buffer (not connected):', signal);
    }
  }, []);

  /* ─── Recording Action Handlers ──── */
  const handleStartRecording = useCallback(async () => {
    if (!exchangeSessionId) return;
    try {
      setRecordingState('starting');
      const data = await startRecQ.mutateAsync({ exchangeSessionId });
      setRecordingState('recording');
      setShowConsentModal(false);
      const approvedMinutes = data.approvedMinutes || 0;
      let stopAt = approvedMinutes ? Date.now() + approvedMinutes * 60 * 1000 : undefined;
      const sessionEndsAt = detailsQ.data?.endsAt ?? detailsQ.data?.session?.endsAt;
      if (stopAt && sessionEndsAt) {
        stopAt = Math.min(stopAt, new Date(sessionEndsAt).getTime());
      }
      sendSignal({ type: 'recording_started', approvedMinutes, stopAt });
      if (stopAt) {
        setRecordingStopAt(stopAt);
      }
      toast.toast({ title: t('recordingSuccess') ?? 'Recording started', variant: 'success' });
    } catch (err: any) {
      setRecordingState('idle');
      sendSignal({ type: 'consent_error' });
      toast.toast({
        title: t('startRecordingFailed') ?? 'Could not start recording',
        description: err?.message,
        variant: 'error',
      });
    }
  }, [exchangeSessionId, startRecQ, sendSignal, detailsQ.data, t, toast]);

  const handleSignalInbound = useCallback(
    (rawString: string) => {
      try {
        const signal: RecordingSignal = JSON.parse(rawString);
        switch (signal.type) {
          case 'chat_sent':
            if (exchangeSessionId) {
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.video.chat(exchangeSessionId) });
            }
            if (!isChatOpenRef.current) {
              setUnreadCount((cnt) => cnt + 1);
            }
            break;
          case 'consent_request':
            setShowConsentModal(true);
            setRecordingState('requesting_consent');
            break;
          case 'consent_accept':
            setRecordingState('starting');
            handleStartRecording();
            break;
          case 'consent_decline':
            setRecordingState('idle');
            setShowConsentModal(false);
            toast.toast({ title: t('partnerDeclined') ?? 'Partner declined recording', variant: 'warning' });
            break;
          case 'consent_error':
            setRecordingState('idle');
            setShowConsentModal(false);
            toast.toast({ title: t('partnerConsentFailed') ?? 'Partner consent failed', variant: 'error' });
            break;
          case 'recording_started':
            setRecordingState('recording');
            setShowConsentModal(false);
            if (signal.stopAt) {
              let stopAt = signal.stopAt;
              const sessionEndsAt = detailsQ.data?.endsAt ?? detailsQ.data?.session?.endsAt;
              if (sessionEndsAt) {
                stopAt = Math.min(stopAt, new Date(sessionEndsAt).getTime());
              }
              setRecordingStopAt(stopAt);
            }
            toast.toast({ title: t('recordingStarted') ?? 'Recording is now active', variant: 'success' });
            break;
          case 'recording_stopped':
            setRecordingState('processing');
            setRecordingStopAt(null);
            break;
          case 'recording_completed':
            setRecordingState('idle');
            setRecordingStopAt(null);
            toast.toast({ title: t('recordingSaved') ?? 'Recording saved successfully', variant: 'success' });
            break;
          case 'recording_failed':
            setRecordingState('idle');
            setRecordingStopAt(null);
            toast.toast({ title: t('recordingFailed') ?? 'Recording failed', variant: 'error' });
            break;
        }
      } catch (err) {
        console.warn('[Recording] Signal parse error:', err);
      }
    },
    [handleStartRecording, detailsQ.data, t, toast]
  );

  const handleCheckEstimate = useCallback(async () => {
    if (!exchangeSessionId) return;
    setIsCheckingEstimate(true);
    try {
      const data = await estimateQ.mutateAsync(exchangeSessionId);
      setEstimate(data as RecordingEstimateData);
      setShowEstimateModal(true);
    } catch (err: any) {
      toast.toast({
        title: t('failedGetEstimate') ?? 'Failed to check estimate',
        description: err?.message,
        variant: 'error',
      });
    } finally {
      setIsCheckingEstimate(false);
    }
  }, [exchangeSessionId, estimateQ, t, toast]);

  const handleRequestRecording = useCallback(async () => {
    if (!exchangeSessionId) return;
    setShowEstimateModal(false);
    try {
      await consentQ.mutateAsync({ exchangeSessionId, consented: true });
    } catch (err: any) {
      toast.toast({ title: t('consentInitFailed') ?? 'Consent init failed', variant: 'error' });
      setRecordingState('idle');
      return;
    }
    sendSignal({ type: 'consent_request' });
    setRecordingState('waiting_for_partner');
    toast.toast({ title: t('waitingPartner') ?? 'Awaiting partner consent…', variant: 'info' });
  }, [exchangeSessionId, consentQ, sendSignal, t, toast]);

  const handleConsentSubmit = useCallback(
    async (consented: boolean) => {
      setShowConsentModal(false);
      if (!consented) {
        sendSignal({ type: 'consent_decline' });
        setRecordingState('idle');
        return;
      }
      try {
        await consentQ.mutateAsync({ exchangeSessionId, consented: true });
      } catch (err: any) {
        toast.toast({ title: t('submitConsentFailed') ?? 'Consent submission failed', variant: 'error' });
        sendSignal({ type: 'consent_error' });
        setRecordingState('idle');
        return;
      }
      sendSignal({ type: 'consent_accept' });
      setRecordingState('starting');
    },
    [exchangeSessionId, consentQ, sendSignal, t, toast]
  );

  const handleCancelRecordingRequest = useCallback(() => {
    setRecordingState('idle');
    sendSignal({ type: 'consent_decline' });
  }, [sendSignal]);

  const handleStopRecording = useCallback(async () => {
    if (!exchangeSessionId) return;
    try {
      await stopRecQ.mutateAsync({ exchangeSessionId });
      setRecordingState('processing');
      setRecordingStopAt(null);
      sendSignal({ type: 'recording_stopped' });
    } catch (err: any) {
      toast.toast({ title: t('stopRecordingFailed') ?? 'Could not stop recording', variant: 'error' });
    }
  }, [exchangeSessionId, stopRecQ, sendSignal, t, toast]);

  const handleLeave = useCallback(
    (confirm = true) => {
      if (confirm) {
        setConfirmLeave(true);
        return;
      }
      if (recordingState === 'recording') {
        handleStopRecording();
      }
      if (exchangeId) {
        router.replace(`/exchanges/${exchangeId}` as any);
      } else {
        router.back();
      }
    },
    [recordingState, handleStopRecording, exchangeId, router]
  );

  /* ─── Derived Loading & Error ──── */
  const loading = detailsQ.isLoading || tokenQ.isLoading;
  const error =
    (detailsQ.error as any)?.message || (tokenQ.error as any)?.message || null;

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background }}
        edges={['top', 'bottom']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[4] }}>
          <Loader2 size={36} color={theme.primary} />
          <ThemedText type="default" style={{ color: theme.mutedForeground }}>
            {t('connectingToRoom') ?? 'Connecting to session...'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.background }}
        edges={['top', 'bottom']}
      >
        <View
          style={{
            flex: 1,
            padding: SPACING[6],
            gap: SPACING[4],
            justifyContent: 'center',
            maxWidth: MAX_CONTENT_WIDTH,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <View style={{ alignItems: 'center', gap: SPACING[3] }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: RADIUS.pill,
                backgroundColor: getAccent('red').bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={28} color={getAccent('red').main} />
            </View>
            <ThemedText type="title" style={{ fontSize: FONT_SIZE.xl, fontWeight: '700' }}>
              {t('videoConnectionError') ?? 'Connection Error'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
              {error ?? t('failedGetVideoToken') ?? 'Unable to connect to video session.'}
            </ThemedText>
          </View>
          <Button
            variant="outline"
            onPress={() => (exchangeId ? router.replace(`/exchanges/${exchangeId}` as any) : router.back())}
            leftIcon={<ArrowLeft size={16} color={theme.foreground} />}
          >
            {c('goBack') ?? 'Go Back'}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={() => handleLeave(false)}
      >
        {/* Data Channel Handler */}
        <RecordingDataChannelHandler
          onInboundSignal={handleSignalInbound}
          setSendSignal={setSendSignal}
        />

        <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
          {/* Top Bar Header */}
          <TopHeaderBar
            roomName={roomNameOrId}
            details={detailsQ.data}
            onBack={() => handleLeave(true)}
            isChatOpen={isChatOpen}
            onToggleChat={() => {
              setIsChatOpen((prev) => {
                const next = !prev;
                if (next) setUnreadCount(0);
                return next;
              });
            }}
            unreadCount={unreadCount}
            recordingState={recordingState}
            onCheckEstimate={handleCheckEstimate}
            onStopRecording={handleStopRecording}
            onCancelRecordingRequest={handleCancelRecordingRequest}
            isCheckingEstimate={isCheckingEstimate}
            recordingStopAt={recordingStopAt}
            now={now}
          />

          {/* Main Video View */}
          <View style={{ flex: 1, backgroundColor: '#050506' }}>
            <RoomBody
              partner={detailsQ.data?.partner}
              me={currentUser}
              insets={insets}
            />
          </View>

          {/* Persistent Chat Drawer Overlay */}
          {isChatOpen ? (
            <PersistentChatDrawer
              exchangeSessionId={exchangeSessionId}
              onClose={() => setIsChatOpen(false)}
              me={currentUser}
              onSendMessage={() => {
                sendSignal({ type: 'chat_sent' });
              }}
              onNewMessage={() => {
                if (!isChatOpenRef.current) {
                  setUnreadCount((count) => count + 1);
                }
              }}
            />
          ) : null}

          {/* Bottom Floating Control Bar */}
          <ControlsBar
            insets={insets}
            recordingState={recordingState}
            onRecording={
              recordingState === 'recording' || recordingState === 'processing'
                ? handleStopRecording
                : recordingState === 'idle'
                ? handleCheckEstimate
                : undefined
            }
            onToggleChat={() => {
              setIsChatOpen((prev) => {
                const next = !prev;
                if (next) setUnreadCount(0);
                return next;
              });
            }}
            isChatOpen={isChatOpen}
            unreadCount={unreadCount}
            onLeave={() => handleLeave(true)}
          />
        </View>

        {/* Modals */}
        <EstimateModal
          open={showEstimateModal}
          estimate={estimate}
          onClose={() => setShowEstimateModal(false)}
          onConfirm={handleRequestRecording}
        />

        <ConsentModal
          open={showConsentModal}
          onSubmit={handleConsentSubmit}
        />

        <AlertDialog
          open={confirmLeave}
          onOpenChange={setConfirmLeave}
          title={t('leaveSession') ?? 'Leave Video Session'}
          description={
            recordingState === 'recording'
              ? t('leaveSessionRecordingDesc') ?? 'Recording is active. Leaving will stop the recording.'
              : t('leaveSessionDesc') ?? 'Are you sure you want to leave this session?'
          }
          confirmLabel={t('leaveSession') ?? 'Leave'}
          destructive
          onConfirm={() => handleLeave(false)}
        />
      </LiveKitRoom>
    </SafeAreaView>
  );
}

/* ─── Top Header Bar Component ─────────────────────────── */
function TopHeaderBar({
  roomName,
  details,
  onBack,
  isChatOpen,
  onToggleChat,
  unreadCount,
  recordingState,
  onCheckEstimate,
  onStopRecording,
  onCancelRecordingRequest,
  isCheckingEstimate,
  recordingStopAt,
  now,
}: any) {
  const theme = useTheme();
  const t = useT('room');
  const c = useT('common');

  const endsAt = details?.endsAt ?? details?.session?.endsAt;
  const duration = details?.duration ?? details?.session?.duration;

  return (
    <View
      style={{
        position: 'absolute',
        top: SPACING[2],
        left: SPACING[3],
        right: SPACING[3],
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: RADIUS.pill,
            backgroundColor: 'rgba(0,0,0,0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <ArrowLeft size={18} color="#fff" />
        </Pressable>

        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: RADIUS.pill,
            backgroundColor: 'rgba(0,0,0,0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <ThemedText type="smallBold" style={{ fontSize: 12, color: '#fff' }}>
            {t('roomLabel', { name: roomName }) ?? `Room: ${roomName.slice(0, 8)}`}
          </ThemedText>
        </View>

        {endsAt ? <SessionTimer endsAt={endsAt} duration={duration} now={now} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
        <RecordingHeaderBadge
          recordingState={recordingState}
          onCheckEstimate={onCheckEstimate}
          onStopRecording={onStopRecording}
          onCancelRecordingRequest={onCancelRecordingRequest}
          isCheckingEstimate={isCheckingEstimate}
          recordingStopAt={recordingStopAt}
          now={now}
        />

        <Pressable
          onPress={onToggleChat}
          hitSlop={8}
          style={{
            height: 36,
            paddingHorizontal: 12,
            borderRadius: RADIUS.pill,
            backgroundColor: isChatOpen ? getAccent('indigo').main : 'rgba(0,0,0,0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
          }}
        >
          <MessageSquare size={16} color="#fff" />
          <ThemedText type="smallBold" style={{ fontSize: 12, color: '#fff' }}>
            {t('chat') ?? 'Chat'}
          </ThemedText>
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#ef4444',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <ThemedText type="smallBold" style={{ fontSize: 10, color: '#fff' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Session Timer Badge ──────────────────────────────── */
function SessionTimer({ endsAt, duration, now }: { endsAt: string; duration?: number; now: number }) {
  const t = useT('room');
  const endMs = new Date(endsAt).getTime();
  const diff = endMs - now;
  const isExpired = diff <= 0;
  const minutes = Math.floor(Math.max(0, diff) / 60000);
  const seconds = Math.floor((Math.max(0, diff) % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isWarning = minutes < 5 && !isExpired;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: isExpired
          ? 'rgba(239, 68, 68, 0.25)'
          : isWarning
          ? 'rgba(245, 158, 11, 0.25)'
          : 'rgba(0, 0, 0, 0.65)',
        borderWidth: 1,
        borderColor: isExpired
          ? 'rgba(239, 68, 68, 0.5)'
          : isWarning
          ? 'rgba(245, 158, 11, 0.5)'
          : 'rgba(255,255,255,0.15)',
      }}
    >
      <Clock size={12} color={isExpired ? '#fca5a5' : isWarning ? '#fcd34d' : '#e4e4e7'} />
      <ThemedText
        type="smallBold"
        style={{
          fontSize: 11,
          color: isExpired ? '#fca5a5' : isWarning ? '#fcd34d' : '#e4e4e7',
        }}
      >
        {isExpired ? t('sessionEnded') ?? 'Ended' : timeStr}
      </ThemedText>
    </View>
  );
}

/* ─── Recording Header Badge ────────────────────────────── */
function RecordingHeaderBadge({
  recordingState,
  onCheckEstimate,
  onStopRecording,
  onCancelRecordingRequest,
  isCheckingEstimate,
  recordingStopAt,
  now,
}: any) {
  const t = useT('room');
  const c = useT('common');

  if (recordingState === 'recording') {
    const recRemainMs = recordingStopAt ? Math.max(0, recordingStopAt - now) : null;
    const recRemainStr = recRemainMs !== null ? formatTimeRemaining(recRemainMs) : null;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: RADIUS.pill,
            backgroundColor: '#3f1414',
            borderWidth: 1,
            borderColor: '#7f1d1d',
          }}
        >
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }}
          />
          <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fecaca' }}>
            REC {recRemainStr ? `· ${recRemainStr}` : ''}
          </ThemedText>
        </View>

        <Pressable
          onPress={onStopRecording}
          hitSlop={6}
          style={{
            width: 32,
            height: 32,
            borderRadius: RADIUS.pill,
            backgroundColor: '#ef4444',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Square size={12} color="#fff" fill="#fff" />
        </Pressable>
      </View>
    );
  }

  if (recordingState === 'waiting_for_partner') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: RADIUS.pill,
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.4)',
        }}
      >
        <Loader2 size={12} color="#fcd34d" />
        <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fcd34d' }}>
          {t('waitingPartner') ?? 'Waiting partner'}
        </ThemedText>
        <Pressable onPress={onCancelRecordingRequest} hitSlop={6}>
          <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fcd34d', textDecorationLine: 'underline' }}>
            {c('cancel') ?? 'Cancel'}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (recordingState === 'starting' || recordingState === 'processing') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: RADIUS.pill,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 1,
          borderColor: 'rgba(59, 130, 246, 0.4)',
        }}
      >
        <Loader2 size={12} color="#93c5fd" />
        <ThemedText type="smallBold" style={{ fontSize: 11, color: '#93c5fd' }}>
          {recordingState === 'starting' ? t('starting') ?? 'Starting...' : t('processing') ?? 'Processing...'}
        </ThemedText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onCheckEstimate}
      disabled={isCheckingEstimate}
      hitSlop={8}
      style={{
        height: 36,
        paddingHorizontal: 12,
        borderRadius: RADIUS.pill,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {isCheckingEstimate ? (
        <Loader2 size={14} color="#fff" />
      ) : (
        <Video size={14} color="#fff" />
      )}
      <ThemedText type="smallBold" style={{ fontSize: 12, color: '#fff' }}>
        {t('recordSession') ?? 'Record'}
      </ThemedText>
    </Pressable>
  );
}

/* ─── Room Body Video Conference ───────────────────────── */
function RoomBody({ partner, me, insets }: any) {
  const participants = useParticipants();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#050506',
        paddingHorizontal: SPACING[3],
        paddingTop: 54,
        paddingBottom: Math.max(90, (insets?.bottom ?? 0) + 75),
      }}
    >
      <ParticipantGrid participants={participants} partner={partner} me={me} />
    </View>
  );
}

function ParticipantGrid({ participants, partner, me }: any) {
  const t = useT('room');
  const room = useRoomContext();

  if (participants.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3] }}>
        <Avatar uri={partner?.image ?? ''} fallback={partner?.name ?? 'P'} size={80} />
        <ThemedText type="default" style={{ color: '#fff', fontWeight: '700' }}>
          {partner?.name ?? t('waitingForPartnerToJoin') ?? 'Waiting for partner…'}
        </ThemedText>
        <Loader2 size={24} color="#a1a1aa" />
      </View>
    );
  }

  const screenShareParticipant = participants.find((p: any) => p.getTrackPublication(Track.Source.ScreenShare)?.videoTrack);
  const screenShareTrackPub = screenShareParticipant?.getTrackPublication(Track.Source.ScreenShare);

  const handleStopScreenShare = async () => {
    try {
      await room?.localParticipant?.setScreenShareEnabled(false);
    } catch (e) {
      console.warn('[ScreenShare] Stop failed:', e);
    }
  };

  return (
    <View style={{ flex: 1, gap: SPACING[3] }}>
      {/* Screen Share Prominent Display */}
      {screenShareTrackPub?.videoTrack ? (
        <View
          style={{
            height: 230,
            borderRadius: RADIUS.xl,
            backgroundColor: '#000',
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: getAccent('indigo').main,
            position: 'relative',
          }}
        >
          <VideoTrack
            trackRef={{
              participant: screenShareParticipant,
              source: Track.Source.ScreenShare,
              publication: screenShareTrackPub,
            }}
            style={{ flex: 1, width: '100%', height: '100%' }}
          />
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: RADIUS.pill,
              backgroundColor: 'rgba(79, 70, 229, 0.9)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MonitorUp size={12} color="#fff" />
            <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fff' }}>
              {t('sharing') ?? 'Sharing'} • {screenShareParticipant.isLocal ? t('you') ?? 'You' : partner?.name ?? screenShareParticipant.identity}
            </ThemedText>
          </View>

          {/* End Screen Share UI Button for local sharer */}
          {screenShareParticipant.isLocal ? (
            <Pressable
              onPress={handleStopScreenShare}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: RADIUS.pill,
                backgroundColor: 'rgba(239, 68, 68, 0.95)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                elevation: 4,
              }}
            >
              <SquareX size={14} color="#fff" />
              <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fff' }}>
                {t('stopShare') ?? 'Stop Sharing'}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Participant Video Grid */}
      <View
        style={{
          flex: 1,
          flexDirection: screenShareTrackPub?.videoTrack ? 'row' : 'column',
          gap: SPACING[3],
        }}
      >
        {participants.map((participant: any) => {
          const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
          const isMe = participant.isLocal;
          const fallbackName = isMe ? t('you') ?? 'You' : partner?.name ?? participant.identity;
          const isMicEnabled = participant.isMicrophoneEnabled;
          const isCamEnabled = participant.isCameraEnabled;

          return (
            <View
              key={participant.identity}
              style={{
                flex: 1,
                minHeight: screenShareTrackPub?.videoTrack ? 120 : 160,
                borderRadius: RADIUS.xl,
                backgroundColor: '#18181b',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#27272a',
                position: 'relative',
              }}
            >
              {isCamEnabled && cameraPublication?.videoTrack ? (
                <VideoTrack
                  trackRef={{
                    participant,
                    source: Track.Source.Camera,
                    publication: cameraPublication,
                  }}
                  style={{ flex: 1, width: '100%', height: '100%' }}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[2] }}>
                  <Avatar
                    uri={isMe ? me?.image : partner?.image}
                    fallback={fallbackName}
                    size={screenShareTrackPub?.videoTrack ? 44 : 72}
                  />
                  <ThemedText type="smallBold" style={{ fontSize: 13, color: '#fff' }}>
                    {fallbackName}
                  </ThemedText>
                </View>
              )}

              {/* Bottom Info Bar Overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: RADIUS.pill,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                  }}
                >
                  <ThemedText type="smallBold" style={{ fontSize: 10, color: '#fff' }}>
                    {fallbackName}
                  </ThemedText>
                </View>

                {!isMicEnabled && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      padding: 5,
                      borderRadius: RADIUS.pill,
                    }}
                  >
                    <MicOff size={12} color="#fff" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Persistent Chat Drawer Overlay Component ─────────── */
function PersistentChatDrawer({
  exchangeSessionId,
  onClose,
  me,
  onSendMessage,
  onNewMessage,
}: {
  exchangeSessionId: string;
  onClose: () => void;
  me: any;
  onSendMessage?: () => void;
  onNewMessage: () => void;
}) {
  const theme = useTheme();
  const t = useT('room');
  const c = useT('common');

  const [inputVal, setInputVal] = useState('');
  const chatMsgsQ = useSessionChatMessages(exchangeSessionId, {
    refetchInterval: 3000,
    enabled: !!exchangeSessionId,
  });
  const sendMsgQ = useSendSessionChatMessage();
  const markReadQ = useMarkSessionChatRead();
  const flatRef = useRef<any>(null);
  const initialCountRef = useRef<number>(-1);

  // Sync mark read on open and unmount
  useEffect(() => {
    if (exchangeSessionId) {
      markReadQ.mutate(exchangeSessionId);
    }
  }, [exchangeSessionId]);

  const messages: ChatMessageItem[] = chatMsgsQ.data ?? [];

  useEffect(() => {
    if (messages.length > 0 && initialCountRef.current === -1) {
      initialCountRef.current = messages.length;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = inputVal.trim();
    if (!text || sendMsgQ.isPending) return;
    setInputVal('');
    try {
      await sendMsgQ.mutateAsync({ exchangeSessionId, message: text });
      await chatMsgsQ.refetch();
      onSendMessage?.();
      setTimeout(() => {
        flatRef.current?.scrollToEnd?.({ animated: true });
      }, 50);
    } catch (e: any) {
      // Handled silently or toast
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 60,
        bottom: 95,
        right: 0,
        left: 0,
        zIndex: 30,
        backgroundColor: '#09090b',
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#27272a',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING[4],
          paddingVertical: SPACING[3],
          borderBottomWidth: 1,
          borderBottomColor: '#1f1f23',
        }}
      >
        <ThemedText type="subtitle" style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          {t('chat') ?? 'In-Session Chat'}
        </ThemedText>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={20} color="#a1a1aa" />
        </Pressable>
      </View>

      {/* Messages List */}
      <View style={{ flex: 1 }}>
        {chatMsgsQ.isLoading ? (
          <View style={{ padding: SPACING[4] }}>
            <SkeletonText lines={5} />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING[6], gap: SPACING[2] }}>
            <MessageSquare size={28} color="#52525b" />
            <ThemedText type="default" style={{ color: '#a1a1aa', fontWeight: '600' }}>
              {t('noMessages') ?? 'No messages yet'}
            </ThemedText>
            <ThemedText type="small" style={{ color: '#71717a', textAlign: 'center' }}>
              {t('typeMessagePrompt') ?? 'Send a message to start chatting during your video session.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: SPACING[4], gap: SPACING[3] }}
            renderItem={({ item: m, index }) => {
              const isMine = m.senderId === me?.id;
              const isNewMarker = initialCountRef.current > 0 && index === initialCountRef.current;

              return (
                <View style={{ gap: SPACING[2] }}>
                  {isNewMarker ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: SPACING[2], gap: SPACING[2] }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: getAccent('indigo').main + '60' }} />
                      <View
                        style={{
                          backgroundColor: getAccent('indigo').main + '20',
                          paddingHorizontal: 10,
                          paddingVertical: 2,
                          borderRadius: RADIUS.pill,
                          borderWidth: 1,
                          borderColor: getAccent('indigo').main + '40',
                        }}
                      >
                        <ThemedText type="smallBold" style={{ fontSize: 10, color: getAccent('indigo').main }}>
                          New Messages
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, height: 1, backgroundColor: getAccent('indigo').main + '60' }} />
                    </View>
                  ) : null}

                  <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[2] }}>
                      {!isMine ? (
                        <Avatar uri={m.sender?.image ?? ''} fallback={m.sender?.name ?? 'P'} size={26} />
                      ) : null}
                      <View
                        style={{
                          maxWidth: '82%',
                          padding: SPACING[3],
                          borderRadius: RADIUS.lg,
                          borderTopRightRadius: isMine ? 4 : RADIUS.lg,
                          borderTopLeftRadius: isMine ? RADIUS.lg : 4,
                          backgroundColor: isMine ? theme.primary : '#18181b',
                          borderWidth: isMine ? 0 : 1,
                          borderColor: '#27272a',
                        }}
                      >
                        {!isMine && m.sender?.name ? (
                          <ThemedText type="smallBold" style={{ color: getAccent('indigo').main, fontSize: 11, marginBottom: 2 }}>
                            {m.sender.name}
                          </ThemedText>
                        ) : null}
                        <ThemedText type="small" style={{ color: isMine ? '#fff' : '#e4e4e7', fontSize: 14, lineHeight: 20 }}>
                          {m.message}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" style={{ color: '#52525b', fontSize: 10, paddingHorizontal: 4 }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Input row */}
      <View
        style={{
          padding: SPACING[3],
          borderTopWidth: 1,
          borderTopColor: '#1f1f23',
          flexDirection: 'row',
          gap: SPACING[2],
          backgroundColor: '#09090b',
        }}
      >
        <TextInput
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={t('typeMessage') ?? 'Type a message…'}
          placeholderTextColor="#52525b"
          style={{
            flex: 1,
            borderRadius: RADIUS.pill,
            backgroundColor: '#18181b',
            color: '#fff',
            paddingHorizontal: SPACING[4],
            paddingVertical: SPACING[2],
            fontSize: FONT_SIZE.sm,
          }}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputVal.trim() || sendMsgQ.isPending}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.pill,
            backgroundColor: !inputVal.trim() ? '#27272a' : theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sendMsgQ.isPending ? (
            <Loader2 size={16} color="#fff" />
          ) : (
            <Send size={16} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Bottom Controls Bar Component ────────────────────── */
function ControlsBar({
  insets,
  recordingState,
  onRecording,
  onToggleChat,
  isChatOpen,
  unreadCount,
  onLeave,
}: any) {
  const theme = useTheme();
  const t = useT('room');
  const toast = useToast();
  const room = useRoomContext();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [audioOutput, setAudioOutput] = useState<string>('speaker');
  const isSwitchingRef = useRef(false);
  const localParticipant = room?.localParticipant;

  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? true;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? true;
  const isScreenShareEnabled = localParticipant?.isScreenShareEnabled ?? false;

  const recDisabled = !onRecording;
  const recActive = recordingState === 'recording' || recordingState === 'processing';
  const recLoading = recordingState === 'starting' || recordingState === 'processing';

  const handleToggleAudio = () => {
    localParticipant?.setMicrophoneEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    localParticipant?.setCameraEnabled(!isVideoEnabled);
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (e) {
      console.warn('[ScreenShare] Toggle failed:', e);
    }
  };

  const handleToggleAudioOutput = async () => {
    try {
      const outputs = await AudioSession.getAudioOutputs();
      const nextOutput =
        audioOutput === 'speaker' || audioOutput === 'force_speaker'
          ? outputs.includes('earpiece')
            ? 'earpiece'
            : 'default'
          : outputs.includes('force_speaker')
          ? 'force_speaker'
          : 'speaker';

      await AudioSession.selectAudioOutput(nextOutput);
      setAudioOutput(nextOutput);
      const isSpeaker = nextOutput.includes('speaker');
      toast.toast({
        title: `${t('audioOutput') ?? 'Audio'}: ${
          isSpeaker ? t('speaker') ?? 'Speaker' : t('earpiece') ?? 'Earpiece'
        }`,
        variant: 'info',
      });
    } catch (e) {
      console.warn('[AudioSession] Output toggle failed:', e);
    }
  };

  const handleFlipCamera = async () => {
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;

    try {
      if (localParticipant) {
        const videoTrackPublication = localParticipant.getTrackPublication(Track.Source.Camera);
        const videoTrack = videoTrackPublication?.videoTrack;
        if (videoTrack) {
          const nextFacingMode: VideoCaptureOptions['facingMode'] = facingMode === 'user' ? 'environment' : 'user';
          await videoTrack.restartTrack({
            facingMode: nextFacingMode,
          });
          setFacingMode(nextFacingMode);
        }
      }
    } catch (e) {
      console.warn('[Camera] Flip failed:', e);
    } finally {
      isSwitchingRef.current = false;
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingTop: SPACING[2],
        paddingBottom: Math.max(SPACING[3], insets.bottom),
        backgroundColor: 'rgba(15, 15, 18, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#1f1f23',
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexGrow: 1,
          paddingHorizontal: SPACING[3],
          gap: SPACING[2],
        }}
      >
        {/* Mic Toggle */}
        <CtrlBtn
          onPress={handleToggleAudio}
          active={!isAudioEnabled}
          destructive={!isAudioEnabled}
          label={isAudioEnabled ? t('mute') ?? 'Mute' : t('unmute') ?? 'Unmute'}
        >
          {isAudioEnabled ? <Mic size={18} color="#fff" /> : <MicOff size={18} color="#fff" />}
        </CtrlBtn>

        {/* Camera Toggle */}
        <CtrlBtn
          onPress={handleToggleVideo}
          active={!isVideoEnabled}
          destructive={!isVideoEnabled}
          label={isVideoEnabled ? t('video') ?? 'Video' : t('off') ?? 'Off'}
        >
          {isVideoEnabled ? <Video size={18} color="#fff" /> : <VideoOff size={18} color="#fff" />}
        </CtrlBtn>

        {/* Flip Camera */}
        <CtrlBtn onPress={handleFlipCamera} label={t('flip') ?? 'Flip'}>
          <RefreshCw size={18} color="#fff" />
        </CtrlBtn>

        {/* Screen Share */}
        <CtrlBtn
          onPress={handleToggleScreenShare}
          active={isScreenShareEnabled}
          label={isScreenShareEnabled ? t('sharing') ?? 'Sharing' : t('screenShare') ?? 'Share'}
        >
          <MonitorUp size={18} color="#fff" />
        </CtrlBtn>

        {/* Audio Output Switcher */}
        <CtrlBtn
          onPress={handleToggleAudioOutput}
          active={audioOutput.includes('speaker')}
          label={audioOutput.includes('speaker') ? t('speaker') ?? 'Speaker' : t('earpiece') ?? 'Earpiece'}
        >
          {audioOutput.includes('speaker') ? <Volume2 size={18} color="#fff" /> : <VolumeX size={18} color="#fff" />}
        </CtrlBtn>

        {/* Record Trigger */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={onRecording}
            disabled={recDisabled}
            style={{
              width: 44,
              height: 44,
              borderRadius: RADIUS.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: recDisabled
                ? '#27272a'
                : recActive
                ? '#ef4444'
                : '#3f1414',
              borderWidth: 2,
              borderColor: recDisabled ? '#3f3f46' : '#ef4444',
              opacity: recDisabled ? 0.5 : 1,
            }}
          >
            {recLoading ? (
              <Loader2 size={16} color="#fff" />
            ) : recActive ? (
              <Square size={14} color="#fff" fill="#fff" />
            ) : (
              <Circle size={16} color="#ef4444" fill="#ef4444" />
            )}
          </Pressable>
          <ThemedText type="caption" style={{ fontSize: 10, color: recActive ? '#ef4444' : '#a1a1aa' }}>
            {recActive ? t('recording') ?? 'Recording' : t('record') ?? 'Record'}
          </ThemedText>
        </View>

        {/* Chat Drawer Toggle */}
        <CtrlBtn
          onPress={onToggleChat}
          active={isChatOpen}
          badge={unreadCount > 0}
          badgeCount={unreadCount}
          label={t('chat') ?? 'Chat'}
        >
          <MessageSquare size={18} color="#fff" />
        </CtrlBtn>

        {/* Leave Call Button */}
        <CtrlBtn
          onPress={onLeave}
          destructive
          label={t('leave') ?? 'Leave'}
          style={{ backgroundColor: '#3f1414', borderColor: '#7f1d1d', borderWidth: 1 }}
        >
          <PhoneOff size={18} color="#fff" />
        </CtrlBtn>
      </ScrollView>
    </View>
  );
}

function CtrlBtn({ children, onPress, active, destructive, badge, badgeCount, style, label }: any) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={[
          {
            width: 44,
            height: 44,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active
              ? destructive
                ? '#ef4444'
                : getAccent('indigo').main
              : '#18181b',
            borderWidth: 1,
            borderColor: active ? 'transparent' : '#27272a',
            position: 'relative',
          },
          style,
        ]}
      >
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#ef4444',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              borderWidth: 1.5,
              borderColor: '#09090b',
            }}
          >
            <ThemedText type="smallBold" style={{ fontSize: 9, color: '#fff' }}>
              {badgeCount ? (badgeCount > 9 ? '9+' : badgeCount) : ''}
            </ThemedText>
          </View>
        ) : null}
        {children}
      </Pressable>
      {label ? (
        <ThemedText type="caption" style={{ fontSize: 10, color: '#a1a1aa' }}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

/* ─── Estimate Dialog Modal ────────────────────────────── */
function EstimateModal({
  open,
  estimate,
  onClose,
  onConfirm,
}: {
  open: boolean;
  estimate: RecordingEstimateData | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const t = useT('room');
  const c = useT('common');

  if (!estimate) return null;

  const { rate, userBalance, maxAffordableMinutes, remainingSessionMinutes } = estimate;
  const fullSessionCost = remainingSessionMinutes * rate;
  const isInsufficient = maxAffordableMinutes < 1;
  const isPartial = maxAffordableMinutes < remainingSessionMinutes && maxAffordableMinutes >= 1;
  const isHealthy = maxAffordableMinutes >= remainingSessionMinutes;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ backgroundColor: theme.card }}>
        <DialogHeader>
          <DialogTitle style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Video size={20} color={theme.primary} />
            <ThemedText type="subtitle">{t('billingEstimateTitle') ?? 'Recording Billing Estimate'}</ThemedText>
          </DialogTitle>
          <DialogDescription>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('billingEstimateDesc', { rate }) ?? `Recording costs ${rate} points per minute.`}
            </ThemedText>
          </DialogDescription>
        </DialogHeader>

        <View style={{ gap: SPACING[3], paddingVertical: SPACING[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('yourBalance') ?? 'Your Balance'}
            </ThemedText>
            <ThemedText type="smallBold">{userBalance.toLocaleString()} pts</ThemedText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('sessionTimeLeft') ?? 'Session Time Left'}
            </ThemedText>
            <ThemedText type="smallBold">{remainingSessionMinutes} min</ThemedText>
          </View>

          <Separator />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="smallBold">{t('maxAffordable') ?? 'Max Affordable Time'}</ThemedText>
            <ThemedText type="smallBold" style={{ color: getAccent('indigo').main }}>
              {maxAffordableMinutes} min
            </ThemedText>
          </View>

          {isHealthy && (
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('green').bg,
                borderWidth: 1,
                borderColor: getAccent('green').border,
              }}
            >
              <ThemedText type="smallBold" style={{ color: getAccent('green').main }}>
                {t('estimateHealthyTitle') ?? 'Sufficient Balance'}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('green').main, marginTop: 4 }}>
                {t('estimateHealthyDesc', { rate, minutes: remainingSessionMinutes, cost: fullSessionCost }) ??
                  `You have enough points to record the entire remaining session (~${fullSessionCost} pts).`}
              </ThemedText>
            </View>
          )}

          {isPartial && (
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('amber').bg,
                borderWidth: 1,
                borderColor: getAccent('amber').border,
              }}
            >
              <ThemedText type="smallBold" style={{ color: getAccent('amber').main }}>
                ⚠️ {t('estimatePartialTitle') ?? 'Partial Session Balance'}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('amber').main, marginTop: 4 }}>
                {t('estimatePartialDesc', { minutes: maxAffordableMinutes }) ??
                  `Your balance covers up to ${maxAffordableMinutes} minutes of recording.`}
              </ThemedText>
            </View>
          )}

          {isInsufficient && (
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('red').bg,
                borderWidth: 1,
                borderColor: getAccent('red').border,
              }}
            >
              <ThemedText type="smallBold" style={{ color: getAccent('red').main }}>
                🚫 {t('estimateInsufficientTitle') ?? 'Insufficient Points Balance'}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('red').main, marginTop: 4 }}>
                {t('estimateInsufficientDesc', { minRequired: rate }) ??
                  `You need at least ${rate} points to start recording.`}
              </ThemedText>
            </View>
          )}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={onClose}>
            {c('cancel') ?? 'Cancel'}
          </Button>
          {!isInsufficient ? (
            <Button onPress={onConfirm} leftIcon={<Sparkles size={16} color="#fff" />}>
              {t('proceed') ?? 'Request Recording'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Consent Dialog Modal ─────────────────────────────── */
function ConsentModal({
  open,
  onSubmit,
}: {
  open: boolean;
  onSubmit: (consented: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT('room');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSubmit(false)}>
      <DialogContent style={{ backgroundColor: theme.card }}>
        <DialogHeader>
          <DialogTitle style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color={getAccent('indigo').main} />
            <ThemedText type="subtitle">
              {t('partnerWantsToRecord') ?? 'Partner Requested Recording'}
            </ThemedText>
          </DialogTitle>
          <DialogDescription>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('consentDialogDesc') ??
                'Your exchange partner would like to record this video session. Both participants must consent before recording can begin.'}
            </ThemedText>
          </DialogDescription>
        </DialogHeader>

        <View
          style={{
            padding: SPACING[3],
            borderRadius: RADIUS.md,
            backgroundColor: getAccent('indigo').bg,
            borderWidth: 1,
            borderColor: getAccent('indigo').border,
            gap: 4,
          }}
        >
          <ThemedText type="smallBold" style={{ color: getAccent('indigo').main }}>
            {t('recordingConsentInfoTitle') ?? 'Privacy & Security'}
          </ThemedText>
          <ThemedText type="small" style={{ color: getAccent('indigo').main }}>
            {t('recordingAgreement') ??
              'The recording will be saved securely and made accessible in your exchange details once processed.'}
          </ThemedText>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onSubmit(false)}>
            {t('iDecline') ?? 'Decline'}
          </Button>
          <Button onPress={() => onSubmit(true)} leftIcon={<CheckCircle2 size={16} color="#fff" />}>
            {t('iConsent') ?? 'I Consent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
