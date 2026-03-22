import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PurchasePointsDto } from '@skil-ex2/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    return { balance: user?.pointsBalance ?? 0 };
  }

  async getTransactions(userId: string) {
    return this.prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Simulate purchasing points.
   * In production this would be gated behind a real payment processor.
   */
  async purchasePoints(userId: string, data: PurchasePointsDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: data.amount } },
      });

      const transaction = await tx.pointsTransaction.create({
        data: {
          userId,
          amount: data.amount,
          type: 'PURCHASE',
          description: `Purchased ${data.amount} points`,
        },
      });

      return { balance: user.pointsBalance, transaction };
    });

    this.logger.log(`User ${userId} purchased ${data.amount} points`);
    return result;
  }

  /**
   * Lock points into escrow for an exchange.
   * Returns the updated balance.
   */
  async lockEscrow(userId: string, amount: number, exchangeId: string) {
    if (amount <= 0) return; // no escrow needed for even exchanges

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    if (!user || user.pointsBalance < amount) {
      throw new BadRequestException(
        `Insufficient points. You have ${user?.pointsBalance ?? 0} but need ${amount}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: amount } },
      });

      await tx.pointsTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'ESCROW_LOCK',
          referenceId: exchangeId,
          description: `Locked ${amount} points in escrow for exchange`,
        },
      });
    });
  }

  /**
   * Release escrowed points to the teacher upon exchange completion.
   */
  async releaseEscrow(
    payerId: string,
    recipientId: string,
    amount: number,
    exchangeId: string,
  ) {
    if (amount <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: recipientId },
        data: { pointsBalance: { increment: amount } },
      });

      await tx.pointsTransaction.create({
        data: {
          userId: recipientId,
          amount: amount,
          type: 'ESCROW_RELEASE',
          referenceId: exchangeId,
          description: `Received ${amount} points from completed exchange`,
        },
      });

      // Record the outgoing for the payer
      await tx.pointsTransaction.create({
        data: {
          userId: payerId,
          amount: -amount,
          type: 'ESCROW_RELEASE',
          referenceId: exchangeId,
          description: `Paid ${amount} points for completed exchange`,
        },
      });
    });
  }
}
