import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth-server";
import { ArrowRight, ArrowRightLeft, Clock, Coins, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calculatePointsBreakdown } from "@skil-ex2/shared";
import { ComingSoonGate } from "@/components/home/coming-soon-gate";

const isPrelaunch = process.env.NEXT_PUBLIC_PRELAUNCH_MODE === "true";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("exchangesTitle"),
    robots: "noindex, nofollow",
  };
}

interface ExchangeUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Skill {
  id: string;
  name: string;
}

interface Exchange {
  id: string;
  senderId: string;
  receiverId: string;
  pointsAmount: number;
  pointsPayerId: string | null;
  escrowLocked: boolean;
  requestedSkillSessions: number;
  requestedSkillDuration: number;
  offeredSkillSessions: number;
  offeredSkillDuration: number;
  completedSessions: number;
  status: string;
  committedAt: string;
  completedAt: string | null;
  sender: ExchangeUser;
  receiver: ExchangeUser;
  taughtSkill: Skill;
  receivedSkill: Skill | null;
}

const statusColors: Record<string, string> = {
  COMMITTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default async function ExchangesPage() {
  if (isPrelaunch) return <ComingSoonGate />;

  const t = await getTranslations("exchanges");
  const tc = await getTranslations("common");
  const td = await getTranslations("dashboard");
  const locale = await getLocale();
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const reqHeaders = new Headers(await headers());
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/exchanges`, {
    headers: reqHeaders,
  });

  const exchanges: Exchange[] = res.ok ? await res.json() : [];

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          asChild
          className="gap-2 border-zinc-800 hover:bg-zinc-900"
        >
          <Link href="/matches">
            <Users className="h-4 w-4" />
            {td("findMatches")}
          </Link>
        </Button>
      </div>

      {exchanges.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10 backdrop-blur-sm">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {t("noExchangesTitle")}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto px-4">
            {t("noExchangesDesc")}
          </p>
          <Button variant="outline" size="sm" asChild className="mt-6">
            <Link href="/matches">{td("findMatches")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {exchanges.map((exchange) => {
            const isSender = exchange.senderId === session.user.id;
            const otherUser = isSender ? exchange.receiver : exchange.sender;

            // For taughtSkill, receiver is teacher, sender is learner
            // For receivedSkill, sender is teacher, receiver is learner
            const totalSessions =
              exchange.requestedSkillSessions +
              (exchange.receivedSkill ? exchange.offeredSkillSessions : 0);

            const progress =
              totalSessions > 0
                ? Math.round((exchange.completedSessions / totalSessions) * 100)
                : 0;

            return (
              <Card
                key={exchange.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {exchange.taughtSkill.name}
                          {exchange.receivedSkill &&
                            ` ↔ ${exchange.receivedSkill.name}`}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isSender ? t("learningFrom") : t("teaching")}{" "}
                          {otherUser.name ?? tc("unknownUser")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[exchange.status] || ""}
                    >
                      {t(exchange.status.toLowerCase())}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Sessions */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {exchange.completedSessions}/{totalSessions}{" "}
                        {tc("sessions")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {exchange.requestedSkillDuration}m
                        {exchange.receivedSkill
                          ? ` / ${exchange.offeredSkillDuration}m`
                          : ""}
                      </span>
                    </div>

                    {/* Points */}
                    {exchange.pointsAmount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span className="text-amber-400 font-medium">
                          {exchange.pointsPayerId === session.user.id 
                            ? calculatePointsBreakdown(exchange.pointsAmount).gross
                            : calculatePointsBreakdown(exchange.pointsAmount).net}{" "}
                          {tc("points")}
                        </span>
                        {exchange.escrowLocked && (
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                            {t("escrowed")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Return skill */}
                    {exchange.receivedSkill && (
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          ↔ {exchange.receivedSkill.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t("progress")}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-muted-foreground/60">
                      {new Intl.DateTimeFormat(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(exchange.committedAt))}
                    </p>
                    <Button size="sm" asChild className="gap-2">
                      <Link href={`/exchanges/${exchange.id}`}>
                        {t("viewDetails")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
