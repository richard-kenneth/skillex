# Changelog

All notable changes to SkillEx are documented here. The project has not made its
first public release yet; everything below is unreleased.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once versioned releases begin.

## [Unreleased]

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
- Zero-account local stack: PostgreSQL, Redis, Mailpit, MinIO, and an optional
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

### Fixed

- Removed `posthog-react-native` from the Expo config plugins list; it is not a
  config plugin and caused `expo config` and `expo prebuild` to fail.
- Prevented Android builds from failing when the gitignored Firebase
  `google-services.json` is absent; remote push is enabled when the file is
  present.
- Replaced a malformed character in the web environment example comment.
- Corrected documentation that referred to mobile requirements and optional
  integration behavior inaccurately.

### Security

- Hardened authentication, trusted origins, CORS, webhook verification, upload
  policy, and internal secret comparisons.
- Added constant-time comparison for webhook and internal secrets, with
  fail-closed behavior when a secret is unset.
- Added startup rejection of placeholder secrets and partially configured
  security-sensitive integration groups.
- Added rate limits to public, authentication, upload, chat, payment, and
  webhook endpoints.
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
