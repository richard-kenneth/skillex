"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Code } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { track, AnalyticsEvent } from "@/lib/analytics";

export function CTAFooterSection() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  return (
    <section className="relative overflow-hidden">
      {/* CTA Block */}
      <div className="relative py-24">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[150px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl max-w-2xl">
              <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                {t("ctaTitle")}
              </span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-lg">
              {t("ctaSubtitle")}
            </p>

            {/* Waitlist form */}
            <div className="mt-8 w-full max-w-md">
              <WaitlistForm source="landing_footer" variant="footer" />
            </div>

            {/* Secondary CTA */}
            <Link
              href="/sign-up"
              onClick={() =>
                track(AnalyticsEvent.PROFILE_SETUP_CLICKED, {
                  source: "footer",
                })
              }
              className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t("ctaOrSetup")}
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            {/* Logo & tagline */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <Link href="/" className="flex items-center space-x-2">
                <Code className="h-5 w-5 text-violet-400" />
                <span className="font-bold text-lg tracking-tight text-white">
                  {tCommon("appName")}
                </span>
              </Link>
              <p className="text-xs text-zinc-500 max-w-xs text-center md:text-left">
                {t("footerTagline")}
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <span className="hover:text-zinc-300 transition-colors cursor-pointer">
                {t("footerPrivacy")}
              </span>
              <span className="hover:text-zinc-300 transition-colors cursor-pointer">
                {t("footerTerms")}
              </span>
              <LocaleSwitcher />
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600">
              {t("footerRights", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
