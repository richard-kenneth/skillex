import { headers } from "next/headers";

/**
 * Server-side helper to get the session by calling the NestJS API.
 * This avoids needing BETTER_AUTH_SECRET or Prisma in the web app.
 */
export async function getSession() {
  const url = `${process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || "http://localhost:3001"}/api/auth/get-session`;
  const cookie = (await headers()).get('cookie')

  try {
    const response = await fetch(url, {
      headers: { cookie: cookie! },
      cache: 'no-store'
    });

    console.log(response);
    
    
    if (!response.ok) {
      return null;
    }
    
    const res = await response.json();
    console.log(res);
    return res;
  } catch (error) {
    console.error("Failed to fetch session from API:", error);
    return null;
  }
}
