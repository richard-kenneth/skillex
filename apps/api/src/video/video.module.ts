import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { WebhookController } from './webhook.controller';
import { RecordingBillingService } from './recording-billing.service';
import { RecordingBillingProcessor } from './recording-billing.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    UploadsModule,
    BullModule.registerQueue({
      name: 'recording-timeout',
    }),
  ],
  controllers: [VideoController, WebhookController],
  providers: [VideoService, RecordingBillingService, RecordingBillingProcessor],
  exports: [VideoService, RecordingBillingService],
})
export class VideoModule {}
