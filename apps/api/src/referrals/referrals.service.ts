import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

    // Generate a unique code
    const code = await this.generateUniqueCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return { referralCode: code };
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

    // Create the referral link
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { referredById: referrer.id },
      }),
      this.prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: userId,
          status: 'PENDING',
        },
      }),
    ]);

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

  private async convertReferral(
    referralId: string,
    referrerId: string,
    refereeId: string,
    config: { referralRewardReferrer: number; referralRewardReferee: number },
  ) {
    const monthlyEarnings = await this.getMonthlyReferralEarnings(referrerId);
    const referrerReward = Math.min(
      config.referralRewardReferrer,
      Math.max(0, config.referralRewardReferrer - monthlyEarnings),
    );

    await this.prisma.$transaction(async (tx) => {
      // Mark referral as converted
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          referrerRewarded: referrerReward > 0,
          refereeRewarded: true,
        },
      });

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
    });

    this.logger.log(
      `Referral ${referralId} converted. Referrer: +${referrerReward}, Referee: +${config.referralRewardReferee}`,
    );

    if (referrerReward > 0) {
      this.eventEmitter.emit('referral.rewarded', {
        userId: referrerId,
        amount: referrerReward,
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
    // Check referral is within 30 days
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral || !referral.convertedAt) return;

    const daysSinceConversion =
      (Date.now() - referral.convertedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceConversion > 30) return;

    // Check total bonus cap per referral
    if (referral.bonusAwarded >= config.referralBonusCap) return;

    // Check monthly earnings cap
    const monthlyEarnings = await this.getMonthlyReferralEarnings(referrerId);
    if (monthlyEarnings >= config.referralMonthlyCap) return;

    const bonusAmount = Math.min(
      config.referralBonusPerExchange,
      config.referralBonusCap - referral.bonusAwarded,
      config.referralMonthlyCap - monthlyEarnings,
    );

    if (bonusAmount <= 0) return;

    await this.prisma.$transaction(async (tx) => {
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

      await tx.referral.update({
        where: { id: referralId },
        data: { bonusAwarded: { increment: bonusAmount } },
      });
    });

    this.logger.log(
      `Referral bonus: +${bonusAmount} pts to referrer ${referrerId} for exchange ${exchangeId}`,
    );

    this.eventEmitter.emit('referral.rewarded', {
      userId: referrerId,
      amount: bonusAmount,
      type: 'BONUS',
    });
  }

  private async getMonthlyReferralEarnings(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.prisma.pointsTransaction.aggregate({
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

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
    let attempts = 0;

    while (attempts < 10) {
      let code = '';
      for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      if (!existing) return code;
      attempts++;
    }

    // Fallback to longer code
    return `${Date.now().toString(36).toUpperCase()}`.slice(
      0,
      REFERRAL_CODE_LENGTH,
    );
  }
}
