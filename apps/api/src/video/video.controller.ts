import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  RecordingConsentSchema,
  StartRecordingSchema,
  StopRecordingSchema,
  type RecordingConsentDto,
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
}
