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
import { db } from '../db';
import { emailService } from './emailService';
import { passwordService } from './passwordService';
import { emailVerificationTokenService } from './emailVerificationTokenService';

const JWT_SECRET = process.env.JWT_SECRET || 'boost_market_jwt_production_secret_key_2026_9881726';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'boost_market_refresh_secret_key_2026_7718291';
const PRE_AUTH_SECRET = process.env.PRE_AUTH_SECRET || 'boost_market_preauth_secret_2026_1192837';

const SUPER_ADMIN_EMAIL = 'maddyahamco00@gmail.com';
const SUPER_ADMIN_ID = 'usr_super_admin_maddy';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier?: string;
  sessionId?: string;
}

export class AuthService {
  private failedAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();

  constructor() {
    console.log('[AuthService] Production Authentication & Authorization Engine Ready');
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

    // CRITICAL: Block registering the designated Super Admin email
    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'CRITICAL',
        details: { reason: 'Attempted to publicly register Super Admin email' }
      });
      throw new Error('Registration failed. This email is restricted for executive governance.');
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
  public async resendVerification(email: string, origin: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.getUserByEmail(normalizedEmail);

    if (!user) {
      return { success: true, message: 'If an unverified account exists for this email, a verification link has been sent.' };
    }

    if (user.status === 'ACTIVE' && user.emailVerifiedAt) {
      return { success: true, message: 'This account email is already verified. You can sign in immediately.' };
    }

    const { verificationUrl } = await emailVerificationTokenService.create(
      user.id,
      user.email,
      { origin }
    );

    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify Your Boost Market Account',
      template: 'verification',
      userName: user.name,
      actionUrl: verificationUrl
    });

    this.logSecurityEvent('EMAIL_RESENT', {
      userId: user.id,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      severity: 'INFO'
    });

    return {
      success: true,
      message: 'If an unverified account exists for this email, a verification link has been sent.'
    };
  }

  // ----------------------------------------------------
  // 4. LOGIN & AUTHENTICATION
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

    // Check rate limit / lockout
    const rateStatus = this.checkRateLimit(rateLimitKey);
    if (rateStatus.isLocked) {
      this.logSecurityEvent('ACCOUNT_LOCKED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { remainingSeconds: rateStatus.remainingSeconds }
      });
      throw new Error(`Too many failed login attempts. Account temporarily locked for ${rateStatus.remainingSeconds} seconds.`);
    }

    const user = db.getUserByEmail(normalizedEmail);
    if (!user) {
      this.registerFailedAttempt(rateLimitKey);
      this.logSecurityEvent('LOGIN_FAILED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'User not found' }
      });
      throw new Error('Invalid email or password.');
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      throw new Error('Your account has been suspended by administration. Please contact support.');
    }
    if (user.status === 'DISABLED' || user.status === 'DELETED') {
      throw new Error('This account is no longer active.');
    }

    // Special check for Super Admin without a password configured yet
    if (user.role === 'SUPER_ADMIN' && !user.passwordHash) {
      throw new Error('Super Admin account initial password setup is required. Please use the initialization link sent to your email.');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(data.password, user.passwordHash || '');
    if (!isPasswordValid) {
      this.registerFailedAttempt(rateLimitKey);
      user.failedLoginAttempts += 1;
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Incorrect password', failedAttempts: user.failedLoginAttempts }
      });
      throw new Error('Invalid email or password.');
    }

    // If 2FA is enabled, issue pre-auth token
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
          // Consume recovery code
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
        throw new Error('Invalid two-factor authentication code or recovery code.');
      }
    }

    // Clear failed attempts on successful login
    this.clearFailedAttempts(rateLimitKey);
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();

    // Create session
    const sessionId = `ses_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false
    };
    db.sessions.set(sessionId, session);

    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user, sessionId);

    this.logSecurityEvent('LOGIN_SUCCESS', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { sessionId }
    });

    return {
      success: true,
      user: this.getSafeUser(user),
      accessToken,
      refreshToken,
      message: 'Sign in successful.'
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
      this.logSecurityEvent('LOGIN_FAILED', {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        ipAddress: ip,
        userAgent,
        severity: 'WARNING',
        details: { reason: 'Invalid 2FA verification code' }
      });
      throw new Error('Invalid two-factor authentication code.');
    }

    user.lastLoginAt = new Date().toISOString();
    user.failedLoginAttempts = 0;

    const sessionId = `ses_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
  // 6. FORGOT & RESET PASSWORD
  // ----------------------------------------------------
  public async forgotPassword(email: string, origin: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.getUserByEmail(normalizedEmail);

    // Generic response regardless of whether account exists to prevent email enumeration
    const safeMessage = 'If an account exists for this email, you will receive password reset instructions.';

    if (!user) {
      this.logSecurityEvent('PASSWORD_RESET_REQUESTED', {
        userEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        severity: 'INFO',
        details: { exists: false }
      });
      return { success: true, message: safeMessage };
    }

    // Invalidate existing password reset tokens
    Array.from(db.tokens.values()).forEach(t => {
      if (t.userId === user.id && t.type === 'password_reset') {
        t.isUsed = true;
      }
    });

    const rawToken = this.generateRandomToken(32);
    const tokenHash = this.hashToken(rawToken);
    const resetToken: VerificationToken = {
      id: `tok_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      userId: user.id,
      email: user.email,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      isUsed: false,
      createdAt: new Date().toISOString()
    };
    db.tokens.set(resetToken.id, resetToken);

    const actionUrl = `${origin}/?resetToken=${rawToken}`;
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
      ipAddress: ip,
      userAgent,
      severity: 'INFO',
      details: { exists: true }
    });

    return { success: true, message: safeMessage };
  }

  public async resetPassword(rawToken: string, newPassword: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string }> {
    const tokenHash = this.hashToken(rawToken.trim());
    const tokenRecord = Array.from(db.tokens.values()).find(
      t => t.tokenHash === tokenHash && t.type === 'password_reset' && !t.isUsed
    );

    if (!tokenRecord) {
      throw new Error('Password reset token is invalid or has already been used.');
    }

    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      throw new Error('Password reset token has expired. Please request a new password reset link.');
    }

    const user = db.users.get(tokenRecord.userId);
    if (!user) {
      throw new Error('User account not found.');
    }

    // Update password hash
    user.passwordHash = await this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    tokenRecord.isUsed = true;

    // Invalidate all active sessions for security
    this.logoutAll(user.id);

    // Send confirmation email
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

    return { success: true, message: 'Password has been reset successfully. Please sign in with your new password.' };
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
  // 8. SUPER ADMIN FIRST-TIME INITIALIZATION
  // ----------------------------------------------------
  public async initAdminSetup(origin: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string }> {
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
      message: `Setup instructions have been dispatched to the designated Super Admin email (${SUPER_ADMIN_EMAIL}).`
    };
  }

  public async setupAdminPassword(
    rawToken: string,
    newPassword: string,
    ip: string,
    userAgent: string
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

  public disableTwoFactor(userId: string, ip: string, userAgent: string): { success: boolean; message: string } {
    const user = db.users.get(userId);
    if (!user) throw new Error('User not found.');

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

  // ----------------------------------------------------
  // 10. SESSION MANAGEMENT
  // ----------------------------------------------------
  public logout(sessionId: string): void {
    const session = db.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
    }
  }

  public logoutAll(userId: string): void {
    Array.from(db.sessions.values()).forEach(s => {
      if (s.userId === userId) {
        s.isRevoked = true;
      }
    });
  }

  public getActiveSessions(userId: string): AuthSession[] {
    return Array.from(db.sessions.values()).filter(
      s => s.userId === userId && !s.isRevoked && new Date(s.expiresAt).getTime() > Date.now()
    );
  }
}

export const authService = new AuthService();
