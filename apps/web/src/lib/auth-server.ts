import { headers } from "next/headers";

/**
 * Server-side helper to get the session by calling the NestJS API.
 * This avoids needing BETTER_AUTH_SECRET or Prisma in the web app.
 */
export async function getSession() {
  // client side url will proxy via next to the actual api, and this setup
  // will have the benefit of ensuring cookies are present
  const url = `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL || "http://localhost:3000"}/api/auth/get-session`;

  try {
    const response = await fetch(url, {
      headers: new Headers(await headers())
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch session from API:", error);
    return null;
  }
}
