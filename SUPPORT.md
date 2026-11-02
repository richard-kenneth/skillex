# Support

Thanks for using and contributing to SkillEx. This page explains where to ask
questions and how to get help without posting in the wrong place.

## Questions and ideas

Use **GitHub Discussions** for:

- setup and local-development questions;
- "how do I…?" questions;
- ideas that are not yet a scoped feature request;
- showing what you built or learned; and
- general community conversation.

<https://github.com/richard-kenneth/skillex/discussions>

Search existing discussions before opening a new one. If you find a related
thread, add to it instead of starting a duplicate.

## Bugs

Open a **bug report** with the repository's issue form:

<https://github.com/richard-kenneth/skillex/issues/new/choose>

Include the smallest reproduction you can, the expected and actual behavior,
your environment, and any relevant logs. Remove secrets, tokens, personal data,
and other people's information before posting.

## Feature requests

Open a **feature request** with the issue form. Describe the problem first, then
the proposed solution. If you are willing to implement it, say so; that helps
with prioritisation.

For a large change, open an issue or discussion before writing code so we can
agree on the approach and avoid duplicated work.

## Security vulnerabilities

**Do not open a public issue, discussion, or pull request for a security
vulnerability.** Follow [`SECURITY.md`](./SECURITY.md) and use GitHub's private
vulnerability reporting:

<https://github.com/richard-kenneth/skillex/security/advisories/new>

If you cannot use GitHub's private reporting, email **security@richardkenneth.com**.

## Contributing and the CLA

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, branch and commit
conventions, review expectations, and the Contributor License Agreement (CLA).
Code, documentation, and other material intended for inclusion in the project
cannot be merged until the CLA is signed or an active corporate CLA covers the
contributor.

## Corporate CLA, trademark, and licensing

Private legal requests go to **legal@richardkenneth.com**. Public questions can go in a
discussion.

- **Corporate CLA:** email legal@richardkenneth.com or open a discussion using the
  Corporate CLA template. Do not post signed agreements, employee details, or
  confidential information in the discussion.
- **Trademark:** see [`TRADEMARK.md`](./TRADEMARK.md) and open a discussion
  titled `SkillEx trademark request`, or email legal@richardkenneth.com.
- **Commercial licensing:** email legal@richardkenneth.com, or open a discussion titled
  `Commercial licensing request` with no confidential details.
- **Privacy requests:** email legal@richardkenneth.com. See [`PRIVACY.md`](./PRIVACY.md).

## Response expectations

SkillEx is pre-launch and maintained on a best-effort basis. We aim to
acknowledge new issues and pull requests within **48 hours**, but security
reports, legal requests, and mobile-native changes may take longer. Please be
patient and keep discussions constructive.

## Before you ask

To get a faster answer:

1. Read the [README](./README.md), [architecture notes](./docs/architecture.md),
   and [environment-variable reference](./docs/env-vars.md).
2. Search existing issues and discussions.
3. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` if your question is about a
   failing change.
4. Include the exact command, the full error, and the versions you are using.
5. Never paste real credentials, `.env` contents, access tokens, or personal
   data. Use redacted examples.

## Code of Conduct

All community spaces are covered by the
[Code of Conduct](./CODE_OF_CONDUCT.md). Report unacceptable behavior privately
to **conduct@richardkenneth.com**, not in a public thread.
