import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PressableCard,
  Separator,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from '@/components/ui';
import { CustomHeader } from '@/components/ui/custom-header';
import { Progress } from '@/components/ui/form';
import {
  FONT_SIZE,
  getAccent,
  ICON_SIZE,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useCurrentUser,
  useExchanges,
  useMyReviews,
  useNotifications,
  useReferralCode,
  useReferralStats,
} from '@/lib/api-hooks';
import {
  calculateAverageRating,
  calculateExchangeProgress,
  getExchangeStatusColor,
  isOnboardingComplete,
  OnboardingFlags,
  onboardingProgress,
} from '@skil-ex2/shared';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Coins,
  Gift,
  Handshake,
  Plus,
  Repeat2,
  Search,
  Star,
  Target,
  User,
  Users,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from 'lib/i18n';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT('dashboard');
  const navT = useT('nav')

  const userQ = useCurrentUser();
  const exchangesQ = useExchanges();
  const reviewsQ = useMyReviews();
  const notifQ = useNotifications({});
  const referralCodeQ = useReferralCode();
  const referralStatsQ = useReferralStats();

  const referralLoading = referralCodeQ.isLoading || referralStatsQ.isLoading;

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      userQ.refetch(),
      exchangesQ.refetch(),
      reviewsQ.refetch(),
      notifQ.refetch(),
      referralStatsQ.refetch(),
    ]);
    setRefreshing(false);
  }, [userQ, exchangesQ, reviewsQ, notifQ, referralCodeQ, referralStatsQ]);

  const user = userQ.data;
  const exchanges = exchangesQ.data ?? [];
  const activeExchanges = exchanges.filter((e: any) =>
    ['ACCEPTED', 'IN_PROGRESS', 'SCHEDULED'].includes(e.status),
  );
  const completedCount = exchanges.filter((e: any) => e.status === 'COMPLETED').length;
  const averageRating = reviewsQ.data ? calculateAverageRating(reviewsQ.data as any[]) : 0;
  const reviewCount = reviewsQ.data?.length ?? 0;

  const onboardingFlags: OnboardingFlags = React.useMemo(
    () => ({
      hasName: !!user?.name,
      hasBio: !!(user as any)?.bio,
      hasImage: !!(user as any)?.image,
      hasOfferingSkills: !!((user as any)?.userSkills ?? []).some((s: any) => s.type === 'OFFERING'),
      hasSeekingSkills: !!((user as any)?.userSkills ?? []).some((s: any) => s.type === 'SEEKING'),
    }),
    [user],
  );
  const complete = isOnboardingComplete(onboardingFlags);
  const progress = onboardingProgress(onboardingFlags);

  const offeringSkills = ((user as any)?.userSkills ?? []).filter((s: any) => s.type === 'OFFERING');
  const seekingSkills = ((user as any)?.userSkills ?? []).filter((s: any) => s.type === 'SEEKING');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader showUser={true} showSearch={true} showNotifications={true} />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: SPACING[4],
          paddingTop: SPACING[4],
          gap: SPACING[4],
          width: '100%',
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.mutedForeground}
            colors={[theme.mutedForeground]}
          />
        }
        style={{ width: '100%' }}
      >
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: SPACING[4] }}>
          {/* Hero Banner */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <PressableCard
              onPress={() => router.push('/(tabs)/matches' as any)}
              style={{ padding: SPACING[4] }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: RADIUS.lg,
                    backgroundColor: theme.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Search size={ICON_SIZE.md} color={theme.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="cardTitle">{t('findSkillMatch')}</ThemedText>
                  <ThemedText type="caption" muted style={{ marginTop: 2 }}>
                    {t('findSkillMatchDesc')}
                  </ThemedText>
                </View>
                <ArrowUpRight size={ICON_SIZE.md} color={theme.mutedForeground} />
              </View>
            </PressableCard>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
              <QuickAction
                icon={<Users size={ICON_SIZE.md} color={theme.foreground} />}
                label={navT('matches')}
                onPress={() => router.push('/(tabs)/matches' as any)}
              />
              <QuickAction
                icon={<Repeat2 size={ICON_SIZE.md} color={theme.foreground} />}
                label={navT('exchanges')}
                onPress={() => router.push('/(tabs)/exchanges' as any)}
              />
              <QuickAction
                icon={<Coins size={ICON_SIZE.md} color={theme.foreground} />}
                label={navT('points')}
                onPress={() => router.push('/(tabs)/points' as any)}
              />
              <QuickAction
                icon={<User size={ICON_SIZE.md} color={theme.foreground} />}
                label={navT('profile')}
                onPress={() => router.push('/(tabs)/profile' as any)}
              />
            </View>
          </Animated.View>

          {/* Onboarding Card */}
          {user && !complete ? (
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <Card>
                <CardHeader>
                  <CardTitle>{t('onboardingTitle')}</CardTitle>
                  <CardDescription>{t('onboardingDesc')}</CardDescription>
                </CardHeader>
                <CardContent style={{ gap: SPACING[3] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
                    <View style={{ flex: 1 }}>
                      <Progress value={progress} />
                    </View>
                    <ThemedText type="label" style={{ color: theme.foreground }}>
                      {progress}%
                    </ThemedText>
                  </View>
                  <View style={{ gap: SPACING[2] }}>
                    <OnboardingRow
                      done={onboardingFlags.hasName && onboardingFlags.hasBio && onboardingFlags.hasImage}
                      title={t('completeProfile')}
                      subtitle={t('completeProfileDesc')}
                      onPress={() => router.push('/(tabs)/profile' as any)}
                    />
                    <OnboardingRow
                      done={onboardingFlags.hasOfferingSkills}
                      title={t('addTeachingSkill')}
                      subtitle={t('addTeachingSkillDesc')}
                      onPress={() => router.push('/(tabs)/profile' as any)}
                    />
                    <OnboardingRow
                      done={onboardingFlags.hasSeekingSkills}
                      title={t('addLearningSkill')}
                      subtitle={t('addLearningSkillDesc')}
                      onPress={() => router.push('/(tabs)/profile' as any)}
                    />
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          ) : null}

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3] }}>
              <StatCard
                label={t('activeExchanges')}
                loading={exchangesQ.isLoading}
                value={exchangesQ.isLoading ? undefined : activeExchanges.length.toString()}
              />
              <StatCard
                label={t('skillsShared')}
                loading={userQ.isLoading}
                value={userQ.isLoading ? undefined : offeringSkills.length.toString()}
              />
              <StatCard
                label={t('averageRating')}
                loading={reviewsQ.isLoading}
                value={reviewsQ.isLoading ? undefined : averageRating > 0 ? averageRating.toFixed(1) : '—'}
                subtitle={
                  reviewsQ.isLoading
                    ? undefined
                    : `${reviewCount} ${reviewCount === 1 ? t('review') : t('reviews')}`
                }
              />
              <StatCard
                label={t('totalImpact')}
                loading={exchangesQ.isLoading}
                value={exchangesQ.isLoading ? undefined : completedCount.toString()}
                subtitle={exchangesQ.isLoading ? undefined : t('completedExchanges')}
              />
            </View>
          </Animated.View>

          {/* Skills Overview */}
          {user ? (
            <Animated.View entering={FadeInDown.duration(400).delay(250)}>
              <Card>
                <CardHeader>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <CardTitle>{t('yourSkills')}</CardTitle>
                      <CardDescription>{t('tapToManage')}</CardDescription>
                    </View>
                    <Button size="sm" variant="outline" onPress={() => router.push('/(tabs)/profile' as any)}>
                      {t('manage')}
                    </Button>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: SPACING[4] }}>
                  <View style={{ gap: SPACING[2] }}>
                    <ThemedText type="overline" muted>{t('youTeach')}</ThemedText>
                    {offeringSkills.length === 0 ? (
                      <EmptySkillsRow variant="offering" onAdd={() => router.push('/(tabs)/profile' as any)} />
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[1.5] }}>
                        {offeringSkills.map((s: any) => (
                          <Badge key={s.id} variant="accent" accent="emerald">
                            {s.skill?.name ?? s.skillName}
                            {s.level ? ` · ${s.level}` : ''}
                          </Badge>
                        ))}
                      </View>
                    )}
                  </View>
                  <Separator />
                  <View style={{ gap: SPACING[2] }}>
                    <ThemedText type="overline" muted>{t('youWantToLearn')}</ThemedText>
                    {seekingSkills.length === 0 ? (
                      <EmptySkillsRow variant="seeking" onAdd={() => router.push('/(tabs)/profile' as any)} />
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[1.5] }}>
                        {seekingSkills.map((s: any) => (
                          <Badge key={s.id} variant="accent" accent="indigo">
                            {s.skill?.name ?? s.skillName}
                          </Badge>
                        ))}
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          ) : (
            <Card>
              <SkeletonCard />
            </Card>
          )}

          {/* Active Exchanges */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <CardTitle>{t('activeExchanges')}</CardTitle>
                    <CardDescription>{t('keepMomentum')}</CardDescription>
                  </View>
                  <Button size="sm" variant="ghost" onPress={() => router.push('/(tabs)/exchanges' as any)}>
                    {t('viewAll')}
                  </Button>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {exchangesQ.isLoading ? (
                  <View style={{ gap: SPACING[3] }}>
                    <SkeletonText lines={3} />
                    <SkeletonText lines={3} />
                  </View>
                ) : activeExchanges.length === 0 ? (
                  <EmptyExchanges onExplore={() => router.push('/(tabs)/matches' as any)} />
                ) : (
                  activeExchanges.slice(0, 3).map((ex: any) => {
                    const other = (ex as any).otherUser ?? {};
                    const colorName = getExchangeStatusColor(ex.status);
                    const prog = calculateExchangeProgress(ex);
                    return (
                      <PressableCard
                        key={ex.id}
                        onPress={() => router.push(`/exchanges/${ex.id}` as any)}
                        style={{ padding: SPACING[3], gap: SPACING[3] }}
                      >
                        <View style={{ flexDirection: 'row', gap: SPACING[3], alignItems: 'center' }}>
                          <Avatar uri={other.image} fallback={other.name} size={40} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <ThemedText type="label" style={{ fontSize: FONT_SIZE.md }}>
                                {other.name ?? t('peerTrader')}
                              </ThemedText>
                              <Badge variant="accent" accent={colorName}>
                                {ex.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </Badge>
                            </View>
                            <ThemedText type="caption" muted style={{ marginTop: 2 }}>
                              {(ex as any).taughtSkillName} ↔ {(ex as any).receivedSkillName}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={{ gap: SPACING[1] }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <ThemedText type="caption" muted>{t('progress')}</ThemedText>
                            <ThemedText type="caption">{prog}%</ThemedText>
                          </View>
                          <Progress value={prog} />
                        </View>
                      </PressableCard>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </Animated.View>

          {/* Referral Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: RADIUS.lg,
                      backgroundColor: theme.secondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Gift size={ICON_SIZE.md} color={theme.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{t('inviteFriends')}</CardTitle>
                    <CardDescription>{t('inviteDesc')}</CardDescription>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {referralLoading ? (
                  <SkeletonText lines={2} />
                ) : (
                  <>
                    <View
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.lg,
                        backgroundColor: theme.secondary,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText
                        type="sectionTitle"
                        style={{ letterSpacing: 2, textAlign: 'center' }}
                        numberOfLines={1}
                      >
                        {referralCodeQ.data}
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                      <StatChip label={t('referrals')} value={referralStatsQ.data?.totalReferrals ?? 0} />
                      <StatChip label={t('earned')} value={`${referralStatsQ.data?.pointsEarned ?? 0} pts`} />
                    </View>
                    <Button
                      size="md"
                      variant="default"
                      rightIcon={<ChevronRight size={14} color={theme.primaryForeground} />}
                      onPress={() => router.push('/(tabs)/profile' as any)}
                    >
                      {t('trackReferrals')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 12, stiffness: 200 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 150 }); }}
        style={[
          {
            paddingVertical: SPACING[3],
            paddingHorizontal: SPACING[2],
            borderRadius: RADIUS.xl,
            backgroundColor: theme.glassBackground,
            borderWidth: 1,
            borderColor: theme.glassBorder,
            alignItems: 'center',
            gap: 6,
          },
        ]}
      >
        {icon}
        <ThemedText type="badge" style={{ marginTop: 2 }} numberOfLines={1}>
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  loading,
}: {
  label: string;
  value?: string;
  subtitle?: string;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        borderRadius: RADIUS['2xl'],
        borderWidth: 1,
        borderColor: theme.glassBorder,
        backgroundColor: theme.glassBackground,
        padding: SPACING[4],
        gap: SPACING[1.5],
      }}
    >
      {loading ? (
        <View style={{ gap: SPACING[1.5] }}>
          <Skeleton width={50} height={24} rounded />
          <Skeleton width="70%" height={12} rounded />
        </View>
      ) : (
        <>
          <ThemedText type="screenTitle" style={{ fontSize: 22 }} numberOfLines={1}>
            {value ?? '—'}
          </ThemedText>
          <ThemedText type="caption" muted numberOfLines={1}>
            {label}
            {subtitle ? ` · ${subtitle}` : ''}
          </ThemedText>
        </>
      )}
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: SPACING[2.5],
        borderRadius: RADIUS.lg,
        backgroundColor: theme.secondary,
        gap: 2,
      }}
    >
      <ThemedText type="caption" muted>{label}</ThemedText>
      <ThemedText type="label">{value}</ThemedText>
    </View>
  );
}

function OnboardingRow({
  done,
  title,
  subtitle,
  onPress,
}: {
  done: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING[3],
          padding: SPACING[3],
          borderRadius: RADIUS.lg,
          backgroundColor: theme.secondary,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: done ? getAccent('green').bg : theme.background,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: done ? 0 : 1,
          borderColor: theme.border,
        }}
      >
        {done ? (
          <CheckCircle2 size={14} color={getAccent('green').main} />
        ) : (
          <Target size={12} color={theme.mutedForeground} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText
          type="label"
          style={{
            color: done ? theme.mutedForeground : theme.foreground,
            textDecorationLine: done ? 'line-through' : 'none',
          }}
        >
          {title}
        </ThemedText>
        <ThemedText type="caption" muted style={{ marginTop: 1 }}>
          {subtitle}
        </ThemedText>
      </View>
      <ChevronRight size={14} color={theme.mutedForeground} />
    </Pressable>
  );
}

function EmptySkillsRow({ variant, onAdd }: { variant: 'offering' | 'seeking'; onAdd: () => void }) {
  const theme = useTheme();
  const t = useT('home');
  return (
    <Pressable
      onPress={onAdd}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING[3],
          padding: SPACING[3],
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Plus size={14} color={theme.mutedForeground} />
      <ThemedText type="caption" muted style={{ flex: 1 }}>
        {variant === 'offering' ? t('noTeachingSkillsYet') : t('noLearningSkillsYet')}
      </ThemedText>
      <Button size="sm" variant="ghost">{t('add')}</Button>
    </Pressable>
  );
}

function EmptyExchanges({ onExplore }: { onExplore: () => void }) {
  const theme = useTheme();
  const t = useT('home');

  return (
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
        {t('noActiveExchangesYet')}
      </ThemedText>
      <ThemedText type="caption" muted style={{ textAlign: 'center', maxWidth: 240 }}>
        {t('noActiveExchangesDesc')}
      </ThemedText>
      <Button onPress={onExplore} variant="default" leftIcon={<Users size={14} color={theme.primaryForeground} />}>
        {t('browseMatches')}
      </Button>
    </View>
  );
}
