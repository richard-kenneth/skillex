# AGENTS.md

Instructions for AI coding agents working in the SkillEx repository. Read this
before changing code. It complements, and does not replace,
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Read first

1. [`README.md`](./README.md) — local setup and optional integrations.
2. [`docs/architecture.md`](./docs/architecture.md) — system design and data flow.
3. [`docs/env-vars.md`](./docs/env-vars.md) — configuration reference.
4. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — scope, CLA, branches, and review.
5. [`SECURITY.md`](./SECURITY.md) — vulnerability reporting and security rules.
6. [`docs/adr/`](./docs/adr/) — accepted architectural decisions.

The repository is licensed under **AGPL-3.0-only**. Contributions require a
signed CLA. An AI agent cannot sign a CLA on a contributor's behalf.

## Repository map

| Path                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `apps/web`           | Next.js App Router frontend, localized with `next-intl`               |
| `apps/api`           | NestJS API, Prisma schema and migrations, Better Auth                 |
| `apps/mobile`        | Expo / React Native app, Expo Router, local native audio module       |
| `packages/shared`    | Valibot schemas, types, constants, currency helpers, analytics events |
| `docs/`              | Architecture, environment, mobile, ADR, and legal documentation       |
| `scripts/setup.mjs`  | One-command local setup                                               |
| `docker-compose.yml` | Local PostgreSQL, Redis, Mailpit, SeaweedFS, optional LiveKit         |

The API owns database access, authorization, validation, payments, storage,
email, and LiveKit tokens. The web and mobile apps call the API; they do not
connect to infrastructure directly.

## Setup and commands

```bash
pnpm install
pnpm run setup        # env files, Docker services, migrations, seed data
pnpm dev              # API and web app in watch mode
```

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `pnpm lint`         | ESLint across the workspace                |
| `pnpm lint:fix`     | Apply ESLint fixes                         |
| `pnpm typecheck`    | TypeScript across every package            |
| `pnpm test`         | Test suites                                |
| `pnpm format`       | Write Prettier formatting                  |
| `pnpm format:check` | Check formatting without writing           |
| `pnpm build`        | Build all packages and apps                |
| `pnpm db:reset`     | Delete local volumes and recreate services |

Run the narrowest useful command while iterating, then run `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, and `pnpm test` before proposing a commit.

## Conventions

### General

- TypeScript is strict. Do not use `any` to silence a type error; fix the type
  or use a narrow, documented cast.
- Match the formatting and naming of the surrounding file. Prettier and ESLint
  are authoritative.
- Keep changes focused. Do not mix refactors, formatting churn, and behavior
  changes in one pull request.
- Use Conventional Commits for commit messages and pull request titles.
- Prefer existing dependencies and patterns over adding a new library.

### API (`apps/api`)

- NestJS modules contain controllers, services, DTOs, and tests.
- Request validation uses **Valibot** schemas from `@skillex/shared` through
  `ValibotValidationPipe`. Zod is used only for startup environment validation.
- Put reusable request/response schemas and types in `packages/shared`; do not
  duplicate them in the web and mobile apps.
- Use `PrismaService`; do not instantiate `PrismaClient` in feature code.
- Add a Prisma migration for every schema change. Never edit generated Prisma
  code in `apps/api/src/generated/prisma`.
- Preserve transactions and idempotency in points, escrow, withdrawals, and
  webhook paths. A retry must not double-credit or double-debit.
- Use the shared `secureCompare` helper for secret comparisons. Never compare
  secrets with `===`.
- Log through the NestJS/Pino logger. Do not log tokens, secrets, webhook
  signatures, full request bodies, or personal data.
- Rate-limit new public or expensive endpoints with `@Throttle`.

### Web (`apps/web`)

- Routes live under `src/app/[locale]`. Add user-facing strings to the i18n
  messages rather than hard-coding them.
- Use React Query for client data fetching and the shared API types.
- Server components may call the API with `NEXT_PUBLIC_API_BASE_URL`; browser
  code uses `NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL`.
- `src/proxy.ts` handles locale routing. Do not add a separate middleware that
  conflicts with it.
- Keep accessibility in scope: semantic elements, labels, focus states, and
  keyboard behavior.

### Mobile (`apps/mobile`)

- Use Expo Router file-based routes under `src/app`.
- The app requires an Expo development build. Do not assume Expo Go works.
- Do not edit generated `android/` or `ios/` directories. Change `app.json`,
  `app.config.js`, a config plugin, or the local module instead.
- Native Kotlin/Swift changes require a native rebuild and maintainer review.
- `EXPO_PUBLIC_*` values are public in the bundle. Never put a secret there.
- See [`docs/mobile-development.md`](./docs/mobile-development.md) for device
  networking, push, LiveKit, and testing expectations.

### Shared (`packages/shared`)

- Export new schemas, types, and constants from the package entry point.
- Keep schemas runtime-validatable and infer TypeScript types from them where
  possible.
- The package is built before the apps consume it. Rebuild it after changing
  exports if a workspace command does not do so automatically.

## Environment variables

- Add new API variables to `apps/api/.env.example`, the Zod schema in
  `apps/api/src/config/env.validation.ts`, and `docs/env-vars.md`.
- Add new web variables to `apps/web/.env.example` and `docs/env-vars.md`.
- Add new mobile variables to `apps/mobile/.env.example` and
  `docs/env-vars.md`.
- Update `scripts/setup.mjs` when a variable needs a generated local default.
- Mark optional integration groups clearly. A partially configured group should
  fail startup with an actionable message, not silently disable security.
- Never put a secret in a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable.

## Security rules

- Never read, print, copy, commit, or paste `.env` contents, tokens, cookies,
  credentials, private keys, or personal data into a response.
- Never commit `.env` files, generated native directories, build output, or
  local tooling caches.
- Do not weaken authentication, authorization, CORS, trusted origins, webhook
  signature checks, upload policy, rate limits, or startup validation.
- Do not add a fallback that treats an unset secret as valid. Fail closed.
- Redact secrets and personal data from logs, screenshots, issues, and pull
  request descriptions.
- If you find a suspected secret in the working tree or history, stop and tell
  the user. Do not rotate, delete, or rewrite history without explicit approval.
- Do not run `git push`, force-push, rewrite history, or make a repository
  public. Those actions require explicit human approval.

## Documentation rules

- Update `README.md` when setup or the supported feature set changes.
- Update `docs/architecture.md` when a module, data flow, or deployment
  assumption changes.
- Update `docs/env-vars.md` when configuration changes.
- Add user-visible changes under `## [Unreleased]` in `CHANGELOG.md`.
- Use the public brand **SkillEx** in prose and the technical slug `skillex` in
  paths, package names, and URLs.
- Do not publish a personal email address. Use GitHub issues, discussions, or
  private vulnerability reporting as described in `SUPPORT.md`.
- Keep documentation free of real credentials, internal hostnames, and
  environment-specific secrets.

## Tests

- API tests use Jest and live next to the code as `*.spec.ts`.
- Prefer service-level tests with mocked Prisma and collaborators for business
  logic. Add an end-to-end test when the behavior depends on the database or
  HTTP layer.
- Cover failure paths: invalid input, insufficient balance, duplicate webhook
  delivery, unauthorized access, and partial integration configuration.
- Web and mobile test suites are incomplete. If you add behavior there, add the
  most valuable test the existing setup supports and state what was tested
  manually.
- Do not claim a platform or integration was tested when it was not. Docker,
  iOS, Android, LiveKit, Flutterwave, and email delivery may be unavailable in
  the development environment.

## Common tasks

### Add an API endpoint

1. Add or update the Valibot schema and types in `packages/shared`.
2. Add the controller route, guards, throttling, and service method.
3. Add a service test for success and failure paths.
4. Update the web/mobile client if it consumes the endpoint.
5. Update documentation if the endpoint changes setup or public behavior.

### Change the database schema

1. Edit `apps/api/prisma/schema.prisma`.
2. Create a migration with `pnpm --filter api db:migrate`.
3. Update the seed if demo data must reflect the change.
4. Update `docs/architecture.md` if the model groups or flows change.
5. Run the API tests and typecheck.

### Add an environment variable

1. Add it to the appropriate `.env.example`.
2. Add validation, a default, or an optional-group rule.
3. Add it to `docs/env-vars.md`.
4. Add a local default in `scripts/setup.mjs` if needed.
5. Test startup with the variable present, absent, and partially configured.

## When in doubt

- Ask before making a destructive or irreversible change.
- Prefer a small, reviewable pull request over a broad rewrite.
- Preserve user work in the working tree. Do not delete or overwrite unfamiliar
  files without investigating them first.
- If a requirement conflicts with `CONTRIBUTING.md`, `SECURITY.md`, or an ADR,
  stop and ask rather than guessing.
