import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Observable, fromEvent, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(BetterAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  getNotifications(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.getNotifications(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: Request & { user: { id: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Delete(':id')
  deleteNotification(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: Request & { user: { id: string } },
    @Body()
    body: {
      emailNotifications?: boolean;
      inAppNotifications?: boolean;
      pushNotifications?: boolean;
    },
  ) {
    return this.notificationsService.updatePreferences(req.user.id, body);
  }

  @Post('push-subscription')
  saveSubscription(
    @Req() req: Request & { user: { id: string } },
    @Body() subscription: any,
  ) {
    return this.notificationsService.saveSubscription(
      req.user.id,
      subscription,
    );
  }

  // Mobile push token registration (Expo)
  @Post('push-token')
  savePushToken(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { token: string; platform: string },
  ) {
    return this.notificationsService.savePushToken(
      req.user.id,
      body.token,
      body.platform,
    );
  }

  @Delete('push-token')
  removePushToken(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { token: string },
  ) {
    return this.notificationsService.removePushToken(req.user.id, body.token);
  }

  @Post('test-push')
  testPush(@Req() req: Request & { user: { id: string } }) {
    // Send test push to both web and mobile
    return Promise.all([
      this.notificationsService.sendWebPush(
        req.user.id,
        'Test Notification 🚀',
        'It works! Web Push is successfully configured on Skill Exchange.',
        '/dashboard',
      ),
      this.notificationsService.sendMobilePush(
        req.user.id,
        'Test Notification 🚀',
        'It works! Mobile Push is successfully configured on Skill Exchange.',
        '/dashboard',
        'SYSTEM',
      ),
    ]);
  }

  @Sse('stream')
  streamNotifications(
    @Req() req: Request & { user: { id: string } },
  ): Observable<MessageEvent> {
    const createdNotifications = fromEvent(
      this.eventEmitter,
      'notification.created',
    ).pipe(
      filter((payload: any) => payload.userId === req.user.id),
      map((payload: any) => ({
        data: {
          type: 'NOTIFICATION_CREATED',
          notification: payload.notification,
        },
      })),
    );

    const countUpdates = fromEvent(
      this.eventEmitter,
      'unread-count.updated',
    ).pipe(
      filter((payload: any) => payload.userId === req.user.id),
      map(() => ({
        data: {
          type: 'COUNT_UPDATED',
        },
      })),
    );

    return merge(createdNotifications, countUpdates);
  }
}
