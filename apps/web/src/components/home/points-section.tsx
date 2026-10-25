"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CreditCard, ArrowLeftRight, Lock, Wallet } from "lucide-react";

const steps = [
  { key: "Purchase", icon: CreditCard },
  { key: "Exchange", icon: ArrowLeftRight },
  { key: "Escrow", icon: Lock },
  { key: "Withdraw", icon: Wallet },
];

const highlights = [
  "pointsCommission",
  "pointsFacilitation",
  "pointsReferralReward",
] as const;

export function PointsSection() {
  const t = useTranslations("home");

  return (
    <section
      id="points"
      className="relative py-24 overflow-hidden border-y border-white/5 scroll-mt-16"
    >
      <div className="absolute inset-0 -z-10 bg-white/[0.01]">
        <div className="absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
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
            {t("pointsTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("pointsSubtitle")}
          </p>
        </motion.div>

        {/* Flow diagram */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto mb-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex flex-col items-center"
              >
                <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm w-full transition-colors hover:border-cyan-500/20">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20">
                    <Icon className="h-7 w-7 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {t(`points${step.key}`)}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 text-center">
                    {t(`points${step.key}Desc`)}
                  </p>
                </div>

                {/* Arrow connector for desktop */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 text-zinc-600 z-10 font-bold">
                    →
                  </div>
                )}
                {/* Flow connector for mobile */}
                {i < steps.length - 1 && (
                  <div className="flex lg:hidden text-zinc-600 my-1">↓</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Highlight stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {highlights.map((key) => (
            <span
              key={key}
              className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-medium text-cyan-300"
            >
              {t(key)}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
