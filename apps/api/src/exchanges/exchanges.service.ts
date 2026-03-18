import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds users who are OFFERING the skill the current user is SEEKING,
   * and who are SEEKING a skill the current user is OFFERING.
   */
  async findMatches(userId: string) {
    // 1. Get current user's skills
    const currentUserSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const seekingSkillIds = currentUserSkills
      .filter((s) => s.type === 'SEEKING')
      .map((s) => s.skillId);

    const offeringSkillIds = currentUserSkills
      .filter((s) => s.type === 'OFFERING')
      .map((s) => s.skillId);

    if (seekingSkillIds.length === 0) {
      return {
        message:
          'You are not seeking any skills. Add skills you want to learn to find matches!',
      };
    }

    // 2. Query for perfect matches
    // A perfect match is someone offering what I seek, AND seeking what I offer.
    const perfectMatches = await this.prisma.user.findMany({
      where: {
        id: { not: userId }, // Don't match with self
        skills: {
          some: {
            skillId: { in: seekingSkillIds },
            type: 'OFFERING',
          },
        },
        AND: {
          skills: {
            some: {
              skillId: { in: offeringSkillIds },
              type: 'SEEKING',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
        skills: {
          include: { skill: true },
        },
      },
    });

    // 3. Query for partial matches (People offering what I seek, but maybe they want Timebank credits instead)
    const partialMatches = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: perfectMatches.map((m) => m.id), // Exclude those already in perfect matches
        },
        skills: {
          some: {
            skillId: { in: seekingSkillIds },
            type: 'OFFERING',
          },
        },
      },
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
        skills: {
          include: { skill: true },
        },
      },
    });

    return {
      perfectMatches,
      partialMatches,
    };
  }

  async createRequest(
    senderId: string,
    receiverId: string,
    requestedSkillId: string,
    offeredSkillId?: string,
  ) {
    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot request an exchange with yourself.',
      );
    }

    return this.prisma.exchangeRequest.create({
      data: {
        senderId,
        receiverId,
        requestedSkillId,
        offeredSkillId,
        message:
          "Hi! I saw you are offering a skill I want to learn. Let's connect!",
        status: 'PENDING',
      },
    });
  }
}
