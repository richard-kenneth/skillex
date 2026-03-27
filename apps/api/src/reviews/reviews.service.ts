import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateReviewDto } from '@skil-ex2/shared';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, data: CreateReviewDto) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: data.exchangeId },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed exchanges');
    }

    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    const revieweeId =
      userId === exchange.senderId ? exchange.receiverId : exchange.senderId;

    const existingReview = await this.prisma.review.findUnique({
      where: {
        reviewerId_exchangeId: {
          reviewerId: userId,
          exchangeId: data.exchangeId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this exchange');
    }

    return this.prisma.review.create({
      data: {
        reviewerId: userId,
        revieweeId,
        exchangeId: data.exchangeId,
        rating: data.rating,
        tags: data.tags as any[], // Casting to match ReviewTag[]
      },
    });
  }
}
