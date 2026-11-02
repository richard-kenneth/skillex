import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { CreateReviewSchema, type CreateReviewDto } from '@skillex/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // A review is written once per completed exchange; limit retries and abuse.
  @Post()
  @UseGuards(BetterAuthGuard)
  @UsePipes(new ValibotValidationPipe(CreateReviewSchema))
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createReview(
    @Req() req: Request & { user: { id: string } },
    @Body() data: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(req.user.id, data);
  }

  @Get('user/:userId')
  @UseGuards(BetterAuthGuard)
  getReviewsForUser(
    @Req() req: Request & { user: { id: string } },
    @Param('userId') userId: string,
  ) {
    const targetUserId = userId === 'me' ? req.user.id : userId;
    return this.reviewsService.getReviewsForUser(targetUserId);
  }

  @Get('exchange/:exchangeId')
  @UseGuards(BetterAuthGuard)
  getReviewsForExchange(@Param('exchangeId') exchangeId: string) {
    return this.reviewsService.getReviewsForExchange(exchangeId);
  }
}
