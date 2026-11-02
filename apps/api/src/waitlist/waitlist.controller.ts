import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JoinWaitlistSchema, type JoinWaitlistDto } from '@skillex/shared';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async join(
    @Body(new ValibotValidationPipe(JoinWaitlistSchema))
    body: JoinWaitlistDto,
  ) {
    return this.waitlistService.join(body);
  }

  @Get('count')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async count() {
    const count = await this.waitlistService.getCount();
    return { count };
  }
}
