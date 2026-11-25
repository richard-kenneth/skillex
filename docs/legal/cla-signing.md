# CLA signing and contact runbook

**Status:** repository-side implementation complete. Ready for external service configuration.

## 1. Decision

| Area                          | Channel                                                                        | Why                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Individual CLA                | Hosted CLA Assistant (`cla-assistant.io`)                                      | GitHub authentication, automatic PR status, versioned signatures, and the Project Owner's personal email is not published in the repository |
| Corporate CLA                 | `legal@richardkenneth.com` or a GitHub Discussion, then private                | Corporate signatures need authority checks and Schedule A; the hosted service does not manage corporate CLAs                                |
| Security reports              | GitHub private vulnerability reporting; `security@richardkenneth.com` fallback | Private and GitHub-native; the email fallback serves reporters without GitHub                                                               |
| Code of Conduct               | `conduct@richardkenneth.com`                                                   | Reporters should not have to post publicly first                                                                                            |
| Trademark, licensing, privacy | `legal@richardkenneth.com` or GitHub Discussions                               | Privacy law requires a contact that does not depend on a GitHub account                                                                     |
| General questions             | GitHub Discussions or issues                                                   | Community-visible                                                                                                                           |

The Project Owner's personal email address is not published in the repository. The `@richardkenneth.com` addresses are role addresses that forward to a private inbox; see section 4.8.

## 2. Individual CLA flow

1. A contributor opens a pull request.
2. CLA Assistant comments on the pull request with a link to the CLA.
3. The contributor signs in with GitHub and accepts.
4. The assistant records the GitHub username, GitHub user ID, pull request, date, CLA version, the required 18+ confirmation, and optional custom fields.
5. The assistant sets the CLA status check. Branch protection requires it before merge.
6. The contributor signs once per CLA version. A new Gist revision triggers re-acceptance.

## 3. Corporate CLA flow

1. The company emails `legal@richardkenneth.com` or opens a **Corporate CLA** discussion using the template in `.github/DISCUSSION_TEMPLATE/corporate-cla.yml`. The public template asks only for the company name, country, and an approximate contributor count.
2. A maintainer verifies the request: company identity, signatory authority, and registration details. Do not ask for or accept signed documents, employee names, or usernames in the public thread.
3. The maintainer sends a private submission channel. Options:
   - an e-signature service (recommended: audit trail and signer authentication);
   - a private Google Form with file upload, restricted to the company, with a link to `PRIVACY.md`; or
   - another private channel agreed with the company.
4. The company completes Schedule A, has an authorized signatory sign `CLA-CORPORATE.md`, and returns the signed agreement and Schedule A through the private channel.
5. The maintainer stores the signed documents in private project storage and adds the authorized GitHub usernames to the CLA Assistant allowlist. Use exact usernames, not broad wildcards. The allowlist entry covers only contributions the corporation has authorized.
6. The maintainer confirms to the company that the listed usernames are covered. The company must notify the maintainer of changes to Schedule A.

Corporate contributors who are not covered by an active corporate CLA must sign the individual CLA. If an authorized contributor also contributes in a personal capacity, they must sign the individual CLA for those contributions and tell a maintainer so the corporate allowlist entry can be reviewed.

## 4. Setup runbook

### 4.1 Legal terms

- [x] Terms finalized for `CLA.md`, `CLA-CORPORATE.md`, `TRADEMARK.md`, `SECURITY.md`, and `PRIVACY.md`.
- [x] Contracting entity and governing law confirmed.
- [x] Hosted CLA Assistant terms and data processing confirmed.
- [x] Electronic signature process confirmed for individual and corporate CLAs.

### 4.2 Create the CLA Gist

From the repository root:

```bash
node scripts/create-cla-gist.mjs --public
```

The script creates a public Gist containing `CLA.md` and a `metadata` file with the optional custom fields. It prints the Gist URL. The Gist is public because the CLA is a public document; do not put personal data in it.

Keep email addresses and URLs out of the `metadata` descriptions. CLA Assistant
renders that file as markdown before reading it as JSON, so an address becomes an
autolink with quotes and the signing page fails with a JSON parse error. The
script now refuses to publish metadata that contains either.

When `CLA.md` changes, edit the `CLA.md` file in the existing Gist. Do not create a new Gist, or existing links will break. The new Gist revision causes contributors to re-accept the updated CLA.

### 4.3 Configure CLA Assistant

- [ ] Sign in at <https://cla-assistant.io> with the `richard-kenneth` GitHub account.
- [ ] Install the CLA Assistant GitHub App for the `richard-kenneth/skillex` repository.
- [ ] Link the repository to the Gist from step 4.2.
- [ ] Set the minimum change threshold if desired. The default (any change) is appropriate for a code repository.
- [ ] Add maintainers and trusted bots to the allowlist. Use exact usernames; avoid broad wildcards.
- [ ] Confirm that the CLA Assistant privacy policy link in `PRIVACY.md` is current.

### 4.4 Branch protection

- [ ] Require the CLA Assistant status check before merging to the default branch.
- [ ] Do not allow administrators to bypass the check for external contributions.
- [ ] Keep the default `GITHUB_TOKEN` permissions read-only for normal CI. CLA Assistant is an external GitHub App and does not need a `pull_request_target` workflow in this repository.

### 4.5 Test

CLA Assistant does not process private repositories: it only requests the scopes
that public repositories allow, so no status is posted while the repository is
private (see
[cla-assistant#600](https://github.com/cla-assistant/cla-assistant/issues/600)).
Run this test immediately after the visibility change and before announcing the
launch.

- [ ] Open a test pull request from a GitHub account that has not signed.
- [ ] Confirm the bot comments, the status is pending or failing, and the pull request cannot merge.
- [ ] Sign the CLA with the test account and confirm the status turns green.
- [ ] Open a second pull request from the same account and confirm no re-signing is required.
- [ ] Update the Gist and confirm the bot requests re-acceptance.
- [ ] Test a corporate allowlist entry with a test account.

### 4.6 Discussions

- [x] Enable GitHub Discussions.
- [ ] Create a category named **Corporate CLA** with the slug `corporate-cla`.
- [ ] Create a category named **Trademark** with the slug `trademark`.
- [ ] Confirm the templates in `.github/DISCUSSION_TEMPLATE/` appear.
- [ ] Pin a short post explaining the CLA process and linking to `CONTRIBUTING.md`.

### 4.7 Security reporting

Private vulnerability reporting is not available while the repository is private. Enable it immediately after the public launch.

- [ ] Enable **Private vulnerability reporting** in the repository's security settings.
- [ ] Confirm the link in `SECURITY.md` opens the private report form.
- [ ] Add a security contact to the repository's security settings if GitHub offers one. Use `security@richardkenneth.com`, never the Project Owner's personal email.

### 4.8 Role email addresses

The public documents use these role addresses. Each must forward to a private inbox before launch:

| Address                       | Used in                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| `legal@richardkenneth.com`    | CLAs, `PRIVACY.md`, `TRADEMARK.md`, `CONTRIBUTING.md`, `SUPPORT.md` |
| `security@richardkenneth.com` | `SECURITY.md`, `SUPPORT.md`                                         |
| `conduct@richardkenneth.com`  | `CODE_OF_CONDUCT.md`, `SUPPORT.md`                                  |

- [ ] Confirm the Project Owner controls `richardkenneth.com`. If a different domain is used, replace `richardkenneth.com` in every file listed above.
- [ ] Create the three addresses as forwarding aliases (for example with Cloudflare Email Routing).
- [ ] Configure replies to send from the role address, not the personal inbox (for example Gmail "Send mail as" through an SMTP provider).
- [ ] Merge SPF so the domain has exactly one SPF record covering both the forwarding and sending providers. Add DKIM and a DMARC record.
- [ ] Send a test email to each address from an outside account, and reply from the role address. Confirm the personal address does not appear in the reply headers.
- [ ] Enable multi-factor authentication on the DNS, forwarding, and mailbox accounts.

## 5. Data handling

- Individual signatures are stored by CLA Assistant (SAP) in Azure Europe. Export a copy periodically to private project storage if you need an independent record.
- Corporate agreements and Schedule A are stored in private project storage. Do not commit them.
- Store signed agreements and identity documents privately; do not commit them. The Project Owner's personal email address should not be committed.
- See `PRIVACY.md` for the contributor-facing notice.

## 6. Operational rules

- Do not merge a contribution from a new contributor unless the CLA check is green or the contributor is covered by a recorded corporate CLA.
- Do not accept a public comment as the primary record of a CLA acceptance. Use the hosted service for individuals and the private process for corporations.
- Do not add a contributor to the allowlist without a recorded agreement. For corporate contributors, keep the signed agreement and Schedule A.
- Re-check the CLA when the Gist changes. Contributors must accept the new version.
- Review the CLA, this runbook, and the service's privacy and security terms at least annually or when the project structure changes.

## 7. Alternatives considered

### Google Forms for individual CLAs

A Google Form can collect a typed name and a timestamp, but it does not authenticate the contributor's GitHub identity, does not automatically gate pull requests, and requires manual reconciliation between form responses and pull request authors. It is a data-collection tool, not an e-signature service. It is acceptable as a private corporate intake option when combined with manual review, but not as the primary individual CLA flow.

### CLA Assistant Lite GitHub Action

The `contributor-assistant/github-action` repository was archived on 23 March 2026. We do not use an archived action for a legal or compliance control. The hosted CLA Assistant is actively maintained and avoids adding a `pull_request_target` workflow to this repository.

### DCO

A Developer Certificate of Origin is lighter, but it does not grant the Project Owner the right to relicense contributions under commercial terms. The project may offer commercial licenses in the future, so a CLA is required.

## 8. Open items

- [x] Create the Gist and configure CLA Assistant.
- [ ] Create the Discussions categories. Discussions itself is enabled.
- [ ] Enable private vulnerability reporting after the repository is public.
- [x] Add the CLA Assistant status check (`license/cla`) to branch protection.
- [ ] Test the full flow on day zero. CLA Assistant does not run on private
      repositories, so this cannot happen before the visibility change.
