"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnalyticsEvent, track } from "@/lib/analytics";
import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { calculatePointsBreakdown } from "@skillex/shared";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserSkill {
  id: string;
  type: "OFFERING" | "SEEKING";
  skill: { id: string; name: string };
}

interface MatchUser {
  id: string;
  name: string | null;
  skills: UserSkill[];
}

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchUser: MatchUser;
  currentUserSkills: UserSkill[];
  currentUserId: string;
}

export function RequestDialog({
  open,
  onOpenChange,
  matchUser,
  currentUserSkills,
  currentUserId,
}: RequestDialogProps) {
  const router = useRouter();
  const t = useTranslations("requestDialog");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [payerIsMe, setPayerIsMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skills they offer that I want to learn
  const theirOffering = matchUser.skills.filter((s) => s.type === "OFFERING");
  // Skills I offer that I can give in return
  const myOffering = currentUserSkills.filter((s) => s.type === "OFFERING");

  const handleSubmit = async () => {
    if (!selectedSkillId) return;

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        receiverId: matchUser.id,
        requestedSkillId: selectedSkillId,
        offeredSkillId: selectedOfferId ?? undefined,
      };

      if (pointsAmount > 0) {
        body.pointsProposal = pointsAmount;
        body.pointsPayerId = payerIsMe ? currentUserId : matchUser.id;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/exchanges/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("failedToSend"));
      }

      track(AnalyticsEvent.EXCHANGE_REQUEST_CREATED, {
        offered_skill: selectedOfferId || undefined,
        requested_skill: selectedSkillId || undefined,
      });

      onOpenChange(false);
      setSelectedSkillId(null);
      setSelectedOfferId(null);
      setPointsAmount(0);
      setPayerIsMe(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: matchUser.name ?? tc("thisUser") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Select skill to learn */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("whatToLearn")}
            </p>
            <div className="flex flex-wrap gap-2">
              {theirOffering.map((s) => (
                <Badge
                  key={s.skill.id}
                  variant={
                    selectedSkillId === s.skill.id ? "default" : "outline"
                  }
                  className={`cursor-pointer transition-all ${
                    selectedSkillId === s.skill.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedSkillId(s.skill.id)}
                >
                  {s.skill.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Select skill to offer */}
          {myOffering.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("whatToOffer")}{" "}
                <span className="text-muted-foreground font-normal">
                  ({tc("optional")})
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {myOffering.map((s) => (
                  <Badge
                    key={s.skill.id}
                    variant={
                      selectedOfferId === s.skill.id ? "default" : "outline"
                    }
                    className={`cursor-pointer transition-all ${
                      selectedOfferId === s.skill.id
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedOfferId(
                        selectedOfferId === s.skill.id ? null : s.skill.id,
                      )
                    }
                  >
                    {s.skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Points Proposal */}
          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium">{t("pointsProposal")}</p>
              <span className="text-xs text-muted-foreground">
                ({t("forUnevenExchanges")})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={pointsAmount}
                onChange={(e) =>
                  setPointsAmount(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-24 rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0"
              />
              <span className="text-sm text-foreground/80 font-medium">
                {tc("points_count", { count: pointsAmount })}
              </span>
            </div>

            {pointsAmount > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayerIsMe(true)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    payerIsMe
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                  }`}
                >
                  {t("illPay")}
                </button>
                <button
                  type="button"
                  onClick={() => setPayerIsMe(false)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    !payerIsMe
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                  }`}
                >
                  {t("theyPay")}
                </button>
              </div>
            )}
            
            {pointsAmount > 0 && (
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="text-sm font-medium">
                  {payerIsMe ? (
                    <span className="text-red-500">{tc("youPay")}: {format.number(calculatePointsBreakdown(pointsAmount).gross)} {tc("points")}</span>
                  ) : (
                    <span className="text-emerald-500">{tc("youReceive")}: {format.number(calculatePointsBreakdown(pointsAmount).net)} {tc("points")}</span>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<Info className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-help" />} />
                    <TooltipContent side="top" align="center" className="w-72 p-4 z-[100] shadow-md border bg-popover text-popover-foreground">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">
                          {tc("pointsBreakdown")}
                        </h4>
                        <div className="text-sm space-y-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>{tc("grossAmount")}:</span>
                            <span className="text-foreground font-medium">{format.number(calculatePointsBreakdown(pointsAmount).gross)} {tc("points")}</span>
                          </div>
                          <div className="flex justify-between text-red-500/80">
                            <span>{tc("platformFee")}:</span>
                            <span>-{format.number(calculatePointsBreakdown(pointsAmount).fee)} {tc("points")}</span>
                          </div>
                          <div className="flex justify-between font-medium text-emerald-500 pt-1 border-t border-border/40">
                            <span>{tc("netGain")}:</span>
                            <span>{format.number(calculatePointsBreakdown(pointsAmount).net)} {tc("points")}</span>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSkillId || loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("sendRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
