import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_CLIENT_BASE_URL ||
    "https://skil-ex2-web.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/dashboard",
        "/*/dashboard/*",
        "/*/exchanges",
        "/*/exchanges/*",
        "/*/points",
        "/*/room",
        "/*/room/*",
        "/*/requests",
        "/*/requests/*",
        "/api/",
        "/api/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
