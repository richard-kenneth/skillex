import posthog from "posthog-js";
import { AnalyticsEvent, type AnalyticsEventProperties } from "@skillex/shared";

export { AnalyticsEvent };
export type { AnalyticsEventProperties };

/**
 * Type-safe PostHog event tracking wrapper for Next.js web application.
 */
export function track<E extends keyof AnalyticsEventProperties>(
  event: E,
  ...[properties]: AnalyticsEventProperties[E] extends Record<string, never>
    ? [properties?: AnalyticsEventProperties[E]]
    : [properties: AnalyticsEventProperties[E]]
): void {
  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}

/**
 * Identify the current user with consistent ID and properties.
 */
export function identifyUser(
  userId: string,
  properties?: { email?: string; name?: string; [key: string]: unknown }
): void {
  if (typeof window !== "undefined") {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset user identity and start a new anonymous session (e.g. on logout).
 */
export function resetUser(): void {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
}
