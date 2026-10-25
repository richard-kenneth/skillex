"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRightLeft, Sparkles, Coins, Star } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RequestDialog } from "@/components/matches/request-dialog";

interface Category {
  id: string;
  name: string;
  sponsorName: string | null;
  sponsorLogo: string | null;
  sponsorUrl: string | null;
}

interface UserSkill {
  id: string;
  type: "OFFERING" | "SEEKING";
  experienceLevel?: string | null;
  skill: {
    id: string;
    name: string;
    category?: Category;
  };
}

interface ReviewItem {
  id: string;
  rating: number;
  tags: string[];
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  exchange?: {
    taughtSkill?: { name: string };
    receivedSkill?: { name: string } | null;
  };
}

interface MatchUser {
  id: string;
  name: string | null;
  bio: string | null;
  image: string | null;
  skills: UserSkill[];
  pointsBalance?: number;
  receivedReviews?: ReviewItem[];
}

interface UserProfileContentProps {
  user: MatchUser;
  currentUserSkills: UserSkill[];
  currentUserId: string;
}

export function UserProfileContent({
  user,
  currentUserSkills,
  currentUserId,
}: UserProfileContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations("userProfile");
  const tMatches = useTranslations("matches");
  const tSponsors = useTranslations("sponsors");

  const isMe = user.id === currentUserId;

  const offering = user.skills.filter((s) => s.type === "OFFERING");
  const seeking = user.skills.filter((s) => s.type === "SEEKING");

  const mySeekingIds = new Set(
    currentUserSkills
      .filter((s) => s.type === "SEEKING")
      .map((s) => s.skill.id),
  );
  const myOfferingIds = new Set(
    currentUserSkills
      .filter((s) => s.type === "OFFERING")
      .map((s) => s.skill.id),
  );

  const getSponsor = (skill: UserSkill["skill"]) => {
    return skill.category?.sponsorName ? skill.category : null;
  };

  const SponsorBadge = ({ category }: { category: Category }) => (
    <a
      href={category.sponsorUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors mt-2"
    >
      {category.sponsorLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.sponsorLogo}
          alt={category.sponsorName!}
          className="h-4 w-4 rounded-sm object-contain"
        />
      )}
      <span className="text-[10px] font-medium text-muted-foreground">
        {tSponsors("sponsoredBy")}{" "}
        <span className="text-primary font-bold">{category.sponsorName}</span>
      </span>
    </a>
  );

  const tr = useTranslations("review");

  const reviews = user.receivedReviews || [];
  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(
          1,
        )
      : null;

  return (
    <div className="container py-8 max-w-4xl mx-auto px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back navigation */}
      <div>
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/matches">
            <ArrowLeft className="h-4 w-4" />
            {t("backToMatches")}
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-border/50 bg-card/40 backdrop-blur-sm shadow-xl">
        {/* Banner area */}
        <div className="h-32 w-full bg-gradient-to-r from-primary/10 via-purple-500/10 to-secondary/10 border-b border-border/20" />

        <CardContent className="p-8 relative">
          {/* Avatar and Profile Header Info */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-20 mb-8 border-b border-border/40 pb-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
              <Avatar
                previewable
                src={user.image ?? ""}
                className="h-28 w-28 border-4 border-background shadow-2xl transition-transform hover:scale-102"
              >
                <AvatarImage
                  src={user.image ?? ""}
                  alt={user.name ?? tMatches("anonymous")}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                  {user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {user.name ?? tMatches("anonymous")}
                </h1>
                {avgRating && (
                  <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-amber-400 font-semibold">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{avgRating}</span>
                    <span className="text-muted-foreground font-normal">
                      ({reviewsCount}{" "}
                      {reviewsCount === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}
                {user.bio && (
                  <p className="text-muted-foreground max-w-xl text-sm leading-relaxed mt-1">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            {/* CTA actions */}
            {!isMe && (
              <Button
                size="lg"
                className="gap-2 shadow-lg w-full md:w-auto"
                onClick={() => setDialogOpen(true)}
              >
                <ArrowRightLeft className="h-5 w-5" />
                {t("requestExchange")}
              </Button>
            )}
          </div>

          {/* Skills Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Offering Skills */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-500" />
                {t("canTeach")}
              </h2>
              <div className="flex flex-col gap-3">
                {offering.length > 0 ? (
                  offering.map((s) => {
                    const sponsor = getSponsor(s.skill);
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-border/40 bg-muted/20 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            {s.skill.name}
                          </span>
                          <Badge
                            variant={
                              mySeekingIds.has(s.skill.id)
                                ? "default"
                                : "secondary"
                            }
                            className={
                              mySeekingIds.has(s.skill.id)
                                ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                                : "text-xs"
                            }
                          >
                            {mySeekingIds.has(s.skill.id)
                              ? tMatches("matchScore")
                              : ""}
                            {s.experienceLevel ? ` • ${s.experienceLevel}` : ""}
                          </Badge>
                        </div>
                        {sponsor && <SponsorBadge category={sponsor} />}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("noOffering")}
                  </p>
                )}
              </div>
            </div>

            {/* Seeking Skills */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Coins className="h-5 w-5 text-blue-500" />
                {t("wantsToLearn")}
              </h2>
              <div className="flex flex-col gap-3">
                {seeking.length > 0 ? (
                  seeking.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between"
                    >
                      <span className="font-semibold text-sm">
                        {s.skill.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          myOfferingIds.has(s.skill.id)
                            ? "border-blue-500/30 text-blue-400 text-xs"
                            : "border-border/60 text-muted-foreground text-xs"
                        }
                      >
                        {myOfferingIds.has(s.skill.id)
                          ? tMatches("matchScore")
                          : ""}
                        {s.experienceLevel ? ` • ${s.experienceLevel}` : ""}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("noSeeking")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Card */}
      <Card className="border-border/50 bg-card/40 backdrop-blur-sm p-6 space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          Reviews ({reviewsCount})
        </h2>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={rev.reviewer.image || ""} />
                      <AvatarFallback className="text-xs font-bold">
                        {rev.reviewer.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">
                        {rev.reviewer.name || tMatches("anonymous")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          rev.rating >= star
                            ? "fill-amber-400"
                            : "text-zinc-700 fill-none"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rev.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5"
                      >
                        {tag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No reviews yet for this user.
          </p>
        )}
      </Card>

      {!isMe && (
        <RequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          matchUser={user}
          currentUserSkills={currentUserSkills}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
