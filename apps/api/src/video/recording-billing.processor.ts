import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { VideoService } from './video.service';

@Processor('recording-timeout')
export class RecordingBillingProcessor extends WorkerHost {
  private readonly logger = new Logger(RecordingBillingProcessor.name);

  constructor(private readonly videoService: VideoService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === 'stop-recording') {
      const { exchangeSessionId, sessionRecordingId } = job.data;
      this.logger.log(`Stopping recording for session ${exchangeSessionId} (timeout reached)`);
      try {
        await this.videoService.stopRecording(exchangeSessionId, 'SYSTEM');
        this.logger.log(`Successfully stopped recording for session ${exchangeSessionId}`);
      } catch (err) {
        this.logger.error(
          `Failed to automatically stop recording ${sessionRecordingId} for session ${exchangeSessionId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }
  }
}
