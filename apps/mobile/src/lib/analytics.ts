import { posthog } from './posthog';
import { AnalyticsEvent, type AnalyticsEventProperties } from '@skil-ex2/shared';

export { AnalyticsEvent };
export type { AnalyticsEventProperties };

/**
 * Type-safe PostHog event tracking wrapper for Expo React Native mobile application.
 */
export function track<E extends keyof AnalyticsEventProperties>(
  event: E,
  ...[properties]: AnalyticsEventProperties[E] extends Record<string, never>
    ? [properties?: AnalyticsEventProperties[E]]
    : [properties: AnalyticsEventProperties[E]]
): void {
  posthog?.capture(event, properties as Record<string, any>);
}

/**
 * Track screen transitions manually for Expo Router.
 */
export function trackScreen(screenName: string, properties?: Record<string, any>): void {
  posthog?.screen(screenName, properties);
}

/**
 * Identify the current user with consistent ID and properties.
 */
export function identifyUser(
  userId: string,
  properties?: { email?: string; name?: string; [key: string]: any }
): void {
  if (!posthog) return;
  posthog.identify(userId, {
    $set: {
      ...(properties?.email ? { email: properties.email } : {}),
      ...(properties?.name ? { name: properties.name } : {}),
      ...properties,
    },
  });
}

/**
 * Reset user identity and start a new anonymous session (e.g. on logout).
 */
export function resetUser(): void {
  posthog?.reset();
}
