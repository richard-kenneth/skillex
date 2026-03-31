import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  RecordingConsentSchema,
  SendSessionChatMessageSchema,
  StartRecordingSchema,
  StopRecordingSchema,
  type RecordingConsentDto,
  type SendSessionChatMessageDto,
  type StartRecordingDto,
  type StopRecordingDto,
} from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * GET /video/token?room=<exchangeId>
   * Returns a { token, url } pair for the authenticated user to join the room.
   * Validates session time window before issuing token.
   */
  @Get('token')
  @UseGuards(BetterAuthGuard)
  async getToken(
    @Req() req: Request & { user: { id: string; name: string } },
    @Query('room') room: string,
  ) {
    return this.videoService.generateRoomToken(
      room,
      req.user.id,
      req.user.name || 'User',
    );
  }

  /**
   * GET /video/timing?room=<exchangeId>
   * Returns session timing info (scheduledAt, duration, endsAt) for countdown UI.
   */
  @Get('timing')
  @UseGuards(BetterAuthGuard)
  async getSessionTiming(
    @Req() req: Request & { user: { id: string } },
    @Query('room') room: string,
  ) {
    return this.videoService.getSessionTimingInfo(room, req.user.id);
  }

  /* ─── Recording Consent ─────────────────────────────────── */

  /**
   * POST /video/recording/consent
   * Body: { exchangeSessionId, consented: boolean }
   */
  @Post('recording/consent')
  @UseGuards(BetterAuthGuard)
  async submitConsent(
    @Req() req: Request & { user: { id: string } },
    @Body(new ValibotValidationPipe(RecordingConsentSchema))
    body: RecordingConsentDto,
  ) {
    return this.videoService.submitConsent(
      body.exchangeSessionId,
      req.user.id,
      body.consented,
    );
  }

  /* ─── Recording Lifecycle ───────────────────────────────── */

  /**
   * POST /video/recording/start
   * Body: { exchangeSessionId }
   */
  @Post('recording/start')
  @UseGuards(BetterAuthGuard)
  async startRecording(
    @Req() req: Request & { user: { id: string } },
    @Body(new ValibotValidationPipe(StartRecordingSchema))
    body: StartRecordingDto,
  ) {
    return this.videoService.startRecording(
      body.exchangeSessionId,
      req.user.id,
    );
  }

  /**
   * POST /video/recording/stop
   * Body: { exchangeSessionId }
   */
  @Post('recording/stop')
  @UseGuards(BetterAuthGuard)
  async stopRecording(
    @Req() req: Request & { user: { id: string } },
    @Body(new ValibotValidationPipe(StopRecordingSchema))
    body: StopRecordingDto,
  ) {
    return this.videoService.stopRecording(body.exchangeSessionId, req.user.id);
  }

  /* ─── Recording Playback ─────────────────────────────────── */

  /**
   * GET /video/recording/:sessionId/playback
   * Returns a short-lived presigned URL for recording playback.
   */
  @Get('recording/:recordingId/playback')
  @UseGuards(BetterAuthGuard)
  async getRecordingPlayback(
    @Param('recordingId') recordingId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.videoService.getRecordingPlayback(recordingId, req.user.id);
  }

  /* ─── Session Chat ───────────────────────────────────────── */

  /**
   * POST /video/chat/:sessionId
   * Save a single chat message in real-time as the user sends it.
   */
  @Post('chat/:sessionId')
  @UseGuards(BetterAuthGuard)
  async saveSessionChatMessage(
    @Req() req: Request & { user: { id: string } },
    @Param('sessionId') sessionId: string,
    @Body(new ValibotValidationPipe(SendSessionChatMessageSchema))
    body: SendSessionChatMessageDto,
  ) {
    return this.videoService.saveSessionChatMessage(
      sessionId,
      req.user.id,
      body.message,
    );
  }

  /**
   * GET /video/chat/:sessionId
   * Retrieve the full chat history for a session.
   */
  @Get('chat/:sessionId')
  @UseGuards(BetterAuthGuard)
  async getSessionChat(
    @Req() req: Request & { user: { id: string } },
    @Param('sessionId') sessionId: string,
  ) {
    return this.videoService.getSessionChat(sessionId, req.user.id);
  }

  /**
   * PATCH /video/chat/:sessionId/read
   * Mark all messages in a session as read for the current user.
   */
  @Patch('chat/:sessionId/read')
  @UseGuards(BetterAuthGuard)
  async markSessionChatRead(
    @Req() req: Request & { user: { id: string } },
    @Param('sessionId') sessionId: string,
  ) {
    return this.videoService.markSessionChatRead(sessionId, req.user.id);
  }
}
