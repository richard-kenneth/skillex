import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
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
  Textarea,
  Separator,
  Progress,
  Tabs,
  SkeletonText,
  useToast,
  Alert as UIAlert,
  AlertDialog,
  ActionSheet,
  SelectField,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useExchangeById,
  useMarkExchangeComplete,
  useCreateReview,
} from '@/lib/api-hooks';
import {
  getExchangeStatusColor,
  calculateExchangeProgress,
  calculatePointsBreakdown,
  formatDateShort,
  formatDateTimeShort,
  formatTimeRemaining,
  calculateAverageRating,
} from '@skil-ex2/shared';
import * as v from 'valibot';
import { CreateReviewSchema } from '@skil-ex2/shared';
import {
  ArrowLeft,
  ArrowRightLeft,
  Video,
  CalendarClock,
  HandCoins,
  MessageCircle,
  Clock,
  CalendarCheck,
  Star,
  CheckCircle2,
  ShieldCheck,
  MoreHorizontal,
  XCircle,
  AlertTriangle,
  FileCheck,
  Handshake,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Zap,
} from 'lucide-react-native';
import { ReviewCard } from '../(tabs)/profile';

type Tab = 'overview' | 'sessions' | 'chat' | 'review';

export default function ExchangeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const nav = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const q = useExchangeById(id!);
  const completeQ = useMarkExchangeComplete();
  const reviewQ = useCreateReview();

  const [tab, setTab] = React.useState<Tab>('overview');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [confirmComplete, setConfirmComplete] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagSheet, setTagSheet] = React.useState(false);

  const exchange = q.data as any;
  const loading = q.isLoading;
  const statusColor = getExchangeStatusColor(exchange?.status);
  const progress = exchange ? calculateExchangeProgress(exchange) : 0;
  const other = exchange?.otherUser ?? {};
  const points = exchange?.pointsValue ? calculatePointsBreakdown(exchange.pointsValue) : null;
  const sessions = exchange?.sessions ?? [];
  const canComplete =
    exchange?.status === 'IN_PROGRESS' || exchange?.status === 'ACCEPTED' || exchange?.status === 'SCHEDULED';
  const canReview = exchange?.status === 'COMPLETED' && !exchange?.myReview;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING[5],
            paddingBottom: insets.bottom + SPACING[10],
            width: '100%',
            alignItems: 'center',
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
          style={{ width: '100%' }}
        >
          <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: SPACING[4], paddingTop: SPACING[3] }}>
            {/* Header */}
            <Card>
              <CardContent style={{ paddingTop: SPACING[5], gap: SPACING[4] }}>
                {loading ? (
                  <SkeletonText lines={6} />
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Badge variant="accent" accent={statusColor}>
                        {labelForStatus(exchange.status)}
                      </Badge>
                      <Pressable
                        hitSlop={10}
                        style={{ padding: SPACING[2] }}
                        onPress={() => setSheetOpen(true)}
                      >
                        <MoreHorizontal size={18} color={theme.mutedForeground} />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', gap: SPACING[3], alignItems: 'center' }}>
                      <Pressable onPress={() => router.push(`/users/${other.id}` as any)}>
                        <Avatar uri={other.image} fallback={other.name} size={56} />
                      </Pressable>
                      <View style={{ flex: 1, gap: 3 }}>
                        <ThemedText type="title" style={{ fontSize: FONT_SIZE.xl, fontWeight: '800' }}>
                          {other.name ?? 'Peer'}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                          {other.avgRating != null ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Star size={12} color={getAccent('amber').main} fill={getAccent('amber').main} />
                              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                                {Number(other.avgRating).toFixed(1)}
                              </ThemedText>
                            </View>
                          ) : null}
                          {other.exchangesCompleted ? (
                            <Badge variant="outline">{other.exchangesCompleted} exchanges</Badge>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={{ gap: SPACING[2] }}>
                      <SkillRow
                        accent="emerald"
                        icon={<GraduationCap size={16} color={getAccent('emerald').main} />}
                        title={exchange.myRole === 'TEACHER' ? 'You teach' : 'You learn'}
                        name={exchange.myRole === 'TEACHER' ? exchange.taughtSkillName : exchange.receivedSkillName}
                      />
                      <SkillRow
                        accent="blue"
                        icon={<BookOpen size={16} color={getAccent('blue').main} />}
                        title={exchange.myRole === 'TEACHER' ? 'You learn' : 'They teach'}
                        name={exchange.myRole === 'TEACHER' ? exchange.receivedSkillName : exchange.taughtSkillName}
                      />
                    </View>

                    <View style={{ gap: SPACING[1.5] }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                          Exchange progress
                        </ThemedText>
                        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm, color: theme.primary }}>
                          {progress}%
                        </ThemedText>
                      </View>
                      <Progress value={progress} />
                    </View>

                    <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                      {canComplete ? (
                        <Button
                          style={{ flex: 1 }}
                          onPress={() => setConfirmComplete(true)}
                          loading={completeQ.isPending}
                          leftIcon={<CheckCircle2 size={16} color="#fff" />}
                        >
                          Mark complete
                        </Button>
                      ) : null}
                      {sessions?.[0]?.id && exchange.status !== 'COMPLETED' && exchange.status !== 'CANCELLED' ? (
                        <Button
                          style={{ flex: 1 }}
                          variant="outline"
                          onPress={() => router.push(`/room/${sessions[0].id}` as any)}
                          leftIcon={<Video size={16} color={theme.foreground} />}
                        >
                          {sessions[0].status === 'LIVE' ? 'Join now' : 'Session room'}
                        </Button>
                      ) : null}
                    </View>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs<Tab>
              variant="underline"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'overview', label: 'Overview' },
                { value: 'sessions', label: 'Sessions', badge: sessions.length || undefined },
                { value: 'chat', label: 'Chat' },
                { value: 'review', label: 'Review' },
              ]}
            />

            {/* Tab bodies */}
            {tab === 'overview' && (
              <OverviewBody exchange={exchange} loading={loading} points={points} other={other} />
            )}
            {tab === 'sessions' && (
              <SessionsBody
                sessions={sessions}
                loading={loading}
                onJoin={(sid) => router.push(`/room/${sid}` as any)}
              />
            )}
            {tab === 'chat' && <ChatBody exchangeId={id!} />}
            {tab === 'review' && (
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
                    toast.toast({ title: 'Review submitted', variant: 'success' });
                    setComment('');
                    setTags([]);
                    await q.refetch();
                  } catch (e: any) {
                    if (e instanceof v.ValiError) {
                      toast.toast({
                        title: 'Invalid review',
                        description: (e.issues[0] as any)?.message ?? 'Try again',
                        variant: 'error',
                      });
                      return;
                    }
                    toast.toast({ title: 'Could not submit', variant: 'error' });
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

      {/* Actions sheet */}
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Exchange actions"
        options={[
          {
            label: 'View partner profile',
            icon: <ArrowLeft size={18} color={theme.foreground} />,
            onPress: () => other?.id && router.push(`/users/${other.id}` as any),
          },
          {
            label: 'Report issue',
            icon: <AlertTriangle size={18} color={theme.destructive as any} />,
            subtitle: 'Flag this exchange with support',
            onPress: () => toast.toast({ title: 'Report sent', description: 'Support will reach out shortly.', variant: 'info' }),
          },
        ]}
      />

      {/* Confirm complete */}
      <AlertDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Mark exchange complete?"
        description="Both partners will be able to leave a review and points will be finalized."
        confirmLabel="Mark complete"
        onConfirm={async () => {
          await completeQ.mutateAsync(id!);
          toast.toast({ title: 'Exchange completed', variant: 'success' });
          await q.refetch();
        }}
      />

      {/* Tag sheet */}
      <ActionSheet
        open={tagSheet}
        onClose={() => setTagSheet(false)}
        title="Review qualities"
        description="Select all that apply."
        options={(Object.keys(REVIEW_TAG_LABELS) as (keyof typeof REVIEW_TAG_LABELS)[]).map((k) => {
          const active = tags.includes(k);
          return {
            label: REVIEW_TAG_LABELS[k],
            onPress: () => {
              setTags((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
            },
            icon: active ? <CheckCircle2 size={18} color={theme.primary} /> : <CheckCircle2 size={18} color={theme.mutedForeground} />,
          };
        })}
      />
    </SafeAreaView>
  );
}

const REVIEW_TAG_LABELS = {
  GREAT_COMMUNICATION: 'Great communicator',
  ON_TIME: 'On time',
  KNOWLEDGEABLE: 'Knowledgeable',
  PATIENT: 'Patient teacher',
  ENGAGED: 'Engaged & prepared',
  CLEAR_FEEDBACK: 'Clear feedback',
  RESPECTFUL: 'Respectful',
  FRIENDLY: 'Friendly & fun',
};

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
        flexDirection: 'row',
        alignItems: 'center',
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
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ fontSize: 11, color: palette.main, textTransform: 'uppercase' as const }}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {name ?? '—'}
        </ThemedText>
      </View>
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
      {/* Points */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('amber').bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HandCoins size={18} color={getAccent('amber').main} />
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
              <Row label="Commission (10%)" value={`${points.fee} pts`} dim />
              <Separator />
              <Row label="Net to facilitator" value={`${points.net} pts`} strong accent main />
            </>
          ) : (
            <ThemedText type="small" style={{ color: theme.mutedForeground }}>
              No points amount set yet.
            </ThemedText>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('violet').bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck size={18} color={getAccent('violet').main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Key events for this exchange.</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: 0, paddingHorizontal: 0 }}>
          <TimelineDot icon={<Handshake size={14} color={theme.primary} />} label="Exchange created" at={exchange?.createdAt} accent="indigo" />
          {exchange?.acceptedAt ? (
            <TimelineDot icon={<CheckCircle2 size={14} color={getAccent('emerald').main} />} label="Accepted" at={exchange.acceptedAt} accent="emerald" />
          ) : null}
          {exchange?.completedAt ? (
            <TimelineDot icon={<FileCheck size={14} color={getAccent('blue').main} />} label="Completed" at={exchange.completedAt} accent="blue" />
          ) : null}
          {exchange?.cancelledAt ? (
            <TimelineDot icon={<XCircle size={14} color={getAccent('red').main} />} label="Cancelled" at={exchange.cancelledAt} accent="red" />
          ) : null}
        </CardContent>
      </Card>

      {/* Partner card */}
      <Card>
        <CardHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: RADIUS.md,
                backgroundColor: getAccent('blue').bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} color={getAccent('blue').main} />
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

function Row({ label, value, dim, strong, accent, main }: any) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <ThemedText
        type="small"
        style={{ color: dim ? theme.mutedForeground : theme.foreground, fontSize: FONT_SIZE.md }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type={strong ? 'default' : 'small'}
        style={{
          color: main ? getAccent(accent ?? 'amber').main : theme.foreground,
          fontSize: FONT_SIZE.md,
          fontWeight: strong ? '800' : '500',
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING[3],
        paddingHorizontal: SPACING[5],
        paddingVertical: SPACING[3],
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: RADIUS.pill,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
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

function SessionsBody({
  sessions,
  loading,
  onJoin,
}: {
  sessions: any[];
  loading: boolean;
  onJoin: (id: string) => void;
}) {
  const theme = useTheme();
  if (loading)
    return (
      <Card>
        <CardContent>
          <SkeletonText lines={4} />
        </CardContent>
      </Card>
    );
  if (!sessions?.length)
    return (
      <Card>
        <CardContent style={{ paddingVertical: SPACING[8], alignItems: 'center', gap: SPACING[3] }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: RADIUS.pill,
              backgroundColor: getAccent('indigo').bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarClock size={22} color={getAccent('indigo').main} />
          </View>
          <ThemedText type="default" style={{ fontWeight: '700' }}>No sessions scheduled</ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}
          >
            Propose some times in the chat or on the matches page.
          </ThemedText>
        </CardContent>
      </Card>
    );
  return (
    <View style={{ gap: SPACING[3] }}>
      {sessions.map((s) => {
        const isLive = s.status === 'LIVE';
        const isDone = s.status === 'COMPLETED' || s.status === 'CANCELLED';
        return (
          <Card key={s.id}>
            <CardContent style={{ gap: SPACING[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: RADIUS.md,
                      backgroundColor: isLive ? getAccent('red').bg : getAccent('indigo').bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Video size={16} color={isLive ? getAccent('red').main : getAccent('indigo').main} />
                  </View>
                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                      {isLive ? 'Session live' : isDone ? 'Session complete' : 'Upcoming session'}
                    </ThemedText>
                    {s.startTime ? (
                      <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                        {formatDateTimeShort(s.startTime)}
                        {s.endTime
                          ? ` · ${formatTimeRemaining(new Date(s.startTime).getTime() - Date.now()) ?? 'scheduled'}`
                          : ''}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                {!isDone ? (
                  <Button
                    size="sm"
                    variant={isLive ? 'default' : 'outline'}
                    onPress={() => onJoin(s.id)}
                    leftIcon={isLive ? <Zap size={14} color="#fff" /> : <Video size={14} color={theme.foreground} />}
                  >
                    {isLive ? 'Join live' : 'Join room'}
                  </Button>
                ) : (
                  <Badge variant={s.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                    {s.status}
                  </Badge>
                )}
              </View>
              {s.durationMinutes ? (
                <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                  <Badge variant="outline">{s.durationMinutes} min</Badge>
                  {s.recordingStatus === 'AVAILABLE' ? (
                    <Badge variant="accent" accent="purple">
                      Recording available
                    </Badge>
                  ) : null}
                </View>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </View>
  );
}

function ChatBody({ exchangeId }: { exchangeId: string }) {
  const theme = useTheme();
  // Placeholder for realtime chat. Full implementation would use SSE/WebSocket.
  return (
    <Card>
      <CardContent style={{ gap: SPACING[4] }}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: SPACING[4],
          }}
        >
          <MessageCircle size={28} color={theme.primary} />
          <ThemedText type="default" style={{ fontWeight: '700', marginTop: SPACING[2] }}>
            Chat with your partner
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.mutedForeground, textAlign: 'center', marginTop: SPACING[1] }}
          >
            Propose times, ask questions, or share session context.
          </ThemedText>
        </View>
        <Separator />
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
          Full chat integration — messages, read status, slot proposals and more — is available inside the session room.
        </ThemedText>
      </CardContent>
    </Card>
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
  setTags,
  openTags,
}: any) {
  const theme = useTheme();
  const theirReview = exchange?.theirReview;
  const myReview = exchange?.myReview;

  return (
    <View style={{ gap: SPACING[4] }}>
      {canReview ? (
        <Card style={{ borderColor: getAccent('amber').border }}>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.md,
                  backgroundColor: getAccent('amber').bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star size={18} color={getAccent('amber').main} fill={getAccent('amber').main} />
              </View>
              <View style={{ flex: 1 }}>
                <CardTitle>Leave a review</CardTitle>
                <CardDescription>Help others know what to expect.</CardDescription>
              </View>
            </View>
          </CardHeader>
          <CardContent style={{ gap: SPACING[4] }}>
            <View style={{ alignItems: 'center', gap: SPACING[2] }}>
              <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= rating;
                  return (
                    <Pressable key={n} onPress={() => setRating(n)} hitSlop={10}>
                      <Star
                        size={30}
                        color={active ? getAccent('amber').main : theme.mutedForeground}
                        fill={active ? getAccent('amber').main : 'transparent'}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.lg, color: getAccent('amber').main }}>
                {rating} / 5
              </ThemedText>
            </View>
            <Textarea
              label="How did it go?"
              value={comment}
              onChangeText={setComment}
              placeholder="Share what you liked or areas to improve…"
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
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm, marginLeft: SPACING[0.5], marginBottom: SPACING[1] }}>
                Qualities ({tags.length}/8)
              </ThemedText>
              {tags.length === 0 ? (
                <ThemedText type="small" style={{ color: theme.mutedForeground }}>
                  Tap to select qualities…
                </ThemedText>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
                  {tags.map((t: string) => (
                    <Badge key={t} variant="accent" accent="indigo">
                      {REVIEW_TAG_LABELS[t as keyof typeof REVIEW_TAG_LABELS] ?? t}
                    </Badge>
                  ))}
                </View>
              )}
            </Pressable>
            <Button onPress={onSubmit} loading={submitting} leftIcon={<CheckCircle2 size={16} color="#fff" />}>
              Submit review
            </Button>
          </CardContent>
        </Card>
      ) : myReview ? (
        <ReviewCard review={myReview} />
      ) : !loading ? (
        <Card>
          <CardContent style={{ paddingVertical: SPACING[6], alignItems: 'center', gap: SPACING[2] }}>
            <ThemedText type="default" style={{ fontWeight: '700', textAlign: 'center' }}>
              Complete the exchange to leave a review
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}
            >
              Reviews open once both sessions are marked complete.
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

function labelForStatus(s: string) {
  switch (s) {
    case 'IN_PROGRESS':
      return 'In progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ACCEPTED':
      return 'Accepted';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'PENDING':
      return 'Pending';
    case 'REJECTED':
      return 'Rejected';
    case 'EXPIRED':
      return 'Expired';
    default:
      return s.replace(/_/g, ' ');
  }
}
