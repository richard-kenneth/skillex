import {
  Controller,
  Headers,
  Logger,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { VideoService } from './video.service';

/**
 * Receives LiveKit webhook events.
 * Configure LiveKit to POST to: https://<your-api>/video/webhook
 */
@Controller('video')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly receiver: WebhookReceiver;

  constructor(
    private readonly videoService: VideoService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY') || '';
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET') || '';
    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authHeader: string,
  ) {
    let event;
    try {
      const body = req.rawBody!.toString('utf-8');
      event = await this.receiver.receive(body, authHeader);
    } catch (error) {
      this.logger.warn('Invalid webhook signature', error);
      return { ok: false };
    }

    this.logger.log(`Received LiveKit webhook: ${event.event}`);

    if (event.event === 'egress_ended' && event.egressInfo) {
      await this.videoService.handleEgressEnded(event.egressInfo);
    }

    return { ok: true };
  }
}
