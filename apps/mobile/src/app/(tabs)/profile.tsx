import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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
  Label,
  SelectField,
  Separator,
  Skeleton,
  SkeletonText,
  Switch,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  FONT_SIZE,
  getAccent,
  MAX_CONTENT_WIDTH,
  RADIUS,
  SPACING,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  useAddUserSkill,
  useCurrentUser,
  useMyReviews,
  useNotificationPreferences,
  useReferralTracking,
  useRemoveUserSkill,
  useSkillCategories,
  useSkills,
  useUpdateNotificationPreferences,
  useUpdateProfile,
  useUploadImage,
} from "@/lib/api-hooks";
import { authClient } from "../../../lib/auth";
import {
  calculateAverageRating,
  EXCHANGE_NOTIFICATION_TYPES,
  POINTS_NOTIFICATION_TYPES,
  REVIEW_TAG_LABELS,
  SkillType,
} from "@skil-ex2/shared";
import { ProfileFormSchema } from "@skil-ex2/shared";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
  MapPin,
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
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as v from "valibot";
import { Locale, LOCALE_LABELS, SUPPORTED_LOCALES, useI18n } from "lib/i18n";

type ProfileTab = "edit" | "skills" | "reviews" | "referrals" | "notifications";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

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
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <ThemedView type="background" style={{ flex: 1, alignItems: "center" }}>
        {/* Header */}
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            paddingHorizontal: SPACING[5],
            paddingTop: SPACING[2],
            paddingBottom: SPACING[4],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <ThemedText
            type="title"
            style={{
              fontSize: FONT_SIZE["2xl"],
              fontWeight: "800",
              letterSpacing: -0.2,
            }}
          >
            Profile
          </ThemedText>
          <Pressable
            onPress={handleSignOut}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: RADIUS.pill,
              backgroundColor: theme.backgroundElement,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <LogOut size={18} color={theme.destructive as any} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + SPACING[10],
            paddingHorizontal: SPACING[5],
            width: "100%",
            alignItems: "center",
            gap: SPACING[4],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
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
            {/* Profile Card */}
            <ProfileHeaderCard user={user} loading={userQ.isLoading} />

            {/* Tabs */}
            <Tabs<ProfileTab>
              variant="pills"
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "edit",
                  label: "Edit",
                  icon: (
                    <UserRound
                      size={14}
                      color={tab === "edit" ? "#fff" : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "skills",
                  label: "Skills",
                  icon: (
                    <GraduationCap
                      size={14}
                      color={tab === "skills" ? "#fff" : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "reviews",
                  label: "Reviews",
                  icon: (
                    <Star
                      size={14}
                      color={tab === "reviews" ? "#fff" : theme.mutedForeground}
                    />
                  ),
                },
                {
                  value: "referrals",
                  label: "Referrals",
                  icon: (
                    <Gift
                      size={14}
                      color={
                        tab === "referrals" ? "#fff" : theme.mutedForeground
                      }
                    />
                  ),
                },
                {
                  value: "notifications",
                  label: "Alerts",
                  icon: (
                    <Bell
                      size={14}
                      color={
                        tab === "notifications" ? "#fff" : theme.mutedForeground
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
      </ThemedView>
    </SafeAreaView>
  );
}

/* ---------------------------- Profile Header ---------------------------- */

function ProfileHeaderCard({ user, loading }: { user: any; loading: boolean }) {
  const theme = useTheme();
  const reviewsQ = useMyReviews();
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
    <Card>
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
                    letterSpacing: -0.2,
                  }}
                >
                  {user?.name ?? "Your name"}
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[1.5],
                    marginTop: 2,
                  }}
                >
                  <Mail size={12} color={theme.mutedForeground} />
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.mutedForeground,
                      fontSize: FONT_SIZE.sm,
                    }}
                    numberOfLines={1}
                  >
                    {user?.email ?? "email not set"}
                  </ThemedText>
                </View>
                {user?.location ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING[1.5],
                      marginTop: 2,
                    }}
                  >
                    <MapPin size={12} color={theme.mutedForeground} />
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.mutedForeground,
                        fontSize: FONT_SIZE.sm,
                      }}
                    >
                      {user.location}
                    </ThemedText>
                  </View>
                ) : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING[3],
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
                      color={getAccent("amber").main}
                      fill={getAccent("amber").main}
                    />
                    <ThemedText
                      type="smallBold"
                      style={{ fontSize: FONT_SIZE.sm }}
                    >
                      {avg.toFixed(1)}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.mutedForeground, fontSize: 11 }}
                    >
                      ({count})
                    </ThemedText>
                  </View>
                  <StatBadge
                    icon={
                      <GraduationCap
                        size={12}
                        color={getAccent("emerald").main}
                      />
                    }
                    label={`${offering.length} teach`}
                  />
                  <StatBadge
                    icon={<BookOpen size={12} color={getAccent("blue").main} />}
                    label={`${seeking.length} learn`}
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
  const uploadImg = useUploadImage();
  const userQ = useCurrentUser();
  const toast = useToast();

  const pick = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.toast({
          title: "Permission denied",
          description: "Allow access to pick a photo",
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
      const uri = res.assets[0].uri;
      const fileExt = uri.split(".").pop() ?? "jpg";
      const file: any = {
        uri,
        type: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        name: `avatar.${fileExt}`,
      };
      const form = new FormData();
      form.append("file", file);
      try {
        const uploaded = await uploadImg.mutateAsync(form);
        toast.toast({ title: "Avatar updated", variant: "success" });
        await userQ.refetch();
      } catch (err: any) {
        toast.toast({
          title: "Failed to upload",
          description: err?.message ?? "Try again",
          variant: "error",
        });
      }
    } catch (err: any) {
      toast.toast({ title: "Could not pick image", variant: "error" });
    }
  };

  return (
    <View>
      <Pressable onPress={pick}>
        <Avatar uri={current} fallback={fallback} size={80} />
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 30,
            height: 30,
            borderRadius: RADIUS.pill,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: theme.background,
          }}
        >
          <Camera size={14} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

/* ---------------------------- Edit Profile Pane ---------------------------- */

function EditProfilePane({ user, loading }: { user: any; loading: boolean }) {
  const theme = useTheme();
  const toast = useToast();
  const updateUser = useUpdateProfile();

  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [availability, setAvailability] = React.useState<
    Record<string, boolean>
  >({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setBio(user.bio ?? "");
      setLocation(user.location ?? "");
      setAvailability(user.availability ?? {});
    }
  }, [user]);

  const save = async () => {
    try {
      const parsed = v.parse(ProfileFormSchema, {
        name,
        bio,
        location,
        availability,
      });
      await updateUser.mutateAsync(parsed);
      toast.toast({ title: "Profile saved", variant: "success" });
    } catch (e: any) {
      if (e instanceof v.ValiError) {
        const map: Record<string, string> = {};
        const issues = v.flatten(e.issues);
        Object.entries(issues.nested ?? {}).forEach(([k, v]) => {
          map[k] = (v as any)[0] ?? "Invalid";
        });
        setErrors(map);
        return;
      }
      toast.toast({
        title: "Could not save",
        description: e?.message ?? "Try again",
        variant: "error",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>
            This information will be visible to other users.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: SPACING[4] }}>
          <Input
            label="Display name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            error={errors.name}
            leftSlot={<UserRound size={16} color={theme.mutedForeground} />}
          />
          <Textarea
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others a bit about yourself…"
            numberOfLines={5}
            error={errors.bio}
            description={`${bio.length}/500`}
          />
          <Input
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country"
            error={errors.location}
            leftSlot={<MapPin size={16} color={theme.mutedForeground} />}
          />
          <Button onPress={save} loading={updateUser.isPending || loading}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      <AppPreferencesCard />
    </>
  );
}

function AppPreferencesCard() {
  const theme = useTheme();
  const { locale, setLocale } = useI18n();
  const localeOpts = SUPPORTED_LOCALES.map((l) => ({ label: LOCALE_LABELS[l], value: l }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>App preferences</CardTitle>
        <CardDescription>Personalize how Skil-Ex looks and feels for you.</CardDescription>
      </CardHeader>
      <CardContent style={{ gap: SPACING[4] }}>
        <SelectField
          label="Language"
          value={locale}
          onChange={(v) => setLocale(v as Locale)}
          options={localeOpts}
          leftSlot={<Globe2 size={16} color={theme.mutedForeground} />}
        />
        <View style={{ gap: SPACING[2] }}>
          <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 }}>
            Appearance
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: SPACING[2] }}>
            <AppearanceChip
              icon={<Monitor size={16} color={theme.foreground} />}
              label="System"
              active={true}
              onPress={() => {}}
            />
            <AppearanceChip
              icon={<Sun size={16} color={theme.mutedForeground} />}
              label="Light"
              active={false}
              onPress={() => {}}
            />
            <AppearanceChip
              icon={<Moon size={16} color={theme.foreground} />}
              label="Dark"
              active={true}
              onPress={() => {}}
            />
          </View>
          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 12 }}>
            Light + System toggles are disabled in this preview build; Dark theme is enabled by default.
          </ThemedText>
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
        backgroundColor: active ? getAccent('indigo').bg : theme.backgroundElement,
        alignItems: 'center',
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
  const skillsQ = useSkills();
  const catsQ = useSkillCategories();
  const addQ = useAddUserSkill();
  const removeQ = useRemoveUserSkill();
  const userQ = useCurrentUser();
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [type, setType] = React.useState<SkillType>("OFFERING");
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

  const userSkills = (user?.userSkills ?? []) as any[];

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
          type === "OFFERING" ? "Added teaching skill" : "Added learning skill",
        variant: "success",
      });
      reset();
      setDialogOpen(false);
      await userQ.refetch();
    } catch (e: any) {
      toast.toast({
        title: "Failed to add skill",
        description: e?.message ?? "Try again",
        variant: "error",
      });
    }
  };

  const remove = async (id: string) => {
    Alert.alert("Remove skill?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeQ.mutateAsync(id);
          toast.toast({ title: "Skill removed", variant: "success" });
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
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                What you teach and what you want to learn.
              </CardDescription>
            </View>
            <Button
              size="sm"
              leftIcon={<Plus size={14} color="#fff" />}
              onPress={() => setDialogOpen(true)}
            >
              Add
            </Button>
          </View>
        </CardHeader>
        <CardContent style={{ gap: SPACING[5] }}>
          <SkillGroup
            title="I can teach"
            accent="emerald"
            icon={<GraduationCap size={16} color={getAccent("emerald").main} />}
            list={offering}
            onRemove={remove}
            empty="Add the skills you're ready to share."
          />
          <Separator />
          <SkillGroup
            title="I want to learn"
            accent="blue"
            icon={<BookOpen size={16} color={getAccent("blue").main} />}
            list={seeking}
            onRemove={remove}
            empty="Add skills you'd love to pick up from someone."
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => !addQ.isPending && setDialogOpen(o)}
      >
        <DialogHeader onClose={() => setDialogOpen(false)}>
          <DialogTitle>Add a skill</DialogTitle>
          <DialogDescription>
            Choose an existing skill or create a custom one.
          </DialogDescription>
        </DialogHeader>
        <DialogContent style={{ gap: SPACING[4] }}>
          <View style={{ gap: SPACING[2] }}>
            <Label>Skill type</Label>
            <Tabs<"OFFERING" | "SEEKING">
              value={type}
              onChange={setType}
              items={[
                {
                  value: "OFFERING",
                  label: "I teach",
                  icon: (
                    <GraduationCap
                      size={14}
                      color={
                        type === "OFFERING" ? "#fff" : theme.mutedForeground
                      }
                    />
                  ),
                },
                {
                  value: "SEEKING",
                  label: "I learn",
                  icon: (
                    <BookOpen
                      size={14}
                      color={
                        type === "SEEKING" ? "#fff" : theme.mutedForeground
                      }
                    />
                  ),
                },
              ]}
            />
          </View>
          <SelectField
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Pick a category"
            options={[
              { label: "All categories", value: "" as any },
              ...categories.map((c: any) => ({ label: c.name, value: c.id })),
            ]}
          />
          {filtered.length > 0 ? (
            <SelectField
              label="Skill"
              value={skillId}
              onChange={setSkillId}
              placeholder="Search skills…"
              options={[
                { label: "Custom skill", value: "__custom__" },
                ...filtered.map((s: any) => ({ label: s.name, value: s.id })),
              ]}
            />
          ) : null}
          {skillId === "__custom__" ? (
            <Input
              label="Custom skill name"
              value={customSkill}
              onChangeText={setCustomSkill}
              placeholder="e.g., Watercolor painting"
            />
          ) : null}
          <SelectField
            label="Level"
            value={level}
            onChange={setLevel}
            options={[
              { label: "Beginner", value: "BEGINNER" },
              { label: "Intermediate", value: "INTERMEDIATE" },
              { label: "Advanced", value: "ADVANCED" },
              { label: "Expert", value: "EXPERT" },
            ]}
          />
          <Textarea
            label="Experience (optional)"
            value={experience}
            onChangeText={setExperience}
            placeholder="How long / where you've taught or learned…"
            numberOfLines={3}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => setDialogOpen(false)}
            disabled={addQ.isPending}
          >
            Cancel
          </Button>
          <Button
            onPress={submit}
            loading={addQ.isPending}
            disabled={
              !((skillId && skillId !== "__custom__") || customSkill.trim())
            }
          >
            Add skill
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
                  {s.skill?.name ?? s.skillName ?? "Skill"}
                  {s.level ? (
                    <ThemedText type="small" as any>
                      {" "}
                      <ThemedText
                        type="small"
                        style={{
                          color: theme.mutedForeground,
                          fontSize: FONT_SIZE.sm,
                        }}
                      >
                        · {s.level.toLowerCase()}
                      </ThemedText>
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
          <CardTitle>Reviews</CardTitle>
          <CardDescription>What other users say about you.</CardDescription>
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
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
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
              No reviews yet
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: theme.mutedForeground,
                textAlign: "center",
                fontSize: FONT_SIZE.sm,
              }}
            >
              Complete your first exchange and you'll start seeing reviews
              appear here.
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
              {review.reviewer?.name ?? "User"}
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
              Exchange: {review.exchange.taughtSkillName} ↔{" "}
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
  const refQ = useReferralTracking();
  const toast = useToast();
  const theme = useTheme();
  const loading = refQ.isLoading;
  const tracking = refQ.data as any;
  const referrals = tracking?.referrals ?? [];
  const code = tracking?.code ?? "SKIL-XXXXXX";
  const shareLink = `${process.env.EXPO_PUBLIC_WEB_URL ?? "https://skil.ex"}/r/${code}`;

  const copy = async () => {
    const { Clipboard } = await import("react-native");
    await Clipboard.setString(shareLink);
    toast.toast({ title: "Link copied", variant: "success" });
  };
  const share = async () => {
    try {
      await Share.share({
        message: `Join Skil-Ex with my referral link and earn points! ${shareLink}`,
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
              <CardTitle>Invite friends</CardTitle>
              <CardDescription>
                Earn 200 pts per referral. Your code:
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
                fontSize: FONT_SIZE.lg,
                fontWeight: "800",
                color: theme.primary,
                letterSpacing: 0.5,
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
                Copy
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
              Share link
            </Button>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING[2] }}>
            <MiniStat
              icon={<Users size={16} color={getAccent("indigo").main} />}
              label="Referrals"
              value={tracking?.totalReferrals ?? 0}
              accent="indigo"
            />
            <MiniStat
              icon={<TrendingUp size={16} color={getAccent("emerald").main} />}
              label="Active"
              value={tracking?.activeReferrals ?? 0}
              accent="emerald"
            />
            <MiniStat
              icon={<HandCoins size={16} color={getAccent("amber").main} />}
              label="Points earned"
              value={tracking?.pointsEarned ?? 0}
              accent="amber"
            />
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent referrals</CardTitle>
          <CardDescription>
            Everyone who signed up using your code.
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
                No referrals yet
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: theme.mutedForeground,
                  textAlign: "center",
                  fontSize: FONT_SIZE.sm,
                }}
              >
                Share your link — you'll earn points when friends join and
                complete their first exchange.
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
                    {r.user?.name ?? "Friend"}
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
                      +200 pts
                    </Badge>
                  </View>
                ) : (
                  <Badge variant="outline">Pending</Badge>
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
  const prefsQ = useNotificationPreferences();
  const updateQ = useUpdateNotificationPreferences();
  const loading = prefsQ.isLoading || updateQ.isPending;
  const prefs = prefsQ.data as any;

  const set = async (patch: any) => {
    await updateQ.mutateAsync({ ...(prefs ?? {}), ...patch });
    await prefsQ.refetch();
  };

  const sections = [
    {
      title: "Exchange notifications",
      description: "New requests, accepted matches, session reminders.",
      types: EXCHANGE_NOTIFICATION_TYPES,
    },
    {
      title: "Points & wallet",
      description: "Purchases, withdrawals, and earned points.",
      types: POINTS_NOTIFICATION_TYPES,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Choose what reaches you.</CardDescription>
      </CardHeader>
      <CardContent style={{ gap: SPACING[4] }}>
        {loading && !prefs ? <SkeletonText lines={6} /> : null}
        <Switch
          label="Receive notifications"
          description="Master toggle. Turn off to mute everything."
          value={prefs?.enabled ?? true}
          onValueChange={(v) => set({ enabled: v })}
          disabled={updateQ.isPending}
        />
        <Separator />
        {sections.map((sec) => (
          <View key={sec.title} style={{ gap: SPACING[3] }}>
            <View>
              <ThemedText type="smallBold" style={{ fontSize: FONT_SIZE.md }}>
                {sec.title}
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color: theme.mutedForeground,
                  fontSize: FONT_SIZE.sm,
                  marginTop: 2,
                }}
              >
                {sec.description}
              </ThemedText>
            </View>
            <View style={{ gap: SPACING[3] }}>
              <Switch
                label="In-app"
                description="Show a toast inside the app."
                value={prefs?.channels?.inApp !== false}
                onValueChange={(v) => {
                  const base = prefs?.channels ?? {};
                  set({ channels: { ...base, inApp: v } });
                }}
                disabled={!prefs?.enabled}
              />
              <Switch
                label="Push notifications"
                description="Send to your device lock screen."
                value={prefs?.channels?.push ?? false}
                onValueChange={(v) => {
                  const base = prefs?.channels ?? {};
                  set({ channels: { ...base, push: v } });
                }}
                disabled={!prefs?.enabled}
              />
              <Switch
                label="Email digests"
                description="Daily or weekly email updates."
                value={prefs?.channels?.email ?? false}
                onValueChange={(v) => {
                  const base = prefs?.channels ?? {};
                  set({ channels: { ...base, email: v } });
                }}
                disabled={!prefs?.enabled}
              />
            </View>
          </View>
        ))}
      </CardContent>
    </Card>
  );
}
