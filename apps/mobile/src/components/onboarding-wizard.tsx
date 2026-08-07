import React from 'react';
import { View, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FONT_SIZE, RADIUS, SPACING, getAccent, MAX_CONTENT_WIDTH } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, useToast } from '@/components/ui';
import { useRouter } from 'expo-router';
import { useT, useI18n } from 'lib/i18n';
import { isOnboardingComplete, onboardingProgress } from '@skil-ex2/shared';
import {
  Sparkles,
  User,
  Award,
  Search,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Info,
  Gift,
  HandCoins,
  Zap,
  Users,
} from 'lucide-react-native';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userName: string;
  hasName: boolean;
  hasBio: boolean;
  hasImage: boolean;
  hasOfferingSkills: boolean;
  hasSeekingSkills: boolean;
}

type StepId = 'welcome' | 'profile' | 'skills' | 'matches' | 'done';
const STEPS: StepId[] = ['welcome', 'profile', 'skills', 'matches', 'done'];

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDE_W = Math.min(SCREEN_W - SPACING[5] * 2 - 48, 360);

export function OnboardingWizard({
  open,
  onOpenChange,
  userName,
  hasName,
  hasBio,
  hasImage,
  hasOfferingSkills,
  hasSeekingSkills,
}: OnboardingWizardProps) {
  const t = useT('onboarding');
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();

  const isProfileComplete = hasName && hasBio && hasImage;
  const activeSteps = STEPS;

  const [stepIdx, setStepIdx] = React.useState(0);
  const [direction, setDirection] = React.useState(1);

  // Auto advance if user lands on a step they already completed
  React.useEffect(() => {
    if (!open) return;
    let idx = 0;
    while (idx < STEPS.length - 1) {
      const sid = STEPS[idx];
      if (sid === 'profile' && isProfileComplete) idx++;
      else if (sid === 'skills' && hasOfferingSkills && hasSeekingSkills) idx++;
      else break;
    }
    if (idx !== stepIdx) setStepIdx(idx);
  }, [open, isProfileComplete, hasOfferingSkills, hasSeekingSkills]);

  const currentStepId = activeSteps[stepIdx];
  const pct = onboardingProgress({ hasName, hasBio, hasImage, hasOfferingSkills, hasSeekingSkills });
  const isComplete = isOnboardingComplete({ hasName, hasBio, hasImage, hasOfferingSkills, hasSeekingSkills });

  const goNext = () => {
    if (stepIdx < activeSteps.length - 1) {
      setDirection(1);
      setStepIdx((i) => i + 1);
    }
  };
  const goPrev = () => {
    if (stepIdx > 0) {
      setDirection(-1);
      setStepIdx((i) => i - 1);
    }
  };
  const handleClose = () => {
    onOpenChange(false);
    if (isComplete) {
      router.push('/(tabs)/matches' as any);
    }
  };
  const handleSkip = () => {
    onOpenChange(false);
    toast.toast({ title: t('skipTitle'), description: t('skipDesc'), variant: 'info' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%', padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: SPACING[5], gap: SPACING[4] }}>
          <DialogHeader style={{ gap: SPACING[2], paddingBottom: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <DialogTitle style={{ fontSize: FONT_SIZE.xl, fontWeight: '900' }}>
                {t('progressLabel', { current: String(stepIdx + 1), total: String(activeSteps.length) })}
              </DialogTitle>
              <Badge variant="accent" accent="indigo">
                <Zap size={10} color={getAccent('indigo').main} /> {pct}%
              </Badge>
            </View>
            <View
              style={{
                height: 6,
                width: '100%',
                backgroundColor: theme.input,
                borderRadius: RADIUS.pill,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${((stepIdx + 1) / activeSteps.length) * 100}%`,
                  backgroundColor: theme.primary,
                  borderRadius: RADIUS.pill,
                }}
              />
            </View>
          </DialogHeader>

          <View
            style={{
              minHeight: 360,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentStepId === 'welcome' ? (
              <WelcomeStep firstName={userName.split(' ')[0]} />
            ) : currentStepId === 'profile' ? (
              <ProfileStep
                hasName={hasName}
                hasBio={hasBio}
                hasImage={hasImage}
                onNavigate={() => { onOpenChange(false); router.push('/(tabs)/profile' as any); }}
              />
            ) : currentStepId === 'skills' ? (
              <SkillsStep
                onNavigate={() => { onOpenChange(false); router.push('/(tabs)/profile' as any); }}
              />
            ) : currentStepId === 'matches' ? (
              <MatchesStep />
            ) : (
              <DoneStep
                isProfileComplete={isProfileComplete}
                hasOffering={hasOfferingSkills}
                hasSeeking={hasSeekingSkills}
                onClose={handleClose}
              />
            )}
          </View>
        </View>

        <DialogFooter
          style={{
            flexDirection: 'row',
            justifyContent: stepIdx > 0 ? 'space-between' : stepIdx === activeSteps.length - 1 ? 'flex-end' : 'space-between',
            gap: SPACING[2],
            paddingHorizontal: SPACING[5],
            paddingBottom: SPACING[5],
          }}
        >
          {stepIdx > 0 ? (
            <Button variant="outline" onPress={goPrev}>
              {t('back')}
            </Button>
          ) : (
            <Button variant="ghost" onPress={handleSkip}>
              {t('skip')}
            </Button>
          )}

          {stepIdx < activeSteps.length - 1 ? (
            <Button onPress={goNext} rightIcon={<ArrowRight size={16} color="#fff" />}>
              {t('next')}
            </Button>
          ) : (
            <Button
              onPress={handleClose}
              rightIcon={<ArrowRight size={16} color="#fff" />}
            >
              {t('doneCtaLabel')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Steps ---------- */

function AccentRing({ children, accent = 'indigo' }: any) {
  return (
    <View
      style={{
        width: 80,
        height: 80,
        borderRadius: RADIUS.pill,
        backgroundColor: getAccent(accent).bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: getAccent(accent).border,
      }}
    >
      {children}
    </View>
  );
}

function WelcomeStep({ firstName }: { firstName: string }) {
  const t = useT('onboarding');
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', gap: SPACING[4], width: SLIDE_W }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AccentRing>
        <Sparkles size={34} color={getAccent('indigo').main} />
      </AccentRing>

      <View style={{ alignItems: 'center', gap: SPACING[2] }}>
        <ThemedText type="title" style={{ fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
          {t('welcomeTitle', { name: firstName })}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
          {t('welcomeDesc')}
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], justifyContent: 'center' }}>
        <Badge variant="accent" accent="indigo">
          <CheckCircle2 size={10} color={getAccent('indigo').main} /> {t('pill1')}
        </Badge>
        <Badge variant="accent" accent="emerald">
          <CheckCircle2 size={10} color={getAccent('emerald').main} /> {t('pill2')}
        </Badge>
        <Badge variant="accent" accent="amber">
          <Gift size={10} color={getAccent('amber').main} /> {t('pill3')}
        </Badge>
      </View>
    </ScrollView>
  );
}

function ProfileStep({
  hasName,
  hasBio,
  hasImage,
  onNavigate,
}: {
  hasName: boolean;
  hasBio: boolean;
  hasImage: boolean;
  onNavigate: () => void;
}) {
  const t = useT('onboarding');
  const theme = useTheme();
  const items = [
    { label: t('profileItem1'), done: hasName },
    { label: t('profileItem2'), done: hasImage },
    { label: t('profileItem3'), done: hasBio },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', gap: SPACING[4], width: SLIDE_W }}
      showsVerticalScrollIndicator={false}
    >
      <AccentRing accent="blue">
        <User size={34} color={getAccent('blue').main} />
      </AccentRing>

      <View style={{ alignItems: 'center', gap: SPACING[2] }}>
        <ThemedText type="title" style={{ fontSize: 22, fontWeight: '900' }}>
          {t('profileTitle')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
          {t('profileDesc')}
        </ThemedText>
      </View>

      <Card style={{ width: '100%', borderColor: theme.border }}>
        <CardContent style={{ padding: 0, overflow: 'hidden', borderRadius: RADIUS.md }}>
          {items.map((it, i) => (
            <View
              key={it.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING[3],
                padding: SPACING[4],
                ...(i < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : {}),
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: RADIUS.pill,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: it.done ? getAccent('green').bg : 'transparent',
                  borderWidth: 2,
                  borderColor: it.done ? getAccent('green').main : getAccent('blue').border,
                }}
              >
                {it.done ? <CheckCircle2 size={14} color={getAccent('green').main} /> : null}
              </View>
              <ThemedText
                type="small"
                style={{
                  color: it.done ? theme.mutedForeground : theme.foreground,
                  textDecorationLine: it.done ? 'line-through' : 'none',
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {it.label}
              </ThemedText>
              <Badge variant="accent" accent={it.done ? 'green' : 'blue'}>
                {it.done ? t('done') : t('toDo')}
              </Badge>
            </View>
          ))}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onPress={onNavigate}
        leftIcon={<ExternalLink size={14} color={getAccent('blue').main} />}
        style={{ borderColor: getAccent('blue').border }}
      >
        {t('profileCta')}
      </Button>
    </ScrollView>
  );
}

function SkillsStep({ onNavigate }: { onNavigate: () => void }) {
  const t = useT('onboarding');
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', gap: SPACING[4], width: SLIDE_W }}
      showsVerticalScrollIndicator={false}
    >
      <AccentRing accent="amber">
        <Award size={34} color={getAccent('amber').main} />
      </AccentRing>

      <View style={{ alignItems: 'center', gap: SPACING[2] }}>
        <ThemedText type="title" style={{ fontSize: 22, fontWeight: '900' }}>
          {t('skillsTitle')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
          {t('skillsDesc')}
        </ThemedText>
      </View>

      <View style={{ width: '100%', gap: SPACING[3] }}>
        <View
          style={{
            padding: SPACING[4],
            borderRadius: RADIUS.md,
            backgroundColor: getAccent('indigo').bg,
            borderWidth: 1,
            borderColor: getAccent('indigo').border,
            gap: SPACING[1],
          }}
        >
          <ThemedText type="smallBold" style={{ color: getAccent('indigo').main, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('skillsOffer')}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 18 }}>
            {t('skillsOfferDesc')}
          </ThemedText>
        </View>
        <View
          style={{
            padding: SPACING[4],
            borderRadius: RADIUS.md,
            backgroundColor: getAccent('purple').bg,
            borderWidth: 1,
            borderColor: getAccent('purple').border,
            gap: SPACING[1],
          }}
        >
          <ThemedText type="smallBold" style={{ color: getAccent('purple').main, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('skillsSeek')}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 18 }}>
            {t('skillsSeekDesc')}
          </ThemedText>
        </View>
      </View>

      <Button
        variant="outline"
        onPress={onNavigate}
        leftIcon={<ExternalLink size={14} color={getAccent('amber').main} />}
        style={{ borderColor: getAccent('amber').border }}
      >
        {t('skillsCta')}
      </Button>
    </ScrollView>
  );
}

function MatchesStep() {
  const t = useT('onboarding');
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', gap: SPACING[4], width: SLIDE_W }}
      showsVerticalScrollIndicator={false}
    >
      <AccentRing accent="green">
        <Search size={34} color={getAccent('green').main} />
      </AccentRing>

      <View style={{ alignItems: 'center', gap: SPACING[2] }}>
        <ThemedText type="title" style={{ fontSize: 22, fontWeight: '900' }}>
          {t('matchesTitle')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
          {t('matchesDesc')}
        </ThemedText>
      </View>

      <View style={{ width: '100%', gap: SPACING[3] }}>
        <MatchTypeCard
          color="green"
          label={t('matchType1')}
          desc={t('matchType1Desc')}
          icon={<Users size={16} color={getAccent('green').main} />}
        />
        <MatchTypeCard
          color="blue"
          label={t('matchType2')}
          desc={t('matchType2Desc')}
          icon={<HandCoins size={16} color={getAccent('blue').main} />}
        />
      </View>
    </ScrollView>
  );
}

function MatchTypeCard({ color, label, desc, icon }: any) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: SPACING[4],
        borderRadius: RADIUS.md,
        backgroundColor: getAccent(color).bg,
        borderWidth: 1,
        borderColor: getAccent(color).border,
        gap: SPACING[2],
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: getAccent(color).bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: getAccent(color).border }}>
        {icon}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="smallBold" style={{ color: getAccent(color).main, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          {desc}
        </ThemedText>
      </View>
    </View>
  );
}

function DoneStep({
  isProfileComplete,
  hasOffering,
  hasSeeking,
  onClose,
}: any) {
  const t = useT('onboarding');
  const theme = useTheme();
  const items = [
    { label: t('doneItem1'), done: isProfileComplete },
    { label: t('doneItem2'), done: hasOffering },
    { label: t('doneItem3'), done: hasSeeking },
    { label: t('doneItem4'), done: false },
  ];
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', gap: SPACING[4], width: SLIDE_W }}
      showsVerticalScrollIndicator={false}
    >
      <AccentRing accent="indigo">
        <CheckCircle2 size={38} color={getAccent('indigo').main} />
      </AccentRing>

      <View style={{ alignItems: 'center', gap: SPACING[2] }}>
        <ThemedText type="title" style={{ fontSize: 22, fontWeight: '900' }}>
          {t('doneTitle')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.mutedForeground, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
          {t('doneDesc')}
        </ThemedText>
      </View>

      <Card style={{ width: '100%' }}>
        <CardContent style={{ padding: 0, overflow: 'hidden', borderRadius: RADIUS.md }}>
          {items.map((it, i) => (
            <View
              key={it.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING[3],
                padding: SPACING[4],
                ...(i < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : {}),
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: RADIUS.pill,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: it.done ? getAccent('indigo').bg : 'transparent',
                  borderWidth: 2,
                  borderColor: it.done ? getAccent('indigo').main : theme.border,
                }}
              >
                {it.done ? <CheckCircle2 size={14} color={getAccent('indigo').main} /> : null}
              </View>
              <ThemedText
                type="small"
                style={{
                  color: it.done ? theme.mutedForeground : theme.foreground,
                  textDecorationLine: it.done ? 'line-through' : 'none',
                  fontSize: 13,
                }}
              >
                {it.label}
              </ThemedText>
            </View>
          ))}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
