# Launch runbook

This is the maintainer checklist for SkillEx's first public release, `v0.1.0`.
The repository is still **private**. Do not change visibility until every
blocking gate below is cleared.

Making a repository public cannot be undone in practice: clones and forks can
keep the full history even if the repository is made private again. Treat the
visibility change as a one-way operation.

Related documents:

- [`docs/github-settings.md`](../github-settings.md) for repository settings and
  post-public security configuration;
- [`ROADMAP.md`](../../ROADMAP.md) for the public plan and current priorities;
- [`SECURITY.md`](../../SECURITY.md) for the vulnerability reporting process;
- [`docs/legal/cla-signing.md`](../legal/cla-signing.md) for the CLA setup.

## Blocking gates

| Gate                     | Done when                                                                                                                   | Status                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Credential rotation      | Every credential exposed outside the repository, including screenshots, chat, AI tools, and local backups, has been rotated | **Blocked**                                                |
| Full-history secret scan | Both Gitleaks and Trufflehog full-history scans are clean                                                                   | **Clean (Gitleaks + Trufflehog)**                          |
| Dependency risk          | `pnpm audit --prod` has no critical advisories, and every remaining advisory is documented with a rationale                 | **0 critical; residual advisories documented**             |
| Legal review             | CLA, Corporate CLA, `SECURITY.md`, `PRIVACY.md`, and `TRADEMARK.md` terms finalized                                         | **Ready**                                                  |
| CLA Assistant            | The app is installed, linked to the CLA Gist, required by the `main` ruleset, and tested with an unsigned account           | **Pending setup**                                          |
| Local stack validation   | `pnpm run setup`, `pnpm dev`, and the dev container work on a machine with Docker                                           | **Compose + clean clone + dev container validated**        |
| Landing page             | The current `main` build is deployed with SkillEx branding, working counters, a working waitlist, and no stale links        | **Redeploy pending**                                       |
| Demo assets              | The README has a real screenshot or GIF captured from seeded demo data                                                      | **Pending**                                                |
| Release notes            | [`release-notes-v0.1.0.md`](./release-notes-v0.1.0.md) is final, with the release date and commit recorded                  | **Draft ready**                                            |
| Post-public settings     | The day-zero checklist below is ready to run immediately after the visibility change                                        | **Ready**                                                  |

Do not use this table as evidence that a gate is complete. Record the date,
owner, and private evidence for each gate in the private launch record.

### Dependency risk

Run `pnpm audit --prod` before the release. Do not accept a critical advisory.
For high and moderate advisories, upgrade the direct dependency or add a
same-major override in `pnpm-workspace.yaml`. If no safe patch exists, record
the advisory below with the reason it is accepted.

| Advisory               | Severity | Path                                                 | Why it is accepted                                                                                                                                                                    |
| ---------------------- | -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decode-uri-component` | High     | `query-string` 7 in React Navigation and Expo Router | The patched release is ESM-only and would break the CommonJS consumers; exploitation needs a crafted deep-link query string. Revisit when React Navigation moves to `query-string` 9. |
| `image-size`           | High     | Metro asset pipeline                                 | Build-time only. Metro 0.84 calls the 1.x callable export; 2.x changed the export shape. Revisit with the next Expo SDK.                                                              |
| `zod` 3.25.76          | High     | `@expo/cli`                                          | Build-time only. Expo pins Zod 3; the API, web app, and shared package use Zod 4.                                                                                                     |
| `uuid` 7.0.3           | Moderate | `xcode` through `@expo/config-plugins`               | Build-time only. The advisory needs a caller-provided buffer, which this path does not use.                                                                                           |
| `glob` 13.0.6          | Moderate | Expo CLI and `@nestjs/cli`                           | Build-time only. The patched 14 release is a major upgrade that Expo pins away from.                                                                                                  |
| `minimatch` 10.2.6     | Moderate | ESLint 10, Expo fingerprint, and `glob` 13           | Build-time only. The patched 11 release is a major upgrade.                                                                                                                           |
| `deepmerge` 4.3.1      | Low      | `@expo/config`                                       | Build-time only. No patched release exists.                                                                                                                                           |

Re-run the audit after every Expo SDK or React Navigation upgrade. Remove an
entry when its path resolves to a patched version.

## Day zero: make the repository public

Run these steps in order, and stop if any check fails.

### 1. Final local checks

```bash
git status --short
git log --oneline --decorate -10
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Confirm that:

- no `.env` file, generated native directory, build output, or local tooling
  cache is tracked;
- the working tree is clean and the release commit is on `main`;
- CI is green on the release commit;
- the release branch was merged through a pull request, not pushed directly to
  `main`; and
- the required check name in the `Protect main` ruleset matches the CI job name
  exactly.

### 2. Make the repository public

Only after the blocking gates and the checks above are complete:

```bash
gh repo edit richard-kenneth/skillex \
  --visibility public \
  --accept-visibility-change-consequences
```

### 3. Apply post-public security settings immediately

```bash
gh repo edit richard-kenneth/skillex \
  --enable-secret-scanning \
  --enable-secret-scanning-push-protection

gh api --method PUT \
  repos/richard-kenneth/skillex/private-vulnerability-reporting

gh api --method PUT \
  repos/richard-kenneth/skillex/actions/permissions/fork-pr-contributor-approval \
  -f approval_policy=first_time_contributors
```

Then verify:

```bash
gh api repos/richard-kenneth/skillex/actions/permissions/workflow
gh api repos/richard-kenneth/skillex/private-vulnerability-reporting
gh api repos/richard-kenneth/skillex/actions/permissions/fork-pr-contributor-approval
gh api repos/richard-kenneth/skillex/rules/branches/main
gh api repos/richard-kenneth/skillex/vulnerability-alerts
gh api repos/richard-kenneth/skillex/automated-security-fixes
```

Do **not** enable CodeQL default setup. The repository uses advanced setup in
[`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml). Confirm that
the CodeQL and Scorecard workflows start now that the repository is public.

### 4. Finish the GitHub UI steps

- Upload [`docs/assets/social-preview.png`](../assets/social-preview.png) under
  **Settings → General → Social preview**.
- Create the **Corporate CLA** and **Trademark** Discussions categories with the
  slugs `corporate-cla` and `trademark`.
- Pin the **👋 Start here** discussion at
  <https://github.com/richard-kenneth/skillex/discussions/17>.
- Pin the repository on the owner's profile and add a profile README link.
- Confirm the issue forms, Discussion templates, `SECURITY.md` advisory link,
  and `CODEOWNERS` all resolve.

### 5. Publish the release

Use the release commit on `main`. Remove the draft comment from the release
notes before creating the GitHub release.

```bash
git switch main
git pull --ff-only
git tag -a v0.1.0 -m "SkillEx v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 \
  --title "SkillEx v0.1.0" \
  --notes-file docs/launch/release-notes-v0.1.0.md
```

### 6. Smoke-test from a clean checkout

On a machine with Docker:

```bash
git clone https://github.com/richard-kenneth/skillex.git
cd skillex
pnpm install
pnpm run setup
pnpm dev
```

Sign in with the seeded demo account, browse skills, open an exchange, and
confirm that Mailpit receives the expected local email. If this fails, fix the
setup before announcing the launch.

If a port is already used by another program, setup stops and names the
variable to change in the repository `.env` file. Confirm that path too: it must
not connect to the other program's database.

Record the operating system, Docker version, and any skipped step in the
private launch record. The dev container must be booted at least once before
this gate is complete.

## Week A: soft launch

Post where the project is already known first. Do not start with broad
communities until the repository has survived a few days of real traffic.

| Order | Channel                                            | Asset                                                        | Notes                                                                |
| ----- | -------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1     | Repository, release, Start here discussion         | Release notes, pinned discussion                             | The canonical source of truth                                        |
| 2     | X / Twitter thread                                 | [`announcements.md`](./announcements.md)                     | Include the demo GIF and the waitlist link                           |
| 3     | LinkedIn                                           | [`announcements.md`](./announcements.md)                     | Lead with the problem and the open-source angle, not the stack alone |
| 4     | OSCA, She Code Africa, local dev groups            | [`announcements.md`](./announcements.md)                     | Ask for feedback and contributors; follow each group's rules         |
| 5     | Dev.to article, then Hashnode with a canonical URL | [`build-in-public-article.md`](./build-in-public-article.md) | Publish the article after the repository is public                   |
| 6     | Directories and newsletters                        | [`announcements.md`](./announcements.md)                     | Submit only where the project fits; do not mass-submit               |
| 7     | Respond, triage, and fix onboarding problems       | Issues and Discussions                                       | Keep the first-response target under 48 hours                        |

Do not post to Reddit, Hacker News, or Product Hunt during Week A. Give the
setup and security settings a few days of quiet testing first.

## Weeks B and C: broader reach

| Channel            | Angle                                                                                                 | Rules and notes                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Reddit             | Pick one subreddit per angle: AGPL story, zero-account dev stack, Next.js, NestJS, or build-in-public | Read each subreddit's self-promotion rules; do not post identical copy                          |
| Up For Grabs       | Beginner-friendly issues                                                                              | Submit a pull request to their repository and follow its contributing guide                     |
| goodfirstissue.dev | Indexed `good first issue`s                                                                           | Submit the repository through the site's form                                                   |
| CodeTriage         | Contributor alerts                                                                                    | Add the repository and choose a sensible alert volume                                           |
| Awesome lists      | awesome-nestjs, awesome-nextjs, awesome-react-native, awesome-selfhosted                              | Follow each list's inclusion rules; wait for the self-hosting guide before the self-hosted list |
| Newsletters        | Node Weekly, React Status, Console.dev                                                                | Use the submission form; write a short, specific note                                           |
| Show HN            | Live demo and open-source angle                                                                       | Only when the product is usable; Tuesday–Thursday, around 8–10am ET                             |
| Product Hunt       | Product launch aimed at users                                                                         | Prepare product assets; this is not a repository launch                                         |
| OSCAFest           | Talk or lightning demo                                                                                | Submit through the event's call for proposals                                                   |
| Hacktoberfest 2027 | Seasonal contributor event                                                                            | Add the `hacktoberfest` topic in late September 2027, not before                                |

The `hacktoberfest` topic is currently applied to the repository. Remove it
until the 2027 event if the project should not appear in Hacktoberfest searches.

## Metrics and response

Review these weekly for the first eight weeks, then monthly.

| Metric                        | Where to find it                                        |
| ----------------------------- | ------------------------------------------------------- |
| Traffic and referrers         | Repository **Insights → Traffic**                       |
| Stars, forks, and watchers    | Repository header                                       |
| Unique cloners                | Repository **Insights → Traffic**                       |
| First-time contributors       | Pull requests and contributor graph                     |
| Median time to first response | Issues and pull requests                                |
| Merged external pull requests | Pull request list                                       |
| Waitlist signups from GitHub  | Landing-page analytics with the `utm_source=github` tag |

Targets:

- first response on new issues and pull requests within **48 hours**;
- triage pass at least twice a week;
- thank every first-time contributor publicly, with their permission; and
- close or relabel starter issues that are no longer actionable.

## Ongoing content

- Publish a short demo clip or "what shipped this week" note every two weeks.
- Thank every first-time contributor publicly, with their permission, and link
  to the merged pull request.
- Add `all-contributors` to the README after the first few external
  contributions.
- Review the roadmap monthly and close or relabel starter issues that are no
  longer actionable.

## Incident response

- **A secret is exposed.** Rotate it first. Do not rewrite public history
  without explicit approval. Check secret-scanning alerts and assess whether the
  credential was used.
- **A malicious pull request or workflow run appears.** Do not run untrusted
  code. Require approval for first-time contributors, close the pull request,
  and report the account if appropriate.
- **A community member violates the Code of Conduct.** Follow
  [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) and use the private reporting
  process. Do not argue in public.
- **The launch causes a setup failure.** Open a pinned issue, fix the
  documentation or script, and post a short known-issue note. Do not blame
  contributors for following the documented steps.
- **The launch must be paused.** Stop announcements. If the repository is still
  private, keep it private. If it is already public, fix forward and communicate
  clearly; making it private again does not remove existing clones.

## Launch assets

- [`release-notes-v0.1.0.md`](./release-notes-v0.1.0.md)
- [`announcements.md`](./announcements.md)
- [`build-in-public-article.md`](./build-in-public-article.md)
- [`demo-script.md`](./demo-script.md)

## Do not

- Do not publish a personal email address. Use GitHub issues, Discussions, or
  private vulnerability reporting.
- Do not claim production readiness, real users, revenue, or metrics that have
  not been measured.
- Do not enable CodeQL default setup while the advanced workflow exists.
- Do not use `pull_request_target` for contributor workflows.
- Do not post the same text to every community. Write for each audience and
  follow its rules.
- Do not make the repository public, push a tag, or publish a release without
  explicit approval.
