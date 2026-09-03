import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { 
  UserEntity, 
  UserProfile, 
  UserRole, 
  AccountStatus, 
  AuthSession, 
  VerificationToken, 
  SecurityAuditEvent 
} from '../../types';
import { db, SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID, isDesignatedSuperAdminEmail } from '../db';
import { emailService } from './emailService';
import { passwordService } from './passwordService';
import { emailVerificationTokenService } from './emailVerificationTokenService';
import { passwordResetTokenService, TokenCleanupOptions, TokenCleanupResult } from './passwordResetTokenService';

const JWT_SECRET = process.env.JWT_SECRET || 'boost_market_jwt_production_secret_key_2026_9881726';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'boost_market_refresh_secret_key_2026_7718291';
const PRE_AUTH_SECRET = process.env.PRE_AUTH_SECRET || 'boost_market_preauth_secret_2026_1192837';

export { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID };

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier?: string;
  sessionId?: string;
}

export class AuthService {
  private failedAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();
  private resendAttempts: Map<string, { count: number; windowStart: number; lockedUntil?: number }> = new Map();

  constructor() {
    console.log('[AuthService] Production Authentication & Authorization Engine Ready');
  }

  public clearRateLimits(): void {
    this.failedAttempts.clear();
    this.resendAttempts.clear();
  }

  // ----------------------------------------------------
  // UTILITIES & CRYPTOGRAPHY
  // ----------------------------------------------------
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  public async hashPassword(password: string): Promise<string> {
    return passwordService.hash(password);
  }

  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return passwordService.verify(password, hash);
  }

  public generateAccessToken(user: UserProfile, sessionId?: string): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  public generateRefreshToken(user: UserProfile, sessionId: string): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  }

  public verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  public verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  public getSafeUser(user: UserEntity): UserProfile {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, twoFactorRecoveryCodes, failedLoginAttempts, lockedUntil, ...safeUser } = user;
    return safeUser;
  }

  // ----------------------------------------------------
  // BRUTE FORCE & RATE LIMITING
  // ----------------------------------------------------
  private checkRateLimit(key: string): { isLocked: boolean; remainingSeconds?: number } {
    const record = this.failedAttempts.get(key);
    if (!record) return { isLocked: false };

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      this.failedAttempts.delete(key);
      return { isLocked: false };
    }

    return { isLocked: false };
  }

  private registerFailedAttempt(key: string, maxAttempts: number = 5, lockDurationMs: number = 15 * 60 * 1000): void {
    const record = this.failedAttempts.get(key) || { count: 0 };
    record.count += 1;
    if (record.count >= maxAttempts) {
      record.lockedUntil = Date.now() + lockDurationMs;
    }
    this.failedAttempts.set(key, record);
  }

  private clearFailedAttempts(key: string): void {
    this.failedAttempts.delete(key);
  }

  // ----------------------------------------------------
  // RESEND VERIFICATION RATE LIMITING
  // ----------------------------------------------------
  public checkResendRateLimit(key: string, maxRequests: number = 3, windowMs: number = 60 * 1000): { isLimited: boolean; remainingSeconds?: number } {
    const now = Date.now();
    const record = this.resendAttempts.get(key);
    if (!record) return { isLimited: false };

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLimited: true, remainingSeconds };
    }

    if (now - record.windowStart > windowMs) {
      this.resendAttempts.delete(key);
      return { isLimited: false };
    }

    if (record.count >= maxRequests) {
      record.lockedUntil = now + windowMs;
      const remainingSeconds = Math.ceil(windowMs / 1000);
      return { isLimited: true, remainingSeconds };
    }

    return { isLimited: false };
  }

  public recordResendAttempt(key: string, windowMs: number = 60 * 1000): void {
    const now = Date.now();
    const record = this.resendAttempts.get(key);
    if (!record || (now - record.windowStart > windowMs)) {
      this.resendAttempts.set(key, { count: 1, windowStart: now });
    } else {
      record.count += 1;
      this.resendAttempts.set(key, record);
    }
  }

  public clearResendRateLimit(key: string): void {
    this.resendAttempts.delete(key);
  }

  // ----------------------------------------------------
  // AUDIT LOGGING
  // ----------------------------------------------------
  public logSecurityEvent(
    eventType: SecurityAuditEvent['eventType'],
    options: {
      userId?: string;
      userEmail?: string;
      role?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, unknown>;
      severity?: SecurityAuditEvent['severity'];
    }
  ): SecurityAuditEvent {
    const event: SecurityAuditEvent = {
      id: `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      eventType,
      userId: options.userId,
      userEmail: options.userEmail,
      role: options.role,
      ipAddress: options.ipAddress || '127.0.0.1',
      userAgent: options.userAgent || 'system',
      details: options.details,
      severity: options.severity || 'INFO'
    };

    db.securityLogs.push(event);
    if (db.securityLogs.length > 500) {
      db.securityLogs.shift();
    }

    console.log(`[Security Audit] [${event.severity}] ${event.eventType} - ${event.userEmail || event.userId || 'Anonymous'}`);
    return event;
  }

  // ----------------------------------------------------
  // TOTP ENGINE (RFC 6238)
  // ----------------------------------------------------
  public generateTotpSecret(): { secret: string; otpauthUrl: string; recoveryCodes: string[] } {
    const secret = crypto.randomBytes(20).toString('hex').toUpperCase().slice(0, 32);
    const otpauthUrl = `otpauth://totp/BoostMarket:${SUPER_ADMIN_EMAIL}?secret=${secret}&issuer=BoostMarket`;
    
    // Generate 8 random recovery codes
    const recoveryCodes = Array.from({ length: 8 }).map(() => 
      `${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase()
    );

    return { secret, otpauthUrl, recoveryCodes };
  }

  public verifyTotpCode(secret: string, code: string): boolean {
    if (!secret || !code || code.length !== 6) return false;
    
    const timeStep = 30; // 30 seconds
    const currentEpoch = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentEpoch / timeStep);

    // Check window of [-1, 0, +1] time steps to account for minor clock drift
    for (let i = -1; i <= 1; i++) {
      const counter = currentCounter + i;
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(counter));

      const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8'));
      hmac.update(buffer);
      const digest = hmac.digest();

      const offset = digest[digest.length - 1] & 0xf;
      const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

      const generatedCode = (binary % 1000000).toString().padStart(6, '0');
      if (generatedCode === code) {
        return true;
      }
    }
    return false;
  }

  public generateTotpCode(secret: string, offsetSteps: number = 0): string {
    const timeStep = 30;
    const currentEpoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentEpoch / timeStep) + offsetSteps;
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8'));
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0xf;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, '0');
  }

  // ----------------------------------------------------
  // 1. CLIENT REGISTRATION (ALWAYS CLIENT ROLE)
  // ----------------------------------------------------
  public async registerClient(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    clientType?: string;
    origin?: string;
  }, ip: string, userAgent: string): Promise<{ success: boolean; user: UserProfile; message: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // CRITICAL: Block registering the designated Super Admin email (including aliases, dots, tags) or reserved admin emails
    if (
      isDesignatedSuperAdminEmail(normalizedEmail) ||
      normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase() ||
      normalizedEmail === 'superadmin@boostmarket.com' ||
      normalizedEmail.startsWith('superadmin@') ||
      normalizedEmail.startsWith('admin@boostmarket')
    ) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Attempted to publicly register Super Admin email' }
      });
      throw new Error('Registration failed. This email is restricted for executive governance.');
    }

    // Neutralize and log any client-supplied privileged role injection attempts
    const rawData = data as any;
    if (
      rawData.role ||
      rawData.isAdmin ||
      rawData.isSuperAdmin ||
      rawData.permissions ||
      rawData.accountType
    ) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: {
          reason: 'Client supplied privileged fields in registration payload. Neutralized to CLIENT.',
          injectedFields: {
            role: rawData.role,
            isAdmin: rawData.isAdmin,
            isSuperAdmin: rawData.isSuperAdmin,
            permissions: rawData.permissions
          }
        }
      });
    }

    // Check if user already exists
    const existing = db.getUserByEmail(normalizedEmail);
    if (existing) {
      this.logSecurityEvent('REGISTER', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Duplicate email registration attempt' }
      });
      throw new Error('An account with this email address already exists. Please sign in or reset your password.');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create UserEntity strictly with role CLIENT
    const userId = `usr_cli_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newUser: UserEntity = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim(),
      role: 'CLIENT', // STRICTLY ENFORCED: NO CLIENT CAN BE ADMIN
      status: 'PENDING_VERIFICATION',
      clientType: (data.clientType as any) || 'customer',
      tier: 'free',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerifiedAt: null,
      passwordHash,
      failedLoginAttempts: 0,
      twoFactorEnabled: false
    };

    // Persist user entity via database store with strict UNIQUE constraint enforcement
    try {
      db.createUser(newUser);
    } catch (err: unknown) {
      this.logSecurityEvent('REGISTER', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Database unique constraint violation / race-condition duplicate registration' }
      });
      throw new Error('An account with this email address already exists. Please sign in or reset your password.');
    }

    // Create single-use Email Verification Token using dedicated token service
    const { rawToken, verificationUrl } = await emailVerificationTokenService.create(
      newUser.id,
      newUser.email,
      { origin: data.origin }
    );

    // Dispatch verification email
    await emailService.sendEmail({
      to: newUser.email,
      subject: 'Verify Your Boost Market Account',
      template: 'verification',
      userName: newUser.name,
      actionUrl: verificationUrl
    });

    this.logSecurityEvent('REGISTER', {
      userId: newUser.id,
      userEmail: newUser.email,
      role: newUser.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { clientType: newUser.clientType }
    });

    return {
      success: true,
      user: this.getSafeUser(newUser),
      message: 'Account created successfully! Please check your email to verify your account.'
    };
  }

  // ----------------------------------------------------
  // 2. VERIFY EMAIL
  // ----------------------------------------------------
  public async verifyEmail(
    rawToken: string, 
    ip: string, 
    userAgent: string
  ): Promise<{ success: boolean; user: UserProfile; message: string; alreadyVerified?: boolean }> {
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      throw new Error('Verification token is required.');
    }

    const trimmedToken = rawToken.trim();

    // 1. Inspect token validity without consuming yet (guarantees atomic transaction)
    const tokenLookup = emailVerificationTokenService.findValidToken(trimmedToken);
    if (!tokenLookup.valid || !tokenLookup.tokenRecord) {
      const reason = tokenLookup.reason || 'This verification link is invalid.';
      this.logSecurityEvent('EMAIL_VERIFIED', {
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason }
      });
      throw new Error(reason);
    }

    const tokenRecord = tokenLookup.tokenRecord;

    // 2. Resolve associated user
    const user = db.users.get(tokenRecord.userId);
    if (!user) {
      this.logSecurityEvent('EMAIL_VERIFIED', {
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'User not found for valid token', userId: tokenRecord.userId }
      });
      throw new Error('Associated user account was not found.');
    }

    // 3. Prevent bypass of administrative restrictions (e.g. SUSPENDED or DELETED accounts)
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      this.logSecurityEvent('EMAIL_VERIFIED', {
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: `Attempted verification on account with status ${user.status}` }
      });
      throw new Error('Account is suspended or restricted. Email verification cannot bypass administrative restrictions.');
    }

    // 4. Handle already verified accounts idempotently
    if (user.emailVerifiedAt && user.status === 'ACTIVE') {
      // Mark token as used to prevent replay
      tokenRecord.isUsed = true;
      tokenRecord.usedAt = new Date().toISOString();

      return {
        success: true,
        alreadyVerified: true,
        user: this.getSafeUser(user),
        message: 'Your email has already been verified. You can sign in immediately.'
      };
    }

    // 5. Atomic State Transition:
    // PENDING_VERIFICATION -> ACTIVE
    // emailVerifiedAt -> current UTC timestamp
    // token.isUsed -> true, token.usedAt -> current UTC timestamp
    // Role remains strictly unchanged (e.g. CLIENT remains CLIENT)
    const nowUtc = new Date().toISOString();
    user.status = 'ACTIVE';
    user.emailVerifiedAt = nowUtc;
    user.updatedAt = nowUtc;

    tokenRecord.isUsed = true;
    tokenRecord.usedAt = nowUtc;

    this.logSecurityEvent('EMAIL_VERIFIED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { verifiedAt: nowUtc, status: user.status }
    });

    return {
      success: true,
      user: this.getSafeUser(user),
      message: 'Email verified successfully! Your Boost Market account is now active.'
    };
  }

  // ----------------------------------------------------
  // 3. RESEND VERIFICATION EMAIL
  // ----------------------------------------------------
  public async resendVerification(
    email: string, 
    origin: string, 
    ip: string, 
    userAgent: string
  ): Promise<{ success: boolean; message: string }> {
    const GENERIC_RESPONSE = 'If an account with that email requires verification, a verification email has been sent.';

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new Error('Email address is required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting Check (by IP and by normalized email)
    const ipLimit = this.checkResendRateLimit(`resend:ip:${ip}`);
    if (ipLimit.isLimited) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { action: 'resend_verification_rate_limit', key: `ip:${ip}`, remainingSeconds: ipLimit.remainingSeconds }
      });
      const error: any = new Error('Too many requests. Please wait before requesting another verification email.');
      error.code = 'RATE_LIMITED';
      error.remainingSeconds = ipLimit.remainingSeconds;
      throw error;
    }

    const emailLimit = this.checkResendRateLimit(`resend:email:${normalizedEmail}`);
    if (emailLimit.isLimited) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { action: 'resend_verification_rate_limit', key: `email:${normalizedEmail}`, remainingSeconds: emailLimit.remainingSeconds }
      });
      const error: any = new Error('Too many requests. Please wait before requesting another verification email.');
      error.code = 'RATE_LIMITED';
      error.remainingSeconds = emailLimit.remainingSeconds;
      throw error;
    }

    // Record rate limit attempt
    this.recordResendAttempt(`resend:ip:${ip}`);
    this.recordResendAttempt(`resend:email:${normalizedEmail}`);

    // 2. Account Lookup
    const user = db.getUserByEmail(normalizedEmail);

    // If account does not exist, return generic response without revealing account existence
    if (!user) {
      this.logSecurityEvent('EMAIL_RESENT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'INFO',
        details: { accountFound: false }
      });
      return {
        success: true,
        message: GENERIC_RESPONSE
      };
    }

    // 3. Already Verified Accounts: Return safe generic response, do not generate token or change state
    if (user.emailVerifiedAt !== null || user.status === 'ACTIVE') {
      this.logSecurityEvent('EMAIL_RESENT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'INFO',
        details: { reason: 'Account already verified', status: user.status }
      });
      return {
        success: true,
        message: GENERIC_RESPONSE
      };
    }

    // 4. Restricted Accounts (SUSPENDED, DISABLED, DELETED): Return safe generic response, never bypass restrictions
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED' || user.status === 'DELETED') {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: `Attempted resend for account with status ${user.status}` }
      });
      return {
        success: true,
        message: GENERIC_RESPONSE
      };
    }

    // 5. Eligible Account (PENDING_VERIFICATION):
    // Invalidate old tokens, generate new secure token, store only SHA-256 hash, dispatch email
    const { verificationUrl } = await emailVerificationTokenService.create(
      user.id,
      user.email,
      { origin }
    );

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Verify Your Boost Market Account',
        template: 'verification',
        userName: user.name,
        actionUrl: verificationUrl
      });
    } catch (err: unknown) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { action: 'email_delivery_failed', error: err instanceof Error ? err.message : 'Unknown mail error' }
      });
      // Do NOT activate the account; user remains PENDING_VERIFICATION
    }

    this.logSecurityEvent('EMAIL_RESENT', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { accountStatus: user.status }
    });

    return {
      success: true,
      message: GENERIC_RESPONSE
    };
  }

  // ----------------------------------------------------
  // 4. CLIENT LOGIN & AUTHENTICATION (TASK 1.2.1)
  // ----------------------------------------------------
  public async login(data: {
    email: string;
    password: string;
    twoFactorCode?: string;
    recoveryCode?: string;
  }, ip: string, userAgent: string): Promise<{
    success: boolean;
    user?: UserProfile;
    accessToken?: string;
    refreshToken?: string;
    twoFactorRequired?: boolean;
    preAuthToken?: string;
    message?: string;
  }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const rateLimitKey = `${normalizedEmail}_${ip}`;

    // 1. Check rate limit / lockout
    const rateStatus = this.checkRateLimit(rateLimitKey);
    if (rateStatus.isLocked) {
      this.logSecurityEvent('ACCOUNT_LOCKED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { remainingSeconds: rateStatus.remainingSeconds }
      });
      const err: any = new Error(`Too many failed login attempts. Account temporarily locked for ${rateStatus.remainingSeconds} seconds.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = rateStatus.remainingSeconds;
      throw err;
    }

    // 2. User Lookup
    const user = db.getUserByEmail(normalizedEmail);
    if (!user) {
      // Eliminate timing discrepancies between existing and non-existing accounts
      await passwordService.dummyVerify(data.password);
      this.registerFailedAttempt(rateLimitKey);
      this.logSecurityEvent('LOGIN_FAILED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'User not found' }
      });
      const err: any = new Error('Invalid email or password.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // 3. Constant-Time Password Verification
    const isPasswordValid = await this.comparePassword(data.password, user.passwordHash || '');
    if (!isPasswordValid) {
      this.registerFailedAttempt(rateLimitKey);
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Incorrect password', failedAttempts: user.failedLoginAttempts }
      });
      const err: any = new Error('Invalid email or password.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // 4. Super Admin Separation: Public Client login must strictly enforce CLIENT role
    if (user.role !== 'CLIENT') {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Non-client account attempted login via client portal', attemptedRole: user.role }
      });
      const err: any = new Error('Administrative accounts must use the administrative portal.');
      err.code = 'ADMIN_SEPARATION';
      throw err;
    }

    // 5. Account Status Checks
    if (user.status === 'SUSPENDED') {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Suspended account login attempt' }
      });
      const err: any = new Error('Your account has been suspended. Please contact support.');
      err.code = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    if (user.status === 'DISABLED' || user.status === 'DELETED') {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Disabled or deleted account login attempt' }
      });
      const err: any = new Error('This account is no longer active.');
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    // 6. Email Verification Check (Unverified clients cannot receive authenticated access)
    if (user.status === 'PENDING_VERIFICATION' || !user.emailVerifiedAt) {
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Unverified email account login attempt', status: user.status }
      });
      const err: any = new Error('Please verify your email address before signing in.');
      err.code = 'EMAIL_NOT_VERIFIED';
      err.unverified = true;
      err.email = user.email;
      throw err;
    }

    if (user.status !== 'ACTIVE') {
      const err: any = new Error('Account is not active.');
      err.code = 'ACCOUNT_NOT_ACTIVE';
      throw err;
    }

    // 7. If 2FA is enabled, handle TOTP challenge
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!data.twoFactorCode && !data.recoveryCode) {
        const preAuthToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role, type: '2fa_preauth' },
          PRE_AUTH_SECRET,
          { expiresIn: '5m' }
        );
        return {
          success: true,
          twoFactorRequired: true,
          preAuthToken,
          message: 'Two-factor authentication code required.'
        };
      }

      // Verify 2FA code if provided
      let is2faValid = false;
      if (data.twoFactorCode) {
        is2faValid = this.verifyTotpCode(user.twoFactorSecret, data.twoFactorCode.trim());
      } else if (data.recoveryCode && user.twoFactorRecoveryCodes) {
        const codeHash = this.hashToken(data.recoveryCode.trim().toUpperCase());
        const codeIdx = user.twoFactorRecoveryCodes.indexOf(codeHash);
        if (codeIdx !== -1) {
          is2faValid = true;
          user.twoFactorRecoveryCodes.splice(codeIdx, 1);
        }
      }

      if (!is2faValid) {
        this.registerFailedAttempt(rateLimitKey);
        this.logSecurityEvent('LOGIN_FAILED', {
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          ipAddress: ip,
          userAgent,
          severity: 'WARNING',
          details: { reason: 'Invalid 2FA code or recovery code' }
        });
        const err: any = new Error('Invalid two-factor authentication code or recovery code.');
        err.code = 'INVALID_2FA_CODE';
        throw err;
      }
    }

    // 8. Successful Login: Clear Rate Limiting Counters
    this.clearFailedAttempts(rateLimitKey);
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();

    // 9. Create Authenticated Session
    const sessionId = `ses_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role, // Strictly user's database role ('CLIENT')
      tokenHash: this.hashToken(sessionId),
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false
    };
    db.sessions.set(sessionId, session);

    // 10. Generate Tokens
    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user, sessionId);

    // 11. Audit Logging
    this.logSecurityEvent('LOGIN_SUCCESS', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { sessionId, clientType: user.clientType }
    });

    return {
      success: true,
      user: this.getSafeUser(user),
      accessToken,
      refreshToken,
      message: 'Login successful'
    };
  }

  // ----------------------------------------------------
  // 4B. SUPER ADMIN LOGIN & STRICT ACCESS BOUNDARY
  // ----------------------------------------------------
  public async adminLogin(
    data: { email: string; password: string; twoFactorCode?: string; recoveryCode?: string },
    ip: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    user?: UserProfile;
    accessToken?: string;
    refreshToken?: string;
    twoFactorRequired?: boolean;
    preAuthToken?: string;
    email?: string;
    message: string;
  }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const rateLimitKey = `admin_login:${normalizedEmail}:${ip}`;

    // 1. Rate Limiting / Progressive Lockout Check
    const rateStatus = this.checkRateLimit(rateLimitKey);
    if (rateStatus.isLocked) {
      this.logSecurityEvent('ACCOUNT_LOCKED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { remainingSeconds: rateStatus.remainingSeconds }
      });
      const err: any = new Error(`Too many failed admin login attempts. Account temporarily locked for ${rateStatus.remainingSeconds} seconds.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = rateStatus.remainingSeconds;
      throw err;
    }

    // 2. Strict Super Admin Boundary Validation
    if (normalizedEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      const nonAdminUser = db.getUserByEmail(normalizedEmail);
      this.registerFailedAttempt(rateLimitKey);
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: nonAdminUser?.id || 'unknown',
        userEmail: normalizedEmail,
        role: nonAdminUser?.role || 'UNKNOWN',
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: {
          reason: 'Non-admin user attempted authentication via Super Admin portal',
          attemptedEmail: normalizedEmail
        }
      });
      const err: any = new Error('Access denied. This portal is strictly restricted to the Super Administrator.');
      err.code = 'UNAUTHORIZED_ADMIN_ACCESS';
      throw err;
    }

    const admin = db.users.get(SUPER_ADMIN_ID) || db.getUserByEmail(SUPER_ADMIN_EMAIL);
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      this.registerFailedAttempt(rateLimitKey);
      this.logSecurityEvent('LOGIN_FAILED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Super Admin record missing or compromised' }
      });
      const err: any = new Error('Super Admin account configuration error.');
      err.code = 'ADMIN_ACCOUNT_INVALID';
      throw err;
    }

    // 3. Password Verification
    if (!admin.passwordHash) {
      const err: any = new Error('Super Admin initial password has not been set. Please use the initial setup email link.');
      err.code = 'ADMIN_SETUP_REQUIRED';
      throw err;
    }

    const isPasswordValid = await this.comparePassword(data.password, admin.passwordHash);
    if (!isPasswordValid) {
      this.registerFailedAttempt(rateLimitKey);
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: admin.id,
        userEmail: admin.email,
        role: 'SUPER_ADMIN',
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Incorrect admin password', failedAttempts: admin.failedLoginAttempts }
      });
      const err: any = new Error('Invalid administrative credentials.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // 4. Status Checks
    if (admin.status === 'SUSPENDED' || admin.status === 'DISABLED') {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: admin.id,
        userEmail: admin.email,
        role: 'SUPER_ADMIN',
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Suspended admin login attempt' }
      });
      const err: any = new Error('Super Admin account is currently inactive.');
      err.code = 'ACCOUNT_INACTIVE';
      throw err;
    }

    // 5. Two-Factor Authentication Challenge
    if (admin.twoFactorEnabled && admin.twoFactorSecret) {
      if (!data.twoFactorCode && !data.recoveryCode) {
        const preAuthToken = jwt.sign(
          { userId: admin.id, email: admin.email, role: 'SUPER_ADMIN', type: '2fa_preauth' },
          PRE_AUTH_SECRET,
          { expiresIn: '5m' }
        );
        return {
          success: true,
          twoFactorRequired: true,
          preAuthToken,
          email: admin.email,
          message: 'Two-factor authentication code required.'
        };
      }

      let is2faValid = false;
      if (data.twoFactorCode) {
        is2faValid = this.verifyTotpCode(admin.twoFactorSecret, data.twoFactorCode.trim());
      } else if (data.recoveryCode && admin.twoFactorRecoveryCodes) {
        const codeHash = this.hashToken(data.recoveryCode.trim().toUpperCase());
        const codeIdx = admin.twoFactorRecoveryCodes.indexOf(codeHash);
        if (codeIdx !== -1) {
          is2faValid = true;
          admin.twoFactorRecoveryCodes.splice(codeIdx, 1);
        }
      }

      if (!is2faValid) {
        this.registerFailedAttempt(rateLimitKey);
        this.logSecurityEvent('LOGIN_FAILED', {
          userId: admin.id,
          userEmail: admin.email,
          role: 'SUPER_ADMIN',
          ipAddress: ip,
          userAgent,
          severity: 'WARNING',
          details: { reason: 'Invalid 2FA code or recovery code' }
        });
        const err: any = new Error('Invalid two-factor authentication code.');
        err.code = 'INVALID_2FA_CODE';
        throw err;
      }
    }

    // 6. Successful Admin Authentication
    this.clearFailedAttempts(rateLimitKey);
    admin.failedLoginAttempts = 0;
    admin.lastLoginAt = new Date().toISOString();

    const sessionId = `ses_admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const session: AuthSession = {
      id: sessionId,
      userId: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN', // Strictly enforced server-side
      tokenHash: this.hashToken(sessionId),
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours for admin sessions
      isRevoked: false
    };
    db.sessions.set(sessionId, session);

    const accessToken = this.generateAccessToken(admin, sessionId);
    const refreshToken = this.generateRefreshToken(admin, sessionId);

    this.logSecurityEvent('LOGIN_SUCCESS', {
      userId: admin.id,
      userEmail: admin.email,
      role: 'SUPER_ADMIN',
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { sessionId, executivePortal: true }
    });

    return {
      success: true,
      user: this.getSafeUser(admin),
      accessToken,
      refreshToken,
      message: 'Super Admin executive authentication successful'
    };
  }

  // ----------------------------------------------------
  // 5. TWO-FACTOR LOGIN VERIFICATION
  // ----------------------------------------------------
  public async verifyTwoFactorLogin(
    preAuthToken: string,
    codeOrRecoveryCode: string,
    ip: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: any;
    try {
      payload = jwt.verify(preAuthToken, PRE_AUTH_SECRET);
    } catch {
      throw new Error('Two-factor session has expired. Please sign in again.');
    }

    if (payload.type !== '2fa_preauth' || !payload.userId) {
      throw new Error('Invalid two-factor session token.');
    }

    const user = db.users.get(payload.userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('User not found or two-factor authentication is not configured.');
    }

    // Rate Limiting check on 2FA code verification attempts
    const rateLimitKey = `2fa_verify:${user.id}:${ip}`;
    const rateStatus = this.checkRateLimit(rateLimitKey);
    if (rateStatus.isLocked) {
      this.logSecurityEvent('ACCOUNT_LOCKED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { remainingSeconds: rateStatus.remainingSeconds, reason: 'Excessive failed 2FA attempts' }
      });
      const err: any = new Error(`Too many failed two-factor authentication attempts. Please wait ${rateStatus.remainingSeconds} seconds.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = rateStatus.remainingSeconds;
      throw err;
    }

    const code = codeOrRecoveryCode.trim();
    let is2faValid = false;

    if (code.length === 6 && /^\d+$/.test(code)) {
      is2faValid = this.verifyTotpCode(user.twoFactorSecret, code);
    } else if (user.twoFactorRecoveryCodes) {
      const codeHash = this.hashToken(code.toUpperCase());
      const idx = user.twoFactorRecoveryCodes.indexOf(codeHash);
      if (idx !== -1) {
        is2faValid = true;
        user.twoFactorRecoveryCodes.splice(idx, 1); // consume code
      }
    }

    if (!is2faValid) {
      this.registerFailedAttempt(rateLimitKey);
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Invalid 2FA verification code' }
      });
      const err: any = new Error('Invalid two-factor authentication code.');
      err.code = 'INVALID_2FA_CODE';
      throw err;
    }

    // Clear failed attempts upon successful verification
    this.clearFailedAttempts(rateLimitKey);
    user.lastLoginAt = new Date().toISOString();
    user.failedLoginAttempts = 0;

    const sessionId = `ses_${user.role === 'SUPER_ADMIN' ? 'admin_' : ''}${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionDurationMs = user.role === 'SUPER_ADMIN'
      ? 12 * 60 * 60 * 1000 // 12 hours for admin sessions
      : 30 * 24 * 60 * 60 * 1000; // 30 days for clients

    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenHash: this.hashToken(sessionId),
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + sessionDurationMs).toISOString(),
      isRevoked: false
    };
    db.sessions.set(sessionId, session);

    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user, sessionId);

    this.logSecurityEvent('2FA_VERIFIED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO'
    });

    return {
      success: true,
      user: this.getSafeUser(user),
      accessToken,
      refreshToken
    };
  }

  // ----------------------------------------------------
  // 6. FORGOT & RESET PASSWORD (CLIENT ONLY)
  // ----------------------------------------------------
  public async forgotPassword(
    email: string,
    origin: string,
    ip: string,
    userAgent: string
  ): Promise<{ success: boolean; message: string }> {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error('Please enter a valid email address.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting per IP and per Email
    const ipKey = `fp_ip_${ip}`;
    const emailKey = `fp_email_${normalizedEmail}`;

    const ipLimit = this.checkResendRateLimit(ipKey, 10, 60 * 1000); // Max 10 per min per IP
    if (ipLimit.isLimited) {
      const err: any = new Error(`Too many password reset requests. Please wait ${ipLimit.remainingSeconds || 60}s before trying again.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = ipLimit.remainingSeconds;
      throw err;
    }

    const emailLimit = this.checkResendRateLimit(emailKey, 3, 60 * 1000); // Max 3 per min per email
    if (emailLimit.isLimited) {
      const err: any = new Error(`Too many password reset requests for this email. Please wait ${emailLimit.remainingSeconds || 60}s before trying again.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = emailLimit.remainingSeconds;
      throw err;
    }

    this.recordResendAttempt(ipKey, 60 * 1000);
    this.recordResendAttempt(emailKey, 60 * 1000);

    // Generic response regardless of whether account exists to prevent email enumeration
    const safeMessage = 'If an account exists for this email, you will receive password reset instructions.';

    const user = db.getUserByEmail(normalizedEmail);

    // Account does not exist
    if (!user) {
      // Dummy cryptographic calculation to mitigate timing attacks
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      this.logSecurityEvent('PASSWORD_RESET_REQUESTED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'INFO',
        details: { exists: false }
      });
      return { success: true, message: safeMessage };
    }

    // STRICT PRIVILEGE BOUNDARY: Never allow Client Forgot Password flow to target SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || normalizedEmail === 'maddyahamco00@gmail.com') {
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      this.logSecurityEvent('SECURITY_ALERT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { 
          alert: 'Client forgot-password endpoint targeted Super Admin account. Denied silently to preserve Super Admin boundary.' 
        }
      });
      return { success: true, message: safeMessage };
    }

    // Inactive or suspended accounts guard
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED' || user.status === 'DELETED') {
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      this.logSecurityEvent('PASSWORD_RESET_REQUESTED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { status: user.status, action: 'suppressed_due_to_inactive_status' }
      });
      return { success: true, message: safeMessage };
    }

    // Invalidate existing unused password reset tokens for this user
    passwordResetTokenService.invalidateUserTokens(user.id);

    // Generate high-entropy single-use reset token
    const { rawToken } = await passwordResetTokenService.create(user.id, user.email, { origin });

    const baseUrl = (origin || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const actionUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await emailService.sendEmail({
      to: user.email,
      subject: 'Reset Your Boost Market Password',
      template: 'password_reset',
      userName: user.name,
      actionUrl,
      token: rawToken
    });

    this.logSecurityEvent('PASSWORD_RESET_REQUESTED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { exists: true }
    });

    return { success: true, message: safeMessage };
  }

  public async resetPassword(
    rawToken: string,
    newPassword: string,
    ip: string,
    userAgent: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Rate Limiting per IP
    const ipKey = `rp_ip_${ip}`;
    const ipLimit = this.checkResendRateLimit(ipKey, 15, 60 * 1000); // Max 15 attempts per min per IP
    if (ipLimit.isLimited) {
      const err: any = new Error(`Too many password reset attempts. Please wait ${ipLimit.remainingSeconds || 60}s before trying again.`);
      err.code = 'RATE_LIMITED';
      err.remainingSeconds = ipLimit.remainingSeconds;
      throw err;
    }
    this.recordResendAttempt(ipKey, 60 * 1000);

    // 2. Strict Input Validation (Defense-in-depth)
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 8) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      throw new Error('Password must be 8-128 characters and contain at least one letter and one number.');
    }

    const validation = passwordResetTokenService.validateToken(rawToken);
    if (!validation.valid || !validation.tokenRecord) {
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      if (validation.status === 'USED') {
        this.logSecurityEvent('SECURITY_ALERT', {
          userId: validation.tokenRecord?.userId,
          userEmail: validation.tokenRecord?.email,
          ipAddress: ip,
          userAgent,
          severity: 'WARNING',
          details: { alert: 'Attempted to reuse previously consumed password reset token' }
        });
      } else if (validation.status === 'EXPIRED') {
        this.logSecurityEvent('SECURITY_ALERT', {
          userId: validation.tokenRecord?.userId,
          userEmail: validation.tokenRecord?.email,
          ipAddress: ip,
          userAgent,
          severity: 'INFO',
          details: { alert: 'Attempted to use expired password reset token' }
        });
      } else {
        this.logSecurityEvent('SECURITY_ALERT', {
          ipAddress: ip,
          userAgent,
          severity: 'WARNING',
          details: { alert: 'Password reset attempted with non-existent token' }
        });
      }
      throw new Error('This password reset link is invalid or has expired.');
    }

    const tokenRecord = validation.tokenRecord;
    const user = db.users.get(tokenRecord.userId);
    if (!user || user.email.toLowerCase() !== tokenRecord.email.toLowerCase()) {
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      throw new Error('This password reset link is invalid or has expired.');
    }

    // Strict boundary: Client reset password must never apply to SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'maddyahamco00@gmail.com') {
      await this.hashPassword('DummyPasswordForTimingMitigation123!');
      this.logSecurityEvent('SECURITY_ALERT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { alert: 'Client password reset endpoint attempted against Super Admin account. Rejected.' }
      });
      throw new Error('This password reset link is invalid or has expired.');
    }

    // Account status check
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED' || user.status === 'DELETED') {
      throw new Error('Account is inactive or suspended. Please contact support.');
    }

    // Atomically mark token used to prevent concurrent race condition replays
    tokenRecord.isUsed = true;
    tokenRecord.usedAt = new Date().toISOString();

    // Update password hash safely (role remains strictly unchanged)
    try {
      user.passwordHash = await this.hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
    } catch (hashErr) {
      // Revert in the unlikely event of hashing failure
      tokenRecord.isUsed = false;
      tokenRecord.usedAt = null;
      throw new Error('Failed to process password update. Please try again.');
    }

    // Invalidate any other outstanding password reset tokens for this user
    passwordResetTokenService.invalidateUserTokens(user.id);

    // Invalidate all active sessions for this user across all devices
    this.logoutAll(user.id);

    // Send security alert email
    await emailService.sendEmail({
      to: user.email,
      subject: 'Security Alert: Password Changed',
      template: 'password_changed',
      userName: user.name
    });

    this.logSecurityEvent('PASSWORD_RESET_COMPLETED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO'
    });

    return { 
      success: true, 
      message: 'Password has been reset successfully. Please sign in with your new password.' 
    };
  }

  /**
   * Cleans up expired and used password reset tokens from storage.
   * Safe, idempotent, and leaves active unexpired tokens intact.
   */
  public async cleanupPasswordResetTokens(options?: TokenCleanupOptions): Promise<TokenCleanupResult> {
    return passwordResetTokenService.cleanup(options);
  }

  // ----------------------------------------------------
  // 7. CHANGE PASSWORD (AUTHENTICATED)
  // ----------------------------------------------------
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip: string,
    userAgent: string
  ): Promise<{ success: boolean; message: string }> {
    const user = db.users.get(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found.');
    }

    const isValid = await this.comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      this.logSecurityEvent('PASSWORD_CHANGED', {
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Incorrect current password' }
      });
      throw new Error('Current password is incorrect.');
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    // Invalidate all active sessions for security
    this.logoutAll(user.id, ip, userAgent);

    await emailService.sendEmail({
      to: user.email,
      subject: 'Security Alert: Password Changed',
      template: 'password_changed',
      userName: user.name
    });

    this.logSecurityEvent('PASSWORD_CHANGED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO'
    });

    return { success: true, message: 'Password changed successfully.' };
  }

  // ----------------------------------------------------
  // 7.5. PROFILE UPDATE WITH STRICT PRIVILEGE GUARDS
  // ----------------------------------------------------
  private static superAdminLockChain: Promise<void> = Promise.resolve();

  public static async withSuperAdminLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = AuthService.superAdminLockChain;
    let release: () => void;
    AuthService.superAdminLockChain = new Promise<void>(res => { release = res; });
    try {
      await prev;
      return await fn();
    } finally {
      release!();
    }
  }

  public async updateProfile(
    userId: string,
    payload: any,
    ip: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<UserEntity> {
    const user = db.users.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    // Explicit Privilege Escalation Defense:
    // Reject any payload containing privileged role/admin fields
    const rawRole = payload.role;
    const rawIsAdmin = payload.isAdmin;
    const rawIsSuperAdmin = payload.isSuperAdmin;
    const rawPermissions = payload.permissions;
    const rawPrivileges = payload.privileges;

    if (
      rawRole !== undefined ||
      rawIsAdmin !== undefined ||
      rawIsSuperAdmin !== undefined ||
      rawPermissions !== undefined ||
      rawPrivileges !== undefined
    ) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: {
          reason: 'Privilege escalation attempt in profile update. Request rejected.',
          attemptedRole: rawRole,
          attemptedIsAdmin: rawIsAdmin,
          attemptedIsSuperAdmin: rawIsSuperAdmin
        }
      });
      throw new Error('Unauthorized role modification attempt. Privilege escalation is strictly forbidden.');
    }

    // Strict Allowlist: only user-editable profile properties
    const safeUpdates: Partial<UserEntity> = {};
    if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
      safeUpdates.name = payload.name.trim();
    }
    if (typeof payload.phone === 'string') {
      safeUpdates.phone = payload.phone.trim();
    }
    if (typeof payload.bio === 'string') {
      safeUpdates.bio = payload.bio.trim();
    }
    if (typeof payload.avatarUrl === 'string') {
      safeUpdates.avatarUrl = payload.avatarUrl.trim();
    }
    if (payload.clientType && typeof payload.clientType === 'string') {
      safeUpdates.clientType = payload.clientType;
    }
    if (payload.location && typeof payload.location === 'object') {
      safeUpdates.location = payload.location;
    }

    return db.updateUser(userId, safeUpdates);
  }

  // ----------------------------------------------------
  // 8. SUPER ADMIN PROVISIONING & INITIALIZATION
  // ----------------------------------------------------
  public provisionSuperAdmin(explicitPassword?: string): UserProfile {
    const admin = db.provisionSuperAdmin(explicitPassword);
    this.logSecurityEvent('PASSWORD_SETUP', {
      userId: admin.id,
      userEmail: admin.email,
      role: 'SUPER_ADMIN',
      severity: 'INFO',
      details: { action: 'Super Admin idempotently provisioned and role integrity verified' }
    });
    return this.getSafeUser(admin);
  }

  public async initAdminSetup(
    origin: string = 'http://localhost:3000',
    ip: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{ success: boolean; message: string; setupToken?: string; setupUrl?: string; adminEmail: string }> {
    const admin = db.users.get(SUPER_ADMIN_ID) || db.getUserByEmail(SUPER_ADMIN_EMAIL);
    if (!admin) {
      throw new Error('Super Admin record missing from database store.');
    }

    // Invalidate old admin setup tokens
    Array.from(db.tokens.values()).forEach(t => {
      if (t.userId === admin.id && t.type === 'admin_setup') {
        t.isUsed = true;
      }
    });

    const rawToken = this.generateRandomToken(32);
    const tokenHash = this.hashToken(rawToken);
    const setupToken: VerificationToken = {
      id: `tok_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      userId: admin.id,
      email: admin.email,
      type: 'admin_setup',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      isUsed: false,
      createdAt: new Date().toISOString()
    };
    db.tokens.set(setupToken.id, setupToken);

    const actionUrl = `${origin}/?adminSetupToken=${rawToken}`;
    await emailService.sendEmail({
      to: SUPER_ADMIN_EMAIL,
      subject: '👑 Super Admin Initial Password Setup',
      template: 'admin_setup',
      userName: 'Muhammad Kabir Ahmad (Maddy)',
      actionUrl,
      token: rawToken
    });

    this.logSecurityEvent('PASSWORD_SETUP', {
      userId: admin.id,
      userEmail: admin.email,
      role: 'SUPER_ADMIN',
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { action: 'Admin setup link dispatched' }
    });

    return {
      success: true,
      setupToken: rawToken,
      setupUrl: actionUrl,
      adminEmail: SUPER_ADMIN_EMAIL,
      message: `Setup instructions have been dispatched to the designated Super Admin email (${SUPER_ADMIN_EMAIL}).`
    };
  }

  public async setupAdminPassword(
    rawToken: string,
    newPassword: string,
    ip: string = '127.0.0.1',
    userAgent: string = 'browser'
  ): Promise<{ success: boolean; user: UserProfile; message: string }> {
    const tokenHash = this.hashToken(rawToken.trim());
    const tokenRecord = Array.from(db.tokens.values()).find(
      t => t.tokenHash === tokenHash && t.type === 'admin_setup' && !t.isUsed
    );

    if (!tokenRecord) {
      throw new Error('Super Admin setup token is invalid or has already been used.');
    }

    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      throw new Error('Super Admin setup link has expired. Please request a new setup email.');
    }

    const admin = db.users.get(tokenRecord.userId);
    if (!admin || admin.role !== 'SUPER_ADMIN' || admin.email !== SUPER_ADMIN_EMAIL) {
      throw new Error('Unauthorized admin initialization attempt.');
    }

    // Set hashed password and activate
    admin.passwordHash = await this.hashPassword(newPassword);
    admin.status = 'ACTIVE';
    admin.emailVerifiedAt = new Date().toISOString();
    admin.updatedAt = new Date().toISOString();
    tokenRecord.isUsed = true;

    // Invalidate any pre-existing sessions for security
    this.logoutAll(admin.id, ip, userAgent);

    this.logSecurityEvent('PASSWORD_SETUP', {
      userId: admin.id,
      userEmail: admin.email,
      role: 'SUPER_ADMIN',
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { action: 'Super Admin password initialized' }
    });

    return {
      success: true,
      user: this.getSafeUser(admin),
      message: 'Super Admin password successfully initialized. You can now sign in with full executive access.'
    };
  }

  // ----------------------------------------------------
  // 9. TWO-FACTOR AUTHENTICATION CONFIGURATION
  // ----------------------------------------------------
  public generateTwoFactor(userId: string): { secret: string; otpauthUrl: string; recoveryCodes: string[] } {
    const user = db.users.get(userId);
    if (!user) throw new Error('User not found.');

    const { secret, otpauthUrl, recoveryCodes } = this.generateTotpSecret();
    user.twoFactorSecret = secret; // temporarily save secret pending verification

    return { secret, otpauthUrl, recoveryCodes };
  }

  public enableTwoFactor(
    userId: string,
    totpCode: string,
    recoveryCodes: string[],
    ip: string,
    userAgent: string
  ): { success: boolean; message: string } {
    const user = db.users.get(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('Two-factor setup has not been initialized.');
    }

    const isValid = this.verifyTotpCode(user.twoFactorSecret, totpCode.trim());
    if (!isValid) {
      throw new Error('Invalid 6-digit TOTP code. Please check your authenticator app clock.');
    }

    user.twoFactorEnabled = true;
    user.twoFactorRecoveryCodes = recoveryCodes.map(c => this.hashToken(c.toUpperCase().trim()));
    user.updatedAt = new Date().toISOString();

    this.logSecurityEvent('2FA_ENABLED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO'
    });

    return { success: true, message: 'Two-factor authentication has been enabled successfully.' };
  }

  public async disableTwoFactor(
    userId: string,
    password?: string,
    ip: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; message: string }> {
    const user = db.users.get(userId);
    if (!user) throw new Error('User not found.');

    // If Super Admin, require password verification before disabling 2FA
    if (user.role === 'SUPER_ADMIN') {
      if (!password) {
        throw new Error('Password confirmation is required to disable two-factor authentication.');
      }
      if (!user.passwordHash || !(await this.comparePassword(password, user.passwordHash))) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          ipAddress: ip,
          userAgent,
          severity: 'WARNING',
          details: { action: 'Failed password attempt while trying to disable 2FA' }
        });
        throw new Error('Invalid password. Password confirmation is required to disable two-factor authentication.');
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = undefined;
    user.updatedAt = new Date().toISOString();

    this.logSecurityEvent('2FA_DISABLED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'WARNING'
    });

    return { success: true, message: 'Two-factor authentication has been disabled.' };
  }

  public async regenerateRecoveryCodes(
    userId: string,
    password?: string,
    ip: string = '127.0.0.1',
    userAgent: string = 'system'
  ): Promise<{ success: boolean; recoveryCodes: string[]; message: string }> {
    const user = db.users.get(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('Two-factor authentication is not active.');
    }

    if (user.role === 'SUPER_ADMIN' && password) {
      if (!user.passwordHash || !(await this.comparePassword(password, user.passwordHash))) {
        throw new Error('Invalid password confirmation.');
      }
    }

    // Generate 8 new random recovery codes
    const recoveryCodes = Array.from({ length: 8 }).map(() =>
      `${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase()
    );

    user.twoFactorRecoveryCodes = recoveryCodes.map(c => this.hashToken(c.toUpperCase().trim()));
    user.updatedAt = new Date().toISOString();

    this.logSecurityEvent('2FA_ENABLED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { action: 'Recovery codes regenerated' }
    });

    return {
      success: true,
      recoveryCodes,
      message: 'New backup recovery codes have been generated. Store them safely.'
    };
  }

  // ----------------------------------------------------
  // 10. SESSION MANAGEMENT
  // ----------------------------------------------------
  public logout(sessionId: string, ip?: string, userAgent?: string): void {
    const session = db.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
      this.logSecurityEvent('LOGOUT', {
        userId: session.userId,
        userEmail: session.email,
        role: session.role,
        ipAddress: ip || session.ipAddress,
        userAgent: userAgent || session.userAgent,
        severity: 'INFO',
        details: { sessionId }
      });
    }
  }

  public logoutAll(userId: string, ip?: string, userAgent?: string): void {
    Array.from(db.sessions.values()).forEach(s => {
      if (s.userId === userId) {
        s.isRevoked = true;
      }
    });
    this.logSecurityEvent('LOGOUT_ALL_SESSIONS', {
      userId,
      ipAddress: ip || '127.0.0.1',
      userAgent: userAgent || 'server',
      severity: 'INFO'
    });
  }

  public getActiveSessions(userId: string): AuthSession[] {
    return Array.from(db.sessions.values()).filter(
      s => s.userId === userId && !s.isRevoked && new Date(s.expiresAt).getTime() > Date.now()
    );
  }
}

export const authService = new AuthService();
export { passwordResetTokenService };
