import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useT } from "lib/i18n";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  SelectField,
  Separator,
  Skeleton,
  SkeletonText,
  Switch,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { CustomHeader } from "@/components/ui/custom-header";
import {
  FONT_SIZE,
  getAccent,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useThemeContext } from "@/hooks/theme-context";
import { useTheme } from "@/hooks/use-theme";
import {
  useAddUserSkill,
  useConfirmAvatar,
  useCurrentUser,
  useGetUploadPresignedUrl,
  useMyReviews,
  useReferralCode,
  useReferralStats,
  useRemoveUserSkill,
  useSkillCategories,
  useSkills,
  useUpdateNotificationPreferences,
  useUpdateProfile,
} from "@/lib/api-hooks";
import {
  calculateAverageRating,
  EXCHANGE_NOTIFICATION_TYPES,
  POINTS_NOTIFICATION_TYPES,
  ProfileFormSchema,
  QUERY_KEYS,
  REVIEW_TAG_LABELS,
  SkillType,
} from "@skil-ex2/shared";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useRouter } from "expo-router";
import { LOCALE_LABELS, SUPPORTED_LOCALES, useI18n } from "lib/i18n";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Camera,
  Copy,
  Gift,
  Globe2,
  GraduationCap,
  HandCoins,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Plus,
  Share2,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as v from "valibot";
import { authClient } from "../../../lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";

type ProfileTab = "edit" | "skills" | "reviews" | "referrals" | "notifications";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const t = useT('profile');

  const userQ = useCurrentUser();
  const user = userQ.data as any;

  const [tab, setTab] = React.useState<ProfileTab>("edit");
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([userQ.refetch()]);
    setRefreshing(false);
  }, [userQ]);

  const handleSignOut = async () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: "cancel" },
      {
        text: t('signOut'),
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Custom Header */}
      <CustomHeader
        title={t('title')}
        subtitle={t('manageAccountDesc')}
        showNotifications={true}
        showSearch={true}
        rightAction={
          <Pressable
            onPress={handleSignOut}
            hitSlop={10}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: RADIUS.xl,
                backgroundColor: getAccent('red').bg,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: getAccent('red').border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <LogOut size={18} color="#f87171" />
          </Pressable>
        }
      />

      <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, flex: 1, alignSelf: "center" }}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: SPACING[4],
            paddingTop: SPACING[4],
            width: "100%",
            alignItems: "center",
            gap: SPACING[4],
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
          style={{ width: "100%" }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_CONTENT_WIDTH,
              gap: SPACING[4],
            }}
          >
            {/* Profile Header Card */}
            <ProfileHeaderCard user={user} loading={userQ.isLoading} />

            {/* Tabs */}
            <Tabs<ProfileTab>
              variant="pills"
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "edit",
                  label: t('editTab'),
                  icon: (
                    <UserRound
                      size={14}
                      color={tab === 'edit' ? theme.foreground : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "skills",
                  label: t('skillsTab'),
                  icon: (
                    <GraduationCap
                      size={14}
                      color={tab === 'skills' ? theme.foreground : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "reviews",
                  label: t('reviewsTab'),
                  icon: (
                    <Star
                      size={14}
                      color={tab === 'reviews' ? theme.foreground : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "referrals",
                  label: t('referralsTab'),
                  icon: (
                    <Gift
                      size={14}
                      color={
                        tab === 'referrals' ? theme.foreground : theme.mutedForeground
                      }
                    />
                  ),
                },
                {
                  value: "notifications",
                  label: t('alertsTab'),
                  icon: (
                    <Bell
                      size={14}
                      color={
                        tab === 'notifications' ? theme.foreground : theme.mutedForeground
                      }
                    />
                  ),
                },
              ]}
            />

            {/* Tab bodies */}
            {tab === "edit" && (
              <EditProfilePane user={user} loading={userQ.isLoading} />
            )}
            {tab === "skills" && <SkillsPane user={user} />}
            {tab === "reviews" && <ReviewsPane />}
            {tab === "referrals" && <ReferralsPane />}
            {tab === "notifications" && <NotificationsPrefsPane />}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/* ---------------------------- Profile Header ---------------------------- */

function ProfileHeaderCard({ user, loading }: { user: any; loading: boolean }) {
  const reviewsQ = useMyReviews();
  const t = useT('profile');

  const avg = reviewsQ.data
    ? calculateAverageRating(reviewsQ.data as any[])
    : 0;
  const count = reviewsQ.data?.length ?? 0;
  const offering = (user?.userSkills ?? []).filter(
    (s: any) => s.type === "OFFERING",
  );
  const seeking = (user?.userSkills ?? []).filter(
    (s: any) => s.type === "SEEKING",
  );

  return (
    <Card variant="glass" glow={true}>
      <CardContent style={{ paddingTop: SPACING[5] }}>
        <View
          style={{
            flexDirection: "row",
            gap: SPACING[4],
            alignItems: "center",
          }}
        >
          <AvatarUploader current={user?.image} fallback={user?.name} />
          <View style={{ flex: 1, gap: SPACING[1] }}>
            {loading ? (
              <View style={{ gap: SPACING[1] }}>
                <Skeleton width="70%" height={22} rounded />
                <Skeleton width="50%" height={14} rounded />
                <Skeleton width="40%" height={12} rounded />
              </View>
            ) : (
              <>
                <ThemedText
                  type="title"
                  style={{
                    fontSize: FONT_SIZE["2xl"],
                    fontWeight: "800",
                    letterSpacing: -0.3,
                    color: "#fafafa",
                  }}
                >
                  {user?.name ?? t('yourName')}
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[1.5],
                    marginTop: 2,
                  }}
                >
                  <Mail size={13} color="#a1a1aa" />
                  <ThemedText
                    type="small"
                    style={{
                      color: "#a1a1aa",
                      fontSize: FONT_SIZE.sm,
                    }}
                    numberOfLines={1}
                  >
                    {user?.email ?? t('emailNotSet')}
                  </ThemedText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[2],
                    marginTop: SPACING[2],
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Star
                      size={14}
                      color="#f59e0b"
                      fill="#f59e0b"
                    />
                    <ThemedText
                      type="smallBold"
                      style={{ fontSize: FONT_SIZE.sm, color: "#fafafa" }}
                    >
                      {avg > 0 ? avg.toFixed(1) : t('new')}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: "#a1a1aa", fontSize: 11 }}
                    >
                      ({count})
                    </ThemedText>
                  </View>
                  <StatBadge
                    icon={
                      <GraduationCap
                        size={12}
                        color="#4ade80"
                      />
                    }
                    label={`${offering.length} ${t('teach')}`}
                  />
                  <StatBadge
                    icon={<BookOpen size={12} color="#818cf8" />}
                    label={`${seeking.length} ${t('learn')}`}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function StatBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: SPACING[2],
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: theme.backgroundElement,
      }}
    >
      {icon}
      <ThemedText type="smallBold" style={{ fontSize: 11 }}>
        {label}
      </ThemedText>
    </View>
  );
}

function AvatarUploader({
  current,
  fallback,
}: {
  current?: string | null;
  fallback?: string;
}) {
  const theme = useTheme();
  const t = useT('profile');
  const userQ = useCurrentUser();
  const toast = useToast();
  const [preview, setPreview] = React.useState<string | null>(null);
  const getPresignedUrlMutation = useGetUploadPresignedUrl();
  const confirmMutation = useConfirmAvatar();
  const queryClient = useQueryClient();

  const pick = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.toast({
          title: t('permissionDenied'),
          description: t('allowAccessPhoto'),
          variant: "error",
        });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setPreview(asset.uri);
    } catch (err: any) {
      toast.toast({ title: t("couldNotPickImage"), variant: "error" });
    }
  };

  const handleSaveAvatar = async (uriToUpload: string) => {
    try {
      const filename = uriToUpload.split('/').pop() || `avatar_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

      const name = filename || uriToUpload.split('/').pop() || `avatar_${Date.now()}.jpg`;
      const type = mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

      // 1. Request presigned URL from backend
      const { uploadUrl, key } = await getPresignedUrlMutation.mutateAsync({
        fileName: name,
        fileType: type,
        type: 'avatar',
      });

      // Step 2: Upload file
      const file = new File(uriToUpload);
      const fileUploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: file,
      });

      if (!fileUploadRes.ok || fileUploadRes.status < 200 || fileUploadRes.status >= 300) {
        throw new Error("File upload to storage failed");
      }

      const { success } = await confirmMutation.mutateAsync({
        key,
      });
      if (!success) throw new Error("Could not confirm avatar upload.");
      // Dismiss preview modal upon success so toast renders visibly on the root screen
      setPreview(null);
      toast.toast({ title: t('profilePictureUpdated'), variant: "success" });
    } catch (err: any) {
      setPreview(null);
      toast.toast({
        title: t('imageUploadFailed'),
        description: err?.message || t('couldNotUpdateProfilePicture'),
        variant: "error",
      });
    }
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ position: "relative" }}>
        <Pressable
          onPress={() => (current || preview) && setPreview(current || preview)}
          hitSlop={4}
        >
          <Avatar uri={preview || current} fallback={fallback} size={88} />
        </Pressable>
        <Pressable
          onPress={pick}
          hitSlop={8}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 32,
            height: 32,
            borderRadius: RADIUS.pill,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2.5,
            borderColor: theme.background,
            zIndex: 10,
          }}
        >
          <Camera size={15} color="#fff" />
        </Pressable>
      </View>
      {preview && (
        <ImagePreviewModal
          uri={preview}
          onClose={() => setPreview(null)}
          onUpload={() => handleSaveAvatar(preview)}
          uploading={getPresignedUrlMutation.isPending || confirmMutation.isPending}
          isNewPick={preview !== current}
        />
      )}
    </View>
  );
}

function ImagePreviewModal({
  uri,
  onClose,
  onUpload,
  uploading,
  isNewPick,
}: {
  uri: string;
  onClose: () => void;
  onUpload?: () => void;
  uploading?: boolean;
  isNewPick?: boolean;
}) {
  const theme = useTheme();
  const t = useT('profile');
  return (
    <Modal visible onRequestClose={onClose} transparent animationType="fade">
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SPACING[4],
            paddingVertical: SPACING[3],
          }}
        >
          <ThemedText type="smallBold" style={{ color: "#fff", fontSize: FONT_SIZE.md }}>
            {t('profilePicture')}
          </ThemedText>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            <ThemedText style={{ color: "#fff", fontSize: 20 }}>×</ThemedText>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING[4] }}>
          <ExpoImage
            source={{ uri }}
            style={{ width: 280, height: 280, borderRadius: 140 }}
            contentFit="cover"
          />
        </View>

        <View style={{ padding: SPACING[4], gap: SPACING[3] }}>
          {isNewPick && onUpload ? (
            <Button onPress={onUpload} loading={uploading}>
              {t('saveProfilePicture')}
            </Button>
          ) : null}
          <Button variant="outline" onPress={onClose} disabled={uploading}>
            {t('close')}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------------------------- Edit Profile Pane ---------------------------- */

function EditProfilePane({ user, loading }: { user: any; loading: boolean }) {
  const theme = useTheme();
  const toast = useToast();
  const t = useT('profile');
  const updateUser = useUpdateProfile();

  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const save = async () => {
    try {
      const parsed = v.parse(ProfileFormSchema, {
        name,
        bio,
      });
      await updateUser.mutateAsync(parsed);
      toast.toast({ title: t('profileSaved'), variant: "success" });
    } catch (e: any) {
      if (e instanceof v.ValiError) {
        const map: Record<string, string> = {};
        const issues = v.flatten(e.issues);
        Object.entries(issues.nested ?? {}).forEach(([k, v]) => {
          map[k] = (v as any)[0] ?? t('invalid');
        });
        setErrors(map);
        return;
      }
      toast.toast({
        title: t('couldNotSave'),
        description: e?.message ?? t('tryAgain'),
        variant: "error",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('profileInformation')}</CardTitle>
          <CardDescription>
            {t('profileInformationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          <Input
            label={t('displayName')}
            value={name}
            onChangeText={setName}
            placeholder={t('yourName')}
            error={errors.name}
            leftSlot={<UserRound size={16} color={theme.mutedForeground} />}
          />
          <Textarea
            label={t('bio')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('bioPlaceholder')}
            numberOfLines={5}
            error={errors.bio}
            description={`${bio.length}/500`}
          />
          <Button onPress={save} loading={updateUser.isPending || loading}>
            {t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      <AppPreferencesCard />
    </>
  );
}

function AppPreferencesCard() {
  const theme = useTheme();
  const t = useT('profile');
  const { locale, setLocale } = useI18n();
  const { mode, setMode } = useThemeContext();
  const localeOpts = SUPPORTED_LOCALES.map((l) => ({
    label: LOCALE_LABELS[l],
    value: l,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('appPreferences')}</CardTitle>
        <CardDescription>
          {t('appPreferencesDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent style={{ gap: SPACING[4] }}>
        <View style={{ gap: SPACING[2] }}>
          <ThemedText
            type="smallBold"
            style={{
              fontSize: FONT_SIZE.sm,
              color: theme.foreground,
              marginLeft: SPACING[0.5],
            }}
          >
            {t('language')}
          </ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[2] }}>
            {localeOpts.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setLocale(opt.value)}
                style={{
                  paddingHorizontal: SPACING[3.5],
                  paddingVertical: SPACING[2.5],
                  borderRadius: RADIUS.lg,
                  borderWidth: 1,
                  borderColor:
                    locale === opt.value ? theme.primary : theme.border,
                  backgroundColor:
                    locale === opt.value
                      ? theme.primary
                      : theme.secondary,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING[1.5],
                }}
              >
                <Globe2
                  size={15}
                  color={
                    locale === opt.value ? theme.primaryForeground : theme.mutedForeground
                  }
                />
                <ThemedText
                  type="label"
                  style={{
                    color: locale === opt.value ? theme.primaryForeground : theme.foreground,
                    fontWeight: locale === opt.value ? '600' : '400',
                  }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: SPACING[2] }}>
          <ThemedText
            type="smallBold"
            style={{
              fontSize: 11,
              color: theme.mutedForeground,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {t('appearance')}
          </ThemedText>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            <AppearanceChip
              icon={
                <Monitor
                  size={16}
                  color={
                    mode === "system" ? theme.primary : theme.mutedForeground
                  }
                />
              }
              label={t('system')}
              active={mode === "system"}
              onPress={() => setMode("system")}
            />
            <AppearanceChip
              icon={
                <Sun
                  size={16}
                  color={
                    mode === "light" ? theme.primary : theme.mutedForeground
                  }
                />
              }
              label={t('light')}
              active={mode === "light"}
              onPress={() => setMode("light")}
            />
            <AppearanceChip
              icon={
                <Moon
                  size={16}
                  color={
                    mode === "dark" ? theme.primary : theme.mutedForeground
                  }
                />
              }
              label={t('dark')}
              active={mode === "dark"}
              onPress={() => setMode("dark")}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function AppearanceChip({ icon, label, active, onPress }: any) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active
          ? getAccent("indigo").bg
          : theme.backgroundElement,
        alignItems: "center",
        gap: SPACING[1],
        opacity: active ? 1 : 0.6,
      }}
    >
      {icon}
      <ThemedText type="smallBold" style={{ fontSize: 12 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/* ---------------------------- Skills Pane ---------------------------- */

function SkillsPane({ user }: { user: any }) {
  const theme = useTheme();
  const t = useT('profile');
  const skillsQ = useSkills();
  const catsQ = useSkillCategories();
  const addQ = useAddUserSkill();
  const removeQ = useRemoveUserSkill();
  const userQ = useCurrentUser();
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [type, setType] = React.useState<SkillType>(SkillType.OFFERING);
  const [skillId, setSkillId] = React.useState<string | undefined>();
  const [level, setLevel] = React.useState<string>("INTERMEDIATE");
  const [customSkill, setCustomSkill] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | undefined>();
  const [experience, setExperience] = React.useState("");

  const reset = () => {
    setSkillId(undefined);
    setCategoryId(undefined);
    setCustomSkill("");
    setLevel("INTERMEDIATE");
    setExperience("");
  };

  const skills = skillsQ.data ?? [];
  const categories = catsQ.data ?? [];
  const filtered = categoryId
    ? skills.filter((s: any) => s.categoryId === categoryId)
    : skills;

  const userSkills = (user?.skills ?? []) as any[];

  const offering = userSkills.filter((s) => s.type === "OFFERING");
  const seeking = userSkills.filter((s) => s.type === "SEEKING");

  const submit = async () => {
    try {
      await addQ.mutateAsync({
        type,
        skillId: skillId || undefined,
        customName: customSkill || undefined,
        categoryId: categoryId || undefined,
        level,
        experience: experience || undefined,
      } as any);
      toast.toast({
        title:
          type === "OFFERING" ? t('addedTeachingSkill') : t('addedLearningSkill'),
        variant: "success",
      });
      reset();
      setDialogOpen(false);
      await userQ.refetch();
    } catch (e: any) {
      toast.toast({
        title: t('failedToAddSkill'),
        description: e?.message ?? t('tryAgain'),
        variant: "error",
      });
    }
  };

  const remove = async (id: string) => {
    Alert.alert(t('removeSkill'), t('removeSkillConfirm'), [
      { text: t('cancel'), style: "cancel" },
      {
        text: t('remove'),
        style: "destructive",
        onPress: async () => {
          await removeQ.mutateAsync(id);
          toast.toast({ title: t('skillRemoved'), variant: "success" });
          await userQ.refetch();
        },
      },
    ]);
  };

  return (
    <View style={{ gap: SPACING[4] }}>
      <Card>
        <CardHeader>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <CardTitle>{t('skills')}</CardTitle>
              <CardDescription>
                {t('skillsDesc')}
              </CardDescription>
            </View>
            <Button
              size="sm"
              leftIcon={<Plus size={14} color="#fff" />}
              onPress={() => setDialogOpen(true)}
            >
              {t('add')}
            </Button>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[5] }}>
          <SkillGroup
            title={t('iCanTeach')}
            accent="emerald"
            icon={<GraduationCap size={16} color={getAccent("emerald").main} />}
            list={offering}
            onRemove={remove}
            empty={t('addSkillsToShare')}
          />
          <Separator />
          <SkillGroup
            title={t('iWantToLearn')}
            accent="blue"
            icon={<BookOpen size={16} color={getAccent("blue").main} />}
            list={seeking}
            onRemove={remove}
            empty={t('addSkillsToLearn')}
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => !addQ.isPending && setDialogOpen(o)}
      >
        <DialogHeader onClose={() => setDialogOpen(false)}>
          <DialogTitle>{t('addSkill')}</DialogTitle>
          <DialogDescription>
            {t('addSkillDesc')}
          </DialogDescription>
        </DialogHeader>
        <DialogContent style={{ gap: SPACING[4] }}>
          <View style={{ gap: SPACING[2] }}>
            <ThemedText
              type="smallBold"
              style={{
                fontSize: FONT_SIZE.sm,
                color: theme.foreground,
                marginLeft: SPACING[0.5],
              }}
            >
              {t('skillType')}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: SPACING[2] }}>
              <Pressable
                onPress={() => setType(SkillType.OFFERING)}
                style={{
                  flex: 1,
                  padding: SPACING[3],
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor:
                    type === SkillType.OFFERING ? theme.primary : theme.border,
                  backgroundColor:
                    type === SkillType.OFFERING
                      ? getAccent("emerald").bg
                      : theme.backgroundElement,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: SPACING[1.5],
                }}
              >
                <GraduationCap
                  size={14}
                  color={
                    type === SkillType.OFFERING
                      ? theme.primary
                      : theme.mutedForeground
                  }
                />
                <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                  {t('iTeach')}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setType(SkillType.SEEKING)}
                style={{
                  flex: 1,
                  padding: SPACING[3],
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor:
                    type === SkillType.SEEKING ? theme.primary : theme.border,
                  backgroundColor:
                    type === SkillType.SEEKING
                      ? getAccent("blue").bg
                      : theme.backgroundElement,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: SPACING[1.5],
                }}
              >
                <BookOpen
                  size={14}
                  color={
                    type === SkillType.SEEKING
                      ? theme.primary
                      : theme.mutedForeground
                  }
                />
                <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                  {t('iLearn')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
          <SelectField
            label={t('category')}
            value={categoryId}
            onChange={setCategoryId}
            placeholder={t('pickCategory')}
            options={[
              { label: t('allCategories'), value: "" as any },
              ...categories.map((c: any) => ({ label: c.name, value: c.id })),
            ]}
          />
          <SelectField
            label={t('skill')}
            value={skillId}
            onChange={setSkillId}
            placeholder={t('searchOrSelectSkill')}
            options={[
              { label: t('customSkill'), value: "__custom__" },
              ...filtered.map((s: any) => ({ label: s.name, value: s.id })),
            ]}
            searchable
          />
          {skillId === "__custom__" ? (
            <Input
              label={t('customSkillName')}
              value={customSkill}
              onChangeText={setCustomSkill}
              placeholder={t('customSkillPlaceholder')}
            />
          ) : null}
          <SelectField
            label={t('level')}
            value={level}
            onChange={setLevel}
            options={[
              { label: t('beginner'), value: "BEGINNER" },
              { label: t('intermediate'), value: "INTERMEDIATE" },
              { label: t('advanced'), value: "ADVANCED" },
              { label: t('expert'), value: "EXPERT" },
            ]}
          />
          <Textarea
            label={t('experience')}
            value={experience}
            onChangeText={setExperience}
            placeholder={t('experiencePlaceholder')}
            numberOfLines={3}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => setDialogOpen(false)}
            disabled={addQ.isPending}
          >
            {t('cancel')}
          </Button>
          <Button
            onPress={submit}
            loading={addQ.isPending}
            disabled={
              !((skillId && skillId !== "__custom__") || customSkill.trim())
            }
          >
            {t('addSkill')}
          </Button>
        </DialogFooter>
      </Dialog>
    </View>
  );
}

function SkillGroup({
  title,
  accent,
  icon,
  list,
  onRemove,
  empty,
}: {
  title: string;
  accent: string;
  icon: React.ReactNode;
  list: any[];
  onRemove: (id: string) => void;
  empty: string;
}) {
  const theme = useTheme();
  const t = useT('profile');
  return (
    <View style={{ gap: SPACING[2] }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: SPACING[2] }}
      >
        {icon}
        <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
          {title}
        </ThemedText>
      </View>
      {list.length === 0 ? (
        <View
          style={{
            padding: SPACING[4],
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: theme.border,
          }}
        >
          <ThemedText
            type="small"
            style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}
          >
            {empty}
          </ThemedText>
        </View>
      ) : (
        <View style={{ gap: SPACING[2] }}>
          {list.map((s: any) => (
            <View
              key={s.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: SPACING[3],
                borderRadius: RADIUS.md,
                backgroundColor: theme.backgroundElement,
                borderWidth: 1,
                borderColor: theme.border,
                gap: SPACING[3],
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: RADIUS.md,
                  backgroundColor: getAccent(accent).bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.type === "OFFERING" ? (
                  <GraduationCap size={14} color={getAccent(accent).main} />
                ) : (
                  <BookOpen size={14} color={getAccent(accent).main} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                  {s.skill?.name ?? s.skillName ?? t('skill')}
                  {s.level ? (
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.mutedForeground,
                        fontSize: FONT_SIZE.sm,
                      }}
                    >
                      {" "}
                      · {s.level.toLowerCase()}
                    </ThemedText>
                  ) : null}
                </ThemedText>
                {s.experience ? (
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.mutedForeground,
                      fontSize: FONT_SIZE.sm,
                    }}
                    numberOfLines={1}
                  >
                    {s.experience}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable onPress={() => onRemove(s.id)} hitSlop={10}>
                <Trash2 size={16} color={theme.destructive as any} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------------------------- Reviews Pane ---------------------------- */

function ReviewsPane() {
  const theme = useTheme();
  const t = useT('profile');
  const reviewsQ = useMyReviews();
  const loading = reviewsQ.isLoading;
  const reviews = reviewsQ.data ?? [];
  const avg = reviews.length ? calculateAverageRating(reviews as any[]) : 0;
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r: any) => {
    const rating = Math.round(r.rating ?? 0);
    if (rating >= 1 && rating <= 5) counts[rating]++;
  });

  return (
    <View style={{ gap: SPACING[4] }}>
      <Card>
        <CardHeader>
          <CardTitle>{t('reviews')}</CardTitle>
          <CardDescription>{t('reviewsDesc')}</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          <View
            style={{
              padding: SPACING[4],
              borderRadius: RADIUS.lg,
              backgroundColor: getAccent("amber").bg,
              borderWidth: 1,
              borderColor: getAccent("amber").border,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[4],
            }}
          >
            <View style={{ alignItems: "center" }}>
              <ThemedText
                type="title"
                style={{ fontSize: FONT_SIZE["4xl"], fontWeight: "900" }}
              >
                {avg.toFixed(1)}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    color={
                      i <= Math.round(avg)
                        ? getAccent("amber").main
                        : theme.mutedForeground
                    }
                    fill={
                      i <= Math.round(avg)
                        ? getAccent("amber").main
                        : "transparent"
                    }
                  />
                ))}
              </View>
              <ThemedText
                type="small"
                style={{
                  color: theme.mutedForeground,
                  fontSize: FONT_SIZE.sm,
                  marginTop: 4,
                }}
              >
                {reviews.length} {reviews.length === 1 ? t('review') : t('reviews')}
              </ThemedText>
            </View>
            <View style={{ flex: 1, gap: SPACING[1] }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const total = reviews.length || 1;
                const pct = (counts[star] / total) * 100;
                return (
                  <View
                    key={star}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[2],
                    }}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ fontSize: 11, width: 14, textAlign: "center" }}
                    >
                      {star}
                    </ThemedText>
                    <Star
                      size={12}
                      color={getAccent("amber").main}
                      fill={getAccent("amber").main}
                    />
                    <View
                      style={{
                        flex: 1,
                        height: 6,
                        backgroundColor: theme.muted,
                        borderRadius: 9999,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: getAccent("amber").main,
                          borderRadius: 9999,
                        }}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        fontSize: 11,
                        color: theme.mutedForeground,
                        width: 20,
                        textAlign: "right",
                      }}
                    >
                      {counts[star]}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <View style={{ gap: SPACING[4] }}>
              <SkeletonText lines={4} />
              <SkeletonText lines={4} />
            </View>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent
            style={{
              paddingVertical: SPACING[8],
              alignItems: "center",
              gap: SPACING[3],
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.backgroundElement,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Star size={24} color={theme.mutedForeground} />
            </View>
            <ThemedText type="default" style={{ fontWeight: "700" }}>
              {t('noReviewsYet')}
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: theme.mutedForeground,
                textAlign: "center",
                fontSize: FONT_SIZE.sm,
              }}
            >
              {t('noReviewsDesc')}
            </ThemedText>
          </CardContent>
        </Card>
      ) : (
        <View style={{ gap: SPACING[3] }}>
          {reviews.map((r: any) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </View>
      )}
    </View>
  );
}

export function ReviewCard({ review }: { review: any }) {
  const theme = useTheme();
    const t = useT('profile');

  const rating = Math.round(review.rating ?? 0);
  const tags: string[] = review.tags ?? [];
  const router = useRouter();
  return (
    <Card>
      <CardContent style={{ gap: SPACING[3] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING[3],
          }}
        >
          <Pressable
            onPress={() =>
              review.reviewerId &&
              router.push(`/users/${review.reviewerId}` as any)
            }
          >
            <Avatar
              uri={review.reviewer?.image}
              fallback={review.reviewer?.name}
              size={40}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
              {review.reviewer?.name ?? t('user')}
            </ThemedText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[2],
                marginTop: 2,
              }}
            >
              <View style={{ flexDirection: "row", gap: 1 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={12}
                    color={
                      i <= rating
                        ? getAccent("amber").main
                        : theme.mutedForeground
                    }
                    fill={i <= rating ? getAccent("amber").main : "transparent"}
                  />
                ))}
              </View>
              {review.createdAt ? (
                <ThemedText
                  type="small"
                  style={{ fontSize: 11, color: theme.mutedForeground }}
                >
                  {new Date(review.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </View>
        {review.comment ? (
          <ThemedText
            type="small"
            style={{
              color: theme.foreground,
              fontSize: FONT_SIZE.sm,
              lineHeight: 20,
            }}
          >
            {review.comment}
          </ThemedText>
        ) : null}
        {tags.length > 0 ? (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING[2] }}
          >
            {tags.map((t) => (
              <Badge key={t} variant="outline">
                {REVIEW_TAG_LABELS[t as keyof typeof REVIEW_TAG_LABELS] ?? t}
              </Badge>
            ))}
          </View>
        ) : null}
        {review.exchange?.taughtSkillName ||
        review.exchange?.receivedSkillName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[2],
              padding: SPACING[2],
              borderRadius: RADIUS.sm,
              backgroundColor: theme.background,
            }}
          >
            <BadgeCheck size={14} color={theme.primary} />
            <ThemedText
              type="small"
              style={{ color: theme.mutedForeground, fontSize: FONT_SIZE.sm }}
            >
              {t('exchangeLabel')}: {review.exchange.taughtSkillName} ↔{" "}
              {review.exchange.receivedSkillName}
            </ThemedText>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ---------------------------- Referrals Pane ---------------------------- */

function ReferralsPane() {
  const t = useT('profile');
  const refCodeQ = useReferralCode();
  const refStatsQ = useReferralStats();
  const toast = useToast();
  const theme = useTheme();

  const loading = refCodeQ.isLoading || refStatsQ.isLoading;
  const code = refCodeQ.data;
  const stats = refStatsQ.data;
  const referrals = stats?.referrals ?? [];
  const webBase = process.env.EXPO_PUBLIC_WEB_BASE_URL!.replace(/\/$/, "");
  const shareLink = `${webBase}?ref=${code ?? ""}`;

  const copy = async () => {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(shareLink);
    toast.toast({ title: t('linkCopied'), variant: "success" });
  };
  const share = async () => {
    try {
      await Share.share({
        message: t('shareReferralMessage', { link: shareLink }),
      });
    } catch {}
  };

  return (
    <View style={{ gap: SPACING[4] }}>
      <Card style={{ borderColor: getAccent("violet").border }}>
        <CardHeader>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING[3],
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.md,
                backgroundColor: getAccent("violet").bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gift size={20} color={getAccent("violet").main} />
            </View>
            <View style={{ flex: 1 }}>
              <CardTitle>{t('inviteFriends')}</CardTitle>
              <CardDescription>
                {t('inviteFriendsDesc')}
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[3] }}>
          <View
            style={{
              padding: SPACING[3],
              borderRadius: RADIUS.md,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: SPACING[3],
            }}
          >
            <ThemedText
              type="default"
              style={{
                fontSize: FONT_SIZE["2xl"],
                fontWeight: "800",
                color: theme.primary,
                letterSpacing: 0.5,
                flexGrow: 1,
                textAlign: "center",
              }}
            >
              {code}
            </ThemedText>
            <Pressable
              onPress={copy}
              hitSlop={10}
              style={{
                paddingHorizontal: SPACING[3],
                paddingVertical: SPACING[1.5],
                borderRadius: RADIUS.sm,
                backgroundColor: theme.backgroundElement,
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING[1.5],
              }}
            >
              <Copy size={14} color={theme.foreground} />
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.sm }}>
                {t('copy')}
              </ThemedText>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            <Button
              variant="outline"
              style={{ flex: 1 }}
              leftIcon={<Share2 size={16} color={theme.foreground} />}
              onPress={share}
            >
              {t('shareLink')}
            </Button>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            <MiniStat
              icon={<Users size={16} color={getAccent("indigo").main} />}
              label={t('referrals')}
              value={stats?.totalReferrals ?? 0}
              accent="indigo"
            />
            <MiniStat
              icon={<TrendingUp size={16} color={getAccent("emerald").main} />}
              label={t('referralsActive')}
              value={stats?.activeReferrals ?? 0}
              accent="emerald"
            />
            <MiniStat
              icon={<HandCoins size={16} color={getAccent("amber").main} />}
              label={t('referralsPointsEarned')}
              value={stats?.pointsEarned ?? 0}
              accent="amber"
            />
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentReferrals')}</CardTitle>
          <CardDescription>
            {t('recentReferralsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: SPACING[2] }}>
          {loading ? (
            <SkeletonText lines={4} />
          ) : referrals.length === 0 ? (
            <View
              style={{
                padding: SPACING[6],
                borderRadius: RADIUS.md,
                backgroundColor: theme.backgroundElement,
                alignItems: "center",
                gap: SPACING[2],
              }}
            >
              <ThemedText type="default" style={{ fontWeight: "700" }}>
                {t('noReferralsYet')}
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: theme.mutedForeground,
                  textAlign: "center",
                  fontSize: FONT_SIZE.sm,
                }}
              >
                {t('noReferralsDesc')}
              </ThemedText>
            </View>
          ) : (
            referrals.map((r: any) => (
              <View
                key={r.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING[3],
                  padding: SPACING[3],
                  borderRadius: RADIUS.md,
                  backgroundColor: theme.backgroundElement,
                }}
              >
                <Avatar uri={r.user?.image} fallback={r.user?.name} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText
                    type="smallBold"
                    style={{ fontSize: FONT_SIZE.md }}
                  >
                    {r.user?.name ?? t('friend')}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.mutedForeground,
                      fontSize: FONT_SIZE.sm,
                    }}
                  >
                    {new Date(r.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                {r.status === "COMPLETED" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[1.5],
                    }}
                  >
                    <Badge variant="accent" accent="emerald">
                      {t('ptsBadge', { count: 200 })}
                    </Badge>
                  </View>
                ) : (
                  <Badge variant="outline">{t('pending')}</Badge>
                )}
              </View>
            ))
          )}
        </CardContent>
      </Card>
    </View>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: SPACING[3],
        borderRadius: RADIUS.md,
        backgroundColor: theme.backgroundElement,
        gap: SPACING[1],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING[1.5],
        }}
      >
        {icon}
        <ThemedText
          type="small"
          style={{ color: theme.mutedForeground, fontSize: 11 }}
        >
          {label}
        </ThemedText>
      </View>
      <ThemedText
        type="title"
        style={{ fontSize: FONT_SIZE.xl, fontWeight: "800" }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/* ---------------------------- Notifications Prefs Pane ---------------------------- */

function NotificationsPrefsPane() {
  const theme = useTheme();
  const t = useT('profile');
  const updateQ = useUpdateNotificationPreferences();

  const userQ = useCurrentUser();

  const loading = userQ.isLoading || updateQ.isPending;
  const user = userQ.data;

  const set = async (patch: any) => {
    await updateQ.mutateAsync(patch);
    await userQ.refetch();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notificationPreferences')}</CardTitle>
        <CardDescription>{t('notificationPreferencesDesc')}</CardDescription>
      </CardHeader>
      <CardContent style={{ gap: SPACING[4] }}>
        {loading && !user ? <SkeletonText lines={6} /> : null}
        <View style={{ gap: SPACING[3] }}>
          <Switch
            label={t('inApp')}
            description={t('inAppDesc')}
            value={user.inAppNotifications ?? true}
            onValueChange={(v) => {
              set({ inAppNotifications: v });
            }}
          />
          <Switch
            label={t('emailDigests')}
            description={t('emailDigestsDesc')}
            value={user.emailNotifications ?? true}
            onValueChange={(v) => {
              set({ emailNotifications: v });
            }}
          />
          <Switch
            label={t('pushNotificationsLabel')}
            description={t('pushNotificationsDesc')}
            value={user.pushNotifications ?? true}
            onValueChange={(v) => {
              set({ pushNotifications: v });
            }}
          />
        </View>
      </CardContent>
    </Card>
  );
}
