# Security Policy

## Supported versions

SkillEx is pre-launch. Security fixes are applied to the `main` branch and to the latest release, if one exists. If you are running a fork or an older deployment, update to the latest commit before reporting an issue that may already be fixed.

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, discussions, or pull requests.

Use GitHub's private vulnerability reporting:

**<https://github.com/richard-kenneth/skillex/security/advisories/new>**

If that link is not available, open a discussion titled `Security contact request` **without technical details** and ask a maintainer to enable a private channel. A maintainer will respond with a private way to share the report.

### What to include

- the affected component (web, API, mobile, shared package, or deployment);
- the version, commit, or environment where you reproduced the issue;
- clear reproduction steps or a proof of concept;
- the impact you believe the issue has;
- any suggested fix or mitigation; and
- whether you want public credit.

Do not include real user data, production secrets, or other people's personal information. Use test accounts and redact logs.

## What to expect

- We aim to acknowledge a report within **3 business days**.
- We aim to provide an initial assessment within **7 business days**.
- Fix and disclosure timelines depend on severity and complexity. We will keep you informed and coordinate disclosure with you.
- We may ask you to test a fix in a private branch or prerelease.

## Scope and safe harbor

This policy covers the SkillEx repository and the project's own deployments. It does not authorize testing against third-party services, user accounts, or data you do not own.

We will not pursue legal action for good-faith security research that follows this policy and applicable law, provided you:

- do not access, modify, or exfiltrate data that is not yours;
- do not disrupt the service or other users;
- do not use social engineering, phishing, or physical attacks;
- give us a reasonable opportunity to fix the issue before public disclosure; and
- comply with applicable law.

## Out of scope

- vulnerabilities in third-party dependencies that are already publicly known and have an available fix (report them upstream, but tell us if SkillEx is affected);
- missing security headers or configuration suggestions without a demonstrated impact;
- spam, brute-force, or denial-of-service reports without a reproducible, project-specific issue; and
- reports that require access to a compromised account or a device you do not own.

## Contact

Security reports: use the private reporting link above. General questions: open a discussion in the repository. Do not send security details to a public channel.
