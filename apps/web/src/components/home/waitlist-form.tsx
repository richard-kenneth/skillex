"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";
import { track, AnalyticsEvent } from "@/lib/analytics";

interface WaitlistFormProps {
  source: string;
  variant?: "default" | "footer";
}

export function WaitlistForm({
  source,
  variant = "default",
}: WaitlistFormProps) {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setStatus(data.alreadyJoined ? "already" : "success");
      track(AnalyticsEvent.WAITLIST_SIGNUP, {
        source,
        already_joined: !!data.alreadyJoined,
      });
      if (!data.alreadyJoined) setEmail("");
    } catch {
      setStatus("error");
    }

    // Reset status after 5 seconds
    setTimeout(() => setStatus("idle"), 5000);
  };

  const isFooter = variant === "footer";

  if (status === "success" || status === "already") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>
          {status === "success"
            ? t("waitlistSuccess")
            : t("waitlistAlreadyJoined")}
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 w-full"
    >
      <Input
        type="email"
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={`h-12 flex-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500 backdrop-blur-sm focus-visible:ring-violet-500/50 ${
          isFooter ? "text-sm" : "text-base"
        }`}
      />
      <Button
        type="submit"
        disabled={status === "loading"}
        className={`h-12 font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 ${
          isFooter ? "px-6 text-sm" : "px-8 text-base"
        }`}
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFooter ? (
          t("getEarlyAccess")
        ) : (
          t("joinWaitlist")
        )}
      </Button>
      {status === "error" && (
        <p className="text-xs text-red-400 sm:absolute sm:-bottom-6 sm:left-0">
          {t("waitlistError")}
        </p>
      )}
    </form>
  );
}
