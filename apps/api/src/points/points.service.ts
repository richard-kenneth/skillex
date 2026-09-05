import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AnalyticsEvent,
  applyCurrencyPrecision,
  POINT_TO_USD_RATE,
  PurchasePointsDto,
  WithdrawPointsDto,
} from '@skil-ex2/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RatesService } from '../rates/rates.service';
import { PostHogService } from '../analytics/posthog.service';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratesService: RatesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly posthogService: PostHogService,
  ) {}

  async getFeeConfig() {
    let config = await this.prisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) {
      config = await this.prisma.appConfig.create({
        data: { id: 'singleton' },
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
   * Initiate points purchase with Flutterwave.
   * The Inflow Rule: 100% Fee Absorption. No markup, no platform fee.
   * User pays exactly: points × $0.01 × rate
   */
  async initiatePurchase(userId: string, data: PurchasePointsDto) {
    if (data.amount < 500) {
      throw new BadRequestException(
        'Minimum purchase is 500 points ($5.00) to cover gateway flat fees.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, preferredCurrency: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const rates = await this.ratesService.getRates();
    const currency = data.currency || user.preferredCurrency || 'USD';
    const rate = rates[currency] || 1;

    const basePoints = data.amount;

    // Pure conversion: Points → Fiat, zero markup
    const baseFiatRaw = basePoints * POINT_TO_USD_RATE * rate;
    const totalFiatRounded = applyCurrencyPrecision(baseFiatRaw, currency, rate);

    const txRef = `pts_buy_${userId}_${Date.now()}`;

    const ptsTrx = await this.prisma.pointsTransaction.create({
      data: {
        userId,
        amount: basePoints,
        fiatAmount: totalFiatRounded,
        fiatCurrency: currency,
        type: 'PURCHASE',
        status: 'PENDING',
        description: `Pending purchase of ${basePoints} points`,
        referenceId: txRef,
      },
    });

    const customer = { email: user.email, name: user.name || 'User' };
    const base = {
      txRef,
      fiatAmount: totalFiatRounded,
      fiatCurrency: currency,
      targetPoints: basePoints,
      customer,
    };

    // Web: flutterwave-react-v3 opens its own inline modal client-side with this
    // data and the public key. Nothing more needed from here.
    if (!data.redirectUrl) return base;

    // Mobile: no equivalent of an inline modal, so create a hosted checkout link
    // and hand it back for the app to open.
    const isNGN = currency === 'NGN';
    const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: totalFiatRounded,
        currency,
        payment_options: isNGN
          ? 'banktransfer,card,mobilemoney,ussd'
          : 'card,mobilemoney,ussd',
        redirect_url: data.redirectUrl,
        customer,
        customizations: { title: `${basePoints} points` },
      }),
    });
    const flwData = await flwRes.json();    

    if (flwData.status !== 'success') {
      await this.prisma.pointsTransaction.update({
        where: { id: ptsTrx.id },
        data: {
          status: 'FAILED',
          description: 'Flutterwave rejected the checkout request',
        },
      });
      throw new BadRequestException('Could not start the payment');
    }

    return { ...base, paymentLink: flwData.data.link as string };
  }

  async verifyWebhook(signature: string, payload: any) {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

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
      const flwRef = payload.data.flw_ref;
      if (!txRef?.startsWith('pts_buy_')) return;

      const transaction = await this.prisma.pointsTransaction.findFirst({
        where: { referenceId: txRef, type: 'PURCHASE' },
      });

      if (!transaction) return;
      if (transaction.status !== 'PENDING') return; // Already processed

      // Atomic update transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.pointsTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'SUCCESS',
            flwRef: flwRef,
            description: `Purchased ${transaction.amount} points via FW_REF: ${flwRef}`,
          },
        });

        await tx.user.update({
          where: { id: transaction.userId },
          data: { pointsBalance: { increment: transaction.amount } },
        });
      });

      this.logger.log(
        `Successfully credited ${transaction.amount} points for txRef ${txRef}`,
      );

      this.eventEmitter.emit('points.purchased', {
        userId: transaction.userId,
        amount: transaction.amount,
      });

      this.posthogService.capture(AnalyticsEvent.POINTS_PURCHASE_COMPLETED, {
        userId: transaction.userId,
        points: transaction.amount,
        txRef: txRef,
        flwRef: flwRef,
      });
    }
  }

  /**
   * Withdraw points to NGN bank account.
   * The Outflow Rule: Structural Spread. Withdrawal rate is set lower than purchase rate.
   * All points are deducted; the fiat payout applies a spread (5-7%) to recover costs.
   */
  async withdrawPoints(userId: string, data: WithdrawPointsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    if (!user || user.pointsBalance < data.amount) {
      throw new BadRequestException('Insufficient points balance');
    }

    const feeConfig = await this.getFeeConfig();

    if (data.amount < feeConfig.minWithdrawalPoints) {
      throw new BadRequestException(
        `Minimum withdrawal is ${feeConfig.minWithdrawalPoints} points.`,
      );
    }

    // Anti-Arbitrage Lock: Block withdrawals if international purchases were made within 72 hours
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    const recentIntlPurchase = await this.prisma.pointsTransaction.findFirst({
      where: {
        userId,
        type: 'PURCHASE',
        status: 'SUCCESS',
        fiatCurrency: { not: 'NGN' },
        createdAt: { gte: seventyTwoHoursAgo },
      },
    });

    if (recentIntlPurchase) {
      throw new BadRequestException(
        'Points purchased via international payment are locked for 72 hours before withdrawal. Please try again later.',
      );
    }

    // Get the current NGN rate from Redis
    const rates = await this.ratesService.getRates();
    const ngnRate = rates['NGN'] || 1500;

    // Apply the Structural Spread: user receives (1 - spread) of the nominal value
    const nominalFiat = data.amount * POINT_TO_USD_RATE * ngnRate;
    const amountToTransferRaw = nominalFiat * (1 - feeConfig.withdrawalSpread);
    const amountToTransfer = applyCurrencyPrecision(
      amountToTransferRaw,
      'NGN',
      ngnRate,
    );

    // Ensure the transfer amount meets Flutterwave minimums
    if (amountToTransfer < 100) {
      throw new BadRequestException(
        `Withdrawal amount after processing (${amountToTransfer} NGN) is below the minimum transfer threshold.`,
      );
    }

    const reference = `pts_wd_${userId}_${Date.now()}`;

    // Deduct all points immediately
    const wt = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: data.amount } },
      });

      return tx.pointsTransaction.create({
        data: {
          userId,
          amount: -data.amount,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          referenceId: reference,
          description: `Withdrawn ${data.amount} points to bank account`,
          fiatAmount: amountToTransfer,
          fiatCurrency: 'NGN',
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

      this.eventEmitter.emit('points.withdrawn', {
        userId,
        amount: data.amount,
        status: 'SUCCESS',
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

      this.eventEmitter.emit('points.withdrawn', {
        userId,
        amount: data.amount,
        status: 'FAILED',
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
   * Applies the Exchange Commission: platform takes a percentage of the gap payment.
   */
  async releaseEscrow(
    payerId: string,
    recipientId: string,
    amount: number,
    exchangeId: string,
  ) {
    if (amount <= 0) return;

    const config = await this.getFeeConfig();
    const commission = Math.floor(amount * config.exchangeCommissionRate);
    const teacherReceives = amount - commission;

    await this.prisma.$transaction(async (tx) => {
      // Credit the teacher the net amount
      await tx.user.update({
        where: { id: recipientId },
        data: { pointsBalance: { increment: teacherReceives } },
      });

      // Record the escrow release for the teacher
      await tx.pointsTransaction.create({
        data: {
          userId: recipientId,
          amount: teacherReceives,
          type: 'ESCROW_RELEASE',
          referenceId: exchangeId,
          description: `Received ${teacherReceives} points from completed exchange (${commission} pts platform service)`,
        },
      });

      // Record the commission as platform revenue
      if (commission > 0) {
        await tx.pointsTransaction.create({
          data: {
            userId: payerId,
            amount: -commission,
            type: 'EXCHANGE_COMMISSION',
            referenceId: exchangeId,
            description: `Platform service: ${commission} points (${(config.exchangeCommissionRate * 100).toFixed(0)}% of ${amount})`,
          },
        });
      }
    });

    this.logger.log(
      `Released escrow for exchange ${exchangeId}: teacher=${teacherReceives}, commission=${commission}`,
    );
  }

  /**
   * Apply facilitation fee to both participants on exchange completion.
   * This ensures the platform earns revenue even on pure barter trades.
   */
  async applyFacilitationFee(userId: string, exchangeId: string) {
    const config = await this.getFeeConfig();
    const facilitationFee = config.facilitationFee;

    if (facilitationFee <= 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    if (!user || user.pointsBalance < facilitationFee) {
      // Skip if user can't afford it — the fee is tiny, don't block the exchange
      this.logger.warn(
        `Skipping facilitation fee for user ${userId} (balance: ${user?.pointsBalance ?? 0}, fee: ${facilitationFee})`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: facilitationFee } },
      });

      await tx.pointsTransaction.create({
        data: {
          userId,
          amount: -facilitationFee,
          type: 'FACILITATION_FEE',
          referenceId: exchangeId,
          description: `Exchange facilitation fee: ${facilitationFee} points`,
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
