import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { PrismaService } from '../prisma/prisma.service';
import { getAuthConfig } from './auth-options';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  public auth;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    this.auth = betterAuth(getAuthConfig(this.prisma, this.emailService));
  }
}
