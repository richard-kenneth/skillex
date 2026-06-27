import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordingBillingService {
  private readonly logger = new Logger(RecordingBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recording-timeout') private readonly timeoutQueue: Queue,
  ) {}

  async deductAndSchedule(
    sessionRecordingId: string,
    userId: string,
    remainingSessionMinutes: number,
  ) {
    this.logger.log(
      `deductAndSchedule: sessionRecordingId=${sessionRecordingId}, userId=${userId}, remainingMinutes=${remainingSessionMinutes}`,
    );

    // 1. Fetch points rate from AppConfig (singleton)
    const config = await this.prisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });
    const rate = config?.recordingPointsPerMinute ?? 4;

    // 2. Run deduction in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const affordableMinutes = Math.floor(user.pointsBalance / rate);
      const approvedMinutes = Math.min(affordableMinutes, remainingSessionMinutes);

      if (approvedMinutes < 1) {
        throw new BadRequestException('Insufficient points to record. Minimum 1 minute required.');
      }

      const upfrontCost = approvedMinutes * rate;

      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: {
          pointsBalance: {
            decrement: upfrontCost,
          },
        },
      });

      // Update session recording
      const updatedRecording = await tx.sessionRecording.update({
        where: { id: sessionRecordingId },
        data: {
          billingUserId: userId,
          totalLockedPoints: upfrontCost,
          recordingStartedAt: new Date(),
        },
      });

      return { approvedMinutes, upfrontCost, rate, updatedRecording };
    });

    // 3. Schedule the delayed BullMQ job to stop the recording
    const delayMs = result.approvedMinutes * 60 * 1000;
    const jobId = `stop-recording-${sessionRecordingId}`;
    
    await this.timeoutQueue.add(
      'stop-recording',
      {
        sessionRecordingId,
        exchangeSessionId: result.updatedRecording.exchangeSessionId,
      },
      {
        delay: delayMs,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log(
      `Scheduled stop-recording job ${jobId} to run in ${delayMs}ms (${result.approvedMinutes} minutes)`,
    );

    return {
      approvedMinutes: result.approvedMinutes,
      rate,
      upfrontCost: result.upfrontCost,
    };
  }

  async settleRecording(sessionRecordingId: string, actualDurationMs: number) {
    this.logger.log(
      `settleRecording: sessionRecordingId=${sessionRecordingId}, actualDurationMs=${actualDurationMs}`,
    );

    // 1. Fetch recording details
    const recording = await this.prisma.sessionRecording.findUnique({
      where: { id: sessionRecordingId },
    });

    if (!recording) {
      this.logger.warn(`Recording ${sessionRecordingId} not found in database.`);
      return;
    }

    const { billingUserId, totalLockedPoints } = recording;

    // If no user was charged (e.g. error starting or not a paid recording), do nothing
    if (!billingUserId || totalLockedPoints <= 0) {
      this.logger.log(`No locked points or billing user for recording ${sessionRecordingId}. Skipping settlement.`);
      return;
    }

    // 2. Fetch points rate
    const config = await this.prisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });
    const rate = config?.recordingPointsPerMinute ?? 4;

    // 3. Calculate actual cost
    const actualMinutes = Math.ceil(actualDurationMs / 60000);
    let actualCost = actualMinutes * rate;

    // Cap cost at locked points
    if (actualCost > totalLockedPoints) {
      actualCost = totalLockedPoints;
    }

    const refundAmount = totalLockedPoints - actualCost;

    this.logger.log(
      `Settling: actualMinutes=${actualMinutes}, rate=${rate}, actualCost=${actualCost}, totalLockedPoints=${totalLockedPoints}, refund=${refundAmount}`,
    );

    // 4. Perform database updates (refund & transaction history) in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update recording status and final charged points
      await tx.sessionRecording.update({
        where: { id: sessionRecordingId },
        data: {
          totalChargedPoints: actualCost,
        },
      });

      // Charge transaction if actual cost > 0
      if (actualCost > 0) {
        await tx.pointsTransaction.create({
          data: {
            userId: billingUserId,
            amount: -actualCost,
            type: 'RECORDING_FEE',
            status: 'SUCCESS',
            referenceId: sessionRecordingId,
            description: `Session recording fee (${actualMinutes} min)`,
          },
        });
      }

      // Refund points if user ended early (no transaction log required)
      if (refundAmount > 0) {
        await tx.user.update({
          where: { id: billingUserId },
          data: {
            pointsBalance: {
              increment: refundAmount,
            },
          },
        });
      }
    });

    // 5. Clean up any existing scheduled job for this recording to avoid running it if stopped early
    try {
      const jobId = `stop-recording-${sessionRecordingId}`;
      const job = await this.timeoutQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed scheduled job ${jobId} (early stop/settlement completed)`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to remove job for recording ${sessionRecordingId}: ${err.message}`);
    }
  }
}
