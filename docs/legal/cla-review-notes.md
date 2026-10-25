# CLA review notes

- **Status:** Draft for review by qualified legal counsel
- **Version reviewed:** CLA 1.0 and Corporate CLA 1.0, effective 25 October 2026
- **Owner:** Richard Kenneth
- **Related:** `CLA.md`, `CLA-CORPORATE.md`, `CONTRIBUTING.md`, `TRADEMARK.md`, `SECURITY.md`, `PRIVACY.md`, `docs/legal/cla-signing.md`

> **Important:** These notes are a drafting aid, not legal advice. They explain the policy choices in the CLA so counsel can review the terms efficiently. The CLA should not be relied on as final until counsel has reviewed it and the Project Owner has confirmed the open questions below.

## 1. What this CLA is designed to do

SkillEx is licensed to the public under **AGPL-3.0-only**. The project may also want to offer commercial licenses, a hosted service, or other terms in the future. A DCO alone does not give the Project Owner the right to relicense contributions under those other terms. This CLA is therefore a **license-back** agreement:

- the contributor keeps copyright ownership;
- the contributor grants the Project Owner a broad, irrevocable copyright license, including the right to relicense;
- the contributor grants a patent license;
- the contributor waives or consents to non-assertion of moral rights to the extent permitted by law;
- the contributor confirms they have the right to submit the contribution; and
- the Project Owner can assign the agreement to a future company.

This is a common pattern for projects that use a copyleft public license and also offer commercial licensing. It is intentionally contributor-friendly in one important respect: it does **not** require copyright assignment.

## 2. Clause-by-clause review notes

### Parties and definitions

- The Project Owner is currently **Richard Kenneth**, an individual. If the project is transferred to a company, the assignment clause in Section 12 allows the Project Owner to assign the agreement. Counsel should confirm that the assignment language is effective for the relevant jurisdiction and that the company should instead be named directly in a future version.
- "Contribution" is intentionally broad and covers code, documentation, tests, designs, data, and configuration. It excludes material clearly marked "Not a Contribution."
- "Submit" covers GitHub pull requests, issues, chat, and other channels. This is broader than some CLAs, which only cover pull requests. The broad definition reduces ambiguity about code snippets pasted into issues, but it also means contributors should be told to mark casual suggestions as "Not a Contribution" if they do not want them covered.
- "Public License" is defined as **AGPL-3.0-only**, not "or later." This preserves the Project Owner's ability to choose future license versions and avoids automatic adoption of future AGPL versions.

### Copyright license

- The grant is perpetual, worldwide, non-exclusive, royalty-free, fully paid-up, irrevocable, transferable, and sublicensable.
- The grant explicitly includes the right to **relicense** under proprietary or commercial terms. This is the key dual-licensing provision.
- The grant is to the Project Owner, not directly to all recipients. Recipients receive the Project under the Public License when the Project Owner distributes it under that license. This avoids granting every recipient a separate proprietary license.
- The contributor retains ownership. This is a deliberate choice to reduce friction and avoid the perception that the project requires copyright assignment.
- Consideration is acknowledged. Counsel should confirm whether this is sufficient under Nigerian law and the laws of likely contributor jurisdictions.

### Patent license

- The patent grant follows the structure of widely used CLAs (for example, the Apache ICLA).
- The defensive-termination clause is standard: if an entity sues over the contribution or the project, its patent license for that contribution/project terminates.
- Counsel should confirm that the patent language is appropriate for the Project Owner's jurisdiction and for contributors who may be subject to different patent laws.

### Moral rights

- The clause waives moral rights to the fullest extent permitted and, where waiver is not permitted, obtains consent and a non-assertion commitment.
- Moral rights are not uniformly waivable. Nigeria's Copyright Act 2022 recognizes moral rights, and other jurisdictions (for example, France) have strong moral rights. The fallback language is intended to preserve the project's ability to use the contribution even where a waiver is ineffective.
- Counsel should confirm that the clause is enforceable and whether a separate consent from contributors in certain jurisdictions is advisable.

### Representations and warranties

- The contributor confirms original authorship or sufficient rights, employer permission, no third-party IP conflicts, no confidential information, no conflicting license, no malicious code, and legal capacity.
- The minor provision requires parental/guardian consent. Counsel should confirm whether the project wants to accept contributions from minors at all. Many projects require contributors to be adults or have guardian consent.
- The contributor agrees to notify the Project Owner if a representation becomes inaccurate. This is a useful risk-management provision.

### Third-party material

- Contributors must identify third-party material and its license.
- The project should not accept code under a license that is incompatible with AGPL-3.0-only or the Project Owner's commercial licensing plan.
- Counsel should confirm whether the project needs a separate inbound license policy for third-party code or a contributor attestation.

### No warranty and no obligation to use

- Contributions are provided "AS IS."
- The Project Owner has no obligation to accept, merge, or maintain a contribution. This is important for community management and avoids implied obligations.

### Trademarks

- The CLA does not grant trademark rights.
- The separate `TRADEMARK.md` policy governs use of the SkillEx name and logo.
- Counsel should confirm that the trademark policy is consistent with the CLA and the AGPL.

### Term and termination

- The contributor can stop contributing at any time.
- Termination does not revoke the license for contributions already submitted. This is essential for the project's ability to continue distributing the code.
- The Project Owner can terminate for material breach, but prior grants survive.
- The survival clause lists the sections that continue after termination.

### Governing law and venue

- The agreement chooses **Nigerian law** and **Lagos State courts**.
- This is a practical choice if the Project Owner is based in Nigeria. It may be inconvenient for contributors in other countries, and some contributors or their employers may object.
- Alternatives to discuss with counsel:
  - the laws of England and Wales, with courts in London;
  - the laws of the Project Owner's future company's jurisdiction;
  - arbitration under a recognized institution (for example, the Lagos Court of Arbitration or ICC), which can be more neutral and confidential; or
  - no exclusive venue, with the Project Owner able to enforce in any competent court.
- The current clause preserves the Project Owner's ability to seek injunctive relief in any competent court, which is important for IP enforcement.

### Assignment

- The Project Owner can assign the agreement to a successor or a company formed to hold or commercialize the project. This is important for future financing, acquisition, or restructuring.
- The contributor cannot assign without consent. This is standard.

### Privacy and records

- The Project Owner may store names, GitHub usernames, emails, acceptance dates, and contribution records.
- Individual signatures are processed by the hosted CLA Assistant (SAP), which stores signature data in Azure Europe. Corporate agreements and Schedule A are stored in private project storage.
- `PRIVACY.md` explains what data is collected, why, where it is stored, how long it is retained, who has access, how contributors can request access, correction, or deletion, and the legal basis for processing.
- Counsel should review `PRIVACY.md` against the Nigeria Data Protection Act 2023 and, if contributors are in the EU/UK, the GDPR/UK GDPR.

### General

- Entire agreement, amendment, severability, no waiver, electronic signature, and headings are standard.
- The amendment clause says a new version applies only after the contributor accepts it. This is contributor-friendly and avoids retroactive changes.
- The electronic signature clause is intended to cover click-through acceptance through the hosted CLA Assistant and signed corporate agreements. Counsel should confirm enforceability under the Nigerian Evidence Act 2011 and any applicable e-signature law.

## 3. Open questions for counsel

Please confirm or advise on the following before the CLA is used publicly:

1. **Contracting entity.** Should the Project Owner be Richard Kenneth personally, or a company? If a company, what is its legal name, jurisdiction, and registered address? Should the company be named directly in the CLA now, or should we rely on the assignment clause?
2. **Governing law and venue.** Is Nigeria/Lagos the right choice? Would arbitration be better for international contributors? Are there mandatory consumer or employment law issues?
3. **Copyright license vs. assignment.** Is the license-back sufficient to support dual licensing and enforcement? Are there jurisdictions where a written assignment or notarization is required for the Project Owner to relicense?
4. **Relicensing.** Is the express right to relicense under proprietary terms enforceable and sufficiently clear? Should the CLA include a separate "commercial licensing" acknowledgment or FAQ?
5. **Patent grant.** Is the patent grant scope and defensive termination appropriate? Should it cover affiliates or subsidiaries of the contributor?
6. **Moral rights.** Is the waiver/consent enforceable in Nigeria and in the jurisdictions where contributors are likely to be located? Should we require a separate moral-rights consent for contributors in certain countries?
7. **Consideration.** Is the consideration language sufficient? Does Nigerian law require anything else?
8. **Electronic signature.** Is click-through acceptance through the hosted CLA Assistant enforceable? What records should be retained? Does the service's record satisfy evidentiary requirements?
9. **Minors.** Should the project accept contributions from minors with guardian consent, or require contributors to be at least 18?
10. **Employees and contractors.** Is the Corporate CLA sufficient to bind employees and contractors? Should it require an explicit schedule of authorized contributors, or is a general authorization by role/email domain enough?
11. **Third-party code.** Does the project need a separate inbound license policy or a contributor attestation for third-party material?
12. **Privacy.** Does `PRIVACY.md` cover the hosted CLA Assistant and the private corporate submission channel? What retention period and data-processing terms should be added?
13. **Trademark.** Is `TRADEMARK.md` consistent with the CLA and the AGPL? Should the trademark policy be a separate legal document with its own governing law?
14. **Enforcement.** If a contributor breaches the CLA, what remedies does the Project Owner have? Should the CLA include indemnity or injunctive relief language?
15. **AGPL compatibility.** Does the CLA's relicensing right conflict with any representation the project makes to contributors about the AGPL? How should the project describe dual licensing in public materials?
16. **Versioning.** Is the versioning/acceptance mechanism sufficient? Should the project require re-acceptance for material changes?
17. **Record retention.** How long should signed CLAs and contribution records be kept? Where should they be stored?
18. **Bankruptcy/insolvency.** Does the assignment clause survive an insolvency or change of control? Should the project use a separate IP holding entity?
19. **Corporate e-signature.** Is a typed signature plus an audit trail through a private form acceptable for the Corporate CLA, or should the project require a dedicated e-signature service or a wet signature?

## 4. Comparison with common CLA models

| Model | Copyright | Relicensing | Patent grant | Moral rights | Notes |
| --- | --- | --- | --- | --- | --- |
| **Apache ICLA** | License back, not assignment | Broad, but not always explicit about proprietary relicensing | Yes, with defensive termination | Not addressed in detail | Well-known, corporate-friendly; designed for Apache projects |
| **Harmony CLA** | Flexible; can be license or assignment | Configurable | Configurable | Configurable | Modular templates; requires customization |
| **CNCF CLA** | License back | Broad | Yes | Not central | Used by cloud-native projects; includes corporate option |
| **Google CLA** | License back | Broad | Yes | Not central | Widely used; simple online flow |
| **SkillEx CLA (this draft)** | License back, not assignment | Explicit | Yes, with defensive termination | Waiver + fallback consent | Designed for AGPL + potential commercial licensing; Nigerian law |

The SkillEx CLA is closest to a license-back model with an explicit relicensing right. The main differences from Apache/CNCF are the explicit commercial relicensing language, the moral-rights clause, and the Nigerian governing law.

## 5. Selected signing workflow

The repository-side implementation is in place. The external services still need to be configured after legal review.

### 5.1 Individual: hosted CLA Assistant

- The signing copy of the CLA is stored in a GitHub Gist. `scripts/create-cla-gist.mjs` builds the Gist from `CLA.md` and `docs/legal/cla-metadata.json`.
- Contributors sign in with GitHub and accept on the pull request. The service records the GitHub username, user ID, pull request, date, and Gist revision.
- The service sets a status check; branch protection requires it.
- The Project Owner's personal email address is not published in the repository.
- Why not CLA Assistant Lite: the `contributor-assistant/github-action` repository was archived on 23 March 2026. We do not use an archived action for a legal or compliance control, and the hosted service avoids `pull_request_target` in this repository.
- Why not a Google Form for individuals: it does not authenticate GitHub identity or gate pull requests automatically, and it creates a manual reconciliation burden. A form is a data-collection tool, not an e-signature service.

### 5.2 Corporate: private, manually reviewed

- The company starts a Corporate CLA discussion using the template in `.github/DISCUSSION_TEMPLATE/corporate-cla.yml`.
- A maintainer verifies the company and signatory, then sends a private submission channel.
- Acceptable private channels: an e-signature service (recommended), a private Google Form with file upload and a link to `PRIVACY.md`, or another agreed private method.
- The signed agreement and Schedule A are stored privately. Authorized GitHub usernames are added to the CLA Assistant allowlist.
- Do not accept signed agreements or personal contact details in public threads.

### 5.3 Other contacts

- Security: GitHub private vulnerability reporting (`SECURITY.md`).
- Trademark: GitHub Discussions (`TRADEMARK.md`).
- Privacy: `PRIVACY.md`.

### 5.4 Manual fallback

Until the hosted service is configured, maintainers may record a contributor's acceptance manually in private storage. Do not merge a contribution from a new contributor without a recorded acceptance. The manual fallback is temporary and should not be used after the hosted service is live.

## 6. Operational checklist

- [ ] Counsel reviews and approves the CLA and Corporate CLA.
- [ ] Confirm the contracting entity and governing law.
- [ ] Review `PRIVACY.md` and publish it before collecting signatures.
- [ ] Create the CLA Gist with `node scripts/create-cla-gist.mjs --public`.
- [ ] Configure hosted CLA Assistant and test individual signing.
- [ ] Require the CLA Assistant status check in branch protection.
- [ ] Test corporate signing and Schedule A updates.
- [ ] Add maintainers and trusted bots to the allowlist; use exact usernames.
- [ ] Enable private vulnerability reporting and confirm the `SECURITY.md` link works.
- [ ] Enable Discussions and create the `corporate-cla` and `trademark` categories.
- [ ] Document how signatures are stored and who can access them.
- [ ] Add the CLA check to the PR template and CONTRIBUTING.
- [ ] Decide how to handle contributors who refuse the CLA.
- [ ] Decide how to handle contributions from minors.
- [ ] Decide how to handle contributions made before the CLA existed (if any).
- [ ] Version the CLA and record the effective date.
- [ ] Review the CLA annually or when the project structure changes.

## 7. Notes for the public explanation

Contributors will ask why a CLA is needed. A short, honest explanation works best:

> SkillEx is licensed under the AGPL. We may also offer commercial licenses or a hosted service in the future. The CLA lets us keep the code open while preserving that option. You keep ownership of your work; you give us a broad license to use, distribute, and relicense it. You can stop contributing at any time, but the license for contributions you have already made continues.

Avoid saying the CLA is "required by law" or that it "transfers copyright." Neither is true. Be clear that it is a license, not an assignment, and link to the full text.
