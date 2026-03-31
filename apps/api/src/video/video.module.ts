import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [UploadsModule],
  controllers: [VideoController, WebhookController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
