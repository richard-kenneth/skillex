import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApplyReferralSchema } from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@UseGuards(BetterAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('my-code')
  getMyCode(@Req() req: Request & { user: { id: string } }) {
    return this.referralsService.getMyReferralCode(req.user.id);
  }

  @Get('stats')
  getMyStats(@Req() req: Request & { user: { id: string } }) {
    return this.referralsService.getMyReferralStats(req.user.id);
  }

  @Post('apply')
  applyCode(
    @Req() req: Request & { user: { id: string } },
    @Body(new ValibotValidationPipe(ApplyReferralSchema))
    data: { referralCode: string },
  ) {
    return this.referralsService.applyReferralCode(
      req.user.id,
      data.referralCode,
    );
  }
}
