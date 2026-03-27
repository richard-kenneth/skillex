import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { CreateReviewSchema, type CreateReviewDto } from '@skil-ex2/shared';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(BetterAuthGuard)
  @UsePipes(new ValibotValidationPipe(CreateReviewSchema))
  createReview(
    @Req() req: Request & { user: { id: string } },
    @Body() data: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(req.user.id, data);
  }
}
