import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as
  | string
  | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;

if (!projectToken && __DEV__) {
  console.warn('[PostHog] POSTHOG_PROJECT_TOKEN is not configured in expo extra.');
}

if (!host && __DEV__) {
  console.warn('[PostHog] POSTHOG_HOST is not configured in expo extra.');
}

export const posthog =
  projectToken && host
    ? new PostHog(projectToken, {
        host,
        disabled: __DEV__, // Disable in dev per user instruction
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
          maskAllImages: false,
        },
        errorTracking: {
          autocapture: {
            console: [],
          },
        },
      })
    : undefined;
