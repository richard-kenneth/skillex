import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PurchasePointsDto, WithdrawPointsDto } from '@skil-ex2/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFeeConfig() {
    let config = await this.prisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) {
      config = await this.prisma.appConfig.create({
        data: {
          id: 'singleton',
          purchaseFeePercentage: 0.05,
          purchaseFeeFixed: 100,
          withdrawalFeePercentage: 0.05,
          withdrawalFeeFixed: 50,
          minWithdrawalAmount: 100,
        },
      });
    }
    return config;
  }

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
   * Initiate points purchase with Flutterwave
   */
  async initiatePurchase(userId: string, data: PurchasePointsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const feeConfig = await this.getFeeConfig();
    const baseAmount = data.amount;
    const fee = Math.ceil(
      baseAmount * feeConfig.purchaseFeePercentage + feeConfig.purchaseFeeFixed,
    );
    const totalAmount = baseAmount + fee;

    const txRef = `pts_buy_${userId}_${Date.now()}`;

    // Create a pending transaction
    await this.prisma.pointsTransaction.create({
      data: {
        userId,
        amount: data.amount,
        type: 'PURCHASE',
        status: 'PENDING',
        description: `Pending purchase of ${data.amount} points`,
        referenceId: txRef,
      },
    });

    return {
      txRef,
      baseAmount,
      fee,
      totalAmount,
      customer: {
        email: user.email,
        name: user.name || 'User',
      },
    };
  }

  async verifyWebhook(signature: string, payload: any) {
    const secretHash =
      process.env.FLUTTERWAVE_WEBHOOK_SECRET ||
      process.env.FLUTTERWAVE_SECRET_KEY;

    // Simple verification (in production, use stricter checking of the signature)
    if (!signature || signature !== secretHash) {
      this.logger.warn(
        `[Webhook] Invalid signature. Expected: ${secretHash}, Got: ${signature}`,
      );
      return;
    }

    if (
      payload.event === 'charge.completed' &&
      payload.data?.status === 'successful'
    ) {
      const txRef = payload.data.tx_ref;
      if (!txRef?.startsWith('pts_buy_')) return;

      const transaction = await this.prisma.pointsTransaction.findFirst({
        where: { referenceId: txRef, type: 'PURCHASE' },
      });

      if (!transaction) return;
      if (transaction.status !== 'PENDING') return; // Already processed

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: transaction.userId },
          data: { pointsBalance: { increment: transaction.amount } },
        });

        await tx.pointsTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'SUCCESS',
            description: `Purchased ${transaction.amount} points`,
          },
        });
      });

      this.logger.log(
        `Successfully credited ${transaction.amount} points for txRef ${txRef}`,
      );
    }
  }

  async withdrawPoints(userId: string, data: WithdrawPointsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    if (!user || user.pointsBalance < data.amount) {
      throw new BadRequestException('Insufficient points balance');
    }

    const feeConfig = await this.getFeeConfig();
    const baseAmount = data.amount;
    const fee = Math.ceil(
      baseAmount * feeConfig.withdrawalFeePercentage +
        feeConfig.withdrawalFeeFixed,
    );
    const amountToTransfer = baseAmount - fee;

    if (amountToTransfer < (feeConfig.minWithdrawalAmount || 100)) {
      throw new BadRequestException(
        `Withdrawal amount after fees (${amountToTransfer} NGN) is below the minimum allowed (${feeConfig.minWithdrawalAmount || 100} NGN)`,
      );
    }

    const reference = `pts_wd_${userId}_${Date.now()}`;

    // Deduct points immediately
    const wt = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: data.amount } },
      });

      return tx.pointsTransaction.create({
        data: {
          userId,
          amount: -data.amount,
          type: 'CONVERSION',
          status: 'PENDING',
          referenceId: reference,
          description: `Withdrawn ${data.amount} points to bank account`,
        },
      });
    });

    const flutterwaveUrl = 'https://api.flutterwave.com/v3/transfers';
    try {
      const response = await fetch(flutterwaveUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_bank: data.bankCode,
          account_number: data.accountNumber,
          amount: amountToTransfer,
          narration: 'Skil-Ex Points Withdrawal',
          currency: 'NGN',
          reference,
        }),
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(`Flutterwave transfer failed: ${result.message}`);
      }

      this.logger.log(
        `Initiated withdrawal for ${userId}, amount: ${amountToTransfer} NGN`,
      );

      await this.prisma.pointsTransaction.update({
        where: { id: wt.id },
        data: { status: 'SUCCESS' },
      });

      return {
        success: true,
        message: 'Withdrawal initiated successfully',
        reference,
        amountToTransfer,
      };
    } catch (error) {
      this.logger.error(`Withdrawal failed for ${userId}`, error);
      // Revert points deduction on immediate failure
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: data.amount } },
        });
        await tx.pointsTransaction.update({
          where: { id: wt.id },
          data: {
            status: 'FAILED',
            description: `Refunded ${data.amount} points due to failed withdrawal`,
          },
        });
      });
      // Throw the actual error message back to the frontend
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Withdrawal failed, points refunded',
      );
    }
  }

  async getBanks() {
    try {
      const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch banks', error);
      return [];
    }
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
    });
  }

  async resolveAccount(account_number: string, account_bank: string) {
    try {
      const response = await fetch(
        'https://api.flutterwave.com/v3/accounts/resolve',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ account_number, account_bank }),
        },
      );
      const result = await response.json();
      if (result.status === 'success') {
        return { success: true, accountName: result.data.account_name };
      }
      return { success: false, message: result.message };
    } catch (error) {
      this.logger.error('Failed to resolve account', error);
      return { success: false, message: 'Could not resolve account' };
    }
  }
}
