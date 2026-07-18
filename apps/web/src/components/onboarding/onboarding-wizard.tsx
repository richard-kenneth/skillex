"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  User,
  Award,
  Search,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface OnboardingWizardProps {
  userName: string;
  hasName: boolean;
  hasBio: boolean;
  hasImage: boolean;
  hasOfferingSkills: boolean;
  hasSeekingSkills: boolean;
}

type StepId = "welcome" | "profile" | "skills" | "matches" | "done";

interface Step {
  id: StepId;
  /** If defined, this step is only shown when the condition is false */
  showWhen?: boolean;
}

// ─────────────────────────────────────────────
// Step slide animation variants
// ─────────────────────────────────────────────

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

// ─────────────────────────────────────────────
// Individual step content components
// ─────────────────────────────────────────────

function WelcomeStep({ userName, t }: { userName: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-2">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="relative flex items-center justify-center"
      >
        <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center shadow-xl ring-4 ring-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        {/* Orbit dots */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={deg}
            className="absolute h-2 w-2 rounded-full bg-primary/40"
            style={{
              top: `${50 - 46 * Math.cos((deg * Math.PI) / 180)}%`,
              left: `${50 + 46 * Math.sin((deg * Math.PI) / 180)}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.07 }}
          />
        ))}
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">
          {t("welcomeTitle", { name: userName.split(" ")[0] })}
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          {t("welcomeDesc")}
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {(["pill1", "pill2", "pill3"] as const).map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
          >
            <CheckCircle2 className="h-3 w-3" />
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfileStep({
  t,
  onNavigate,
  hasName,
  hasBio,
  hasImage,
}: {
  t: ReturnType<typeof useTranslations>;
  onNavigate: () => void;
  hasName: boolean;
  hasBio: boolean;
  hasImage: boolean;
}) {
  const items = [
    { label: t("profileItem1"), done: hasName },
    { label: t("profileItem2"), done: hasImage },
    { label: t("profileItem3"), done: hasBio },
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-2">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center ring-4 ring-blue-500/10 shadow-lg"
      >
        <User className="h-10 w-10 text-blue-500" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("profileTitle")}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          {t("profileDesc")}
        </p>
      </div>

      {/* Checklist */}
      <div className="w-full rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40 text-left overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div
              className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                item.done ? "bg-green-500/20 text-green-500 border-0" : "border-2 border-blue-400/60"
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : null}
            </div>
            <span className={`text-sm ${item.done ? "line-through text-muted-foreground/60" : "text-foreground/80"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        onClick={onNavigate}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {t("profileCta")}
      </Button>
    </div>
  );
}

function SkillsStep({ t, onNavigate }: { t: ReturnType<typeof useTranslations>; onNavigate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-2">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center ring-4 ring-amber-500/10 shadow-lg"
      >
        <Award className="h-10 w-10 text-amber-500" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("skillsTitle")}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          {t("skillsDesc")}
        </p>
      </div>

      {/* Two-column skill type cards */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("skillsOffer")}</p>
          <p className="text-xs text-muted-foreground">{t("skillsOfferDesc")}</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-left space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-500">{t("skillsSeek")}</p>
          <p className="text-xs text-muted-foreground">{t("skillsSeekDesc")}</p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
        onClick={onNavigate}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {t("skillsCta")}
      </Button>
    </div>
  );
}

function MatchesStep({ t }: { t: ReturnType<typeof useTranslations> }) {
  const items: { label: string; color: string; border: string; desc: string }[] = [
    {
      label: t("matchType1"),
      color: "text-green-600 dark:text-green-400",
      border: "border-green-500/20 bg-green-500/5",
      desc: t("matchType1Desc"),
    },
    {
      label: t("matchType2"),
      color: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500/20 bg-blue-500/5",
      desc: t("matchType2Desc"),
    },
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-2">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center ring-4 ring-green-500/10 shadow-lg"
      >
        <Search className="h-10 w-10 text-green-500" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("matchesTitle")}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          {t("matchesDesc")}
        </p>
      </div>

      <div className="w-full space-y-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border ${item.border} p-4 text-left`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoneStep({
  t,
  hasProfile,
  hasOffering,
  hasSeeking,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>;
  hasProfile: boolean;
  hasOffering: boolean;
  hasSeeking: boolean;
  onClose: () => void;
}) {
  const items = [
    { label: t("doneItem1"), done: hasProfile },
    { label: t("doneItem2"), done: hasOffering },
    { label: t("doneItem3"), done: hasSeeking },
    { label: t("doneItem4"), done: false }, // "Find your first match" — always a next step
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-2">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center ring-4 ring-primary/10 shadow-xl"
      >
        <CheckCircle2 className="h-10 w-10 text-primary" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{t("doneTitle")}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          {t("doneDesc")}
        </p>
      </div>

      {/* Progress checklist */}
      <div className="w-full rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40 text-left overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div
              className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                item.done ? "bg-primary/20 text-primary" : "border-2 border-muted-foreground/30"
              }`}
            >
              {item.done && <CheckCircle2 className="h-4 w-4" />}
            </div>
            <span className={`text-sm ${item.done ? "line-through text-muted-foreground/60" : "text-foreground/80"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <Button className="w-full gap-2 shadow-md" onClick={onClose}>
        {t("doneCtaLabel")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Progress dots
// ─────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 20 : 6,
            backgroundColor: i <= current ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Wizard
// ─────────────────────────────────────────────

export function OnboardingWizard({
  userName,
  hasName,
  hasBio,
  hasImage,
  hasOfferingSkills,
  hasSeekingSkills,
}: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  // Profile is complete only when all three are complete
  const isProfileComplete = hasName && hasBio && hasImage;

  // Build the list of steps - now constant (5 steps)
  const allSteps: Step[] = [
    { id: "welcome" },
    { id: "profile" },
    { id: "skills" },
    { id: "matches" },
    { id: "done" },
  ];

  const activeSteps = allSteps;

  const isStepComplete = (id: StepId) => {
    if (id === "welcome") return true;
    if (id === "profile") return isProfileComplete;
    if (id === "skills") return hasOfferingSkills && hasSeekingSkills;
    return false;
  };

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const isClosingProgrammatically = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // For any authenticated user, session.session.token is always present.
  // Keying on it means each new login gets a fresh sessionStorage key, so the
  // wizard reappears correctly after logout + login — without any layout-level
  // provider or complex state lifting.
  const { data: sessionData } = useSession();
  const sessionToken = sessionData?.session?.token;
  const SESSION_KEY = `onboarding-dismissed-${sessionToken ?? "pending"}`;
  const STEP_KEY = `onboarding-step-${sessionToken ?? "pending"}`;

  // Hydrate stepIndex from sessionStorage on mount/token load, handling auto-advancing logic.
  useEffect(() => {
    if (!sessionToken) return;
    const storedStepId = sessionStorage.getItem(STEP_KEY) as StepId | null;
    if (storedStepId) {
      const storedIdx = allSteps.findIndex((s) => s.id === storedStepId);
      if (storedIdx !== -1) {
        // If the stored step is complete, find the next incomplete step
        let targetIdx = storedIdx;
        while (targetIdx < allSteps.length - 1 && isStepComplete(allSteps[targetIdx].id)) {
          targetIdx++;
        }
        setStepIndex(targetIdx);
      }
    } else {
      // First time opening, start at welcome
      setStepIndex(0);
    }
  }, [sessionToken, isProfileComplete, hasOfferingSkills, hasSeekingSkills]);

  const currentStep = activeSteps[stepIndex];

  // Keep sessionStorage step value in sync with changes
  useEffect(() => {
    if (currentStep?.id && sessionToken) {
      sessionStorage.setItem(STEP_KEY, currentStep.id);
    }
  }, [currentStep?.id, sessionToken, STEP_KEY]);

  useEffect(() => {
    // Don't open until the session is hydrated and we have a real token.
    if (!sessionToken || !mounted) return;
    // Only suppress if the user explicitly dismissed or finalized the wizard
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [mounted, sessionToken, SESSION_KEY]);

  // Only permanently hide the wizard if the user has explicitly dismissed/finalized it.
  // We check mounted to avoid SSR flash issues.
  if (mounted && sessionToken && sessionStorage.getItem(SESSION_KEY)) return null;

  const goNext = () => {
    if (stepIndex < activeSteps.length - 1) {
      setDirection(1);
      setStepIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      setDirection(-1);
      setStepIndex((i) => i - 1);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  const handleClose = () => {
    isClosingProgrammatically.current = true;
    if (sessionToken) {
      sessionStorage.removeItem(STEP_KEY);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    setOpen(false);
    router.push("/matches");
  };

  const navigateTo = (path: string) => {
    // Silently close — this is intent to complete the action, NOT a dismissal.
    // The wizard will re-appear on the next dashboard load if setup is still incomplete,
    // and will pick up at the next incomplete step thanks to our auto-advance logic.
    isClosingProgrammatically.current = true;
    setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(path as any);
  };

  const isFirst = stepIndex === 0;
  const isLast = currentStep?.id === "done";
  const isWelcome = currentStep?.id === "welcome";

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        if (isClosingProgrammatically.current) {
          isClosingProgrammatically.current = false;
        } else {
          handleDismiss();
        }
      }
    }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 overflow-hidden border border-border/60 shadow-2xl bg-background"
      >
        {/* Header strip */}
        <div className="relative bg-gradient-to-br from-primary/8 via-background to-secondary/5 px-6 pt-6 pb-4 border-b border-border/40">
          <DialogHeader className="space-y-0">
            <DialogTitle className="sr-only">{t("wizardTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("wizardDesc")}</DialogDescription>
          </DialogHeader>
          <ProgressDots total={activeSteps.length} current={stepIndex} />
          {/* Dismiss link */}
          {!isLast && (
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {t("skipForNow")}
            </button>
          )}
        </div>

        {/* Step body */}
        <div className="px-6 py-5 min-h-[320px] relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentStep?.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {currentStep?.id === "welcome" && <WelcomeStep userName={userName} t={t} />}
              {currentStep?.id === "profile" && (
                <ProfileStep
                  t={t}
                  onNavigate={() => navigateTo("/dashboard/profile?step=profile")}
                  hasName={hasName}
                  hasBio={hasBio}
                  hasImage={hasImage}
                />
              )}
              {currentStep?.id === "skills" && (
                <SkillsStep t={t} onNavigate={() => navigateTo("/dashboard/profile?step=skills")} />
              )}
              {currentStep?.id === "matches" && <MatchesStep t={t} />}
              {currentStep?.id === "done" && (
                <DoneStep
                  t={t}
                  hasProfile={isProfileComplete}
                  hasOffering={hasOfferingSkills}
                  hasSeeking={hasSeekingSkills}
                  onClose={handleClose}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        {!isLast && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={isFirst}
              className="text-muted-foreground disabled:opacity-0"
            >
              {t("back")}
            </Button>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{stepIndex + 1}</span>
              <span>/</span>
              <span>{activeSteps.length}</span>
            </div>

            <Button size="sm" onClick={goNext} className="gap-1.5 shadow-sm">
              {isWelcome ? t("letsGo") : t("next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
