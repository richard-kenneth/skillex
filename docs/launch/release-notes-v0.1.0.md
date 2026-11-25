# SkillEx v0.1.0

**Release date:** 25 November 2026

SkillEx is now open source under the **GNU Affero General Public License,
version 3 only (AGPL-3.0-only)**. `v0.1.0` is the first public source release of
the skill-exchange marketplace.

SkillEx lets people trade skills directly, settle unequal swaps with points, and
meet for live sessions. Teach what you know, learn what you want, and keep the
exchange fair without turning every lesson into a cash transaction.

## Highlights

- **Skill-for-skill exchanges.** Propose a swap, negotiate terms, and track the
  exchange from request to completion.
- **Points economy.** Earn points through referrals and exchanges, hold them in
  escrow during a session, and withdraw earned points. Local development uses a
  mock payment provider by default.
- **Live sessions.** Optional LiveKit rooms with chat, screen sharing, and
  consent-based recording.
- **Matching, reviews, and referrals.** Find complementary skills, build
  reputation after each exchange, and earn referral bonuses.
- **Four locales.** English, French, Spanish, and Portuguese, with locale-aware
  routing.
- **Web and mobile clients.** A Next.js web app and an Expo / React Native app
  share schemas and types through `@skillex/shared`.
- **A zero-account local stack.** PostgreSQL, Redis, Mailpit, SeaweedFS, and optional
  LiveKit run through Docker Compose. Payments, email, storage, push, analytics,
  OAuth, and FX fall back to safe local behavior when credentials are absent.
- **Demo data and a documented login.** The seeded database gives contributors a
  populated app instead of an empty shell.
- **CI and API tests.** Pull requests run formatting, lint, typecheck, tests, and
  a build through Turborepo.

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Web        | Next.js 16 App Router, React 19, Tailwind CSS, `next-intl`, React Query    |
| API        | NestJS, Prisma 7, PostgreSQL, Better Auth, BullMQ, Pino, Valibot           |
| Mobile     | Expo, React Native, Expo Router, a local native audio module               |
| Shared     | TypeScript, Valibot schemas, constants, currency helpers, analytics events |
| Tooling    | pnpm, Turborepo, Docker Compose, dev container                             |
| Deployment | Vercel for the web app; the API can run on a Node.js host                  |

## Quick start

Requirements: Node.js 22+, pnpm 10.33.2, and Docker Desktop or Docker Engine with
Compose v2.

```bash
git clone https://github.com/richard-kenneth/skillex.git
cd skillex
pnpm install
pnpm run setup
pnpm dev
```

Open <http://localhost:3000> and sign in with the seeded demo account:

```text
Email:    demo@skillex.dev
Password: Password123!
```

The full setup, optional integrations, and troubleshooting steps are in the
[README](https://github.com/richard-kenneth/skillex/blob/main/README.md).

## What is intentionally not included yet

- The full marketplace is not hosted as a public demo. The landing page and
  waitlist are live; the supported way to try the complete product today is the
  local stack.
- The mobile app requires an Expo development build. iOS-native and release work
  remains maintainer-led.
- Payments default to the local mock. Flutterwave test-mode keys are optional
  for payment work.
- LiveKit, Resend, Cloudflare R2, OAuth, push, PostHog, and FX providers are
  optional integrations. A partially configured group fails startup with an
  actionable error instead of silently disabling security.
- Rate-limit storage is in memory. Redis-backed storage and withdrawal-timeout
  reconciliation are tracked in the [roadmap](https://github.com/richard-kenneth/skillex/blob/main/ROADMAP.md).
- Web and mobile test suites are incomplete. The API has service-level tests;
  Playwright and mobile CI are planned.
- Releases and `CHANGELOG.md` are maintained manually for now. release-please is
  planned.

## Security

Please do not report vulnerabilities in public issues, discussions, or pull
requests. Use GitHub's private vulnerability reporting:

<https://github.com/richard-kenneth/skillex/security/advisories/new>

The policy, response targets, scope, and safe-harbor terms are in
[`SECURITY.md`](https://github.com/richard-kenneth/skillex/blob/main/SECURITY.md).

This release includes the pre-launch security work: constant-time secret
comparison, webhook signature checks that do not log the expected secret,
fail-closed internal service authentication, startup validation for partially
configured integrations, and rate limits on public endpoints. See the changelog
for the full list.

## License and brand

SkillEx is licensed under **AGPL-3.0-only**. See
[`LICENSE`](https://github.com/richard-kenneth/skillex/blob/main/LICENSE) and
[`NOTICE`](https://github.com/richard-kenneth/skillex/blob/main/NOTICE).

The license does not grant rights to the SkillEx name, logo, or other brand
identifiers. See
[`TRADEMARK.md`](https://github.com/richard-kenneth/skillex/blob/main/TRADEMARK.md).

## Contributing

Contributions to the web app, API, shared package, documentation, and tests are
welcome. Mobile contributions are community-supported.

- Read [`CONTRIBUTING.md`](https://github.com/richard-kenneth/skillex/blob/main/CONTRIBUTING.md)
  for setup, branch and commit conventions, the CLA, and review expectations.
- Browse the starter backlog:
  [9 `good first issue`s and 6 `help wanted` issues](https://github.com/richard-kenneth/skillex/issues).
- Ask questions in [Discussions](https://github.com/richard-kenneth/skillex/discussions)
  and follow the [Code of Conduct](https://github.com/richard-kenneth/skillex/blob/main/CODE_OF_CONDUCT.md).
- Sign the CLA when your first pull request opens. The CLA Assistant will guide
  you.

We aim to respond to new issues and pull requests within 48 hours.

## What's next

The [roadmap](https://github.com/richard-kenneth/skillex/blob/main/ROADMAP.md)
covers Redis-backed throttling, withdrawal reconciliation, Playwright coverage,
service tests, a self-hosting guide, release automation, mobile CI, and an
accessibility audit.

Thank you to everyone who tries the local setup and reports what breaks. That
feedback is how the next release gets better.
