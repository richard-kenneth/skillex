import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as webpush from 'web-push';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

// Expo push notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushSubscriptionInput {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

interface ExpoPushTicket {
  status?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webPushEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly emailService: EmailService,
  ) {
    // Configure VAPID keys if present
    const vapidPubKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@skillex.local';

    this.webPushEnabled = Boolean(vapidPubKey && vapidPrivKey);

    if (this.webPushEnabled) {
      webpush.setVapidDetails(vapidEmail, vapidPubKey!, vapidPrivKey!);
      this.logger.log('VAPID details configured successfully');
    } else {
      this.logger.log(
        'Web push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.',
      );
    }
  }

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        inAppNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
        email: true,
      },
    });

    if (!user) return null;

    if (data.type === 'EXCHANGE_CHAT_MESSAGE') {
      if (user.pushNotifications) {
        await this.sendWebPush(
          data.userId,
          data.title,
          data.message,
          data.link,
        );
      }
      return null;
    }

    let notification = null;
    if (user.inAppNotifications) {
      notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          link: data.link,
        },
      });

      // Emit custom local event for real-time SSE stream
      this.eventEmitter.emit('notification.created', {
        userId: data.userId,
        notification,
      });
    }

    // Send Web Push if enabled
    if (user.pushNotifications) {
      // Send to both web (browser) and mobile (Expo) push subscribers
      await Promise.all([
        this.sendWebPush(data.userId, data.title, data.message, data.link),
        this.sendMobilePush(
          data.userId,
          data.title,
          data.message,
          data.link,
          data.type,
        ),
      ]);
    }

    // Send Email if enabled (and it is critical)
    const isCritical = [
      'EXCHANGE_REQUEST_RECEIVED',
      'EXCHANGE_REQUEST_ACCEPTED',
      'SESSION_REMINDER',
      'REVIEW_REQUESTED',
    ].includes(data.type);
    if (user.emailNotifications && isCritical && user.email) {
      await this.sendEmail(user.email, data.title, data.message, data.link);
    }

    return notification;
  }

  async getNotifications(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    this.eventEmitter.emit('unread-count.updated', { userId });
    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    this.eventEmitter.emit('unread-count.updated', { userId });
    return result;
  }

  async deleteNotification(id: string, userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });

    this.eventEmitter.emit('unread-count.updated', { userId });
    return result;
  }

  async updatePreferences(
    userId: string,
    data: {
      emailNotifications?: boolean;
      inAppNotifications?: boolean;
      pushNotifications?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        emailNotifications: true,
        inAppNotifications: true,
        pushNotifications: true,
      },
    });
  }

  // Mobile Push Tokens
  async savePushToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async removePushToken(userId: string, token: string) {
    return this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
  }

  async sendMobilePush(
    userId: string,
    title: string,
    body: string,
    link?: string,
    type?: string,
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token.token,
      title,
      body,
      sound: 'default',
      badge: 1,
      data: {
        url: link || '/',
        type: type || 'SYSTEM',
        title,
        body,
      },
      channelId: this.getChannelForType(type),
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = (await response.json()) as ExpoPushResponse;

      if (Array.isArray(result.data)) {
        for (const [index, ticket] of result.data.entries()) {
          if (ticket.status !== 'error') continue;

          const error = ticket.details?.error;
          this.logger.error(
            `Expo push error for token ${tokens[index]?.token ?? 'unknown'}: ${ticket.message ?? error ?? 'unknown error'}`,
          );

          // Remove invalid tokens
          if (
            error === 'DeviceNotRegistered' ||
            error === 'InvalidCredentials'
          ) {
            const token = tokens[index]?.token;
            if (token) {
              await this.prisma.pushToken
                .deleteMany({ where: { token } })
                .catch(() => undefined);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send Expo push notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private getChannelForType(type?: string): string {
    if (!type) return 'default';
    if (type.startsWith('EXCHANGE') || type.startsWith('SESSION'))
      return 'exchanges';
    if (type.startsWith('POINTS') || type.startsWith('REFERRAL'))
      return 'points';
    if (type === 'SESSION_REMINDER') return 'sessions';
    return 'default';
  }

  // Push Subscriptions
  async saveSubscription(userId: string, subscription: PushSubscriptionInput) {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription format');
    }

    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
  }

  async sendWebPush(
    userId: string,
    title: string,
    body: string,
    link?: string,
  ) {
    if (!this.webPushEnabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: link || '/' },
      },
    });

    const promises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
      } catch (error) {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'statusCode' in error &&
          typeof (error as { statusCode?: unknown }).statusCode === 'number'
            ? (error as { statusCode: number }).statusCode
            : undefined;

        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired/defunct -> remove it
          this.logger.log(`Removing expired subscription: ${sub.id}`);
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        } else {
          this.logger.error(
            `Error sending Web Push to subscription ${sub.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    });

    await Promise.all(promises);
  }

  private async sendEmail(
    to: string,
    title: string,
    message: string,
    link?: string,
  ) {
    const actionUrl = link
      ? `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}${link}`
      : null;

    await this.emailService.send({
      to,
      subject: title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1a202c; margin-bottom: 16px;">${title}</h2>
          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            ${message}
          </p>
          ${
            actionUrl
              ? `
          <a href="${actionUrl}" style="display: inline-block; background-color: #3182ce; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            View in App
          </a>`
              : ''
          }
          <p style="color: #718096; font-size: 12px; margin-top: 32px; border-t: 1px solid #edf2f7; padding-top: 16px;">
            This is a transactional email from SkillEx. You can adjust your notification settings in your profile dashboard.
          </p>
        </div>
      `,
    });
  }
}
