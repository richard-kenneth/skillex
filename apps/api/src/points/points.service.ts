import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AnalyticsEvent,
  applyCurrencyPrecision,
  POINT_TO_USD_RATE,
  PurchasePointsDto,
  WithdrawPointsDto,
} from '@skillex/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RatesService } from '../rates/rates.service';
import { PostHogService } from '../analytics/posthog.service';
import { secureCompare } from '../common/security/secure-compare';

interface WebhookPayload {
  event: string | null;
  status: string | null;
  txRef: string | null;
  flwRef: string | null;
  amount: number | null;
  currency: string | null;
}

interface FlutterwaveCheckoutResponse {
  status: string;
  message?: string;
  data?: {
    link?: string;
  };
}

interface FlutterwaveTransferResponse {
  status: string;
  message?: string;
}

export interface FlutterwaveBank {
  id: number;
  code: string;
  name: string;
}

interface FlutterwaveBanksResponse {
  status: string;
  data?: FlutterwaveBank[];
}

interface FlutterwaveResolveResponse {
  status: string;
  message?: string;
  data?: {
    account_name?: string;
  };
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Webhook bodies are untrusted input. Read only the fields we use and coerce
 * them explicitly instead of accessing an `any` payload.
 */
function parseWebhookPayload(payload: unknown): WebhookPayload {
  const empty: WebhookPayload = {
    event: null,
    status: null,
    txRef: null,
    flwRef: null,
    amount: null,
    currency: null,
  };

  if (typeof payload !== 'object' || payload === null) return empty;

  const body = payload as Record<string, unknown>;
  const event = readString(body, 'event');
  const rawData = body.data;

  if (typeof rawData !== 'object' || rawData === null) {
    return { ...empty, event };
  }

  const data = rawData as Record<string, unknown>;
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === 'number'
      ? rawAmount
      : typeof rawAmount === 'string'
        ? Number(rawAmount)
        : null;

  return {
    event,
    status: readString(data, 'status'),
    txRef: readString(data, 'tx_ref'),
    flwRef: readString(data, 'flw_ref'),
    amount,
    currency: readString(data, 'currency'),
  };
}

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratesService: RatesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly posthogService: PostHogService,
  ) {
    if (!this.paymentsEnabled) {
      this.logger.log(
        this.mockPaymentsEnabled
          ? 'Payments disabled: using the local mock (no Flutterwave account required).'
          : 'Payments disabled: set FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_WEBHOOK_SECRET_HASH to enable.',
      );
    }
  }

  /** Flutterwave is optional; without it, development uses a local mock. */
  private get paymentsEnabled(): boolean {
    return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
  }

  private get mockPaymentsEnabled(): boolean {
    return !this.paymentsEnabled && process.env.NODE_ENV !== 'production';
  }

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
    const totalFiatRounded = applyCurrencyPrecision(
      baseFiatRaw,
      currency,
      rate,
    );

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

    if (!this.paymentsEnabled) {
      if (!this.mockPaymentsEnabled) {
        await this.prisma.pointsTransaction.update({
          where: { id: ptsTrx.id },
          data: {
            status: 'FAILED',
            description: 'Payments are not configured on this server',
          },
        });
        throw new ServiceUnavailableException(
          'Payments are not configured on this server.',
        );
      }

      // Local development: credit the points immediately so contributors can
      // exercise the full points flow without a Flutterwave account.
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.pointsTransaction.updateMany({
          where: { id: ptsTrx.id, status: 'PENDING' },
          data: {
            status: 'SUCCESS',
            description: `Mock purchase of ${basePoints} points (local development)`,
          },
        });

        if (claimed.count !== 1) return;

        await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: basePoints } },
        });
      });

      this.logger.log(
        `[Mock payment] Credited ${basePoints} points to ${userId}`,
      );
      this.eventEmitter.emit('points.purchased', {
        userId,
        amount: basePoints,
      });
      this.posthogService.capture(AnalyticsEvent.POINTS_PURCHASE_COMPLETED, {
        userId,
        points: basePoints,
        txRef,
      });

      return { ...base, mock: true, credited: true };
    }

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
    const flwData = (await flwRes.json()) as FlutterwaveCheckoutResponse;

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

    return { ...base, paymentLink: flwData.data?.link };
  }

  async verifyWebhook(signature: string, payload: unknown) {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

    // Fail closed: an unset secret must never be treated as a valid signature.
    if (!secretHash) {
      this.logger.error(
        '[Webhook] FLUTTERWAVE_WEBHOOK_SECRET_HASH is not configured; rejecting webhook',
      );
      throw new ServiceUnavailableException(
        'Webhook verification is not configured',
      );
    }

    if (!secureCompare(signature, secretHash)) {
      // Never log the expected value or the supplied signature.
      this.logger.warn('[Webhook] Rejected request with an invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const webhook = parseWebhookPayload(payload);

    if (
      webhook.event !== 'charge.completed' ||
      webhook.status !== 'successful'
    ) {
      return { received: true };
    }

    const { txRef, flwRef } = webhook;

    if (!txRef || !txRef.startsWith('pts_buy_')) {
      return { received: true };
    }

    const transaction = await this.prisma.pointsTransaction.findFirst({
      where: { referenceId: txRef, type: 'PURCHASE' },
    });

    if (!transaction) {
      this.logger.warn(
        `[Webhook] No purchase transaction found for txRef ${txRef}`,
      );
      return { received: true };
    }

    if (transaction.status !== 'PENDING') {
      return { received: true };
    }

    const paidAmount = webhook.amount;
    const paidCurrency = webhook.currency?.toUpperCase() ?? '';
    const expectedAmount = transaction.fiatAmount;
    const expectedCurrency = transaction.fiatCurrency?.toUpperCase();

    if (
      paidAmount === null ||
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0 ||
      expectedAmount === null ||
      Math.abs(paidAmount - expectedAmount) > 0.01
    ) {
      this.logger.error(
        `[Webhook] Amount mismatch for txRef ${txRef}: expected ${expectedAmount}, received ${webhook.amount}. Refusing to credit.`,
      );
      return { received: true };
    }

    if (!expectedCurrency || paidCurrency !== expectedCurrency) {
      this.logger.error(
        `[Webhook] Currency mismatch for txRef ${txRef}: expected ${expectedCurrency}, received ${webhook.currency}. Refusing to credit.`,
      );
      return { received: true };
    }

    // Claim the transaction with a conditional update so two concurrent
    // deliveries of the same webhook can only credit the user once.
    const credited = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.pointsTransaction.updateMany({
        where: { id: transaction.id, status: 'PENDING' },
        data: {
          status: 'SUCCESS',
          flwRef: flwRef ?? null,
          description: `Purchased ${transaction.amount} points via FW_REF: ${
            flwRef ?? 'unknown'
          }`,
        },
      });

      if (claimed.count !== 1) return false;

      await tx.user.update({
        where: { id: transaction.userId },
        data: { pointsBalance: { increment: transaction.amount } },
      });

      return true;
    });

    if (!credited) {
      this.logger.log(
        `[Webhook] Transaction ${txRef} was already processed; ignoring duplicate`,
      );
      return { received: true };
    }

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
      flwRef: flwRef ?? undefined,
    });

    return { received: true };
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

    // Deduct all points immediately. The conditional update prevents two
    // concurrent withdrawals from spending the same balance.
    const wt = await this.prisma.$transaction(async (tx) => {
      const deducted = await tx.user.updateMany({
        where: { id: userId, pointsBalance: { gte: data.amount } },
        data: { pointsBalance: { decrement: data.amount } },
      });

      if (deducted.count !== 1) {
        throw new BadRequestException('Insufficient points balance');
      }

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

    if (!this.paymentsEnabled) {
      if (!this.mockPaymentsEnabled) {
        await this.refundWithdrawal(userId, wt.id, data.amount);
        throw new ServiceUnavailableException(
          'Payments are not configured on this server.',
        );
      }

      await this.prisma.pointsTransaction.update({
        where: { id: wt.id },
        data: {
          status: 'SUCCESS',
          description: `Mock withdrawal of ${data.amount} points (local development)`,
        },
      });

      this.logger.log(
        `[Mock payment] Withdrew ${data.amount} points for ${userId} (${amountToTransfer} NGN)`,
      );
      this.eventEmitter.emit('points.withdrawn', {
        userId,
        amount: data.amount,
        status: 'SUCCESS',
      });

      return {
        success: true,
        mock: true,
        message: 'Mock withdrawal completed (local development)',
        reference,
        amountToTransfer,
      };
    }

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
          narration: 'SkillEx Points Withdrawal',
          currency: 'NGN',
          reference,
        }),
      });

      const result = (await response.json()) as FlutterwaveTransferResponse;
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
      await this.refundWithdrawal(userId, wt.id, data.amount);

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

  private async refundWithdrawal(
    userId: string,
    transactionId: string,
    amount: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: amount } },
      });
      await tx.pointsTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          description: `Refunded ${amount} points due to failed withdrawal`,
        },
      });
    });
  }

  async getBanks() {
    if (!this.paymentsEnabled) {
      if (!this.mockPaymentsEnabled) return [];

      return [
        { id: 1, code: '000', name: 'SkillEx Test Bank' },
        { id: 2, code: '001', name: 'Demo Microfinance Bank' },
      ];
    }

    try {
      const response = await fetch('https://api.flutterwave.com/v3/banks/NG', {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      });
      const result = (await response.json()) as FlutterwaveBanksResponse;
      return result.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch banks', error);
      return [];
    }
  }

  /**
   * Lock points into escrow inside an existing transaction.
   *
   * This must run in the same transaction that creates the exchange. If it ran
   * separately, a failure while creating the exchange would leave the payer's
   * points locked with no exchange to ever release them.
   */
  async lockEscrowInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    exchangeId: string,
  ) {
    if (amount <= 0) return; // no escrow needed for even exchanges

    const locked = await tx.user.updateMany({
      where: { id: userId, pointsBalance: { gte: amount } },
      data: { pointsBalance: { decrement: amount } },
    });

    if (locked.count !== 1) {
      const payer = await tx.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      throw new BadRequestException(
        `Insufficient points. You have ${payer?.pointsBalance ?? 0} but need ${amount}.`,
      );
    }

    await tx.pointsTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: 'ESCROW_LOCK',
        referenceId: exchangeId,
        description: `Locked ${amount} points in escrow for exchange`,
      },
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

    const released = await this.prisma.$transaction(async (tx) => {
      // The exchange may be completed again after a crash or retry. Never
      // release the same escrow twice.
      const existingRelease = await tx.pointsTransaction.findFirst({
        where: {
          userId: recipientId,
          type: 'ESCROW_RELEASE',
          referenceId: exchangeId,
        },
        select: { id: true },
      });

      if (existingRelease) return false;

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

      return true;
    });

    if (!released) {
      this.logger.warn(
        `Escrow for exchange ${exchangeId} was already released; skipping`,
      );
      return;
    }

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
      const existingFee = await tx.pointsTransaction.findFirst({
        where: {
          userId,
          type: 'FACILITATION_FEE',
          referenceId: exchangeId,
        },
        select: { id: true },
      });

      if (existingFee) return;

      const charged = await tx.user.updateMany({
        where: { id: userId, pointsBalance: { gte: facilitationFee } },
        data: { pointsBalance: { decrement: facilitationFee } },
      });

      if (charged.count !== 1) {
        this.logger.warn(
          `Skipping facilitation fee for user ${userId}: balance changed before the charge could be applied`,
        );
        return;
      }

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
    if (!this.paymentsEnabled) {
      if (!this.mockPaymentsEnabled) {
        return {
          success: false,
          message: 'Payments are not configured on this server.',
        };
      }

      return {
        success: true,
        accountName: 'SkillEx Test Account',
        mock: true,
      };
    }

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
      const result = (await response.json()) as FlutterwaveResolveResponse;
      if (result.status === 'success') {
        return {
          success: true,
          accountName: result.data?.account_name,
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      this.logger.error('Failed to resolve account', error);
      return { success: false, message: 'Could not resolve account' };
    }
  }
}
