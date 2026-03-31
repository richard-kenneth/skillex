"use client";

import { MatchCard } from "@/components/matches/match-card";
import { Search, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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

interface MatchesContentProps {
  perfectMatches: MatchUser[];
  partialMatches: MatchUser[];
  currentUserSkills: UserSkill[];
  currentUserId: string;
}

export function MatchesContent({
  perfectMatches,
  partialMatches,
  currentUserSkills,
  currentUserId,
}: MatchesContentProps) {
  const [search, setSearch] = useState("");
  const t = useTranslations("matches");

  const filterUsers = (users: MatchUser[]) => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.skills.some((s) => s.skill.name.toLowerCase().includes(q)),
    );
  };

  const filteredPerfect = useMemo(
    () => filterUsers(perfectMatches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, perfectMatches],
  );
  const filteredPartial = useMemo(
    () => filterUsers(partialMatches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, partialMatches],
  );

  const noSkills =
    currentUserSkills.filter((s) => s.type === "SEEKING").length === 0;

  if (noSkills) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10 backdrop-blur-sm">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Search className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {t("addSkillsTitle")}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-8 px-4">
          {t("addSkillsDesc")}
        </p>
      </div>
    );
  }

  const totalResults = filteredPerfect.length + filteredPartial.length;

  return (
    <div className="space-y-8">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
        />
      </div>

      {totalResults === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10 backdrop-blur-sm">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            <Users className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t("noMatchesTitle")}</h3>
          <p className="text-muted-foreground max-w-sm mx-auto px-4">
            {t("noMatchesDesc")}
          </p>
        </div>
      ) : (
        <>
          {filteredPerfect.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold tracking-tight">
                  {t("perfectMatchesTitle")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({filteredPerfect.length})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("perfectMatchesDesc")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPerfect.map((user) => (
                  <MatchCard
                    key={user.id}
                    user={user}
                    isPerfect
                    currentUserSkills={currentUserSkills}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredPartial.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">
                  {t("moreMatchesTitle")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({filteredPartial.length})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("moreMatchesDesc")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPartial.map((user) => (
                  <MatchCard
                    key={user.id}
                    user={user}
                    isPerfect={false}
                    currentUserSkills={currentUserSkills}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
