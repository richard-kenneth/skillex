import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH, ICON_SIZE } from '@/constants/theme';
import { useT } from 'lib/i18n';
import {
  Avatar, Badge, Button, PressableCard, SkeletonText, Tabs,
} from '@/components/ui';
import { Progress } from '@/components/ui/form';
import { CustomHeader } from '@/components/ui/custom-header';
import { ThemedText } from '@/components/themed-text';
import { useCurrentUser, useExchanges } from '@/lib/api-hooks';
import {
  getExchangeStatusColor, calculateExchangeProgress,
  calculatePointsBreakdown, formatDateShort, formatDateTimeShort,
} from '@skil-ex2/shared';
import {
  ArrowRightLeft, Handshake, CalendarCheck, Video, ChevronRight, Coins, Users,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

export default function ExchangesListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT('exchanges');

  const exchangesQ = useExchanges();
  const [filter, setFilter] = React.useState<Filter>('all');
  const [refreshing, setRefreshing] = React.useState(false);

  const all = exchangesQ.data ?? [];

  const filtered = React.useMemo(() => {
    if (filter === 'active')
      return all.filter((e: any) => ['COMMITTED', 'IN_PROGRESS', 'ACCEPTED', 'SCHEDULED'].includes(e.status));
    if (filter === 'completed') return all.filter((e: any) => e.status === 'COMPLETED');
    if (filter === 'cancelled')
      return all.filter((e: any) => ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(e.status));
    return all;
  }, [all, filter]);

  const activeCount = all.filter((e: any) =>
    ['COMMITTED', 'IN_PROGRESS', 'ACCEPTED', 'SCHEDULED'].includes(e.status),
  ).length;
  const completedCount = all.filter((e: any) => e.status === 'COMPLETED').length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader
        title="Exchanges"
        subtitle={`${activeCount} Active · ${completedCount} Completed`}
        showNotifications
        showSearch
      />

      <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] }}>
          <Tabs<Filter>
            variant="pills"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: t('statusAll') },
              { value: 'active', label: t('statusActive'), badge: activeCount || undefined },
              { value: 'completed', label: t('statusCompleted'), badge: completedCount || undefined },
              { value: 'cancelled', label: t('statusCancelled') },
            ]}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING[4],
            paddingBottom: insets.bottom + 90,
            gap: SPACING[3],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await exchangesQ.refetch();
                setRefreshing(false);
              }}
              tintColor={theme.mutedForeground}
              colors={[theme.mutedForeground]}
            />
          }
          ListEmptyComponent={
            exchangesQ.isLoading ? (
              <View style={{ gap: SPACING[3] }}>
                <SkeletonText lines={4} />
                <SkeletonText lines={4} />
              </View>
            ) : (
              <View
                style={{
                  padding: SPACING[6],
                  borderRadius: RADIUS.xl,
                  backgroundColor: theme.secondary,
                  alignItems: 'center',
                  gap: SPACING[3],
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Handshake size={ICON_SIZE.xl} color={theme.mutedForeground} />
                </View>
                <ThemedText type="cardTitle" style={{ textAlign: 'center' }}>
                  {t('noExchangesTitle')}
                </ThemedText>
                <ThemedText type="caption" muted style={{ textAlign: 'center' }}>
                  {t('noExchangesDesc')}
                </ThemedText>
                <Button
                  size="sm"
                  variant="default"
                  onPress={() => router.push('/(tabs)/matches' as any)}
                  leftIcon={<Users size={14} color={theme.primaryForeground} />}
                >
                  {t('findMatches')}
                </Button>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
              <ExchangeRowCard
                exchange={item}
                onPress={() => router.push(`/exchanges/${item.id}` as any)}
              />
            </Animated.View>
          )}
        />
      </View>
    </View>
  );
}

export function ExchangeRowCard({ exchange, onPress }: { exchange: any; onPress: () => void }) {
  const theme = useTheme();
  const t = useT('exchanges');
  const statusColor = getExchangeStatusColor(exchange.status);
  const userQ = useCurrentUser();
  const user = userQ.data;
  const isSender = exchange.senderId === user?.id;
  const otherUser = isSender ? exchange.receiver : exchange.sender;
  const progress = calculateExchangeProgress(exchange);
  const isActive = ['ACCEPTED', 'IN_PROGRESS', 'SCHEDULED', 'COMMITTED'].includes(exchange.status);
  const points = exchange.pointsValue ? calculatePointsBreakdown(exchange.pointsValue) : null;
  const nextSession = exchange.sessions?.find((s: any) => s.status === 'SCHEDULED');

  return (
    <PressableCard onPress={onPress} style={{ padding: SPACING[4], gap: SPACING[3] }}>
      {/* User row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
        <Avatar uri={otherUser?.image} fallback={otherUser?.name} size={42} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="cardTitle">
              {otherUser?.name ?? 'Peer Trader'}
            </ThemedText>
            <Badge variant="accent" accent={statusColor}>
              {labelForStatus(exchange.status, t)}
            </Badge>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5], marginTop: 2 }}>
            <Badge variant="accent" accent="emerald">
              {exchange.taughtSkillName ?? exchange.taughtSkill?.name ?? 'Skill'}
            </Badge>
            <ArrowRightLeft size={10} color={theme.mutedForeground} />
            <Badge variant="accent" accent="indigo">
              {exchange.receivedSkillName ?? exchange.receivedSkill?.name ?? 'Skill'}
            </Badge>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      {isActive ? (
        <View style={{ gap: SPACING[1.5] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="caption" muted>Progress</ThemedText>
            <ThemedText type="caption">{progress}%</ThemedText>
          </View>
          <Progress value={progress} />
        </View>
      ) : null}

      {/* Meta row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
        <MetaChip
          icon={<Coins size={12} color={theme.mutedForeground} />}
          label={
            points ? `${points.gross} pts` : exchange.pointsAmount ? `${exchange.pointsAmount} pts` : 'No points'
          }
        />
        {exchange.createdAt ? (
          <MetaChip
            icon={<CalendarCheck size={12} color={theme.mutedForeground} />}
            label={`Started ${formatDateShort(exchange.createdAt)}`}
          />
        ) : null}
        {nextSession?.startTime ? (
          <MetaChip
            accent="indigo"
            icon={<Video size={12} color={getAccent('indigo').main} />}
            label={`Session ${formatDateTimeShort(nextSession.startTime)}`}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
        <ThemedText type="caption" muted>
          View Details
        </ThemedText>
        <ChevronRight size={14} color={theme.mutedForeground} />
      </View>
    </PressableCard>
  );
}

function labelForStatus(s: string, t: (k: string) => string) {
  switch (s) {
    case 'IN_PROGRESS': return t('in_progress');
    case 'COMPLETED': return t('completed');
    case 'CANCELLED': return t('cancelled');
    case 'ACCEPTED': return t('accepted');
    case 'SCHEDULED': return t('scheduled');
    case 'PENDING': return t('pending');
    case 'REJECTED': return t('rejected');
    case 'EXPIRED': return t('expired');
    default: return s.replace(/_/g, ' ');
  }
}

function MetaChip({ icon, label, accent }: { icon: React.ReactNode; label: React.ReactNode; accent?: string }) {
  const theme = useTheme();
  const palette = accent ? getAccent(accent) : null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING[1.5],
        paddingHorizontal: SPACING[2],
        paddingVertical: 3,
        borderRadius: RADIUS.md,
        backgroundColor: palette ? palette.bg : theme.secondary,
        borderWidth: 1,
        borderColor: palette ? palette.border : theme.border,
      }}
    >
      {icon}
      <ThemedText
        type="badge"
        style={{ color: palette ? palette.main : theme.mutedForeground }}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </View>
  );
}
