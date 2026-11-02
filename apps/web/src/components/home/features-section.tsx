"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  Video,
  Coins,
  Users,
  Film,
  MessageCircle,
  Calendar,
  Star,
  Gift,
} from "lucide-react";

const features = [
  { key: "Exchange", icon: ArrowLeftRight, size: "large" },
  { key: "Video", icon: Video, size: "large" },
  { key: "Points", icon: Coins, size: "medium" },
  { key: "Matching", icon: Users, size: "medium" },
  { key: "Recording", icon: Film, size: "small" },
  { key: "Chat", icon: MessageCircle, size: "small" },
  { key: "Scheduling", icon: Calendar, size: "small" },
  { key: "Reviews", icon: Star, size: "medium" },
  { key: "Referral", icon: Gift, size: "medium" },
];

export function FeaturesSection() {
  const t = useTranslations("home");

  return (
    <section
      id="features"
      className="relative py-24 overflow-hidden scroll-mt-16"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {t("featuresTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("featuresSubtitle")}
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isLarge = feature.size === "large";
            const isMedium = feature.size === "medium";

            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-violet-500/5 ${
                  isLarge ? "sm:col-span-2" : ""
                } ${isMedium ? "" : ""}`}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
                </div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t(`feature${feature.key}Title`)}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {t(`feature${feature.key}Desc`)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
