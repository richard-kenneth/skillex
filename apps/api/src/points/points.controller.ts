import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  type PurchasePointsDto,
  PurchasePointsSchema,
  type WithdrawPointsDto,
  WithdrawPointsSchema,
} from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { PointsService } from './points.service';

import { RatesService } from '../rates/rates.service';

@Controller('points')
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly ratesService: RatesService,
  ) {}

  @Get('rates')
  getRates() {
    return this.ratesService.getRates();
  }


  @Get('fee-config')
  getFeeConfig() {
    return this.pointsService.getFeeConfig();
  }

  @Get('fee-tiers')
  getFeeTiers() {
    return this.pointsService.getFeeTiers();
  }

  @Get('my-tier')
  @UseGuards(BetterAuthGuard)
  getMyTier(@Req() req: Request & { user: { id: string } }) {
    return this.pointsService.getUserFeeTier(req.user.id);
  }

  @Get('banks')
  @UseGuards(BetterAuthGuard)
  getBanks() {
    return this.pointsService.getBanks();
  }

  @Get('balance')
  @UseGuards(BetterAuthGuard)
  getBalance(@Req() req: Request & { user: { id: string } }) {
    return this.pointsService.getBalance(req.user.id);
  }

  @Get('transactions')
  @UseGuards(BetterAuthGuard)
  getTransactions(@Req() req: Request & { user: { id: string } }) {
    return this.pointsService.getTransactions(req.user.id);
  }

  @Post('purchase')
  @UseGuards(BetterAuthGuard)
  @UsePipes(new ValibotValidationPipe(PurchasePointsSchema))
  purchasePoints(
    @Req() req: Request & { user: { id: string } },
    @Body() data: PurchasePointsDto,
  ) {
    return this.pointsService.initiatePurchase(req.user.id, data);
  }

  @Post('withdraw')
  @UseGuards(BetterAuthGuard)
  @UsePipes(new ValibotValidationPipe(WithdrawPointsSchema))
  withdrawPoints(
    @Req() req: Request & { user: { id: string } },
    @Body() data: WithdrawPointsDto,
  ) {
    return this.pointsService.withdrawPoints(req.user.id, data);
  }

  @Post('resolve-account')
  @UseGuards(BetterAuthGuard)
  resolveAccount(@Body() data: { accountNumber: string; bankCode: string }) {
    return this.pointsService.resolveAccount(data.accountNumber, data.bankCode);
  }

  @Post('webhook')
  verifyWebhook(
    @Headers('verif-hash') signature: string,
    @Body() payload: any,
  ) {
    return this.pointsService.verifyWebhook(signature, payload);
  }
}
