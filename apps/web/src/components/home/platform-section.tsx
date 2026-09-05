"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Globe, Smartphone, Languages } from "lucide-react";

const platforms = [
  { key: "Web", icon: Globe },
  // TODO: Add mobile platforms when launched
  // { key: "Android", icon: Smartphone },
  // { key: "iOS", icon: Smartphone },
  { key: "Languages", icon: Languages },
];

export function PlatformSection() {
  const t = useTranslations("home");

  return (
    <section className="relative py-24 overflow-hidden">
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
            {t("platformTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("platformSubtitle")}
          </p>
        </motion.div>

        {/* Platform cards */}
        {/* TODO: Change to md:grid-cols-3 or md:grid-cols-4 and max-w-4xl when mobile platforms are launched */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {platforms.map((platform, i) => {
            const Icon = platform.icon;
            return (
              <motion.div
                key={platform.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/20 hover:bg-white/[0.04]"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(`platform${platform.key}`)}
                </h3>
                <p className="text-sm text-zinc-400 text-center leading-relaxed">
                  {t(`platform${platform.key}Desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
