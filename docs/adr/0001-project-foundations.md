# ADR 0001: Open-source project foundations

- **Status:** Accepted
- **Date:** 25 October 2026
- **Decision owner:** Richard Kenneth
- **Supersedes:** the DCO recommendation in the open-source launch plan

## Context

SkillEx is preparing to become a public open-source repository. Before the repository is made public, we need durable decisions on licensing, contributor terms, trademarks, naming, contribution scope, and the primary goal of the launch. These decisions affect every later phase: security work, contributor setup, documentation, GitHub settings, and launch messaging.

The repository is currently private at `richard-kenneth/skillex`. The product has been developed as a commercial skill-exchange marketplace with payments, live video, points, referrals, and a mobile app. The codebase is a pnpm + Turborepo monorepo with a Next.js web app, a NestJS API, an Expo/React Native mobile app, and a shared TypeScript package.

## Decisions

### 1. License: AGPL-3.0-only

**Decision:** License the repository under the **GNU Affero General Public License, version 3 only (AGPL-3.0-only)**.

**Rationale:**

- SkillEx is a network-delivered marketplace. The AGPL's Section 13 requires operators of modified network services to offer the corresponding source to users. That protects the project from a competitor taking the code, improving it privately, and running a closed hosted service.
- The project may offer paid plans, payments, or a hosted version. A copyleft license keeps the community's improvements available while still allowing the Project Owner to offer services and support.
- AGPL is a recognized norm for open-source SaaS and marketplace projects.

**Consequences:**

- `LICENSE` contains the full AGPL-3.0 text.
- All workspace packages declare `AGPL-3.0-only`.
- `NOTICE` records the copyright and the trademark carve-out.
- Contributors grant the Project Owner additional rights through the CLA, including the right to relicense. This is what makes future commercial licensing possible.
- If the project later wants maximum permissiveness instead of protection, changing the license requires the agreement of all copyright holders or the rights granted in the CLA. This decision should not be reversed casually.

### 2. Contributor terms: Individual and Corporate CLA

**Decision:** Require a **Contributor License Agreement (CLA)** for code, documentation, and other material submitted for inclusion in the project. Provide two paths:

- `CLA.md` for individuals contributing on their own behalf; and
- `CLA-CORPORATE.md` for companies and other entities whose employees or contractors contribute within the scope of their work.

**Key terms:**

- Contributors **retain copyright ownership**; the CLA is a license, not an assignment.
- The Project Owner receives a perpetual, worldwide, non-exclusive, royalty-free, irrevocable, transferable, and sublicensable copyright license.
- The Project Owner may **relicense** Contributions under the AGPL and under proprietary or commercial terms. This is the basis for any future dual-licensing or commercial offering.
- Contributors grant a patent license with defensive termination.
- Contributors waive or consent to the non-assertion of moral rights to the extent permitted by law.
- Contributors confirm they have the right to submit the Contribution, including employer permission when relevant.
- The Project Owner may assign the CLA to a future company that holds or operates the project.
- The agreement is governed by Nigerian law, with non-exclusive jurisdiction for Nigerian courts.

> **Amended 2 November 2026:** Nigerian courts have **non-exclusive** jurisdiction instead of exclusive Lagos venue. The CLA also licenses Contributions directly to all recipients under the AGPL, makes the patent license sublicensable, and requires contributors to be 18 or older.

**Why a CLA instead of a DCO:**

A DCO is a lightweight attestation that the contributor has the right to submit the code under the project's license. It does not grant the Project Owner the additional right to relicense the contribution under different terms. Because SkillEx may offer commercial licensing or a hosted commercial service, the CLA provides the legal flexibility the project needs. The trade-off is more friction for contributors, which we mitigate with an automated signing flow and a clear explanation of why the CLA exists.

**Consequences:**

- The CLA must be signed before a contribution is merged. Issues and discussions remain open to everyone.
- Individual CLAs are administered through the hosted CLA Assistant. Corporate CLAs are handled through a private, manually reviewed process. See `docs/legal/cla-signing.md`.
- Corporate contributors must provide Schedule A and keep it current.
- The CLA is versioned. A future version applies only after a contributor accepts it.
- The Project Owner's personal email address is not published in the repository. Contact is through GitHub, as described in `SECURITY.md`, `PRIVACY.md`, and `TRADEMARK.md`. _(Amended 2 November 2026: role addresses `legal@`, `security@`, and `conduct@richardkenneth.com` forward to a private inbox, because privacy law requires a contact route that does not depend on a GitHub account.)_

### 3. Trademark: code is open, brand is reserved

**Decision:** Publish `TRADEMARK.md`. The AGPL covers the code; it does not grant rights to the SkillEx name, logo, app icon, domain names, or social handles.

**Rationale:**

- A license does not prevent a fork from using the project's brand in a confusing way.
- A trademark policy lets the community refer to SkillEx accurately while preventing impersonation and endorsement claims.
- The policy permits factual references, links, and "forked from SkillEx" statements, while requiring a different name and logo for modified distributions.

**Consequences:**

- Forks that distribute or publicly host modified versions must rebrand.
- The Project Owner should register the trademark when the project has enough traction to justify the cost.
- The contact for trademark requests is published in `TRADEMARK.md`.

### 4. Naming: SkillEx, with `skillex` as the technical slug

**Decision:** Use **SkillEx** as the product and project name. Use **`skillex`** as the repository, package, and technical slug. The GitHub repository already uses `skillex`, so no repository rename is required.

**Rationale:**

- The GitHub repository is already `richard-kenneth/skillex`, and the name uses the double-l spelling requested for the project.
- The public brand is written **SkillEx** (capital S and E) as a two-part compound. The technical slug is all lowercase (`skillex`) because repository names, package names, and URLs are case-sensitive and already established. The difference is intentional: **SkillEx** is the display name, `skillex` is the identifier.
- The existing codebase mixes `skil-ex2`, `skilex`, `SkilEx`, `Skil-Ex`, and `Skill Exchange`. That inconsistency makes the project harder to recognize and search for.
- A single product name plus a single technical slug is enough. We do not need to rename every historical identifier at once, especially where doing so would break authentication, deep links, push notifications, or existing deployments.

**Naming rules:**

| Context | Name to use |
| --- | --- |
| Product, README, UI, emails, legal documents | **SkillEx** |
| Repository, root package, npm scope, technical slug | **`skillex`** / `@skillex/*` |
| Internal app package names | `api`, `web`, `mobile` (not published) |
| Generic concept (a trade of skills) | "skill exchange" (lowercase, descriptive) |

**Legacy identifiers retained for now:**

Some identifiers are wired into external services and will be migrated separately, outside this repository or in a coordinated change:

| Identifier | Current value | Why it is retained |
| --- | --- | --- |
| Expo slug | `skil-ex` | Tied to the EAS project and update channels |
| Expo scheme | `skil-ex` | Used for auth redirects, deep links, and secure storage prefixes |
| iOS bundle identifier | `com.skilex` | Tied to the Apple app record, provisioning, and push credentials |
| Android application ID | `com.skil_ex` | Tied to Firebase/Google services and signing credentials |
| Production domains and email addresses | `richardkenneth.com`, `skilex-api`, `skil-ex2-web.vercel.app` | External DNS, email, OAuth, and deployment configuration |
| Local storage keys | `skilex_ref`, `skilex_auto_applied`, `skil-ex-theme-mode` | Changing them would discard existing local state |

These are deployment and platform identifiers, not the public brand. They should be migrated only with a coordinated plan that updates the corresponding external services and redirect URIs.

**Consequences:**

- The root package is `skillex`; the shared package is `@skillex/shared`. The internal app packages keep the short names `api`, `web`, and `mobile` because they are never published.
- The mobile app display name and web metadata use **SkillEx**.
- Historical identifiers remain until their external dependencies can be changed safely. The launch plan's "rename everything" item is therefore interpreted as "make the public name consistent now; migrate platform identifiers deliberately."

### 5. Contribution scope: web and API supported; mobile tiered, not excluded

**Decision:** Treat `apps/web`, `apps/api`, and `packages/shared` as the supported contribution surface for launch. Treat `apps/mobile` as **community-supported**, with iOS-native and release work remaining maintainer-led. Do **not** mark mobile as out of scope.

**Rationale and details:** See `docs/adr/0002-mobile-contribution-scope.md`. In short: the "mobile needs macOS" concern is real but narrower than a blanket exclusion. Android development works on Windows and Linux, JS/TS changes can be reviewed without a Mac, and cloud macOS runners already exist for iOS builds. At the same time, the custom native modules and development-client requirement make mobile onboarding harder than web/API, and native releases need maintainer control. A tiered policy captures the contributions without pretending the support burden is the same.

**Consequences:**

- Mobile PRs are welcome with an `area: mobile` label and a platform-test note.
- The initial `good first issue` batch focuses on web, API, shared, docs, and tests. Mobile good-first-issues are added after the mobile setup guide and a reliable Android development path are documented.
- `docs/mobile-development.md` is a Phase 2 deliverable.
- Mobile is included in lint/typecheck CI where practical, but native builds are not required on every PR.

### 6. Primary goal: contributors first for the repository launch, users through the product

**Decision:** The primary goal of the open-source launch is to attract **contributors and build trust in the project**. The primary goal of the landing page, waitlist, and app-store presence is to attract **users**. Track the two separately.

**Rationale:**

- A repository launch succeeds when people can understand the project, run it, and make a first contribution. Stars without contributors are a weak signal.
- The product's user funnel is better served by the landing page, waitlist, demo, and app-store listing than by the repository alone.
- Mixing the two goals leads to launch messaging that serves neither audience.

**Consequences:**

- Phase 2 (contributor experience) is the highest-priority phase.
- Launch posts lead with the problem, a demo, the stack, and a clear "help wanted" invitation.
- Metrics include first-time contributors, median time to first response, merged external PRs, and waitlist signups from GitHub (with a UTM tag), tracked separately.

## Follow-up work

These items are intentionally outside Phase 0 but are required before the repository becomes public:

1. Complete Phase 1 security fixes and secret rotation. The launch plan's audit findings must be fixed before the repository is public.
2. Run gitleaks and trufflehog over the full history.
3. Add the Docker Compose environment, optional-integration behavior, seed data, and one-command setup (Phase 2).
4. Publish the full README, Code of Conduct, Security Policy, issue forms, PR template, and architecture/environment docs (Phase 3).
5. Enable the CLA assistant and test the individual and corporate signing flows.
6. Apply GitHub security settings, branch protection, Dependabot, CodeQL, and private vulnerability reporting (Phase 4).
7. Finalize the CLA, trademark policy, and privacy notice for launch.
8. Migrate legacy platform identifiers (domains, bundle IDs, Expo slug/scheme) only when the external services can be updated together.

## References

- `LICENSE` — AGPL-3.0-only
- `NOTICE` — copyright and trademark notice
- `TRADEMARK.md` — brand policy
- `CLA.md` — individual CLA
- `CLA-CORPORATE.md` — corporate CLA
- `CONTRIBUTING.md` — contribution process and CLA signing
- `docs/adr/0002-mobile-contribution-scope.md` — mobile scope decision
