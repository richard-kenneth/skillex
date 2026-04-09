import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// import { NextRequest } from "next/server";

// const intlMiddleware = createMiddleware(routing);

// export default function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   // If the path is not localized and is not a static file/api
//   const isLocalized = routing.locales.some(
//     (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
//   );

//   if (!isLocalized) {
//     const isFile = pathname.includes(".");
//     const isApi = pathname.startsWith("/api");
//     const isNext = pathname.startsWith("/_next");

//     if (!isFile && !isApi && !isNext) {
//       // Rewrite to default locale internally
//       return intlMiddleware(request);
//     }
//   }

//   return intlMiddleware(request);
// }

export default createMiddleware(routing);

export const config = {
  // Match both localized and non-localized paths
  matcher: [
    // Match the root and localized paths
    "/",
    "/(en|fr|es|pt)/:path*",
    // Catch-all for other non-localized paths like /points, /dashboard, etc.
    // Excludes static files, api, _next, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
