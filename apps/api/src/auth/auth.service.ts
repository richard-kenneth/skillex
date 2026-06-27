import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { PrismaService } from '../prisma/prisma.service';
import { getAuthConfig } from './auth-options';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  public auth;

  constructor(private prisma: PrismaService) {
    this.auth = betterAuth(
      getAuthConfig(this.prisma as unknown as PrismaClient),
    );
  }
}
