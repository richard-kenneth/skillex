import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateProfileDto } from '@skillex/shared';
import { IncomingHttpHeaders } from 'http';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findOne(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
        receivedReviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, image: true },
            },
            exchange: {
              include: {
                taughtSkill: true,
                receivedSkill: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Public profile view. Never include email, balance, referral details,
   * notification preferences, or other private account fields here.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        createdAt: true,
        skills: {
          select: {
            id: true,
            type: true,
            experienceLevel: true,
            createdAt: true,
            skill: {
              select: {
                id: true,
                name: true,
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        receivedReviews: {
          select: {
            id: true,
            rating: true,
            tags: true,
            createdAt: true,
            reviewer: {
              select: { id: true, name: true, image: true },
            },
            exchange: {
              select: {
                id: true,
                taughtSkill: { select: { id: true, name: true } },
                receivedSkill: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateAvatar(url: string, requestHeaders: IncomingHttpHeaders) {
    const internalSecret = process.env.INTERNAL_SECRET;

    if (!internalSecret) {
      this.logger.error(
        'INTERNAL_SECRET is not configured; refusing to update an avatar',
      );
      throw new InternalServerErrorException(
        'Avatar updates are temporarily unavailable',
      );
    }

    const secureHeaders = new Headers();

    // Forward only the credentials Better Auth needs to identify the user.
    // Do not copy arbitrary client-controlled headers into an internal call.
    if (requestHeaders.authorization) {
      secureHeaders.set('authorization', requestHeaders.authorization);
    }
    if (requestHeaders.cookie) {
      secureHeaders.set('cookie', requestHeaders.cookie);
    }

    secureHeaders.set('x-server-secret', internalSecret);

    return this.authService.auth.api.updateUser({
      body: {
        image: url,
      },
      headers: secureHeaders,
    });
  }
}
