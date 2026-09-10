import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import next from 'next';
import { db, isDesignatedSuperAdminEmail } from './src/server/db';
import { authService, passwordResetTokenService } from './src/server/services/authService';
import { securityMonitoringService } from './src/server/services/securityMonitoringService';
import { emailService } from './src/server/services/emailService';
import { authTestRunnerService } from './src/server/services/authTestRunnerService';
import { 
  authenticate, 
  optionalAuthenticate, 
  requireSuperAdmin, 
  requireRole, 
  AuthenticatedRequest 
} from './src/server/middleware/authMiddleware';
import { 
  RegisterClientSchema, 
  LoginSchema, 
  VerifyEmailSchema, 
  ResendVerificationSchema, 
  ForgotPasswordSchema, 
  ResetPasswordSchema, 
  ChangePasswordSchema, 
  AdminPasswordSetupSchema, 
  EnableTwoFactorSchema, 
  UpdateProfileSchema,
  CreateProfileSchema,
  AvatarUploadSchema,
  ContactInfoSchema,
  CreateBusinessSchema,
  PROTECTED_BUSINESS_FIELDS,
  generateBusinessSlug,
  formatZodError,
  extractValidationErrors 
} from './src/server/validators/authValidators';
import { storageService } from './src/server/services/storageService';
import { aiService } from './src/server/services/aiService';
import { fxService } from './src/server/services/fxService';
import { paymentService } from './src/server/services/paymentService';
import { webhookService } from './src/server/services/webhookService';
import { ledgerService } from './src/server/services/ledgerService';
import { settlementService } from './src/server/services/settlementService';
import { reconciliationService } from './src/server/services/reconciliationService';
import { refundService } from './src/server/services/refundService';
import { providerService } from './src/server/services/providerService';
import { auditService } from './src/server/services/auditService';
import { testRunnerService } from './src/server/services/testRunnerService';
import { businessService, BusinessServiceError } from './src/server/services/businessService';
import { advertisingCampaignService } from './src/server/services/advertisingCampaignService';
import { leadService } from './src/server/services/leadService';
import { 
  SupportedCurrency, 
  PaymentMethodType, 
  Advertisement, 
  Business, 
  Product, 
  Service, 
  PortfolioItem, 
  Invoice, 
  ChatMessage, 
  Conversation, 
  PushNotification, 
  Review, 
  Report,
  UserProfile,
  AIMarketingRequest,
  Payment,
  MultiPlatformCampaign,
  Lead
} from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body and cookie parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Security Headers & Dynamic CORS Middleware
  app.use((req, res, next) => {
    // Standard Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CORS Configuration
    const requestOrigin = req.headers.origin;
    const configuredOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(o => o.trim().toLowerCase())
      .filter(Boolean);

    const appUrl = process.env.APP_URL ? new URL(process.env.APP_URL).origin.toLowerCase() : null;
    const hostHeader = req.get('host') ? `${req.protocol}://${req.get('host')}`.toLowerCase() : null;

    const isAllowedOrigin = !requestOrigin || 
      requestOrigin === hostHeader ||
      (appUrl && requestOrigin.toLowerCase() === appUrl) ||
      requestOrigin.includes('localhost:') ||
      requestOrigin.includes('127.0.0.1:') ||
      configuredOrigins.includes(requestOrigin.toLowerCase()) ||
      requestOrigin.endsWith('.run.app');

    if (requestOrigin && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[Boost Market API ${req.method}] ${req.path}`);
    }
    next();
  });

  // ==========================================
  // 1. HEALTH & PLATFORM STATS
  // ==========================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Boost Market - Real Boosters Core Engine',
      owner: 'Maddy (Muhammad Kabir Ahmad)',
      brand: 'Real Boosters',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/stats', (req, res) => {
    res.json({
      success: true,
      stats: db.getPlatformStats()
    });
  });

  // ==========================================
  // AUTHENTICATION & AUTHORIZATION ENGINE
  // ==========================================

  // 1. Client Registration (STRICTLY role: CLIENT)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validation = RegisterClientSchema.safeParse(req.body);
      if (!validation.success) {
        const errorData = extractValidationErrors(validation.error);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: errorData.error,
          errors: errorData.errors,
          details: errorData.details
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const origin = `${req.protocol}://${req.get('host')}`;

      const result = await authService.registerClient({
        ...validation.data,
        origin
      }, clientIp, userAgent);

      res.status(201).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      const isDuplicate = message.toLowerCase().includes('already exists') || 
                          message.toLowerCase().includes('unique constraint') ||
                          message.toLowerCase().includes('duplicate');
      
      const safeMessage = isDuplicate
        ? 'An account with this email address already exists. Please sign in or reset your password.'
        : message;

      res.status(isDuplicate ? 409 : 400).json({ 
        success: false, 
        error: safeMessage,
        code: isDuplicate ? 'DUPLICATE_EMAIL' : 'REGISTRATION_FAILED'
      });
    }
  });

  // 2. Client Login (TASK 1.2.1)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validation = LoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error),
          code: 'VALIDATION_ERROR'
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.login(validation.data, clientIp, userAgent);

      if (result.twoFactorRequired) {
        return res.json(result);
      }

      if (result.accessToken) {
        res.cookie('boost_access_token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 1000 // 1 hour
        });
      }

      if (result.refreshToken) {
        res.cookie('boost_refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      const code = (err as any)?.code || (
        message.toLowerCase().includes('verify your email')
          ? 'EMAIL_NOT_VERIFIED'
          : message.toLowerCase().includes('suspended')
          ? 'ACCOUNT_SUSPENDED'
          : message.toLowerCase().includes('locked') || message.toLowerCase().includes('too many')
          ? 'RATE_LIMITED'
          : message.toLowerCase().includes('administrative')
          ? 'ADMIN_SEPARATION'
          : 'INVALID_CREDENTIALS'
      );

      const status = code === 'RATE_LIMITED'
        ? 429
        : code === 'EMAIL_NOT_VERIFIED' || code === 'ACCOUNT_SUSPENDED' || code === 'ADMIN_SEPARATION'
        ? 403
        : 401;

      res.status(status).json({
        success: false,
        error: message,
        code,
        unverified: (err as any)?.unverified,
        email: (err as any)?.email,
        remainingSeconds: (err as any)?.remainingSeconds
      });
    }
  });

  // 3. Two-Factor Login Verification
  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { preAuthToken, code, totpCode, recoveryCode } = req.body;
      const effectiveCode = code || totpCode || recoveryCode;
      if (!preAuthToken || !effectiveCode) {
        return res.status(400).json({ success: false, error: '2FA token and code are required' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = await authService.verifyTwoFactorLogin(preAuthToken, effectiveCode, clientIp, userAgent);

      const cookieDuration = result.user.role === 'SUPER_ADMIN' ? 12 * 60 * 60 * 1000 : 60 * 60 * 1000;

      res.cookie('boost_access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: cookieDuration
      });

      res.cookie('boost_refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Two-factor verification failed';
      const isRateLimit = (err as any)?.code === 'RATE_LIMITED' || message.toLowerCase().includes('too many failed');
      if (isRateLimit) {
        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMITED',
          remainingSeconds: (err as any)?.remainingSeconds || 60
        });
      }
      res.status(401).json({ success: false, error: message });
    }
  });

  // 4. Logout & Logout All
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    let sessionId = req.sessionId;

    if (!sessionId) {
      const token = req.cookies?.boost_access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined);
      if (token) {
        const payload = authService.verifyAccessToken(token);
        if (payload?.sessionId) sessionId = payload.sessionId;
      }
    }

    if (!sessionId) {
      const refreshToken = req.cookies?.boost_refresh_token || req.body?.refreshToken;
      if (refreshToken) {
        const payload = authService.verifyRefreshToken(refreshToken);
        if (payload?.sessionId) sessionId = payload.sessionId;
      }
    }

    if (sessionId) {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      authService.logout(sessionId, clientIp, userAgent);
    }

    res.clearCookie('boost_access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.clearCookie('boost_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/logout-all', authenticate, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      authService.logoutAll(req.user.id);
    }
    res.clearCookie('boost_access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.clearCookie('boost_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.json({ success: true, message: 'All active sessions have been revoked' });
  });

  // 5. Refresh Access Token
  app.post('/api/auth/refresh', (req, res) => {
    const refreshToken = req.cookies?.boost_refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token provided' });
    }

    const payload = authService.verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    if (payload.sessionId) {
      const session = db.sessions.get(payload.sessionId);
      if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
        return res.status(401).json({ success: false, error: 'Session has been revoked or expired' });
      }
      session.lastActiveAt = new Date().toISOString();
    }

    const user = db.users.get(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Account no longer exists' });
    }
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended by administration.' });
    }
    if (user.status === 'DISABLED' || user.status === 'DELETED') {
      return res.status(403).json({ success: false, error: 'This account is no longer active.' });
    }

    const safeUser = authService.getSafeUser(user);
    const newAccessToken = authService.generateAccessToken(safeUser, payload.sessionId);
    res.cookie('boost_access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      user: safeUser
    });
  });

  // 6. Email Verification (GET /api/auth/verify-email?token=<TOKEN>)
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const rawToken = (req.query.token as string) || (req.query.verifyToken as string);
      if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required.',
          code: 'MISSING_TOKEN'
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.verifyEmail(rawToken.trim(), clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      const code = message.toLowerCase().includes('expired')
        ? 'EXPIRED_TOKEN'
        : message.toLowerCase().includes('already been used')
        ? 'ALREADY_USED'
        : message.toLowerCase().includes('suspended') || message.toLowerCase().includes('restricted')
        ? 'ACCOUNT_RESTRICTED'
        : 'INVALID_TOKEN';

      res.status(400).json({ success: false, error: message, code });
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const rawToken = req.body?.token || req.body?.verifyToken;
      if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required.',
          code: 'MISSING_TOKEN'
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.verifyEmail(rawToken.trim(), clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      const code = message.toLowerCase().includes('expired')
        ? 'EXPIRED_TOKEN'
        : message.toLowerCase().includes('already been used')
        ? 'ALREADY_USED'
        : message.toLowerCase().includes('suspended') || message.toLowerCase().includes('restricted')
        ? 'ACCOUNT_RESTRICTED'
        : 'INVALID_TOKEN';

      res.status(400).json({ success: false, error: message, code });
    }
  });

  // 7. Resend Verification Link
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const validation = ResendVerificationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, error: formatZodError(validation.error) });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const origin = `${req.protocol}://${req.get('host')}`;

      const result = await authService.resendVerification(validation.data.email, origin, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification';
      const isRateLimit = (err as any)?.code === 'RATE_LIMITED' || message.toLowerCase().includes('too many requests');
      
      if (isRateLimit) {
        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMITED',
          remainingSeconds: (err as any)?.remainingSeconds
        });
      }

      res.status(400).json({ success: false, error: message });
    }
  });

  // 8. Forgot Password
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validation = ForgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, error: formatZodError(validation.error) });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';
      const origin = `${req.protocol}://${req.get('host')}`;

      const result = await authService.forgotPassword(validation.data.email, origin, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const isRateLimited = (err as any)?.code === 'RATE_LIMITED';
      const message = err instanceof Error ? err.message : 'Failed to process request';
      const status = isRateLimited ? 429 : 400;
      res.status(status).json({ 
        success: false, 
        error: message, 
        isRateLimited,
        retryAfterSeconds: (err as any)?.remainingSeconds || 60 
      });
    }
  });

  // 9. Reset Password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validation = ResetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = await authService.resetPassword(validation.data.token, validation.data.newPassword, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const isRateLimited = (err as any)?.code === 'RATE_LIMITED';
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      const status = isRateLimited ? 429 : 400;
      res.status(status).json({ 
        success: false, 
        error: message,
        isRateLimited,
        retryAfterSeconds: (err as any)?.remainingSeconds || 60
      });
    }
  });

  // 10. Change Password (Authenticated)
  const handlePasswordChange = async (req: AuthenticatedRequest, res: any) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // 1. Explicit Mass-Assignment & Privilege Escalation Defense:
      // Reject any malicious fields aimed at tampering with roles, privileges, status, or identity
      const FORBIDDEN_PASSWORD_CHANGE_FIELDS = [
        'role', 'roles', 'isAdmin', 'isSuperAdmin', 'accountStatus', 'status',
        'emailVerified', 'emailVerifiedAt', 'userId', 'id', 'permissions',
        'securityFlags', 'privileges', 'tier', 'email', 'failedLoginAttempts',
        'lockedUntil', 'passwordHash', 'twoFactorEnabled', 'twoFactorSecret',
        'twoFactorRecoveryCodes'
      ];

      for (const field of FORBIDDEN_PASSWORD_CHANGE_FIELDS) {
        if (req.body && field in req.body) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: req.user!.id,
            userEmail: req.user!.email,
            role: req.user!.role,
            ipAddress: clientIp,
            userAgent,
            severity: 'CRITICAL',
            details: {
              endpoint: req.path,
              action: 'MASS_ASSIGNMENT_PASSWORD_CHANGE_ATTEMPT',
              forbiddenField: field
            }
          });
          return res.status(400).json({
            success: false,
            error: `Mass-assignment rejected: Field '${field}' is not permitted in password change request.`,
            code: 'FORBIDDEN_FIELD'
          });
        }
      }

      // 2. Strict Zod Schema Validation
      const validation = ChangePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      // 3. Authenticated Identity: strictly from server-side session (req.user!.id)
      const result = await authService.changePassword(
        req.user!.id,
        validation.data.currentPassword,
        validation.data.newPassword,
        clientIp,
        userAgent
      );

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      const isRateLimited = (err as any)?.code === 'RATE_LIMITED';
      const isForbidden = message.toLowerCase().includes('unauthorized') ||
                          message.toLowerCase().includes('escalation') ||
                          message.toLowerCase().includes('forbidden');
      
      const statusCode = isRateLimited ? 429 : isForbidden ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: message,
        code: isRateLimited ? 'RATE_LIMITED' : undefined,
        remainingSeconds: (err as any)?.remainingSeconds
      });
    }
  };

  app.post('/api/auth/change-password', authenticate, handlePasswordChange);
  app.post('/api/client/change-password', authenticate, handlePasswordChange);
  app.post('/api/users/change-password', authenticate, handlePasswordChange);

  // 11. Current Session Profile (Me)
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (req.query.optional === 'true' || req.query.check === 'true') {
      return optionalAuthenticate(req, res, () => {
        if (!req.user) {
          return res.json({ success: true, authenticated: false, user: null, sessionsCount: 0 });
        }
        const safeUser = authService.getSafeUser(req.user);
        const sessions = authService.getActiveSessions(req.user.id);
        const securityState = authService.getAccountSecurityState(req.user);
        return res.json({
          success: true,
          authenticated: true,
          user: safeUser,
          id: safeUser.id,
          name: safeUser.name,
          email: safeUser.email,
          role: safeUser.role,
          sessionsCount: sessions.length,
          securityState
        });
      });
    }

    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const safeUser = authService.getSafeUser(req.user);
      const sessions = authService.getActiveSessions(req.user.id);
      const securityState = authService.getAccountSecurityState(req.user);
      res.json({
        success: true,
        authenticated: true,
        user: safeUser,
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
        sessionsCount: sessions.length,
        securityState
      });
    });
  });

  // 12. Super Admin First-Time Setup Link Dispatch
  app.post('/api/auth/admin/init-setup', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const origin = `${req.protocol}://${req.get('host')}`;

      const result = await authService.initAdminSetup(origin, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Admin setup initialization failed';
      res.status(400).json({ success: false, error: message });
    }
  });

  // 12.1. Super Admin Login
  app.post('/api/auth/admin/login', async (req, res) => {
    try {
      const { email, password, totpCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.adminLogin(
        { email, password, twoFactorCode: totpCode },
        clientIp,
        userAgent
      );

      if (result.twoFactorRequired) {
        return res.json({
          success: true,
          requires2FA: true,
          preAuthToken: result.preAuthToken,
          email: result.email
        });
      }

      if (result.accessToken) {
        res.cookie('boost_access_token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 1000
        });
      }

      if (result.refreshToken) {
        res.cookie('boost_refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Admin authentication failed';
      res.status(401).json({ success: false, error: message });
    }
  });

  // 13. Super Admin Set Password
  app.post('/api/auth/admin/setup-password', async (req, res) => {
    try {
      const validation = AdminPasswordSetupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.setupAdminPassword(validation.data.token, validation.data.newPassword, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Admin password setup failed';
      res.status(400).json({ success: false, error: message });
    }
  });

  // 14. Two-Factor Authentication Setup & Config
  app.post('/api/auth/2fa/setup', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const result = authService.generateTwoFactor(req.user!.id);
      res.json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate 2FA secret';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/2fa/enable', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const { totpCode, code, recoveryCodes } = req.body;
      const effectiveCode = totpCode || code;
      if (!effectiveCode || !Array.isArray(recoveryCodes)) {
        return res.status(400).json({ success: false, error: 'TOTP code and recovery codes are required' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = authService.enableTwoFactor(req.user!.id, effectiveCode, recoveryCodes, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable 2FA';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/2fa/disable', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { password } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = await authService.disableTwoFactor(req.user!.id, password, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
      res.status(400).json({ success: false, error: message });
    }
  });

  // Dedicated Super Admin 2FA Management Endpoints
  app.get('/api/admin/2fa/status', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const admin = db.users.get(req.user!.id);
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
    const isEnabled = Boolean(admin.twoFactorEnabled && admin.twoFactorSecret);
    res.json({
      success: true,
      enabled: isEnabled,
      twoFactorEnabled: isEnabled,
      userEmail: admin.email,
      remainingRecoveryCodes: admin.twoFactorRecoveryCodes ? admin.twoFactorRecoveryCodes.length : 0
    });
  });

  app.post('/api/admin/2fa/regenerate-recovery-codes', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { password } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = await authService.regenerateRecoveryCodes(req.user!.id, password, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate recovery codes';
      res.status(400).json({ success: false, error: message });
    }
  });

  // 15. Sessions Management
  app.get('/api/auth/sessions', authenticate, (req: AuthenticatedRequest, res) => {
    const sessions = authService.getActiveSessions(req.user!.id);
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent: s.id === req.sessionId
      }))
    });
  });

  app.delete('/api/auth/sessions/:id', authenticate, (req: AuthenticatedRequest, res) => {
    const session = db.sessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (session.userId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user!.id,
        userEmail: req.user!.email,
        role: req.user!.role,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        severity: 'CRITICAL',
        details: {
          targetSessionId: req.params.id,
          targetUserId: session.userId,
          action: 'session_idor_delete'
        }
      });
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: You cannot revoke another user\'s session.'
      });
    }
    authService.logout(session.id);
    res.json({ success: true, message: 'Session revoked' });
  });

  // Revoke all other active sessions except the current one
  const handleRevokeAllOtherSessions = (req: AuthenticatedRequest, res: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const currentSessionId = req.sessionId;
    const sessions = authService.getActiveSessions(req.user.id);
    let revokedCount = 0;
    for (const s of sessions) {
      if (s.id !== currentSessionId) {
        authService.logout(s.id);
        revokedCount++;
      }
    }
    authService.logSecurityEvent('LOGOUT', {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      severity: 'INFO',
      details: { action: 'revoke_all_other_sessions', revokedCount }
    });
    res.json({ success: true, message: 'All other sessions have been revoked', revokedCount });
  };

  app.post('/api/auth/sessions/all-other', authenticate, handleRevokeAllOtherSessions);
  app.delete('/api/auth/sessions/all-other', authenticate, handleRevokeAllOtherSessions);
  app.post('/api/auth/sessions/revoke-others', authenticate, handleRevokeAllOtherSessions);

  // 16. Outbox / Email Inspector (For local testing & demo in preview)
  app.get('/api/auth/outbox', (req, res) => {
    const emails = emailService.getOutbox();
    res.json({ success: true, count: emails.length, emails });
  });

  app.delete('/api/auth/outbox', (req, res) => {
    emailService.clearOutbox();
    res.json({ success: true, message: 'Email outbox cleared' });
  });

  // Maintenance: Password Reset & Verification Token Cleanup & Security Retention
  app.post('/api/admin/maintenance/cleanup-tokens', authenticate, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { removeExpired = true, removeUsed = true, usedRetentionMinutes = 0 } = req.body || {};
      const result = await passwordResetTokenService.cleanup({
        removeExpired,
        removeUsed,
        usedRetentionMinutes
      });
      const maintenance = await securityMonitoringService.runMaintenance();
      res.json({ success: true, ...result, maintenance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Token cleanup failed' });
    }
  });

  app.get('/api/admin/maintenance/token-stats', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const stats = passwordResetTokenService.getStats();
    const securityStats = securityMonitoringService.getSecurityStats();
    res.json({ success: true, stats, securityStats });
  });

  // Dedicated Security Monitoring & Telemetry Endpoints
  app.get('/api/admin/security-stats', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    try {
      const stats = securityMonitoringService.getSecurityStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch security stats' });
    }
  });

  app.get('/api/admin/security-alerts', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const alerts = securityMonitoringService.getRecentAlerts(limit);
      res.json({ success: true, alerts, count: alerts.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to fetch security alerts' });
    }
  });

  // 17. Super Admin Dedicated Me & Security Audit Logs & User Governance
  app.get('/api/admin/me', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const safeUser = authService.getSafeUser(req.user!);
    res.json({
      success: true,
      authenticated: true,
      user: safeUser,
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role
    });
  });

  app.get('/api/admin/security-logs', authenticate, requireSuperAdmin, (req, res) => {
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(req.query.limit as string))) : 50;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string)) : 0;
    const severity = typeof req.query.severity === 'string' ? req.query.severity as any : undefined;
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType as any : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = securityMonitoringService.getAuditLogs({
      limit,
      offset,
      severity,
      eventType,
      search
    });

    res.json({
      success: true,
      logs: result.events,
      total: result.total,
      hasMore: result.hasMore,
      summary: result.summary
    });
  });

  app.get('/api/admin/users', authenticate, requireSuperAdmin, (req, res) => {
    const safeUsers = Array.from(db.users.values()).map(u => authService.getSafeUser(u));
    res.json({ success: true, users: safeUsers });
  });

  // Explicit Admin User Creation Guard: PREVENT CREATION OF ANOTHER SUPER ADMIN
  app.post('/api/admin/users', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    try {
      const { role, email, isSuperAdmin, isAdmin } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      if (role === 'SUPER_ADMIN' || isSuperAdmin || isAdmin) {
        securityMonitoringService.recordPrivilegeEscalationAttempt(
          'SUPER_ADMIN',
          email || 'unknown',
          clientIp,
          userAgent,
          'Attempt to create another Super Admin account via admin/users endpoint'
        );
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user?.id,
          userEmail: req.user?.email,
          role: req.user?.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: { alert: 'Attempt to create another Super Admin account via admin/users endpoint' }
        });
        return res.status(403).json({
          success: false,
          error: 'Creation of another Super Admin is prohibited. Only the designated executive account can be SUPER_ADMIN.',
          code: 'SUPER_ADMIN_CREATION_PROHIBITED'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Direct admin user creation is disabled. Users must register via the public client portal.',
        code: 'OPERATION_NOT_PERMITTED'
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.patch('/api/admin/users/:id/role', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'admin_console';

    const user = db.users.get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (role === 'SUPER_ADMIN') {
      securityMonitoringService.recordPrivilegeEscalationAttempt(
        'SUPER_ADMIN',
        user.email,
        clientIp,
        userAgent,
        `Attempt to promote user ${user.email} (${user.id}) to SUPER_ADMIN rejected`
      );
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        role: req.user?.role,
        ipAddress: clientIp,
        userAgent,
        severity: 'CRITICAL',
        details: { alert: 'Attempted to promote user to SUPER_ADMIN', targetUserId: user.id, targetEmail: user.email }
      });
      return res.status(403).json({
        success: false,
        error: 'Role escalation blocked: There can be only ONE Super Admin account. Promoting another user to SUPER_ADMIN is strictly prohibited.',
        code: 'PRIVILEGE_ESCALATION_BLOCKED'
      });
    }

    if (user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        role: req.user?.role,
        ipAddress: clientIp,
        userAgent,
        severity: 'CRITICAL',
        details: { alert: 'Attempted to demote primary Super Admin account' }
      });
      return res.status(403).json({
        success: false,
        error: 'Primary Super Admin account role cannot be demoted or altered.',
        code: 'SUPER_ADMIN_DEMOTION_PROHIBITED'
      });
    }

    try {
      const updated = db.updateUser(id, { role });
      res.json({ success: true, user: authService.getSafeUser(updated) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Role update failed';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.patch('/api/admin/users/:id/status', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const user = db.users.get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Protect Super Admin from suspension or deletion
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Super Admin account status cannot be altered.' });
    }

    user.status = status;
    user.updatedAt = new Date().toISOString();

    authService.logSecurityEvent('ACCOUNT_STATUS_CHANGED', {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      severity: 'WARNING',
      details: { newStatus: status, changedBy: req.user!.email }
    });

    res.json({ success: true, user: authService.getSafeUser(user) });
  });

  // 18. Automated Auth & Security Suite Runner
  app.post('/api/tests/auth-suite', async (req, res) => {
    try {
      const startTime = Date.now();
      const results = await authTestRunnerService.runAllSecurityTests();
      const passedCount = results.filter(r => r.status === 'passed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      res.json({
        success: true,
        summary: {
          total: results.length,
          passed: passedCount,
          failed: failedCount,
          passRatePercent: Math.round((passedCount / results.length) * 100),
          durationMs: Date.now() - startTime
        },
        results
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Client Profile & Security Settings Test Runner
  app.post('/api/tests/profile', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.1.1 Client Profile Creation Test Runner
  app.post('/api/tests/profile-creation', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileCreationTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.1.2 Client Profile Editing Test Runner
  app.post('/api/tests/profile-editing', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileEditingTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/profile-editing', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileEditingTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.1.3 Client Profile Picture Test Runner
  app.post('/api/tests/profile-avatar', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileAvatarTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/profile-avatar', async (req, res) => {
    try {
      const result = await authTestRunnerService.runProfileAvatarTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.1.4 Client Personal Contact Information Test Runner
  app.post('/api/tests/profile-contact', async (req, res) => {
    try {
      const result = await authTestRunnerService.runContactInfoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/profile-contact', async (req, res) => {
    try {
      const result = await authTestRunnerService.runContactInfoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.2.1 Create Business Test Runner
  app.post('/api/tests/business-create', async (req, res) => {
    try {
      const result = await authTestRunnerService.runCreateBusinessTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-create', async (req, res) => {
    try {
      const result = await authTestRunnerService.runCreateBusinessTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.2.2 Business Logo Test Runner
  app.post('/api/tests/business-logo', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessLogoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-logo', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessLogoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Epic 2 Task 2.2.3 Business Cover Image Test Runner
  app.post('/api/tests/business-cover', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessCoverTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-cover', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessCoverTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-description', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessDescriptionTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/tests/business-description', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessDescriptionTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-location', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessLocationTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/tests/business-location', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessLocationTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-opening-hours', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessOpeningHoursTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/tests/business-opening-hours', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessOpeningHoursTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/tests/business-contact-info', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessContactInfoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/tests/business-contact-info', async (req, res) => {
    try {
      const result = await authTestRunnerService.runBusinessContactInfoTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated Client Password Change & Security Controls Test Runner
  app.post('/api/tests/password-security', async (req, res) => {
    try {
      const result = await authTestRunnerService.runPasswordSecurityTestOnly();
      res.json({ success: true, result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Dedicated 18 Security Regression Attacks Runner
  app.post('/api/tests/security-regression-attacks', async (req, res) => {
    try {
      const result = await authTestRunnerService.run18SecurityAttacks();
      res.json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 2. USERS & PROFILES
  // ==========================================
  const handleGetProfile = (req: AuthenticatedRequest, res: any) => {
    const user = db.users.get(req.user!.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or session expired.' });
    }
    const safeUser = authService.getSafeUser(user);
    const securityState = authService.getAccountSecurityState(user);
    const profile = db.profiles.getByUserId(user.id) || null;
    res.json({
      success: true,
      user: safeUser,
      profile,
      securityState
    });
  };

  // Secure endpoints to retrieve authenticated client's own profile
  app.get('/api/client/profile', authenticate, handleGetProfile);
  app.get('/api/users/profile', authenticate, handleGetProfile);
  app.get('/api/users/me', authenticate, handleGetProfile);

  app.get('/api/users', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      const usersList = Array.from(db.users.values()).map(u => authService.getSafeUser(u));
      return res.json({ success: true, users: usersList });
    }
    if (req.user) {
      // Normal clients only see themselves in users list
      return res.json({ success: true, users: [authService.getSafeUser(req.user)] });
    }
    res.json({ success: true, users: [] });
  });

  app.get('/api/users/:id', authenticate, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const effectiveId = (targetId === 'me' || targetId === 'profile') ? req.user!.id : targetId;

    // Normal client can ONLY view their own profile. Only SUPER_ADMIN can inspect other accounts.
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.id !== effectiveId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to view this account profile.',
        code: 'FORBIDDEN'
      });
    }

    const user = db.users.get(effectiveId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Normal clients cannot inspect the Super Admin
    if (user.role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Super Admin profile is restricted.',
        code: 'FORBIDDEN'
      });
    }

    res.json({ success: true, user: authService.getSafeUser(user) });
  });

  const handleProfileUpdate = async (req: AuthenticatedRequest, res: any, targetUserId: string) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';
      const effectiveUserId = (targetUserId === 'me' || targetUserId === 'profile') ? req.user!.id : targetUserId;

      // Query Parameter Tampering / Privilege Escalation Guard
      const q = (req.query || {}) as Record<string, any>;
      if (
        q.role !== undefined ||
        q.isAdmin !== undefined ||
        q.isSuperAdmin !== undefined ||
        q.superAdmin !== undefined ||
        q.isStaff !== undefined ||
        q.permissions !== undefined ||
        q.privileges !== undefined ||
        q.accountStatus !== undefined ||
        q.status !== undefined ||
        q.securityFlags !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user!.id,
          userEmail: req.user!.email,
          role: req.user!.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: { reason: 'Attempted privilege escalation via query parameters in profile update.' }
        });
        return res.status(403).json({
          success: false,
          error: 'Unauthorized role modification attempt via query parameters. Privilege escalation is strictly forbidden.',
          code: 'PRIVILEGE_ESCALATION_BLOCKED'
        });
      }

      if ((q.userId !== undefined && q.userId !== effectiveUserId) || (q.id !== undefined && q.id !== effectiveUserId)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Modifying user ID via query parameters is not permitted.',
          code: 'FORBIDDEN'
        });
      }

      // Schema Validation
      const validation = UpdateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      // Explicit Privilege Escalation Defense: Reject privileged role modification
      if (
        req.body.role !== undefined ||
        req.body.isAdmin !== undefined ||
        req.body.isSuperAdmin !== undefined ||
        req.body.superAdmin !== undefined ||
        req.body.isStaff !== undefined ||
        req.body.permissions !== undefined ||
        req.body.privileges !== undefined ||
        req.body.accountStatus !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user!.id,
          userEmail: req.user!.email,
          role: req.user!.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: {
            reason: 'Attempted privilege escalation in profile update endpoint.',
            attemptedPayload: {
              role: req.body.role,
              isAdmin: req.body.isAdmin,
              isSuperAdmin: req.body.isSuperAdmin,
              superAdmin: req.body.superAdmin,
              permissions: req.body.permissions,
              accountStatus: req.body.accountStatus
            }
          }
        });

        return res.status(403).json({
          success: false,
          error: 'Unauthorized role modification attempt. Privilege escalation is strictly forbidden.',
          code: 'PRIVILEGE_ESCALATION_BLOCKED'
        });
      }

      // Explicit Defense: Reject tampering with protected account state and security flags
      if (
        req.body.status !== undefined ||
        req.body.securityFlags !== undefined ||
        req.body.emailVerifiedAt !== undefined ||
        req.body.emailVerified !== undefined ||
        req.body.password !== undefined ||
        req.body.passwordHash !== undefined ||
        req.body.tier !== undefined ||
        req.body.twoFactorEnabled !== undefined ||
        req.body.twoFactorSecret !== undefined ||
        req.body.twoFactorRecoveryCodes !== undefined ||
        req.body.failedLoginAttempts !== undefined ||
        req.body.lockedUntil !== undefined ||
        req.body.createdAt !== undefined ||
        req.body.updatedAt !== undefined ||
        req.body.internalAudit !== undefined ||
        req.body.audit !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user!.id,
          userEmail: req.user!.email,
          role: req.user!.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'WARNING',
          details: {
            reason: 'Attempted modification of protected account security fields in profile update.'
          }
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot modify protected account security flags or status via profile update.',
          code: 'PROTECTED_FIELD_VIOLATION'
        });
      }

      // Explicit Defense: Prevent claiming or hijacking the Super Admin email
      if (req.body.email !== undefined && isDesignatedSuperAdminEmail(String(req.body.email))) {
        securityMonitoringService.recordPrivilegeEscalationAttempt(
          'SUPER_ADMIN_EMAIL_HIJACK',
          req.user!.email,
          clientIp,
          userAgent,
          'Attempted to claim designated Super Admin email in profile update'
        );
        return res.status(403).json({
          success: false,
          error: 'Unauthorized email modification attempt. Designated Super Admin email is strictly protected.',
          code: 'FORBIDDEN'
        });
      }

      // Explicit Defense: Email is immutable through ordinary profile updates
      if (req.body.email !== undefined && String(req.body.email).toLowerCase().trim() !== req.user!.email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          error: 'Email address is immutable and cannot be updated directly via profile update.',
          code: 'EMAIL_IMMUTABLE'
        });
      }

      // Explicit Defense: User ID mismatch / IDOR guard
      if (req.body.id !== undefined && req.body.id !== effectiveUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Modifying user ID is not permitted.',
          code: 'FORBIDDEN'
        });
      }
      if (req.body.userId !== undefined && req.body.userId !== effectiveUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Modifying user ID is not permitted.',
          code: 'FORBIDDEN'
        });
      }

      // Authorization guard: normal users can only update their own profile
      if (req.user!.id !== effectiveUserId && req.user!.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only update your own account.',
          code: 'FORBIDDEN'
        });
      }

      const updatedUser = await authService.updateProfile(effectiveUserId, req.body, clientIp, userAgent);
      const updatedProfile = db.getProfileByUserId(effectiveUserId) || (updatedUser as any).profile || null;
      const securityState = authService.getAccountSecurityState(updatedUser);
      res.json({ 
        success: true, 
        user: authService.getSafeUser(updatedUser),
        profile: updatedProfile,
        securityState
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      if (
        message.toLowerCase().includes('already claimed') ||
        message.toLowerCase().includes('already taken')
      ) {
        return res.status(409).json({
          success: false,
          error: message,
          code: 'USERNAME_TAKEN'
        });
      }
      const isForbidden = message.toLowerCase().includes('unauthorized') || 
                          message.toLowerCase().includes('escalation') ||
                          message.toLowerCase().includes('forbidden') ||
                          message.toLowerCase().includes('protected') ||
                          message.toLowerCase().includes('role');
      res.status(isForbidden ? 403 : 400).json({ success: false, error: message });
    }
  };

  /**
   * Epic 2 Feature 2.1 Task 2.1.1: Client Profile Creation Handler
   * - Enforces authenticated CLIENT role
   * - Blocks privilege escalation (role, isAdmin, status, permissions)
   * - Prevents IDOR (userId mismatch)
   * - Validates payload via CreateProfileSchema
   * - Enforces 1-to-1 uniqueness (409 PROFILE_ALREADY_EXISTS)
   * - Enforces unique username handles (409 USERNAME_TAKEN)
   */
  const handleProfileCreate = async (req: AuthenticatedRequest, res: any) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // 1. Authenticated CLIENT check: Only CLIENT role can create client profile
      if (!req.user || req.user.role !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          error: 'Only CLIENT accounts can create user profiles.',
          code: 'FORBIDDEN'
        });
      }

      // 2. Query param privilege escalation rejection
      const q = (req.query || {}) as Record<string, any>;
      if (
        q.role !== undefined ||
        q.isAdmin !== undefined ||
        q.isSuperAdmin !== undefined ||
        q.superAdmin !== undefined ||
        q.permissions !== undefined ||
        q.privileges !== undefined ||
        q.accountStatus !== undefined ||
        q.status !== undefined ||
        q.securityFlags !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user.id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: {
            reason: 'Privilege escalation injection in query params during profile creation.',
            query: req.query
          }
        });
        return res.status(403).json({
          success: false,
          error: 'Unauthorized role modification attempt via query parameters. Privilege escalation is strictly forbidden.',
          code: 'PRIVILEGE_ESCALATION_BLOCKED'
        });
      }

      // 3. Body privilege escalation rejection
      if (
        req.body.role !== undefined ||
        req.body.isAdmin !== undefined ||
        req.body.isSuperAdmin !== undefined ||
        req.body.superAdmin !== undefined ||
        req.body.isStaff !== undefined ||
        req.body.permissions !== undefined ||
        req.body.privileges !== undefined ||
        req.body.accountStatus !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user.id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: {
            reason: 'Attempted privilege escalation in profile creation endpoint.',
            attemptedPayload: {
              role: req.body.role,
              isAdmin: req.body.isAdmin,
              isSuperAdmin: req.body.isSuperAdmin,
              superAdmin: req.body.superAdmin,
              permissions: req.body.permissions,
              accountStatus: req.body.accountStatus
            }
          }
        });
        return res.status(403).json({
          success: false,
          error: 'Unauthorized role modification attempt. Privilege escalation is strictly forbidden.',
          code: 'PRIVILEGE_ESCALATION_BLOCKED'
        });
      }

      // 4. Reject tampering with protected account state and security flags
      if (
        req.body.status !== undefined ||
        req.body.securityFlags !== undefined ||
        req.body.emailVerifiedAt !== undefined ||
        req.body.emailVerified !== undefined ||
        req.body.password !== undefined ||
        req.body.passwordHash !== undefined ||
        req.body.tier !== undefined ||
        req.body.twoFactorEnabled !== undefined ||
        req.body.twoFactorSecret !== undefined ||
        req.body.twoFactorRecoveryCodes !== undefined ||
        req.body.failedLoginAttempts !== undefined ||
        req.body.lockedUntil !== undefined ||
        req.body.createdAt !== undefined ||
        req.body.updatedAt !== undefined ||
        req.body.internalAudit !== undefined ||
        req.body.audit !== undefined
      ) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: req.user.id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'WARNING',
          details: {
            reason: 'Attempted modification of protected account security fields in profile creation.'
          }
        });
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot modify protected account security flags or status via profile creation.',
          code: 'PROTECTED_FIELD_VIOLATION'
        });
      }

      // 5. Explicit Defense: User ID mismatch / IDOR guard
      if (req.body.id !== undefined && req.body.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Specifying or modifying user ID is not permitted.',
          code: 'FORBIDDEN'
        });
      }
      if (req.body.userId !== undefined && req.body.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Specifying or modifying user ID is not permitted.',
          code: 'FORBIDDEN'
        });
      }

      // 6. Check 1-to-1 Uniqueness before schema validation: If profile already exists -> 409
      if (db.profiles.hasProfileForUser(req.user.id)) {
        const existingProfile = db.profiles.getByUserId(req.user.id);
        return res.status(409).json({
          success: false,
          error: 'A profile has already been created for this account.',
          code: 'PROFILE_ALREADY_EXISTS',
          profile: existingProfile
        });
      }

      // 7. Schema Validation using CreateProfileSchema
      const parseResult = CreateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validation = extractValidationErrors(parseResult.error);
        return res.status(400).json({
          success: false,
          error: validation.error,
          errors: validation.errors,
          details: validation.details
        });
      }

      // 8. Create profile via authService
      const result = await authService.createProfile(req.user.id, parseResult.data, clientIp, userAgent);
      return res.status(201).json({
        success: true,
        message: 'Profile created successfully.',
        profile: result.profile,
        user: result.user
      });
    } catch (err: any) {
      if (err.code === 'PROFILE_ALREADY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: err.message || 'A profile has already been created for this account.',
          code: 'PROFILE_ALREADY_EXISTS',
          profile: err.profile
        });
      }
      if (err.code === 'USERNAME_TAKEN') {
        return res.status(409).json({
          success: false,
          error: err.message,
          code: 'USERNAME_TAKEN'
        });
      }
      if (err.code === 'PRIVILEGE_ESCALATION_BLOCKED' || err.code === 'PROTECTED_FIELD_VIOLATION' || err.status === 403) {
        return res.status(403).json({
          success: false,
          error: err.message,
          code: err.code || 'FORBIDDEN'
        });
      }
      const message = err instanceof Error ? err.message : 'Profile creation failed';
      return res.status(400).json({
        success: false,
        error: message
      });
    }
  };

  // Client own-profile creation endpoints (Epic 2 Task 2.1.1)
  app.post('/api/client/profile', authenticate, handleProfileCreate);
  app.post('/api/profile', authenticate, handleProfileCreate);
  app.post('/api/users/profile', authenticate, handleProfileCreate);

  // Client own-profile update endpoints (Epic 1 / Epic 2 Task 2.1.2)
  app.patch('/api/client/profile', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.user!.id);
  });

  app.put('/api/client/profile', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.user!.id);
  });

  app.patch('/api/users/profile', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.user!.id);
  });

  app.patch('/api/users/me', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.user!.id);
  });

  app.put('/api/users/me', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.user!.id);
  });

  app.patch('/api/users/:id', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.params.id);
  });

  app.put('/api/users/:id', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileUpdate(req, res, req.params.id);
  });

  // ==========================================
  // 2.3. CLIENT PROFILE PICTURE (Epic 2 Feature 2.1 Task 2.1.3)
  // ==========================================
  const handleProfileAvatarUpload = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({ success: false, error: 'Session is expired or revoked. Please log in again.' });
        }
      }

      if (currentUser.role !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Profile picture management is only available for CLIENT accounts.'
        });
      }

      // Explicit Mass-Assignment & Privilege Escalation Defense:
      // Reject any attempts to inject role, admin status, status, or other security fields
      const combinedPayload = { ...req.query, ...req.body };
      const forbiddenFields = [
        'role', 'isAdmin', 'isSuperAdmin', 'superAdmin', 'isStaff',
        'permissions', 'privileges', 'accountStatus', 'securityFlags',
        'tier', 'emailVerified', 'emailVerifiedAt', 'passwordHash', 'password'
      ];

      for (const field of forbiddenFields) {
        if (combinedPayload[field] !== undefined) {
          securityMonitoringService.recordPrivilegeEscalationAttempt(
            String(combinedPayload[field]),
            currentUser.email,
            clientIp,
            userAgent,
            `Privilege escalation attempt on avatar upload via field: ${field}`
          );
          return res.status(403).json({
            success: false,
            error: `Privilege escalation blocked: Field "${field}" cannot be modified via profile endpoints.`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR Defense: Users cannot upload or replace avatar for any other account
      const targetedUserId = req.params?.id || req.body?.userId || req.body?.id || req.query?.userId || req.query?.id;
      if (targetedUserId && targetedUserId !== currentUser.id) {
        authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: currentUser.id,
          userEmail: currentUser.email,
          role: currentUser.role,
          ipAddress: clientIp,
          userAgent,
          severity: 'CRITICAL',
          details: {
            reason: 'IDOR attempt on avatar upload',
            targetedUserId,
            currentUserId: currentUser.id
          }
        });
        return res.status(403).json({
          success: false,
          error: "Forbidden: You do not have permission to modify another user's profile picture.",
          code: 'FORBIDDEN'
        });
      }

      // Extract image data
      let imageBuffer: Buffer | null = null;
      let originalFilename = req.body?.filename || 'avatar.jpg';

      if (req.body?.image && typeof req.body.image === 'string') {
        let rawStr = req.body.image.trim();
        // Handle data URL prefix (e.g. data:image/png;base64,...)
        if (rawStr.startsWith('data:')) {
          const commaIdx = rawStr.indexOf(',');
          if (commaIdx !== -1) {
            rawStr = rawStr.substring(commaIdx + 1);
          }
        }
        try {
          imageBuffer = Buffer.from(rawStr, 'base64');
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid base64 image data' });
        }
      } else if (Buffer.isBuffer(req.body)) {
        imageBuffer = req.body;
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'No image file provided or file is empty' });
      }

      // File size limit check: 5MB
      if (imageBuffer.length > storageService.MAX_AVATAR_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `File size (${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB maximum limit.`,
          code: 'FILE_TOO_LARGE'
        });
      }

      // File signature / content validation
      const validation = storageService.validateImageBuffer(imageBuffer);
      if (!validation.isValid || !validation.format) {
        return res.status(400).json({
          success: false,
          error: validation.error || 'Invalid or unsupported image file.',
          code: validation.code || 'UNSUPPORTED_FILE_TYPE'
        });
      }

      const result = await authService.uploadProfileAvatar(
        currentUser.id,
        {
          buffer: imageBuffer,
          originalFilename,
          mimeType: validation.mimeType
        },
        clientIp,
        userAgent
      );

      return res.json({
        success: true,
        message: 'Profile picture updated successfully',
        avatarUrl: result.avatarUrl,
        avatarKey: result.avatarKey,
        user: result.user,
        profile: result.profile
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile picture';
      const statusCode = message.includes('Rate limit') ? 429 : 400;
      return res.status(statusCode).json({ success: false, error: message });
    }
  };

  const handleProfileAvatarRemove = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({ success: false, error: 'Session is expired or revoked. Please log in again.' });
        }
      }

      if (currentUser.role !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Profile picture management is only available for CLIENT accounts.'
        });
      }

      // Explicit Mass-Assignment & Privilege Escalation Defense:
      const combinedPayload = { ...req.query, ...req.body };
      const forbiddenFields = [
        'role', 'isAdmin', 'isSuperAdmin', 'superAdmin', 'isStaff',
        'permissions', 'privileges', 'accountStatus', 'securityFlags',
        'tier', 'emailVerified', 'emailVerifiedAt', 'passwordHash', 'password'
      ];

      for (const field of forbiddenFields) {
        if (combinedPayload[field] !== undefined) {
          securityMonitoringService.recordPrivilegeEscalationAttempt(
            String(combinedPayload[field]),
            currentUser.email,
            clientIp,
            userAgent,
            `Privilege escalation attempt on avatar remove via field: ${field}`
          );
          return res.status(403).json({
            success: false,
            error: `Privilege escalation blocked: Field "${field}" cannot be modified via profile endpoints.`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR Defense
      const targetedUserId = req.params?.id || req.body?.userId || req.body?.id || req.query?.userId || req.query?.id;
      if (targetedUserId && targetedUserId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You do not have permission to modify another user's profile picture.",
          code: 'FORBIDDEN'
        });
      }

      const result = await authService.removeProfileAvatar(currentUser.id, clientIp, userAgent);

      return res.json({
        success: true,
        message: 'Profile picture removed successfully',
        user: result.user,
        profile: result.profile
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove profile picture';
      return res.status(400).json({ success: false, error: message });
    }
  };

  // Upload/replace avatar endpoints
  app.post('/api/client/profile/avatar', authenticate, handleProfileAvatarUpload);
  app.post('/api/users/profile/avatar', authenticate, handleProfileAvatarUpload);
  app.post('/api/users/me/avatar', authenticate, handleProfileAvatarUpload);
  app.put('/api/client/profile/avatar', authenticate, handleProfileAvatarUpload);
  app.post('/api/users/:id/avatar', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileAvatarUpload(req, res);
  });

  // Remove avatar endpoints
  app.delete('/api/client/profile/avatar', authenticate, handleProfileAvatarRemove);
  app.delete('/api/users/profile/avatar', authenticate, handleProfileAvatarRemove);
  app.delete('/api/users/me/avatar', authenticate, handleProfileAvatarRemove);
  app.delete('/api/users/:id/avatar', authenticate, (req: AuthenticatedRequest, res) => {
    handleProfileAvatarRemove(req, res);
  });

  // Secure Media Serving Route
  app.get('/api/media/avatar/:filename', (req, res) => {
    const filename = req.params.filename;
    const resolvedPath = storageService.resolveAvatarPath(filename);

    if (!resolvedPath) {
      return res.status(404).json({ success: false, error: 'Avatar not found or invalid filename' });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    res.sendFile(resolvedPath);
  });

  // ==========================================
  // 2.4. CLIENT CONTACT INFORMATION (Epic 2 Feature 2.1 Task 2.1.4)
  // ==========================================
  const handleGetContactInfo = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({ success: false, error: 'Session is expired or revoked. Please log in again.' });
        }
      }

      if (currentUser.role !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Personal contact information is only available for CLIENT accounts.'
        });
      }

      const contact = await authService.getContactInfo(currentUser.id);
      res.json({
        success: true,
        contact
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve contact information';
      res.status(400).json({ success: false, error: message });
    }
  };

  const handleUpdateContactInfo = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({ success: false, error: 'Session is expired or revoked. Please log in again.' });
        }
      }

      if (currentUser.role !== 'CLIENT') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Personal contact information management is only available for CLIENT accounts.'
        });
      }

      // Explicit Mass-Assignment & Privilege Escalation Defense
      const combinedPayload = { ...req.query, ...req.body };
      const forbiddenFields = [
        'role', 'isAdmin', 'isSuperAdmin', 'superAdmin', 'isStaff',
        'permissions', 'privileges', 'accountStatus', 'securityFlags',
        'tier', 'emailVerified', 'emailVerifiedAt', 'passwordHash', 'password',
        'id', 'userId', 'status', 'twoFactorEnabled', 'twoFactorSecret'
      ];

      for (const field of forbiddenFields) {
        if (combinedPayload[field] !== undefined) {
          securityMonitoringService.recordPrivilegeEscalationAttempt(
            String(combinedPayload[field]),
            currentUser.email,
            clientIp,
            userAgent,
            `Privilege escalation attempt on contact info update via field: ${field}`
          );
          return res.status(403).json({
            success: false,
            error: `Privilege escalation blocked: Field "${field}" cannot be modified via contact info endpoints.`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // Reject attempting to modify primary login email (user.email) via contact info
      if (req.body.email !== undefined && String(req.body.email).toLowerCase().trim() !== currentUser.email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          error: 'Primary account authentication email is immutable via contact endpoints.',
          code: 'EMAIL_IMMUTABLE'
        });
      }

      // Schema Validation
      const validation = ContactInfoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      const result = await authService.updateContactInfo(
        currentUser.id,
        {
          phone: validation.data.phone,
          contactEmail: validation.data.contactEmail
        },
        clientIp,
        userAgent
      );

      res.json({
        success: true,
        contact: result.contact,
        user: result.user,
        profile: result.profile
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update contact information';
      const isForbidden = message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('unauthorized');
      res.status(isForbidden ? 403 : 400).json({
        success: false,
        error: message
      });
    }
  };

  // Contact Info Endpoints (Epic 2 Task 2.1.4)
  app.get('/api/client/profile/contact', authenticate, handleGetContactInfo);
  app.put('/api/client/profile/contact', authenticate, handleUpdateContactInfo);
  app.patch('/api/client/profile/contact', authenticate, handleUpdateContactInfo);
  app.get('/api/users/profile/contact', authenticate, handleGetContactInfo);
  app.put('/api/users/profile/contact', authenticate, handleUpdateContactInfo);
  app.patch('/api/users/profile/contact', authenticate, handleUpdateContactInfo);

  // ==========================================
  // 3. CATEGORIES & TAXONOMY
  // ==========================================
  app.get('/api/categories', (req, res) => {
    res.json({ success: true, categories: db.categories });
  });

  app.post('/api/admin/categories', authenticate, requireSuperAdmin, (req, res) => {
    const { id, name, slug, iconName, description, subcategories, bannerImage } = req.body;
    const existingIndex = db.categories.findIndex(c => c.id === id || c.slug === slug);
    const categoryData = {
      id: id || slug,
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      iconName: iconName || 'Folder',
      description: description || '',
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'
    };

    if (existingIndex >= 0) {
      db.categories[existingIndex] = categoryData;
    } else {
      db.categories.push(categoryData);
    }

    auditService.log('CATEGORY_MODIFIED', 'admin', 'admin', 'super_admin', { category: categoryData });
    res.json({ success: true, category: categoryData, categories: db.categories });
  });

  // ==========================================
  // 4. BUSINESSES & PROFILES
  // ==========================================
  app.get('/api/businesses', (req, res) => {
    const { category, search, city, verifiedOnly, featuredOnly, tier } = req.query;
    let list = Array.from(db.businesses.values());

    if (category && category !== 'all') {
      list = list.filter(b => b.category === category || b.subcategories.includes(String(category)));
    }
    if (city && city !== 'all') {
      list = list.filter(b => b.location.city.toLowerCase() === String(city).toLowerCase());
    }
    if (verifiedOnly === 'true') {
      list = list.filter(b => b.isVerified);
    }
    if (featuredOnly === 'true') {
      list = list.filter(b => b.featured);
    }
    if (tier) {
      list = list.filter(b => b.tier === tier);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.subcategories.some(sc => sc.toLowerCase().includes(q))
      );
    }

    // Rank verified and enterprise/pro higher
    list.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });

    res.json({ success: true, businesses: list, total: list.length });
  });

  app.get('/api/businesses/:idOrSlug', (req, res) => {
    const { idOrSlug } = req.params;
    let business = db.businesses.get(idOrSlug);
    if (!business) {
      business = Array.from(db.businesses.values()).find(b => b.slug === idOrSlug);
    }

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    // Attach related entities
    const products = Array.from(db.products.values()).filter(p => p.businessId === business!.id);
    const services = Array.from(db.services.values()).filter(s => s.businessId === business!.id);
    const portfolio = Array.from(db.portfolioItems.values()).filter(pf => pf.businessId === business!.id);
    const ads = Array.from(db.advertisements.values()).filter(ad => ad.businessId === business!.id && ad.status === 'active');
    const reviews = Array.from(db.reviews.values()).filter(r => r.businessId === business!.id);

    // Increment profile views
    business.stats.views += 1;

    res.json({
      success: true,
      business,
      products,
      services,
      portfolio,
      ads,
      reviews
    });
  });

  /**
   * Epic 2 Feature 2.2 Task 2.2.1: Business Creation Handler
   * - Authentication mandatory (enforced via authenticate middleware)
   * - Owner derived strictly from authenticated session (never trust client ownerId/userId)
   * - Whitelist ONLY writable field: "name"
   * - Mass assignment protection: explicitly reject protected/system fields with 403 Forbidden
   * - Validates business name (length, characters, non-empty, trimmed)
   * - Derives safe slug
   * - Atomically persists in DatabaseStore and links to authenticated user (user.businessId, clientType='business')
   * - Emits audit log
   * - Returns safe response without sensitive internals
   */
  const handleBusinessCreate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to create a business profile.',
          code: 'UNAUTHORIZED'
        });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      const result = await businessService.createBusiness(
        currentUser.id,
        req.body || {},
        clientIp,
        userAgent
      );

      return res.status(201).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to create business';
      return res.status(400).json({
        success: false,
        error: message
      });
    }
  };

  // Business Creation Endpoints (Epic 2 Feature 2.2 Task 2.2.1)
  app.post('/api/businesses', authenticate, handleBusinessCreate);
  app.post('/api/businesses/create', authenticate, handleBusinessCreate);

  // Business Logo Management Handlers (Epic 2 Feature 2.2 Task 2.2.2)
  const handleBusinessLogoUpload = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: `Attempted mass assignment on logo upload via field: ${field}`,
              field
            }
          });
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR / Spoofing defense in payload
      if (combinedPayload.ownerId !== undefined && combinedPayload.ownerId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof ownerId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }
      if (combinedPayload.userId !== undefined && combinedPayload.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof userId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      // Extract image data
      let imageBuffer: Buffer | null = null;
      let originalFilename = req.body?.filename || 'logo.jpg';

      if (req.body?.image && typeof req.body.image === 'string') {
        let rawStr = req.body.image.trim();
        if (rawStr.startsWith('data:')) {
          const commaIdx = rawStr.indexOf(',');
          if (commaIdx !== -1) {
            rawStr = rawStr.substring(commaIdx + 1);
          }
        }
        try {
          imageBuffer = Buffer.from(rawStr, 'base64');
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid base64 image data' });
        }
      } else if (Buffer.isBuffer(req.body)) {
        imageBuffer = req.body;
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'No image file provided or file is empty' });
      }

      // Pre-check size limit: 5MB
      if (imageBuffer.length > storageService.MAX_AVATAR_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `File size (${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB maximum limit.`,
          code: 'FILE_TOO_LARGE'
        });
      }

      const result = await businessService.uploadBusinessLogo(
        currentUser.id,
        businessId,
        { buffer: imageBuffer, originalFilename },
        clientIp,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Business logo updated successfully',
        logoUrl: result.logoUrl,
        logoKey: result.logoKey,
        business: result.business
      });
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to upload business logo';
      return res.status(400).json({ success: false, error: message });
    }
  };

  const handleBusinessLogoRemove = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      const result = await businessService.removeBusinessLogo(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Business logo removed successfully',
        business: result.business
      });
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business logo';
      return res.status(400).json({ success: false, error: message });
    }
  };

  // Business Logo Endpoints (Epic 2 Feature 2.2 Task 2.2.2)
  app.post('/api/businesses/:id/logo', authenticate, handleBusinessLogoUpload);
  app.put('/api/businesses/:id/logo', authenticate, handleBusinessLogoUpload);
  app.delete('/api/businesses/:id/logo', authenticate, handleBusinessLogoRemove);

  // Secure Business Logo Media Serving Route
  app.get('/api/media/logo/:filename', (req, res) => {
    const filename = req.params.filename;
    const resolvedPath = storageService.resolveBusinessLogoPath(filename);

    if (!resolvedPath) {
      return res.status(404).json({ success: false, error: 'Logo not found or invalid filename' });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    res.sendFile(resolvedPath);
  });

  // Business Cover Image Management Handlers (Epic 2 Feature 2.2 Task 2.2.3)
  const handleBusinessCoverUpload = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: `Attempted mass assignment on cover upload via field: ${field}`,
              field
            }
          });
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR / Spoofing defense in payload
      if (combinedPayload.ownerId !== undefined && combinedPayload.ownerId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof ownerId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }
      if (combinedPayload.userId !== undefined && combinedPayload.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof userId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      // Extract image data
      let imageBuffer: Buffer | null = null;
      let originalFilename = req.body?.filename || 'cover.jpg';

      if (req.body?.image && typeof req.body.image === 'string') {
        let rawStr = req.body.image.trim();
        if (rawStr.startsWith('data:')) {
          const commaIdx = rawStr.indexOf(',');
          if (commaIdx !== -1) {
            rawStr = rawStr.substring(commaIdx + 1);
          }
        }
        try {
          imageBuffer = Buffer.from(rawStr, 'base64');
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid base64 image data' });
        }
      } else if (Buffer.isBuffer(req.body)) {
        imageBuffer = req.body;
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'No image file provided or file is empty' });
      }

      // Pre-check size limit: 5MB
      if (imageBuffer.length > storageService.MAX_AVATAR_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `File size (${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB maximum limit.`,
          code: 'FILE_TOO_LARGE'
        });
      }

      const result = await businessService.uploadBusinessCover(
        currentUser.id,
        businessId,
        { buffer: imageBuffer, originalFilename },
        clientIp,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Business cover image updated successfully',
        coverUrl: result.coverUrl,
        coverKey: result.coverKey,
        business: result.business
      });
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to upload business cover image';
      return res.status(400).json({ success: false, error: message });
    }
  };

  const handleBusinessCoverRemove = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      const result = await businessService.removeBusinessCover(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Business cover image removed successfully',
        business: result.business
      });
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business cover image';
      return res.status(400).json({ success: false, error: message });
    }
  };

  // Business Cover Image Endpoints (Epic 2 Feature 2.2 Task 2.2.3)
  app.post('/api/businesses/:id/cover', authenticate, handleBusinessCoverUpload);
  app.put('/api/businesses/:id/cover', authenticate, handleBusinessCoverUpload);
  app.delete('/api/businesses/:id/cover', authenticate, handleBusinessCoverRemove);

  // Secure Business Cover Image Media Serving Route
  app.get('/api/media/cover/:filename', (req, res) => {
    const filename = req.params.filename;
    const resolvedPath = storageService.resolveBusinessCoverPath(filename);

    if (!resolvedPath) {
      return res.status(404).json({ success: false, error: 'Cover image not found or invalid filename' });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    res.sendFile(resolvedPath);
  });

  // Business Description Management Handler (Epic 2 Feature 2.2 Task 2.2.4)
  const handleBusinessDescriptionUpdate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check session validity & revocation
      if (req.sessionId) {
        const session = db.sessions.get(req.sessionId);
        if (!session || session.isRevoked || new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired or has been revoked. Please log in again.',
            code: 'SESSION_REVOKED'
          });
        }
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'browser';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: `Attempted mass assignment on description update via field: ${field}`,
              field
            }
          });
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR / Spoofing defense in payload
      if (combinedPayload.ownerId !== undefined && combinedPayload.ownerId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof ownerId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }
      if (combinedPayload.userId !== undefined && combinedPayload.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof userId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      const description = req.body?.description;

      const result = await businessService.updateBusinessDescription(
        currentUser.id,
        businessId,
        description,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update business description';
      return res.status(400).json({ success: false, error: message });
    }
  };

  app.put('/api/businesses/:id/description', authenticate, handleBusinessDescriptionUpdate);
  app.patch('/api/businesses/:id/description', authenticate, handleBusinessDescriptionUpdate);

  // ==========================================
  // Epic 2 Feature 2.2 Task 2.2.5: Business Categories
  // ==========================================
  app.get('/api/businesses/:id/categories', async (req: express.Request, res: express.Response) => {
    try {
      const businessId = req.params.id;
      const business = db.getBusinessById(businessId);
      if (!business) {
        return res.status(404).json({ success: false, error: 'Business not found', code: 'BUSINESS_NOT_FOUND' });
      }

      const bcs = db.getBusinessCategories(businessId);
      const configs = db.getBusinessCategoryConfigs(businessId);
      const categoryIds = (business.categories && business.categories.length > 0)
        ? business.categories
        : bcs.map(bc => bc.categoryId);

      return res.json({
        success: true,
        businessId,
        categories: configs,
        categoryIds,
        businessCategories: bcs
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve categories';
      return res.status(500).json({ success: false, error: message });
    }
  });

  const handleBusinessCategoriesUpdate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Mass-assignment / privilege escalation defense
      const combinedPayload = { ...req.query, ...req.body };
      for (const field of PROTECTED_BUSINESS_FIELDS) {
        if (combinedPayload[field] !== undefined) {
          authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
            userId: currentUser.id,
            userEmail: currentUser.email,
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: `Attempted mass assignment on categories update via field: ${field}`,
              field
            }
          });
          return res.status(403).json({
            success: false,
            error: `Unauthorized attempt to set protected field: "${field}".`,
            code: 'PRIVILEGE_ESCALATION_BLOCKED'
          });
        }
      }

      // IDOR / Spoofing defense in payload
      if (combinedPayload.ownerId !== undefined && combinedPayload.ownerId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof ownerId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }
      if (combinedPayload.userId !== undefined && combinedPayload.userId !== currentUser.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot specify or spoof userId.',
          code: 'FORBIDDEN_OWNER_OVERRIDE'
        });
      }

      const businessId = req.params.id || req.body?.businessId;
      if (!businessId) {
        return res.status(400).json({ success: false, error: 'Business ID is required', code: 'MISSING_BUSINESS_ID' });
      }

      const result = await businessService.updateBusinessCategories(
        currentUser.id,
        businessId,
        req.body,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update business categories';
      return res.status(400).json({ success: false, error: message });
    }
  };

  app.put('/api/businesses/:id/categories', authenticate, handleBusinessCategoriesUpdate);
  app.patch('/api/businesses/:id/categories', authenticate, handleBusinessCategoriesUpdate);
  app.post('/api/businesses/:id/categories', authenticate, handleBusinessCategoriesUpdate);

  app.delete('/api/businesses/:id/categories/:categoryId', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;
      const categoryId = req.params.categoryId;

      const result = await businessService.removeBusinessCategory(
        currentUser.id,
        businessId,
        categoryId,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business category';
      return res.status(400).json({ success: false, error: message });
    }
  });

  app.delete('/api/businesses/:id/categories', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.clearBusinessCategories(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to clear business categories';
      return res.status(400).json({ success: false, error: message });
    }
  });

  // ==========================================
  // Epic 2 Feature 2.2 Task 2.2.6: Business Location
  // ==========================================
  app.get('/api/businesses/:id/location', async (req: express.Request, res: express.Response) => {
    try {
      const businessId = req.params.id;
      const business = db.getBusinessById(businessId);
      if (!business) {
        return res.status(404).json({ success: false, error: 'Business not found', code: 'BUSINESS_NOT_FOUND' });
      }
      return res.status(200).json({
        success: true,
        businessId: business.id,
        location: business.location || null
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch business location';
      return res.status(400).json({ success: false, error: message });
    }
  });

  const handleBusinessLocationUpdate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.updateBusinessLocation(
        currentUser.id,
        businessId,
        req.body,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update business location';
      return res.status(400).json({ success: false, error: message });
    }
  };

  app.put('/api/businesses/:id/location', authenticate, handleBusinessLocationUpdate);
  app.patch('/api/businesses/:id/location', authenticate, handleBusinessLocationUpdate);
  app.post('/api/businesses/:id/location', authenticate, handleBusinessLocationUpdate);

  app.delete('/api/businesses/:id/location', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.clearBusinessLocation(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business location';
      return res.status(400).json({ success: false, error: message });
    }
  });

  // ==========================================
  // Epic 2 Feature 2.2 Task 2.2.7: Business Opening Hours
  // ==========================================
  app.get('/api/businesses/:id/opening-hours', async (req: express.Request, res: express.Response) => {
    try {
      const businessId = req.params.id;
      const result = await businessService.getBusinessOpeningHours(businessId);
      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch business opening hours';
      return res.status(400).json({ success: false, error: message });
    }
  });

  const handleBusinessOpeningHoursUpdate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.updateBusinessOpeningHours(
        currentUser.id,
        businessId,
        req.body,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update business opening hours';
      return res.status(400).json({ success: false, error: message });
    }
  };

  app.put('/api/businesses/:id/opening-hours', authenticate, handleBusinessOpeningHoursUpdate);
  app.patch('/api/businesses/:id/opening-hours', authenticate, handleBusinessOpeningHoursUpdate);
  app.post('/api/businesses/:id/opening-hours', authenticate, handleBusinessOpeningHoursUpdate);

  app.delete('/api/businesses/:id/opening-hours', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.clearBusinessOpeningHours(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business opening hours';
      return res.status(400).json({ success: false, error: message });
    }
  });

  // ==========================================
  // Epic 2 Feature 2.2 Task 2.2.8: Business Contact Information
  // ==========================================
  app.get('/api/businesses/:id/contact', async (req: express.Request, res: express.Response) => {
    try {
      const businessId = req.params.id;
      const result = await businessService.getBusinessContactInfo(businessId);
      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code
        });
      }
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
  });

  const handleBusinessContactUpdate = async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.updateBusinessContactInfo(
        currentUser.id,
        businessId,
        req.body,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to update business contact information';
      return res.status(400).json({ success: false, error: message });
    }
  };

  app.put('/api/businesses/:id/contact', authenticate, handleBusinessContactUpdate);
  app.patch('/api/businesses/:id/contact', authenticate, handleBusinessContactUpdate);
  app.post('/api/businesses/:id/contact', authenticate, handleBusinessContactUpdate);

  app.delete('/api/businesses/:id/contact', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const businessId = req.params.id;

      const result = await businessService.clearBusinessContactInfo(
        currentUser.id,
        businessId,
        clientIp,
        userAgent
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BusinessServiceError) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          code: err.code,
          details: err.details
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to remove business contact information';
      return res.status(400).json({ success: false, error: message });
    }
  });

  // Authenticated user's business retrieval
  app.get('/api/businesses/me', authenticate, (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const myBusiness = db.getBusinessByOwnerId(currentUser.id) || null;
      const myBusinesses = db.getBusinessesByOwnerId(currentUser.id);
      return res.json({
        success: true,
        business: myBusiness,
        businesses: myBusinesses
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch business';
      return res.status(400).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 5. ADVERTISEMENTS & BOOST ENGINE
  // ==========================================
  app.get('/api/ads', (req, res) => {
    const { category, search, city, status, boostedOnly, businessId } = req.query;
    let list = Array.from(db.advertisements.values());

    if (status) {
      list = list.filter(ad => ad.status === status);
    } else {
      // Default to active
      list = list.filter(ad => ad.status === 'active');
    }

    if (businessId) {
      list = list.filter(ad => ad.businessId === businessId);
    }
    if (category && category !== 'all') {
      list = list.filter(ad => ad.businessCategory === category || ad.category.toLowerCase().includes(String(category).toLowerCase()));
    }
    if (city && city !== 'all') {
      list = list.filter(ad => ad.location.city.toLowerCase() === String(city).toLowerCase());
    }
    if (boostedOnly === 'true') {
      list = list.filter(ad => ad.isBoosted);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(ad => 
        ad.title.toLowerCase().includes(q) ||
        ad.description.toLowerCase().includes(q) ||
        ad.businessName.toLowerCase().includes(q) ||
        ad.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Boosted ads on top
    list.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ success: true, ads: list, total: list.length });
  });

  app.get('/api/ads/:id', (req, res) => {
    const ad = db.advertisements.get(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Advertisement not found' });
    }
    ad.viewsCount += 1;
    res.json({ success: true, ad });
  });

  app.post('/api/ads/create', (req, res) => {
    try {
      const {
        businessId,
        title,
        description,
        mediaUrls,
        mediaType,
        category,
        subcategory,
        price,
        currency,
        location,
        tags,
        contactPhone,
        contactWhatsApp,
        targetRadiusKm,
        isDraft
      } = req.body;

      if (!title || !description || !businessId) {
        return res.status(400).json({ success: false, error: 'Title, Description, and Business are required' });
      }

      const biz = db.businesses.get(businessId) || Array.from(db.businesses.values())[0];
      const id = `ad_${Date.now()}`;

      const newAd: Advertisement = {
        id,
        businessId: biz.id,
        businessName: biz.name,
        businessLogo: biz.logoUrl,
        businessCategory: biz.category,
        title,
        description,
        mediaUrls: Array.isArray(mediaUrls) && mediaUrls.length > 0 ? mediaUrls : ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'],
        mediaType: mediaType || 'image',
        category: category || biz.categoryLabel,
        subcategory,
        price: Number(price) || undefined,
        currency: currency || 'NGN',
        location: location || biz.location,
        tags: Array.isArray(tags) ? tags : ['BoostMarket', 'Business'],
        targetRadiusKm: targetRadiusKm || 50,
        status: isDraft ? 'draft' : 'active',
        isBoosted: false,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        viewsCount: 0,
        clicksCount: 0,
        enquiriesCount: 0,
        contactPhone: contactPhone || biz.phone,
        contactWhatsApp: contactWhatsApp || biz.whatsapp,
        createdAt: new Date().toISOString()
      };

      db.advertisements.set(id, newAd);
      auditService.log('AD_CREATED', id, biz.id, 'merchant', { title, businessName: biz.name });
      res.json({ success: true, ad: newAd });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/ads/:id/boost', (req, res) => {
    const { id } = req.params;
    const { type, durationDays, budgetNGN } = req.body;
    const ad = db.advertisements.get(id);

    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }

    const duration = Number(durationDays) || 7;
    const budget = Number(budgetNGN) || 15000;

    ad.isBoosted = true;
    ad.boostPlan = {
      type: type || 'featured',
      durationDays: duration,
      budgetNGN: budget,
      expiresAt: new Date(Date.now() + duration * 86400000).toISOString()
    };

    // Create Push Notification
    const notif: PushNotification = {
      id: `notif_${Date.now()}`,
      userId: ad.businessId,
      title: 'Campaign Boost Activated 🚀',
      message: `Your advertisement "${ad.title.slice(0, 35)}..." has been upgraded with ${type} placement for ${duration} days.`,
      type: 'ad_status',
      read: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.set(notif.id, notif);

    auditService.log('AD_BOOSTED', id, ad.businessId, 'merchant', { boostPlan: ad.boostPlan });
    res.json({ success: true, ad, message: 'Advertisement successfully boosted!' });
  });

  app.post('/api/ads/:id/click', (req, res) => {
    const ad = db.advertisements.get(req.params.id);
    if (ad) {
      ad.clicksCount += 1;
      const biz = db.businesses.get(ad.businessId);
      if (biz) biz.stats.leads += 1;
    }
    res.json({ success: true });
  });

  // ==========================================
  // 6. PRODUCTS, SERVICES & PORTFOLIO
  // ==========================================
  app.get('/api/products', (req, res) => {
    const { businessId } = req.query;
    let list = Array.from(db.products.values());
    if (businessId) list = list.filter(p => p.businessId === businessId);
    res.json({ success: true, products: list });
  });

  app.post('/api/products/create', (req, res) => {
    const { businessId, name, description, price, currency, imageUrls, category, inStock, sku } = req.body;
    const id = `prod_${Date.now()}`;
    const newProd: Product = {
      id,
      businessId,
      name,
      description: description || '',
      price: Number(price) || 0,
      currency: currency || 'NGN',
      imageUrls: Array.isArray(imageUrls) ? imageUrls : ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'],
      category: category || 'General',
      inStock: inStock !== undefined ? inStock : true,
      sku,
      createdAt: new Date().toISOString()
    };
    db.products.set(id, newProd);
    res.json({ success: true, product: newProd });
  });

  app.get('/api/services', (req, res) => {
    const { businessId } = req.query;
    let list = Array.from(db.services.values());
    if (businessId) list = list.filter(s => s.businessId === businessId);
    res.json({ success: true, services: list });
  });

  app.post('/api/services/create', (req, res) => {
    const { businessId, name, description, startingPrice, currency, durationUnit, imageUrls, category, deliveryMode } = req.body;
    const id = `serv_${Date.now()}`;
    const newServ: Service = {
      id,
      businessId,
      name,
      description: description || '',
      startingPrice: Number(startingPrice) || 0,
      currency: currency || 'NGN',
      durationUnit: durationUnit || 'per project',
      imageUrls: Array.isArray(imageUrls) ? imageUrls : ['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80'],
      category: category || 'Services',
      deliveryMode: deliveryMode || 'remote',
      createdAt: new Date().toISOString()
    };
    db.services.set(id, newServ);
    res.json({ success: true, service: newServ });
  });

  app.get('/api/portfolio', (req, res) => {
    const { businessId } = req.query;
    let list = Array.from(db.portfolioItems.values());
    if (businessId) list = list.filter(pf => pf.businessId === businessId);
    res.json({ success: true, portfolio: list });
  });

  app.post('/api/portfolio/create', (req, res) => {
    const { 
      businessId, 
      title, 
      description, 
      category, 
      mediaUrl, 
      secondaryMediaUrl,
      mediaType, 
      isBeforeAfter,
      beforeLabel,
      afterLabel,
      clientName, 
      dateCompleted, 
      tags,
      featured,
      aspectRatio
    } = req.body;
    const id = `pf_${Date.now()}`;
    const newPf: PortfolioItem = {
      id,
      businessId,
      title,
      description,
      category: category || 'General Showcase',
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1546804784-896d0d517245?w=800&auto=format&fit=crop&q=80',
      secondaryMediaUrl,
      mediaType: mediaType || 'image',
      isBeforeAfter: !!isBeforeAfter,
      beforeLabel: beforeLabel || 'Before',
      afterLabel: afterLabel || 'After',
      clientName,
      dateCompleted: dateCompleted || new Date().toISOString().split('T')[0],
      tags: Array.isArray(tags) ? tags : ['BoostMarket'],
      featured: !!featured,
      aspectRatio: aspectRatio || 'landscape'
    };
    db.portfolioItems.set(id, newPf);
    res.json({ success: true, portfolioItem: newPf });
  });

  // ==========================================
  // 6.1 MULTI-PLATFORM ADVERTISING CAMPAIGNS
  // ==========================================
  app.get('/api/campaigns', (req, res) => {
    const { businessId } = req.query;
    let list = Array.from(db.campaigns.values());
    if (businessId) list = list.filter(c => c.businessId === businessId);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, campaigns: list, count: list.length });
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = db.campaigns.get(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, campaign });
  });

  app.post('/api/campaigns/smart-allocation', (req, res) => {
    try {
      const { totalBudgetNGN, objective, platforms } = req.body;
      const result = advertisingCampaignService.calculateSmartAllocation(
        Number(totalBudgetNGN) || 50000,
        objective || 'more_leads',
        Array.isArray(platforms) ? platforms : ['facebook', 'instagram', 'google']
      );
      res.json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/campaigns/create', (req, res) => {
    try {
      const campaign = advertisingCampaignService.createCampaign(req.body);
      res.json({ success: true, campaign, message: 'Multi-platform advertising campaign launched!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.patch('/api/campaigns/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const campaign = advertisingCampaignService.updateCampaignStatus(req.params.id, status);
      res.json({ success: true, campaign, message: `Campaign status updated to ${status}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.get('/api/campaigns/analytics/:businessId', (req, res) => {
    try {
      const analytics = advertisingCampaignService.getCrossPlatformAnalytics(req.params.businessId);
      res.json({ success: true, analytics });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 6.2 LEADS & LIGHTWEIGHT CRM
  // ==========================================
  app.get('/api/leads', (req, res) => {
    const { businessId } = req.query;
    let list = Array.from(db.leads.values());
    if (businessId) list = list.filter(l => l.businessId === businessId);
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ success: true, leads: list, total: list.length });
  });

  app.post('/api/leads/create', (req, res) => {
    try {
      const lead = leadService.captureLead(req.body);
      res.json({ success: true, lead, message: 'Lead captured successfully!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.patch('/api/leads/:id/status', (req, res) => {
    try {
      const { status, notes } = req.body;
      const lead = leadService.updateLeadStatus(req.params.id, status, notes);
      res.json({ success: true, lead, message: 'Lead pipeline stage updated' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/leads/:id/link-invoice', (req, res) => {
    try {
      const { invoiceId } = req.body;
      const lead = leadService.linkInvoice(req.params.id, invoiceId);
      res.json({ success: true, lead, message: 'Invoice linked to lead' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 7. REAL-TIME MESSAGING & CRM
  // ==========================================
  app.get('/api/conversations', (req, res) => {
    const { userId } = req.query;
    let list = Array.from(db.conversations.values());
    if (userId) {
      list = list.filter(c => c.participants.includes(String(userId)));
    }
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ success: true, conversations: list });
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const { id } = req.params;
    const messages = Array.from(db.messages.values())
      .filter(m => m.conversationId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json({ success: true, messages });
  });

  app.post('/api/conversations/send', (req, res) => {
    try {
      const {
        conversationId,
        senderId,
        senderName,
        senderAvatar,
        text,
        attachments,
        productRef,
        serviceRef,
        adRef,
        invoiceRef,
        paymentLink
      } = req.body;

      if (!conversationId || !senderId || (!text && !invoiceRef && !paymentLink)) {
        return res.status(400).json({ success: false, error: 'Conversation ID, sender, and content are required' });
      }

      let conv = db.conversations.get(conversationId);
      if (!conv) {
        conv = {
          id: conversationId,
          participants: [senderId],
          participantDetails: [
            { id: senderId, name: senderName || 'User', avatar: senderAvatar || '', role: 'customer' }
          ],
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        };
        db.conversations.set(conversationId, conv);
      }

      const msgId = `msg_${Date.now()}`;
      const newMsg: ChatMessage = {
        id: msgId,
        conversationId,
        senderId,
        senderName: senderName || 'User',
        senderAvatar,
        text: text || '',
        attachments,
        productRef,
        serviceRef,
        adRef,
        invoiceRef,
        paymentLink,
        deliveryStatus: 'delivered',
        createdAt: new Date().toISOString()
      };

      db.messages.set(msgId, newMsg);
      conv.lastMessage = newMsg;
      conv.updatedAt = new Date().toISOString();

      // Trigger push notification to other participant
      const recipientId = conv.participants.find(p => p !== senderId);
      if (recipientId) {
        const notif: PushNotification = {
          id: `notif_${Date.now()}`,
          userId: recipientId,
          title: `New Message from ${senderName || 'Contact'}`,
          message: text ? text.slice(0, 60) : 'Sent you an attachment/invoice',
          type: invoiceRef ? 'invoice' : 'message',
          read: false,
          link: `/messages?conv=${conversationId}`,
          createdAt: new Date().toISOString()
        };
        db.notifications.set(notif.id, notif);
      }

      res.json({ success: true, message: newMsg, conversation: conv });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/conversations/create', (req, res) => {
    const { customerId, businessId, initialMessage, adId } = req.body;
    const cust = db.users.get(customerId) || Array.from(db.users.values()).find(u => u.clientType === 'customer') || {
      id: customerId || 'usr_cust',
      name: 'Customer',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      role: 'CLIENT' as const,
      status: 'ACTIVE' as const,
      clientType: 'customer' as const,
      tier: 'free' as const,
      createdAt: new Date().toISOString()
    };

    const biz = db.businesses.get(businessId) || Array.from(db.businesses.values())[0];
    const convId = `conv_${cust.id}_${biz.id}`;

    let conv = db.conversations.get(convId);
    if (!conv) {
      conv = {
        id: convId,
        participants: [cust.id, biz.ownerId],
        participantDetails: [
          { id: cust.id, name: cust.name, avatar: cust.avatarUrl || '', role: 'customer' },
          { id: biz.ownerId, name: biz.name, avatar: biz.logoUrl, role: 'business', businessName: biz.name, online: true }
        ],
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      };
      db.conversations.set(convId, conv);
    }

    if (initialMessage) {
      const msgId = `msg_${Date.now()}`;
      const msg: ChatMessage = {
        id: msgId,
        conversationId: convId,
        senderId: cust.id,
        senderName: cust.name,
        senderAvatar: cust.avatarUrl,
        text: initialMessage,
        deliveryStatus: 'delivered',
        createdAt: new Date().toISOString()
      };
      if (adId && db.advertisements.has(adId)) {
        msg.adRef = db.advertisements.get(adId);
      }
      db.messages.set(msgId, msg);
      conv.lastMessage = msg;
    }

    res.json({ success: true, conversation: conv });
  });

  // ==========================================
  // 8. INVOICING & PAYMENT CHECKOUT
  // ==========================================
  app.get('/api/invoices', (req, res) => {
    const { businessId, customerId } = req.query;
    let list = Array.from(db.invoices.values());
    if (businessId) list = list.filter(i => i.businessId === businessId);
    if (customerId) list = list.filter(i => i.customerId === customerId);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, invoices: list });
  });

  app.get('/api/invoices/:id', (req, res) => {
    const invoice = db.invoices.get(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  });

  app.post('/api/invoices/create', (req, res) => {
    try {
      const {
        businessId,
        customerId,
        customerName,
        customerEmail,
        description,
        items,
        taxPercent,
        discountAmount,
        currency,
        dueDate
      } = req.body;

      const biz = db.businesses.get(businessId) || Array.from(db.businesses.values())[0];
      const parsedItems = Array.isArray(items) && items.length > 0 ? items : [
        { id: '1', description: description || 'Professional Service', quantity: 1, unitPrice: 50000, amount: 50000 }
      ];

      const subtotal = parsedItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unitPrice)), 0);
      const taxRate = Number(taxPercent) || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      const discount = Number(discountAmount) || 0;
      const total = Math.max(0, subtotal + taxAmount - discount);

      const id = `inv_${Date.now()}`;
      const invNum = `BM-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newInv: Invoice = {
        id,
        invoiceNumber: invNum,
        businessId: biz.id,
        businessName: biz.name,
        businessLogo: biz.logoUrl,
        customerId: customerId || 'usr_customer_gen',
        customerName: customerName || 'Customer',
        customerEmail: customerEmail || 'customer@gmail.com',
        description: description || `Invoice from ${biz.name}`,
        items: parsedItems.map((it, idx) => ({
          id: it.id || `item_${idx + 1}`,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          amount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
        })),
        subtotal,
        taxPercent: taxRate,
        taxAmount,
        discountAmount: discount,
        total,
        currency: currency || 'NGN',
        dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'sent',
        createdAt: new Date().toISOString()
      };

      db.invoices.set(id, newInv);

      // Notification
      const notif: PushNotification = {
        id: `notif_${Date.now()}`,
        userId: customerId || 'usr_david_customer',
        title: `New Invoice from ${biz.name}`,
        message: `Invoice ${invNum} for ${newInv.currency} ${newInv.total.toLocaleString()} is ready for payment.`,
        type: 'invoice',
        read: false,
        link: `/invoices/${id}`,
        createdAt: new Date().toISOString()
      };
      db.notifications.set(notif.id, notif);

      auditService.log('INVOICE_CREATED', id, biz.id, 'merchant', { invoiceNumber: invNum, total });
      res.json({ success: true, invoice: newInv });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/invoices/:id/pay', async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, customerEmail, provider } = req.body;
      const invoice = db.invoices.get(id);

      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ success: false, error: 'Invoice is already paid' });
      }

      const txRef = `BM_TX_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // Update invoice
      invoice.status = 'paid';
      invoice.paymentMethod = paymentMethod || 'Flutterwave Card';
      invoice.transactionRef = txRef;
      invoice.paidAt = new Date().toISOString();

      // Record in payments table
      const payment: Payment = {
        id: `pay_${Date.now()}`,
        invoiceId: invoice.id,
        transactionRef: txRef,
        businessId: invoice.businessId,
        customerEmail: customerEmail || invoice.customerEmail,
        customerName: invoice.customerName,
        amount: invoice.total,
        currency: invoice.currency,
        baseAmountNGN: invoice.currency === 'NGN' ? invoice.total : invoice.total * 1520,
        platformFee: invoice.total * 0.015,
        netAmountNGN: invoice.currency === 'NGN' ? invoice.total * 0.985 : invoice.total * 1520 * 0.985,
        paymentMethod: paymentMethod || 'card',
        provider: (provider as 'flutterwave' | 'paystack') || 'flutterwave',
        status: 'successful',
        description: `Payment for ${invoice.invoiceNumber} - ${invoice.description}`,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
      db.payments.set(payment.id, payment);

      // Record in double-entry ledger
      ledgerService.recordPaymentJournal(payment);

      // Update business stats
      const biz = db.businesses.get(invoice.businessId);
      if (biz) {
        biz.stats.conversions += 1;
        biz.stats.totalRevenue += invoice.total;
      }

      // Notify Business
      const notifBiz: PushNotification = {
        id: `notif_${Date.now()}_biz`,
        userId: invoice.businessId,
        title: `Payment Received (₦${invoice.total.toLocaleString()})`,
        message: `${invoice.customerName} successfully paid Invoice ${invoice.invoiceNumber}. Settled via Flutterwave.`,
        type: 'payment',
        read: false,
        createdAt: new Date().toISOString()
      };
      db.notifications.set(notifBiz.id, notifBiz);

      auditService.log('INVOICE_PAID', invoice.id, invoice.customerId, 'customer', {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        transactionRef: txRef
      });

      res.json({ success: true, invoice, payment, message: 'Payment successfully captured and verified!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 9. AI MARKETING ASSISTANT
  // ==========================================
  app.post('/api/ai/generate-marketing', async (req, res) => {
    try {
      const request: AIMarketingRequest = req.body;
      if (!request.productOrService) {
        return res.status(400).json({ success: false, error: 'Product or Service description is required' });
      }

      const generated = await aiService.generateMarketingCopy(request);
      auditService.log('AI_MARKETING_GENERATED', 'ai_assistant', request.businessName || 'user', 'merchant', {
        product: request.productOrService
      });

      res.json({ success: true, data: generated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/ai/video-concept', async (req, res) => {
    try {
      const request: AIMarketingRequest = req.body;
      if (!request.productOrService) {
        return res.status(400).json({ success: false, error: 'Product or Service description is required' });
      }

      const storyboard = await aiService.generateVideoStoryboard(request);
      auditService.log('AI_VIDEO_STORYBOARD_GENERATED', 'ai_assistant', request.businessName || 'user', 'merchant', {
        conceptTitle: storyboard.conceptTitle
      });

      res.json({ success: true, data: storyboard });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/ai/image-ad-concepts', async (req, res) => {
    try {
      const request: AIMarketingRequest = req.body;
      if (!request.productOrService) {
        return res.status(400).json({ success: false, error: 'Product or Service description is required' });
      }

      const concepts = await aiService.generateImageAdConcepts(request);
      res.json({ success: true, data: concepts });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 10. SAAS SUBSCRIPTIONS & ADMIN CONTROLS
  // ==========================================
  app.get('/api/subscriptions/plans', (req, res) => {
    res.json({ success: true, plans: db.subscriptionPlans });
  });

  app.post('/api/subscriptions/upgrade', (req, res) => {
    const { businessId, planId, billingCycle } = req.body;
    const biz = db.businesses.get(businessId);
    if (!biz) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    biz.tier = planId || 'pro';
    if (planId === 'enterprise' || planId === 'pro') {
      biz.isVerified = true;
      biz.featured = true;
    }

    const notif: PushNotification = {
      id: `notif_${Date.now()}`,
      userId: biz.ownerId,
      title: `Plan Upgraded to ${planId.toUpperCase()}`,
      message: `Your Boost Market subscription is now active with expanded ad limits and priority discovery.`,
      type: 'subscription',
      read: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.set(notif.id, notif);

    auditService.log('SUBSCRIPTION_UPGRADED', biz.id, biz.ownerId, 'merchant', { planId, billingCycle });
    res.json({ success: true, business: biz, message: `Successfully upgraded to ${planId}!` });
  });

  app.put('/api/admin/subscriptions/plans', authenticate, requireSuperAdmin, (req, res) => {
    const { plans } = req.body;
    if (Array.isArray(plans)) {
      db.subscriptionPlans = plans;
      auditService.log('SUBSCRIPTION_PLANS_CONFIGURED', 'admin', 'admin', 'super_admin', { count: plans.length });
    }
    res.json({ success: true, plans: db.subscriptionPlans });
  });

  // ==========================================
  // 11. NOTIFICATIONS, REVIEWS & REPORTS
  // ==========================================
  app.get('/api/notifications', (req, res) => {
    const { userId } = req.query;
    let list = Array.from(db.notifications.values());
    if (userId) {
      list = list.filter(n => n.userId === userId || n.userId === 'usr_maddy_ceo');
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, notifications: list });
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const notif = db.notifications.get(req.params.id);
    if (notif) notif.read = true;
    res.json({ success: true });
  });

  app.post('/api/reviews/create', (req, res) => {
    const { businessId, authorId, authorName, authorAvatar, rating, comment } = req.body;
    const biz = db.businesses.get(businessId);
    if (!biz) return res.status(404).json({ success: false, error: 'Business not found' });

    const revId = `rev_${Date.now()}`;
    const newRev: Review = {
      id: revId,
      businessId,
      authorId: authorId || 'usr_david_customer',
      authorName: authorName || 'Verified Customer',
      authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      rating: Number(rating) || 5,
      comment: comment || 'Excellent service and verified transaction on Boost Market.',
      createdAt: new Date().toISOString()
    };
    db.reviews.set(revId, newRev);

    // Recalculate business rating
    const allReviews = Array.from(db.reviews.values()).filter(r => r.businessId === businessId);
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    biz.rating = Math.round(avg * 10) / 10;
    biz.reviewCount = allReviews.length;

    res.json({ success: true, review: newRev, business: biz });
  });

  app.post('/api/reports/create', (req, res) => {
    const { targetType, targetId, targetTitle, reporterId, reporterName, reason } = req.body;
    const repId = `rep_${Date.now()}`;
    const newRep: Report = {
      id: repId,
      targetType: targetType || 'ad',
      targetId,
      targetTitle: targetTitle || 'Listing',
      reporterId: reporterId || 'usr_anonymous',
      reporterName: reporterName || 'Community Member',
      reason: reason || 'Inappropriate or misleading listing',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.reports.set(repId, newRep);
    auditService.log('CONTENT_REPORTED', repId, reporterId, 'customer', { targetType, targetId, reason });
    res.json({ success: true, report: newRep, message: 'Thank you. Content has been queued for admin review.' });
  });

  // ==========================================
  // 12. ADMIN MODERATION & AUDIT LOGS
  // ==========================================
  app.get('/api/admin/reports', authenticate, requireSuperAdmin, (req, res) => {
    const reports = Array.from(db.reports.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, reports });
  });

  app.post('/api/admin/reports/:id/resolve', authenticate, requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'hide', 'dismiss', 'suspend'
    const report = db.reports.get(id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';

    if (action === 'hide' && report.targetType === 'ad') {
      const ad = db.advertisements.get(report.targetId);
      if (ad) ad.status = 'rejected';
    }

    auditService.log('REPORT_ACTIONED', id, 'admin', 'super_admin', { action, targetId: report.targetId });
    res.json({ success: true, report });
  });

  app.get('/api/admin/audit-logs', authenticate, requireSuperAdmin, (req, res) => {
    const logs = db.auditLogs.slice(-100).reverse();
    res.json({ success: true, logs, auditLogs: logs });
  });

  // ==========================================
  // 13. FX & PAYMENTS LEDGER (NairaSettled Core)
  // ==========================================
  app.get('/api/currencies', (req, res) => {
    res.json({ success: true, currencies: db.supportedCurrencies });
  });

  app.get('/api/fx/rates', async (req, res) => {
    try {
      const rates = await fxService.getAllLiveRates();
      res.json({ success: true, rates, lastUpdated: new Date().toISOString() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/payments/quote', async (req, res) => {
    try {
      const { baseAmountNGN, customerCurrency } = req.body;
      const quote = await fxService.generateQuote(Number(baseAmountNGN) || 10000, (customerCurrency || 'USD') as SupportedCurrency);
      res.json({ success: true, quote });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/payments/create', async (req, res) => {
    try {
      const result = await paymentService.createPayment(req.body);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/merchant/ledger', (req, res) => {
    const summary = ledgerService.getLedgerSummary();
    const trialBalance = ledgerService.getTrialBalance();
    res.json({ success: true, ...summary, trialBalance });
  });

  app.get('/api/admin/config', authenticate, requireSuperAdmin, (req, res) => {
    res.json({ success: true, config: db.platformConfig });
  });

  app.put('/api/admin/config', authenticate, requireSuperAdmin, (req, res) => {
    const { primaryProvider, secondaryProvider, platformFeePercent, fxSpreadPercent, autoSettlementEnabled } = req.body;
    if (primaryProvider) db.platformConfig.primaryProvider = primaryProvider;
    if (secondaryProvider) db.platformConfig.secondaryProvider = secondaryProvider;
    if (platformFeePercent !== undefined) db.platformConfig.platformFeePercent = Number(platformFeePercent);
    if (fxSpreadPercent !== undefined) db.platformConfig.fxSpreadPercent = Number(fxSpreadPercent);
    if (autoSettlementEnabled !== undefined) db.platformConfig.autoSettlementEnabled = Boolean(autoSettlementEnabled);

    auditService.log('ADMIN_CONFIG_UPDATED', 'admin', 'admin', 'super_admin', db.platformConfig as unknown as Record<string, unknown>);
    res.json({ success: true, config: db.platformConfig });
  });

  // Automated 17-Scenario Test Runner
  app.post(['/api/tests/run', '/api/tests/run-all'], async (req, res) => {
    try {
      const startTime = Date.now();
      const rawResults = await testRunnerService.runAllTests();
      const scenarios = rawResults.map((r, idx) => ({
        id: r.scenarioId || `scenario_${idx + 1}`,
        name: r.title || `Scenario ${idx + 1}`,
        category: r.category || 'Core Integration',
        description: r.description || '',
        status: (r.status === 'passed' ? 'passed' : 'failed') as 'passed' | 'failed',
        durationMs: r.executionTimeMs || 45,
        logs: r.auditTrail || ['Executed simulation step successfully'],
        error: r.errorMessage
      }));
      const passedCount = scenarios.filter((s) => s.status === 'passed').length;
      const failedCount = scenarios.filter((s) => s.status === 'failed').length;

      res.json({
        success: true,
        summary: {
          total: scenarios.length,
          passed: passedCount,
          failed: failedCount,
          passRatePercent: Math.round((passedCount / scenarios.length) * 100)
        },
        suiteResult: {
          totalScenarios: scenarios.length,
          passedCount,
          failedCount,
          durationMs: Date.now() - startTime,
          scenarios
        },
        results: rawResults
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // ==========================================
  // 14. NEXT.JS APP ROUTER MIDDLEWARE & SSR
  // ==========================================
  const dev = process.env.NODE_ENV !== 'production';
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start periodic background token maintenance (every 15 mins)
  passwordResetTokenService.startPeriodicCleanup(15);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 BOOST MARKET PLATFORM (Real Boosters / CEO Maddy)`);
    console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
    console.log(`=================================================`);
  });
}

startServer();
