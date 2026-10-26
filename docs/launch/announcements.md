# Launch announcements

Copy for the first public release. Do not post any of this until the repository
is public and the blocking gates in [`README.md`](./README.md) are cleared.

## How to use this file

1. Replace every `<PLACEHOLDER>` before posting.
2. Use the canonical link for each channel and keep the UTM tag.
3. Post one channel at a time and answer replies before moving on.
4. Never publish a personal email address. Link to GitHub Discussions, Issues,
   or private vulnerability reporting instead.
5. Do not claim production readiness, real users, revenue, or metrics that have
   not been measured.

## Canonical links

| Destination             | URL                                                                    |
| ----------------------- | ---------------------------------------------------------------------- |
| Repository              | <https://github.com/richard-kenneth/skillex>                           |
| Release                 | <https://github.com/richard-kenneth/skillex/releases/tag/v0.1.0>       |
| Landing page + waitlist | <https://skil-ex2-web.vercel.app>                                      |
| Discussions             | <https://github.com/richard-kenneth/skillex/discussions>               |
| Starter issues          | <https://github.com/richard-kenneth/skillex/issues>                    |
| Contributing            | <https://github.com/richard-kenneth/skillex/blob/main/CONTRIBUTING.md> |
| Security                | <https://github.com/richard-kenneth/skillex/blob/main/SECURITY.md>     |

## UTM links

Replace the base URL if the landing page moves to a custom domain.

| Channel      | URL                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------- |
| README       | `https://skil-ex2-web.vercel.app/?utm_source=github&utm_medium=readme&utm_campaign=v0.1.0`      |
| X / Twitter  | `https://skil-ex2-web.vercel.app/?utm_source=x&utm_medium=social&utm_campaign=v0.1.0`           |
| LinkedIn     | `https://skil-ex2-web.vercel.app/?utm_source=linkedin&utm_medium=social&utm_campaign=v0.1.0`    |
| Dev.to       | `https://skil-ex2-web.vercel.app/?utm_source=devto&utm_medium=article&utm_campaign=v0.1.0`      |
| Hashnode     | `https://skil-ex2-web.vercel.app/?utm_source=hashnode&utm_medium=article&utm_campaign=v0.1.0`   |
| Reddit       | `https://skil-ex2-web.vercel.app/?utm_source=reddit&utm_medium=social&utm_campaign=v0.1.0`      |
| Hacker News  | `https://skil-ex2-web.vercel.app/?utm_source=hn&utm_medium=social&utm_campaign=v0.1.0`          |
| Product Hunt | `https://skil-ex2-web.vercel.app/?utm_source=producthunt&utm_medium=social&utm_campaign=v0.1.0` |
| Communities  | `https://skil-ex2-web.vercel.app/?utm_source=community&utm_medium=social&utm_campaign=v0.1.0`   |

## Core message

**One line:** SkillEx is an open-source skill-exchange marketplace: trade skills,
settle the difference with points, and learn live.

**Short paragraph:** SkillEx lets people teach what they know and learn what they
want without turning every lesson into a cash transaction. A direct swap works
when both sides are equal; points and escrow make the difference fair when they
are not. The web app, API, mobile app, and shared package are now open source
under AGPL-3.0-only.

**Boilerplate:** SkillEx is a pre-launch, open-source skill-exchange marketplace
built with Next.js, NestJS, PostgreSQL, Prisma, LiveKit, and Expo. The repository
includes a zero-account local stack, seeded demo data, and a starter backlog for
contributors. The full marketplace is not hosted as a public demo yet; the
landing page and waitlist are live.

## X / Twitter thread

Post as a thread. Attach the demo GIF to the first post. Replace `<REPO_URL>` and
`<LIVE_URL>` before posting.

```text
I open-sourced SkillEx, a skill-exchange marketplace.

Trade what you know for what you want to learn. If a straight swap is unfair,
settle the difference with points.

AGPL-3.0. Repo + waitlist below. 🧵
```

```text
The problem: learning is expensive, and teaching is undervalued.

SkillEx treats both sides as contributors. Teach one skill, learn another, and
keep the exchange fair without paying for every lesson.
```

```text
What's in v0.1.0:

• skill-for-skill exchanges
• points + escrow
• live sessions with LiveKit
• matching, reviews, referrals
• English, French, Spanish, Portuguese
• Next.js web app + Expo mobile app
```

```text
Stack: Next.js 16, NestJS, PostgreSQL, Prisma 7, Better Auth, Redis/BullMQ,
LiveKit, Expo, Turborepo.

The local stack runs with zero paid accounts: Postgres, Redis, Mailpit, MinIO,
and optional LiveKit.
```

```text
The hard part wasn't the stack.

It was making ~12 third-party services optional so a new contributor can clone
and run the app without signing up for anything: mock payments, local email,
local storage, safe fallbacks.
```

```text
We also did the unglamorous launch work:

AGPL license, CLA, security policy, Code of Conduct, issue forms, CI, branch
protection, and 15 starter issues with files, acceptance criteria, and test
steps.
```

```text
If you want to help:

9 good first issues, 6 help wanted. Docs, tests, accessibility, mobile CI, i18n,
self-hosting.

Comment before you start. We aim to respond within 48 hours.

<REPO_URL>
```

```text
Try it locally, join the waitlist, or tell me what would make you contribute.

<LIVE_URL>
```

## LinkedIn

```text
I've been building SkillEx, a marketplace where people trade skills instead of
paying for every lesson.

The idea is simple: teach what you know, learn what you want, and settle the
difference with points when a straight swap is not fair. Add live sessions,
reviews, referrals, and escrow, and you get a small economy built around trust.

I've decided to open-source it under AGPL-3.0-only.

Why? Because the hardest problems here are not secret: making a marketplace fair,
making payments and live video optional for local development, and making a
monorepo easy to contribute to. Those problems get better with more eyes.

The repository includes the Next.js web app, NestJS API, Expo mobile app, shared
TypeScript package, a zero-account local stack, demo data, and 15 starter issues.

The full marketplace is not hosted as a public demo yet. The landing page and
waitlist are live, and the local stack is the supported way to try the product
today.

If you work with Next.js, NestJS, React Native, accessibility, or developer
experience, I'd love your feedback. The best place to start is the repository:

<REPO_URL>

#OpenSource #NextJS #NestJS #ReactNative #BuildInPublic
```

## OSCA, She Code Africa, and local communities

Ask an admin before posting in a group that requires it. Keep the message short
and specific.

```text
Hi everyone — I've open-sourced SkillEx, a skill-exchange marketplace built with
Next.js, NestJS, PostgreSQL, and Expo.

It is AGPL-3.0-only, and the local stack runs with zero paid accounts:
PostgreSQL, Redis, Mailpit, MinIO, and optional LiveKit. There is seeded demo
data, so you can sign in and click around immediately.

I'm looking for feedback on the contributor experience, especially from people
who work on accessibility, testing, docs, or mobile. There are 9 good first
issues and 6 help wanted issues, each with files, acceptance criteria, and test
steps.

Repo: <REPO_URL>
Start here: <DISCUSSIONS_URL>

No pressure to contribute — telling me where the setup breaks is just as useful.
```

## Reddit

Read each subreddit's self-promotion rules first. Do not post the same text to
multiple subreddits, and do not drop a link without context. Answer questions in
the thread.

### r/opensource

**Title:** I open-sourced a skill-exchange marketplace under AGPL-3.0 — looking
for feedback on the contributor experience

```text
I've been building SkillEx, a marketplace where people trade skills directly and
settle unequal swaps with points. I've just open-sourced it under AGPL-3.0-only.

The part I'd like feedback on is not the product idea. It's the contributor
experience:

- Can someone clone the repo and run the full stack without a paid account?
- Are the 15 starter issues actually scoped well enough to finish?
- Is the CLA process clear without being discouraging?
- Does the AGPL choice make sense for a marketplace that may host a paid service?

The repository includes a Next.js web app, NestJS API, Expo app, shared TypeScript
package, Docker Compose stack, seeded demo data, and CI. The local stack uses
Postgres, Redis, Mailpit, MinIO, and optional LiveKit. Payments default to a mock.

The full marketplace is not hosted publicly yet, so the local stack is the way to
try it. I'd rather hear that the setup is broken now than after more people find
it.

Repo: <REPO_URL>
```

### r/webdev

**Title:** What it took to make a Next.js + NestJS monorepo run with zero paid
accounts

```text
I open-sourced SkillEx, a skill-exchange marketplace, and the biggest piece of
work was not the UI. It was making the development environment usable without
asking a contributor to sign up for a dozen services.

What the local stack does:

- PostgreSQL, Redis, Mailpit, and MinIO run in Docker Compose.
- Payments use a local mock that credits points and approves withdrawals.
- Email goes to Mailpit instead of Resend.
- File uploads go to MinIO instead of Cloudflare R2.
- FX uses transparent fallback rates.
- LiveKit, OAuth, push, and analytics are optional.

The API validates environment variables at startup. Required variables fail
fast; optional groups log that the feature is disabled. A partially configured
group, like a Google client ID without its secret, is rejected rather than
silently weakening security.

The repo is AGPL-3.0-only and includes a Next.js 16 web app, NestJS API, Expo
app, shared package, CI, and seeded demo data.

Repo: <REPO_URL>

I'd be interested in feedback from anyone who has maintained a monorepo with a
lot of optional integrations. What would you change?
```

### r/nextjs

**Title:** Next.js 16 App Router + next-intl + React Query in an open-source
marketplace

```text
I open-sourced SkillEx, a skill-exchange marketplace, and the web app is a
Next.js 16 App Router project. A few things that might be useful to compare:

- Routes live under src/app/[locale], with English, French, Spanish, and
  Portuguese.
- next-intl handles locale routing and translations.
- React Query manages client-side data fetching.
- Server components can call the API through NEXT_PUBLIC_API_BASE_URL; browser
  code uses NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL.
- next.config.ts proxies /api/* to the API and /ph/* to PostHog.
- The app is a PWA, with a manifest and install prompt.

The repo also includes a NestJS API, Expo app, shared TypeScript package, Docker
Compose stack, and seeded demo data. It is AGPL-3.0-only.

Repo: <REPO_URL>

I'd especially appreciate feedback on the locale routing and the server/client
API URL split. What would you do differently?
```

### r/Nestjs_framework

**Title:** NestJS API with Prisma 7, Better Auth, BullMQ, and optional
integrations

```text
I open-sourced SkillEx, a skill-exchange marketplace. The API is NestJS with
Prisma 7 and PostgreSQL, and I'd like feedback on the module boundaries and
security defaults.

What's in it:

- Better Auth with the Prisma adapter for credentials and sessions.
- Zod for startup environment validation; Valibot for request validation through
  a shared pipe.
- @nestjs/throttler on public and expensive endpoints.
- BullMQ with Redis for the recording-timeout job.
- Pino structured logging.
- Optional LiveKit, Flutterwave, Resend/SMTP, R2/MinIO, OAuth, push, and
  PostHog integrations.

The API owns database access, authorization, validation, payments, storage,
email, and LiveKit tokens. The web and mobile apps call the API rather than the
infrastructure.

Repo: <REPO_URL>

The roadmap includes moving throttler storage to Redis and reconciling
withdrawal timeouts. If you've solved either in a NestJS codebase, I'd like to
compare notes.
```

### r/SideProject

**Title:** I open-sourced my skill-exchange startup instead of keeping it closed

```text
I've been building SkillEx, a marketplace where people trade skills and settle
unequal swaps with points. I decided to open-source it under AGPL-3.0-only
instead of keeping the code private.

Why: the product needs trust, and a marketplace that asks people to teach and
learn from each other should be inspectable. The AGPL also means a hosted clone
has to share its changes, which matters for a service that may charge fees.

What's in the repo:

- Next.js web app, NestJS API, Expo mobile app, shared TypeScript package.
- Docker Compose local stack with Postgres, Redis, Mailpit, MinIO, and optional
  LiveKit.
- Mock payments, local email, local storage, and safe fallbacks for optional
  integrations.
- Seeded demo data and a documented login.
- 9 good first issues and 6 help wanted issues.

The full marketplace is not hosted as a public demo yet. The landing page and
waitlist are live, and the local stack is the way to try the product today.

Repo: <REPO_URL>
Waitlist: <LIVE_URL>

I'd love feedback on the pitch, the setup, or the first-run experience.
```

## Show HN

Only post when the product is usable and the repository has survived a few days
of traffic. Use the live product as the URL and put the repository in the first
comment.

**Title:** Show HN: SkillEx – open-source skill-exchange marketplace

**URL:** `<LIVE_URL>`

**First comment:**

```text
I built SkillEx, a marketplace where people trade skills directly and settle
unequal swaps with points. The code is AGPL-3.0-only.

The part I'm most interested in feedback on is the local setup. The full stack
runs with Docker Compose and no paid accounts: Postgres, Redis, Mailpit, MinIO,
and optional LiveKit. Payments default to a mock, email goes to Mailpit, and
optional integrations degrade safely when credentials are absent.

The repository also has a NestJS API, Next.js web app, Expo app, shared
TypeScript package, seeded demo data, and 15 starter issues.

Repo: <REPO_URL>

The full marketplace is not hosted as a public demo yet, so the local stack is
the supported way to try it. I'd appreciate bug reports more than compliments.
```

## Product Hunt

Product Hunt is for the product, not the repository. Prepare screenshots, a demo
video, and a first comment. Do not launch before the product is usable.

**Tagline:** Trade skills, earn points, learn live.

**Description:**

```text
SkillEx is a skill-exchange marketplace. Teach what you know, learn what you
want, and settle the difference with points when a straight swap is not fair.
Live sessions, reviews, referrals, and escrow are built in. Open source under
AGPL-3.0-only.
```

**First comment:**

```text
I built SkillEx because learning is expensive and teaching is undervalued. The
idea is to let people trade skills directly, with points and escrow for the
unequal swaps.

The code is open source under AGPL-3.0-only. The local stack runs without paid
accounts, and there are 9 good first issues and 6 help wanted issues for anyone
who wants to contribute.

The full marketplace is not hosted as a public demo yet. The landing page and
waitlist are live, and the local stack is the supported way to try it today.

I'd love feedback on the onboarding and the exchange flow.
```

## Directory and newsletter blurbs

### 50 words

```text
SkillEx is an open-source skill-exchange marketplace built with Next.js, NestJS,
PostgreSQL, Prisma, LiveKit, and Expo. Trade skills directly, settle unequal
swaps with points, and meet for live sessions. The local stack runs with zero
paid accounts and includes seeded demo data. AGPL-3.0-only.
```

### 100 words

```text
SkillEx is an open-source skill-exchange marketplace: teach what you know, learn
what you want, and settle the difference with points when a direct swap is not
fair. It includes skill matching, escrow, reviews, referrals, live sessions, and
four locales. The monorepo contains a Next.js 16 web app, a NestJS API, an Expo
mobile app, and a shared TypeScript package. Contributors can run the full stack
with Docker Compose and no paid accounts: PostgreSQL, Redis, Mailpit, MinIO, and
optional LiveKit. Payments default to a local mock. The project is AGPL-3.0-only
and has a starter backlog for new contributors.
```

### Directory checklist

| Directory            | Action                                                                 | Status |
| -------------------- | ---------------------------------------------------------------------- | ------ |
| Up For Grabs         | Submit a pull request to their repository with the project details     | [ ]    |
| goodfirstissue.dev   | Submit the repository through the site's form                          | [ ]    |
| CodeTriage           | Add the repository and choose an alert volume                          | [ ]    |
| awesome-nestjs       | Follow the list's contributing guide and open a pull request           | [ ]    |
| awesome-nextjs       | Follow the list's contributing guide and open a pull request           | [ ]    |
| awesome-react-native | Follow the list's contributing guide and open a pull request           | [ ]    |
| awesome-selfhosted   | Wait until the self-hosting guide exists, then follow the list's rules | [ ]    |
| Node Weekly          | Use the newsletter submission form                                     | [ ]    |
| React Status         | Use the newsletter submission form                                     | [ ]    |
| Console.dev          | Use the newsletter submission form                                     | [ ]    |

## Do not post

- Do not publish a personal email address.
- Do not claim the project is production-ready or that it has real users.
- Do not invent download, star, or revenue numbers.
- Do not post the same text to every subreddit or community.
- Do not ask for upvotes or coordinate voting.
- Do not post before the repository is public and the launch gates are cleared.
