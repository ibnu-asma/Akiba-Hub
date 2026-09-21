import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export interface InviteEmailData {
  firstName: string;
  orgEmail: string;
  inviteUrl: string;
}

/**
 * Transactional mailer (SPEC §8.5). `preview` mode renders the email and logs
 * it to stdout (no SMTP needed); `smtp` mode sends for real via env-configured
 * credentials. The template is Akiba-branded and carries the login email + the
 * "set your password" invite link.
 */
@Injectable()
export class MailerService {
  private transporter =
    env.MAIL_MODE === 'smtp'
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE === 'true',
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        })
      : null;

  async sendInvite(to: string, data: InviteEmailData): Promise<void> {
    const subject = 'Welcome to Akiba — set up your account';
    const text = this.inviteText(data);
    const html = this.inviteHtml(data);

    if (!this.transporter) {
      // preview mode — render + log so the flow works without SMTP credentials.
      console.log('\n──── EMAIL (preview) ────────────────────────────');
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('──────────────────────────────────────────────────');
      console.log(text);
      console.log('──────────────────────────────────────────────────\n');
      return;
    }

    try {
      await this.transporter.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mailer] SMTP send failed to ${to}: ${message}`);
      throw err;
    }
  }

  private inviteText(data: InviteEmailData): string {
    return [
      `Welcome to Akiba, ${data.firstName}!`,
      '',
      'An account has been created for you on the Akiba platform.',
      '',
      `Your login email: ${data.orgEmail}`,
      '',
      'To get started, please set your password by visiting the following link:',
      data.inviteUrl,
      '',
      'This invitation link will expire in 7 days.',
      'If you didn\'t expect this invitation, you can safely ignore this email.',
      '',
      `© ${new Date().getFullYear()} Akiba Platform`,
    ].join('\n');
  }

  private inviteHtml(data: InviteEmailData): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Welcome to Akiba</title>
  </head>
  <body style="background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
            
            <!-- Header -->
            <tr>
              <td style="padding: 40px 48px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f3f4f6;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">Akiba</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 48px;">
                <h2 style="margin: 0 0 24px; font-size: 20px; font-weight: 600; color: #111827;">Welcome to Akiba, ${data.firstName}!</h2>
                <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.625; color: #4b5563;">
                  An account has been created for you on the Akiba platform. You're just one step away from accessing your dashboard and getting started.
                </p>
                
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 32px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Your Login Email</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${data.orgEmail}</p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 32px;">
                  <tr>
                    <td align="center">
                      <a href="${data.inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">Set up my password</a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #10b981; word-break: break-all;">
                  <a href="${data.inviteUrl}" style="color: #10b981; text-decoration: underline;">${data.inviteUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 32px 48px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">
                  This invitation link will expire in 7 days.
                </p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
                <p style="margin: 24px 0 0; font-size: 13px; font-weight: 600; color: #94a3b8;">
                  &copy; ${new Date().getFullYear()} Akiba Platform
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
