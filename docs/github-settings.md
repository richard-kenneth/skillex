# GitHub repository settings

This runbook records the repository settings that cannot be expressed as files in
Git. It covers Phase 4 of the open-source launch plan and the checks needed before
the repository is made public.

The repository is still **private**. Several GitHub security features are only
available on public repositories, or require GitHub Advanced Security on private
repositories. Those items are marked **after public** and must be completed
immediately after the visibility change, before announcing the launch.

## Current status

| Area                                           | Status                                                    |
| ---------------------------------------------- | --------------------------------------------------------- |
| Description, homepage, topics                  | Applied                                                   |
| Discussions                                    | Enabled                                                   |
| Squash-only merges and auto-delete branches    | Applied                                                   |
| `main` ruleset                                 | Applied                                                   |
| Dependabot alerts and automated security fixes | Applied                                                   |
| Grouped Dependabot updates                     | `.github/dependabot.yml`                                  |
| CodeQL workflow                                | `.github/workflows/codeql.yml` (skipped while private)    |
| OpenSSF Scorecard workflow                     | `.github/workflows/scorecard.yml` (skipped while private) |
| Secret scanning and push protection            | After public                                              |
| Private vulnerability reporting                | After public                                              |
| Fork PR approval for first-time contributors   | After public                                              |
| Social preview image                           | Ready; upload pending                                     |
| Discussions categories                         | Two policy categories pending                             |
| CLA Assistant                                  | Pending legal review                                      |
| Organization and 2FA                           | Recommended later                                         |

## Repository metadata

| Setting     | Value                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Description | `Open-source skill-exchange marketplace: trade skills, earn points, learn live. Next.js + NestJS + Expo.` |
| Homepage    | `https://skil-ex2-web.vercel.app` (existing deployment; replace when a public landing page exists)        |
| Visibility  | **Private** until the launch gates are cleared                                                            |

Topics: `skill-exchange`, `marketplace`, `nextjs`, `nestjs`, `expo`,
`react-native`, `prisma`, `postgresql`, `livekit`, `turborepo`, `typescript`,
`tailwindcss`, `better-auth`, `africa`, `nigeria`, `edtech`, `open-source`,
`good-first-issue`, `hacktoberfest`.

The 1280x640 social preview asset is at
[`docs/assets/social-preview.png`](./assets/social-preview.png). Upload it in
GitHub under **Settings → General → Social preview**. Do not use a screenshot
that contains personal data, tokens, or production URLs.

## Security

### Dependabot

Dependabot alerts and automated security updates are enabled. The configuration
in [`.github/dependabot.yml`](../.github/dependabot.yml) groups minor and patch updates
weekly for:

- the pnpm workspace (`npm` ecosystem at the repository root);
- GitHub Actions;
- the root `Dockerfile`;
- the development container.

Major updates stay as individual pull requests. The open pull request limits are
5 for npm and Actions, and 3 for Docker and dev containers.

### Secret scanning and push protection

Secret scanning and push protection are **not available** on this private
repository without GitHub Advanced Security. Enabling them returned HTTP 422.

After the repository is public, run:

```bash
gh repo edit richard-kenneth/skillex \
  --enable-secret-scanning \
  --enable-secret-scanning-push-protection
```

Then verify both settings in **Settings > Code security and analysis** and push
a harmless test commit to confirm push protection is active.

### CodeQL

[`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml) uses CodeQL **advanced
setup** for JavaScript and TypeScript. The job is skipped while the repository is
private and runs on pull requests, pushes to `main`, and a weekly schedule once
the repository is public.

Do not enable CodeQL **default setup** while this workflow exists. GitHub treats
default setup and advanced setup as alternatives; choose one and remove or
disable the other.

### Private vulnerability reporting

Private vulnerability reporting is **not available** on a private repository.
After the repository is public:

1. Open **Settings > Code security and analysis**.
2. Enable **Private vulnerability reporting**.
3. Open the link in [`SECURITY.md`](../SECURITY.md) and confirm the private report
   form loads.
4. Keep the public issue tracker for non-security bugs only.

### OpenSSF Scorecard

[`.github/workflows/scorecard.yml`](../.github/workflows/scorecard.yml) publishes
Scorecard results once the repository is public. It is optional, but it provides
a public badge and highlights supply-chain gaps. The job is skipped while the
repository is private.

After the first public run, the badge can be added to the README:

```markdown
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/richard-kenneth/skillex/badge)](https://securityscorecards.dev/viewer/?uri=github.com/richard-kenneth/skillex)
```

## Protecting `main`

The active ruleset is named **Protect main** and applies to the default branch.
Repository admins can bypass it only through a pull request, so the owner can
merge their own pull requests. External contributors cannot bypass it.

| Rule                                  | Setting                        |
| ------------------------------------- | ------------------------------ |
| Require a pull request before merging | Enabled                        |
| Required approvals                    | 1                              |
| Dismiss stale reviews on push         | Enabled                        |
| Require review thread resolution      | Enabled                        |
| Require status checks                 | `Lint, typecheck, test, build` |
| Require branches to be up to date     | Enabled                        |
| Block force pushes                    | Enabled                        |
| Block branch deletion                 | Enabled                        |
| Allowed merge methods                 | Squash only                    |
| Admin bypass                          | Pull-request only              |

The required check is the CI job name in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml). After the first pull request,
confirm that GitHub reports exactly that check name. If it differs, update the
ruleset before relying on it.

The CLA Assistant status check is not in the ruleset yet. Add it only after legal
review and the CLA Assistant setup are complete. See
[`docs/legal/cla-signing.md`](./legal/cla-signing.md).

## Actions

| Setting                                       | Status                   |
| --------------------------------------------- | ------------------------ |
| Default `GITHUB_TOKEN` permissions            | Read-only                |
| Allow GitHub Actions to approve pull requests | Disabled                 |
| iOS IPA workflows                             | `workflow_dispatch` only |
| Fork PR approval for first-time contributors  | After public             |

The iOS workflows build unsigned IPAs and are intentionally manual. They must
not run automatically on pull requests, because they use macOS runners and
repository secrets.

After the repository is public, set **Fork pull request workflows from outside
collaborators** to require approval for first-time contributors. This is not
available on private repositories.

## Access

- Contributors work through forks and pull requests.
- Give the **Triage** role first, then **Write** only after sustained, trusted
  contributions.
- Do not add outside collaborators with admin access.
- Moving to an organization such as `skillex-org` is recommended later, after the
  launch. Enable 2FA for every organization owner when that happens.

## Discussions

Discussions is enabled. GitHub created the default Announcements, General, Ideas,
Polls, Q&A, and Show and tell categories. Keep Announcements, Ideas, Q&A, and
Show and tell; General and Polls are optional.

Create these two policy categories manually in **Discussions > Categories**:

| Category      | Slug            | Purpose                                               |
| ------------- | --------------- | ----------------------------------------------------- |
| Corporate CLA | `corporate-cla` | Requests that start the private corporate CLA process |
| Trademark     | `trademark`     | Trademark and brand-use requests                      |

The templates in `.github/DISCUSSION_TEMPLATE/` use the `corporate-cla` and
`trademark` slugs.

Pin a short **Start here** post that links to `README.md`, `CONTRIBUTING.md`,
`ROADMAP.md`, and `SUPPORT.md`. Do not post personal contact details.

## CLA Assistant

CLA Assistant remains blocked on legal review. After the CLA and Corporate CLA
are approved:

1. Follow [`docs/legal/cla-signing.md`](./legal/cla-signing.md).
2. Install the CLA Assistant GitHub App on the repository.
3. Add its status check to the **Protect main** ruleset.
4. Open a test pull request from an account that has not signed and confirm the
   merge is blocked until the check passes.

## Verification

```bash
gh repo view richard-kenneth/skillex \
  --json visibility,description,repositoryTopics,hasDiscussionsEnabled,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge

gh api repos/richard-kenneth/skillex/rulesets
gh api repos/richard-kenneth/skillex/rules/branches/main
gh api repos/richard-kenneth/skillex/actions/permissions/workflow
gh api repos/richard-kenneth/skillex/vulnerability-alerts
gh api repos/richard-kenneth/skillex/automated-security-fixes
```

After public, also verify:

```bash
gh api repos/richard-kenneth/skillex/actions/permissions/fork-pr-contributor-approval
gh api repos/richard-kenneth/skillex/private-vulnerability-reporting
```

## Launch gate

Do not change the repository to public until:

- exposed credentials have been rotated;
- the full Git history has been scanned;
- legal review of the CLA, Corporate CLA, `SECURITY.md`, and `PRIVACY.md` is
  complete;
- the post-public security settings above are applied immediately after the
  visibility change; and
- the Phase 1 and Phase 2 blockers in the launch plan are resolved.

See [`SECURITY.md`](../SECURITY.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), and
[`docs/legal/cla-signing.md`](./legal/cla-signing.md).
