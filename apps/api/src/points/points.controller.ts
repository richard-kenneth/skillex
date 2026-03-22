import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { type PurchasePointsDto, PurchasePointsSchema } from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { PointsService } from './points.service';

@Controller('points')
@UseGuards(BetterAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  getBalance(@Req() req: Request & { user: { id: string } }) {
    return this.pointsService.getBalance(req.user.id);
  }

  @Get('transactions')
  getTransactions(@Req() req: Request & { user: { id: string } }) {
    return this.pointsService.getTransactions(req.user.id);
  }

  @Post('purchase')
  @UsePipes(new ValibotValidationPipe(PurchasePointsSchema))
  purchasePoints(
    @Req() req: Request & { user: { id: string } },
    @Body() data: PurchasePointsDto,
  ) {
    return this.pointsService.purchasePoints(req.user.id, data);
  }
}
