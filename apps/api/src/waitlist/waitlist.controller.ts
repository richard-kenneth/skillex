import { Body, Controller, Get, Post } from '@nestjs/common';
import { JoinWaitlistSchema, type JoinWaitlistDto } from '@skillex/shared';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  async join(
    @Body(new ValibotValidationPipe(JoinWaitlistSchema))
    body: JoinWaitlistDto,
  ) {
    return this.waitlistService.join(body);
  }

  @Get('count')
  async count() {
    const count = await this.waitlistService.getCount();
    return { count };
  }
}
