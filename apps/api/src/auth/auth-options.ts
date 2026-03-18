import { PrismaClient } from '@prisma/client';
import type { BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const getAuthConfig = (prisma: PrismaClient): BetterAuthOptions => ({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  experimental: { joins: true },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 1. Listen specifically for the update user endpoint
      if (ctx.path === '/update-user') {
        // 2. Check if the incoming payload is trying to modify the image
        if (ctx.body && 'image' in ctx.body) {
          // 3. Look for a secret header that only NestJS has access to

          const isTrustedBackend =
            ctx.headers?.get('x-server-secret') === process.env.INTERNAL_SECRET;

          if (!isTrustedBackend) {
            // 4. Block the frontend request immediately
            throw new APIError('FORBIDDEN', {
              message:
                'Direct image updates are not allowed. Please use the secure upload flow.',
            });
          }
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from:
          process.env.ONBOARDING_EMAIL_FROM || 'onboarding@richardkenneth.com',
        to: user.email,
        subject: 'Reset your password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1a202c; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
              You requested to reset your password. Click the button below to set a new one. This link will expire in 1 hour.
            </p>
            <a href="${url}" style="display: inline-block; background-color: #3182ce; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
            <p style="color: #718096; font-size: 14px; margin-top: 32px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from:
          process.env.ONBOARDING_EMAIL_FROM || 'onboarding@richardkenneth.com',
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1a202c; margin-bottom: 16px;">Welcome to SkilEx!</h2>
            <p style="color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
              Please verify your email address by clicking the button below. This link will expire in 24 hours.
            </p>
            <a href="${url}" style="display: inline-block; background-color: #3182ce; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Verify Email Address
            </a>
            <p style="color: #718096; font-size: 14px; margin-top: 32px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    },
  },
  baseURL: process.env.API_BASE_URL!,
  trustedOrigins: [process.env.CLIENT_BASE_URL!],
});
