import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AcceptSlotsDto,
  CreateExchangeRequestDto,
  ProposeTermsAndSlotsDto,
  SendMessageDto,
  type UpdateAvailabilityDto,
} from '@skil-ex2/shared';
import { ExchangeRequest, SessionStatus } from '../generated/prisma/client';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { R2Service } from '../uploads/r2.service';

@Injectable()
export class ExchangesService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
    private eventEmitter: EventEmitter2,
    private r2: R2Service,
    private referralsService: ReferralsService,
  ) {}

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

  /**
   * Create a new exchange request with an optional initial points proposal.
   */
  async createRequest(senderId: string, data: CreateExchangeRequestDto) {
    if (senderId === data.receiverId) {
      throw new BadRequestException(
        'You cannot request an exchange with yourself.',
      );
    }

    // If points > 0, a payer must be specified
    if ((data.pointsProposal ?? 0) > 0 && !data.pointsPayerId) {
      throw new BadRequestException(
        'pointsPayerId is required when proposing points.',
      );
    }

    // Payer must be sender or receiver
    if (
      data.pointsPayerId &&
      data.pointsPayerId !== senderId &&
      data.pointsPayerId !== data.receiverId
    ) {
      throw new BadRequestException(
        'Points payer must be the sender or receiver.',
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

    const pointsProposal = data.pointsProposal ?? 0;

    // Validate balance if the sender is the payer
    if (pointsProposal > 0 && data.pointsPayerId === senderId) {
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { pointsBalance: true },
      });
      if (sender && sender.pointsBalance < pointsProposal) {
        throw new BadRequestException('Insufficient points balance');
      }
    }

    const request = await this.prisma.exchangeRequest.create({
      data: {
        senderId,
        receiverId: data.receiverId,
        requestedSkillId: data.requestedSkillId,
        offeredSkillId: data.offeredSkillId,
        requestedSkillSessions: data.requestedSkillSessions ?? 1,
        requestedSkillDuration: data.requestedSkillDuration ?? 60,
        offeredSkillSessions: data.offeredSkillSessions ?? 1,
        offeredSkillDuration: data.offeredSkillDuration ?? 60,
        senderAgreed: true,
        receiverAgreed: false,
        pointsProposal: data.pointsProposal ?? 0,
        pointsPayerId:
          (data.pointsProposal ?? 0) > 0 ? data.pointsPayerId : null,
        pointsProposedBy: (data.pointsProposal ?? 0) > 0 ? senderId : null,
        status: 'PENDING',
      },
      include: {
        requestedSkill: true,
        offeredSkill: true,
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
    });

    return request;
  }

  async getMyRequests(userId: string) {
    const includeFields = {
      requestedSkill: true,
      offeredSkill: true,
      proposedSlots: {
        include: { skill: true },
        orderBy: { createdAt: 'asc' as const },
      },
      messages: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          messageKey: true,
          pointsProposal: true,
          pointsPayerId: true,
          requestedSkillSessions: true,
          requestedSkillDuration: true,
          offeredSkillSessions: true,
          offeredSkillDuration: true,
          senderId: true,
          createdAt: true,
        },
      },
    };

    const [sent, received] = await Promise.all([
      this.prisma.exchangeRequest.findMany({
        where: { senderId: userId },
        include: {
          receiver: { select: { id: true, name: true, image: true } },
          ...includeFields,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exchangeRequest.findMany({
        where: { receiverId: userId },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          ...includeFields,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { sent, received };
  }

  /**
   * Get a single request with full details for the negotiation page.
   */
  async getRequestById(userId: string, requestId: string) {
    const request = await this.prisma.exchangeRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
        requestedSkill: true,
        offeredSkill: true,
        proposedSlots: {
          include: {
            skill: true,
            proposer: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            messageKey: true,
            pointsProposal: true,
            pointsPayerId: true,
            requestedSkillSessions: true,
            requestedSkillDuration: true,
            offeredSkillSessions: true,
            offeredSkillDuration: true,
            senderId: true,
            createdAt: true,
          },
        },
        exchange: { select: { id: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Exchange request not found.');
    }

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only the request participants can view this request.',
      );
    }

    return request;
  }

  /**
   * Send a predefined message on a PENDING request.
   * Handles term proposals and mutual agreement.
   */
  async sendMessage(userId: string, requestId: string, data: SendMessageDto) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only the request participants can send messages.',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only send messages on PENDING requests.',
      );
    }

    const otherUserId =
      userId === request.senderId ? request.receiverId : request.senderId;

    let isCounterProposal = false;
    let newSenderAgreed = request.senderAgreed;
    let newReceiverAgreed = request.receiverAgreed;

    if (data.messageKey === 'PROPOSE_TERMS') {
      isCounterProposal = true;
      if (!data.pointsPayerId && (data.pointsProposal ?? 0) > 0) {
        throw new BadRequestException(
          'pointsPayerId is required when proposing points.',
        );
      }
      // Early validation: if the proposer is the payer, check their balance now
      if ((data.pointsProposal ?? 0) > 0 && data.pointsPayerId === userId) {
        const payer = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { pointsBalance: true },
        });
        if (!payer || payer.pointsBalance < (data.pointsProposal ?? 0)) {
          throw new BadRequestException(
            `Insufficient points. You have ${payer?.pointsBalance ?? 0} but proposed ${data.pointsProposal}.`,
          );
        }
      }
      if (userId === request.senderId) {
        newSenderAgreed = true;
        newReceiverAgreed = false;
      } else {
        newReceiverAgreed = true;
        newSenderAgreed = false;
      }
    } else if (data.messageKey === 'AGREE_TO_TERMS') {
      if (userId === request.senderId) {
        newSenderAgreed = true;
      } else {
        newReceiverAgreed = true;
      }
      // Early validation: if the agreeing user is the payer, check their balance now
      if (request.pointsProposal > 0 && request.pointsPayerId === userId) {
        const payer = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { pointsBalance: true },
        });
        if (!payer || payer.pointsBalance < request.pointsProposal) {
          throw new BadRequestException(
            `Insufficient points to agree. You have ${payer?.pointsBalance ?? 0} but ${request.pointsProposal} are needed.`,
          );
        }
      }
    }

    // Pre-validate: if auto-commit would trigger, ensure payer has enough points
    await this.validateEscrowPreConditions(
      request,
      newSenderAgreed,
      newReceiverAgreed,
    );

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          requestId,
          senderId: userId,
          receiverId: otherUserId,
          messageKey: data.messageKey,
          pointsProposal: isCounterProposal ? data.pointsProposal : null,
          pointsPayerId: isCounterProposal ? data.pointsPayerId : null,
          requestedSkillSessions: isCounterProposal
            ? data.requestedSkillSessions
            : null,
          requestedSkillDuration: isCounterProposal
            ? data.requestedSkillDuration
            : null,
          offeredSkillSessions: isCounterProposal
            ? data.offeredSkillSessions
            : null,
          offeredSkillDuration: isCounterProposal
            ? data.offeredSkillDuration
            : null,
        },
      }),
      this.prisma.exchangeRequest.update({
        where: { id: requestId },
        data: {
          senderAgreed: newSenderAgreed,
          receiverAgreed: newReceiverAgreed,
          ...(isCounterProposal && {
            pointsProposal: data.pointsProposal ?? 0,
            pointsPayerId: data.pointsPayerId ?? null,
            pointsProposedBy: userId,
            requestedSkillSessions: data.requestedSkillSessions,
            requestedSkillDuration: data.requestedSkillDuration,
            offeredSkillSessions: data.offeredSkillSessions,
            offeredSkillDuration: data.offeredSkillDuration,
          }),
        },
      }),
    ]);

    // Re-fetch to check auto-commit conditions
    const updatedRequest = await this.findRequestOrFail(requestId);
    await this.checkAutoCommit(updatedRequest);

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      message,
    });

    return message;
  }

  /**
   * Propose terms and available time slots.
   */
  async proposeTermsAndSlots(
    userId: string,
    requestId: string,
    data: ProposeTermsAndSlotsDto,
  ) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only the request participants can propose.',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only propose on PENDING requests.');
    }

    if (!data.pointsPayerId && (data.pointsProposal ?? 0) > 0) {
      throw new BadRequestException(
        'pointsPayerId is required when proposing points.',
      );
    }

    const validSkillIds = [
      request.requestedSkillId,
      request.offeredSkillId,
    ].filter(Boolean) as string[];

    for (const slot of data.slots) {
      if (!validSkillIds.includes(slot.skillId)) {
        throw new BadRequestException(
          `Skill ${slot.skillId} is not part of this exchange.`,
        );
      }
    }

    // Early validation: if the proposer is the payer, check their balance now
    if ((data.pointsProposal ?? 0) > 0 && data.pointsPayerId === userId) {
      const payer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      if (!payer || payer.pointsBalance < (data.pointsProposal ?? 0)) {
        throw new BadRequestException(
          `Insufficient points. You have ${payer?.pointsBalance ?? 0} but proposed ${data.pointsProposal}.`,
        );
      }
    }

    const otherUserId =
      userId === request.senderId ? request.receiverId : request.senderId;

    let newSenderAgreed = false;
    let newReceiverAgreed = false;
    if (userId === request.senderId) {
      newSenderAgreed = true;
    } else {
      newReceiverAgreed = true;
    }

    const existingSlots = await this.prisma.proposedSlot.findMany({
      where: { requestId, status: 'PROPOSED' },
    });

    const existingSlotsMap = new Map<string, string>();
    for (const slot of existingSlots) {
      const key = `${slot.skillId}-${slot.dayOfWeek}-${slot.startTime}`;
      if (!existingSlotsMap.has(key)) {
        existingSlotsMap.set(key, slot.proposerId);
      }
    }

    const [, , message] = await this.prisma.$transaction([
      this.prisma.proposedSlot.deleteMany({
        where: { requestId, status: 'PROPOSED' },
      }),
      this.prisma.proposedSlot.createMany({
        data: data.slots.map((slot) => {
          const key = `${slot.skillId}-${slot.dayOfWeek}-${slot.startTime}`;
          return {
            requestId,
            proposerId: existingSlotsMap.get(key) || userId,
            skillId: slot.skillId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
          };
        }),
      }),
      this.prisma.message.create({
        data: {
          requestId,
          senderId: userId,
          receiverId: otherUserId,
          messageKey: 'PROPOSE_TERMS',
          pointsProposal: data.pointsProposal,
          pointsPayerId: data.pointsPayerId,
          requestedSkillSessions: data.requestedSkillSessions,
          requestedSkillDuration: data.requestedSkillDuration,
          offeredSkillSessions: data.offeredSkillSessions,
          offeredSkillDuration: data.offeredSkillDuration,
        },
      }),
      this.prisma.exchangeRequest.update({
        where: { id: requestId },
        data: {
          senderAgreed: newSenderAgreed,
          receiverAgreed: newReceiverAgreed,
          pointsProposal: data.pointsProposal ?? 0,
          pointsPayerId: data.pointsPayerId ?? null,
          pointsProposedBy: userId,
          requestedSkillSessions: data.requestedSkillSessions,
          requestedSkillDuration: data.requestedSkillDuration,
          offeredSkillSessions: data.offeredSkillSessions,
          offeredSkillDuration: data.offeredSkillDuration,
        },
      }),
    ]);

    const updatedRequest = await this.findRequestOrFail(requestId);
    await this.checkAutoCommit(updatedRequest);

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      message,
    });

    return message;
  }

  /**
   * Accept proposed time slots and overall terms.
   */
  async acceptTermsAndSlots(userId: string, data: AcceptSlotsDto) {
    const request = await this.findRequestOrFail(data.requestId);

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException('Only the request participants can accept.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only accept on PENDING requests.');
    }

    const slots = await this.prisma.proposedSlot.findMany({
      where: {
        id: { in: data.slotIds },
        requestId: data.requestId,
      },
    });

    if (slots.length !== data.slotIds.length || data.slotIds.length === 0) {
      throw new BadRequestException(
        'One or more slot IDs are invalid or missing.',
      );
    }

    // Early validation: if the acceptor is the payer, check their balance now
    if (request.pointsProposal > 0 && request.pointsPayerId === userId) {
      const payer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      if (!payer || payer.pointsBalance < request.pointsProposal) {
        throw new BadRequestException(
          `Insufficient points to accept. You have ${payer?.pointsBalance ?? 0} but ${request.pointsProposal} are needed.`,
        );
      }
    }

    const otherUserId =
      userId === request.senderId ? request.receiverId : request.senderId;

    let newSenderAgreed = request.senderAgreed;
    let newReceiverAgreed = request.receiverAgreed;
    if (userId === request.senderId) {
      newSenderAgreed = true;
    } else {
      newReceiverAgreed = true;
    }

    // Pre-validate: if auto-commit would trigger, ensure payer has enough points
    await this.validateEscrowPreConditions(
      request,
      newSenderAgreed,
      newReceiverAgreed,
      data.slotIds.length,
    );

    const [, message] = await this.prisma.$transaction([
      this.prisma.proposedSlot.updateMany({
        where: { id: { in: data.slotIds } },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.exchangeRequest.update({
        where: { id: data.requestId },
        data: {
          senderAgreed: newSenderAgreed,
          receiverAgreed: newReceiverAgreed,
        },
      }),
      this.prisma.message.create({
        data: {
          requestId: data.requestId,
          senderId: userId,
          receiverId: otherUserId,
          messageKey: 'AGREE_TO_TERMS',
        },
      }),
    ]);

    const updatedRequest = await this.findRequestOrFail(data.requestId);
    await this.checkAutoCommit(updatedRequest);

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      message,
    });

    return message;
  }

  /**
   * Pre-validate escrow conditions BEFORE committing accept/agree state.
   * This prevents the request from getting stuck in a corrupted state
   * (both users agreed, but exchange not created due to insufficient funds).
   *
   * @param request - The current exchange request
   * @param projectedSenderAgreed - What senderAgreed would be after the pending operation
   * @param projectedReceiverAgreed - What receiverAgreed would be after the pending operation
   * @param additionalAcceptedSlots - Number of slots about to be accepted (0 for sendMessage)
   */
  private async validateEscrowPreConditions(
    request: ExchangeRequest,
    projectedSenderAgreed: boolean,
    projectedReceiverAgreed: boolean,
    additionalAcceptedSlots: number = 0,
  ) {
    // Auto-commit only triggers when both users agree
    if (!projectedSenderAgreed || !projectedReceiverAgreed) return;

    const totalRequired =
      request.requestedSkillSessions + request.offeredSkillSessions;

    const currentAccepted = await this.prisma.proposedSlot.count({
      where: { requestId: request.id, status: 'ACCEPTED' },
    });

    // Check if auto-commit would trigger
    if (currentAccepted + additionalAcceptedSlots < totalRequired) return;

    // Auto-commit would trigger — validate escrow if points are involved
    if (request.pointsProposal > 0 && request.pointsPayerId) {
      const payer = await this.prisma.user.findUnique({
        where: { id: request.pointsPayerId },
        select: { pointsBalance: true },
      });

      if (!payer || payer.pointsBalance < request.pointsProposal) {
        throw new BadRequestException(
          `Insufficient points to commit exchange. Balance: ${payer?.pointsBalance ?? 0}, required: ${request.pointsProposal}.`,
        );
      }
    }
  }

  /**
   * Check if auto-commit conditions are met:
   * 1. Both users agreed on terms
   * 2. All required sessions have accepted slots
   */
  private async checkAutoCommit(request: ExchangeRequest) {
    if (request.status !== 'PENDING') return;
    if (!request.senderAgreed || !request.receiverAgreed) return;

    const totalRequired =
      request.requestedSkillSessions + request.offeredSkillSessions;

    const acceptedSlotCount = await this.prisma.proposedSlot.count({
      where: {
        requestId: request.id,
        status: 'ACCEPTED',
      },
    });

    if (acceptedSlotCount >= totalRequired) {
      await this.commitExchangeInternal(request);
    }
  }

  /**
   * Internal mechanism to commit an exchange.
   * Creates the Exchange, ExchangeSession records, and locks escrow.
   */
  private async commitExchangeInternal(request: ExchangeRequest) {
    const pointsAmount = request.pointsProposal;
    const pointsPayerId = request.pointsPayerId;

    if (pointsAmount > 0 && pointsPayerId) {
      await this.pointsService.lockEscrow(
        pointsPayerId,
        pointsAmount,
        request.id,
      );
    }

    // Get accepted slots to create sessions
    const acceptedSlots = await this.prisma.proposedSlot.findMany({
      where: { requestId: request.id, status: 'ACCEPTED' },
      orderBy: { createdAt: 'asc' },
    });

    // Create the exchange with sessions
    await this.prisma.$transaction([
      this.prisma.exchange.create({
        data: {
          requestId: request.id,
          senderId: request.senderId,
          receiverId: request.receiverId,
          taughtSkillId: request.requestedSkillId,
          receivedSkillId: request.offeredSkillId,
          pointsAmount,
          pointsPayerId,
          escrowLocked: pointsAmount > 0,
          requestedSkillSessions: request.requestedSkillSessions,
          requestedSkillDuration: request.requestedSkillDuration,
          offeredSkillSessions: request.offeredSkillSessions,
          offeredSkillDuration: request.offeredSkillDuration,
          status: 'COMMITTED',
          sessions: {
            create: acceptedSlots.map((slot) => {
              // Convert dayOfWeek + startTime to next occurrence
              const scheduledAt = this.getNextOccurrence(
                slot.dayOfWeek,
                slot.startTime,
              );
              return {
                skillId: slot.skillId,
                scheduledAt,
                duration:
                  slot.skillId === request.requestedSkillId
                    ? request.requestedSkillDuration
                    : request.offeredSkillDuration,
              };
            }),
          },
        },
      }),
      this.prisma.exchangeRequest.update({
        where: { id: request.id },
        data: { status: 'COMMITTED' },
      }),
    ]);
  }

  /**
   * Convert dayOfWeek (0=Sun..6=Sat) + startTime ("14:00") to a real Date
   * for the next occurrence of that day from today.
   */
  private getNextOccurrence(dayOfWeek: number, startTime: string): Date {
    const [hours, minutes] = startTime.split(':').map(Number);
    const now = new Date();
    const todayDay = now.getDay();
    let daysUntil = dayOfWeek - todayDay;
    if (daysUntil <= 0) daysUntil += 7;

    const date = new Date(now);
    date.setDate(date.getDate() + daysUntil);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get the negotiation thread for a request.
   */
  async getMessages(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only the request participants can view messages.',
      );
    }

    return this.prisma.message.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        messageKey: true,
        pointsProposal: true,
        pointsPayerId: true,
        requestedSkillSessions: true,
        requestedSkillDuration: true,
        offeredSkillSessions: true,
        offeredSkillDuration: true,
        senderId: true,
        createdAt: true,
      },
    });
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only the receiver can reject this exchange request.',
      );
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    const updated = await this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      message: 'Exchange request rejected.',
    });

    return updated;
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId) {
      throw new ForbiddenException(
        'Only the sender can cancel this exchange request.',
      );
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be canceled.');
    }

    const updated = await this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      message: 'Exchange request canceled.',
    });

    return updated;
  }

  /**
   * Get all exchanges for a user (as teacher or learner).
   */
  async getMyExchanges(userId: string) {
    return this.prisma.exchange.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
        taughtSkill: true,
        receivedSkill: true,
        sessions: { orderBy: { scheduledAt: 'asc' } },
      },
      orderBy: { committedAt: 'desc' },
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

  async updateAvailability(
    userId: string,
    requestId: string,
    data: UpdateAvailabilityDto,
  ) {
    const request = await this.findRequestOrFail(requestId);

    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new ForbiddenException(
        'Only participants can update availability.',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'Availability can only be updated for pending requests.',
      );
    }

    const isSender = request.senderId === userId;
    const availabilityField = isSender
      ? 'senderAvailability'
      : 'receiverAvailability';

    const updatedRequest = await this.prisma.exchangeRequest.update({
      where: { id: requestId },
      data: {
        [availabilityField]: data as any,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    this.eventEmitter.emit('exchange.updated', {
      userIds: [request.senderId, request.receiverId],
      requestId: request.id,
      updatedByUserId: userId,
      messageKeyOverride: 'AVAILABILITY_UPDATED',
    });

    return updatedRequest;
  }

  async getExchangeById(userId: string, exchangeId: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
        taughtSkill: true,
        receivedSkill: true,
        sessions: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            skill: true,
            recordings: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        request: true,
      },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    return exchange;
  }

  async updateSessionStatus(
    userId: string,
    exchangeId: string,
    sessionId: string,
    status: (typeof SessionStatus)[keyof typeof SessionStatus],
  ) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: { sessions: true },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    const session = exchange.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (status === 'COMPLETED') {
      const isTaughtSkill = session.skillId === exchange.taughtSkillId;
      const learnerId = isTaughtSkill ? exchange.senderId : exchange.receiverId;

      if (userId !== learnerId) {
        throw new ForbiddenException(
          'Only the learner can mark a session as completed',
        );
      }
    }

    const updatedSession = await this.prisma.exchangeSession.update({
      where: { id: sessionId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    this.eventEmitter.emit('session.updated', {
      userIds: [exchange.senderId, exchange.receiverId],
      exchangeId,
      sessionId,
    });

    return updatedSession;
  }

  async markExchangeComplete(userId: string, exchangeId: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    const isSender = exchange.senderId === userId;
    const updateData = isSender
      ? { senderCompleted: true }
      : { receiverCompleted: true };

    const updatedExchange = await this.prisma.exchange.update({
      where: { id: exchangeId },
      data: updateData,
    });

    // Check mutual completion
    if (updatedExchange.senderCompleted && updatedExchange.receiverCompleted) {
      await this.prisma.exchange.update({
        where: { id: exchangeId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Release escrow if points were involved
      if (
        updatedExchange.pointsAmount > 0 &&
        updatedExchange.pointsPayerId &&
        updatedExchange.escrowLocked
      ) {
        const receiverId =
          updatedExchange.pointsPayerId === updatedExchange.senderId
            ? updatedExchange.receiverId
            : updatedExchange.senderId;

        await this.pointsService.releaseEscrow(
          updatedExchange.pointsPayerId,
          receiverId,
          updatedExchange.pointsAmount,
          exchangeId,
        );

        // update escrowLocked to false
        await this.prisma.exchange.update({
          where: { id: exchangeId },
          data: { escrowLocked: false },
        });
      }

      this.eventEmitter.emit('exchange.completed', {
        userIds: [exchange.senderId, exchange.receiverId],
        exchangeId,
      });

      // Apply facilitation fee to both participants (platform revenue on every swap)
      await Promise.allSettled([
        this.pointsService.applyFacilitationFee(
          exchange.senderId,
          exchangeId,
        ),
        this.pointsService.applyFacilitationFee(
          exchange.receiverId,
          exchangeId,
        ),
      ]);

      // Process referral rewards for both participants
      await Promise.allSettled([
        this.referralsService.processExchangeCompletion(
          exchange.senderId,
          exchangeId,
        ),
        this.referralsService.processExchangeCompletion(
          exchange.receiverId,
          exchangeId,
        ),
      ]);
    }

    return await this.getExchangeById(userId, exchangeId);
  }

  /* ─── Exchange Chat ──────────────────────────────────────── */

  async sendChatMessage(
    userId: string,
    exchangeId: string,
    content?: string,
    fileKey?: string,
    fileName?: string,
    fileType?: string,
  ) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
    });

    if (!exchange) throw new NotFoundException('Exchange not found');
    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    if (!content && !fileKey) {
      throw new BadRequestException(
        'Either content or a file must be provided.',
      );
    }

    const message = await this.prisma.exchangeChatMessage.create({
      data: {
        exchangeId,
        senderId: userId,
        content: content || null,
        fileKey: fileKey || null,
        fileName: fileName || null,
        fileType: fileType || null,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    this.eventEmitter.emit('chat.message.sent', {
      exchangeId: exchange.id,
      messageId: message.id,
      senderId: userId,
      receiverId: userId === exchange.senderId ? exchange.receiverId : exchange.senderId,
      content: content || (fileKey ? 'Sent an attachment' : ''),
    });

    return message;
  }

  async getChatMessages(userId: string, exchangeId: string) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
    });

    if (!exchange) throw new NotFoundException('Exchange not found');
    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    const messages = await this.prisma.exchangeChatMessage.findMany({
      where: { exchangeId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    // If any message has a fileKey, generate a presigned download URL
    return Promise.all(
      messages.map(async (msg) => {
        if (msg.fileKey) {
          const fileUrl = await this.r2.getPresignedDownloadUrl(
            msg.fileKey,
            3600,
          );
          return { ...msg, fileUrl };
        }
        return { ...msg, fileUrl: null };
      }),
    );
  }

  async getChatUploadUrl(
    userId: string,
    exchangeId: string,
    fileName: string,
    contentType: string,
  ) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
    });

    if (!exchange) throw new NotFoundException('Exchange not found');
    if (exchange.senderId !== userId && exchange.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    const key = `exchange-chat/${exchangeId}/${Date.now()}-${fileName}`;
    const uploadUrl = await this.r2.getPresignedUploadUrl(
      key,
      contentType,
      3600,
    );

    return { uploadUrl, key };
  }
}
