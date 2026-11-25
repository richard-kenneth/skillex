# Environment variables

This page is the complete reference for SkillEx configuration. It covers the
API, web app, and mobile app, plus the local defaults created by
`pnpm run setup`.

> **Never commit `.env` files or real credentials.** Only the `.env.example`
> files belong in Git. Anything prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
> is embedded in the client bundle and is not secret.

## How configuration is loaded

| Component | File                  | Loaded by                               |
| --------- | --------------------- | --------------------------------------- |
| API       | `apps/api/.env`       | `dotenv` before NestJS starts           |
| Web       | `apps/web/.env.local` | Next.js                                 |
| Mobile    | `apps/mobile/.env`    | Expo at build and bundle time           |
| Compose   | `.env`                | Docker Compose; development values only |

`pnpm run setup` copies each example file and fills in local values. It is safe
to re-run and will not overwrite an existing file.

The API validates its environment once at startup. Required values fail fast;
optional integrations may be absent. A _partially_ configured group (for
example, a Google client ID without its secret) is rejected with a clear error.
Empty strings are treated as unset.

## Compose (`.env`)

The local stack publishes its host ports from the repository `.env` file, which
`pnpm run setup` creates from [`.env.example`](../.env.example). Change a value
only when the default port is already used by another program, then rerun
`pnpm run setup`; it rewrites `DATABASE_URL`, `REDIS_URL`, `SMTP_PORT`, and the
`R2_*` URLs in `apps/api/.env` to match. An intentional non-local value, such
as a remote database, is left alone.

| Variable               | Default | Service                |
| ---------------------- | ------- | ---------------------- |
| `POSTGRES_PORT`        | `5432`  | PostgreSQL             |
| `REDIS_PORT`           | `6379`  | Redis                  |
| `MAILPIT_SMTP_PORT`    | `1025`  | Mailpit SMTP           |
| `MAILPIT_UI_PORT`      | `8025`  | Mailpit web UI         |
| `SEAWEEDFS_S3_PORT`    | `9000`  | SeaweedFS S3 API       |
| `SEAWEEDFS_UI_PORT`    | `9001`  | SeaweedFS filer UI     |
| `LIVEKIT_PORT`         | `7880`  | LiveKit HTTP/WebSocket |
| `LIVEKIT_RTC_TCP_PORT` | `7881`  | LiveKit RTC over TCP   |
| `LIVEKIT_RTC_UDP_PORT` | `7882`  | LiveKit RTC over UDP   |

Core services bind to `127.0.0.1`. LiveKit stays on all interfaces because
device testing needs the LAN address. LiveKit is only started with
`docker compose --profile video up -d`.

## API (`apps/api/.env`)

### Core runtime

| Variable             | Required   | Default                  | Notes                                                                                                                        |
| -------------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | No         | `development`            | One of `development`, `test`, or `production`.                                                                               |
| `PORT`               | No         | `3001`                   | Integer from 1 to 65535.                                                                                                     |
| `DATABASE_URL`       | **Yes**    | none                     | PostgreSQL URL using `postgresql://` or `postgres://`.                                                                       |
| `BETTER_AUTH_SECRET` | **Yes**    | none                     | At least 16 characters. Placeholder values are rejected. Used to sign Better Auth sessions and tokens.                       |
| `BETTER_AUTH_URL`    | Production | none                     | Absolute `http(s)` URL of the API, for example `https://api.example.com`. Required when `NODE_ENV=production`.               |
| `CLIENT_BASE_URL`    | Production | none                     | Absolute `http(s)` URL of the web app. Used as a trusted auth origin and CORS origin. Required in production.                |
| `INTERNAL_SECRET`    | Production | none                     | At least 16 characters. Shared secret for internal server-to-server calls. Required in production and fails closed if unset. |
| `REDIS_URL`          | No         | `redis://localhost:6379` | `redis://` or `rediss://`. Used for rate-limit-independent caches, exchange rates, and BullMQ.                               |
| `API_BASE_URL`       | No         | none                     | **Legacy/compatibility.** Validated as an absolute `http(s)` URL, but current API runtime code does not read it.             |
| `JWT_SECRET`         | No         | none                     | **Legacy/compatibility.** Accepted but not read by current API runtime code. Prefer `BETTER_AUTH_SECRET`.                    |
| `DEV_EXTRA_ORIGINS`  | No         | empty                    | Comma-separated extra origins for development only. Ignored when `NODE_ENV` is not `development`.                            |

`DEV_EXTRA_ORIGINS` is useful for tunnels and physical devices, for example:

```env
DEV_EXTRA_ORIGINS="https://abc.ngrok-free.dev,http://192.168.1.20:8081"
```

### Authentication providers

| Variable                 | Required | Notes                                                                                     |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`       | Pair     | Set both Google values to enable Google sign-in.                                          |
| `GOOGLE_CLIENT_SECRET`   | Pair     | If only one is set, startup validation fails.                                             |
| `LINKEDIN_CLIENT_ID`     | Pair     | Set both LinkedIn values to enable LinkedIn sign-in.                                      |
| `LINKEDIN_CLIENT_SECRET` | Pair     | If only one is set, startup validation fails.                                             |
| `EXPO_SCHEME`            | No       | Deep-link scheme trusted for mobile auth. Use `skil-ex`, matching `apps/mobile/app.json`. |

Email/password authentication is always available. OAuth providers are
registered only when both values of the pair are present.

### Email

| Variable                | Required          | Default                           | Notes                                                             |
| ----------------------- | ----------------- | --------------------------------- | ----------------------------------------------------------------- |
| `EMAIL_TRANSPORT`       | No                | `auto`                            | `auto`, `resend`, `smtp`, or `disabled`.                          |
| `RESEND_API_KEY`        | When using Resend | empty                             | Required when `EMAIL_TRANSPORT=resend`.                           |
| `SMTP_HOST`             | When using SMTP   | `localhost` in the example file   | Required when `EMAIL_TRANSPORT=smtp`.                             |
| `SMTP_PORT`             | No                | `1025`                            | Integer from 1 to 65535.                                          |
| `SMTP_USER`             | Pair              | empty                             | Set with `SMTP_PASSWORD`, or leave both empty.                    |
| `SMTP_PASSWORD`         | Pair              | empty                             | Set with `SMTP_USER`, or leave both empty.                        |
| `SMTP_SECURE`           | No                | `false`                           | `true` for implicit TLS, normally with port 465.                  |
| `ONBOARDING_EMAIL_FROM` | No                | `SkillEx <noreply@skillex.local>` | Sender for verification, reset, waitlist, and notification email. |

`auto` selects Resend when `RESEND_API_KEY` is set, otherwise SMTP when
`SMTP_HOST` is set, otherwise Mailpit on `localhost:1025` in development. In
production with no email configuration, email becomes a no-op with a warning.
Sending never throws, so authentication flows continue during an email outage.

### Video (LiveKit, optional)

Set all three values or leave all three empty. A partial group fails startup.

| Variable                  | Required | Notes                                                                  |
| ------------------------- | -------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_LIVEKIT_URL` | Group    | WebSocket URL, `ws://` or `wss://`. Read by the API, despite the name. |
| `LIVEKIT_API_KEY`         | Group    | LiveKit API key.                                                       |
| `LIVEKIT_API_SECRET`      | Group    | LiveKit API secret.                                                    |

Local defaults when using `docker compose --profile video up -d`:
`NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880`, `LIVEKIT_API_KEY=devkey`, and
`LIVEKIT_API_SECRET=secret`. These are development-only values.

### Object storage (optional)

Set all four core values or leave all four empty. A partial group fails startup.
Upload endpoints return `503` when storage is disabled.

| Variable               | Required | Notes                                                                |
| ---------------------- | -------- | -------------------------------------------------------------------- |
| `R2_ACCESS_KEY_ID`     | Group    | S3-compatible access key.                                            |
| `R2_SECRET_ACCESS_KEY` | Group    | S3-compatible secret key.                                            |
| `R2_BUCKET_NAME`       | Group    | Bucket name.                                                         |
| `R2_ENDPOINT`          | Group    | Absolute `http(s)` endpoint, for example `http://localhost:9000`.    |
| `R2_PUBLIC_URL`        | No       | Public base URL for files. Falls back to `${R2_ENDPOINT}/${bucket}`. |

Local development uses SeaweedFS with access key `skillex`, secret
`skillex-dev-secret`, bucket `skillex-uploads`, and endpoint
`http://localhost:9000`.

### Payments (Flutterwave, optional)

Set both values or leave both empty. Leaving both empty is supported:
non-production runs use a local mock; production disables purchases and
withdrawals.

| Variable                          | Required | Notes                                                           |
| --------------------------------- | -------- | --------------------------------------------------------------- |
| `FLUTTERWAVE_SECRET_KEY`          | Pair     | Flutterwave **secret** key. Use test keys locally.              |
| `FLUTTERWAVE_WEBHOOK_SECRET_HASH` | Pair     | The `verif-hash` value configured in the Flutterwave dashboard. |

The web app also needs `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` to open the
Flutterwave checkout. Without it, the points page uses the API's local mock in
development.

### Exchange rates (optional)

| Variable     | Required | Notes                                                                        |
| ------------ | -------- | ---------------------------------------------------------------------------- |
| `OER_APP_ID` | No       | Open Exchange Rates app ID. When unset, transparent fallback rates are used. |

Rates are cached in Redis and refreshed periodically. If Redis is unavailable,
the API keeps the last known rates in memory.

### Push notifications (optional)

| Variable            | Required | Notes                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------- |
| `VAPID_PUBLIC_KEY`  | Pair     | Web Push public key.                                                    |
| `VAPID_PRIVATE_KEY` | Pair     | Web Push private key.                                                   |
| `VAPID_EMAIL`       | No       | Contact address for the VAPID subject. Defaults to a local placeholder. |

Set both keys or neither. Web Push is disabled until both are present. Expo push
for mobile does not require these values.

### Analytics (optional)

Set both values or neither.

| Variable                | Required | Notes                                                 |
| ----------------------- | -------- | ----------------------------------------------------- |
| `POSTHOG_PROJECT_TOKEN` | Pair     | PostHog project token for server-side events.         |
| `POSTHOG_HOST`          | Pair     | PostHog host, for example `https://us.i.posthog.com`. |

The web app uses `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and
`NEXT_PUBLIC_POSTHOG_HOST`; the mobile app uses `POSTHOG_PROJECT_TOKEN` and
`POSTHOG_HOST` from `apps/mobile/.env`.

### Seeding

| Variable         | Required | Default | Notes                                                                                           |
| ---------------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `SEED_DEMO_DATA` | No       | `false` | In production, demo users and data are skipped unless this is `true`. Never enable it publicly. |

## Web (`apps/web/.env.local`)

All `NEXT_PUBLIC_*` values are embedded in the browser bundle at build time.
Changing one requires a rebuild or a restart of `next dev`.

| Variable                               | Required | Local default           | Notes                                                                                                        |
| -------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`             | **Yes**  | `http://localhost:3001` | API origin used by server components and the `/api/*` rewrite in `next.config.ts`. Do not append `/api`.     |
| `NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL` | **Yes**  | `http://localhost:3001` | API origin used by browser-side fetches. Can be the same origin as the web app when a reverse proxy is used. |
| `NEXT_PUBLIC_CLIENT_BASE_URL`          | **Yes**  | `http://localhost:3000` | Public web origin. Used for metadata, sitemap, robots, and share links.                                      |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`   | No       | empty                   | Flutterwave public key. Test keys start with `FLWPUBK_TEST-`.                                                |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | No       | empty                   | Web Push public key. Must match the API's VAPID pair.                                                        |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`    | Pair     | empty                   | PostHog project token.                                                                                       |
| `NEXT_PUBLIC_POSTHOG_HOST`             | Pair     | `/ph`                   | PostHog host. The default `/ph` uses the reverse proxy configured in `next.config.ts`.                       |
| `NEXT_PUBLIC_PRELAUNCH_MODE`           | No       | `false`                 | `true` gates marketplace pages behind a coming-soon screen.                                                  |

## Mobile (`apps/mobile/.env`)

Expo inlines `EXPO_PUBLIC_*` values into the JavaScript bundle. `POSTHOG_*`
values are read by `app.config.js` and exposed through `expo.extra`, so they are
also visible in the app bundle. Never put a secret in either file.

| Variable                      | Required | Local default           | Notes                                                                                         |
| ----------------------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`    | **Yes**  | `http://localhost:3001` | API origin, without `/api`. On a physical device, use the computer's LAN IP, not `localhost`. |
| `EXPO_PUBLIC_BETTER_AUTH_URL` | **Yes**  | `http://localhost:3001` | Better Auth base URL. Must be reachable from the device.                                      |
| `EXPO_PUBLIC_SCHEME`          | **Yes**  | `skil-ex`               | Must match `expo.scheme` in `app.json` and `EXPO_SCHEME` in the API.                          |
| `EXPO_PUBLIC_WEB_BASE_URL`    | **Yes**  | `http://localhost:3000` | Web origin used for share links and "open in browser" actions.                                |
| `POSTHOG_PROJECT_TOKEN`       | Pair     | empty                   | PostHog project token, exposed through `expo.extra`.                                          |
| `POSTHOG_HOST`                | Pair     | empty                   | PostHog host, exposed through `expo.extra`.                                                   |

The mobile app is built with Expo SDK 58 and React Native 0.88. It requires an
Expo development build because it uses LiveKit WebRTC and a local native audio
module. See [`docs/mobile-development.md`](./mobile-development.md).

## Local defaults created by `pnpm run setup`

| Service            | URL                            | Credentials                               |
| ------------------ | ------------------------------ | ----------------------------------------- |
| Web                | <http://localhost:3000>        | `demo@skillex.dev` / `Password123!`       |
| API                | <http://localhost:3001/api>    | Bearer session from the web or mobile app |
| API health         | <http://localhost:3001/health> | none                                      |
| PostgreSQL         | `localhost:5432`               | `skillex` / `skillex`, database `skillex` |
| Redis              | `localhost:6379`               | none                                      |
| Mailpit SMTP / UI  | `localhost:1025` / `:8025`     | none                                      |
| SeaweedFS S3 / UI  | `localhost:9000` / `:9001`     | `skillex` / `skillex-dev-secret` (S3)     |
| LiveKit (optional) | `ws://localhost:7880`          | `devkey` / `secret`                       |

These credentials are for local development only. Never reuse them in a
deployment. The host ports in this table are the defaults; see
[Compose](#compose-env) when a port is already in use.

## Deployment notes

### API

The API must have `DATABASE_URL` and `BETTER_AUTH_SECRET`, plus
`BETTER_AUTH_URL`, `CLIENT_BASE_URL`, and `INTERNAL_SECRET` when
`NODE_ENV=production`. Configure object storage, email, payments, video, push,
and analytics only for the features you use. Each optional group is validated
as a group.

`render.yaml` is an example Render blueprint. It still generates `JWT_SECRET`
for compatibility; current API code does not read it.

### Web

Set `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL`, and
`NEXT_PUBLIC_CLIENT_BASE_URL` at build time. If the web app and API are served
from the same origin through a reverse proxy, both API base URLs can point at
that origin.

### Mobile builds

The manual iOS workflows use these GitHub Actions repository secrets:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SCHEME`
- `EXPO_PUBLIC_WEB_BASE_URL`
- `EXPO_PUBLIC_BETTER_AUTH_URL`

They are written to a temporary `.env` on the runner. Treat them as public
values, not as confidential secrets, because they are compiled into the app.

## Troubleshooting

- **`Invalid environment configuration`** — read the full message; it names the
  missing or inconsistent variable. A common cause is setting only one half of a
  pair or group.
- **Placeholder secret rejected** — `BETTER_AUTH_SECRET` and `INTERNAL_SECRET`
  cannot be `replace-me`, `change-me`, `your-secret-here`, or a value starting
  with `<` or `your-`.
- **The mobile app cannot reach the API** — `localhost` on a phone refers to the
  phone. Use the computer's LAN IP and make sure the API listens on an interface
  the phone can reach.
- **Email does not arrive locally** — open Mailpit at
  <http://localhost:8025>. Check that `EMAIL_TRANSPORT=auto` and
  `SMTP_HOST=localhost`.
- **Uploads return `503`** — the R2 group is incomplete or storage is disabled.
  Set all four core R2 values, or use the local SeaweedFS defaults.
- **Live video is disabled** — set all three LiveKit values, or leave all three
  empty. Restart the API after changing them.

For setup steps, see [`README.md`](../README.md). For architecture and optional
integration behavior, see [`docs/architecture.md`](./architecture.md).
