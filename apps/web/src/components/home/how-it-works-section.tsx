"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { UserCircle, Search, Handshake, Video, Star } from "lucide-react";

const steps = [
  { key: "1", icon: UserCircle },
  { key: "2", icon: Search },
  { key: "3", icon: Handshake },
  { key: "4", icon: Video },
  { key: "5", icon: Star },
];

export function HowItWorksSection() {
  const t = useTranslations("home");

  return (
    <section
      id="how-it-works"
      className="relative py-24 overflow-hidden scroll-mt-16"
    >
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
            {t("howItWorksTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("howItWorksSubtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line - visible on both mobile (at left-8) and desktop (at center) */}
          <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gradient-to-b from-violet-500/60 via-indigo-500/40 to-cyan-500/60 md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`relative flex items-start pl-20 md:pl-0 ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Step content */}
                  <div
                    className={`w-full md:w-1/2 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16"}`}
                  >
                    <div className={`${isEven ? "md:ml-auto" : ""} max-w-sm`}>
                      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-violet-400 mb-1 md:hidden">
                        Step {i + 1}
                      </span>
                      <h3 className="text-xl font-bold text-white">
                        {t(`step${step.key}Title`)}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                        {t(`step${step.key}Desc`)}
                      </p>
                    </div>
                  </div>

                  {/* Step indicator */}
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-0 flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-950 backdrop-blur-sm shadow-lg shadow-violet-500/10 transition-transform duration-300 hover:scale-105">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                        <Icon className="h-5 w-5 text-violet-400" />
                      </div>
                    </div>
                    {/* Step number badge */}
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-bold text-white shadow-sm">
                      {i + 1}
                    </span>
                  </div>

                  {/* Spacer for the other side (desktop) */}
                  <div className="hidden md:block md:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
