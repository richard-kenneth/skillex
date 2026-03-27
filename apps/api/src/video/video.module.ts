import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { WebhookController } from './webhook.controller';

@Module({
  controllers: [VideoController, WebhookController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
