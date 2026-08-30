import crypto from 'crypto';
import { EmailLog } from '../../types';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: 'verification' | 'password_reset' | 'admin_setup' | 'password_changed' | 'security_alert' | 'invoice_receipt';
  actionUrl?: string;
  token?: string;
  userName?: string;
  details?: Record<string, unknown>;
}

export class EmailService {
  private outbox: EmailLog[] = [];
  private maxOutboxSize = 200;

  constructor() {
    console.log('[EmailService] Initialized with Outbox & Notification Dispatcher');
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailLog> {
    const { to, subject, template, actionUrl, token, userName = 'Valued User' } = options;

    let htmlContent = '';
    let textContent = '';

    const appName = 'Boost Market';
    const companyName = 'Real Boosters';

    switch (template) {
      case 'verification':
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
                <div style="width: 36px; height: 36px; background: #10b981; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; color: #020617; font-size: 16px;">B⚡</div>
                <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin-left: 8px;">BOOST MARKET</span>
              </div>
              <h2 style="font-size: 22px; color: #ffffff; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Thank you for registering on Boost Market. Please verify your email address to activate your account and access advertising, catalog management, and local commerce features.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #10b981, #0d9488); color: #020617; padding: 14px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; display: inline-block; font-size: 14px;">Verify Email Now</a>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5;">If the button above does not work, copy and paste this verification link into your browser:<br/><span style="color: #38bdf8; word-break: break-all;">${actionUrl}</span></p>
              <p style="color: #64748b; font-size: 12px;">This single-use link expires in 24 hours.</p>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; color: #475569; font-size: 11px;">
                © ${new Date().getFullYear()} ${appName} by ${companyName}. Secure Authentication Engine.
              </div>
            </div>
          </div>
        `;
        textContent = `Hello ${userName},\n\nPlease verify your email address for Boost Market by visiting this link:\n${actionUrl}\n\nThis single-use link expires in 24 hours.`;
        break;

      case 'admin_setup':
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #d97706; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
                <div style="width: 36px; height: 36px; background: #f59e0b; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; color: #020617; font-size: 16px;">👑</div>
                <span style="font-size: 20px; font-weight: 800; color: #fbbf24; letter-spacing: -0.5px; margin-left: 8px;">SUPER ADMIN SETUP</span>
              </div>
              <h2 style="font-size: 22px; color: #ffffff; margin-top: 0;">Initial Password Setup for CEO / Super Admin</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>Muhammad Kabir Ahmad (Maddy)</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">You are the designated Super Admin for Boost Market (<code style="color: #fbbf24;">maddyahamco00@gmail.com</code>). Please click the secure link below to create your master password and initialize executive access.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; padding: 14px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; display: inline-block; font-size: 14px;">Set Super Admin Password</a>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5;">Single-use secure token: <code style="color: #cbd5e1;">${token}</code></p>
              <p style="color: #64748b; font-size: 12px;">This single-use link expires in 1 hour. Passwords are never stored in plaintext and are hashed using bcrypt/argon2id.</p>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; color: #475569; font-size: 11px;">
                Confidential & Protected • Boost Market Executive Security
              </div>
            </div>
          </div>
        `;
        textContent = `SUPER ADMIN SETUP\n\nHello Maddy,\n\nSet your Super Admin password by visiting:\n${actionUrl}\n\nToken: ${token}\nExpires in 1 hour.`;
        break;

      case 'password_reset':
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <h2 style="font-size: 22px; color: #ffffff; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">We received a request to reset your password for your Boost Market account. If you did not make this request, you can safely ignore this email.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; display: inline-block; font-size: 14px;">Reset Password</a>
              </div>
              <p style="color: #64748b; font-size: 12px;">This single-use link expires in 30 minutes and will be invalidated once used.</p>
            </div>
          </div>
        `;
        textContent = `Password Reset Request\n\nReset your password with this link:\n${actionUrl}\n\nExpires in 30 minutes.`;
        break;

      case 'password_changed':
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
              <h2 style="font-size: 22px; color: #10b981; margin-top: 0;">Password Successfully Changed</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Your password was changed on <strong>${new Date().toUTCString()}</strong>. If you did not initiate this change, please contact support immediately or reset your password.</p>
            </div>
          </div>
        `;
        textContent = `Your Boost Market password was successfully changed at ${new Date().toUTCString()}.`;
        break;

      case 'security_alert':
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #ef4444; border-radius: 16px; padding: 32px;">
              <h2 style="font-size: 22px; color: #ef4444; margin-top: 0;">Security Alert: New Sign-in or Action</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">A new sign-in or security event occurred on your Boost Market account at <strong>${new Date().toUTCString()}</strong>.</p>
            </div>
          </div>
        `;
        textContent = `Security Alert: New account activity at ${new Date().toUTCString()}.`;
        break;

      default:
        htmlContent = `<p>${subject}</p>`;
        textContent = subject;
    }

    const emailLog: EmailLog = {
      id: `eml_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      to,
      subject,
      template,
      htmlContent,
      textContent,
      actionUrl,
      token,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    this.outbox.unshift(emailLog);
    if (this.outbox.length > this.maxOutboxSize) {
      this.outbox.pop();
    }

    console.log(`[EmailService] 📧 Email sent to ${to} | Subject: "${subject}" | Template: ${template}`);
    return emailLog;
  }

  public getOutbox(): EmailLog[] {
    return [...this.outbox];
  }

  public getEmailsFor(email: string): EmailLog[] {
    const normalized = email.toLowerCase().trim();
    return this.outbox.filter(e => e.to.toLowerCase().trim() === normalized);
  }

  public clearOutbox(): void {
    this.outbox = [];
  }
}

export const emailService = new EmailService();
