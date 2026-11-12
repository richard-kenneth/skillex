import type { BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { PrismaClient } from '../generated/prisma/client';
import { expo } from '@better-auth/expo';
import { bearer, emailOTP } from 'better-auth/plugins';
import { getDevExtraOrigins } from '../common/config/origins';
import { isTrustedInternalRequest } from '../common/security/internal-auth';
import type { EmailService } from '../email/email.service';

export const getAuthConfig = (
  prisma: PrismaClient,
  emailService: EmailService,
): BetterAuthOptions => ({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  advanced: { database: { joins: true } },
  plugins: [
    expo(),
    bearer(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'email-verification') {
          await emailService.send({
            to: email,
            subject: 'Verify your email address',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1a202c; margin-bottom: 16px;">Welcome to SkillEx!</h2>
                <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
                  Please verify your email address using the code below. This code will expire in 10 minutes.
                </p>
                <div style="background-color: #f7fafc; border: 2px dashed #3182ce; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3182ce;">${otp}</span>
                </div>
                <p style="color: #718096; font-size: 14px; margin-top: 32px;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            `,
          });
        } else if (type === 'forget-password') {
          await emailService.send({
            to: email,
            subject: 'Reset your password',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1a202c; margin-bottom: 16px;">Reset your password</h2>
                <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
                  You requested to reset your password. Use the code below to proceed. This code will expire in 10 minutes.
                </p>
                <div style="background-color: #f7fafc; border: 2px dashed #3182ce; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3182ce;">${otp}</span>
                </div>
                <p style="color: #718096; font-size: 14px; margin-top: 32px;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            `,
          });
        }
      },
    }),
  ],
  hooks: {
    before: createAuthMiddleware((ctx) => {
      // 1. Listen specifically for the update user endpoint
      if (ctx.path === '/update-user') {
        // 2. Check if the incoming payload is trying to modify the image
        if (
          typeof ctx.body === 'object' &&
          ctx.body !== null &&
          'image' in ctx.body
        ) {
          // 3. Look for a secret header that only NestJS has access to

          const isTrustedBackend = isTrustedInternalRequest(
            ctx.headers?.get('x-server-secret'),
          );

          if (!isTrustedBackend) {
            // 4. Block the frontend request immediately
            throw new APIError('FORBIDDEN', {
              message:
                'Direct image updates are not allowed. Please use the secure upload flow.',
            });
          }
        }
      }

      return Promise.resolve();
    }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ? {
          linkedin: {
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
          },
        }
      : {}),
  },
  //todo: confirm if this is safe if at any time you need to uncomment
  // account: { skipStateCookieCheck: true },
  trustedOrigins: [
    ...(process.env.CLIENT_BASE_URL ? [process.env.CLIENT_BASE_URL] : []),
    ...(process.env.EXPO_SCHEME ? [`${process.env.EXPO_SCHEME}://`] : []),

    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:*',
          'http://127.0.0.1:*',
          'exp://', // Trust all Expo URLs (prefix matching)
          'exp://**', // Trust all Expo URLs (wildcard matching)
          'exp://192.168.*.*:*/**', // Trust 192.168.x.x IP range with any port and path
          'exp://172.20.*.*:*/**', // Trust 172.20.x.x IP range with any port and path
          ...getDevExtraOrigins(),
        ]
      : []),
  ],
});
