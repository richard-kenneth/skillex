import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import {
  AnalyticsEvent,
  type AnalyticsEventProperties,
} from '@skillex/shared';

export { AnalyticsEvent };
export type { AnalyticsEventProperties };

@Injectable()
export class PostHogService implements OnApplicationShutdown {
  private readonly logger = new Logger(PostHogService.name);
  private client: PostHog | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    const token = process.env.POSTHOG_PROJECT_TOKEN;
    const host = process.env.POSTHOG_HOST;

    if (this.isDevelopment) {
      this.logger.log('PostHog tracking disabled in development mode.');
      return;
    }

    if (!token) {
      this.logger.warn(
        'POSTHOG_PROJECT_TOKEN is not set; server-side tracking disabled.',
      );
      return;
    }

    if (!host) {
      this.logger.warn(
        'POSTHOG_HOST is not set; server-side tracking disabled.',
      );
      return;
    }

    this.client = new PostHog(token, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    });
  }

  /**
   * Capture a canonical event server-side with strict typing.
   */
  capture<E extends keyof AnalyticsEventProperties>(
    event: E,
    properties: AnalyticsEventProperties[E] & { distinctId?: string },
  ): void {
    if (!this.client || this.isDevelopment) {
      return;
    }

    const distinctId =
      properties.distinctId ||
      ('userId' in properties && typeof properties.userId === 'string'
        ? properties.userId
        : 'server');

    try {
      this.client.capture({
        distinctId,
        event,
        properties: properties as Record<string, any>,
      });
    } catch (err) {
      this.logger.error(`Failed to capture event ${event}:`, err);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) {
      this.logger.log('Flushing and shutting down PostHog client...');
      await this.client.shutdown();
    }
  }
}
