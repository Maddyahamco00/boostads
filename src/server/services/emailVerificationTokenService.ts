import crypto from 'crypto';
import { db } from '../db';
import { VerificationToken } from '../../types';

export interface CreateTokenResult {
  rawToken: string;
  tokenRecord: VerificationToken;
  verificationUrl: string;
}

export interface VerificationTokenOptions {
  expiresInHours?: number;
  origin?: string;
}

export class EmailVerificationTokenService {
  public static readonly DEFAULT_EXPIRATION_HOURS = 24;

  /**
   * Generates a cryptographically secure random token (256 bits / 32 bytes entropy).
   * Never uses Math.random() or predictable seeds.
   */
  public generateRawToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a raw token using SHA-256 before persisting to storage.
   * Storing hashes prevents token compromise in case of database leakage.
   */
  public hashToken(rawToken: string): string {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('Invalid token provided for hashing');
    }
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Constructs the full, configured email verification URL.
   */
  public buildVerificationUrl(rawToken: string, customOrigin?: string): string {
    const baseUrl = customOrigin || 
                    process.env.APP_URL || 
                    process.env.FRONTEND_URL || 
                    'http://localhost:3000';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/verify-email?token=${encodeURIComponent(rawToken.trim())}`;
  }

  /**
   * Creates and persists a secure, single-use email verification token.
   * Automatically invalidates any existing pending tokens for the user (resend preparation).
   */
  public async create(
    userId: string,
    email: string,
    options: VerificationTokenOptions = {}
  ): Promise<CreateTokenResult> {
    if (!userId || !email) {
      throw new Error('User ID and email are required to create an email verification token.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const expiresInHours = options.expiresInHours ?? EmailVerificationTokenService.DEFAULT_EXPIRATION_HOURS;

    // 1. Invalidate any existing unused verification tokens for this user
    this.invalidateUserTokens(userId);

    // 2. Generate high-entropy raw token and compute SHA-256 hash
    const rawToken = this.generateRawToken(32);
    const tokenHash = this.hashToken(rawToken);

    // 3. Construct token entity
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    const tokenRecord: VerificationToken = {
      id: `tok_ev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      userId,
      email: normalizedEmail,
      type: 'email_verification',
      expiresAt,
      isUsed: false,
      usedAt: null,
      createdAt: new Date().toISOString()
    };

    // 4. Persist to database store (store tokenHash, NEVER rawToken)
    db.tokens.set(tokenRecord.id, tokenRecord);

    // 5. Construct verification URL
    const verificationUrl = this.buildVerificationUrl(rawToken, options.origin);

    return {
      rawToken,
      tokenRecord,
      verificationUrl
    };
  }

  /**
   * Finds and validates an unexpired, unused token record by raw token string.
   */
  public findValidToken(rawToken: string): { valid: boolean; tokenRecord?: VerificationToken; reason?: string } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'Invalid token format' };
    }

    const tokenHash = this.hashToken(rawToken);
    const tokenRecord = Array.from(db.tokens.values()).find(
      t => t.tokenHash === tokenHash && t.type === 'email_verification'
    );

    if (!tokenRecord) {
      return { valid: false, reason: 'This verification link is invalid.' };
    }

    if (tokenRecord.isUsed || tokenRecord.usedAt) {
      return { valid: false, reason: 'This verification link has already been used.', tokenRecord };
    }

    const isExpired = new Date(tokenRecord.expiresAt).getTime() <= Date.now();
    if (isExpired) {
      return { valid: false, reason: 'This verification link has expired. Please request a new verification email.', tokenRecord };
    }

    return { valid: true, tokenRecord };
  }

  /**
   * Atomically consumes a verification token, marking it as used.
   * Throws an error if the token is invalid, expired, or already used.
   */
  public consumeToken(rawToken: string): VerificationToken {
    const lookup = this.findValidToken(rawToken);
    if (!lookup.valid || !lookup.tokenRecord) {
      throw new Error(lookup.reason || 'Invalid or expired verification token');
    }

    const record = lookup.tokenRecord;
    record.isUsed = true;
    record.usedAt = new Date().toISOString();
    return record;
  }

  /**
   * Invalidates all active email verification tokens for a specific user.
   * Useful when dispatching a resend or after an administrative action.
   */
  public invalidateUserTokens(userId: string): number {
    let count = 0;
    for (const token of db.tokens.values()) {
      if (token.userId === userId && token.type === 'email_verification' && !token.isUsed) {
        token.isUsed = true;
        token.usedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  /**
   * Cleans up expired tokens older than a given retention threshold (default 7 days).
   */
  public cleanupExpiredTokens(retentionDays: number = 7): number {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const [id, token] of db.tokens.entries()) {
      if (token.type === 'email_verification') {
        const isPastCutoff = new Date(token.expiresAt).getTime() < cutoff;
        if (isPastCutoff) {
          db.tokens.delete(id);
          removed++;
        }
      }
    }
    return removed;
  }
}

export const emailVerificationTokenService = new EmailVerificationTokenService();
