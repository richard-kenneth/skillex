import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  Input,
  Label,
  Separator,
  Tabs,
  SkeletonText,
  useToast,
  AlertDialog,
  ActionSheet,
  SelectField,
  Skeleton,
  Progress,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
} from '@/lib/api-hooks';
import {
  formatTimeRemaining,
  formatDateTimeShort,
  formatDateShort,
  POINT_TO_USD_RATE,
  calculatePointsBreakdown,
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
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  Info,
  ArrowLeft,
  RefreshCw,
  User,
  Users,
  Loader2,
  X,
  CheckCircle2,
  HandCoins,
  CalendarClock,
  Zap,
} from 'lucide-react-native';
import { cn } from '@/lib/style-utils';
import { 
  LiveKitRoom, 
  useRoomContext, 
  useParticipants, 
  useDataChannel, 
  VideoTrack 
} from '@livekit/react-native';
import { Track } from 'livekit-client';

/*
 * ─── LiveKit integration note ─────────────────────────────────────────
 * When ready, install the native package:
 *   pnpm --filter mobile add @livekit/react-native
 *   (iOS: pod install)
 * Then:
 *   1. import { LiveKitRoom, useRoomContext, useParticipants, useDataChannel } from "@livekit/react-native";
 *   2. Wrap the RoomBody in:
 *        <LiveKitRoom
 *          token={token}
 *          serverUrl={serverUrl}
 *          audio={audioOn}
 *          video={videoOn}
 *          onDisconnected={handleLeave}
 *        >
 *          <RoomBody ... />
 *        </LiveKitRoom>
 *   3. Swap <ParticipantPlaceholderGrid /> for <ParticipantGrid /> using useParticipants()
 *   4. Wire useDataChannel("recording") signals to the existing recording state machine
 *      handlers (handleSignalInbound / sendSignal are already implemented below as no-ops).
 * ──────────────────────────────────────────────────────────────────────
 */

type RoomTab = 'room' | 'chat';

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
  | { type: 'recording_failed' };

function RecordingDataChannelHandler({ onInboundSignal, setSendSignal }: any) {
  const { send } = useDataChannel('recording', (message) => {
    const Decoder = (globalThis as any).TextDecoder ?? String;
    const rawString = typeof Decoder === 'function' ? new Decoder().decode(message.payload) : String.fromCharCode.apply(null, Array.from(message.payload));
    onInboundSignal(rawString);
  });

  React.useEffect(() => {
    if (send) {
      setSendSignal(() => (signal: RecordingSignal) => {
        const Encoder = (globalThis as any).TextEncoder;
        const str = JSON.stringify(signal);
        const payload = Encoder ? new Encoder().encode(str) : new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
        send(payload, { reliable: true });
      });
    }
  }, [send, setSendSignal]);

  return null;
}

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const nav = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT('room');

  const sessionId = id!;
  const detailsQ = useVideoSessionDetails(sessionId);
  const tokenQ = useVideoToken(sessionId);
  const userQ = useCurrentUser();

  /* ------ Media state ------ */
  // Media state is now managed by LiveKit via useRoomContext

  /* ------ Recording state machine ------ */
  const [recordingState, setRecordingState] = React.useState<RecordingState>('idle');
  const [recordingStopAt, setRecordingStopAt] = React.useState<number | null>(null);
  const [consentDialog, setConsentDialog] = React.useState<{
    mode: 'outbound_request' | 'inbound_request' | 'estimate';
  } | null>(null);
  const [estimate, setEstimate] = React.useState<{ rate: number; userBalance: number; maxAffordableMinutes: number; remainingSessionMinutes: number } | null>(null);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const estimateQ = useRecordingEstimate();
  const consentQ = useSubmitRecordingConsent();
  const startRecQ = useStartRecording();
  const stopRecQ = useStopRecording();

  /* ------ Chat state ------ */
  const [tab, setTab] = React.useState<RoomTab>('room');
  const [chatText, setChatText] = React.useState('');
  const chatMsgsQ = useSessionChatMessages(sessionId);
  const sendMsgQ = useSendSessionChatMessage();
  const markReadQ = useMarkSessionChatRead();
  const flatRef = React.useRef<any>(null);
  const currentUser = userQ.data as any;

  /* ------ Session timer ------ */
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-disconnect if session ended + 5m grace
  React.useEffect(() => {
    const endsAt = detailsQ.data?.session?.endsAt;
    if (!endsAt) return;
    const endMs = new Date(endsAt).getTime() + 5 * 60 * 1000;
    if (now > endMs) {
      toast.toast({ title: t('sessionEnded'), description: t('sessionEndedDesc'), variant: 'info' });
      handleLeave(false);
    }
  }, [now, detailsQ.data?.session?.endsAt]);

  // Auto-mark chat read when user views chat tab
  React.useEffect(() => {
    if (tab === 'chat') {
      markReadQ.mutate(sessionId);
    }
  }, [tab]);

  /* ------ Derived ------ */
  const session = detailsQ.data?.session;
  const exchangeId = detailsQ.data?.exchangeId;
  const scheduledAt = session?.scheduledAt ? new Date(session.scheduledAt) : null;
  const endsAt = session?.endsAt ? new Date(session.endsAt) : null;
  const totalDuration = scheduledAt && endsAt ? endsAt.getTime() - scheduledAt.getTime() : 0;
  const elapsed = scheduledAt ? Math.min(Math.max(now - scheduledAt.getTime(), 0), totalDuration) : 0;
  const progressPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
  const remainingMs = totalDuration - elapsed;
  const remainingStr = formatTimeRemaining(remainingMs);

  const token = (tokenQ.data as any)?.token ?? '';
  const serverUrl = (tokenQ.data as any)?.url ?? '';

  const loading = detailsQ.isLoading || tokenQ.isLoading;
  const error = (detailsQ.error as any)?.message || (tokenQ.error as any)?.message || null;

  /* ------ Recording signal sender ------ */
  const [sendSignalRef, setSendSignalRef] = React.useState<any>(null);

  const sendSignal = React.useCallback(
    (signal: RecordingSignal) => {
      if (sendSignalRef) {
        sendSignalRef(signal);
      } else {
        console.log('send (not connected):', signal);
      }
    },
    [sendSignalRef]
  );

  /* ------ Recording signal receiver (LiveKit data channel ready) ------ */
  const handleSignalInbound = React.useCallback(
    (raw: string) => {
      try {
        const s = JSON.parse(raw) as RecordingSignal;
        switch (s.type) {
          case 'consent_request':
            if (recordingState === 'idle') {
              setRecordingState('requesting_consent');
              setConsentDialog({ mode: 'inbound_request' });
            }
            break;
          case 'consent_accept':
            if (recordingState === 'waiting_for_partner') {
              beginRecording();
            }
            break;
          case 'consent_decline':
            if (recordingState === 'waiting_for_partner' || recordingState === 'requesting_consent') {
              setRecordingState('idle');
              setConsentDialog(null);
              toast.toast({ title: 'Partner declined recording', variant: 'warning' });
            }
            break;
          case 'recording_started':
            setRecordingState('recording');
            setRecordingStopAt(s.stopAt ?? null);
            setConsentDialog(null);
            toast.toast({ title: 'Recording started', variant: 'success' });
            break;
          case 'recording_stopped':
          case 'recording_completed':
            setRecordingState('processing');
            setRecordingStopAt(null);
            setTimeout(() => {
              setRecordingState('idle');
              toast.toast({ title: 'Recording saved', description: 'Available in your exchange details soon.', variant: 'success' });
            }, 4000);
            break;
          case 'recording_failed':
            setRecordingState('idle');
            toast.toast({ title: 'Recording failed', variant: 'error' });
            break;
        }
      } catch {
        // ignore
      }
    },
    [recordingState, toast],
  );

  async function beginRecording() {
    try {
      setRecordingState('starting');
      await startRecQ.mutateAsync({exchangeSessionId: sessionId});
      // Backend will emit recording_started signal. If not wired, guard it:
      setTimeout(() => {
        if (recordingStateRef.current === 'starting') {
          setRecordingState('recording');
        }
      }, 4000);
    } catch (e: any) {
      setRecordingState('idle');
      setConsentDialog(null);
      toast.toast({ title: 'Could not start', description: e?.message ?? 'Try again', variant: 'error' });
    }
  }

  // Ref to avoid stale closures in timeouts
  const recordingStateRef = React.useRef(recordingState);
  React.useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  /* ------ Handlers ------ */

  async function handleInitiateRecording() {
    try {
      // 1. Show estimate
      setConsentDialog({ mode: 'estimate' });
      const est = await estimateQ.mutateAsync(sessionId);
      setEstimate(est as any);
    } catch (e: any) {
      toast.toast({ title: 'Estimate unavailable', description: e?.message ?? 'Try again', variant: 'error' });
    }
  }

  async function confirmAfterEstimate() {
    setConsentDialog({ mode: 'outbound_request' });
  }

  async function consentAndRequest() {
    try {
      await consentQ.mutateAsync({ exchangeSessionId: sessionId, consented: true });
      setRecordingState('waiting_for_partner');
      setConsentDialog(null);
      sendSignal({ type: 'consent_request' });
      toast.toast({ title: 'Awaiting partner consent…', variant: 'info' });
    } catch (e: any) {
      toast.toast({ title: 'Consent failed', description: e?.message ?? 'Try again', variant: 'error' });
    }
  }

  async function acceptInboundConsent() {
    try {
      await consentQ.mutateAsync({ exchangeSessionId: sessionId, consented: true });
      sendSignal({ type: 'consent_accept' });
      beginRecording();
    } catch (e: any) {
      sendSignal({ type: 'consent_error' });
      toast.toast({ title: 'Consent failed', variant: 'error' });
    }
    setConsentDialog(null);
  }

  async function declineInboundConsent() {
    try {
      await consentQ.mutateAsync({ exchangeSessionId: sessionId, consented: false });
    } catch {
      // ignore
    }
    sendSignal({ type: 'consent_decline' });
    setRecordingState('idle');
    setConsentDialog(null);
  }

  async function handleStopRecording() {
    try {
      await stopRecQ.mutateAsync({exchangeSessionId: sessionId});
      sendSignal({ type: 'recording_stopped' });
      setRecordingState('processing');
      setTimeout(() => {
        setRecordingState('idle');
        toast.toast({ title: 'Recording saved', variant: 'success' });
      }, 3500);
    } catch (e: any) {
      toast.toast({ title: 'Could not stop', variant: 'error' });
    }
  }

  function handleLeave(confirm = true) {
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
  }

  async function handleSendChat() {
    const text = chatText.trim();
    if (!text) return;
    try {
      await sendMsgQ.mutateAsync({ exchangeSessionId: sessionId, message: text });
      setChatText('');
      await chatMsgsQ.refetch();
      setTimeout(() => {
        flatRef.current?.scrollToEnd?.({ animated: true });
      }, 50);
    } catch (e: any) {
      toast.toast({ title: 'Failed to send', variant: 'error' });
    }
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: SPACING[5], gap: SPACING[4], justifyContent: 'center', maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', gap: SPACING[3] }}>
            <View style={{ width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: getAccent('red').bg, alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={24} color={getAccent('red').main} />
            </View>
            <ThemedText type="title" style={{ fontSize: FONT_SIZE.xl, fontWeight: '600' }}>
              {t('cantJoinSession')}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
              {error}
            </ThemedText>
          </View>
          <Button
            variant="outline"
            onPress={() => (exchangeId ? router.back() : router.back())}
            leftIcon={<ArrowLeft size={16} color={theme.foreground} />}
          >
            {t('goBack')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3] }}>
            <Loader2 size={32} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              {t('connecting')}
            </ThemedText>
          </View>
        ) : (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={true}
            onDisconnected={() => handleLeave(false)}
          >
            {/* Bridges the LiveKit context data channel back to RoomScreen state */}
            <RecordingDataChannelHandler 
              onInboundSignal={handleSignalInbound} 
              setSendSignal={setSendSignalRef} 
            />

            <View style={{ flex: 1, backgroundColor: '#000' }}>
              {/* Top bar: timer & status */}
              <TopBar
                onBack={() => handleLeave(true)}
                sessionStartTime={scheduledAt}
                remainingStr={remainingStr}
                progressPct={progressPct}
                recordingState={recordingState}
                recordingStopAt={recordingStopAt}
                now={now}
              />

              {/* Main content: Video / Chat */}
              <Tabs<RoomTab>
                variant="underline"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'room', label: t('room'), icon: <Video size={14} color={tab === 'room' ? '#fff' : theme.mutedForeground} /> },
                  {
                    value: 'chat',
                    label: t('chat'),
                    badge: (chatMsgsQ.data ?? []).length || undefined,
                    icon: <MessageSquare size={14} color={tab === 'chat' ? '#fff' : theme.mutedForeground} />,
                  },
                ]}
                style={{ backgroundColor: '#0a0a0a', paddingHorizontal: SPACING[5], paddingVertical: SPACING[2] }}
              />

              {tab === 'room' ? (
                <RoomBody
                  session={session}
                  partner={detailsQ.data?.partner as any}
                  me={currentUser}
                  onLeave={() => handleLeave(true)}
                />
              ) : (
                <ChatBody
                  messages={(chatMsgsQ.data ?? []) as any[]}
                  loading={chatMsgsQ.isLoading}
                  me={currentUser}
                  onRefresh={() => chatMsgsQ.refetch()}
                  flatRef={flatRef}
                />
              )}

              {/* Bottom control bar */}
              <ControlsBar
                insets={insets}
                recordingState={recordingState}
                onRecording={
                  recordingState === 'recording' || recordingState === 'processing'
                    ? handleStopRecording
                    : recordingState === 'idle'
                      ? handleInitiateRecording
                      : undefined
                }
                onChat={() => setTab(tab === 'chat' ? 'room' : 'chat')}
                onLeave={() => handleLeave(true)}
                chatBadge={(chatMsgsQ.data ?? []).length > 0 && tab !== 'chat'}
              />

              {/* Chat input (only when chat) */}
              {tab === 'chat' ? (
                <View
                  style={{
                    paddingHorizontal: SPACING[3],
                    paddingBottom: SPACING[3],
                    paddingTop: SPACING[2],
                    backgroundColor: '#0a0a0a',
                    borderTopWidth: 1,
                    borderTopColor: '#1f1f23',
                    flexDirection: 'row',
                    gap: SPACING[2],
                  }}
                >
                  <TextInput
                    value={chatText}
                    onChangeText={setChatText}
                    placeholder={t('sendMessagePlaceholder')}
                    placeholderTextColor="#52525b"
                    style={{
                      flex: 1,
                      borderRadius: RADIUS.pill,
                      backgroundColor: '#18181b',
                      color: '#fff',
                      paddingHorizontal: SPACING[4],
                      paddingVertical: SPACING[3],
                      fontSize: FONT_SIZE.md,
                    }}
                    onSubmitEditing={handleSendChat}
                    returnKeyType="send"
                  />
                  <Pressable
                    onPress={handleSendChat}
                    disabled={!chatText.trim() || sendMsgQ.isPending}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADIUS.pill,
                      backgroundColor: !chatText.trim() ? '#27272a' : theme.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {sendMsgQ.isPending ? (
                      <Loader2 size={16} color="#fff" />
                    ) : (
                      <Send size={16} color="#fff" />
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          </LiveKitRoom>
        )}
      </KeyboardAvoidingView>

      {/* Recording: estimate dialog */}
      <Dialog open={!!consentDialog && consentDialog.mode === 'estimate'} onOpenChange={(o) => !o && setConsentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recordingEstimate')}</DialogTitle>
            <DialogDescription>
              {t('recordingEstimateDesc')}
            </DialogDescription>
          </DialogHeader>
          {estimate ? (
            <CardContent style={{ gap: SPACING[3] }}>
              <Row label={t('rate')} value={`${estimate.rate} pts / min`} />
              <Row label={t('yourBalance')} value={`${estimate.userBalance.toLocaleString()} pts`} />
              <Row label={t('sessionTimeLeft')} value={`${estimate.remainingSessionMinutes} min`} />
              <Separator />
              <Row
                label={t('maxAffordable')}
                value={`${estimate.maxAffordableMinutes} min`}
                strong
                accent="indigo"
              />
              <View
                style={{
                  padding: SPACING[3],
                  borderRadius: RADIUS.md,
                  backgroundColor: getAccent('amber').bg,
                  borderWidth: 1,
                  borderColor: getAccent('amber').border,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: SPACING[2],
                }}
              >
                <ShieldCheck size={16} color={getAccent('amber').main} style={{ marginTop: 2 }} />
                <ThemedText type="small" style={{ color: getAccent('amber').main, flex: 1, lineHeight: 20 }}>
                  {t('recordingConsentInfo')}
                </ThemedText>
              </View>
            </CardContent>
          ) : (
            <CardContent>
              <SkeletonText lines={4} />
            </CardContent>
          )}
          <DialogFooter>
            <Button variant="outline" onPress={() => setConsentDialog(null)}>
              {t('cancel')}
            </Button>
            <Button
              onPress={confirmAfterEstimate}
              leftIcon={<Sparkles size={16} color="#fff" />}
            >
              {t('requestConsent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recording: outbound consent pending dialog */}
      <Dialog open={!!consentDialog && consentDialog.mode === 'outbound_request'} onOpenChange={(o) => !o && setConsentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('waitingForPartner')}</DialogTitle>
            <DialogDescription>
              {t('waitingForPartnerDesc')}
            </DialogDescription>
          </DialogHeader>
          <CardContent style={{ alignItems: 'center', gap: SPACING[3] }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: RADIUS.pill,
                borderWidth: 2,
                borderColor: theme.primary,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Circle size={22} color={theme.primary} />
            </View>
            <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
              {t('partnerDeclineInfo')}
            </ThemedText>
          </CardContent>
          <DialogFooter>
            <Button variant="outline" onPress={() => { setConsentDialog(null); setRecordingState('idle'); }}>
              {t('cancelRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recording: inbound consent dialog */}
      <Dialog open={!!consentDialog && consentDialog.mode === 'inbound_request'} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('partnerWantsToRecord')}</DialogTitle>
            <DialogDescription>
              {t('partnerWantsToRecordDesc')}
            </DialogDescription>
          </DialogHeader>
          <CardContent style={{ gap: SPACING[3] }}>
            {estimate ? (
              <Row label="Rate" value={`${estimate.rate} pts / min`} />
            ) : null}
            <View
              style={{
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('blue').bg,
                borderWidth: 1,
                borderColor: getAccent('blue').border,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: SPACING[2],
              }}
            >
              <ShieldCheck size={16} color={getAccent('blue').main} style={{ marginTop: 2 }} />
              <ThemedText type="small" style={{ color: getAccent('blue').main, flex: 1, lineHeight: 20 }}>
                {t('recordingAgreement')}
              </ThemedText>
            </View>
          </CardContent>
          <DialogFooter>
            <Button variant="outline" onPress={declineInboundConsent}>
              {t('decline')}
            </Button>
            <Button onPress={acceptInboundConsent} leftIcon={<CheckCircle2 size={16} color="#fff" />}>
              {t('iConsent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave confirmation */}
      <AlertDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={t('leaveSession')}
        description={recordingState === 'recording' ? t('leaveSessionRecordingDesc') : t('leaveSessionDesc')}
        confirmLabel={t('leaveSession')}
        destructive
        onConfirm={() => handleLeave(false)}
      />
    </SafeAreaView>
  );
}

/* ---------------- Top Bar ---------------- */

function TopBar({
  onBack,
  sessionStartTime,
  remainingStr,
  progressPct,
  recordingState,
  recordingStopAt,
  now,
}: any) {
  const theme = useTheme();
  const t = useT('room');
  const recRemain =
    recordingStopAt
      ? formatTimeRemaining(Math.max(0, recordingStopAt - now))
      : null;
  return (
    <View
      style={{
        paddingHorizontal: SPACING[5],
        paddingTop: SPACING[3],
        paddingBottom: SPACING[2],
        gap: SPACING[2],
        backgroundColor: '#0a0a0a',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2], justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          <Pressable onPress={onBack} hitSlop={8} style={{ padding: SPACING[1] }}>
            <ArrowLeft size={18} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <CalendarClock size={14} color={theme.mutedForeground} />
            <ThemedText type="smallBold" style={{ fontSize: 12, color: '#e4e4e7' }}>
              {sessionStartTime ? formatDateTimeShort(sessionStartTime) : t('session')}
            </ThemedText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
          {recordingState === 'recording' || recordingState === 'starting' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, backgroundColor: '#3f1414' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.destructive }} />
              <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fecaca' }}>
                REC
              </ThemedText>
              {recRemain ? (
                <ThemedText type="smallBold" style={{ fontSize: 11, color: '#fecaca', marginLeft: 2 }}>
                  · {recRemain}
                </ThemedText>
              ) : null}
            </View>
          ) : recordingState === 'processing' ? (
            <Badge variant="accent" accent="purple">
              {t('processing')}
            </Badge>
          ) : recordingState === 'waiting_for_partner' ? (
            <Badge variant="accent" accent="amber">
              {t('waitingConsent')}
            </Badge>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, backgroundColor: '#18181b' }}>
            <Clock size={12} color={theme.mutedForeground} />
            <ThemedText type="smallBold" style={{ fontSize: 11, color: '#e4e4e7' }}>
              {remainingStr ?? '--:--'}
            </ThemedText>
          </View>
        </View>
      </View>
      <Progress value={Math.min(100, Math.max(0, progressPct))} />
    </View>
  );
}

/* ---------------- Room Body ---------------- */

function RoomBody({
  session,
  partner,
  me,
}: any) {
  const theme = useTheme();
  const t = useT('room');
  const participants = useParticipants();
  const room = useRoomContext();
  const localParticipant = room?.localParticipant;
  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? true;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? true;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: SPACING[4], gap: SPACING[3] }}>
      <ParticipantGrid
        participants={participants}
        partner={partner}
        me={me}
      />

      {/* Session info strip */}
      <Card style={{ backgroundColor: '#0a0a0a', borderColor: '#1f1f23' }}>
        <CardContent style={{ gap: SPACING[3], paddingVertical: SPACING[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View style={{ width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: getAccent('indigo').bg, alignItems: 'center', justifyContent: 'center' }}>
              <Info size={14} color={getAccent('indigo').main} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                {t('liveSessionReady')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 11 }}>
                {session?.duration ? `${session.duration} ${t('minutes')} · ${session.taughtSkillName ?? t('skillExchange')}` : t('inSessionRoom')}
              </ThemedText>
            </View>
          </View>
          <Separator />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
            <Badge variant="outline">
              <Mic size={10} color={isAudioEnabled ? getAccent('green').main : getAccent('red').main} />
              {'  '}
              {isAudioEnabled ? t('micOn') : t('micMuted')}
            </Badge>
            <Badge variant="outline">
              <Video size={10} color={isVideoEnabled ? getAccent('green').main : getAccent('red').main} />
              {'  '}
              {isVideoEnabled ? t('cameraOn') : t('cameraOff')}
            </Badge>
            <Badge variant="accent" accent="blue">
              <ShieldCheck size={10} color={getAccent('blue').main} />
              {'  '}
              {t('encrypted')}
            </Badge>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

function ParticipantGrid({ participants, partner, me }: any) {
  const t = useT('room');
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: SPACING[3] }}>
      {participants.map((participant: any) => {
        // 1. Grab the publication reference
        const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
        const isMe = participant.isLocal;
        const fallbackName = isMe ? t('you') : (partner?.name ?? participant.identity);
        const isMicEnabled = participant.isMicrophoneEnabled;

        return (
          <View 
            key={participant.identity}
            style={{
              flex: 1,
              borderRadius: RADIUS.lg,
              backgroundColor: '#18181b',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#27272a',
            }}
          >
            {cameraPublication?.videoTrack ? (
              <VideoTrack 
                // 2. Pass publication into the trackRef object
                trackRef={{ 
                  participant, 
                  source: Track.Source.Camera,
                  publication: cameraPublication 
                }} 
                style={{ flex: 1, width: '100%', height: '100%' }} 
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3] }}>
                <Avatar 
                  uri={isMe ? me?.image : partner?.image} 
                  fallback={fallbackName} 
                  size={72} 
                />
                <ThemedText type="smallBold" style={{ fontSize: 13, color: '#fff' }}>
                  {fallbackName}
                </ThemedText>
              </View>
            )}

            {/* Mute Indicator */}
            {!isMicEnabled && (
              <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 }}>
                <MicOff size={14} color="#ef4444" />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- Chat Body ---------------- */

function ChatBody({ messages, loading, me, onRefresh, flatRef }: any) {
  const theme = useTheme();
  const t = useT('room');
  const refreshing = React.useRef(false);
  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      {loading ? (
        <View style={{ padding: SPACING[4], gap: SPACING[3] }}>
          <SkeletonText lines={6} />
        </View>
      ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING[6], gap: SPACING[3] }}>
          <View style={{ width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={22} color="#52525b" />
          </View>
          <ThemedText type="default" style={{ color: '#e4e4e7', fontWeight: '700' }}>
            {t('noMessagesYet')}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
            {t('noMessagesDesc')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={{ padding: SPACING[4], gap: SPACING[3] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: m }: any) => {
            const mine = m.senderId === me?.id;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                  {!mine ? (
                    <Avatar uri={m.sender?.image ?? ''} fallback={m.sender?.name ?? 'P'} size={24} />
                  ) : null}
                  <View
                    style={{
                      maxWidth: '80%',
                      padding: SPACING[3],
                      borderRadius: RADIUS.md,
                      borderTopRightRadius: mine ? 4 : RADIUS.md,
                      borderTopLeftRadius: mine ? RADIUS.md : 4,
                      backgroundColor: mine ? theme.primary : '#18181b',
                      borderWidth: mine ? 0 : 1,
                      borderColor: '#27272a',
                    }}
                  >
                    <ThemedText type="small" style={{ color: mine ? '#fff' : '#e4e4e7', fontSize: 14, lineHeight: 20 }}>
                      {m.message}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={{ color: '#52525b', fontSize: 10, paddingHorizontal: SPACING[1] }}>
                  {formatTimeShort(m.timestamp)}
                </ThemedText>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

/* ---------------- Controls ---------------- */

function ControlsBar({
  insets,
  recordingState,
  onRecording,
  onChat,
  onLeave,
  chatBadge,
}: any) {
  const theme = useTheme();
  const t = useT('room');
  const room = useRoomContext();
  const localParticipant = room?.localParticipant;
  
  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? true;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? true;
  
  const recDisabled = !onRecording;
  const recRecording = recordingState === 'recording' || recordingState === 'processing';
  const recLoading = recordingState === 'starting' || recordingState === 'processing';

  const handleToggleAudio = () => {
    localParticipant?.setMicrophoneEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    localParticipant?.setCameraEnabled(!isVideoEnabled);
  };

  const handleToggleCamera = () => {
    if (localParticipant) {
      // Switch camera position (front/back)
      const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
      if (cameraPublication?.track) {
        const track = cameraPublication.track as any;
        // Toggle facingMode
        if (track.mediaStreamTrack) {
          const currentSettings = track.mediaStreamTrack.getSettings();
          const newFacingMode = currentSettings?.facingMode === 'user' ? 'environment' : 'user';
          
          // Disable camera, restart with new facing mode
          localParticipant.setCameraEnabled(false).then(() => {
            // In React Native, camera switching is handled by the native layer
            // This is a simplified version - actual implementation may need platform-specific code
            localParticipant.setCameraEnabled(true);
          });
        }
      }
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: SPACING[3],
        paddingTop: SPACING[3],
        paddingBottom: Math.max(SPACING[3], insets.bottom),
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#1f1f23',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: SPACING[2] }}>
        <CtrlBtn onPress={handleToggleAudio} active={!isAudioEnabled} destructive={!isAudioEnabled} label={isAudioEnabled ? t('mute') : t('unmute')}>
          {isAudioEnabled ? <Mic size={20} color="#fff" /> : <MicOff size={20} color="#fff" />}
        </CtrlBtn>

        <CtrlBtn onPress={handleToggleVideo} active={!isVideoEnabled} destructive={!isVideoEnabled} label={isVideoEnabled ? t('video') : t('off')}>
          {isVideoEnabled ? <Video size={20} color="#fff" /> : <VideoOff size={20} color="#fff" />}
        </CtrlBtn>

        <CtrlBtn
          onPress={handleToggleCamera}
          label="Flip"
        >
          <RefreshCw size={20} color="#fff" />
        </CtrlBtn>

        <Pressable
          onPress={onRecording}
          disabled={recDisabled}
          style={{
            width: 58,
            height: 58,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: recDisabled
              ? '#27272a'
              : recRecording
                ? getAccent('red').main
                : '#3f1414',
            borderWidth: 2,
            borderColor: recDisabled ? '#3f3f46' : recRecording ? getAccent('red').main : '#ef4444',
            opacity: recDisabled ? 0.5 : 1,
          }}
        >
          {recLoading ? (
            <Loader2 size={20} color="#fff" />
          ) : recRecording ? (
            <Square size={20} color="#fff" fill="#fff" />
          ) : (
            <Circle size={22} color="#ef4444" fill="#ef4444" />
          )}
        </Pressable>

        <CtrlBtn onPress={onChat} label="Chat" badge={chatBadge}>
          <MessageSquare size={20} color="#fff" />
        </CtrlBtn>

        <CtrlBtn
          onPress={onLeave}
          destructive
          label="Leave"
          style={{ backgroundColor: '#3f1414', borderColor: '#7f1d1d', borderWidth: 1 }}
        >
          <PhoneOff size={20} color="#fff" />
        </CtrlBtn>
      </View>
    </View>
  );
}

function CtrlBtn({
  children,
  onPress,
  active,
  destructive,
  label,
  badge,
  style,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        {
          width: 52,
          height: 52,
          borderRadius: RADIUS.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active
            ? destructive
              ? getAccent('red').main
              : getAccent('zinc').main
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
            top: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: getAccent('red').main,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

/* ---------------- helpers ---------------- */

function Row({ label, value, dim, strong, accent }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <ThemedText type="small" style={{ color: dim ? theme.mutedForeground : theme.foreground, fontSize: FONT_SIZE.sm }}>
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? 'default' : 'small'}
        style={{
          color: accent ? getAccent(accent).main : theme.foreground,
          fontSize: FONT_SIZE.sm,
          fontWeight: strong ? '800' : '500',
        }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function formatTimeShort(dateStr: string | Date) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
