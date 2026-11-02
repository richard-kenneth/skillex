import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomInt } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REFERRAL_CODE_LENGTH = 8;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get or generate a referral code for the current user.
   */
  async getMyReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.referralCode) {
      return { referralCode: user.referralCode };
    }

    // Generate a unique code. Retry if another request wins the race or the
    // unique constraint is hit between the existence check and the update.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await this.generateUniqueCode();

      try {
        const result = await this.prisma.user.updateMany({
          where: { id: userId, referralCode: null },
          data: { referralCode: code },
        });

        if (result.count === 1) {
          return { referralCode: code };
        }

        // Another request already assigned a code; return the winning value.
        const refreshed = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { referralCode: true },
        });

        if (refreshed?.referralCode) {
          return { referralCode: refreshed.referralCode };
        }
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }

    throw new BadRequestException(
      'Could not generate a unique referral code. Please try again.',
    );
  }

  /**
   * Get referral stats for the current user.
   */
  async getMyReferralStats(userId: string) {
    const [referralCount, convertedCount, totalBonusEarned, monthlyEarnings] =
      await Promise.all([
        this.prisma.referral.count({ where: { referrerId: userId } }),
        this.prisma.referral.count({
          where: { referrerId: userId, status: 'CONVERTED' },
        }),
        this.prisma.pointsTransaction.aggregate({
          where: {
            userId,
            type: { in: ['REFERRAL_REWARD', 'REFERRAL_BONUS'] },
            status: 'SUCCESS',
          },
          _sum: { amount: true },
        }),
        this.getMonthlyReferralEarnings(userId),
      ]);

    const config = await this.getConfig();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });

    return {
      referralCount,
      convertedCount,
      totalEarned: totalBonusEarned._sum.amount ?? 0,
      monthlyEarnings,
      monthlyCap: config.referralMonthlyCap,
      rewardPerReferral: config.referralRewardReferrer,
      isReferred: !!user?.referredById,
    };
  }

  /**
   * Apply a referral code (referee action).
   * Called when a new user enters a referral code.
   */
  async applyReferralCode(userId: string, referralCode: string) {
    // Can't refer yourself
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referredById: true, createdAt: true },
    });

    if (!currentUser) throw new NotFoundException('User not found');

    if (currentUser.referredById) {
      throw new BadRequestException(
        'You have already been referred by another user.',
      );
    }

    // Only allow referral application within 5 minutes of account creation
    const accountAgeMs = Date.now() - new Date(currentUser.createdAt).getTime();
    const MAX_REFERRAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    if (accountAgeMs > MAX_REFERRAL_WINDOW_MS) {
      throw new BadRequestException(
        'Referral codes can only be applied during sign-up.',
      );
    }

    if (currentUser.referralCode === referralCode) {
      throw new BadRequestException('You cannot refer yourself.');
    }

    // Find the referrer
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, name: true },
    });

    if (!referrer) {
      throw new BadRequestException('Invalid referral code.');
    }

    // Check if already referred by this user
    const existingReferral = await this.prisma.referral.findUnique({
      where: {
        referrerId_refereeId: {
          referrerId: referrer.id,
          refereeId: userId,
        },
      },
    });

    if (existingReferral) {
      throw new BadRequestException(
        'You have already used this referral code.',
      );
    }

    // Create the referral link. The conditional update makes sure a user can
    // only ever be attributed to one referrer, even under concurrent requests.
    try {
      const applied = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.user.updateMany({
          where: { id: userId, referredById: null },
          data: { referredById: referrer.id },
        });

        if (claimed.count !== 1) return false;

        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: userId,
            status: 'PENDING',
          },
        });

        return true;
      });

      if (!applied) {
        throw new BadRequestException(
          'You have already been referred by another user.',
        );
      }
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'You have already used this referral code.',
        );
      }
      throw error;
    }

    this.eventEmitter.emit('referral.created', {
      referrerId: referrer.id,
      refereeId: userId,
    });

    return {
      success: true,
      referrerName: referrer.name,
      message: `Referral applied! You'll both earn rewards after your first completed exchange.`,
    };
  }

  /**
   * Called when an exchange completes — awards referral bonuses.
   */
  async processExchangeCompletion(userId: string, exchangeId: string) {
    const config = await this.getConfig();

    // Check if this user was referred
    const referral = await this.prisma.referral.findFirst({
      where: { refereeId: userId },
    });

    if (!referral) return;

    // First exchange completion → convert referral + initial rewards
    if (referral.status === 'PENDING') {
      await this.convertReferral(
        referral.id,
        referral.referrerId,
        userId,
        config,
      );
    }

    // Ongoing bonus for referrer (within 30 days of referral)
    if (referral.status === 'CONVERTED' || referral.status === 'PENDING') {
      await this.awardReferralBonus(
        referral.id,
        referral.referrerId,
        exchangeId,
        config,
      );
    }
  }

  /**
   * Serialize all referral rewards for one referrer. The monthly cap is an
   * aggregate, so without a row lock two referees completing at the same time
   * could both pass the cap check and be paid.
   */
  private async lockReferrer(
    tx: Prisma.TransactionClient,
    referrerId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${referrerId} FOR UPDATE`;
  }

  private async convertReferral(
    referralId: string,
    referrerId: string,
    refereeId: string,
    config: { referralRewardReferrer: number; referralRewardReferee: number },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockReferrer(tx, referrerId);

      const monthlyEarnings = await this.getMonthlyReferralEarnings(
        referrerId,
        tx,
      );
      const referrerReward = Math.min(
        config.referralRewardReferrer,
        Math.max(0, config.referralRewardReferrer - monthlyEarnings),
      );

      // Claim the conversion atomically. If two exchanges complete at the
      // same time, only one request may pay the conversion rewards.
      const claimed = await tx.referral.updateMany({
        where: { id: referralId, status: 'PENDING' },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          referrerRewarded: referrerReward > 0,
          refereeRewarded: true,
        },
      });

      if (claimed.count !== 1) {
        return { converted: false, referrerReward: 0 };
      }

      // Reward referrer
      if (referrerReward > 0) {
        await tx.user.update({
          where: { id: referrerId },
          data: { pointsBalance: { increment: referrerReward } },
        });
        await tx.pointsTransaction.create({
          data: {
            userId: referrerId,
            amount: referrerReward,
            type: 'REFERRAL_REWARD',
            status: 'SUCCESS',
            referenceId: referralId,
            description: `Referral reward: new user completed their first exchange`,
          },
        });
      }

      // Reward referee
      if (config.referralRewardReferee > 0) {
        await tx.user.update({
          where: { id: refereeId },
          data: { pointsBalance: { increment: config.referralRewardReferee } },
        });
        await tx.pointsTransaction.create({
          data: {
            userId: refereeId,
            amount: config.referralRewardReferee,
            type: 'REFERRAL_REWARD',
            status: 'SUCCESS',
            referenceId: referralId,
            description: `Welcome bonus: earned for completing your first exchange via referral`,
          },
        });
      }

      return { converted: true, referrerReward };
    });

    if (!result.converted) {
      return false;
    }

    this.logger.log(
      `Referral ${referralId} converted. Referrer: +${result.referrerReward}, Referee: +${config.referralRewardReferee}`,
    );

    if (result.referrerReward > 0) {
      this.eventEmitter.emit('referral.rewarded', {
        userId: referrerId,
        amount: result.referrerReward,
        type: 'REWARD',
      });
    }

    if (config.referralRewardReferee > 0) {
      this.eventEmitter.emit('referral.rewarded', {
        userId: refereeId,
        amount: config.referralRewardReferee,
        type: 'REWARD',
      });
    }

    return true;
  }

  private async awardReferralBonus(
    referralId: string,
    referrerId: string,
    exchangeId: string,
    config: {
      referralBonusPerExchange: number;
      referralBonusCap: number;
      referralMonthlyCap: number;
    },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockReferrer(tx, referrerId);

      // Check referral is within 30 days
      const referral = await tx.referral.findUnique({
        where: { id: referralId },
      });

      if (!referral || !referral.convertedAt) {
        return { awarded: false, bonusAmount: 0 };
      }

      // A single exchange must never pay the same referral bonus twice.
      const alreadyAwarded = await tx.pointsTransaction.findFirst({
        where: {
          userId: referrerId,
          type: 'REFERRAL_BONUS',
          referenceId: exchangeId,
        },
        select: { id: true },
      });

      if (alreadyAwarded) return { awarded: false, bonusAmount: 0 };

      const daysSinceConversion =
        (Date.now() - referral.convertedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceConversion > 30) {
        return { awarded: false, bonusAmount: 0 };
      }

      // Check total bonus cap per referral
      if (referral.bonusAwarded >= config.referralBonusCap) {
        return { awarded: false, bonusAmount: 0 };
      }

      // Check monthly earnings cap
      const monthlyEarnings = await this.getMonthlyReferralEarnings(
        referrerId,
        tx,
      );
      if (monthlyEarnings >= config.referralMonthlyCap) {
        return { awarded: false, bonusAmount: 0 };
      }

      const bonusAmount = Math.min(
        config.referralBonusPerExchange,
        config.referralBonusCap - referral.bonusAwarded,
        config.referralMonthlyCap - monthlyEarnings,
      );

      if (bonusAmount <= 0) return { awarded: false, bonusAmount: 0 };

      const claimed = await tx.referral.updateMany({
        where: { id: referralId, bonusAwarded: referral.bonusAwarded },
        data: { bonusAwarded: { increment: bonusAmount } },
      });

      if (claimed.count !== 1) {
        return { awarded: false, bonusAmount: 0 };
      }

      await tx.user.update({
        where: { id: referrerId },
        data: { pointsBalance: { increment: bonusAmount } },
      });

      await tx.pointsTransaction.create({
        data: {
          userId: referrerId,
          amount: bonusAmount,
          type: 'REFERRAL_BONUS',
          status: 'SUCCESS',
          referenceId: exchangeId,
          description: `Referral bonus: your referred user completed an exchange`,
        },
      });

      return { awarded: true, bonusAmount };
    });

    if (!result.awarded) return false;

    this.logger.log(
      `Referral bonus: +${result.bonusAmount} pts to referrer ${referrerId} for exchange ${exchangeId}`,
    );

    this.eventEmitter.emit('referral.rewarded', {
      userId: referrerId,
      amount: result.bonusAmount,
      type: 'BONUS',
    });

    return true;
  }

  private async getMonthlyReferralEarnings(
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await client.pointsTransaction.aggregate({
      where: {
        userId,
        type: { in: ['REFERRAL_REWARD', 'REFERRAL_BONUS'] },
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  private async getConfig() {
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

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity

    for (let attempts = 0; attempts < 10; attempts++) {
      let code = '';
      for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
        code += chars.charAt(randomInt(chars.length));
      }

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (!existing) return code;
    }

    throw new BadRequestException(
      'Could not generate a unique referral code. Please try again.',
    );
  }
}
