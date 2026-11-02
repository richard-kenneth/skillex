import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { redactEmail } from '../common/security/redact-email';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type EmailTransport =
  | { kind: 'resend'; client: Resend }
  | { kind: 'smtp'; transporter: Transporter }
  | { kind: 'disabled' };

/**
 * Single email entry point for the API.
 *
 * Transport selection:
 *   1. RESEND_API_KEY (or EMAIL_TRANSPORT=resend) -> Resend
 *   2. SMTP_HOST (or EMAIL_TRANSPORT=smtp)        -> SMTP (Mailpit locally)
 *   3. EMAIL_TRANSPORT=disabled                   -> no-op
 *   4. development with no configuration          -> Mailpit on localhost:1025
 *   5. production with no configuration           -> no-op with a warning
 *
 * Sending never throws. Callers that need delivery guarantees should check the
 * returned boolean; auth flows intentionally continue so a transient email
 * outage does not lock users out of the rest of the app.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transport: EmailTransport = { kind: 'disabled' };
  private from = 'SkillEx <noreply@skillex.local>';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.from =
      this.config.get<string>('ONBOARDING_EMAIL_FROM') ||
      'SkillEx <noreply@skillex.local>';

    const requested = this.config.get<string>('EMAIL_TRANSPORT') || 'auto';
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (requested === 'disabled') {
      this.logger.log('Email disabled (EMAIL_TRANSPORT=disabled).');
      return;
    }

    if ((requested === 'auto' || requested === 'resend') && resendKey) {
      this.transport = {
        kind: 'resend',
        client: new Resend(resendKey),
      };
      this.logger.log('Email transport: Resend');
      return;
    }

    if ((requested === 'auto' || requested === 'smtp') && smtpHost) {
      this.transport = {
        kind: 'smtp',
        transporter: this.createSmtpTransport(smtpHost),
      };
      this.logger.log(
        `Email transport: SMTP (${smtpHost}:${this.config.get<number>('SMTP_PORT') ?? 1025})`,
      );
      return;
    }

    if (requested === 'auto' && !isProduction) {
      // Zero-config local development: mailpit is part of docker-compose.
      this.transport = {
        kind: 'smtp',
        transporter: this.createSmtpTransport('localhost'),
      };
      this.logger.log('Email transport: Mailpit (localhost:1025)');
      return;
    }

    this.logger.log(
      'Email disabled: set RESEND_API_KEY or SMTP_HOST to enable.',
    );
  }

  get isEnabled(): boolean {
    return this.transport.kind !== 'disabled';
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (this.transport.kind === 'disabled') {
      this.logger.debug(
        `Email disabled; skipped "${message.subject}" to ${redactEmail(message.to)}`,
      );
      return false;
    }

    try {
      if (this.transport.kind === 'resend') {
        const result = await this.transport.client.emails.send({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });

        if (result.error) {
          this.logger.error(
            `Resend rejected "${message.subject}" to ${redactEmail(message.to)}: ${result.error.message}`,
          );
          return false;
        }
      } else {
        await this.transport.transporter.sendMail({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
      }

      this.logger.log(
        `Email sent to ${redactEmail(message.to)}: ${message.subject}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${redactEmail(message.to)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private createSmtpTransport(host: string): Transporter {
    const port = this.config.get<number>('SMTP_PORT') ?? 1025;
    const secure = this.config.get<boolean>('SMTP_SECURE') ?? false;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }
}
