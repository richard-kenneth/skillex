# Changelog

All notable changes to SkillEx are documented here. The project has not made its
first public release yet; everything below is unreleased.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once versioned releases begin.

## [Unreleased]

### Changed

- Revised the individual and corporate CLAs: contributions are licensed to all
  recipients under the AGPL, the patent license is sublicensable and covers
  corporate Affiliates, contributors must be 18 or older, and Nigerian courts
  have non-exclusive rather than exclusive jurisdiction.
- Revised the privacy notice to cover security and Code of Conduct reports,
  name recipients, set retention periods, and explain how to complain to the
  Nigeria Data Protection Commission.
- Tightened the security policy's scope and safe harbor, and clarified the
  trademark policy for forks and self-hosted deployments.
- Added role email addresses for legal, privacy, security, and Code of Conduct
  contacts.
- Replaced the retired MinIO community image with SeaweedFS for the local
  S3-compatible stack.
- Made the local Compose host ports configurable through the repository `.env`
  file, bound the core services to `127.0.0.1`, and made `pnpm run setup` stop
  with an actionable message when a port is already in use instead of running
  migrations against a different local database.
- Upgraded the development and CI toolchain to Node.js 26 (Active LTS),
  pnpm 12.23.0, and Turborepo 2.11.13.
- Upgraded NestJS to 12.x across `apps/api` with native ESM testing, and
  Prisma to 7.10.1.
- Upgraded `apps/mobile` to Expo SDK 58, React Native 0.88.1, and React 19.3.0,
  adapting the floating tab bar navigation to Expo Router 58 and component refs
  to React 19 element instance types.
- Standardized ESLint 10.15.0, Prettier 3.10.1, and TanStack Query 5.108.4 across
  the workspace.
- Upgraded Next.js, Better Auth, Nodemailer, Zod, and other direct dependencies,
  added same-major security overrides for transitive packages, and moved
  build-only tooling to development dependencies.

### Added

- AGPL-3.0-only license, copyright notice, and trademark policy.
- Individual and corporate Contributor License Agreements, a privacy notice for
  contributor records, and a CLA signing runbook.
- Security policy with private vulnerability reporting and a documented
  response process.
- Contributor Covenant Code of Conduct with a private reporting process.
- Contribution guide covering scope, development setup, branch and commit
  conventions, review expectations, and mobile contribution tiers.
- Support guide, public roadmap, architecture overview, environment-variable
  reference, and mobile development guide.
- Issue forms for bug reports, feature requests, and documentation problems,
  plus CODEOWNERS and a pull request template.
- Architecture decision records for project foundations and mobile
  contribution scope.
- One-command local setup with generated secrets, Docker Compose services, and
  rich demo data.
- Zero-account local stack: PostgreSQL, Redis, Mailpit, SeaweedFS, and an optional
  LiveKit profile.
- Demo login and seeded users, skills, exchanges, reviews, referrals, points,
  notifications, and waitlist entries.
- Optional integration fallbacks for LiveKit, Flutterwave, Resend/SMTP, R2,
  OAuth, web push, PostHog, and Open Exchange Rates.
- Startup environment validation with required values, placeholder rejection,
  URL checks, and optional-group rules.
- Root quality scripts, PR CI, a development container, and example service
  tests for exchanges and points.
- Manual macOS workflows for unsigned iOS IPA builds.
- Grouped weekly Dependabot updates for the pnpm workspace, GitHub Actions,
  Docker, and the development container.
- CodeQL and OpenSSF Scorecard workflows that activate when the repository is
  public.
- Branded 1280x640 social preview image, also used as the README banner.
- GitHub repository settings runbook covering metadata, security features,
  rulesets, Actions permissions, Discussions, and the CLA Assistant.
- Seeded backlog with 9 `good first issue` and 6 `help wanted` issues covering
  API security, tests, accessibility, mobile CI, i18n, self-hosting, and E2E
  coverage.
- `👋 Start here` discussion linking setup, contribution guidance, and the
  starter backlog.
- Launch runbook with blocking gates, a day-zero checklist, channel sequencing,
  metrics, and incident response.
- Draft `v0.1.0` release notes, channel-ready announcement copy, a directory and
  newsletter checklist, and a build-in-public article draft.
- Demo capture guide covering storyboard, privacy checks, file sizes, and README
  insertion for a real screenshot or GIF.
- Demo GIF and four screenshots captured from the seeded local stack, with the
  GIF linked from the README after the social preview banner.

### Changed

- Rewrote the README around local setup, the demo experience, optional
  integrations, commands, architecture, mobile scope, and contribution paths.
- Documented the project setup command as `pnpm run setup` because `setup` is
  also a pnpm built-in command.
- Aligned the Expo deep-link scheme to `skil-ex` across the API, mobile app, and
  setup script so it matches `apps/mobile/app.json`.
- Documented `JWT_SECRET` and `API_BASE_URL` as accepted legacy/compatibility
  variables that current API runtime code does not read.
- Clarified the full list of seeded demo email addresses in the README.
- Updated the mobile guide to cover development builds, device networking,
  push notifications, LiveKit, native modules, and platform testing.
- Added `area: api`, `area: web`, `area: mobile`, `priority: high`,
  `needs triage`, and `blocked` labels, and renamed `documentation` to `docs`.
- Added the live landing page and waitlist link to the README.
- Refreshed the roadmap so completed community and GitHub work moves to Done and
  only the remaining launch gates stay in Now.

### Fixed

- Removed the email address from the CLA metadata description. CLA Assistant
  renders the metadata file as markdown, so the address became an autolink whose
  quotes broke the JSON, and the signing page failed with a parse error instead
  of showing the CLA. The Gist script now rejects email addresses and URLs in
  metadata descriptions.
- Accepted both UUID and 32-character user IDs in exchange request payloads.
  The seeded demo users use UUIDs, so requesting an exchange with the demo
  account failed validation with "Validation failed" even though the match was
  valid.
- Built the deploy image without corepack and copied the Prisma schema before
  installing dependencies. The API's `postinstall` script runs
  `prisma generate`, so the image build aborted with exit code 1 when only the
  package manifest was present.
- Ensured the API build emits `dist/main.js` when it runs after the typecheck
  script. The incremental build cache could otherwise make `nest build` skip
  output after `dist` was cleared.
- Fixed presigned uploads against local S3-compatible storage. Loopback
  endpoints now use path-style URLs, and the AWS SDK no longer adds an
  empty-body checksum that strict S3 servers rejected with `BadDigest`.
- Made `pnpm run setup` and the `db:*` scripts find the Docker Desktop CLI on
  Windows when it is installed outside `PATH`.
- Removed `posthog-react-native` from the Expo config plugins list; it is not a
  config plugin and caused `expo config` and `expo prebuild` to fail.
- Prevented Android builds from failing when the gitignored Firebase
  `google-services.json` is absent; remote push is enabled when the file is
  present.
- Replaced a malformed character in the web environment example comment.
- Corrected documentation that referred to mobile requirements and optional
  integration behavior inaccurately.
- Normalized shell script line endings to LF, so the dev container's
  `post-create.sh` runs on Windows checkouts instead of failing on
  `set -euo pipefail`.
- Moved dev container dependencies into a per-container volume and the pnpm
  store into the container filesystem, so opening the dev container no longer
  replaces or corrupts a host `node_modules`.

### Security

- Hardened authentication, trusted origins, CORS, webhook verification, upload
  policy, and internal secret comparisons.
- Added constant-time comparison for webhook and internal secrets, with
  fail-closed behavior when a secret is unset.
- Added startup rejection of placeholder secrets and partially configured
  security-sensitive integration groups.
- Added rate limits to public, authentication, upload, chat, payment, and
  webhook endpoints.
- Added per-route limits to the public skill catalogue, review creation,
  referral application, and the LiveKit webhook.
- Redacted waitlist email addresses in API logs while keeping the event and
  source context needed to debug duplicates.
- Removed personal contact details from public documentation in favor of
  GitHub-mediated private channels.
- Enabled Dependabot alerts and automated security fixes.
- Added a `main` ruleset requiring a pull request, one approval, passing CI, and
  resolved conversations, with squash-only merges, no force-push or branch
  deletion, and a pull-request-only admin bypass.
- Documented the post-public security settings: secret scanning, push
  protection, private vulnerability reporting, CodeQL, and fork PR approval.
- Documented the remaining pre-launch security work: rotate exposed
  credentials and scan the full Git history before the repository is made
  public.
