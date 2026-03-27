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
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
} from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /* ─── Token Generation ──────────────────────────────────── */

  async generateRoomToken(
    room: string,
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

    const at = new AccessToken(apiKey, apiSecret, { identity, name });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { token, url: wsUrl };
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

    // Verify user is a participant
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

    // Check if both participants have consented
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
      include: { exchange: true, recordingConsents: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    // Verify both participants consented
    const bothConsented =
      session.recordingConsents.length === 2 &&
      session.recordingConsents.every((c) => c.consented);

    if (!bothConsented) {
      throw new BadRequestException(
        'Both participants must consent before recording can start',
      );
    }

    if (session.recordingEgressId) {
      throw new BadRequestException('Recording is already in progress');
    }

    const egressClient = this.getEgressClient();
    const roomName = session.exchangeId; // room name = exchange ID

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

    const updatedSession = await this.prisma.exchangeSession.update({
      where: { id: exchangeSessionId },
      data: {
        recordingEgressId: egressInfo.egressId,
        recordingStatus: 'RECORDING',
      },
    });

    return {
      egressId: egressInfo.egressId,
      status: updatedSession.recordingStatus,
    };
  }

  async stopRecording(exchangeSessionId: string, userId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      include: { exchange: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    const { senderId, receiverId } = session.exchange;
    if (userId !== senderId && userId !== receiverId) {
      throw new ForbiddenException('Not a participant of this session');
    }

    if (!session.recordingEgressId) {
      throw new BadRequestException('No active recording to stop');
    }

    const egressClient = this.getEgressClient();

    try {
      await egressClient.stopEgress(session.recordingEgressId);
    } catch (error) {
      this.logger.error('Failed to stop egress', error);
      throw new InternalServerErrorException('Failed to stop recording');
    }

    const updatedSession = await this.prisma.exchangeSession.update({
      where: { id: exchangeSessionId },
      data: { recordingStatus: 'PROCESSING' },
    });

    return { status: updatedSession.recordingStatus };
  }

  async getRecordingStatus(exchangeSessionId: string) {
    const session = await this.prisma.exchangeSession.findUnique({
      where: { id: exchangeSessionId },
      select: {
        recordingStatus: true,
        recordingUrl: true,
        recordingEgressId: true,
        recordingConsents: {
          select: { userId: true, consented: true },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /* ─── Webhook Processing ────────────────────────────────── */

  async handleEgressEnded(egressInfo: EgressInfo) {
    const session = await this.prisma.exchangeSession.findFirst({
      where: { recordingEgressId: egressInfo.egressId },
    });

    if (!session) {
      this.logger.warn(`No session found for egress ${egressInfo.egressId}`);
      return;
    }

    // Check for errors in file results
    const fileResult = egressInfo.fileResults?.[0];
    const hasError = egressInfo.error && egressInfo.error.length > 0;

    if (hasError || !fileResult) {
      this.logger.error(
        `Egress ${egressInfo.egressId} failed: ${egressInfo.error}`,
      );
      await this.prisma.exchangeSession.update({
        where: { id: session.id },
        data: { recordingStatus: 'FAILED' },
      });

      // Signal failure to UI
      try {
        const roomService = this.getRoomServiceClient();
        await roomService.sendData(
          session.exchangeId,
          new TextEncoder().encode(
            JSON.stringify({ type: 'recording_failed' }),
          ),
          DataPacket_Kind.RELIABLE,
          { topic: 'recording' },
        );
      } catch (err) {
        this.logger.error('Failed to send failure signal', err);
      }

      return;
    }

    const recordingKey = fileResult.filename;
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL');
    const recordingUrl = publicUrl
      ? `${publicUrl}/${recordingKey}`
      : recordingKey;

    await this.prisma.exchangeSession.update({
      where: { id: session.id },
      data: {
        recordingStatus: 'COMPLETED',
        recordingKey,
        recordingUrl,
      },
    });

    this.logger.log(
      `Recording completed for session ${session.id}: ${recordingKey}`,
    );

    // Signal completion to UI
    try {
      const roomService = this.getRoomServiceClient();
      await roomService.sendData(
        session.exchangeId,
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

    // Convert wss://... to https://... if it is a wss URL, because RoomServiceClient uses API endpoint
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
