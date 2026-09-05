import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAudioDeviceDetector, getConnectedDevices, setAudioOutput as setNativeAudioOutput } from 'audio-device-detector';
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
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  DeviceEventEmitter
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
  useExchangeById,
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
  Bluetooth,
  Headphones,
  Smartphone,
  Speaker,
  ChevronDown,
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
import { AnalyticsEvent, track } from '@/lib/analytics';

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
  const exchangeQ = useExchangeById(exchangeId);
  const exchange = exchangeQ.data;

  const partner = detailsQ.data?.partner ?? (exchange ? (exchange.senderId === currentUser?.id ? exchange.receiver : exchange.sender) : null);

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
  const [initialUnreadCountForDrawer, setInitialUnreadCountForDrawer] = useState(0);
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  const chatMsgsQ = useSessionChatMessages(exchangeSessionId, {
    refetchInterval: 3000,
    enabled: !!exchangeSessionId,
  });
  const markReadQ = useMarkSessionChatRead();
  const prevMsgCountRef = useRef<number>(0);

  // Sync unreadCount deterministically: when closed, unreadCount = totalMsgs - msgsSeenWhenOpen
  useEffect(() => {
    const data = chatMsgsQ.data;
    if (!data) return;
    const msgCount = data.messages?.length ?? 0;

    if (isChatOpen) {
      setUnreadCount(0);
      prevMsgCountRef.current = msgCount;
      if (data.unreadCount > 0 && exchangeSessionId) {
        markReadQ.mutate(exchangeSessionId);
      }
    } else {
      // If we haven't established baseline yet (initial load while closed), use backend unreadCount or initial count
      if (prevMsgCountRef.current === 0) {
        prevMsgCountRef.current = Math.max(0, msgCount - (data.unreadCount ?? 0));
      }
      const unread = Math.max(0, msgCount - prevMsgCountRef.current);
      setUnreadCount(unread);
    }
  }, [chatMsgsQ.data, isChatOpen, exchangeSessionId]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      const currentMsgCount = chatMsgsQ.data?.messages?.length ?? 0;
      if (next) {
        setInitialUnreadCountForDrawer(unreadCount);
        setUnreadCount(0);
        prevMsgCountRef.current = currentMsgCount;
        if (exchangeSessionId) {
          markReadQ.mutate(exchangeSessionId);
          chatMsgsQ.refetch();
        }
      } else {
        setUnreadCount(0);
        prevMsgCountRef.current = currentMsgCount;
        if (exchangeSessionId) {
          markReadQ.mutate(exchangeSessionId);
        }
      }
      return next;
    });
  }, [unreadCount, exchangeSessionId, markReadQ, chatMsgsQ]);

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
      track(AnalyticsEvent.RECORDING_STARTED, { approved_minutes: data.approvedMinutes || 0 });
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
      toast.toast({ title: t('recordingStarted'), variant: 'success' });
    } catch (err: any) {
      setRecordingState('idle');
      sendSignal({ type: 'consent_error' });
      toast.toast({
        title: t('startRecordingFailed'),
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
            } else {
              setUnreadCount(0);
              if (exchangeSessionId) {
                markReadQ.mutate(exchangeSessionId);
              }
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
            toast.toast({ title: t('partnerDeclined'), variant: 'warning' });
            break;
          case 'consent_error':
            setRecordingState('idle');
            setShowConsentModal(false);
            toast.toast({ title: t('partnerConsentFailed'), variant: 'error' });
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
            toast.toast({ title: t('recordingStarted'), variant: 'success' });
            break;
          case 'recording_stopped':
            setRecordingState('processing');
            setRecordingStopAt(null);
            break;
          case 'recording_completed':
            setRecordingState('idle');
            setRecordingStopAt(null);
            toast.toast({ title: t('recordingSuccess'), variant: 'success' });
            break;
          case 'recording_failed':
            setRecordingState('idle');
            setRecordingStopAt(null);
            toast.toast({ title: t('recordingFailed'), variant: 'error' });
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
        title: t('failedGetEstimate'),
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
      toast.toast({ title: t('consentInitFailed'), variant: 'error' });
      setRecordingState('idle');
      return;
    }
    track(AnalyticsEvent.RECORDING_REQUESTED);
    sendSignal({ type: 'consent_request' });
    setRecordingState('waiting_for_partner');
    toast.toast({ title: t('waitingPartner'), variant: 'info' });
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
        toast.toast({ title: t('submitConsentFailed'), variant: 'error' });
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
      track(AnalyticsEvent.RECORDING_STOPPED);
      setRecordingState('processing');
      setRecordingStopAt(null);
      sendSignal({ type: 'recording_stopped' });
    } catch (err: any) {
      toast.toast({ title: t('stopRecordingFailed'), variant: 'error' });
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
        router.replace(`/exchanges/${exchangeId}`);
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
            {t('connectingToRoom')}
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
              {t('videoConnectionError')}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
              {error ?? t('failedGetVideoToken')}
            </ThemedText>
          </View>
          <Button
            variant="outline"
            onPress={() => (exchangeId ? router.replace(`/exchanges/${exchangeId}`) : router.back())}
            leftIcon={<ArrowLeft size={16} color={theme.foreground} />}
          >
            {t('goBack')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
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
            details={detailsQ.data}
            onBack={() => handleLeave(true)}
            isChatOpen={isChatOpen}
            onToggleChat={handleToggleChat}
            unreadCount={unreadCount}
            recordingState={recordingState}
            onStopRecording={handleStopRecording}
            onCancelRecordingRequest={handleCancelRecordingRequest}
            recordingStopAt={recordingStopAt}
            now={now}
          />

          {/* Main Video View */}
          <View style={{ flex: 1, backgroundColor: '#050506' }}>
            <RoomBody
              partner={partner}
              me={currentUser}
              insets={insets}
            />
          </View>

          {/* Persistent Chat Drawer Modal */}
          {isChatOpen ? (
            <PersistentChatDrawer
              exchangeSessionId={exchangeSessionId}
              onClose={() => setIsChatOpen(false)}
              me={currentUser}
              partner={partner}
              initialUnreadCount={initialUnreadCountForDrawer}
              history={chatMsgsQ.data}
              isLoading={chatMsgsQ.isLoading}
              onSendMessage={() => {
                sendSignal({ type: 'chat_sent' });
              }}
            />
          ) : null}

          {/* Bottom Floating Control Bar (hidden while chat is open to avoid keyboard interference) */}
          {!isChatOpen ? (
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
              isCheckingEstimate={isCheckingEstimate}
              onToggleChat={handleToggleChat}
              isChatOpen={isChatOpen}
              unreadCount={unreadCount}
              onLeave={() => handleLeave(true)}
            />
          ) : null}
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
          title={t('leaveSession')}
          description={
            recordingState === 'recording'
              ? t('leaveSessionRecordingDesc')
              : t('leaveSessionDesc')
          }
          confirmLabel={t('leaveSession')}
          destructive
          onConfirm={() => handleLeave(false)}
        />
      </LiveKitRoom>
    </SafeAreaView>
  );
}

/* ─── Top Header Bar Component ─────────────────────────── */
function TopHeaderBar({
  details,
  onBack,
  isChatOpen,
  onToggleChat,
  unreadCount,
  recordingState,
  onStopRecording,
  onCancelRecordingRequest,
  recordingStopAt,
  now,
}: any) {
  const t = useT('room');

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
      {/* Left: Back + Timer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: RADIUS.pill,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <ArrowLeft size={18} color="#fff" />
        </Pressable>

        {endsAt ? <SessionTimer endsAt={endsAt} duration={duration} now={now} /> : null}
      </View>

      {/* Right: Recording status + Chat toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
        <RecordingHeaderBadge
          recordingState={recordingState}
          onStopRecording={onStopRecording}
          onCancelRecordingRequest={onCancelRecordingRequest}
          recordingStopAt={recordingStopAt}
          now={now}
        />

        <Pressable
          onPress={onToggleChat}
          hitSlop={8}
          style={{
            height: 38,
            paddingHorizontal: 12,
            borderRadius: RADIUS.pill,
            backgroundColor: isChatOpen ? getAccent('indigo').main : 'rgba(0,0,0,0.55)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
          }}
        >
          <MessageSquare size={16} color="#fff" />
          <ThemedText type="smallBold" style={{ fontSize: 12, color: '#fff' }}>
            {t('chat')}
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
        {isExpired ? t('sessionEnded') : timeStr}
      </ThemedText>
    </View>
  );
}

/* ─── Recording Header Badge (status only) ──────────────── */
function RecordingHeaderBadge({
  recordingState,
  onStopRecording,
  onCancelRecordingRequest,
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
            backgroundColor: 'rgba(127,29,29,0.85)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.5)',
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
            width: 30,
            height: 30,
            borderRadius: RADIUS.pill,
            backgroundColor: '#ef4444',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Square size={11} color="#fff" fill="#fff" />
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
          {t('waitingPartner')}
        </ThemedText>
        <Pressable onPress={onCancelRecordingRequest} hitSlop={6}>
          <X size={12} color="#fcd34d" />
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
          {recordingState === 'starting' ? t('startingRecording') : t('processing') }
        </ThemedText>
      </View>
    );
  }

  // Idle — nothing shown in header (record button is in controls bar)
  return null;
}
/* ─── Room Body Video Conference ───────────────────────── */
function RoomBody({ partner, me, insets }: any) {
  const participants = useParticipants();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#050506',
        paddingHorizontal: SPACING[2],
        paddingTop: 50,
        paddingBottom: Math.max(80, (insets?.bottom ?? 0) + 70),
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[4] }}>
        <View style={{ position: 'relative' }}>
          <Avatar uri={partner?.image ?? ''} fallback={partner?.name ?? 'P'} size={88} />
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: getAccent('indigo').main,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#050506',
            }}
          >
            <Loader2 size={12} color="#fff" />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: SPACING[1] }}>
          <ThemedText type="default" style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {partner?.name ?? (t('waitingForPartner'))}
          </ThemedText>
          <ThemedText type="small" style={{ color: '#71717a', fontSize: 12 }}>
            {t('partnerWillAppear')}
          </ThemedText>
        </View>
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
    <View style={{ flex: 1, gap: SPACING[2] }}>
      {/* Screen Share Prominent Display */}
      {screenShareTrackPub?.videoTrack ? (
        <View
          style={{
            height: 230,
            borderRadius: RADIUS['2xl'],
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
              {t('sharing')} • {screenShareParticipant.isLocal ? t('you') : partner?.name || screenShareParticipant.name || screenShareParticipant.identity}
            </ThemedText>
          </View>

          {/* End Screen Share Button */}
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
                {t('stopShare')}
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
          gap: SPACING[2],
        }}
      >
        {participants.map((participant: any) => {
          const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
          const isMe = participant.isLocal;
          const fallbackName = isMe
            ? (t('you'))
            : (partner?.name || participant.name || (participant.identity ? `User ${participant.identity.slice(0, 6)}` : 'Partner'));
          const isMicEnabled = participant.isMicrophoneEnabled;
          const isCamEnabled = participant.isCameraEnabled;
          const isSpeaking = participant.isSpeaking;

          return (
            <View
              key={participant.identity}
              style={{
                flex: 1,
                minHeight: screenShareTrackPub?.videoTrack ? 120 : 160,
                borderRadius: RADIUS['2xl'],
                backgroundColor: '#18181b',
                overflow: 'hidden',
                borderWidth: isSpeaking ? 2 : 1,
                borderColor: isSpeaking ? getAccent('indigo').main : '#1f1f23',
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
                  <ThemedText type="smallBold" style={{ fontSize: 13, color: '#e4e4e7' }}>
                    {fallbackName}
                  </ThemedText>
                </View>
              )}

              {/* Bottom gradient overlay for readability */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 56,
                  backgroundColor: 'transparent',
                }}
              >
                {/* Stacked opacity layers to simulate gradient */}
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.0)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
              </View>

              {/* Bottom Info Bar */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 10,
                  right: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fff' }}>
                    {fallbackName}
                  </ThemedText>
                  {isSpeaking && (
                    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
                      {[3, 5, 3].map((h, i) => (
                        <View key={i} style={{ width: 2, height: h, borderRadius: 1, backgroundColor: getAccent('indigo').main }} />
                      ))}
                    </View>
                  )}
                </View>

                {!isMicEnabled && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.85)',
                      padding: 4,
                      borderRadius: RADIUS.pill,
                    }}
                  >
                    <MicOff size={10} color="#fff" />
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
  partner,
  onSendMessage,
  initialUnreadCount,
  history,
  isLoading,
}: {
  exchangeSessionId: string;
  onClose: () => void;
  me: any;
  partner?: any;
  onSendMessage?: () => void;
  initialUnreadCount: number;
  history?: any;
  isLoading: boolean;
}) {
  const theme = useTheme();
  const t = useT('room');
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [inputVal, setInputVal] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMsgQ = useSendSessionChatMessage();
  const flatRef = useRef<any>(null);

  const rawMessages = history?.messages ?? [];

  // Invert messages array so newest message is index 0 (rendered at bottom of inverted FlatList)
  const reversedMessages = useMemo(() => {
    return [...rawMessages].reverse();
  }, [rawMessages]);

  // Index in reversed array where the "New Messages" banner should render.
  const [unreadStartIndex, setUnreadStartIndex] = useState<number>(() => {
    if (initialUnreadCount > 0 && rawMessages.length >= initialUnreadCount) {
      return initialUnreadCount - 1;
    }
    return -1;
  });

  const isAtBottomRef = useRef(true);
  const prevTotalMsgsRef = useRef(rawMessages.length);

  // Track incoming new messages: if at bottom, auto scroll to index 0 (bottom of inverted list)
  useEffect(() => {
    const currentLen = rawMessages.length;
    const prevLen = prevTotalMsgsRef.current;
    if (currentLen > prevLen && prevLen > 0) {
      const diff = currentLen - prevLen;
      if (!isAtBottomRef.current) {
        // User is scrolled up! Update unread marker to indicate newly arrived messages
        setUnreadStartIndex((prev) => (prev > -1 ? prev + diff : diff - 1));
      } else {
        setUnreadStartIndex(-1);
        setTimeout(() => {
          flatRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 50);
      }
    }
    prevTotalMsgsRef.current = currentLen;
  }, [rawMessages.length]);

  // Track scroll position to manage auto-scroll behavior
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = e.nativeEvent;
    const atBottom = contentOffset.y < 30;
    isAtBottomRef.current = atBottom;
  }, []);

  const handleSend = async () => {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal('');
    setUnreadStartIndex(-1); // Clear separator on send!
    isAtBottomRef.current = true;

    // 1. Emit LiveKit Data Channel signal IMMEDIATELY (0ms delay to partner!)
    onSendMessage?.();

    // 2. Optimistic local update for 0ms local render
    const optimisticMsg = {
      id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      exchangeSessionId,
      senderId: me?.id,
      message: text,
      timestamp: new Date().toISOString(),
      sender: {
        id: me?.id,
        name: me?.name || 'Me',
        image: me?.image || '',
      },
    };

    if (exchangeSessionId) {
      queryClient.setQueryData(QUERY_KEYS.video.chat(exchangeSessionId), (old: any) => {
        if (!old) return { messages: [optimisticMsg], unreadCount: 0 };
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMsg],
        };
      });
    }

    // Scroll to bottom
    setTimeout(() => {
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);

    // 3. Persist REST API request in background
    try {
      await sendMsgQ.mutateAsync({ exchangeSessionId, message: text });
      if (exchangeSessionId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.video.chat(exchangeSessionId) });
      }
    } catch (e: any) {
      console.warn('[Chat] Send failed:', e);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      {/* Dark backdrop touch dismiss */}
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <View
          style={{
            height: '82%',
            backgroundColor: '#09090b',
            borderTopLeftRadius: RADIUS['3xl'],
            borderTopRightRadius: RADIUS['3xl'],
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: 'rgba(255,255,255,0.08)',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Handle + Header */}
          <View style={{ alignItems: 'center', paddingTop: SPACING[2.5] }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#3f3f46' }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: SPACING[4],
              paddingVertical: SPACING[2],
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
              <MessageSquare size={16} color={getAccent('indigo').main} />
              <ThemedText type="smallBold" style={{ color: '#fff', fontSize: 14 }}>
                {t('chat')}
              </ThemedText>
              {partner?.name ? (
                <ThemedText type="small" style={{ color: '#71717a', fontSize: 12 }}>
                  • {partner.name}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 28,
                height: 28,
                borderRadius: RADIUS.pill,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#a1a1aa" />
            </Pressable>
          </View>

          {/* Messages List */}
          <View style={{ flex: 1 }}>
            {isLoading && reversedMessages.length === 0 ? (
              <View style={{ padding: SPACING[4] }}>
                <SkeletonText lines={5} />
              </View>
            ) : reversedMessages.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING[6], gap: SPACING[3] }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: RADIUS.pill,
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageSquare size={24} color={getAccent('indigo').main} />
                </View>
                <ThemedText type="default" style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 14 }}>
                  {t('noMessages')}
                </ThemedText>
                <ThemedText type="small" style={{ color: '#52525b', textAlign: 'center', fontSize: 12 }}>
                  {t('typeMessagePrompt')}
                </ThemedText>
              </View>
            ) : (
              <FlatList
                ref={flatRef}
                data={reversedMessages}
                inverted
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ padding: SPACING[3], gap: SPACING[2] }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item: m, index }) => {
                  const isMine = m.senderId === me?.id;
                  const isNewMarker = unreadStartIndex > -1 && index === unreadStartIndex;

                  return (
                    <View style={{ gap: SPACING[1] }}>
                      {isNewMarker ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: SPACING[2], gap: SPACING[2] }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: getAccent('indigo').main + '40' }} />
                          <View
                            style={{
                              backgroundColor: getAccent('indigo').main + '15',
                              paddingHorizontal: 10,
                              paddingVertical: 2,
                              borderRadius: RADIUS.pill,
                            }}
                          >
                            <ThemedText type="smallBold" style={{ fontSize: 10, color: getAccent('indigo').main }}>
                              {t('newMessages')}
                            </ThemedText>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: getAccent('indigo').main + '40' }} />
                        </View>
                      ) : null}

                      <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SPACING[1.5] }}>
                          {!isMine ? (
                            <Avatar uri={m.sender?.image ?? partner?.image ?? ''} fallback={m.sender?.name ?? partner?.name ?? 'P'} size={24} />
                          ) : null}
                          <View
                            style={{
                              maxWidth: '78%',
                              paddingHorizontal: SPACING[3],
                              paddingVertical: SPACING[2],
                              borderRadius: RADIUS.xl,
                              borderBottomRightRadius: isMine ? 4 : RADIUS.xl,
                              borderBottomLeftRadius: isMine ? RADIUS.xl : 4,
                              backgroundColor: isMine ? getAccent('indigo').main : '#1c1c1f',
                            }}
                          >
                            {!isMine && (m.sender?.name || partner?.name) ? (
                              <ThemedText type="smallBold" style={{ color: getAccent('indigo').main, fontSize: 10, marginBottom: 2 }}>
                                {m.sender?.name || partner?.name}
                              </ThemedText>
                            ) : null}
                            <ThemedText type="small" style={{ color: isMine ? '#fff' : '#e4e4e7', fontSize: 13, lineHeight: 18 }}>
                              {m.message}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText type="small" style={{ color: '#3f3f46', fontSize: 9, paddingHorizontal: !isMine ? 32 : 4 }}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </ThemedText>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* Input row flush against keyboard */}
          <View
            style={{
              paddingHorizontal: SPACING[3],
              paddingTop: SPACING[2.5],
              paddingBottom: isKeyboardVisible ? SPACING[2.5] : Math.max(SPACING[3], insets.bottom),
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.06)',
              flexDirection: 'row',
              gap: SPACING[2],
              backgroundColor: '#09090b',
            }}
          >
            <TextInput
              value={inputVal}
              onChangeText={setInputVal}
              placeholder={t('typeMessage')}
              placeholderTextColor="#3f3f46"
              style={{
                flex: 1,
                borderRadius: RADIUS.xl,
                backgroundColor: '#141416',
                color: '#fff',
                paddingHorizontal: SPACING[4],
                paddingVertical: SPACING[2],
                fontSize: 13,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputVal.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: RADIUS.pill,
                backgroundColor: !inputVal.trim() ? '#1c1c1f' : getAccent('indigo').main,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={15} color={!inputVal.trim() ? '#52525b' : '#fff'} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─── Bottom Controls Bar Component ────────────────────── */

/** Maps audio output device id/type to an icon and label */
function getAudioOutputInfo(output: string) {
  if (output === 'bluetooth') return { icon: Bluetooth, key: 'bluetooth', label: 'Bluetooth' };
  if (output === 'headset' || output === 'wired_headset' || output === 'wired_headphones' || output === 'usb_headset') return { icon: Headphones, key: 'headset', label: 'Headset' };
  if (output === 'earpiece' || output === 'default' || output === 'builtin_earpiece') return { icon: Smartphone, key: 'earpiece', label: 'Earpiece' };
  // speaker, force_speaker, or anything else
  return { icon: Volume2, key: 'speaker', label: 'Speaker' };
}

function mapDeviceTypeToAudioOutput(type: string): string {
  switch (type) {
    case 'bluetooth':
      return 'bluetooth';
    case 'wired_headset':
    case 'wired_headphones':
    case 'usb_headset':
      return 'headset';
    case 'builtin_earpiece':
      return Platform.OS === 'ios' ? 'default' : 'earpiece';
    case 'builtin_speaker':
    default:
      return Platform.OS === 'ios' ? 'force_speaker' : 'speaker';
  }
}

function ControlsBar({
  insets,
  recordingState,
  onRecording,
  isCheckingEstimate,
  onToggleChat,
  isChatOpen,
  unreadCount,
  onLeave,
}: any) {
  const t = useT('room');
  const toast = useToast();
  const room = useRoomContext();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [audioOutput, setAudioOutput] = useState<string>(Platform.OS === 'ios' ? 'force_speaker' : 'speaker');
  const [availableOutputs, setAvailableOutputs] = useState<string[]>([]);
  const isSwitchingRef = useRef(false);
  const localParticipant = room?.localParticipant;

  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? true;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? true;
  const isScreenShareEnabled = localParticipant?.isScreenShareEnabled ?? false;

  const recDisabled = !onRecording;
  const recActive = recordingState === 'recording' || recordingState === 'processing';
  const recLoading = recordingState === 'starting' || recordingState === 'processing' || isCheckingEstimate;

  const isManualSelectionRef = useRef(false);
  const { activeDevice, latestConnectedDevice, latestDisconnectedDevice } = useAudioDeviceDetector();

  // Keep audio icon 100% in sync with real-time active OS output (e.g., native route picker, Control Center, Bluetooth)
  useEffect(() => {
    if (activeDevice) {
      const targetOutput = mapDeviceTypeToAudioOutput(activeDevice.type);
      setAudioOutput(targetOutput);
    }
  }, [activeDevice]);

  // Centralized helper to switch audio output routes and manage iOS category options
  const selectAudioOutputRoute = async (targetOutput: string) => {
    try {
      isManualSelectionRef.current = true;
      setAudioOutput(targetOutput);
console.log('selectAudioOutputRoute', targetOutput, 'audioOutput', audioOutput);
      if (Platform.OS === 'ios') {
        if (targetOutput === 'speaker' || targetOutput === 'force_speaker') {
          // Speaker mode: include defaultToSpeaker & videoChat mode so audio routes to main speaker
          await AudioSession.setAppleAudioConfiguration({
            audioCategory: 'playAndRecord',
            audioCategoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay', 'defaultToSpeaker'],
            audioMode: 'videoChat',
          });
          const nativeSuccess = await setNativeAudioOutput('speaker');
          if (!nativeSuccess) {
            await AudioSession.selectAudioOutput('force_speaker');
          }
        } else if (targetOutput === 'earpiece' || targetOutput === 'default') {
          // Earpiece mode: omit defaultToSpeaker so Built-in Receiver (earpiece) plays audio,
          // while keeping allowBluetooth/allowBluetoothA2DP/allowAirPlay so Bluetooth & AirPlay stay available in picker!
          await AudioSession.setAppleAudioConfiguration({
            audioCategory: 'playAndRecord',
            audioCategoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay'],
            audioMode: 'voiceChat',
          });
          const nativeSuccess = await setNativeAudioOutput('earpiece');
          if (!nativeSuccess) {
            await AudioSession.selectAudioOutput('default');
          }
        } else if (targetOutput === 'bluetooth') {
          // Bluetooth mode: allow Bluetooth & AirPlay, omit defaultToSpeaker
          await AudioSession.setAppleAudioConfiguration({
            audioCategory: 'playAndRecord',
            audioCategoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay'],
            audioMode: 'voiceChat',
          });
          const nativeSuccess = await setNativeAudioOutput('bluetooth');
          if (!nativeSuccess) {
            await AudioSession.selectAudioOutput('default');
          }
        } else {
          // Headset or other: allow Bluetooth & AirPlay, omit defaultToSpeaker
          await AudioSession.setAppleAudioConfiguration({
            audioCategory: 'playAndRecord',
            audioCategoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay'],
            audioMode: 'voiceChat',
          });
          const nativeSuccess = await setNativeAudioOutput(targetOutput);
          if (!nativeSuccess) {
            await AudioSession.selectAudioOutput('default');
          }
        }
      } else {
        await AudioSession.selectAudioOutput(targetOutput);
      }
    } catch (e) {
      console.warn('[AudioSession] Route selection failed:', e);
    } finally {
      setTimeout(() => {
        isManualSelectionRef.current = false;
      }, 1200);
    }
  };

  // Automatically switch audio output & update icon when OS connects a new device
  useEffect(() => {
    if (latestConnectedDevice && !isManualSelectionRef.current) {
      const targetOutput = mapDeviceTypeToAudioOutput(latestConnectedDevice.type);
      selectAudioOutputRoute(targetOutput).then(() => {
        AudioSession.getAudioOutputs().then(setAvailableOutputs).catch(() => {});
        const info = getAudioOutputInfo(targetOutput);
        if (info?.key) {
          toast.toast({ title: t(info.key) ?? info.label, variant: 'info' });
        }
      });
    }
  }, [latestConnectedDevice]);

  // Re-sync on device disconnection (both iOS and Android)
  useEffect(() => {
    if (latestDisconnectedDevice && !isManualSelectionRef.current) {
      getConnectedDevices().then(async (devices) => {
        const bluetoothDevice = devices.find((d) => d.type === 'bluetooth');
        const headsetDevice = devices.find(
          (d) => d.type === 'wired_headset' || d.type === 'wired_headphones' || d.type === 'usb_headset'
        );

        let targetOutput: string;
        if (bluetoothDevice) {
          targetOutput = 'bluetooth';
        } else if (headsetDevice) {
          targetOutput = 'headset';
        } else {
          targetOutput = Platform.OS === 'ios' ? 'force_speaker' : 'speaker';
        }

        await selectAudioOutputRoute(targetOutput);
        AudioSession.getAudioOutputs().then(setAvailableOutputs).catch(() => {});

        const info = getAudioOutputInfo(targetOutput);
        if (info?.key) {
          toast.toast({ title: t(info.key) ?? info.label, variant: 'info' });
        }
      }).catch(() => {
        const fallbackOutput = Platform.OS === 'ios' ? 'force_speaker' : 'speaker';
        selectAudioOutputRoute(fallbackOutput);
      });
    }
  }, [latestDisconnectedDevice]);

  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      try {
        await AudioSession.startAudioSession();

        const outputs = await AudioSession.getAudioOutputs();
        const devices = await getConnectedDevices();
        if (!isMounted) return;

        setAvailableOutputs(outputs);

        // On room join, automatically select active output (Bluetooth / Headset if connected, else Speaker)
        const bluetoothDevice = devices.find((d) => d.type === 'bluetooth');
        const headsetDevice = devices.find(
          (d) => d.type === 'wired_headset' || d.type === 'wired_headphones' || d.type === 'usb_headset'
        );

        if (bluetoothDevice) {
          await selectAudioOutputRoute('bluetooth');
        } else if (headsetDevice) {
          await selectAudioOutputRoute('headset');
        } else {
          const initialOutput = Platform.OS === 'ios' ? 'force_speaker' : 'speaker';
          await selectAudioOutputRoute(initialOutput);
        }
      } catch (e) {
        console.warn('[AudioSession] setup failed:', e);
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      AudioSession.stopAudioSession().catch((e) =>
        console.warn('[AudioSession] Stop failed:', e)
      );
    };
  }, []);

  const handleToggleAudio = () => {
    localParticipant?.setMicrophoneEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    localParticipant?.setCameraEnabled(!isVideoEnabled);
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      const nextState = !isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(nextState);
      toast.toast({
        title: nextState ? (t('screenShareStarted')) : (t('screenShareStopped')),
        variant: 'info',
      });
    } catch (e: any) {
      console.warn('[ScreenShare] Toggle failed:', e);
      toast.toast({
        title: t('screenShareUnavailable'),
        description: e?.message || t('screenShareFailed'),
        variant: 'error',
      });
    }
  };

  // Cycle through available audio outputs in priority order
  const handleCycleAudioOutput = async () => {
    try {
      const devices = await getConnectedDevices();
      const hasBluetooth = devices.some((d) => d.type === 'bluetooth');
      const hasHeadset = devices.some(
        (d) => d.type === 'wired_headset' || d.type === 'wired_headphones' || d.type === 'usb_headset'
      );

      let cycleOrder: string[];
      if (hasBluetooth) {
        cycleOrder = ['bluetooth', 'speaker', 'earpiece'];
      } else if (hasHeadset) {
        cycleOrder = ['headset', 'speaker'];
      } else {
        cycleOrder = ['speaker', 'earpiece'];
      }

      const normalizedCurrent = (audioOutput === 'force_speaker' || audioOutput === 'speaker')
        ? 'speaker'
        : (audioOutput === 'default' ? 'earpiece' : audioOutput);

      const currentIdx = cycleOrder.indexOf(normalizedCurrent);
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % cycleOrder.length;
      const nextOutput = cycleOrder[nextIdx];

      await selectAudioOutputRoute(nextOutput);

      const info = getAudioOutputInfo(nextOutput);
      if (info?.key) {
        toast.toast({ title: t(info.key) ?? info.label, variant: 'info' });
      }
    } catch (e) {
      console.log('[AudioSession] Output cycle failed:', e);
    }
  };

  // iOS route picker
  const handleShowRoutePicker = async () => {
    if (Platform.OS === 'ios') {
      try {
        const isSpeaker = audioOutput === 'speaker' || audioOutput === 'force_speaker';
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: isSpeaker
            ? ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay', 'defaultToSpeaker']
            : ['allowBluetooth', 'allowBluetoothA2DP', 'allowAirPlay'],
          audioMode: isSpeaker ? 'videoChat' : 'voiceChat',
        });
        await AudioSession.showAudioRoutePicker();
      } catch (e) {
        console.warn('[AudioSession] Route picker failed:', e);
      }
    } else {
      await handleCycleAudioOutput();
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

  const AudioIcon = getAudioOutputInfo(audioOutput).icon;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingTop: SPACING[3],
        paddingBottom: Math.max(SPACING[2], insets.bottom),
        backgroundColor: 'rgba(9, 9, 11, 0.92)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Primary row: Mic, Video, Leave + secondary actions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexGrow: 1,
          paddingHorizontal: SPACING[3],
          gap: SPACING[2.5],
        }}
      >
        {/* Secondary: Flip */}
        <CtrlBtn onPress={handleFlipCamera} size={40}>
          <RefreshCw size={17} color="#a1a1aa" />
        </CtrlBtn>

        {/* Secondary: Screen Share */}
        <CtrlBtn onPress={handleToggleScreenShare} active={isScreenShareEnabled} size={40}>
          <MonitorUp size={17} color={isScreenShareEnabled ? '#fff' : '#a1a1aa'} />
        </CtrlBtn>

        {/* Primary: Mic */}
        <CtrlBtn onPress={handleToggleAudio} active={!isAudioEnabled} destructive={!isAudioEnabled} size={48} primary>
          {isAudioEnabled ? <Mic size={22} color="#fff" /> : <MicOff size={22} color="#fff" />}
        </CtrlBtn>

        {/* Primary: Video */}
        <CtrlBtn onPress={handleToggleVideo} active={!isVideoEnabled} destructive={!isVideoEnabled} size={48} primary>
          {isVideoEnabled ? <Video size={22} color="#fff" /> : <VideoOff size={22} color="#fff" />}
        </CtrlBtn>

        {/* Primary: Leave */}
        <Pressable
          onPress={onLeave}
          style={{
            width: 48,
            height: 48,
            borderRadius: RADIUS.pill,
            backgroundColor: '#dc2626',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PhoneOff size={22} color="#fff" />
        </Pressable>

        {/* Secondary: Audio Output */}
        <CtrlBtn
          onPress={handleCycleAudioOutput}
          onLongPress={handleShowRoutePicker}
          size={40}
        >
          <AudioIcon size={17} color="#a1a1aa" />
        </CtrlBtn>

        {/* Secondary: Record */}
        <CtrlBtn
          onPress={onRecording}
          disabled={recDisabled}
          size={40}
          style={recActive ? { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' } : undefined}
        >
          {recLoading ? (
            <Loader2 size={17} color="#a1a1aa" />
          ) : recActive ? (
            <Square size={13} color="#ef4444" fill="#ef4444" />
          ) : (
            <Circle size={15} color="#ef4444" fill="#ef4444" />
          )}
        </CtrlBtn>

        {/* Secondary: Chat */}
        <CtrlBtn
          onPress={onToggleChat}
          active={isChatOpen}
          badge={unreadCount > 0}
          badgeCount={unreadCount}
          size={40}
        >
          <MessageSquare size={17} color={isChatOpen ? '#fff' : '#a1a1aa'} />
        </CtrlBtn>
      </ScrollView>
    </View>
  );
}

function CtrlBtn({ children, onPress, onLongPress, active, destructive, badge, badgeCount, style, size = 44, primary, disabled }: any) {
  const btnSize = size;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={6}
      style={[
        {
          width: btnSize,
          height: btnSize,
          borderRadius: RADIUS.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active
            ? destructive
              ? '#ef4444'
              : getAccent('indigo').main
            : primary
            ? '#27272a'
            : '#18181b',
          borderWidth: primary ? 0 : 1,
          borderColor: active ? 'transparent' : '#1f1f23',
          position: 'relative',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#ef4444',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
            borderWidth: 1.5,
            borderColor: '#09090b',
          }}
        >
          <ThemedText type="smallBold" style={{ fontSize: 8, color: '#fff' }}>
            {badgeCount ? (badgeCount > 9 ? '9+' : badgeCount) : ''}
          </ThemedText>
        </View>
      ) : null}
      {children}
    </Pressable>
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
            <ThemedText type="subtitle">{t('billingEstimateTitle')}</ThemedText>
          </DialogTitle>
          <DialogDescription>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('billingEstimateDesc', { rate })}
            </ThemedText>
          </DialogDescription>
        </DialogHeader>

        <View style={{ gap: SPACING[3], paddingVertical: SPACING[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('yourBalance')}
            </ThemedText>
            <ThemedText type="smallBold">{userBalance.toLocaleString()} pts</ThemedText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('sessionTimeLeft')}
            </ThemedText>
            <ThemedText type="smallBold">{remainingSessionMinutes} min</ThemedText>
          </View>

          <Separator />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="smallBold">{t('maxAffordable')}</ThemedText>
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
                {t('estimateHealthyTitle')}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('green').main, marginTop: 4 }}>
                {t('estimateHealthyDesc', { rate, minutes: remainingSessionMinutes, cost: fullSessionCost })}
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
                ⚠️ {t('estimatePartialTitle')}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('amber').main, marginTop: 4 }}>
                {t('estimatePartialDesc', { minutes: maxAffordableMinutes })}
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
                🚫 {t('estimateInsufficientTitle')}
              </ThemedText>
              <ThemedText type="small" style={{ color: getAccent('red').main, marginTop: 4 }}>
                {t('estimateInsufficientDesc', { minRequired: rate })}
              </ThemedText>
            </View>
          )}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={onClose}>
            {c('cancel')}
          </Button>
          {!isInsufficient ? (
            <Button onPress={onConfirm} leftIcon={<Sparkles size={16} color="#fff" />}>
              {t('proceed')}
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
              {t('partnerWantsToRecord')}
            </ThemedText>
          </DialogTitle>
          <DialogDescription>
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('consentDialogDesc')}
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
            {t('recordingConsentInfoTitle')}
          </ThemedText>
          <ThemedText type="small" style={{ color: getAccent('indigo').main }}>
            {t('recordingAgreement')}
          </ThemedText>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onSubmit(false)}>
            {t('iDecline')}
          </Button>
          <Button onPress={() => onSubmit(true)} leftIcon={<CheckCircle2 size={16} color="#fff" />}>
            {t('iConsent')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
