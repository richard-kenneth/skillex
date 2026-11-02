import { getSession } from "@/lib/auth-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquareQuote } from "lucide-react";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review" });
  return {
    title: t("title"),
    robots: "noindex, nofollow",
  };
}

interface Review {
  id: string;
  rating: number;
  tags: string[];
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  exchange: {
    id: string;
    taughtSkill: { name: string };
    receivedSkill?: { name: string } | null;
  };
}

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const tr = await getTranslations({ locale, namespace: "review" });

  const reqHeaders = new Headers(await headers());
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reviews/user/me`,
    {
      headers: reqHeaders,
    },
  );

  const reviews: Review[] = res.ok ? await res.json() : [];

  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(
          1,
        )
      : "0.0";

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
            {tr("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            See all reviews and feedback left by your skill exchange partners.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card/50 border border-border/50 px-4 py-2 rounded-xl">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-foreground flex items-center gap-1 justify-center">
              <span>{avgRating}</span>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Average Rating
            </p>
          </div>
          <div className="h-8 w-[1px] bg-border/60" />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-foreground">
              {reviewsCount}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Total Reviews
            </p>
          </div>
        </div>
      </div>

      {reviewsCount === 0 ? (
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm p-12 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <MessageSquareQuote className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No reviews yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Complete skill exchanges with other users to build your reputation
              and earn your first review!
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev) => (
            <Card
              key={rev.id}
              className="border-border/50 bg-card/40 backdrop-blur-sm hover:border-border transition-colors flex flex-col justify-between"
            >
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={rev.reviewer.image || ""} />
                    <AvatarFallback className="font-bold">
                      {rev.reviewer.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {rev.reviewer.name || "Anonymous User"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        rev.rating >= star
                          ? "fill-amber-400"
                          : "text-zinc-700 fill-none"
                      }`}
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/20">
                  <span className="font-medium text-foreground">
                    Exchange:{" "}
                  </span>
                  {rev.exchange.taughtSkill?.name}
                  {rev.exchange.receivedSkill &&
                    ` ↔ ${rev.exchange.receivedSkill.name}`}
                </div>

                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rev.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                      >
                        {tag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
