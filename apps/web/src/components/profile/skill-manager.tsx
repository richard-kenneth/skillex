"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Search,
  Award,
  Briefcase,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { AnalyticsEvent, track } from "@/lib/analytics";

interface Skill {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface UserSkill {
  id: string;
  skillId: string;
  type: "OFFERING" | "SEEKING";
  experienceLevel?: string;
  skill: Skill;
}

interface SkillManagerProps {
  // We use current session on the backend
  _userId?: string;
}

export function SkillManager({}: SkillManagerProps) {
  const [offeringSkills, setOfferingSkills] = useState<UserSkill[]>([]);
  const [seekingSkills, setSeekingSkills] = useState<UserSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"OFFERING" | "SEEKING">(
    "OFFERING",
  );
  const t = useTranslations("profile");
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const router = useRouter();
  const { data: sessionData } = useSession();
  const sessionToken = sessionData?.session?.token;

  const fetchUserSkills = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/skills/my`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error(t("failedFetchSkills"));
      const data: UserSkill[] = await response.json();
      setOfferingSkills(data.filter((s) => s.type === "OFFERING"));
      setSeekingSkills(data.filter((s) => s.type === "SEEKING"));
    } catch (error) {
      console.error("Error fetching user skills:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserSkills();
  }, [fetchUserSkills]);

  const searchSkills = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/skills/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error(t("failedSearchSkills"));
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching skills:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback((query: string) => {
    const timeoutId = setTimeout(() => searchSkills(query), 300);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const cleanup = debouncedSearch(searchQuery);
    return cleanup;
  }, [searchQuery, debouncedSearch]);

  const addSkill = async (skillId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/skills/my`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            skillId,
            type: activeTab,
            experienceLevel: "Intermediate", // Logic uses this, but maybe I should localize the DISPLAY if needed. I'll leave as is for now as it's a backend value.
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("failedToAddSkill"));
      }

      track(AnalyticsEvent.SKILL_ADDED, {
        skill_type: activeTab.toLowerCase(),
      });
      toast.success(t("skillAdded"));
      setSearchQuery("");
      setSearchResults([]);
      fetchUserSkills();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("failedToAddSkill");
      toast.error(errorMessage);
    }
  };

  const removeSkill = async (userSkillId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/skills/my/${userSkillId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error(t("failedToRemoveSkill"));
      track(AnalyticsEvent.SKILL_REMOVED, {
        skill_type: activeTab.toLowerCase(),
      });
      toast.success(t("skillRemoved"));
      fetchUserSkills();
    } catch (error: unknown) {
      console.error("Error removing skill:", error);
      toast.error(t("failedToRemoveSkill"));
    }
  };

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-sm border shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          {t("skillsTitle")}
        </CardTitle>
        <CardDescription>{t("skillsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "skills" && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 ${
              offeringSkills.length > 0 && seekingSkills.length > 0
                ? "border-green-500/20 bg-green-500/5 text-green-500"
                : "border-amber-500/20 bg-amber-500/5 text-amber-500"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                  offeringSkills.length > 0 && seekingSkills.length > 0
                    ? "bg-green-500/10 text-green-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {offeringSkills.length > 0 && seekingSkills.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Award className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  {offeringSkills.length > 0 && seekingSkills.length > 0
                    ? t("onboardingSkillsCompleteTitle")
                    : t("onboardingSkillsTitle")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                  {offeringSkills.length > 0 && seekingSkills.length > 0
                    ? t("onboardingSkillsCompleteDesc")
                    : t("onboardingSkillsDesc")}
                </p>
              </div>
            </div>
            {offeringSkills.length > 0 && seekingSkills.length > 0 && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white font-medium shadow-md w-full sm:w-auto"
                onClick={() => {
                  router.push("/dashboard");
                }}
              >
                {t("continueToDashboard")}
              </Button>
            )}
          </div>
        )}
        <div className="flex p-1 bg-muted/50 rounded-lg w-fit">
          <Button
            variant={activeTab === "OFFERING" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("OFFERING")}
            className="rounded-md transition-all sm:px-6"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            {t("skillsIOffer")}
          </Button>
          <Button
            variant={activeTab === "SEEKING" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("SEEKING")}
            className="rounded-md transition-all sm:px-6"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            {t("skillsISeek")}
          </Button>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder={
              activeTab === "OFFERING"
                ? t("searchSkillOffer")
                : t("searchSkillSeek")
            }
            className="pl-10 bg-background/50 focus:bg-background h-11 transition-all border-border/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/50 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid gap-1">
                {searchResults.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => addSkill(skill.id)}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/80 rounded-lg text-sm text-left transition-colors group/item"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{skill.name}</span>
                      {skill.category && (
                        <span className="text-xs text-muted-foreground">
                          {skill.category.name}
                        </span>
                      )}
                    </div>
                    <Plus className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/50 z-50 text-center text-sm">
              {t("noSkillsFound", { query: searchQuery })}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
              {activeTab === "OFFERING" ? (
                <>
                  <Briefcase className="h-4 w-4" />
                  {t("currentlyOffering")}
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  {t("currentlySeeking")}
                </>
              )}
            </h4>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {(activeTab === "OFFERING" ? offeringSkills : seekingSkills)
                .length > 0 ? (
                (activeTab === "OFFERING" ? offeringSkills : seekingSkills).map(
                  (userSkill) => (
                    <Badge
                      key={userSkill.id}
                      variant="secondary"
                      className="px-3 py-1.5 flex items-center gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all pr-1 group/badge"
                    >
                      {userSkill.skill.name}
                      <button
                        onClick={() => removeSkill(userSkill.id)}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ),
                )
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/30 w-full p-4 rounded-lg border border-dashed border-border/50 text-center">
                  {activeTab === "OFFERING"
                    ? t("noOfferingSkills")
                    : t("noSeekingSkills")}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
