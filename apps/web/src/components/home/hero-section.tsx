"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { WaitlistForm } from "./waitlist-form";
import { track, AnalyticsEvent } from "@/lib/analytics";

import { SEED_CATEGORIES } from "@skil-ex2/shared";

// Representative skills sampled evenly across all seeded categories
const floatingSkills = SEED_CATEGORIES.flatMap((cat) => [cat.skills[0], cat.skills[1]]);

export function HeroSection() {
  const t = useTranslations("home");

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden py-24 text-center">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-violet-600/20 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -40, 20, 0], y: [0, 30, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 top-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 20, -30, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px]"
        />
      </div>

      {/* Floating skill badges */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
        {floatingSkills.map((skill, i) => (
          <motion.div
            key={skill}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0.6, 0],
              x: [0, Math.sin(i * 1.2) * 40, Math.cos(i * 0.8) * 60, 0],
              y: [0, Math.cos(i * 1.5) * 30, Math.sin(i * 0.9) * 50, 0],
            }}
            transition={{
              duration: 12 + i * 2,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeInOut",
            }}
            className="absolute hidden md:block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 backdrop-blur-sm"
            style={{
              left: `${10 + (i * 8) % 80}%`,
              top: `${15 + (i * 13) % 70}%`,
            }}
          >
            {skill}
          </motion.div>
        ))}
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center space-y-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            {t("subtitle")}
          </motion.div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
            {t("heroTitle")}{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
            .
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-[650px] text-lg text-zinc-400 md:text-xl leading-relaxed">
            {t("heroDescription")}
          </p>

          {/* Waitlist Form - Primary CTA */}
          <div className="w-full max-w-md mt-4">
            <WaitlistForm source="landing_hero" />
          </div>

          {/* Secondary CTA */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-zinc-400 hover:text-white"
            >
              <Link
                href="/sign-up"
                onClick={() => track(AnalyticsEvent.PROFILE_SETUP_CLICKED, { source: "hero" })}
                className="flex items-center gap-2"
              >
                {t("earlyAccessArrow")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-zinc-500">{t("scrollDown")}</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </motion.div>
      </motion.div>
    </section>
  );
}
