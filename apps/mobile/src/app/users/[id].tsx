import React from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
  Skeleton,
  SkeletonText,
  Separator,
  Textarea,
  useToast,
  ActionSheet,
  Alert as UIAlert,
} from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useCurrentUser,
  useUserById,
  useReviewsByUserId,
  useCreateRequest,
} from '@/lib/api-hooks';
import {
  calculateAverageRating,
  REVIEW_TAG_LABELS,
  getExchangeStatusColor,
} from '@skil-ex2/shared';
import * as v from 'valibot';
import { CreateExchangeRequestSchema } from '@skil-ex2/shared';
import {
  GraduationCap,
  BookOpen,
  Star,
  MapPin,
  Share2,
  ArrowLeft,
  Handshake,
  ChevronRight,
  MessageCircle,
  Shield,
  BadgeCheck,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react-native';

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meQ = useCurrentUser();
  const userQ = useUserById(id!);
  const reviewsQ = useReviewsByUserId(id!);
  const createReqQ = useCreateRequest();
  const theme = useTheme();
  const router = useRouter();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const [skillTeachId, setSkillTeachId] = React.useState<string | undefined>();
  const [skillLearnId, setSkillLearnId] = React.useState<string | undefined>();
  const [message, setMessage] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([userQ.refetch(), reviewsQ.refetch()]);
    setRefreshing(false);
  };

  const user = userQ.data as any;
  const me = meQ.data as any;
  const myOffering = (me?.userSkills ?? []).filter((s: any) => s.type === 'OFFERING');
  const theirOffering = (user?.userSkills ?? []).filter((s: any) => s.type === 'OFFERING');
  const theirSeeking = (user?.userSkills ?? []).filter((s: any) => s.type === 'SEEKING');
  const reviews = reviewsQ.data ?? [];
  const avg = reviews.length ? calculateAverageRating(reviews as any[]) : 0;

  const isSelf = me?.id === user?.id;

  React.useEffect(() => {
    nav.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: SPACING[2], paddingVertical: SPACING[1] }}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={theme.foreground} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={{ paddingHorizontal: SPACING[2], paddingVertical: SPACING[1] }}
          hitSlop={10}
        >
          <MoreHorizontal size={20} color={theme.foreground} />
        </Pressable>
      ),
      headerTitle: user?.name ?? 'Profile',
      headerTransparent: false,
    });
  }, [nav, user, theme, router]);

  const submit = async () => {
    try {
      const payload: any = {
        toUserId: user?.id,
        offeredSkillId: skillTeachId,
        requestedSkillId: skillLearnId,
        message: message || undefined,
      };
      const parsed = v.parse(CreateExchangeRequestSchema, payload);
      await createReqQ.mutateAsync(parsed);
      toast.toast({ title: 'Request sent!', variant: 'success' });
      setRequestOpen(false);
      setMessage('');
      setSkillTeachId(undefined);
      setSkillLearnId(undefined);
    } catch (e: any) {
      if (e instanceof v.ValiError) {
        const map: Record<string, string> = {};
        const issues = v.flatten(e.issues);
        Object.entries(issues.nested ?? {}).forEach(([k, v]) => {
          map[k] = (v as any)[0] ?? 'Invalid';
        });
        setErrors(map);
        return;
      }
      toast.toast({ title: 'Could not send request', description: e?.message ?? 'Try again', variant: 'error' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <ThemedView type="background" style={{ flex: 1, alignItems: 'center' }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING[5],
            paddingTop: SPACING[3],
            paddingBottom: insets.bottom + SPACING[10],
            width: '100%',
            alignItems: 'center',
            gap: SPACING[4],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} colors={[theme.primary]} />
          }
          style={{ width: '100%' }}
        >
          <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: SPACING[4] }}>
            {/* Header */}
            <Card>
              <CardContent style={{ paddingTop: SPACING[5], gap: SPACING[4] }}>
                <View style={{ flexDirection: 'row', gap: SPACING[4], alignItems: 'center' }}>
                  <Avatar uri={user?.image} fallback={user?.name} size={88} />
                  <View style={{ flex: 1, gap: SPACING[1] }}>
                    {userQ.isLoading ? (
                      <View style={{ gap: SPACING[1.5] }}>
                        <Skeleton width="70%" height={24} rounded />
                        <Skeleton width="40%" height={14} rounded />
                        <Skeleton width="55%" height={12} rounded />
                      </View>
                    ) : (
                      <>
                        <ThemedText type="title" style={{ fontSize: FONT_SIZE['2xl'], fontWeight: '800' }}>
                          {user?.name ?? 'User'}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Star size={14} color={getAccent('amber').main} fill={getAccent('amber').main} />
                            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                              {avg.toFixed(1)}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 11 }}>
                              ({reviews.length})
                            </ThemedText>
                          </View>
                          {(user?.reviewsCompleted ?? 0) > 0 ? (
                            <Badge variant="accent" accent="emerald">
                              <BadgeCheck size={12} color={getAccent('emerald').main} /> Verified
                            </Badge>
                          ) : null}
                        </View>
                        {user?.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5], marginTop: 2 }}>
                            <MapPin size={12} color={theme.mutedForeground} />
                            <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                              {user.location}
                            </ThemedText>
                          </View>
                        ) : null}
                        {user?.createdAt ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[1.5], marginTop: 2 }}>
                            <CalendarDays size={12} color={theme.mutedForeground} />
                            <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 11 }}>
                              Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </ThemedText>
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                </View>

                {user?.bio ? (
                  <ThemedText
                    type="small"
                    style={{ color: theme.foreground, fontSize: FONT_SIZE.md, lineHeight: 22 }}
                  >
                    {user.bio}
                  </ThemedText>
                ) : null}

                {!isSelf ? (
                  <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
                    <Button
                      style={{ flex: 1 }}
                      onPress={() => setRequestOpen(true)}
                      loading={createReqQ.isPending}
                      leftIcon={<Handshake size={16} color="#fff" />}
                    >
                      Request exchange
                    </Button>
                    <Button
                      variant="outline"
                      leftIcon={<MessageCircle size={16} color={theme.foreground} />}
                    >
                      Message
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() =>
                        Share.share({
                          message: `Check out ${user?.name ?? 'this user'} on Skil-Ex`,
                        }).catch(() => {})
                      }
                    >
                      <Share2 size={18} color={theme.foreground} />
                    </Button>
                  </View>
                ) : (
                  <Button variant="outline" onPress={() => router.push('/(tabs)/profile' as any)}>
                    Edit your profile
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Skill groups */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>What they teach and want to learn.</CardDescription>
              </CardHeader>
              <CardContent style={{ gap: SPACING[4] }}>
                <SkillList
                  title="They teach"
                  accent="emerald"
                  icon={<GraduationCap size={16} color={getAccent('emerald').main} />}
                  list={theirOffering}
                  empty="No teaching skills listed yet."
                />
                <Separator />
                <SkillList
                  title="They want to learn"
                  accent="blue"
                  icon={<BookOpen size={16} color={getAccent('blue').main} />}
                  list={theirSeeking}
                  empty="No learning goals listed yet."
                />
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <CardTitle>Reviews</CardTitle>
                    <CardDescription>What their partners say.</CardDescription>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <ThemedText type="title" style={{ fontSize: FONT_SIZE.xl, fontWeight: '900' }}>
                      {avg.toFixed(1)}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={11}
                          color={i <= Math.round(avg) ? getAccent('amber').main : theme.mutedForeground}
                          fill={i <= Math.round(avg) ? getAccent('amber').main : 'transparent'}
                        />
                      ))}
                    </View>
                    <ThemedText type="small" style={{ fontSize: 11, color: theme.mutedForeground }}>
                      {reviews.length}
                    </ThemedText>
                  </View>
                </View>
              </CardHeader>
              <CardContent style={{ gap: SPACING[3] }}>
                {reviewsQ.isLoading ? (
                  <SkeletonText lines={5} />
                ) : reviews.length === 0 ? (
                  <View style={{ padding: SPACING[5], alignItems: 'center', gap: SPACING[2] }}>
                    <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
                      No reviews yet — be the first after an exchange!
                    </ThemedText>
                  </View>
                ) : (
                  reviews.slice(0, 5).map((r: any) => <MiniReview key={r.id} review={r} onOpen={() => router.push(`/users/${r.reviewerId}` as any)} />)
                )}
                {reviews.length > 5 ? (
                  <Button variant="ghost">
                    View all {reviews.length} reviews
                    <ChevronRight size={14} color={theme.primary} />
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card style={{ borderColor: getAccent('blue').border }}>
              <CardContent>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING[3],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: RADIUS.md,
                      backgroundColor: getAccent('blue').bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Shield size={20} color={getAccent('blue').main} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                      Safe & verified
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                      Every exchange is protected by points escrow and session recordings with consent.
                    </ThemedText>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ThemedView>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={(o) => !createReqQ.isPending && setRequestOpen(o)}>
        <DialogHeader onClose={() => setRequestOpen(false)}>
          <DialogTitle>Request skill exchange</DialogTitle>
          <DialogDescription>
            Propose teaching one of your skills in exchange for one of theirs.
          </DialogDescription>
        </DialogHeader>
        <DialogContent style={{ gap: SPACING[4] }}>
          <View style={{ gap: SPACING[2] }}>
            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm, marginLeft: SPACING[0.5] }}>
              You will teach them
            </ThemedText>
            <View style={{ gap: SPACING[2] }}>
              {myOffering.length === 0 ? (
                <View
                  style={{
                    padding: SPACING[4],
                    borderRadius: RADIUS.md,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.border,
                  }}
                >
                  <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                    Add a teaching skill to your profile first.
                  </ThemedText>
                  <Button
                    size="sm"
                    style={{ marginTop: SPACING[3] }}
                    onPress={() => {
                      setRequestOpen(false);
                      router.push('/(tabs)/profile' as any);
                    }}
                  >
                    Add teaching skill
                  </Button>
                </View>
              ) : (
                myOffering.map((s: any) => {
                  const selected = skillTeachId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSkillTeachId(s.id)}
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.md,
                        borderWidth: 1,
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? `${theme.primary}1A` : theme.backgroundElement,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: SPACING[3],
                      }}
                    >
                      <GraduationCap
                        size={16}
                        color={selected ? theme.primary : theme.mutedForeground}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                          {s.skill?.name ?? s.skillName ?? 'Skill'}
                        </ThemedText>
                        {s.level ? (
                          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                            {s.level.toLowerCase()}
                          </ThemedText>
                        ) : null}
                      </View>
                      {selected ? <Badge variant="default">Selected</Badge> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
            {errors.offeredSkillId ? (
              <ThemedText type="small" style={{ color: '#f87171', fontSize: FONT_SIZE.sm, marginLeft: SPACING[0.5] }}>
                {errors.offeredSkillId}
              </ThemedText>
            ) : null}
          </View>

          <Separator />

          <View style={{ gap: SPACING[2] }}>
            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm, marginLeft: SPACING[0.5] }}>
              You want to learn from them
            </ThemedText>
            <View style={{ gap: SPACING[2] }}>
              {theirOffering.length === 0 ? (
                <View
                  style={{
                    padding: SPACING[4],
                    borderRadius: RADIUS.md,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.border,
                  }}
                >
                  <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                    This user isn't offering skills to teach yet.
                  </ThemedText>
                </View>
              ) : (
                theirOffering.map((s: any) => {
                  const selected = skillLearnId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSkillLearnId(s.id)}
                      style={{
                        padding: SPACING[3],
                        borderRadius: RADIUS.md,
                        borderWidth: 1,
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected ? `${theme.primary}1A` : theme.backgroundElement,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: SPACING[3],
                      }}
                    >
                      <BookOpen size={16} color={selected ? theme.primary : theme.mutedForeground} />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                          {s.skill?.name ?? s.skillName ?? 'Skill'}
                        </ThemedText>
                        {s.level ? (
                          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
                            {s.level.toLowerCase()}
                          </ThemedText>
                        ) : null}
                      </View>
                      {selected ? <Badge variant="default">Selected</Badge> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
            {errors.requestedSkillId ? (
              <ThemedText type="small" style={{ color: '#f87171', fontSize: FONT_SIZE.sm, marginLeft: SPACING[0.5] }}>
                {errors.requestedSkillId}
              </ThemedText>
            ) : null}
          </View>

          <Textarea
            label="Message (optional)"
            value={message}
            onChangeText={setMessage}
            placeholder="Introduce yourself, mention availability, or a short-term goal."
            numberOfLines={4}
            error={errors.message}
            description={`${message.length}/500`}
          />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onPress={() => setRequestOpen(false)} disabled={createReqQ.isPending}>
            Cancel
          </Button>
          <Button
            onPress={submit}
            loading={createReqQ.isPending}
            disabled={!skillTeachId || !skillLearnId}
          >
            Send request
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Action sheet */}
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="More actions"
        options={[
          {
            label: 'Share profile',
            icon: <Share2 size={18} color={theme.foreground} />,
            onPress: () =>
              Share.share({
                message: `Check out ${user?.name ?? 'this user'} on Skil-Ex`,
              }).catch(() => {}),
          },
          {
            label: 'Report user',
            icon: <Shield size={18} color={theme.destructive as any} />,
            destructive: false,
            onPress: () =>
              toast.toast({
                title: 'Report submitted',
                description: 'Our team will review shortly.',
                variant: 'info',
              }),
          },
        ]}
      />
    </SafeAreaView>
  );
}

function SkillList({
  title,
  accent,
  icon,
  list,
  empty,
}: {
  title: string;
  accent: string;
  icon: React.ReactNode;
  list: any[];
  empty: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: SPACING[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[2] }}>
        {icon}
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {title}
        </ThemedText>
      </View>
      {list.length === 0 ? (
        <View
          style={{
            padding: SPACING[3],
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border,
          }}
        >
          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}>
            {empty}
          </ThemedText>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
          {list.map((s: any) => (
            <Badge key={s.id} variant="accent" accent={accent}>
              {s.skill?.name ?? s.skillName}
              {s.level ? ` · ${s.level.toLowerCase()}` : ''}
            </Badge>
          ))}
        </View>
      )}
    </View>
  );
}

function MiniReview({ review, onOpen }: { review: any; onOpen: () => void }) {
  const theme = useTheme();
  const rating = Math.round(review.rating ?? 0);
  return (
    <Pressable
      onPress={onOpen}
      style={{
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        backgroundColor: theme.backgroundElement,
        gap: SPACING[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING[3] }}>
        <Avatar uri={review.reviewer?.image} fallback={review.reviewer?.name} size={32} />
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
            {review.reviewer?.name ?? 'User'}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 1, marginTop: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={11}
                color={i <= rating ? getAccent('amber').main : theme.mutedForeground}
                fill={i <= rating ? getAccent('amber').main : 'transparent'}
              />
            ))}
          </View>
        </View>
        <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 11 }}>
          {review.createdAt
            ? new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : ''}
        </ThemedText>
      </View>
      {review.comment ? (
        <ThemedText type="small" style={{ color: theme.foreground, fontSize: FONT_SIZE.sm, lineHeight: 19 }} numberOfLines={3}>
          {review.comment}
        </ThemedText>
      ) : null}
      {(review.tags ?? []).length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] }}>
          {(review.tags as string[]).slice(0, 3).map((t) => (
            <Badge key={t} variant="outline">
              {REVIEW_TAG_LABELS[t as keyof typeof REVIEW_TAG_LABELS] ?? t}
            </Badge>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
