"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { RequestDialog } from "./request-dialog";

interface UserSkill {
  id: string;
  type: "OFFERING" | "SEEKING";
  skill: { id: string; name: string };
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

  const offering = user.skills.filter((s) => s.type === "OFFERING");
  const seeking = user.skills.filter((s) => s.type === "SEEKING");

  const mySeekingIds = new Set(
    currentUserSkills.filter((s) => s.type === "SEEKING").map((s) => s.skill.id),
  );
  const myOfferingIds = new Set(
    currentUserSkills.filter((s) => s.type === "OFFERING").map((s) => s.skill.id),
  );

  return (
    <>
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
        {isPerfect && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-linear-to-r from-amber-500/90 to-orange-500/90 text-white border-0 text-xs font-semibold gap-1">
              <Sparkles className="h-3 w-3" />
              Perfect Match
            </Badge>
          </div>
        )}

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-border/50 group-hover:border-primary/30 transition-colors">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? "User"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {user.name ?? "Anonymous"}
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
                Can Teach
              </p>
              <div className="flex flex-wrap gap-1.5">
                {offering.map((s) => (
                  <Badge
                    key={s.id}
                    variant={mySeekingIds.has(s.skill.id) ? "default" : "secondary"}
                    className={
                      mySeekingIds.has(s.skill.id)
                        ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                        : "text-xs"
                    }
                  >
                    {s.skill.name}
                    {mySeekingIds.has(s.skill.id) && " ✓"}
                  </Badge>
                ))}
              </div>
            </div>

            {seeking.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Wants to Learn
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
            Request Exchange
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
