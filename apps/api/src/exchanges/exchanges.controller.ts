import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  type CreateExchangeRequestDto,
  CreateExchangeRequestSchema,
} from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { ExchangesService } from './exchanges.service';

@Controller('exchanges')
@UseGuards(BetterAuthGuard)
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get('matches')
  getMatches(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.findMatches(req.user.id);
  }

  @Get('requests')
  getMyRequests(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.getMyRequests(req.user.id);
  }

  @Post('request')
  @UsePipes(new ValibotValidationPipe(CreateExchangeRequestSchema))
  createRequest(
    @Req() req: Request & { user: { id: string } },
    @Body() data: CreateExchangeRequestDto,
  ) {
    return this.exchangesService.createRequest(req.user.id, data);
  }

  @Patch('requests/:id/accept')
  acceptRequest(
    @Req() req: Request & { user: { id: string } },
    @Param('id') requestId: string,
  ) {
    return this.exchangesService.acceptRequest(req.user.id, requestId);
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
}
