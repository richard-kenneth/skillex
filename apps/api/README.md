# SkillEx API

The NestJS REST API for SkillEx. It owns authentication, exchanges, points and escrow, reviews, referrals, notifications, uploads, and LiveKit room tokens.

## Local development

The supported setup is the root one-command flow:

```bash
# from the repository root
pnpm install
pnpm run setup
pnpm dev
```

`pnpm run setup` starts PostgreSQL, Redis, Mailpit, and MinIO, applies migrations, and seeds demo data. See the [root README](../../README.md) for local URLs, the demo login, and optional integrations.

To run only the API after the services are up:

```bash
pnpm --filter api dev
```

The API listens on <http://localhost:3001/api>; health is at <http://localhost:3001/health>.

## Environment

`pnpm run setup` creates `apps/api/.env` with working local values. The annotated template is [`.env.example`](./.env.example).

Required in every environment:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — at least 16 characters

Required in production:

- `BETTER_AUTH_URL`
- `CLIENT_BASE_URL`
- `INTERNAL_SECRET`

Everything else is optional, but some values must be set as a group:

- R2: all `R2_*` values together
- LiveKit: `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Flutterwave: `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_SECRET_HASH`
- OAuth: each provider's client ID and secret
- VAPID: public and private keys
- PostHog: project token and host

The API validates this at startup. Missing required values and half-configured groups fail fast with a clear error. Optional integrations that are absent log that they are disabled and use a no-op, fallback, or local mock.

## Scripts

- `pnpm --filter api dev` — start NestJS in watch mode
- `pnpm --filter api build` — compile the application
- `pnpm --filter api lint` — run ESLint in check mode
- `pnpm --filter api typecheck` — typecheck the API and Prisma seed
- `pnpm --filter api test` — run the Jest suites
- `pnpm --filter api exec prisma migrate dev` — create/apply a migration
- `pnpm --filter api exec prisma db seed` — reseed demo data

## Database

Migrations live in `prisma/migrations`. After changing `prisma/schema.prisma`:

```bash
pnpm --filter api exec prisma migrate dev --name describe_the_change
```

The seed script is `prisma/seed.ts`. It is idempotent and skips demo data in production unless `SEED_DEMO_DATA=true`.

## Optional services

- **Email:** Resend, SMTP, Mailpit (local), or disabled. See `src/email/email.service.ts`.
- **Payments:** Flutterwave in production; a local mock in non-production when keys are absent.
- **Storage:** Cloudflare R2 in production; MinIO locally. Upload endpoints return `503` when storage is not configured.
- **Video:** LiveKit. Start it locally with `docker compose --profile video up -d` and set the three LiveKit variables.
- **Analytics / push / FX:** disabled or fallback behavior when unconfigured.

Never commit `.env` files or real credentials.
