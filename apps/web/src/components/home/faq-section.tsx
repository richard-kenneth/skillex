"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { track, AnalyticsEvent } from "@/lib/analytics";

const faqKeys = ["1", "2", "3", "4", "5", "6", "7"] as const;

export function FAQSection() {
  const t = useTranslations("home");
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => {
    const willOpen = open !== key;
    setOpen(willOpen ? key : null);
    if (willOpen) {
      track(AnalyticsEvent.FAQ_EXPANDED, { question_key: key });
    }
  };

  return (
    <section id="faq" className="relative py-24 overflow-hidden scroll-mt-16">
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
            {t("faqTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("faqSubtitle")}
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="max-w-2xl mx-auto space-y-3">
          {faqKeys.map((key, i) => {
            const isOpen = open === key;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
                >
                  <span className="text-sm font-medium text-white pr-4">
                    {t(`faq${key}Q`)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-4 text-sm text-zinc-400 leading-relaxed">
                        {t(`faq${key}A`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
