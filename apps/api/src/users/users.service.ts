import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

  async getProfile(userId: string) {
    const user = await this.findOne(userId);
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
    const secureHeaders = new Headers();

    for (const [key, value] of Object.entries(requestHeaders)) {
      if (typeof value === 'string') {
        secureHeaders.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => secureHeaders.append(key, v));
      }
    }

    secureHeaders.set('x-server-secret', process.env.INTERNAL_SECRET!);

    return this.authService.auth.api.updateUser({
      body: {
        image: url,
      },
      headers: secureHeaders,
    });
  }
}
