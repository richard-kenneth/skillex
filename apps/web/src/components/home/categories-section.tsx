"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Code2, Palette, Megaphone, Briefcase, Languages, Heart,
} from "lucide-react";
import { SEED_CATEGORIES } from "@skil-ex2/shared";
import { track, AnalyticsEvent } from "@/lib/analytics";

const categoryIcons: Record<string, React.ElementType> = {
  Programming: Code2,
  Design: Palette,
  Marketing: Megaphone,
  Business: Briefcase,
  Languages: Languages,
  Lifestyle: Heart,
};

export function CategoriesSection() {
  const t = useTranslations("home");
  const [active, setActive] = useState(0);

  return (
    <section id="categories" className="relative py-24 overflow-hidden scroll-mt-16">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {t("categoriesTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("categoriesSubtitle")}
          </p>
        </motion.div>

        {/* Category tabs - smooth horizontal scroll on mobile, wrap on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 mb-10 overflow-x-auto no-scrollbar pb-2 px-1 justify-start sm:justify-center flex-nowrap sm:flex-wrap"
        >
          {SEED_CATEGORIES.map((cat, i) => {
            const Icon = categoryIcons[cat.key] || Code2;
            const isActive = active === i;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActive(i);
                  track(AnalyticsEvent.CATEGORY_TAB_CLICKED, { category: cat.key });
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/80 to-indigo-600/80 text-white shadow-lg shadow-violet-500/20 scale-[1.02]"
                    : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`category${cat.key}`)}
              </button>
            );
          })}
        </motion.div>

        {/* Active category skills */}
        <div className="min-h-[160px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                {SEED_CATEGORIES[active].skills.map((skill, j) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: j * 0.05 }}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-violet-500/30 hover:text-white"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>

              {/* Sponsor badge (if defined in seed) */}
              {SEED_CATEGORIES[active].sponsor && (
                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  href={SEED_CATEGORIES[active].sponsor!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  {t("sponsoredBy")} {SEED_CATEGORIES[active].sponsor!.name}
                </motion.a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
