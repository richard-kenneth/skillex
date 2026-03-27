import { getSession } from "@/lib/auth-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ExchangeDetails from "./ExchangeDetails";

export const dynamic = "force-dynamic";

export default async function ExchangePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const reqHeaders = await headers();
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/exchanges/${id}`,
    { headers: reqHeaders },
  );

  if (!res.ok) {
    // If not found or not authorized
    redirect("/exchanges");
  }

  const exchange = await res.json();

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ExchangeDetails exchange={exchange} currentUser={session.user} />
    </div>
  );
}
