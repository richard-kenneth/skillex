"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Code, Users, Video } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex w-full flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden py-24 text-center">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 -z-10 h-full w-full bg-white dark:bg-black">
          <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-primary/20 opacity-50 blur-[80px]" />
          <div className="absolute bottom-0 left-0 right-auto top-auto h-[500px] w-[500px] -translate-y-[20%] translate-x-[30%] rounded-full bg-secondary/20 opacity-50 blur-[80px]" />
        </div>

        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              {t("subtitle")}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("heroTitle")} <span className="text-primary">{t("heroTitleHighlight")}</span>.
            </h1>
            <p className="mx-auto max-w-[700px] text-zinc-500 dark:text-zinc-400 md:text-xl">
              {t("heroDescription")}
            </p>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 mt-8">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/sign-in">
                  {t("getStarted")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                <Link href="/exchanges">{t("learnMore")}</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Feature Highlights Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="container mt-24 px-4 md:px-6 z-10"
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-2 rounded-xl border border-border/50 bg-background/50 p-6 backdrop-blur-md transition-colors hover:bg-muted/50">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{t("feature1Title")}</h3>
              <p className="text-center text-sm text-muted-foreground">
                {t("feature1Desc")}
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-xl border border-border/50 bg-background/50 p-6 backdrop-blur-md transition-colors hover:bg-muted/50">
              <div className="p-3 bg-primary/10 rounded-full">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{t("feature2Title")}</h3>
              <p className="text-center text-sm text-muted-foreground">
                {t("feature2Desc")}
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-xl border border-border/50 bg-background/50 p-6 backdrop-blur-md transition-colors hover:bg-muted/50">
              <div className="p-3 bg-primary/10 rounded-full">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{t("feature3Title")}</h3>
              <p className="text-center text-sm text-muted-foreground">
                {t("feature3Desc")}
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
