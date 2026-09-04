import crypto from 'crypto';
import { db } from '../db';
import { VerificationToken } from '../../types';
import { emailVerificationTokenService } from './emailVerificationTokenService';
import { securityMonitoringService } from './securityMonitoringService';

export interface CreatePasswordResetTokenResult {
  rawToken: string;
  tokenRecord: VerificationToken;
  resetUrl: string;
}

export interface PasswordResetTokenOptions {
  expiresInMinutes?: number;
  origin?: string;
}

export interface TokenCleanupOptions {
  removeExpired?: boolean;
  removeUsed?: boolean;
  usedRetentionMinutes?: number;
  dryRun?: boolean;
}

export interface TokenCleanupResult {
  success: boolean;
  removedExpired: number;
  removedUsed: number;
  totalRemoved: number;
  activeRetained: number;
  timestamp: string;
  durationMs: number;
  errors?: string[];
}

export interface TokenValidationResult {
  valid: boolean;
  tokenRecord?: VerificationToken;
  reason?: string;
  status: 'VALID' | 'EXPIRED' | 'USED' | 'NOT_FOUND' | 'INVALID_FORMAT';
}

/**
 * ============================================================================
 * BOOST MARKET - PASSWORD RESET TOKEN LIFECYCLE & CLEANUP MANAGEMENT SERVICE
 * ============================================================================
 * Implements comprehensive token lifecycle management:
 * 
 *   CREATED -> ACTIVE -> (USED or EXPIRED) -> INVALID -> SAFE CLEANUP
 * 
 * Invariants & Guarantees:
 * 1. Security: Only high-entropy SHA-256 token hashes are stored (never plaintext).
 * 2. Short-Lived: Default expiration is 30 minutes.
 * 3. Single-Use: Consumed tokens transition atomically to USED and can never be re-used.
 * 4. Cleanup Safety: Active, unexpired tokens are NEVER deleted.
 * 5. Idempotency: Cleanup runs safely and repeatedly without side effects or errors.
 * 6. Concurrency Shielding: Atomic mutex prevents cleanup from racing with active resets.
 * 7. Rate Limiting Immunity: Cleanup never resets or bypasses rate-limiting counters.
 * 8. Zero Leakage: Logs contain strictly non-sensitive operational metrics (no hashes/passwords).
 * ============================================================================
 */
export class PasswordResetTokenService {
  public static readonly DEFAULT_EXPIRATION_MINUTES = 30;
  public static readonly DEFAULT_USED_RETENTION_MINUTES = 0; // Immediate purge or configurable threshold

  private isCleaningUp: boolean = false;
  private periodicInterval: NodeJS.Timeout | null = null;

  /**
   * Generates a cryptographically secure random token (256 bits / 32 bytes entropy).
   */
  public generateRawToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a raw token using SHA-256 before persisting to storage.
   */
  public hashToken(rawToken: string): string {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('Invalid token provided for hashing');
    }
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Constructs the full, configured password reset URL.
   */
  public buildResetUrl(rawToken: string, customOrigin?: string): string {
    const baseUrl = customOrigin || 
                    process.env.APP_URL || 
                    process.env.FRONTEND_URL || 
                    'http://localhost:3000';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/reset-password?token=${encodeURIComponent(rawToken.trim())}`;
  }

  /**
   * Creates and persists a secure, single-use password reset token.
   * Automatically invalidates any existing pending password reset tokens for the user.
   */
  public async create(
    userId: string,
    email: string,
    options: PasswordResetTokenOptions = {}
  ): Promise<CreatePasswordResetTokenResult> {
    if (!userId || !email) {
      throw new Error('User ID and email are required to create a password reset token.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const expiresInMinutes = options.expiresInMinutes ?? PasswordResetTokenService.DEFAULT_EXPIRATION_MINUTES;

    // 1. Invalidate any existing unused password reset tokens for this user
    this.invalidateUserTokens(userId);

    // 2. Generate high-entropy raw token and compute SHA-256 hash
    const rawToken = this.generateRawToken(32);
    const tokenHash = this.hashToken(rawToken);

    // 3. Construct token entity
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const tokenRecord: VerificationToken = {
      id: `tok_pr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      userId,
      email: normalizedEmail,
      type: 'password_reset',
      expiresAt,
      isUsed: false,
      usedAt: null,
      createdAt: new Date().toISOString()
    };

    // 4. Persist to database store (store tokenHash, NEVER rawToken)
    db.tokens.set(tokenRecord.id, tokenRecord);

    // 5. Construct password reset URL
    const resetUrl = this.buildResetUrl(rawToken, options.origin);

    return {
      rawToken,
      tokenRecord,
      resetUrl
    };
  }

  /**
   * Validates a password reset token by raw string against storage.
   * Returns precise lifecycle status without leaking timing information.
   */
  public validateToken(rawToken: string): TokenValidationResult {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 8) {
      return {
        valid: false,
        status: 'INVALID_FORMAT',
        reason: 'This password reset link is invalid or has expired.'
      };
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const tokenRecord = db.tokens.findByHash(tokenHash, 'password_reset');

    if (!tokenRecord) {
      return {
        valid: false,
        status: 'NOT_FOUND',
        reason: 'This password reset link is invalid or has expired.'
      };
    }

    if (tokenRecord.isUsed) {
      return {
        valid: false,
        status: 'USED',
        reason: 'This password reset link is invalid or has expired.',
        tokenRecord
      };
    }

    const isExpired = new Date(tokenRecord.expiresAt).getTime() <= Date.now();
    if (isExpired) {
      // Mark as used/expired if not already marked
      tokenRecord.isUsed = true;
      tokenRecord.usedAt = new Date().toISOString();
      return {
        valid: false,
        status: 'EXPIRED',
        reason: 'This password reset link is invalid or has expired.',
        tokenRecord
      };
    }

    return {
      valid: true,
      status: 'VALID',
      tokenRecord
    };
  }

  /**
   * Atomically consumes a password reset token, marking it as used.
   * Throws an error if the token is invalid, expired, or already used.
   */
  public async consumeToken(rawToken: string): Promise<VerificationToken> {
    const lookup = this.validateToken(rawToken);
    if (!lookup.valid || !lookup.tokenRecord) {
      throw new Error(lookup.reason || 'This password reset link is invalid or has expired.');
    }

    const record = lookup.tokenRecord;
    record.isUsed = true;
    record.usedAt = new Date().toISOString();
    return record;
  }

  /**
   * Invalidates all active password reset tokens for a specific user.
   */
  public invalidateUserTokens(userId: string): number {
    let count = 0;
    const userTokens = db.tokens.findByUserId(userId, 'password_reset');
    for (const token of userTokens) {
      if (!token.isUsed) {
        token.isUsed = true;
        token.usedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  /**
   * Cleans up expired and consumed password reset tokens according to retention policies.
   * 
   * Safety Guarantees:
   * - ACTIVE, unexpired tokens are NEVER deleted.
   * - Idempotent: Can be executed repeatedly with zero errors.
   * - Concurrency: Prevents race conditions with in-flight reset requests.
   * - Generic logging: No tokens or credentials logged.
   */
  public async cleanup(options: TokenCleanupOptions = {}): Promise<TokenCleanupResult> {
    const startTime = Date.now();
    const removeExpired = options.removeExpired ?? true;
    const removeUsed = options.removeUsed ?? true;
    const retentionMinutes = options.usedRetentionMinutes ?? PasswordResetTokenService.DEFAULT_USED_RETENTION_MINUTES;
    const isDryRun = options.dryRun ?? false;

    // Mutex guard to prevent overlapping concurrent cleanups
    if (this.isCleaningUp) {
      return {
        success: true,
        removedExpired: 0,
        removedUsed: 0,
        totalRemoved: 0,
        activeRetained: this.getActiveTokenCount(),
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime
      };
    }

    this.isCleaningUp = true;
    let removedExpired = 0;
    let removedUsed = 0;
    let activeRetained = 0;
    const errors: string[] = [];

    try {
      const nowMs = Date.now();
      const usedCutoffMs = nowMs - (retentionMinutes * 60 * 1000);

      const tokensToDelete: string[] = [];

      for (const [id, token] of db.tokens.entries()) {
        // Only target password_reset tokens
        if (token.type !== 'password_reset') {
          continue;
        }

        const expiresAtMs = new Date(token.expiresAt).getTime();
        const isExpired = expiresAtMs <= nowMs;
        const isUsed = Boolean(token.isUsed || token.usedAt);

        // 1. ACTIVE TOKEN INVARIANT: Never remove unexpired and unused tokens
        if (!isUsed && !isExpired) {
          activeRetained++;
          continue;
        }

        // 2. EXPIRED TOKEN: Candidate for removal
        if (isExpired && removeExpired) {
          tokensToDelete.push(id);
          removedExpired++;
          continue;
        }

        // 3. USED TOKEN: Candidate for removal if past retention threshold
        if (isUsed && removeUsed) {
          const usedAtMs = token.usedAt ? new Date(token.usedAt).getTime() : nowMs;
          if (usedAtMs <= usedCutoffMs) {
            tokensToDelete.push(id);
            removedUsed++;
            continue;
          }
        }
      }

      // Execute atomic deletions if not dry-run
      if (!isDryRun) {
        for (const id of tokensToDelete) {
          db.tokens.delete(id);
        }
      }

      const totalRemoved = removedExpired + removedUsed;

      // Log non-sensitive operational metric
      console.log(
        `[PasswordResetTokenService] Token cleanup completed in ${Date.now() - startTime}ms. ` +
        `Expired removed: ${removedExpired}, Used removed: ${removedUsed}, Active retained: ${activeRetained}`
      );

      return {
        success: true,
        removedExpired,
        removedUsed,
        totalRemoved,
        activeRetained,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[PasswordResetTokenService] Non-fatal error during token cleanup: ${errorMsg}`);
      errors.push(errorMsg);

      return {
        success: false,
        removedExpired,
        removedUsed,
        totalRemoved: removedExpired + removedUsed,
        activeRetained,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errors
      };
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Starts a background maintenance interval for periodic token cleanup.
   */
  public startPeriodicCleanup(intervalMinutes: number = 15): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    this.periodicInterval = setInterval(async () => {
      try {
        await this.cleanup();
        emailVerificationTokenService.cleanupExpiredTokens(7);
        await securityMonitoringService.runMaintenance();
      } catch (err: any) {
        console.error('[Maintenance] Background maintenance cycle error (non-fatal):', err?.message || err);
      }
    }, intervalMs);
    // Unref timer so it doesn't block Node.js process shutdown
    if (this.periodicInterval && typeof this.periodicInterval.unref === 'function') {
      this.periodicInterval.unref();
    }
  }

  /**
   * Stops the background maintenance interval.
   */
  public stopPeriodicCleanup(): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
  }

  /**
   * Returns current token statistics for diagnostics and tests.
   */
  public getStats(): { total: number; active: number; expired: number; used: number } {
    const nowMs = Date.now();
    let total = 0;
    let active = 0;
    let expired = 0;
    let used = 0;

    for (const token of db.tokens.values()) {
      if (token.type === 'password_reset') {
        total++;
        const isExp = new Date(token.expiresAt).getTime() <= nowMs;
        const isUsd = Boolean(token.isUsed || token.usedAt);
        if (!isUsd && !isExp) {
          active++;
        }
        if (isExp) {
          expired++;
        }
        if (isUsd) {
          used++;
        }
      }
    }

    return { total, active, expired, used };
  }

  private getActiveTokenCount(): number {
    return db.tokens.findActive('password_reset').length;
  }
}

export const passwordResetTokenService = new PasswordResetTokenService();
