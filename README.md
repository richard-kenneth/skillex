# SkillEx

SkillEx is an open-source skill-exchange marketplace: trade skills, earn points, and learn live. The project is a pnpm + Turborepo monorepo with a Next.js web app, a NestJS API, an Expo / React Native mobile app, and a shared TypeScript package.

> **Status:** pre-launch. The repository is being prepared for its first public release. Setup is being simplified; see the app-level READMEs for the current requirements.

## Tech stack

### Apps

- **`apps/web`** — [Next.js 16](https://nextjs.org/) (App Router), Tailwind CSS 4, Better Auth, LiveKit, next-intl.
- **`apps/api`** — [NestJS](https://nestjs.com/), Prisma + PostgreSQL, Better Auth, BullMQ/Redis, LiveKit, Resend, Flutterwave, Cloudflare R2.
- **`apps/mobile`** — Expo / React Native, Expo Router, LiveKit React Native, Better Auth Expo.

### Shared

- **`packages/shared`** — shared types, schemas, constants, translations, API clients, and utilities used by the apps.
- **Tooling** — [Turborepo](https://turbo.build/), [pnpm](https://pnpm.io/), TypeScript.

## Project structure

```text
skillex/
├── apps/
│   ├── api/          # NestJS backend
│   ├── mobile/       # Expo / React Native app
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared business logic, types, and constants
├── docs/
│   ├── adr/          # Architecture and project decisions
│   └── legal/        # CLA review notes
├── turbo.json
└── package.json
```

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 10.33.2 (pinned in `package.json`)
- PostgreSQL
- Redis (for background jobs)
- Optional third-party accounts for live video, email, payments, storage, push, and analytics

### Install

```bash
git clone https://github.com/richard-kenneth/skillex.git
cd skillex
pnpm install
```

### Environment variables

Copy the example environment files and fill in the values you need:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Many integrations are optional for local development. If a key is missing, the related feature should be disabled or no-op rather than crashing the app. The project is moving toward a Docker Compose setup with local stand-ins for PostgreSQL, Redis, email, and object storage.

### Run

```bash
pnpm dev
```

This starts the API and web app in development mode through Turborepo. The mobile app is started separately:

```bash
pnpm --filter mobile start
```

The mobile app uses Expo development builds and native modules, so Expo Go alone is not sufficient. See [`apps/mobile/README.md`](./apps/mobile/README.md).

### Available scripts

- `pnpm dev` — start the apps in watch mode.
- `pnpm build` — build all packages and apps.
- `pnpm lint` — run linting across the workspace.

## Contributing

We welcome contributions to the web app, API, shared package, docs, and tests. Mobile contributions are community-supported, with iOS-native and release work remaining maintainer-led. Read:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — setup, branch and commit conventions, review expectations.
- [`docs/adr/0002-mobile-contribution-scope.md`](./docs/adr/0002-mobile-contribution-scope.md) — what mobile contributions are practical today.

### Contributor License Agreement

Before we can merge code, documentation, or other material intended for inclusion in the project, you need to sign the CLA:

- Individuals: [`CLA.md`](./CLA.md)
- Companies and other entities: [`CLA-CORPORATE.md`](./CLA-CORPORATE.md)

The CLA is a license, not a copyright assignment. You keep ownership of your work and grant the project a broad license, including the right to relicense. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the signing process.

## Security

Please do not report security vulnerabilities in public issues. Use GitHub's private vulnerability reporting; see [`SECURITY.md`](./SECURITY.md).

## Privacy

See [`PRIVACY.md`](./PRIVACY.md) for how CLA and contributor records are handled.

## License

SkillEx is licensed under the **GNU Affero General Public License, version 3 only (AGPL-3.0-only)**. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).

The AGPL does not grant rights to the SkillEx name, logo, or other brand identifiers. See [`TRADEMARK.md`](./TRADEMARK.md).

## Links

- Repository: <https://github.com/richard-kenneth/skillex>
- Issues: <https://github.com/richard-kenneth/skillex/issues>
- Architecture decisions: [`docs/adr/`](./docs/adr/)
