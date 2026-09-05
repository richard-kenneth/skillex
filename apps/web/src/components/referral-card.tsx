"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  Share2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnalyticsEvent, track } from "@/lib/analytics";

interface ReferralStats {
  referralCount: number;
  convertedCount: number;
  totalEarned: number;
  monthlyEarnings: number;
  monthlyCap: number;
  rewardPerReferral: number;
  isReferred: boolean;
}

export function ReferralCard() {
  const t = useTranslations("referrals");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-apply state (for social login fallback)
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/referrals/my-code`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/referrals/stats`, {
          credentials: "include",
        }),
      ]);

      if (codeRes.ok) {
        const data = await codeRes.json();
        setReferralCode(data.referralCode);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyDirectly = useCallback(async (code: string) => {
    setApplying(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/referrals/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ referralCode: code.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setApplyMessage({ type: "success", text: data.message });
        localStorage.removeItem("skilex_ref"); // Clean up on success
        fetchData();
      } else {
        // Just show it if auto-apply fails (e.g. invalid code)
        setApplyMessage({ type: "error", text: data.message });
      }
    } catch {
      //
    } finally {
      setApplying(false);
    }
  }, [fetchData]);

  // Silent auto-apply for social login fallback
  useEffect(() => {
    const storedRef = localStorage.getItem("skilex_ref");
    if (storedRef && stats && !stats.isReferred && !applyMessage) {
      const autoApplied = sessionStorage.getItem("skilex_auto_applied");
      if (!autoApplied && !applying) {
        sessionStorage.setItem("skilex_auto_applied", "true");
        handleApplyDirectly(storedRef);
      }
    }
  }, [stats, applyMessage, applying, handleApplyDirectly]);

  const handleCopy = async () => {
    if (!referralCode) return;
    const referralLink = `${window.location.origin}?ref=${referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    track(AnalyticsEvent.REFERRAL_LINK_COPIED);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const referralLink = `${window.location.origin}?ref=${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareSubject"),
          text: t("shareLinkText", { code: referralCode }),
          url: referralLink,
        });
        track(AnalyticsEvent.REFERRAL_LINK_SHARED, { share_method: "native" });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(
        `${t("shareLinkText", { code: referralCode })}\n${referralLink}`
      );
      track(AnalyticsEvent.REFERRAL_LINK_SHARED, { share_method: "clipboard" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-emerald-400" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-5">
        {/* Referral Code Display */}
        {referralCode && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("yourCode")}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-4 py-2.5 font-mono text-lg font-bold tracking-widest text-center select-all">
                {referralCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0 h-10 w-10 border-border/50"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="shrink-0 h-10 w-10 border-border/50"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground">
                {t("shareDesc", { reward: t("points_count", { count: stats.rewardPerReferral }) })}
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
              <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.referralCount}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("totalReferred")}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
              <UserPlus className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.convertedCount}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("converted")}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
              <TrendingUp className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.totalEarned}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("totalEarned")}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
              <Gift className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.monthlyEarnings}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("monthlyEarnings")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
