import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('exchange.updated')
  async handleExchangeUpdated(payload: {
    userIds: string[];
    requestId: string;
    message?: any;
    messageKeyOverride?: string;   // bypass last-message lookup
    updatedByUserId?: string;      // who triggered the update
  }) {
    try {
      const request = await this.prisma.exchangeRequest.findUnique({
        where: { id: payload.requestId },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
          requestedSkill: { select: { name: true } },
          offeredSkill: { select: { name: true } },
          exchange: { select: { id: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!request) return;

      const otherUser = (userId: string) =>
        userId === request.senderId ? request.receiver : request.sender;

      // Override: availability updated (no DB message is created for this action)
      if (payload.messageKeyOverride === 'AVAILABILITY_UPDATED' && payload.updatedByUserId) {
        const updater =
          payload.updatedByUserId === request.senderId ? request.sender : request.receiver;
        const recipientId =
          payload.updatedByUserId === request.senderId ? request.receiverId : request.senderId;

        await this.notificationsService.createNotification({
          userId: recipientId,
          title: 'Availability Updated 📅',
          message: `${updater.name || 'Partner'} updated their availability.`,
          type: 'EXCHANGE_NEGOTIATION_UPDATE',
          link: `/requests/${request.id}`,
        });
        return;
      }

      // Case 1: Request is pending
      if (request.status === 'PENDING') {
        const lastMsg = request.messages[0];
        
        if (!lastMsg) {
          // Newly created request
          await this.notificationsService.createNotification({
            userId: request.receiverId,
            title: 'New Exchange Request 🤝',
            message: `${request.sender.name || 'A user'} wants to learn "${request.requestedSkill.name}" from you.`,
            type: 'EXCHANGE_REQUEST_RECEIVED',
            link: `/requests/${request.id}`,
          });
        } else {
          const recipientId =
            lastMsg.senderId === request.senderId
              ? request.receiverId
              : request.senderId;
          const senderName =
            lastMsg.senderId === request.senderId
              ? request.sender.name || 'Partner'
              : request.receiver.name || 'Partner';

          let title = '';
          let message = '';
          let type = 'EXCHANGE_NEGOTIATION_UPDATE';

          switch (lastMsg.messageKey) {
            case 'PROPOSE_TERMS':
              title = 'New Terms Proposed 📝';
              message = `${senderName} proposed new terms for your skill exchange.`;
              type = 'EXCHANGE_TERMS_PROPOSED';
              break;
            case 'AGREE_TO_TERMS':
              title = 'Terms Agreed ✅';
              message = `${senderName} agreed to the proposed exchange terms.`;
              type = 'EXCHANGE_TERMS_AGREED';
              break;
            case 'AVAILABLE_WEEKDAYS':
              title = 'Availability Updated 🗓️';
              message = `${senderName} updated their availability to weekdays.`;
              break;
            case 'AVAILABLE_WEEKENDS':
              title = 'Availability Updated 🗓️';
              message = `${senderName} updated their availability to weekends.`;
              break;
            case 'PROPOSE_SLOTS':
              title = 'Time Slots Proposed ⏰';
              message = `${senderName} proposed new time slots for your sessions.`;
              break;
            case 'ACCEPT_SLOTS':
              title = 'Time Slots Accepted ✅';
              message = `${senderName} accepted the proposed time slots.`;
              break;
            case 'INTERESTED_IN_EXCHANGE':
              title = 'New Exchange Interest 🤝';
              message = `${senderName} is interested in a skill exchange with you.`;
              break;
            case 'NEED_MORE_TIME':
              title = 'Need More Time ⏳';
              message = `${senderName} needs more time to consider the proposal.`;
              break;
            case 'PROPOSE_SCHEDULE':
              title = 'Schedule Proposed 📅';
              message = `${senderName} proposed a new scheduling option.`;
              break;
            case 'REQUEST_RESCHEDULE':
              title = 'Reschedule Requested 🔄';
              message = `${senderName} requested to reschedule a session.`;
              break;
            case 'CONFIRM_SESSION':
              title = 'Session Confirmed 👍';
              message = `${senderName} confirmed a session.`;
              break;
            case 'SESSION_WENT_WELL':
              title = 'Session Feedback 🌟';
              message = `${senderName} marked a session as successful.`;
              break;
            case 'SESSION_HAD_ISSUES':
              title = 'Session Feedback ⚠️';
              message = `${senderName} reported issues with a session.`;
              break;
            case 'READY_TO_COMPLETE':
              title = 'Ready to Complete 🏁';
              message = `${senderName} is ready to complete the exchange.`;
              break;
            case 'THANKS_FOR_EXCHANGE':
              title = 'Thanks! ❤️';
              message = `${senderName} sent a thank you message for the exchange.`;
              break;
            default:
              title = 'Negotiation Update 💬';
              message = `${senderName} sent a message in your exchange request.`;
              break;
          }

          if (title && message) {
            await this.notificationsService.createNotification({
              userId: recipientId,
              title,
              message,
              type,
              link: `/requests/${request.id}`,
            });
          }
        }
      }

      // Case 2: Committed (Exchange created)
      if (request.status === 'COMMITTED') {
        const exchangeId = request.exchange?.id;
        const redirectLink = exchangeId ? `/exchanges/${exchangeId}` : `/requests/${request.id}`;

        // Send notification to both parties
        await this.notificationsService.createNotification({
          userId: request.senderId,
          title: 'Exchange Committed! 🎉',
          message: `Your exchange with ${request.receiver.name || 'partner'} is committed. You can now schedule your sessions.`,
          type: 'EXCHANGE_REQUEST_ACCEPTED',
          link: redirectLink,
        });

        await this.notificationsService.createNotification({
          userId: request.receiverId,
          title: 'Exchange Committed! 🎉',
          message: `Your exchange with ${request.sender.name || 'partner'} is committed. You can now schedule your sessions.`,
          type: 'EXCHANGE_REQUEST_ACCEPTED',
          link: redirectLink,
        });
      }

      // Case 3: Rejected
      if (request.status === 'REJECTED') {
        await this.notificationsService.createNotification({
          userId: request.senderId,
          title: 'Exchange Request Declined ❌',
          message: `${request.receiver.name || 'Receiver'} declined your skill exchange request.`,
          type: 'EXCHANGE_REQUEST_REJECTED',
          link: `/matches/requests`,
        });
      }

      // Case 4: Cancelled
      if (request.status === 'CANCELLED') {
        await this.notificationsService.createNotification({
          userId: request.receiverId,
          title: 'Exchange Request Cancelled 🚫',
          message: `${request.sender.name || 'Sender'} cancelled the skill exchange request.`,
          type: 'EXCHANGE_REQUEST_CANCELLED',
          link: `/matches/requests`,
        });
      }
    } catch (error) {
      this.logger.error('Error handling exchange update event:', error);
    }
  }

  @OnEvent('session.updated')
  async handleSessionUpdated(payload: {
    userIds: string[];
    exchangeId: string;
    sessionId: string;
  }) {
    try {
      const session = await this.prisma.exchangeSession.findUnique({
        where: { id: payload.sessionId },
        include: {
          exchange: {
            include: {
              sender: { select: { id: true, name: true } },
              receiver: { select: { id: true, name: true } },
            },
          },
          skill: { select: { name: true } },
        },
      });

      if (!session) return;

      const formattedDate = new Date(session.scheduledAt).toLocaleString();

      if (session.status === 'SCHEDULED') {
        // Send notification to both
        await this.notificationsService.createNotification({
          userId: session.exchange.senderId,
          title: 'Session Scheduled 📅',
          message: `A session for "${session.skill.name}" has been scheduled on ${formattedDate}.`,
          type: 'SESSION_SCHEDULED',
          link: `/exchanges/${session.exchangeId}`,
        });

        await this.notificationsService.createNotification({
          userId: session.exchange.receiverId,
          title: 'Session Scheduled 📅',
          message: `A session for "${session.skill.name}" has been scheduled on ${formattedDate}.`,
          type: 'SESSION_SCHEDULED',
          link: `/exchanges/${session.exchangeId}`,
        });
      }

      if (session.status === 'COMPLETED') {
        // Send notification to both
        await this.notificationsService.createNotification({
          userId: session.exchange.senderId,
          title: 'Session Completed 🌟',
          message: `Your session for "${session.skill.name}" was completed. Please rate your experience!`,
          type: 'SESSION_COMPLETED',
          link: `/exchanges/${session.exchangeId}`,
        });

        await this.notificationsService.createNotification({
          userId: session.exchange.receiverId,
          title: 'Session Completed 🌟',
          message: `Your session for "${session.skill.name}" was completed. Please rate your experience!`,
          type: 'SESSION_COMPLETED',
          link: `/exchanges/${session.exchangeId}`,
        });
      }

      if (session.status === 'CANCELLED') {
        // Send notification to both
        await this.notificationsService.createNotification({
          userId: session.exchange.senderId,
          title: 'Session Cancelled ⚠️',
          message: `The session for "${session.skill.name}" scheduled for ${formattedDate} has been cancelled.`,
          type: 'SESSION_CANCELLED',
          link: `/exchanges/${session.exchangeId}`,
        });

        await this.notificationsService.createNotification({
          userId: session.exchange.receiverId,
          title: 'Session Cancelled ⚠️',
          message: `The session for "${session.skill.name}" scheduled for ${formattedDate} has been cancelled.`,
          type: 'SESSION_CANCELLED',
          link: `/exchanges/${session.exchangeId}`,
        });
      }
    } catch (error) {
      this.logger.error('Error handling session update event:', error);
    }
  }

  @OnEvent('chat.message.sent')
  async handleChatMessageSent(payload: {
    exchangeId: string;
    messageId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }) {
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: payload.senderId },
        select: { name: true },
      });

      await this.notificationsService.createNotification({
        userId: payload.receiverId,
        title: `Message from ${sender?.name || 'Partner'} 💬`,
        message: payload.content,
        type: 'EXCHANGE_CHAT_MESSAGE',
        link: `/exchanges/${payload.exchangeId}`,
      });
    } catch (error) {
      this.logger.error('Error handling chat message event:', error);
    }
  }

  @OnEvent('points.purchased')
  async handlePointsPurchased(payload: { userId: string; amount: number }) {
    try {
      await this.notificationsService.createNotification({
        userId: payload.userId,
        title: 'Points Purchased successfully! 🪙',
        message: `Successfully credited ${payload.amount} points to your account. Thank you!`,
        type: 'POINTS_RECEIVED',
        link: `/points`,
      });
    } catch (error) {
      this.logger.error('Error handling points purchased event:', error);
    }
  }

  @OnEvent('points.withdrawn')
  async handlePointsWithdrawn(payload: {
    userId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED';
  }) {
    try {
      if (payload.status === 'SUCCESS') {
        await this.notificationsService.createNotification({
          userId: payload.userId,
          title: 'Withdrawal Successful 💸',
          message: `Successfully processed withdrawal of ${payload.amount} points to fiat currency.`,
          type: 'POINTS_WITHDREW',
          link: `/points`,
        });
      } else {
        await this.notificationsService.createNotification({
          userId: payload.userId,
          title: 'Withdrawal Failed ❌',
          message: `Withdrawal of ${payload.amount} points failed. The points have been refunded to your wallet.`,
          type: 'POINTS_WITHDREW',
          link: `/points`,
        });
      }
    } catch (error) {
      this.logger.error('Error handling points withdrawn event:', error);
    }
  }

  @OnEvent('referral.created')
  async handleReferralCreated(payload: {
    referrerId: string;
    refereeId: string;
  }) {
    try {
      const referee = await this.prisma.user.findUnique({
        where: { id: payload.refereeId },
        select: { name: true },
      });

      await this.notificationsService.createNotification({
        userId: payload.referrerId,
        title: 'New Referral Registered! 🚀',
        message: `${referee?.name || 'A user'} signed up using your referral code. You'll get rewards once they complete their first exchange.`,
        type: 'REFERRAL_APPLIED',
        link: `/dashboard`,
      });
    } catch (error) {
      this.logger.error('Error handling referral created event:', error);
    }
  }

  @OnEvent('referral.rewarded')
  async handleReferralRewarded(payload: {
    userId: string;
    amount: number;
    type: 'REWARD' | 'BONUS';
  }) {
    try {
      const isInitial = payload.type === 'REWARD';
      await this.notificationsService.createNotification({
        userId: payload.userId,
        title: isInitial
          ? 'Referral Conversion Reward! 🎁'
          : 'Ongoing Referral Bonus! 🪙',
        message: isInitial
          ? `You earned ${payload.amount} points because your referred friend completed their first exchange!`
          : `You earned ${payload.amount} points ongoing bonus for your friend's exchange activity.`,
        type: 'POINTS_RECEIVED',
        link: `/points`,
      });
    } catch (error) {
      this.logger.error('Error handling referral rewarded event:', error);
    }
  }

  @OnEvent('review.created')
  async handleReviewCreated(payload: {
    reviewerId: string;
    revieweeId: string;
    exchangeId: string;
    rating: number;
  }) {
    try {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: payload.reviewerId },
        select: { name: true },
      });

      await this.notificationsService.createNotification({
        userId: payload.revieweeId,
        title: 'New Review Received ⭐️',
        message: `${reviewer?.name || 'Your partner'} left you a ${payload.rating}-star review for your exchange.`,
        type: 'REVIEW_RECEIVED',
        link: `/exchanges/${payload.exchangeId}`,
      });
    } catch (error) {
      this.logger.error('Error handling review created event:', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSessionReminders() {
    try {
      const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);
      const now = new Date();

      const sessions = await this.prisma.exchangeSession.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: fifteenMinutesFromNow,
            gte: now,
          },
        },
        include: {
          exchange: {
            include: {
              sender: { select: { id: true, name: true } },
              receiver: { select: { id: true, name: true } },
            },
          },
          skill: { select: { name: true } },
        },
      });

      for (const session of sessions) {
        const reminderLink = `/exchanges/${session.exchangeId}`;

        // Check if reminder was already sent to sender
        const senderNotified = await this.prisma.notification.findFirst({
          where: {
            userId: session.exchange.senderId,
            type: 'SESSION_REMINDER',
            link: reminderLink,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24h
            },
          },
        });

        if (!senderNotified) {
          await this.notificationsService.createNotification({
            userId: session.exchange.senderId,
            title: 'Upcoming Session Reminder ⏰',
            message: `Your session for "${session.skill.name}" starts in less than 15 minutes.`,
            type: 'SESSION_REMINDER',
            link: reminderLink,
          });
        }

        // Check if reminder was already sent to receiver
        const receiverNotified = await this.prisma.notification.findFirst({
          where: {
            userId: session.exchange.receiverId,
            type: 'SESSION_REMINDER',
            link: reminderLink,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!receiverNotified) {
          await this.notificationsService.createNotification({
            userId: session.exchange.receiverId,
            title: 'Upcoming Session Reminder ⏰',
            message: `Your session for "${session.skill.name}" starts in less than 15 minutes.`,
            type: 'SESSION_REMINDER',
            link: reminderLink,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error running session reminder background cron:', error);
    }
  }
}
