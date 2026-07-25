import React from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  Skeleton,
  SkeletonText,
  Tabs,
  Textarea,
  useToast,
  Alert as UIAlert,
  AlertDialog,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useMatches,
  useRequests,
  useAcceptRequest,
  useRejectRequest,
  useCancelRequest,
  useCreateRequest,
} from '@/lib/api-hooks';
import {
  getRequestStatusColor,
  formatDateShort,
  calculateAverageRating,
} from '@skil-ex2/shared';
import * as v from 'valibot';
import { CreateExchangeRequestSchema } from '@skil-ex2/shared/dist/schemas/exchange.schema.js';
import {
  Users,
  Sparkles,
  Handshake,
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  MessageSquare,
  Clock,
  ChevronRight,
  GraduationCap,
  BookOpen,
  UserPlus,
  Shield,
  Star,
  Target,
  ArrowRightLeft,
} from 'lucide-react-native';
import { cn } from '@/lib/style-utils';

type SubTab = 'discover' | 'requests';

export default function MatchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = React.useState<SubTab>('discover');
  const [refreshing, setRefreshing] = React.useState(false);
  const matchesQ = useMatches();
  const requestsQ = useRequests();

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([matchesQ.refetch(), requestsQ.refetch()]);
    setRefreshing(false);
  };

  const data = matchesQ.data as any;
  const perfect = data?.perfectMatches ?? [];
  const partial = data?.partialMatches ?? [];
  const incoming = (requestsQ.data ?? []).filter((r: any) => r.direction === 'INCOMING');
  const outgoing = (requestsQ.data ?? []).filter((r: any) => r.direction === 'OUTGOING');

  const requestCounts = {
    incoming: incoming.length,
    outgoing: outgoing.length,
    total: (requestsQ.data ?? []).length,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1 }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: SPACING[5],
              paddingTop: SPACING[2],
              paddingBottom: SPACING[4],
              gap: SPACING[3],
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <ThemedText type="title" style={{ fontSize: FONT_SIZE['2xl'], fontWeight: '800', letterSpacing: -0.2 }}>
                  Matches
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                  Discover people ready to exchange
                </ThemedText>
              </View>
            </View>

            <Tabs<SubTab>
              variant="pills"
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: 'discover',
                  label: 'Discover',
                  icon: <Sparkles size={14} color={tab === 'discover' ? '#fff' : theme.mutedForeground} />,
                  badge: perfect.length + partial.length || undefined,
                },
                {
                  value: 'requests',
                  label: 'Requests',
                  icon: <Inbox size={14} color={tab === 'requests' ? '#fff' : theme.mutedForeground} />,
                  badge: requestCounts.total || undefined,
                },
              ]}
            />
          </View>

          {tab === 'discover' ? (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: SPACING[5],
                paddingBottom: insets.bottom + SPACING[10],
                gap: SPACING[4],
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} colors={[theme.primary]} />
              }
            >
              <Card style={{ borderColor: getAccent('indigo').border }}>
                <CardHeader>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: RADIUS.md,
                        backgroundColor: getAccent('indigo').bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Sparkles size={18} color={getAccent('indigo').main} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CardTitle>Perfect matches</CardTitle>
                      <CardDescription>You teach what they want — they teach what you want.</CardDescription>
                    </View>
                    <Badge variant="default">{perfect.length}</Badge>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: SPACING[3] }}>
                  {matchesQ.isLoading ? (
                    <View style={{ gap: SPACING[3] }}>
                      <SkeletonText lines={4} />
                      <SkeletonText lines={4} />
                    </View>
                  ) : perfect.length === 0 ? (
                    <EmptyMatches
                      onAdd={() => router.push('/(tabs)/profile' as any)}
                      title="No perfect matches yet"
                      description="Add the skills you teach and want to learn to find your perfect exchange partner."
                    />
                  ) : (
                    perfect.map((m: any) => (
                      <MatchCard key={m.user.id} match={m} perfect onPress={() => router.push(`/users/${m.user.id}` as any)} />
                    ))
                  )}
                </CardContent>
              </Card>

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
                      <Target size={18} color={getAccent('blue').main} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CardTitle>Partial matches</CardTitle>
                      <CardDescription>One-way matches you might be able to work out.</CardDescription>
                    </View>
                    <Badge variant="outline">{partial.length}</Badge>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: SPACING[3] }}>
                  {matchesQ.isLoading ? (
                    <SkeletonText lines={4} />
                  ) : partial.length === 0 ? (
                    <EmptyMatches
                      onAdd={() => router.push('/(tabs)/profile' as any)}
                      title="No partial matches yet"
                      description="Add skills to broaden your network."
                    />
                  ) : (
                    partial.map((m: any) => (
                      <MatchCard key={m.user.id} match={m} onPress={() => router.push(`/users/${m.user.id}` as any)} />
                    ))
                  )}
                </CardContent>
              </Card>
            </ScrollView>
          ) : (
            <RequestsList
              incoming={incoming}
              outgoing={outgoing}
              loading={requestsQ.isLoading}
              refreshing={refreshing}
              onRefresh={refresh}
              insetsBottom={insets.bottom}
            />
          )}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

/* ---------------- Match Card ---------------- */

function MatchCard({
  match,
  perfect,
  onPress,
}: {
  match: any;
  perfect?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const user = match.user as any;
  const canTeachMe = match.canTeachMe ?? []; // they teach, I want
  const canLearnFromMe = match.canLearnFromMe ?? []; // I teach, they want
  const avgRating = user.reviews?.length ? calculateAverageRating(user.reviews) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: RADIUS.md,
        borderWidth: perfect ? 1 : StyleSheet.hairlineWidth,
        borderColor: perfect ? getAccent('indigo').border : theme.border,
        backgroundColor: theme.backgroundElement,
        padding: SPACING[4],
        gap: SPACING[3],
      }}
    >
      <View style={{ flexDirection: 'row', gap: SPACING[3] }}>
        <Avatar uri={user.image} fallback={user.name} size={48} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="default" style={{ fontSize: FONT_SIZE.lg, fontWeight: '700' }}>
              {user.name}
            </ThemedText>
            {perfect ? (
              <Badge variant="accent" accent="indigo">
                <Sparkles size={12} color={getAccent('indigo').main} /> Perfect
              </Badge>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <Star size={12} color={getAccent('amber').main} fill={getAccent('amber').main} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                {avgRating.toFixed(1)}
              </ThemedText>
            </View>
            {user.exchangesCompleted ? (
              <Badge variant="outline">{user.exchangesCompleted} exchanges</Badge>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ gap: SPACING[2] }}>
        {canTeachMe.length > 0 ? (
          <View style={{ gap: SPACING[1.5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5] }}>
              <GraduationCap size={14} color={getAccent('emerald').main} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                They can teach you
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], paddingLeft: SPACING[5] }}>
              {canTeachMe.slice(0, 4).map((s: any) => (
                <Badge key={s.id} variant="accent" accent="emerald">
                  {s.name}
                </Badge>
              ))}
            </View>
          </View>
        ) : null}

        {canLearnFromMe.length > 0 ? (
          <View style={{ gap: SPACING[1.5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5] }}>
              <BookOpen size={14} color={getAccent('blue').main} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                Wants to learn from you
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], paddingLeft: SPACING[5] }}>
              {canLearnFromMe.slice(0, 4).map((s: any) => (
                <Badge key={s.id} variant="accent" accent="blue">
                  {s.name}
                </Badge>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
        <Button style={{ flex: 1 }} size="sm" leftIcon={<Handshake size={14} color="#fff" />} onPress={onPress}>
          Exchange
        </Button>
        <Button variant="outline" size="sm" leftIcon={<MessageSquare size={14} color={theme.foreground} />} onPress={onPress}>
          View
        </Button>
      </View>
    </Pressable>
  );
}

import { StyleSheet } from 'react-native';

function EmptyMatches({ onAdd, title, description }: { onAdd: () => void; title: string; description: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: SPACING[6],
        borderRadius: RADIUS.md,
        backgroundColor: theme.background,
        alignItems: 'center',
        gap: SPACING[3],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: RADIUS.pill,
          backgroundColor: getAccent('blue').bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Users size={24} color={getAccent('blue').main} />
      </View>
      <ThemedText type="default" style={{ fontWeight: '700', textAlign: 'center' }}>
        {title}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}>
        {description}
      </ThemedText>
      <Button size="sm" onPress={onAdd} leftIcon={<UserPlus size={14} color="#fff" />}>
        Set up skills
      </Button>
    </View>
  );
}

/* ---------------- Requests list ---------------- */

function RequestsList({
  incoming,
  outgoing,
  loading,
  refreshing,
  onRefresh,
  insetsBottom,
}: {
  incoming: any[];
  outgoing: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  insetsBottom: number;
}) {
  const theme = useTheme();
  const [sub, setSub] = React.useState<'incoming' | 'outgoing'>('incoming');
  const list = sub === 'incoming' ? incoming : outgoing;

  const acceptQ = useAcceptRequest();
  const rejectQ = useRejectRequest();
  const cancelQ = useCancelRequest();
  const toast = useToast();
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: SPACING[5], paddingBottom: SPACING[3] }}>
        <Tabs<'incoming' | 'outgoing'>
          value={sub}
          onChange={setSub}
          variant="pills"
          items={[
            { value: 'incoming', label: 'Incoming', badge: incoming.length || undefined },
            { value: 'outgoing', label: 'Outgoing', badge: outgoing.length || undefined },
          ]}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingHorizontal: SPACING[5],
          paddingBottom: insetsBottom + SPACING[10],
          gap: SPACING[3],
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: SPACING[3] }}>
              <SkeletonText lines={5} />
              <SkeletonText lines={5} />
            </View>
          ) : (
            <View
              style={{
                padding: SPACING[6],
                alignItems: 'center',
                gap: SPACING[3],
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: RADIUS.pill,
                  backgroundColor: theme.backgroundElement,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inbox size={22} color={theme.mutedForeground} />
              </View>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                No {sub} requests
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}>
                {sub === 'incoming'
                  ? 'Requests from others will appear here.'
                  : 'Your proposals will live here.'}
              </ThemedText>
              {sub === 'outgoing' ? (
                <Button size="sm" onPress={() => router.push('/(tabs)/index' as any)} leftIcon={<Sparkles size={14} color="#fff" />}>
                  Browse matches
                </Button>
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            direction={sub}
            onOpen={() => router.push(`/requests/${item.id}` as any)}
            onAccept={async () => {
              try {
                await acceptQ.mutateAsync(item.id);
                toast.toast({ title: 'Request accepted', variant: 'success' });
              } catch (e: any) {
                toast.toast({ title: 'Could not accept', description: e?.message ?? 'Try again', variant: 'error' });
              }
            }}
            onReject={async () => {
              try {
                await rejectQ.mutateAsync(item.id);
                toast.toast({ title: 'Request rejected', variant: 'info' });
              } catch (e: any) {
                toast.toast({ title: 'Could not reject', variant: 'error' });
              }
            }}
            onCancel={async () => {
              try {
                await cancelQ.mutateAsync(item.id);
                toast.toast({ title: 'Request cancelled', variant: 'info' });
              } catch (e: any) {
                toast.toast({ title: 'Could not cancel', variant: 'error' });
              }
            }}
          />
        )}
      />
    </View>
  );
}

export function RequestCard({
  request,
  direction,
  onOpen,
  onAccept,
  onReject,
  onCancel,
}: {
  request: any;
  direction: 'incoming' | 'outgoing';
  onOpen: () => void;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onCancel?: () => Promise<void>;
}) {
  const theme = useTheme();
  const statusColor = getRequestStatusColor(request.status);
  const other = direction === 'incoming' ? request.fromUser : request.toUser;
  const [confirmReject, setConfirmReject] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  return (
    <Pressable
      onPress={onOpen}
      style={{
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: SPACING[4], gap: SPACING[3] }}>
        <View style={{ flexDirection: 'row', gap: SPACING[3], alignItems: 'center' }}>
          <Avatar uri={other?.image} fallback={other?.name} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                {direction === 'incoming' ? `From ${other?.name ?? 'User'}` : `To ${other?.name ?? 'User'}`}
              </ThemedText>
              <Badge variant="accent" accent={statusColor}>
                {request.status.replace('_', ' ')}
              </Badge>
            </View>
            <View style={{ flexDirection: 'row', gap: SPACING[2], marginTop: 2 }}>
              <Badge variant="accent" accent="emerald">
                <GraduationCap size={10} color={getAccent('emerald').main} />
                {' '}
                {request.offeredSkill?.name ?? request.offeredSkillName ?? '—'}
              </Badge>
              <ArrowRightLeft size={14} color={theme.mutedForeground} />
              <Badge variant="accent" accent="blue">
                <BookOpen size={10} color={getAccent('blue').main} />
                {' '}
                {request.requestedSkill?.name ?? request.requestedSkillName ?? '—'}
              </Badge>
            </View>
          </View>
        </View>

        {request.message ? (
          <ThemedText
            type="small"
            style={{
              color: theme.foreground,
              fontSize: FONT_SIZE.sm,
              lineHeight: 20,
              padding: SPACING[3],
              backgroundColor: theme.backgroundElement,
              borderRadius: RADIUS.md,
            }}
          >
            “{request.message}”
          </ThemedText>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5] }}>
            <Clock size={12} color={theme.mutedForeground} />
            <ThemedText type="small" style={{ fontSize: 11, color: theme.mutedForeground }}>
              {formatDateShort(request.createdAt)}
            </ThemedText>
          </View>
          <ChevronRight size={16} color={theme.mutedForeground} />
        </View>

        {direction === 'incoming' && request.status === 'PENDING' ? (
          <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
            <Button
              style={{ flex: 1 }}
              size="sm"
              onPress={() => onAccept?.()}
              loading={onAccept && false}
              leftIcon={<CheckCircle2 size={14} color="#fff" />}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onPress={() => setConfirmReject(true)}
              leftIcon={<XCircle size={14} color="#fff" />}
            >
              Reject
            </Button>
          </View>
        ) : direction === 'outgoing' && request.status === 'PENDING' ? (
          <Button size="sm" variant="outline" onPress={() => setConfirmCancel(true)} leftIcon={<Ban size={14} color={theme.foreground} />}>
            Cancel request
          </Button>
        ) : null}
      </View>
      <AlertDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this request?"
        description="This cannot be undone."
        confirmLabel="Reject"
        destructive
        onConfirm={() => onReject?.()}
      />
      <AlertDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel your request?"
        confirmLabel="Cancel request"
        destructive
        onConfirm={() => onCancel?.()}
      />
    </Pressable>
  );
}
