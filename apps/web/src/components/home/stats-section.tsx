"use client";

import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PLATFORM_STATS } from "@skil-ex2/shared";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [display, setDisplay] = useState(0);

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, motionValue, target]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      setDisplay(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}{suffix}
    </span>
  );
}

const stats = [
  { key: "statsCategories", value: PLATFORM_STATS.categoryCount, suffix: "" },
  { key: "statsSkills", value: PLATFORM_STATS.skillDisplayCount, suffix: "+" },
  { key: "statsLanguages", value: PLATFORM_STATS.languageCount, suffix: "" },
  { key: "statsVideo", value: 0, suffix: "" },
];

export function StatsSection() {
  const t = useTranslations("home");

  return (
    <section className="relative py-16 border-y border-white/5">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-3xl font-bold md:text-4xl bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                {stat.value > 0 ? (
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                ) : (
                  "∞"
                )}
              </span>
              <span className="mt-2 text-sm text-zinc-400 font-medium">
                {t(stat.key)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
