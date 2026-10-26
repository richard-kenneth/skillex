# Build-in-public article

Draft for Dev.to and Hashnode. Publish on Dev.to first, then cross-post to
Hashnode with the Dev.to URL as the canonical URL. Do not publish before the
repository is public and the launch gates in [`README.md`](./README.md) are
cleared.

Replace `<DEVTO_URL>` and `<REPO_URL>` before publishing. The article uses a
personal voice because it is a build-in-public post, not project documentation.
Omit `canonical_url` on the original Dev.to post; set it to the Dev.to URL when
cross-posting to Hashnode.

```markdown
---
title: "Why I'm open-sourcing my skill-exchange startup"
published: false
description: "What it took to make a marketplace run without paid accounts, and why the code is now AGPL-3.0."
tags: opensource, nextjs, nestjs, showdev
---

# Why I'm open-sourcing my skill-exchange startup

I've been building SkillEx, a marketplace where people trade skills instead of
paying for every lesson.

The idea came from a simple observation: most of us have something we can teach
and something else we want to learn. But the tools we use turn every exchange
into a transaction. You pay for a course, a tutor, or a subscription. The person
teaching gets paid, but the relationship usually ends when the hour does.

SkillEx is an attempt to make the exchange itself the product. You can trade a
skill directly. If the swap is unequal, you settle the difference with points.
You can teach one person and learn from another without turning your hobby into a
second job.

I've decided to open-source it under AGPL-3.0-only.

## Why open source a marketplace?

There are three reasons.

The first is trust. A marketplace asks people to teach, learn, and hold points in
escrow. That requires a level of confidence that is hard to build with a closed
codebase and a landing page. Open source does not prove that a service is honest,
but it makes the important parts inspectable: how points move, how escrow works,
how a withdrawal is handled, and what the API does with a session.

The second is leverage. I can build the core, but I cannot be the best person to
fix every accessibility issue, write every test, or make the mobile build work on
every machine. Opening the code lets people who care about those problems help
without asking them to join a company first.

The third is the license. AGPL-3.0-only fits a service like this. If someone runs
a modified version as a hosted product, they have to share their changes. That
does not stop competition, but it keeps the improvements in the commons. It also
means the project can stay open without pretending that a permissive license is
the only way to get adoption.

## What is actually in the repository?

SkillEx is a pnpm + Turborepo monorepo:

- a Next.js 16 App Router web app, localized with next-intl;
- a NestJS API with Prisma 7, PostgreSQL, Better Auth, BullMQ, and Pino;
- an Expo / React Native mobile app with Expo Router and a local native audio
  module;
- a shared TypeScript package with Valibot schemas, types, constants, currency
  helpers, and analytics events.

The product includes skill-for-skill exchanges, points and escrow, live sessions
with LiveKit, matching, reviews, referrals, notifications, and four locales:
English, French, Spanish, and Portuguese.

The full marketplace is not hosted as a public demo yet. The landing page and
waitlist are live, and the local stack is the supported way to try the complete
product today.

## The hard part was not the stack

The interesting engineering problem was not picking Next.js or NestJS. It was
making the project run without asking a contributor to sign up for a dozen
services.

A marketplace touches a lot of infrastructure: a database, Redis, email, object
storage, payments, live video, push notifications, analytics, OAuth, and FX
rates. In production, those are real accounts with real credentials. In a fresh
clone, they are a wall.

The local stack is designed to run PostgreSQL, Redis, Mailpit, MinIO, and
optional LiveKit through Docker Compose. The API validates environment variables
at startup: required variables fail fast with a clear message, and optional
groups log that the feature is disabled. Payments default to a local mock. Email
goes to Mailpit. Uploads go to MinIO. FX uses transparent fallback rates. A
partially configured group, such as a Google client ID without its secret, is
rejected instead of silently weakening security.

That work is not glamorous, but it changes the contributor experience. The first
command is `pnpm run setup`, not "go create accounts on twelve websites."

## The unglamorous launch work

Open-sourcing a project is more than changing the repository visibility.

I added an AGPL-3.0-only license, a copyright notice, and a trademark policy. I
added an individual CLA and a corporate CLA process, because the license needs to
support the project's long-term structure. I wrote a security policy, a code of
conduct, a support guide, and a contribution guide. I added issue forms, a pull
request template, CI, a `main` ruleset, Dependabot, CodeQL, and a seeded backlog
with 15 starter issues.

I also fixed the security issues that should never appear in a public
repository: a webhook path that could log the expected secret, an internal
authentication check that failed open when a variable was missing, and public
endpoints without rate limits. Those fixes are in the first public release.

The lesson: the code is the easy part to show. The trust and contribution
systems around it are the real launch work.

## What I'm still figuring out

Open source does not answer every question.

- **How much should the hosted product share?** The repository is the source of
  truth for the marketplace, but deployment configuration and provider accounts
  stay private.
- **How do I keep the first-response promise?** The target is 48 hours. That is
  manageable with a small backlog, but it will not scale without help.
- **Which contributions should be maintainer-led?** Mobile-native work is one
  example. It needs macOS, Xcode, and a native rebuild, so it stays
  maintainer-led for now while JavaScript-only mobile work is open.
- **When should the project stop being pre-launch?** The local stack is designed
  to work end to end, but it still needs a final validation on a machine with
  Docker. The hosted product is not a full public demo yet. I would rather be
  honest about that than pretend the launch is further along than it is.

## What's next

The roadmap is public. The next pieces are Redis-backed rate limiting,
withdrawal-timeout reconciliation, Playwright coverage for the core flows,
service tests for more modules, a self-hosting guide, release automation, mobile
CI, and an accessibility audit.

None of those are secrets. They are the kind of work that gets better when more
than one person can see the code.

## How to help

If you work with Next.js, NestJS, React Native, accessibility, testing, or
developer experience, I would love your feedback.

- Browse the repository: <REPO_URL>
- Pick up a `good first issue` or a `help wanted` issue.
- Comment before starting significant work so two people do not duplicate it.
- Read the contribution guide and sign the CLA when your first pull request
  opens.
- If you find a security issue, use the private reporting process. Do not open a
  public issue.

The most useful thing you can do right now is try the local setup and tell me
where it breaks. That feedback is worth more than a star.
```
