# SkillEx Web App

The Next.js App Router frontend for SkillEx. It provides the marketplace, exchange and session flows, points, reviews, referrals, and notifications.

## Local development

Use the root one-command setup:

```bash
# from the repository root
pnpm install
pnpm run setup
pnpm dev
```

Open <http://localhost:3000>. The seeded demo login is:

```text
Email:    demo@skillex.dev
Password: Password123!
```

See the [root README](../../README.md) for local service URLs, optional integrations, and troubleshooting.

To run only the web app after the API and services are up:

```bash
pnpm --filter web dev
```

## Environment

`pnpm run setup` creates `apps/web/.env.local`. The annotated template is [`.env.example`](./.env.example).

The public API and site URLs are required for a production build:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_CLIENT_BASE_URL=http://localhost:3000
```

Optional values:

- `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` — Flutterwave test/live public key; without it the points page uses the API's local mock in development.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — web push.
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST` — product analytics.
- `NEXT_PUBLIC_PRELAUNCH_MODE` — set to `true` to gate marketplace pages behind a coming-soon screen.

Do not put server secrets in `NEXT_PUBLIC_*` variables; they are bundled into the browser.

## Scripts

- `pnpm --filter web dev` — start Next.js in development mode
- `pnpm --filter web build` — create a production build
- `pnpm --filter web start` — start the production server
- `pnpm --filter web lint` — run ESLint
- `pnpm --filter web typecheck` — run TypeScript
- `pnpm --filter web format:check` — check Prettier formatting

## Auth and UI

- Better Auth handles email/password, email OTP, and optional Google/LinkedIn sign-in.
- LiveKit components power the session room; video is disabled cleanly when the API has no LiveKit configuration.
- The UI uses Tailwind CSS 4, shadcn-style components, next-intl, TanStack Query, and Sonner.
