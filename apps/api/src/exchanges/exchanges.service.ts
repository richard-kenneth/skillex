import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExchangeRequestDto } from '@skil-ex2/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds users who are OFFERING the skill the current user is SEEKING,
   * and who are SEEKING a skill the current user is OFFERING.
   */
  async findMatches(userId: string) {
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
      return { perfectMatches: [], partialMatches: [] };
    }

    // Perfect matches: offering what I seek AND seeking what I offer
    const perfectMatches = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
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

    // Partial matches: offering what I seek (but not necessarily seeking what I offer)
    const partialMatches = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: perfectMatches.map((m) => m.id),
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

    return { perfectMatches, partialMatches };
  }

  async createRequest(senderId: string, data: CreateExchangeRequestDto) {
    if (senderId === data.receiverId) {
      throw new BadRequestException(
        'You cannot request an exchange with yourself.',
      );
    }

    // Check for duplicate pending request
    const existing = await this.prisma.exchangeRequest.findFirst({
      where: {
        senderId,
        receiverId: data.receiverId,
        requestedSkillId: data.requestedSkillId,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new ConflictException(
        'You already have a pending request for this skill with this user.',
      );
    }

    return this.prisma.exchangeRequest.create({
      data: {
        senderId,
        receiverId: data.receiverId,
        requestedSkillId: data.requestedSkillId,
        offeredSkillId: data.offeredSkillId,
        message: data.message ?? "Hi! I'd love to exchange skills with you.",
        status: 'PENDING',
      },
      include: {
        requestedSkill: true,
        offeredSkill: true,
        receiver: { select: { id: true, name: true, image: true } },
      },
    });
  }

  async getMyRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.exchangeRequest.findMany({
        where: { senderId: userId },
        include: {
          receiver: { select: { id: true, name: true, image: true } },
          requestedSkill: true,
          offeredSkill: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exchangeRequest.findMany({
        where: { receiverId: userId },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          requestedSkill: true,
          offeredSkill: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { sent, received };
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.receiverId !== userId) {
      throw new ForbiddenException('Only the receiver can accept a request.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot accept a request with status: ${request.status}`,
      );
    }

    return this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        requestedSkill: true,
        offeredSkill: true,
      },
    });
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.receiverId !== userId) {
      throw new ForbiddenException('Only the receiver can reject a request.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject a request with status: ${request.status}`,
      );
    }

    return this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        requestedSkill: true,
        offeredSkill: true,
      },
    });
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId) {
      throw new ForbiddenException('Only the sender can cancel a request.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel a request with status: ${request.status}`,
      );
    }

    return this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
      include: {
        receiver: { select: { id: true, name: true, image: true } },
        requestedSkill: true,
        offeredSkill: true,
      },
    });
  }

  private async findRequestOrFail(requestId: string) {
    const request = await this.prisma.exchangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Exchange request not found.');
    }

    return request;
  }
}
