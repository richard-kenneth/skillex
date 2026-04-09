"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { RequestDialog } from "./request-dialog";

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
  skill: { 
    id: string; 
    name: string;
    category?: Category;
  };
}

interface MatchUser {
  id: string;
  name: string | null;
  bio: string | null;
  image: string | null;
  skills: UserSkill[];
}

interface MatchCardProps {
  user: MatchUser;
  isPerfect: boolean;
  currentUserSkills: UserSkill[];
  currentUserId: string;
}

export function MatchCard({ user, isPerfect, currentUserSkills, currentUserId }: MatchCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations("matches");
  const tSponsors = useTranslations("sponsors");

  const offering = user.skills.filter((s) => s.type === "OFFERING");
  const seeking = user.skills.filter((s) => s.type === "SEEKING");

  const mySeekingIds = new Set(
    currentUserSkills.filter((s) => s.type === "SEEKING").map((s) => s.skill.id),
  );
  const myOfferingIds = new Set(
    currentUserSkills.filter((s) => s.type === "OFFERING").map((s) => s.skill.id),
  );

  const getSponsor = (skill: UserSkill["skill"]) => {
    return skill.category?.sponsorName ? skill.category : null;
  };

  const SponsorBadge = ({ category, tSponsors }: { category: Category; tSponsors: ReturnType<typeof useTranslations> }) => (
    <a 
      href={category.sponsorUrl ?? "#"} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors mt-2"
    >
      {category.sponsorLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.sponsorLogo} alt={category.sponsorName!} className="h-3.5 w-3.5 rounded-sm object-contain" />
      )}
      <span className="text-[10px] font-medium text-muted-foreground">
        {tSponsors("sponsoredBy")} <span className="text-primary font-bold">{category.sponsorName}</span>
      </span>
    </a>
  );

  return (
    <>
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
        {isPerfect && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-linear-to-r from-amber-500/90 to-orange-500/90 text-white border-0 text-xs font-semibold gap-1">
              <Sparkles className="h-3 w-3" />
              {t("perfectMatchBadge")}
            </Badge>
          </div>
        )}

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-border/50 group-hover:border-primary/30 transition-colors">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? t("anonymous")} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {user.name ?? t("anonymous")}
              </h3>
              {user.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("canTeach")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {offering.map((s) => {
                  const sponsor = getSponsor(s.skill);
                  return (
                    <div key={s.id} className="flex flex-col">
                      <Badge
                        variant={mySeekingIds.has(s.skill.id) ? "default" : "secondary"}
                        className={
                          mySeekingIds.has(s.skill.id)
                            ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs w-fit"
                            : "text-xs w-fit"
                        }
                      >
                        {s.skill.name}
                        {mySeekingIds.has(s.skill.id) && " ✓"}
                      </Badge>
                      {sponsor && <SponsorBadge category={sponsor} tSponsors={tSponsors} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {seeking.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("wantsToLearn")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {seeking.map((s) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className={
                        myOfferingIds.has(s.skill.id)
                          ? "border-blue-500/30 text-blue-400 text-xs"
                          : "border-border/60 text-muted-foreground text-xs"
                      }
                    >
                      {s.skill.name}
                      {myOfferingIds.has(s.skill.id) && " ✓"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full mt-2 gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {t("requestExchange")}
          </Button>
        </CardContent>
      </Card>

      <RequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        matchUser={user}
        currentUserSkills={currentUserSkills}
        currentUserId={currentUserId}
      />
    </>
  );
}
