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
      `Hi ${data.firstName},`,
      '',
      'Your Akiba account has been created.',
      '',
      `Login email: ${data.orgEmail}`,
      '',
      `Set your password to get started: ${data.inviteUrl}`,
      '',
      'This invite expires in 7 days. If you did not expect this, ignore this email.',
      '',
      '— Akiba Team',
    ].join('\n');
  }

  private inviteHtml(data: InviteEmailData): string {
    return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#c8f5d4,#a9ecc0);padding:28px 32px;">
        <span style="font-size:22px;font-weight:700;color:#0a773c;">Akiba</span>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 12px;font-size:16px;color:#1f2937;">Hi ${data.firstName},</p>
        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">Your Akiba account has been created. Set your password to get started.</p>
        <div style="background:#ecf9f0;border:1px solid #d8f3e3;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#0a773c;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Login email</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${data.orgEmail}</p>
        </div>
        <a href="${data.inviteUrl}" style="display:inline-block;background:#0fa958;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">Set up my account</a>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">This invite expires in 7 days. If you didn&rsquo;t expect this, ignore this email.</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">&mdash; Akiba Team</p>
      </div>
    </div>
  </body>
</html>`;
  }
}
