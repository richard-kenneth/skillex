import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async join(data: { email: string; name?: string; source?: string }) {
    const { email, name, source } = data;

    // Check for existing entry — return success silently on duplicate
    const existing = await this.prisma.waitlistEntry.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      this.logger.log(`Duplicate waitlist entry for ${email}, skipping`);
      return { success: true, alreadyJoined: true };
    }

    // Create entry
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        source: source || null,
      },
    });

    this.logger.log(`New waitlist entry: ${entry.email} (source: ${source})`);

    // Send confirmation email
    await this.sendConfirmationEmail(entry.email, entry.name);

    return { success: true, alreadyJoined: false };
  }

  private async sendConfirmationEmail(email: string, name: string | null) {
    const displayName = name || 'there';

    await this.emailService.send({
      to: email,
      subject: "You're on the SkillEx waitlist! 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #fafafa; margin-bottom: 16px;">Hey ${displayName}! 👋</h1>
          <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6;">
            You've been added to the <strong style="color: #fafafa;">SkillEx</strong> waitlist. We're building a platform where you can trade your skills with others through live video sessions.
          </p>
          <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6;">
            We'll let you know as soon as we're ready for you. In the meantime, you can set up your profile early so you're ready to start exchanging skills on day one.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/sign-up"
               style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #6366f1, #06b6d4); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Set Up Your Profile Early →
            </a>
          </div>
          <p style="font-size: 14px; color: #71717a; line-height: 1.6;">
            Thanks for your interest!<br/>
            — The SkillEx Team
          </p>
        </div>
      `,
    });
  }

  async getCount(): Promise<number> {
    return this.prisma.waitlistEntry.count();
  }
}
