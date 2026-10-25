# Mobile development

The mobile app is an Expo / React Native client in `apps/mobile`. This guide
covers the parts that differ from web development: development builds, native
modules, device networking, push notifications, and live video.

Mobile contributions are **community-supported**, while iOS-native and release
work remain maintainer-led. Read
[ADR 0002](./adr/0002-mobile-contribution-scope.md) for the policy and
[`CONTRIBUTING.md`](../CONTRIBUTING.md) for the CLA and review process.

## Stack and constraints

- Expo SDK 57 with React Native 0.86 and Expo Router.
- Better Auth's Expo plugin with bearer tokens stored in SecureStore.
- LiveKit React Native WebRTC for live sessions.
- A local Expo module, `apps/mobile/modules/audio-device-detector`, with Android
  Kotlin and iOS Swift implementations.
- Expo push notifications, deep links, and a partial web target.

Because of LiveKit and the local native module, **Expo Go is not sufficient**.
You need an Expo development build. The generated `android/` and `ios/`
directories are not committed; Expo generates them from `app.json`.

## Requirements

| Platform | Requirements                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Both     | Node.js 22+, pnpm 10.33.2, and a running SkillEx API                                                         |
| Android  | Android Studio, the Android SDK, an emulator or USB device, and the JDK bundled with Android Studio          |
| iOS      | macOS with Xcode and CocoaPods; a simulator or a signed development device                                   |
| Push     | A physical device; Android also needs a Firebase `google-services.json` to receive remote push notifications |

Windows and Linux can build and run Android. iOS-native builds require macOS,
Xcode, or a cloud macOS runner.

## Environment

Create `apps/mobile/.env` from `apps/mobile/.env.example`, or let
`pnpm run setup` create it. The full reference is in
[`docs/env-vars.md`](./env-vars.md).

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
EXPO_PUBLIC_WEB_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SCHEME=skil-ex
```

- `EXPO_PUBLIC_API_BASE_URL` is the API origin, without `/api`.
- `EXPO_PUBLIC_BETTER_AUTH_URL` is the Better Auth base URL, normally the same
  API origin.
- `EXPO_PUBLIC_SCHEME` must match `expo.scheme` in `app.json` and `EXPO_SCHEME`
  in `apps/api/.env`. All three are `skil-ex`.
- `EXPO_PUBLIC_WEB_BASE_URL` is used for share links and browser hand-offs.

`EXPO_PUBLIC_*` values are embedded in the JavaScript bundle. Never put a
secret in this file.

PostHog is optional. `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` are read by
`app.config.js` and exposed through `expo.extra`, so they are also public in the
bundle.

## First-time setup

From the repository root:

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` creates the env files, starts PostgreSQL, Redis, Mailpit, and
MinIO, applies migrations, and seeds demo data. If the services are already
running, `pnpm run setup -- --skip-install` is safe to re-run.

Start the API and web app if they are not already running:

```bash
pnpm dev
```

Then start the Expo development server:

```bash
pnpm --filter mobile start
```

## Run on Android

```bash
pnpm --filter mobile android
```

This runs `expo run:android`, generates the native project on first use, builds
the development client, and installs it on the selected emulator or device. The
first build can take several minutes.

If you already have a development build installed and only changed JavaScript,
`pnpm --filter mobile start` is enough. Rebuild the native app after changing
native dependencies, Expo config plugins, permissions, or the local module.

### Android push configuration

`app.json` references `./google-services.json`, which is gitignored. The Expo
config only includes it when the file exists, so an Android build works without
it, but remote push notifications are disabled until you add one.

To enable Android push:

1. Create a Firebase project and add an Android app with package name
   `com.skil_ex`.
2. Download `google-services.json` and place it at
   `apps/mobile/google-services.json`.
3. Rebuild the development client.

Do not commit the file. It is project configuration, not a secret, but it is
specific to the Firebase project and should not be shared across forks.

## Run on iOS

On macOS with Xcode and CocoaPods installed:

```bash
pnpm --filter mobile ios
```

This runs `expo run:ios` and installs the development client in a simulator or
on a connected device. iOS-native changes, signing, App Store submissions, and
LiveKit native upgrades are maintainer-led.

The repository also has two manual GitHub Actions workflows that build unsigned
iOS IPAs on a macOS runner:

- `.github/workflows/build-ios-ipa.yml` builds a Release configuration.
- `.github/workflows/build-ios-ipa-debug.yml` builds a Debug configuration with
  the dev client enabled.

They are started with `workflow_dispatch` and are intended for sideloading and
smoke testing, not for App Store distribution. They read
`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SCHEME`, `EXPO_PUBLIC_WEB_BASE_URL`, and
`EXPO_PUBLIC_BETTER_AUTH_URL` from repository Actions secrets.

## Physical devices and networking

`localhost` on a phone or emulator refers to that device, not your computer.
Use an address the device can reach.

### Android emulator

The host machine is available at `10.0.2.2`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001
EXPO_PUBLIC_BETTER_AUTH_URL=http://10.0.2.2:3001
```

Alternatively, forward the ports and keep `localhost`:

```bash
adb reverse tcp:3001 tcp:3001
adb reverse tcp:7880 tcp:7880
```

### iOS simulator

The simulator shares the host network, so `http://localhost:3001` works.

### Physical Android or iOS device

Use your computer's LAN IP, for example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3001
EXPO_PUBLIC_BETTER_AUTH_URL=http://192.168.1.20:3001
```

The API listens on `0.0.0.0`, so it accepts LAN connections. Allow Node.js
through the host firewall if the device cannot connect. Restart Expo with a
cleared cache after changing env values:

```bash
pnpm --filter mobile start -- --clear
```

If you use an HTTPS tunnel or the Expo web target, add its origin to
`DEV_EXTRA_ORIGINS` in `apps/api/.env`. Native requests use the Expo scheme and
bearer tokens, but Better Auth still checks trusted origins.

## Development builds and native changes

Expo generates `apps/mobile/android` and `apps/mobile/ios` from `app.json` and
the config plugins. Do not commit or hand-edit generated native projects.

After changing native configuration, regenerate them:

```bash
cd apps/mobile
npx expo prebuild --clean
```

`--clean` deletes the generated native directories first. Any manual native
changes you made locally will be lost; make them through an Expo config plugin
or the local module instead.

### The local audio module

`apps/mobile/modules/audio-device-detector` detects and routes audio devices
during calls. It has:

- Android Kotlin code in `android/src/main/java/...`;
- iOS Swift code and a podspec in `ios/`;
- a TypeScript API and a web fallback in `src/`.

The module is linked through `metro.config.js` and the app's `package.json`.
Changes to Kotlin or Swift require a native rebuild; TypeScript-only changes
hot reload. The web fallback is useful for UI work but does not validate native
audio routing.

## Live video

LiveKit is optional. Start the local stack with:

```bash
docker compose --profile video up -d
```

Then set these in `apps/api/.env` and restart the API:

```env
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

The API returns the LiveKit URL with the room token, so the mobile app does not
need its own LiveKit env variable. For a physical device, use a reachable URL
such as `ws://192.168.1.20:7880`; for the Android emulator, use
`ws://10.0.2.2:7880` or `adb reverse tcp:7880 tcp:7880`.

Test live sessions with two participants. Recording requires explicit consent
from both participants, and the recording billing path depends on LiveKit
webhooks reaching the API. A local device cannot receive webhooks from LiveKit
Cloud unless the API is reachable through a tunnel.

## Quality checks

```bash
pnpm --filter mobile lint
pnpm --filter mobile typecheck
pnpm --filter mobile format:check
```

There is no mobile unit-test suite yet. PR CI runs JavaScript/TypeScript checks
where practical; native builds and device testing are manual.

When you open a mobile pull request, state what you tested:

- `Android emulator, Pixel 7, API 35`
- `Android device, Samsung Galaxy S23, Android 15`
- `iOS simulator, iPhone 16, iOS 18`
- `JS-only change; not run on a device`

Include screenshots or a short recording for UI changes. If you could not test
a platform, say so instead of implying it was tested.

## EAS builds

`apps/mobile/eas.json` defines `development`, `preview`, and `production`
profiles. The `app.json` `owner`, `extra.eas.projectId`, and `updates.url`
values point at the maintainer's Expo project. If you build from a fork, use a
local development build or change those values to your own Expo project first.

EAS credentials, signing, store listings, and production updates are
maintainer-led. Do not submit a build to an app store from a fork.

## Troubleshooting

- **Metro serves stale code.** Restart with
  `pnpm --filter mobile start -- --clear`.
- **The app cannot reach the API.** Check the URL from the device's browser,
  confirm the API is running on `0.0.0.0`, and allow Node.js through the
  firewall.
- **Auth redirects fail.** Confirm `EXPO_PUBLIC_SCHEME` is `skil-ex` and
  `EXPO_SCHEME` in the API is also `skil-ex`. Rebuild after changing the scheme.
- **A native module is missing or the app crashes after an update.** Rebuild the
  development client with `pnpm --filter mobile android` or
  `pnpm --filter mobile ios`. JavaScript reloads cannot add native code.
- **Android push does not work.** Confirm you are on a physical device, the
  Firebase `google-services.json` is present, and the app was rebuilt after
  adding it.
- **Gradle or Xcode errors after changing config.** Run
  `npx expo prebuild --clean` and rebuild. If the error persists, run
  `npx expo-doctor` and include its output in the issue.
- **Live video connects but has no audio.** Test on a real device, check the
  audio-device module, and confirm microphone permissions were granted.

For environment-variable details, see [`docs/env-vars.md`](./env-vars.md). For
the system design, see [`docs/architecture.md`](./architecture.md). For help,
see [`SUPPORT.md`](../SUPPORT.md).
