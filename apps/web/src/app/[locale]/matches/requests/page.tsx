import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { RequestsContent } from "@/components/matches/requests-content";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await getSession();
  const t = await getTranslations("requests");
  const tm = await getTranslations("matches");

  if (!session) {
    redirect("/sign-in");
  }

  const reqHeaders = await headers();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/requests`,
    { headers: reqHeaders },
  );

  const requests = res.ok
    ? await res.json()
    : { sent: [], received: [] };

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button variant="outline" asChild className="gap-2 border-zinc-800 hover:bg-zinc-900">
          <Link href="/matches">
            <ArrowLeft className="h-4 w-4" />
            {tm("backToMatches")}
          </Link>
        </Button>
      </div>

      <RequestsContent
        received={requests.received}
        sent={requests.sent}
        currentUserId={session.user.id}
      />
    </div>
  );
}
