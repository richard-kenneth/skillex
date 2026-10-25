# Contributing to SkillEx

Thank you for considering a contribution to SkillEx. This guide explains how to get involved, what to expect from the review process, and the legal terms that apply to contributions.

SkillEx is a skill-exchange marketplace. The repository is a pnpm + Turborepo monorepo containing:

- `apps/web` — Next.js web application;
- `apps/api` — NestJS API and Prisma database layer;
- `apps/mobile` — Expo / React Native mobile application; and
- `packages/shared` — shared types, schemas, constants, and utilities.

## Contribution scope

We want contributions where they can be reviewed and maintained well.

| Area | Status | What we welcome |
| --- | --- | --- |
| `apps/web` | **Supported** | Features, bug fixes, accessibility, performance, tests, documentation, translations |
| `apps/api` | **Supported** | Features, bug fixes, tests, validation, security improvements, documentation |
| `packages/shared` | **Supported** | Types, schemas, utilities, translations, tests |
| `apps/mobile` | **Community-supported** | JavaScript/TypeScript changes, UI, i18n, accessibility, and Android-testable changes |
| iOS-native and release work | **Maintainer-led** | Native iOS changes, EAS credentials, app-store releases, LiveKit native upgrades |

The mobile app uses Expo development builds and native modules (including LiveKit WebRTC and a local audio-device module), so Expo Go alone is not enough. Android development works on Windows, Linux, and macOS. iOS-native work requires macOS/Xcode or a cloud build. If you want to work on mobile, open an issue first so we can confirm the change is testable and reviewable. See `docs/adr/0002-mobile-contribution-scope.md` for the full decision.

## Ways to contribute

- **Report a bug** by opening an issue with a minimal reproduction.
- **Request a feature** by opening an issue describing the problem and the proposed solution.
- **Improve documentation** — setup guides, env-var docs, architecture notes, and tutorials are valuable.
- **Write tests** for services, schemas, and UI behavior.
- **Fix a labeled issue** — `good first issue`, `help wanted`, `bug`, `docs`, or an `area:` label.
- **Review a pull request** if you have relevant experience.

Before starting significant work, open an issue or comment on an existing one so we can agree on the approach. This avoids duplicated effort and surprises in review.

## Contributor License Agreement (CLA)

We use a Contributor License Agreement instead of a DCO. The CLA lets the project accept your contribution under the AGPL while preserving the Project Owner's ability to offer commercial or other licenses in the future. You keep ownership of your work; you grant a broad license, not an assignment.

Read the full terms before contributing:

- **Individuals:** [`CLA.md`](./CLA.md)
- **Companies and other entities:** [`CLA-CORPORATE.md`](./CLA-CORPORATE.md)

### How to sign (individual)

1. Read `CLA.md`.
2. Open your first pull request. The CLA Assistant bot will comment with a link to the CLA.
3. Sign in with GitHub and click the acceptance button. The assistant records your GitHub username, GitHub user ID, the pull request, the date, and the CLA version.
4. You only need to sign once per CLA version. If the CLA changes, the assistant will ask you to accept the new version.

If the bot does not comment within a few minutes, leave a comment on the pull request asking a maintainer to check the CLA status. Do not paste personal information into the pull request.

If you do not want to sign the CLA, you can still participate in issues and discussions. We cannot merge code, documentation, or other material intended for inclusion in the project without a signed CLA.

### How to sign (corporate)

1. Read `CLA-CORPORATE.md`.
2. Open a **Corporate CLA** discussion using the template at <https://github.com/richard-kenneth/skillex/discussions>. Include the corporation's legal name, country of incorporation, the authorized signatory's name and title, and the GitHub usernames to be covered. Do not post the signed agreement, personal email addresses, or confidential information.
3. A maintainer will reply with a private submission channel. Use that channel to send the completed Schedule A and the signed agreement.
4. Wait for confirmation before submitting Contributions on the Corporation's behalf. The maintainer will add the authorized GitHub usernames to the CLA allowlist.

Corporate contributors who are not covered by an active corporate CLA must sign the individual CLA. If you also contribute in a personal capacity, sign the individual CLA for those contributions and tell a maintainer so your corporate allowlist entry can be reviewed.

If you are contributing as part of your job, please check with your employer before submitting. If your employer has not signed a Corporate CLA, you may need permission to contribute under the Individual CLA.

### CLA records and privacy

The individual CLA is administered through the hosted CLA Assistant service. We do not publish your personal email address or signed agreement in this repository. See [`PRIVACY.md`](./PRIVACY.md) for what is collected and how to make a privacy request.

## Development setup

The current setup is documented in:

- [`README.md`](./README.md)
- [`apps/api/README.md`](./apps/api/README.md)
- [`apps/web/README.md`](./apps/web/README.md)
- [`apps/mobile/README.md`](./apps/mobile/README.md)

The project is actively simplifying local setup. Until the one-command setup and Docker Compose environment land, expect to provide your own PostgreSQL instance and environment variables. Never commit real credentials or `.env` files.

## Branch names

Use a short, descriptive branch name:

- `feat/short-description`
- `fix/short-description`
- `docs/short-description`
- `test/short-description`
- `chore/short-description`

## Commit messages and pull requests

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and pull request titles:

```text
feat(web): add empty state to the skills list
fix(api): reject missing internal secret
docs: document optional integrations
```

Pull requests are squash-merged. The pull request title becomes the commit message, so make it descriptive.

A good pull request:

- links the issue it resolves (`Closes #123`);
- explains **what** changed and **why**;
- includes screenshots or a short recording for UI changes;
- lists the commands you ran to test it;
- calls out platform testing for mobile changes (for example, "tested on Android emulator" or "JS-only change, not run on a device");
- keeps unrelated changes out of the diff; and
- updates documentation when behavior or setup changes.

## Review expectations

- We aim to respond to new issues and pull requests within **48 hours**.
- A maintainer may ask for changes, close a PR that is out of scope, or take over a stalled PR.
- Mobile and security-sensitive changes may take longer because they need platform or maintainer review.
- Please do not open a pull request and disappear. If you need more time, say so in the thread.

## Security

Please do not report security vulnerabilities in public issues, discussions, or pull requests. Use GitHub's private vulnerability reporting:

**<https://github.com/richard-kenneth/skillex/security/advisories/new>**

See [`SECURITY.md`](./SECURITY.md) for what to include and what to expect. If private reporting is not available, open a discussion asking a maintainer to enable a private channel, but do not include exploit details in the public post.

## License and trademarks

By contributing, you agree that your Contributions are licensed to the public under the **GNU Affero General Public License, version 3 only (AGPL-3.0-only)**, and you grant the rights described in the CLA.

The SkillEx name, logo, and other brand identifiers are not licensed under the AGPL. See [`TRADEMARK.md`](./TRADEMARK.md).

## Questions

If you are unsure where to start, open a discussion or an issue and ask. We would rather answer a question than have you spend time on something that cannot be merged.
