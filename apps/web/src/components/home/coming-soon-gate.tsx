"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function ComingSoonGate() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center max-w-md"
      >
        {/* Glowing lock icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl scale-150" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 backdrop-blur-sm">
            <Lock className="h-8 w-8 text-violet-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("comingSoonTitle")}
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed">
          {t("comingSoonDesc")}
        </p>

        <Button
          asChild
          className="mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25 px-8 h-11"
        >
          <Link href="/dashboard">{t("comingSoonCta")}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
