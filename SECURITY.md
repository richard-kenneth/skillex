# Security Policy

This policy is issued by Richard Kenneth, the owner of the SkillEx project (the "Project Owner", "we", or "us").

## Supported versions

SkillEx is pre-launch. Security fixes are applied to the `main` branch and to the latest release, if one exists. If you are running a fork or an older deployment, update to the latest commit before reporting an issue that may already be fixed.

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, discussions, or pull requests.

Use GitHub's private vulnerability reporting:

**<https://github.com/theskillex/skillex/security/advisories/new>**

If you cannot use GitHub's private reporting, email **security@richardkenneth.com**. If you would rather not send full details by email, send a short summary without exploit details and ask for another private channel.

### What to include

- the affected component (web, API, mobile, shared package, or deployment);
- the version, commit, or environment where you reproduced the issue;
- clear reproduction steps or a proof of concept;
- the impact you believe the issue has;
- any suggested fix or mitigation; and
- whether you want public credit, and the name or handle to credit.

Do not include real user data, production secrets, or other people's personal information. Use test accounts and redact logs.

## What to expect

- We aim to acknowledge a report within **3 business days**.
- We aim to provide an initial assessment within **7 business days**.
- We will keep you informed while we work on a fix and coordinate disclosure with you.
- We may ask you to test a fix in a private branch or prerelease.
- We ask that you keep the report confidential until a fix is released or **90 days** have passed since your report, whichever comes first. We may agree a longer or shorter period with you, for example for an issue that is being actively exploited.

## Scope

**In scope:**

- the source code in this repository (web, API, mobile, and shared packages); and
- deployments operated by the Project Owner at `skil-ex2-web.vercel.app`.

**Prefer a local deployment.** `pnpm run setup` starts a complete local stack with demo data. Test against it whenever you can. Testing against a live deployment must be limited to the minimum needed to demonstrate the issue.

**Not in scope, and not authorized by this policy:**

- forks, self-hosted copies, and deployments operated by anyone other than the Project Owner;
- third-party services the project uses, including GitHub, Vercel, Render, Cloudflare, Flutterwave, LiveKit, Resend, PostHog, Expo, and the Apple App Store and Google Play. Report issues in those services to their owners under their own policies; and
- accounts, devices, and data that do not belong to you.

## Rules for testing

When testing a live deployment, you must:

- use only accounts you created for testing;
- not access, modify, delete, or exfiltrate data that is not yours;
- not test payment, escrow, withdrawal, payout, or points flows with real funds. Use the local stack and payment-provider test mode instead, and do not keep any money, points, or other value obtained through a vulnerability;
- not degrade or disrupt the service or other users, including through denial-of-service, load testing, or automated scanning that generates significant traffic;
- not use social engineering, phishing, or physical attacks; and
- comply with applicable law.

**If you encounter personal data, payment data, credentials, or secrets,** stop testing that issue, do not keep, copy, or share the data, report it to us immediately, and delete any copy you hold when we ask. This helps us meet our legal obligations to the people affected.

## Safe harbor

If you make a good-faith effort to follow this policy, we consider your research to be authorized by the Project Owner for the in-scope assets listed above, and we will not pursue or support legal action against you for it. If a third party brings legal action against you for research that followed this policy, we will make it known that your activities were authorized by us.

This safe harbor is given only by the Project Owner. It cannot authorize testing of third-party services, and it does not bind third parties. If you are unsure whether an activity is allowed, ask us first through a private channel.

## Rewards

We do not currently offer monetary rewards for reports. With your permission, we will credit you in the security advisory.

## Out of scope reports

- vulnerabilities in third-party dependencies that are already publicly known and have an available fix (report them upstream, but tell us if SkillEx is affected);
- missing security headers or configuration suggestions without a demonstrated impact;
- spam, brute-force, or denial-of-service reports without a reproducible, project-specific issue; and
- reports that require access to a compromised account or a device you do not own.

## Contact

Security reports: use the private reporting link above or email **security@richardkenneth.com**. General questions: open a discussion in the repository. Do not send security details to a public channel. Personal information you send in a report is handled as described in [`PRIVACY.md`](./PRIVACY.md).
