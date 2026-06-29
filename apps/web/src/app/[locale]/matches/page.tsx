import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { MatchesContent } from "@/components/matches/matches-content";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("matchesTitle"),
    description: t("matchesDescription"),
  };
}

export default async function MatchesPage() {
  const t = await getTranslations("matches");
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Fetch matches and current user skills in parallel
  const reqHeaders = new Headers(await headers());
  const [matchesRes, userRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/exchanges/matches`, {
      headers: reqHeaders,
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`, {
      headers: reqHeaders,
    }),
  ]);

  const matches = matchesRes.ok
    ? await matchesRes.json()
    : { perfectMatches: [], partialMatches: [] };
  const user = userRes.ok ? await userRes.json() : { skills: [] };

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button variant="outline" asChild className="gap-2 border-zinc-800 hover:bg-zinc-900">
          <Link href="/matches/requests">
            <Inbox className="h-4 w-4" />
            {t("myRequests")}
          </Link>
        </Button>
      </div>

      <MatchesContent
        perfectMatches={matches.perfectMatches}
        partialMatches={matches.partialMatches}
        currentUserSkills={user.skills || []}
        currentUserId={session.user.id}
      />
    </div>
  );
}
