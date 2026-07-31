import React from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
  Separator,
  SkeletonText,
  Tabs,
  Progress,
  useToast,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useCurrentUser,
  useExchanges,
} from '@/lib/api-hooks';
import {
  getExchangeStatusColor,
  calculateExchangeProgress,
  calculatePointsBreakdown,
  formatDateShort,
  formatDateTimeShort,
} from '@skil-ex2/shared';
import {
  ArrowRightLeft,
  Handshake,
  Clock,
  CalendarCheck,
  Video,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  XCircle,
  Coins,
  Zap,
  FileCheck2,
  GraduationCap,
  BookOpen,
} from 'lucide-react-native';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

export default function ExchangesListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const exchangesQ = useExchanges();
  const [filter, setFilter] = React.useState<Filter>('all');
  const [refreshing, setRefreshing] = React.useState(false);

  const all = exchangesQ.data ?? [];

  const filtered = React.useMemo(() => {
    if (filter === 'active')
      return all.filter((e: any) => ['COMMITTED', 'IN_PROGRESS'].includes(e.status));
    if (filter === 'completed') return all.filter((e: any) => e.status === 'COMPLETED');
    if (filter === 'cancelled')
      return all.filter((e: any) => ['CANCELLED'].includes(e.status));
    return all;
  }, [all, filter]);

  const activeCount = all.filter((e: any) =>
    ['COMMITTED', 'IN_PROGRESS'].includes(e.status)
  ).length;
  const completedCount = all.filter((e: any) => e.status === 'COMPLETED').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, flex: 1 }}>
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
                  Exchanges
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                  {activeCount} active · {completedCount} completed
                </ThemedText>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push('/(tabs)/matches' as any)}
                leftIcon={<Handshake size={14} color={theme.foreground} />}
              >
                Matches
              </Button>
            </View>
            <Tabs<Filter>
              variant="pills"
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active', badge: activeCount || undefined },
                { value: 'completed', label: 'Completed', badge: completedCount || undefined },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(e: any) => e.id}
            contentContainerStyle={{
              paddingHorizontal: SPACING[5],
              paddingBottom: insets.bottom + SPACING[10],
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
                tintColor={theme.primary}
                colors={[theme.primary]}
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
                    padding: SPACING[8],
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.backgroundElement,
                    alignItems: 'center',
                    gap: SPACING[3],
                    marginHorizontal: SPACING[1],
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: RADIUS.pill,
                      backgroundColor: getAccent('blue').bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Handshake size={28} color={getAccent('blue').main} />
                  </View>
                  <ThemedText type="default" style={{ fontWeight: '700', textAlign: 'center' }}>
                    No exchanges here yet
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.mutedForeground, textAlign: 'center', fontSize: FONT_SIZE.sm }}
                  >
                    Find a match and send your first exchange request.
                  </ThemedText>
                  <Button
                    size="sm"
                    onPress={() => router.push('/(tabs)/matches' as any)}
                    leftIcon={<Zap size={14} color="#fff" />}
                  >
                    Find matches
                  </Button>
                </View>
              )
            }
            renderItem={({ item }) => (
              <ExchangeRowCard
                exchange={item}
                onPress={() => router.push(`/exchanges/${item.id}` as any)}
              />
            )}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

export function ExchangeRowCard({
  exchange,
  onPress,
}: {
  exchange: any;
  onPress: () => void;
}) {
  const theme = useTheme();
  const statusColor = getExchangeStatusColor(exchange.status);
  const userQ = useCurrentUser();
  const user = userQ.data;
  const isSender = exchange.senderId === user.id;
  
  const otherUser = isSender ? exchange.receiver : exchange.sender;
  
  const progress = calculateExchangeProgress(exchange);
  const isActive = ['ACCEPTED', 'IN_PROGRESS', 'SCHEDULED'].includes(exchange.status);

  const points = exchange.pointsValue ? calculatePointsBreakdown(exchange.pointsValue) : null;
  const nextSession = exchange.sessions?.find((s: any) => s.status === 'SCHEDULED');

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: isActive ? getAccent('indigo').border : theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: SPACING[4], gap: SPACING[3] }}>
        {/* User row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
          <Avatar uri={otherUser.image} fallback={otherUser.name} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText type="default" style={{ fontSize: FONT_SIZE.lg, fontWeight: '700' }}>
                {otherUser.name ?? 'Peer'}
              </ThemedText>
              <Badge variant="accent" accent={statusColor}>
                {labelForStatus(exchange.status)}
              </Badge>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginTop: 2 }}>
              <Badge variant="accent" accent="emerald">
                <GraduationCap size={10} color={getAccent('emerald').main} />
                {' '}
                {exchange.taughtSkillName ?? exchange.taughtSkill?.name ?? '—'}
              </Badge>
              <ArrowRightLeft size={14} color={theme.mutedForeground} />
              <Badge variant="accent" accent="blue">
                <BookOpen size={10} color={getAccent('blue').main} />
                {' '}
                {exchange.receivedSkillName ?? exchange.receivedSkill?.name ?? '—'}
              </Badge>
            </View>
          </View>
        </View>

        {/* Progress */}
        {isActive ? (
          <View style={{ gap: SPACING[1.5] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                Progress
              </ThemedText>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                {progress}%
              </ThemedText>
            </View>
            <Progress value={progress} />
          </View>
        ) : null}

        {/* Meta row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
          <MetaChip
            icon={<Coins size={12} color={theme.mutedForeground} />}
            label={
              points
                ? `${points.gross} pts (net ${points.net})`
                : exchange.pointsAmount
                ? `${exchange.pointsAmount} pts`
                : 'No points'
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

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }} />
          <ChevronRight size={16} color={theme.mutedForeground} />
        </View>
      </View>
    </Pressable>
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

function MetaChip({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  accent?: string;
}) {
  const theme = useTheme();
  const palette = accent ? getAccent(accent) : null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING[1.5],
        paddingHorizontal: SPACING[2.5],
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        backgroundColor: palette ? palette.bg : theme.backgroundElement,
        borderWidth: 1,
        borderColor: palette ? palette.border : 'transparent',
      }}
    >
      {icon}
      <ThemedText
        type="small"
        style={{
          fontSize: 11,
          color: palette ? palette.main : theme.mutedForeground,
        }}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </View>
  );
}
