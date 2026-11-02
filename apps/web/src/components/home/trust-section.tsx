"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShieldCheck, Lock, Cpu } from "lucide-react";

const trustItems = [
  { key: "Secure", icon: ShieldCheck },
  { key: "Escrow", icon: Lock },
  { key: "Open", icon: Cpu },
];

const techStack = [
  "Next.js",
  "NestJS",
  "PostgreSQL",
  "LiveKit",
  "Prisma",
  "Tailwind CSS",
];

export function TrustSection() {
  const t = useTranslations("home");

  return (
    <section className="relative py-24 overflow-hidden border-y border-white/5">
      <div className="absolute inset-0 -z-10 bg-white/[0.01]" />

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
            {t("trustTitle")}
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {t("trustSubtitle")}
          </p>
        </motion.div>

        {/* Trust cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto mb-12">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm text-center"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                  <Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(`trust${item.key}`)}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t(`trust${item.key}Desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Tech stack pills */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {techStack.map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-400"
            >
              {tech}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
