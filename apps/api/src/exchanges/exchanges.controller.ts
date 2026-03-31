import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  type AcceptSlotsDto,
  AcceptSlotsSchema,
  type CreateExchangeRequestDto,
  CreateExchangeRequestSchema,
  type ExchangeChatUploadDto,
  ExchangeChatUploadSchema,
  type ProposeTermsAndSlotsDto,
  ProposeTermsAndSlotsSchema,
  type SendExchangeChatDto,
  SendExchangeChatSchema,
  type SendMessageDto,
  SendMessageSchema,
  type UpdateAvailabilityDto,
  UpdateAvailabilitySchema,
  type UpdateSessionStatusDto,
  UpdateSessionStatusSchema,
} from '@skil-ex2/shared';
import { Request } from 'express';
import { Observable, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { ExchangesService } from './exchanges.service';

@Controller('exchanges')
@UseGuards(BetterAuthGuard)
export class ExchangesController {
  constructor(
    private readonly exchangesService: ExchangesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Sse('stream')
  streamEvents(
    @Req() req: Request & { user: { id: string } },
  ): Observable<MessageEvent> {
    return (
      fromEvent(this.eventEmitter, 'exchange.updated') as Observable<{
        userIds: string[];
        requestId: string;
        message: string;
      }>
    ).pipe(
      filter((payload) => payload.userIds?.includes(req.user.id)),
      map((payload) => ({
        data: {
          requestId: payload.requestId,
          message: payload.message,
        },
      })),
    );
  }

  @Get('matches')
  getMatches(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.findMatches(req.user.id);
  }

  @Get('requests')
  getMyRequests(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.getMyRequests(req.user.id);
  }

  @Get()
  getMyExchanges(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.getMyExchanges(req.user.id);
  }

  @Post('request')
  @UsePipes(new ValibotValidationPipe(CreateExchangeRequestSchema))
  createRequest(
    @Req() req: Request & { user: { id: string } },
    @Body() data: CreateExchangeRequestDto,
  ) {
    return this.exchangesService.createRequest(req.user.id, data);
  }

  @Get('requests/:id')
  getRequestById(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
  ) {
    return this.exchangesService.getRequestById(req.user.id, requestId);
  }

  @Post('requests/:id/messages')
  sendMessage(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
    @Body(new ValibotValidationPipe(SendMessageSchema)) data: SendMessageDto,
  ) {
    return this.exchangesService.sendMessage(req.user.id, requestId, data);
  }

  @Post('requests/:id/propose')
  @UsePipes()
  proposeTermsAndSlots(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
    @Body(new ValibotValidationPipe(ProposeTermsAndSlotsSchema))
    data: ProposeTermsAndSlotsDto,
  ) {
    return this.exchangesService.proposeTermsAndSlots(
      req.user.id,
      requestId,
      data,
    );
  }

  @Post('requests/:id/accept-slots')
  @UsePipes()
  acceptTermsAndSlots(
    @Req() req: Request & { user: { id: string } },
    @Body(new ValibotValidationPipe(AcceptSlotsSchema)) data: AcceptSlotsDto,
  ) {
    return this.exchangesService.acceptTermsAndSlots(req.user.id, data);
  }

  @Patch('requests/:id/availability')
  @UsePipes()
  updateAvailability(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
    @Body(new ValibotValidationPipe(UpdateAvailabilitySchema))
    data: UpdateAvailabilityDto,
  ) {
    return this.exchangesService.updateAvailability(
      req.user.id,
      requestId,
      data,
    );
  }

  @Get('requests/:id/messages')
  getMessages(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
  ) {
    return this.exchangesService.getMessages(req.user.id, requestId);
  }

  @Patch('requests/:id/reject')
  rejectRequest(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
  ) {
    return this.exchangesService.rejectRequest(req.user.id, requestId);
  }

  @Patch('requests/:id/cancel')
  cancelRequest(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
  ) {
    return this.exchangesService.cancelRequest(req.user.id, requestId);
  }

  @Get(':id')
  @UseGuards(BetterAuthGuard)
  getExchangeById(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
  ) {
    return this.exchangesService.getExchangeById(req.user.id, exchangeId);
  }

  @Patch(':id/sessions/:sessionId/status')
  @UseGuards(BetterAuthGuard)
  updateSessionStatus(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
    @Param('sessionId') sessionId: string,
    @Body(new ValibotValidationPipe(UpdateSessionStatusSchema))
    data: UpdateSessionStatusDto,
  ) {
    return this.exchangesService.updateSessionStatus(
      req.user.id,
      exchangeId,
      sessionId,
      data.status,
    );
  }

  @Post(':id/complete')
  @UseGuards(BetterAuthGuard)
  markExchangeComplete(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
  ) {
    return this.exchangesService.markExchangeComplete(req.user.id, exchangeId);
  }

  /* ─── Exchange Chat ──────────────────────────────────────── */

  @Post(':id/chat')
  @UseGuards(BetterAuthGuard)
  sendChatMessage(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
    @Body(new ValibotValidationPipe(SendExchangeChatSchema))
    data: SendExchangeChatDto,
  ) {
    return this.exchangesService.sendChatMessage(
      req.user.id,
      exchangeId,
      data.content,
      data.fileKey,
      data.fileName,
      data.fileType,
    );
  }

  @Get(':id/chat')
  @UseGuards(BetterAuthGuard)
  getChatMessages(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
  ) {
    return this.exchangesService.getChatMessages(req.user.id, exchangeId);
  }

  @Post(':id/chat/upload')
  @UseGuards(BetterAuthGuard)
  getChatUploadUrl(
    @Req() req: Request & { user: { id: string } },
    @Param('id') exchangeId: string,
    @Body(new ValibotValidationPipe(ExchangeChatUploadSchema))
    data: ExchangeChatUploadDto,
  ) {
    return this.exchangesService.getChatUploadUrl(
      req.user.id,
      exchangeId,
      data.fileName,
      data.contentType,
    );
  }
}
