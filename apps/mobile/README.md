# SkillEx Mobile App

The SkillEx mobile app is built with [Expo](https://expo.dev) and [React Native](https://reactnative.dev), using Expo Router for file-based navigation.

## Requirements

- Node.js 20+
- pnpm 10.33.2 (pinned in the repository root)
- Android Studio and an Android emulator/device for Android development
- macOS with Xcode for local iOS development
- An Expo development build; Expo Go alone is not sufficient because the app uses native modules

The app depends on LiveKit React Native WebRTC and the local `audio-device-detector` Expo module. Those native dependencies require a development client, and the generated `android/` and `ios/` directories are not committed.

## Setup

From the repository root:

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` creates `apps/mobile/.env` with local API URLs and seeds demo data. The default login is `demo@skillex.dev` / `Password123!`.

If you already have the local services running, `pnpm run setup -- --skip-install` is safe to re-run. Never commit real credentials.

## Run

```bash
# Start the Expo development server
pnpm --filter mobile start

# Build and run on Android
pnpm --filter mobile android

# Build and run on iOS (macOS only)
pnpm --filter mobile ios

# Start the partial web target
pnpm --filter mobile web
```

The web target is useful for quick UI work, but it is not a substitute for testing native audio, video, push notifications, or device routing.

The dev container in this repository is suitable for JavaScript/TypeScript work and Android tooling, but iOS-native builds still require macOS/Xcode or a cloud build. Point `EXPO_PUBLIC_API_BASE_URL` at a reachable API if you run the app on a physical device.

## Testing expectations

When you open a mobile pull request, state what you tested and on which platform. For example:

- `Android emulator, Pixel 7, API 35`
- `JS-only change; not run on a device`
- `iOS simulator, iPhone 16` (if you have macOS/Xcode)

## Contributing

Mobile contributions are **community-supported**. JavaScript/TypeScript changes, UI, i18n, accessibility, and Android-testable changes are welcome. Native iOS changes, EAS credentials, app-store releases, and LiveKit native upgrades remain maintainer-led.

Open an issue before starting significant mobile work. See [`docs/adr/0002-mobile-contribution-scope.md`](../../docs/adr/0002-mobile-contribution-scope.md) for the full policy and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for the CLA and review process.
