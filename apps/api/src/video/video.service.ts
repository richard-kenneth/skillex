import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  DataPacket_Kind,
  EgressClient,
  EgressInfo,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../uploads/r2.service';
import { RecordingBillingService } from './recording-billing.service';

const RECORDING_TTL_DAYS = 30;
const SESSION_GRACE_MINUTES = 5;

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private r2: R2Service,
    private recordingBillingService: RecordingBillingService,
  ) {}

  /* ─── Token Generation ──────────────────────────────────── */

  async generateRoomToken(
    exchangeSessionId: string,
    identity: string,
    name: string,
  ): Promise<{ token: string; url: string }> {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const wsUrl = this.config.get<string>('NEXT_PUBLIC_LIVEKIT_URL');

    if (!apiKey || !apiSecret || !wsUrl) {
      this.logger.error('Video conferencing credentials are not configured');
      throw new InternalServerErrorException(
        'Video conferencing is not configured on this server.',
      );
    }

    // Validate session time window
    await this.validateSessionTimeForSession(exchangeSessionId, identity);

    const at = new AccessToken(apiKey, apiSecret, { identity, name });
    at.addGrant({
      room: exchangeSessionId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { token, url: wsUrl };
  }

  /* ─── Session Time Validation ────────────────────────────── */

  private async validateSessionTimeForSession(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const exchange = session.exchange;
    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('Not a participant of this exchange');
    }

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      throw new BadRequestException('This session is already completed or cancelled.');
    }

    const now = new Date();
    const scheduledAt = new Date(session.scheduledAt);
    const duration = session.duration || 60;
    const windowStart = new Date(
      scheduledAt.getTime() - SESSION_GRACE_MINUTES * 60 * 1000,
    );
    const windowEnd = new Date(
      scheduledAt.getTime() + (duration + SESSION_GRACE_MINUTES) * 60 * 1000,
    );

    const hasValidSession = now >= windowStart && now <= windowEnd;

    if (!hasValidSession) {
      throw new BadRequestException(
        'No active session within the allowed time window. Sessions can only be joined within ±5 minutes of their scheduled time.',
      );
    }
  }

  async getSessionDetails(id: string, userId: string) {
    // Try to find as a session first
    let session = await this.prisma.exchangeSession.findUnique({
      where: { id },
      include: {
        exchange: {
          include: {
            sender: {
              select: { id: true, name: true, image: true },
            },
            receiver: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    // If not found, try to find as an exchange and get the best session
    if (!session) {
      const exchange = await this.prisma.exchange.findUnique({
        where: { id },
        include: {
          sessions: true,
          sender: {
            select: { id: true, name: true, image: true },
          },
          receiver: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      if (!exchange) {
        throw new NotFoundException('Session or Exchange not found');
      }

      if (exchange.sessions.length === 0) {
        throw new BadRequestException('No sessions scheduled for this exchange.');
      }

      // Find active or closest session
      const now = new Date();
      const sorted = [...exchange.sessions].sort((a, b) => {
        const distA = Math.abs(new Date(a.scheduledAt).getTime() - now.getTime());
        const distB = Math.abs(new Date(b.scheduledAt).getTime() - now.getTime());
        return distA - distB;
      });

      const bestSession = sorted[0];
      session = await this.prisma.exchangeSession.findUnique({
        where: { id: bestSession.id },
        include: {
          exchange: {
            include: {
              sender: {
                select: { id: true, name: true, image: true },
              },
              receiver: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      });
    }

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const scheduledAt = new Date(session.scheduledAt);
    const duration = session.duration || 60;
    const endsAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    const partnerUser = session.exchange.senderId === userId ? session.exchange.receiver : session.exchange.sender;

    return {
      exchangeId: session.exchangeId,
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      endsAt,
      partner: partnerUser
        ? {
            id: partnerUser.id,
            name: partnerUser.name,
            image: partnerUser.image,
          }
        : null,
    };
  }

  async getSessionTimingInfo(exchangeId: string, userId: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: {
        sessions: {
          where: {
            status: { in: ['SCHEDULED'] },
          },
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (!exchange) throw new NotFoundException('Exchange not found');
    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('Not a participant');
    }

    const now = new Date();
    const activeSession = exchange.sessions.find((s) => {
      const start = new Date(s.scheduledAt);
      const end = new Date(start.getTime() + (s.duration || 60) * 60 * 1000);
      return now <= end;
    });

    if (!activeSession) {
      return { session: null };
    }

    return {
      session: {
        id: activeSession.id,
        scheduledAt: activeSession.scheduledAt,
        duration: activeSession.duration,
        endsAt: new Date(
          new Date(activeSession.scheduledAt).getTime() +
            (activeSession.duration || 60) * 60 * 1000,
        ),
      },
    };
  }

  /* ─── Recording Consent ─────────────────────────────────── */

  async submitConsent(
    exchangeSessionId: string,
    userId: string,
    consented: boolean,
  ) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const consent = await this.prisma.recordingConsent.upsert({
      where: {
        exchangeSessionId_userId: { exchangeSessionId, userId },
      },
      update: { consented, consentedAt: new Date() },
      create: { exchangeSessionId, userId, consented },
    });

    const allConsents = await this.prisma.recordingConsent.findMany({
      where: { exchangeSessionId },
    });

    const bothConsented =
      allConsents.length === 2 && allConsents.every((c) => c.consented);

    return {
      consent,
      bothConsented,
      consents: allConsents.map((c) => ({
        userId: c.userId,
        consented: c.consented,
      })),
    };
  }

  /* ─── Recording Lifecycle ───────────────────────────────── */

  async startRecording(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: {
        exchange: true,
        recordingConsents: true,
        recordings: {
          where: { recordingStatus: 'RECORDING' },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const bothConsented =
      session.recordingConsents.length === 2 &&
      session.recordingConsents.every((c) => c.consented);

    if (!bothConsented) {
      throw new BadRequestException(
        'Both participants must consent before recording can start',
      );
    }

    if (session.recordings.length > 0) {
      throw new BadRequestException(
        'A recording is already in progress for this session.',
      );
    }

    const egressClient = this.getEgressClient();
    const roomName = exchangeSessionId;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${exchangeSessionId}/{room_name}-{time}.mp4`,
      output: {
        case: 's3',
        value: this.getS3UploadConfig(),
      },
    });

    let egressInfo: EgressInfo;
    try {
      egressInfo = await egressClient.startRoomCompositeEgress(roomName, {
        file: fileOutput,
      });
    } catch (error) {
      this.logger.error('Failed to start egress', error);
      throw new InternalServerErrorException('Failed to start recording');
    }

    const recording = await this.prisma.sessionRecording.create({
      data: {
        exchangeSessionId,
        recordingEgressId: egressInfo.egressId,
        recordingStatus: 'RECORDING',
      },
    });

    try {
      const now = new Date();
      const scheduledAt = new Date(session.scheduledAt);
      const duration = session.duration || 60;
      const sessionEnd = new Date(scheduledAt.getTime() + duration * 60 * 1000);
      const remainingMs = sessionEnd.getTime() - now.getTime();
      const remainingSessionMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

      const billingResult = await this.recordingBillingService.deductAndSchedule(
        recording.id,
        userId,
        remainingSessionMinutes,
      );
      return {
        recordingId: recording.id,
        egressId: egressInfo.egressId,
        status: recording.recordingStatus,
        approvedMinutes: billingResult.approvedMinutes,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to lock points for recording ${recording.id}: ${error.message}. Stopping egress.`,
      );
      try {
        await egressClient.stopEgress(egressInfo.egressId);
      } catch (stopError: any) {
        this.logger.error(`Failed to stop egress after billing failure: ${stopError.message}`);
      }
      await this.prisma.sessionRecording.update({
        where: { id: recording.id },
        data: { recordingStatus: 'FAILED' },
      });
      throw error;
    }
  }

  async stopRecording(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: {
        exchange: true,
        recordings: {
          where: { recordingStatus: 'RECORDING' },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== 'SYSTEM' && userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const activeRecording = session.recordings[0];
    if (!activeRecording || !activeRecording.recordingEgressId) {
      throw new BadRequestException('No active recording to stop');
    }

    const egressClient = this.getEgressClient();

    try {
      await egressClient.stopEgress(activeRecording.recordingEgressId);
    } catch (error) {
      this.logger.error('Failed to stop egress', error);
      throw new InternalServerErrorException('Failed to stop recording');
    }

    const updatedRecording = await this.prisma.sessionRecording.update({
      where: { id: activeRecording.id },
      data: { recordingStatus: 'PROCESSING' },
    });

    return { status: updatedRecording.recordingStatus };
  }

  async getRecordingStatus(exchangeSessionId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      select: {
        recordings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        recordingConsents: {
          select: { userId: true, consented: true },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return {
      latestRecording: session.recordings[0] || null,
      recordingConsents: session.recordingConsents,
    };
  }

  async getRecordingEstimate(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const config = await this.prisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });
    const rate = config?.recordingPointsPerMinute ?? 4;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    const userBalance = user?.pointsBalance ?? 0;

    const now = new Date();
    const scheduledAt = new Date(session.scheduledAt);
    const duration = session.duration || 60;
    const sessionEnd = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    const remainingMs = sessionEnd.getTime() - now.getTime();
    const remainingSessionMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

    const maxAffordableMinutes = Math.floor(userBalance / rate);

    return {
      rate,
      userBalance,
      maxAffordableMinutes,
      remainingSessionMinutes,
    };
  }

  /* ─── Recording Playback ─────────────────────────────────── */

  async getRecordingPlayback(recordingId: string, userId: string) {
    const recording = await this.prisma.sessionRecording.findUnique({
      where: { id: recordingId },
      include: {
        exchangeSession: {
          include: { exchange: true },
        },
      },
    });

    if (!recording) throw new NotFoundException('Recording not found');

    const { senderId, receiverId } = recording.exchangeSession.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    if (recording.recordingStatus !== 'COMPLETED' || !recording.recordingKey) {
      throw new NotFoundException('Recording is not completed or missing file');
    }

    if (
      recording.recordingExpiresAt &&
      new Date() > recording.recordingExpiresAt
    ) {
      throw new BadRequestException('Recording has expired.');
    }

    const playbackUrl = await this.r2.getPresignedDownloadUrl(
      recording.recordingKey,
      3600,
    );

    return {
      url: playbackUrl,
      expiresAt: recording.recordingExpiresAt,
      recordingStatus: recording.recordingStatus,
    };
  }

  /* ─── Session Chat Persistence ───────────────────────────── */

  async saveSessionChatMessage(
    exchangeSessionId: string,
    userId: string,
    message: string,
  ) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    return this.prisma.sessionChatMessage.create({
      data: {
        exchangeSessionId,
        senderId: userId,
        message,
      },
    });
  }

  async getSessionChat(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    // Get the user's last-read timestamp
    const receipt = await this.prisma.sessionChatReadReceipt.findUnique({
      where: {
        exchangeSessionId_userId: { exchangeSessionId, userId },
      },
    });

    const messages = await this.prisma.sessionChatMessage.findMany({
      where: { exchangeSessionId },
      orderBy: { timestamp: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Count messages from OTHER users after last read
    const unreadCount = messages.filter(
      (m) =>
        m.senderId !== userId && (!receipt || m.timestamp > receipt.lastReadAt),
    ).length;

    return { messages, unreadCount };
  }

  async markSessionChatRead(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    await this.prisma.sessionChatReadReceipt.upsert({
      where: {
        exchangeSessionId_userId: { exchangeSessionId, userId },
      },
      update: { lastReadAt: new Date() },
      create: { exchangeSessionId, userId },
    });

    return { ok: true };
  }

  /* ─── Webhook Processing ────────────────────────────────── */

  async handleEgressEnded(egressInfo: EgressInfo) {
    const recording = await this.prisma.sessionRecording.findUnique({
      where: { recordingEgressId: egressInfo.egressId },
      include: { exchangeSession: true },
    });

    if (!recording) {
      this.logger.warn(
        `No recording record found for egress ${egressInfo.egressId}`,
      );
      return;
    }

    const fileResult = egressInfo.fileResults?.[0];
    const hasError = egressInfo.error && egressInfo.error.length > 0;

    let durationMs = 0;
    if (fileResult && typeof fileResult.duration === 'number') {
      durationMs = fileResult.duration * 1000;
    } else if (recording.recordingStartedAt) {
      durationMs = Date.now() - recording.recordingStartedAt.getTime();
    }

    if (hasError || !fileResult) {
      this.logger.error(
        `Egress ${egressInfo.egressId} failed: ${egressInfo.error}`,
      );
      await this.prisma.sessionRecording.update({
        where: { id: recording.id },
        data: { recordingStatus: 'FAILED' },
      });

      try {
        await this.recordingBillingService.settleRecording(recording.id, durationMs);
      } catch (billingErr: any) {
        this.logger.error(`Failed to settle recording points for failed egress ${recording.id}: ${billingErr.message}`);
      }

      try {
        const roomService = this.getRoomServiceClient();
        await roomService.sendData(
          recording.exchangeSessionId,
          new TextEncoder().encode(
            JSON.stringify({ type: 'recording_failed' }),
          ),
          DataPacket_Kind.RELIABLE,
          { topic: 'recording' },
        );
      } catch (err: any) {
        this.logger.error('Failed to send failure signal', err);
      }

      return;
    }

    const recordingKey = fileResult.filename;
    const recordingExpiresAt = new Date(
      Date.now() + RECORDING_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.sessionRecording.update({
      where: { id: recording.id },
      data: {
        recordingStatus: 'COMPLETED',
        recordingKey,
        recordingExpiresAt,
      },
    });

    try {
      await this.recordingBillingService.settleRecording(recording.id, durationMs);
    } catch (billingErr: any) {
      this.logger.error(`Failed to settle recording points for completed egress ${recording.id}: ${billingErr.message}`);
    }

    this.logger.log(
      `Recording completed for session ${recording.exchangeSessionId}: ${recordingKey} (expires ${recordingExpiresAt.toISOString()})`,
    );

    try {
      const roomService = this.getRoomServiceClient();
      await roomService.sendData(
        recording.exchangeSessionId,
        new TextEncoder().encode(
          JSON.stringify({ type: 'recording_completed' }),
        ),
        DataPacket_Kind.RELIABLE,
        { topic: 'recording' },
      );
    } catch (err) {
      this.logger.error('Failed to send completion signal', err);
    }
  }

  private getRoomServiceClient(): RoomServiceClient {
    const wsUrl = this.config.get<string>('NEXT_PUBLIC_LIVEKIT_URL');
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');

    if (!wsUrl || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'LiveKit credentials are not configured',
      );
    }

    const apiHost = wsUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://');

    return new RoomServiceClient(apiHost, apiKey, apiSecret);
  }

  private getEgressClient(): EgressClient {
    const wsUrl = this.config.get<string>('NEXT_PUBLIC_LIVEKIT_URL');
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');

    if (!wsUrl || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'LiveKit credentials are not configured',
      );
    }

    return new EgressClient(wsUrl, apiKey, apiSecret);
  }

  private getS3UploadConfig(): S3Upload {
    return new S3Upload({
      accessKey: this.config.get<string>('R2_ACCESS_KEY_ID') || '',
      secret: this.config.get<string>('R2_SECRET_ACCESS_KEY') || '',
      endpoint: this.config.get<string>('R2_ENDPOINT') || '',
      bucket: this.config.get<string>('R2_BUCKET_NAME') || '',
      region: 'auto',
      forcePathStyle: true,
    });
  }
}
