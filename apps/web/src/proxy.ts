import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match both localized and non-localized paths
  matcher: [
    // Match the root and localized paths
    "/",
    "/(en|fr|es|pt)/:path*",
    // Catch-all for other non-localized paths like /points, /dashboard, etc.
    // Excludes static files, api, ph (PostHog proxy), _next, etc.
    "/((?!api|ph|_next|_vercel|.*\\..*).*)",
  ],
};
