import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Find Matches</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Discover experts to learn from and peers to teach
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search skills or expertise..." 
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Placeholder for no matches */}
        <div className="col-span-full py-16 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10 backdrop-blur-sm">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            <Search className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No matches found yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8 px-4">
            Try adjusting your search filters or add more skills to your profile to improve matching accuracy.
          </p>
          <Button asChild className="px-8 shadow-sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight border-b border-border/40 pb-4">Top Specialists Nearby</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <p className="text-muted-foreground italic col-span-full">Starting searching to find especialistas near you</p>
        </div>
      </div>
    </div>
  );
}
