import React from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH, ICON_SIZE } from '@/constants/theme';
import { useT } from 'lib/i18n';
import {
  Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  PressableCard, SkeletonText, Tabs, useToast, AlertDialog,
} from '@/components/ui';
import { CustomHeader } from '@/components/ui/custom-header';
import { ThemedText } from '@/components/themed-text';
import { useMatches, useRequests, useAcceptRequest, useRejectRequest, useCancelRequest } from '@/lib/api-hooks';
import { getRequestStatusColor, formatDateShort, calculateAverageRating } from '@skil-ex2/shared';
import {
  Users, Handshake, Inbox, CheckCircle2, XCircle, Ban, Clock,
  ChevronRight, GraduationCap, BookOpen, UserPlus, Star, ArrowRightLeft,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SubTab = 'discover' | 'requests';

export default function MatchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT('matches');

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
  const incoming = (requestsQ.data as any)?.['received'] ?? [];
  const outgoing = (requestsQ.data as any)?.['sent'] ?? [];

  const requestCounts = {
    incoming: incoming.length,
    outgoing: outgoing.length,
    total: (requestsQ.data ?? []).length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader title="Matches" subtitle="Connect with peer experts" showNotifications showSearch />

      <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] }}>
          <Tabs<SubTab>
            variant="pills"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'discover', label: t('discoverLabel'), badge: perfect.length + partial.length || undefined },
              { value: 'requests', label: t('requestsLabel'), badge: requestCounts.total || undefined },
            ]}
          />
        </View>

        {tab === 'discover' ? (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SPACING[4],
              paddingBottom: insets.bottom + 100,
              gap: SPACING[4],
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.mutedForeground} colors={[theme.mutedForeground]} />}
          >
            {/* Perfect Matches */}
            <Card variant="glass">
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[2] }}>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{t('perfectMatchesTitle')}</CardTitle>
                    <CardDescription>{t('perfectMatchesDesc')}</CardDescription>
                  </View>
                  <Badge variant="secondary">{perfect.length}</Badge>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {matchesQ.isLoading ? (
                  <View style={{ gap: SPACING[3] }}><SkeletonText lines={4} /><SkeletonText lines={4} /></View>
                ) : perfect.length === 0 ? (
                  <EmptyMatches onAdd={() => router.push('/(tabs)/profile' as any)} title={t('noMatchesTitle')} description={t('noMatchesDesc')} />
                ) : (
                  perfect.map((m: any, i: number) => (
                    <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(i * 50)}>
                      <MatchCard match={m} perfect onPress={() => router.push(`/users/${m.id}` as any)} />
                    </Animated.View>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Partial Matches */}
            <Card variant="glass">
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[2] }}>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{t('moreMatchesTitle')}</CardTitle>
                    <CardDescription>{t('moreMatchesDesc')}</CardDescription>
                  </View>
                  <Badge variant="secondary">{partial.length}</Badge>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {matchesQ.isLoading ? (
                  <SkeletonText lines={4} />
                ) : partial.length === 0 ? (
                  <EmptyMatches onAdd={() => router.push('/(tabs)/profile' as any)} title={t('noMatchesTitle')} description={t('noMatchesDesc')} />
                ) : (
                  partial.map((m: any, i: number) => (
                    <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(i * 50)}>
                      <MatchCard match={m} onPress={() => router.push(`/users/${m.id}` as any)} />
                    </Animated.View>
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
    </View>
  );
}

function MatchCard({ match, perfect, onPress }: { match: any; perfect?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const t = useT('matches');
  const user = match as any;
  const canTeachMe = match.canTeachMe ?? [];
  const canLearnFromMe = match.canLearnFromMe ?? [];
  const avgRating = user.reviews?.length ? calculateAverageRating(user.reviews) : 0;

  return (
    <PressableCard onPress={onPress} variant="default" style={{ padding: SPACING[4], gap: SPACING[3] }}>
      <View style={{ flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' }}>
        <Avatar uri={user.image} fallback={user.name} size={46} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: SPACING[1.5] }}>
            <ThemedText type="cardTitle" style={{ flexShrink: 1 }}>
              {user.name}
            </ThemedText>
            {perfect && <Badge variant="default">Perfect Match</Badge>}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <ThemedText type="caption">{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</ThemedText>
            </View>
            {user.exchangesCompleted ? (
              <ThemedText type="caption" muted style={{ fontSize: 11 }}>
                · {user.exchangesCompleted} completed exchanges
              </ThemedText>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ gap: SPACING[2.5] }}>
        {canTeachMe.length > 0 && (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1] }}>
              <GraduationCap size={13} color={getAccent('emerald').main} />
              <ThemedText type="caption" style={{ color: getAccent('emerald').main, fontWeight: '600' }}>{t('canTeach')}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {canTeachMe.map((s: any) => (
                <Badge key={s.id} variant="accent" accent="emerald">{s.name}</Badge>
              ))}
            </View>
          </View>
        )}
        {canLearnFromMe.length > 0 && (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1] }}>
              <BookOpen size={13} color={getAccent('indigo').main} />
              <ThemedText type="caption" style={{ color: getAccent('indigo').main, fontWeight: '600' }}>{t('wantsToLearn')}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {canLearnFromMe.map((s: any) => (
                <Badge key={s.id} variant="accent" accent="indigo">{s.name}</Badge>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACING[2], paddingTop: SPACING[1] }}>
        <Button style={{ flex: 1 }} size="sm" variant="default" leftIcon={<Handshake size={14} color={theme.primaryForeground} />} onPress={onPress}>
          {t('requestExchange')}
        </Button>
        <Button variant="outline" size="sm" onPress={onPress}>
          {t('viewProfile')}
        </Button>
      </View>
    </PressableCard>
  );
}

function EmptyMatches({ onAdd, title, description }: { onAdd: () => void; title: string; description: string }) {
  const theme = useTheme();
  const t = useT('matches');
  return (
    <View style={{ padding: SPACING[6], alignItems: 'center', gap: SPACING[3] }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
        <Users size={ICON_SIZE.xl} color={theme.mutedForeground} />
      </View>
      <ThemedText type="cardTitle" style={{ textAlign: 'center' }}>{title}</ThemedText>
      <ThemedText type="caption" muted style={{ textAlign: 'center', maxWidth: 280 }}>{description}</ThemedText>
      <Button size="sm" variant="default" onPress={onAdd} leftIcon={<UserPlus size={14} color={theme.primaryForeground} />}>{t('manageSkills')}</Button>
    </View>
  );
}

function RequestsList({ incoming, outgoing, loading, refreshing, onRefresh, insetsBottom }: {
  incoming: any[]; outgoing: any[]; loading: boolean; refreshing: boolean;
  onRefresh: () => Promise<void>; insetsBottom: number;
}) {
  const theme = useTheme();
  const t = useT('matches');
  const [sub, setSub] = React.useState<'incoming' | 'outgoing'>('incoming');
  const list = sub === 'incoming' ? incoming : outgoing;
  const acceptQ = useAcceptRequest();
  const rejectQ = useRejectRequest();
  const cancelQ = useCancelRequest();
  const toast = useToast();
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: SPACING[4], paddingBottom: SPACING[3] }}>
        <Tabs<'incoming' | 'outgoing'>
          value={sub} onChange={setSub} variant="pills"
          items={[
            { value: 'incoming', label: t('received'), badge: incoming.length || undefined },
            { value: 'outgoing', label: t('sent'), badge: outgoing.length || undefined },
          ]}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: SPACING[4], paddingBottom: insetsBottom + 100, gap: SPACING[3] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.mutedForeground} colors={[theme.mutedForeground]} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: SPACING[3] }}><SkeletonText lines={4} /><SkeletonText lines={4} /></View>
          ) : (
            <View style={{ padding: SPACING[6], alignItems: 'center', gap: SPACING[3] }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Inbox size={ICON_SIZE.xl} color={theme.mutedForeground} />
              </View>
              <ThemedText type="cardTitle">{sub === 'incoming' ? t('noReceivedRequests') : t('noSentRequests')}</ThemedText>
              <ThemedText type="caption" muted style={{ textAlign: 'center', maxWidth: 280 }}>
                {sub === 'incoming' ? t('noReceivedRequestsDesc') : t('noSentRequestsDesc')}
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
            <RequestCard
              request={item} direction={sub}
              onOpen={() => router.push(`/requests/${item.id}` as any)}
              onAccept={async () => { try { await acceptQ.mutateAsync(item.id); toast.toast({ title: 'Request accepted', variant: 'success' }); } catch (e: any) { toast.toast({ title: 'Could not accept', description: e?.message ?? 'Try again', variant: 'error' }); } }}
              onReject={async () => { try { await rejectQ.mutateAsync(item.id); toast.toast({ title: 'Request rejected', variant: 'info' }); } catch (e: any) { toast.toast({ title: 'Could not reject', variant: 'error' }); } }}
              onCancel={async () => { try { await cancelQ.mutateAsync(item.id); toast.toast({ title: 'Request cancelled', variant: 'info' }); } catch (e: any) { toast.toast({ title: 'Could not cancel', variant: 'error' }); } }}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

export function RequestCard({ request, direction, onOpen, onAccept, onReject, onCancel }: {
  request: any; direction: 'incoming' | 'outgoing'; onOpen: () => void;
  onAccept?: () => Promise<void>; onReject?: () => Promise<void>; onCancel?: () => Promise<void>;
}) {
  const theme = useTheme();
  const t = useT('matches');
  const statusColor = getRequestStatusColor(request.status);
  const otherUser = direction === 'incoming' ? request.sender : request.receiver;
  const [confirmReject, setConfirmReject] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  return (
    <PressableCard onPress={onOpen} style={{ padding: SPACING[4], gap: SPACING[3] }}>
      <View style={{ flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' }}>
        <Avatar uri={otherUser?.image} fallback={otherUser?.name} size={42} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[1.5] }}>
            <ThemedText type="label" style={{ fontSize: FONT_SIZE.md }}>
              {direction === 'incoming' ? `From ${otherUser?.name ?? 'User'}` : `To ${otherUser?.name ?? 'User'}`}
            </ThemedText>
            <Badge variant="accent" accent={statusColor}>{request.status.replace('_', ' ')}</Badge>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <Badge variant="accent" accent="emerald">
              {request.offeredSkill?.name ?? request.offeredSkillName ?? 'Skill'}
            </Badge>
            <ArrowRightLeft size={10} color={theme.mutedForeground} />
            <Badge variant="accent" accent="indigo">
              {request.requestedSkill?.name ?? request.requestedSkillName ?? 'Skill'}
            </Badge>
          </View>
        </View>
      </View>

      {request.message && (
        <ThemedText type="bodySmall" muted style={{
          padding: SPACING[3], backgroundColor: theme.secondary, borderRadius: RADIUS.lg,
        }}>
          "{request.message}"
        </ThemedText>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1] }}>
          <Clock size={12} color={theme.mutedForeground} />
          <ThemedText type="caption" muted>{formatDateShort(request.createdAt)}</ThemedText>
        </View>
        <ChevronRight size={14} color={theme.mutedForeground} />
      </View>

      {direction === 'incoming' && request.status === 'PENDING' ? (
        <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
          <Button style={{ flex: 1 }} size="sm" variant="default" onPress={() => onAccept?.()} leftIcon={<CheckCircle2 size={14} color={theme.primaryForeground} />}>Accept</Button>
          <Button size="sm" variant="destructive" onPress={() => setConfirmReject(true)} leftIcon={<XCircle size={14} color="#fff" />}>Reject</Button>
        </View>
      ) : direction === 'outgoing' && request.status === 'PENDING' ? (
        <Button size="sm" variant="outline" onPress={() => setConfirmCancel(true)} leftIcon={<Ban size={14} color={theme.foreground} />}>{t('decline')}</Button>
      ) : null}

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject} title={t('decline')} description={t('decline')} confirmLabel={t('decline')} destructive onConfirm={() => onReject?.()} />
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel} title={t('decline')} confirmLabel={t('decline')} destructive onConfirm={() => onCancel?.()} />
    </PressableCard>
  );
}
