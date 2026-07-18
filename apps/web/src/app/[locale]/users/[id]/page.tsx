import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { UserProfileContent } from "@/components/users/user-profile-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "userProfile" });

  const reqHeaders = new Headers(await headers());
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`,
    {
      headers: reqHeaders,
    },
  );

  const user = res.ok ? await res.json() : null;

  return {
    title: user ? `${user.name} - ${t("title")}` : t("title"),
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const reqHeaders = new Headers(await headers());

  // Fetch profile user and current user skills
  const [userRes, currentUserRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${id}`, {
      headers: reqHeaders,
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`, {
      headers: reqHeaders,
    }),
  ]);

  if (!userRes.ok) {
    redirect("/dashboard");
  }

  const user = await userRes.json();
  const currentUser = currentUserRes.ok
    ? await currentUserRes.json()
    : { skills: [] };

  return (
    <UserProfileContent
      user={user}
      currentUserSkills={currentUser.skills || []}
      currentUserId={session.user.id}
    />
  );
}
