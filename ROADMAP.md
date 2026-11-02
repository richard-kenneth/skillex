# Roadmap

This roadmap is directional, not a promise. Priorities change as the project
grows, and dates are deliberately omitted. To influence it, comment on an
existing issue or start a discussion.

Status meanings:

- **Now** — required before the first public release.
- **Next** — planned for the first few public releases.
- **Later** — valuable, but not yet scheduled.
- **Done** — shipped on the `main` branch.

## Now — pre-launch

- [ ] Complete the remaining security work: rotate exposed credentials, scan the
      full Git history with Trufflehog, and validate the Docker Compose and
      dev-container flows on a machine with Docker.
- [ ] Complete legal review of the CLA, Corporate CLA, `SECURITY.md`, and
      `PRIVACY.md`.
- [ ] Install and test the CLA Assistant after legal review.
- [ ] Finish the post-public GitHub setup: private vulnerability reporting,
      secret scanning and push protection, and fork pull-request approval.
      CodeQL advanced setup, Dependabot, the `main` ruleset, Discussions, labels,
      and the starter backlog are already in place.
- [ ] Add a real screenshot or demo GIF to the README, and redeploy the landing
      page from the current `main` so the SkillEx branding and waitlist are
      current.
- [ ] Run the first public release checklist and tag `v0.1.0`. Confirm the
      required CI check name on the first pull request.

## Next — first public releases

- [ ] Move rate-limit storage from memory to Redis so limits work across
      multiple API instances.
- [ ] Reconcile withdrawal timeouts: confirm the final Flutterwave transfer
      status before refunding points after an HTTP timeout.
- [ ] Add Playwright end-to-end coverage for sign-up, sign-in, profile setup,
      exchanges, and points.
- [ ] Add service tests for reviews, referrals, notifications, and uploads.
- [ ] Add a self-hosting guide for the API, web app, PostgreSQL, Redis, object
      storage, and optional LiveKit.
- [ ] Automate releases and `CHANGELOG.md` with release-please.
- [ ] Improve first-run diagnostics in `pnpm run setup` for common Docker,
      port, and database problems.

## Later — product and community

- [ ] Add mobile CI for lint, typecheck, and JS-only tests.
- [ ] Expand the mobile development guide and add Android-focused good first
      issues.
- [ ] Complete an accessibility audit of the web and mobile apps.
- [ ] Expand translations and review the i18n workflow.
- [ ] Add admin and moderation tooling for skills, exchanges, and reports.
- [ ] Add observability guidance: structured logs, metrics, traces, and alerting.
- [ ] Evaluate a hosted demo environment for contributors and evaluators.
- [ ] Revisit the mobile contribution tier after three months or five external
      mobile pull requests, whichever comes first.

## Done

- [x] Choose AGPL-3.0-only and publish the license, notice, and trademark
      policy.
- [x] Adopt individual and corporate CLAs, and publish the privacy notice and
      CLA signing runbook.
- [x] Publish the contribution guide, security policy, and architecture decision
      records.
- [x] Publish the issue forms, Code of Conduct, support guide, architecture
      notes, environment-variable reference, mobile development guide, and
      GitHub settings runbook.
- [x] Apply the repository description, topics, Discussions, squash-only merges,
      auto-delete branches, Dependabot alerts and updates, and the `main`
      ruleset. Commit the CodeQL and OpenSSF Scorecard workflows.
- [x] Add a zero-account local stack with PostgreSQL, Redis, Mailpit, SeaweedFS, and
      optional LiveKit.
- [x] Make optional integrations degrade safely and validate environment
      variables at startup.
- [x] Add rich demo seed data and a documented test login.
- [x] Add one-command setup, root quality scripts, PR CI, and dev-container
      support.
- [x] Add example service tests for exchanges and points.
- [x] Seed 9 `good first issue`s and 6 `help wanted` issues, and publish the
      Start here discussion.
- [x] Add the live landing page and waitlist link to the README.

## How to help

- Pick up an issue labeled `good first issue` or `help wanted`.
- Comment on an issue before starting significant work.
- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and sign the CLA.
- For questions, see [`SUPPORT.md`](./SUPPORT.md).
