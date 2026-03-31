import { getSession } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { User as UserIcon } from "lucide-react";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;

  // Re-fetch user from API to get the latest bio (since it's not in the base session)
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`, {
    headers: await headers(),
  });
  
  const fullUser = response.ok ? await response.json() : user;

  return (
    <div className="container py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-border/40">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      <ProfileForm user={fullUser} />
    </div>
  );
}
