# ADR 0002: Mobile contribution scope

- **Status:** Accepted
- **Date:** 25 October 2026
- **Decision owner:** Richard Kenneth
- **Related:** `docs/adr/0001-project-foundations.md`

## Context

The open-source launch plan recommends starting with web and API contributions and making mobile "maintainer-led" for now. The stated reason is that the mobile app needs macOS and Xcode, which limits who can contribute.

That recommendation is directionally reasonable, but it is too broad. The repository's mobile app is not a simple native project, and the constraints are more nuanced than "mobile requires a Mac." We need a policy that protects maintainer capacity without unnecessarily closing off a large part of the product.

### What the mobile app actually requires

The mobile app is an Expo / React Native application with:

- **Expo development builds** (`expo-dev-client`), not just Expo Go;
- **LiveKit React Native WebRTC** and its Expo config plugin;
- a **local native module** (`apps/mobile/modules/audio-device-detector`) with Android Kotlin and iOS Swift implementations;
- **push notifications** (`expo-notifications`) and Firebase/Google services configuration;
- **native build configuration** through `app.json`, config plugins, and generated `android/` and `ios/` directories that are gitignored; and
- a partial **web target** (`react-native-web`, `app-tabs.web.tsx`, web-specific hooks), but the root layout imports LiveKit React Native unconditionally, so web is not a complete substitute for device testing.

### What contributors can and cannot do without a Mac

| Task | Windows | Linux | macOS |
| --- | --- | --- | --- |
| Edit JS/TS/UI/i18n code | Yes | Yes | Yes |
| Run the app on Android emulator/device | Yes, with Android Studio | Yes, with Android Studio | Yes |
| Run the app on iOS simulator | No | No | Yes, with Xcode |
| Build an iOS development client locally | No | No | Yes |
| Build iOS in the cloud | Yes, via EAS Build or the existing GitHub Actions macOS workflow | Yes | Yes |
| Test native iOS behavior | Limited | Limited | Yes |
| Test LiveKit audio/video end-to-end | Android only | Android only | Both |

The repository already has `.github/workflows/build-ios-ipa.yml` and `build-ios-ipa-debug.yml`, which build unsigned iOS IPAs on `macos-latest` via `workflow_dispatch`. That means maintainers can produce iOS artifacts without every contributor owning a Mac, but contributors still cannot run an iOS simulator locally.

### Why mobile matters

- SkillEx is aimed at a mobile-first audience, including users in African markets.
- The mobile app contains core product flows: onboarding, matches, exchanges, points, notifications, and live video rooms.
- Excluding mobile entirely would remove a large contributor surface and signal that mobile is a second-class part of the project.
- Some of the highest-value contributions — accessibility, i18n, empty states, UI polish, bug fixes — are JS/TS changes that do not require native iOS work.

### Why full parity is not realistic yet

- There is no mobile test suite and no mobile CI job today.
- Native builds are slow and platform-specific.
- The custom native module and LiveKit native dependencies make onboarding harder than web/API.
- App-store releases, signing credentials, EAS credentials, and native iOS review are maintainer responsibilities.
- A flood of mobile PRs that cannot be tested or reviewed would create a bad contributor experience.

## Options considered

### Option A: Exclude mobile from contribution for now

**Pros:** Lowest review and support burden; keeps the launch focused on web and API; avoids native build support questions.

**Cons:** Removes a large, visible part of the product; discourages mobile-focused contributors; contradicts the project's mobile-first market; leaves mobile bugs and UX issues without community help; makes the repository look web-only even though the product is not.

### Option B: Treat mobile exactly like web and API

**Pros:** Simple message; maximizes the contributor surface; signals that mobile is first-class.

**Cons:** Overpromises support; contributors will hit native build and device-testing walls; maintainers will spend time on setup issues; iOS-native PRs may sit unreviewed; CI cannot enforce native quality yet.

### Option C: Tiered inclusion (chosen)

**Pros:** Welcomes the contributions that are practical today; sets clear expectations; protects maintainer capacity; creates a path to expand mobile support later; avoids pretending that all platforms are equally easy.

**Cons:** More nuanced messaging; requires labels, documentation, and a PR template that asks about platform testing; some contributors may still be disappointed that iOS-native work is maintainer-led.

## Decision

Adopt **tiered inclusion** for mobile:

### Tier 1 — Supported (web, API, shared)

- Required CI: install, lint, typecheck, test, build.
- `good first issue` and `help wanted` labels are used freely.
- Target first response: under 48 hours.
- Documentation and tests are first-class contributions.

### Tier 2 — Community-supported (mobile JS/TS, UI, i18n, accessibility, Android-testable changes)

- Contributions are welcome in `apps/mobile`.
- Use the `area: mobile` label.
- PRs must state what was tested and on which platform (for example, "Android emulator, Pixel 7 API 35" or "JS-only change; not run on a device").
- Maintainers review for code quality and product fit, but do not guarantee iOS-native verification or a fast turnaround.
- Mobile is included in lint/typecheck CI where practical. Native builds are not required on every PR.
- Mobile `good first issue`s are added only after the mobile development guide and a reliable Android path are documented.

### Tier 3 — Maintainer-led (iOS-native and release work)

- Native iOS changes, Xcode project changes, EAS credentials, app-store submissions, push certificate management, LiveKit native upgrades, and release signing remain maintainer-led.
- Contributors may propose changes in these areas, but should open an issue first and expect a longer review.
- The existing macOS GitHub Actions workflows remain `workflow_dispatch` only.

## Consequences

### Documentation

- Add `docs/mobile-development.md` in Phase 2 covering:
  - prerequisites for Android on Windows/Linux/macOS;
  - the development-client requirement and why Expo Go is not enough;
  - how to run the Android emulator;
  - how to use the existing GitHub Actions iOS build;
  - what can be tested on the web target and what cannot;
  - which changes require a maintainer for iOS verification.
- Link the guide from `CONTRIBUTING.md` and `apps/mobile/README.md`.

### Labels and templates

- Add `area: mobile` to the label set.
- Add a "Platform testing" field to the PR template for mobile changes.
- Add a mobile-specific note to the issue chooser explaining the tiered scope.

### CI

- Add mobile lint/typecheck to CI when the scripts are reliable.
- Do not add native iOS/Android builds to every PR. Keep them manual or path-filtered.

### Community

- Mention the tiered mobile policy in the launch post and pinned discussion.
- Invite mobile contributors to start with JS/TS, UI, i18n, and accessibility issues.
- Revisit this decision after three months or after the first five external mobile PRs, whichever comes first.

## Success metrics

- Number of external mobile PRs opened and merged.
- Median time to first response for mobile PRs.
- Percentage of mobile PRs that include a platform-test note.
- Number of mobile `good first issue`s completed.
- Contributor feedback about mobile setup friction.
- Whether the mobile development guide reduces setup questions.

## Revisit triggers

Revisit this ADR if:

- the mobile app moves to a fully managed Expo workflow without custom native modules;
- a reliable cloud development environment for mobile (for example, a prebuilt dev client or EAS workflow) is available to contributors;
- mobile CI becomes fast and reliable enough to require on PRs;
- maintainer capacity changes; or
- mobile contributions become a significant share of review load.

## References

- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/modules/audio-device-detector`
- `.github/workflows/build-ios-ipa.yml`
- `.github/workflows/build-ios-ipa-debug.yml`
- `docs/adr/0001-project-foundations.md`
