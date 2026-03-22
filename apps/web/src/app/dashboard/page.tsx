import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth-server";
import { BookOpen, Coins, Sparkles, Star, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;

  // Re-fetch user from API to get the latest bio, pointsBalance and skills
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`,
    {
      headers: await headers(),
    },
  );

  const fullUser = response.ok ? await response.json() : user;
  const userSkills = fullUser.skills || [];

  const offeringSkills = userSkills.filter(
    (s: { type: string }) => s.type === "OFFERING",
  );
  const seekingSkills = userSkills.filter(
    (s: { type: string }) => s.type === "SEEKING",
  );

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-border/40">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">
              {fullUser.name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="px-3 py-1 text-sm font-medium flex items-center gap-2 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <Coins className="h-4 w-4 text-primary" />
            <span>{fullUser.pointsBalance ?? 0} Points</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:flex border-zinc-800 hover:bg-zinc-900"
          >
            <Link href="/dashboard/profile">Edit Profile</Link>
          </Button>
          <Button asChild size="sm" className="shadow-sm">
            <Link href="/matches">Find Matches</Link>
          </Button>
        </div>
      </div>
      {/* ... grid ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Exchanges
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              +0 from last week
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Skills Shared
            </CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full">
              <BookOpen className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across 0 categories
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <div className="p-2 bg-yellow-500/10 rounded-full">
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on 0 reviews
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Impact
            </CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Community score
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Connections
            </CardTitle>
            <CardDescription>
              People you&apos;ve recently matched with for skill exchange.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Users className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  No matches yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Start finding matches today to help others grow!
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href="/matches">Explore Potential Matches</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Your Skills
              </CardTitle>
              <CardDescription>
                Manage your expertise and what you want to learn.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-xs text-zinc-400 hover:text-white"
            >
              <Link href="/dashboard/profile">Edit Profile</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Offering
              </h4>
              <div className="flex flex-wrap gap-2">
                {offeringSkills.length > 0 ? (
                  offeringSkills.map(
                    (s: { id: string; skill: { name: string } }) => (
                      <Badge
                        key={s.id}
                        variant="default"
                        className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                      >
                        {s.skill.name}
                      </Badge>
                    ),
                  )
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No skills listed for exchange
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-border/40">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Seeking
              </h4>
              <div className="flex flex-wrap gap-2">
                {seekingSkills.length > 0 ? (
                  seekingSkills.map(
                    (s: { id: string; skill: { name: string } }) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="border-border/60 text-muted-foreground font-medium"
                      >
                        {s.skill.name}
                      </Badge>
                    ),
                  )
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No skills listed to learn
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
