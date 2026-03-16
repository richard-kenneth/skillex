import { Controller, Get, Post, UseGuards, Req, Body } from '@nestjs/common';
import { Request } from 'express';
import { ExchangesService } from './exchanges.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('exchanges')
@UseGuards(BetterAuthGuard)
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get('matches')
  getMatches(@Req() req: Request & { user: { id: string } }) {
    return this.exchangesService.findMatches(req.user.id);
  }

  @Post('request')
  createRequest(
    @Req() req: Request & { user: { id: string } },
    @Body('receiverId') receiverId: string,
    @Body('requestedSkillId') requestedSkillId: string,
    @Body('offeredSkillId') offeredSkillId?: string,
  ) {
    return this.exchangesService.createRequest(
      req.user.id,
      receiverId,
      requestedSkillId,
      offeredSkillId,
    );
  }
}
