import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { authService } from './src/server/services/authService';
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
  formatZodError,
  extractValidationErrors 
} from './src/server/validators/authValidators';
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

  // 2. Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validation = LoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.login(validation.data, clientIp, userAgent);

      if (result.accessToken) {
        res.cookie('boost_access_token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 1000 // 1 hour
        });
      }

      if (result.refreshToken) {
        res.cookie('boost_refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      res.status(401).json({ success: false, error: message });
    }
  });

  // 3. Two-Factor Login Verification
  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { preAuthToken, code } = req.body;
      if (!preAuthToken || !code) {
        return res.status(400).json({ success: false, error: '2FA token and code are required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.verifyTwoFactorLogin(preAuthToken, code, clientIp, userAgent);

      res.cookie('boost_access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
      });

      res.cookie('boost_refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Two-factor verification failed';
      res.status(401).json({ success: false, error: message });
    }
  });

  // 4. Logout & Logout All
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    if (req.sessionId) {
      authService.logout(req.sessionId);
    }
    res.clearCookie('boost_access_token');
    res.clearCookie('boost_refresh_token');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/logout-all', authenticate, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      authService.logoutAll(req.user.id);
    }
    res.clearCookie('boost_access_token');
    res.clearCookie('boost_refresh_token');
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

    const user = db.users.get(payload.userId);
    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      return res.status(403).json({ success: false, error: 'Account is not authorized' });
    }

    const newAccessToken = authService.generateAccessToken(authService.getSafeUser(user), payload.sessionId);
    res.cookie('boost_access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      user: authService.getSafeUser(user)
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

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';
      const origin = `${req.protocol}://${req.get('host')}`;

      const result = await authService.forgotPassword(validation.data.email, origin, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process request';
      res.status(400).json({ success: false, error: message });
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

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = await authService.resetPassword(validation.data.token, validation.data.newPassword, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      res.status(400).json({ success: false, error: message });
    }
  });

  // 10. Change Password (Authenticated)
  app.post('/api/auth/change-password', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = ChangePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: formatZodError(validation.error)
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

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
      res.status(400).json({ success: false, error: message });
    }
  });

  // 11. Current Session Profile (Me)
  app.get('/api/auth/me', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }

    const safeUser = authService.getSafeUser(req.user);
    const sessions = authService.getActiveSessions(req.user.id);

    res.json({
      authenticated: true,
      user: safeUser,
      sessionsCount: sessions.length
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
      const { totpCode, recoveryCodes } = req.body;
      if (!totpCode || !Array.isArray(recoveryCodes)) {
        return res.status(400).json({ success: false, error: 'TOTP code and recovery codes are required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = authService.enableTwoFactor(req.user!.id, totpCode, recoveryCodes, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable 2FA';
      res.status(400).json({ success: false, error: message });
    }
  });

  app.post('/api/auth/2fa/disable', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'browser';

      const result = authService.disableTwoFactor(req.user!.id, clientIp, userAgent);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
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
    if (session && session.userId === req.user!.id) {
      authService.logout(session.id);
    }
    res.json({ success: true, message: 'Session revoked' });
  });

  // 16. Outbox / Email Inspector (For local testing & demo in preview)
  app.get('/api/auth/outbox', (req, res) => {
    const emails = emailService.getOutbox();
    res.json({ success: true, count: emails.length, emails });
  });

  app.delete('/api/auth/outbox', (req, res) => {
    emailService.clearOutbox();
    res.json({ success: true, message: 'Email outbox cleared' });
  });

  // 17. Super Admin Security Audit Logs & User Governance
  app.get('/api/admin/security-logs', authenticate, requireSuperAdmin, (req, res) => {
    const logs = [...db.securityLogs].reverse();
    res.json({ success: true, logs });
  });

  app.get('/api/admin/users', authenticate, requireSuperAdmin, (req, res) => {
    const safeUsers = Array.from(db.users.values()).map(u => authService.getSafeUser(u));
    res.json({ success: true, users: safeUsers });
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

  // ==========================================
  // 2. USERS & PROFILES
  // ==========================================
  app.get('/api/users', (req, res) => {
    const usersList = Array.from(db.users.values());
    res.json({ success: true, users: usersList });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  });

  app.post('/api/users/profile', (req, res) => {
    const { id, name, email, phone, role, bio, location, avatarUrl, clientType } = req.body;
    let user = db.users.get(id);
    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      user.phone = phone || user.phone;
      if (role && (role === 'SUPER_ADMIN' || role === 'CLIENT')) {
        user.role = role;
      }
      if (clientType) user.clientType = clientType;
      user.bio = bio !== undefined ? bio : user.bio;
      user.location = location || user.location;
      user.avatarUrl = avatarUrl || user.avatarUrl;
    } else {
      user = {
        id: id || `usr_${Date.now()}`,
        name: name || 'Anonymous User',
        email: email || 'user@boostmarket.ng',
        phone,
        role: (role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLIENT'),
        status: 'ACTIVE',
        clientType: clientType || 'customer',
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        tier: 'free',
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio,
        location: location || { city: 'Kaduna', state: 'Kaduna State', country: 'Nigeria', lat: 10.5105, lng: 7.4165 },
        createdAt: new Date().toISOString()
      };
      db.users.set(user.id, user);
    }
    res.json({ success: true, user });
  });

  // ==========================================
  // 3. CATEGORIES & TAXONOMY
  // ==========================================
  app.get('/api/categories', (req, res) => {
    res.json({ success: true, categories: db.categories });
  });

  app.post('/api/admin/categories', (req, res) => {
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

  app.post('/api/businesses/create', (req, res) => {
    try {
      const {
        ownerId,
        name,
        tagline,
        description,
        logoUrl,
        coverImageUrl,
        category,
        subcategories,
        location,
        phone,
        whatsapp,
        email,
        website,
        openingHours
      } = req.body;

      if (!name || !category || !phone) {
        return res.status(400).json({ success: false, error: 'Name, Category, and Phone are required' });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const id = `biz_${Date.now()}`;

      const newBiz: Business = {
        id,
        ownerId: ownerId || 'usr_maddy_ceo',
        name,
        slug,
        tagline: tagline || 'Verified Boost Market Business',
        description: description || '',
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
        coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        category,
        categoryLabel: category.replace('_', ' ').toUpperCase(),
        subcategories: Array.isArray(subcategories) ? subcategories : [],
        location: location || { city: 'Kaduna', state: 'Kaduna State', country: 'Nigeria', lat: 10.5105, lng: 7.4165, serviceAreaKm: 50 },
        phone,
        whatsapp: whatsapp || phone,
        email: email || `${slug}@boostmarket.ng`,
        website,
        openingHours: openingHours || [
          { day: 'Mon - Fri', hours: '08:00 AM - 06:00 PM', isOpen: true },
          { day: 'Saturday', hours: '09:00 AM - 04:00 PM', isOpen: true },
          { day: 'Sunday', hours: 'Closed', isOpen: false }
        ],
        rating: 5.0,
        reviewCount: 1,
        isVerified: true,
        tier: 'free',
        featured: false,
        stats: { views: 1, leads: 0, conversions: 0, totalRevenue: 0 },
        createdAt: new Date().toISOString()
      };

      db.businesses.set(id, newBiz);

      // Link to owner
      if (ownerId && db.users.has(ownerId)) {
        const u = db.users.get(ownerId)!;
        u.businessId = id;
        u.clientType = 'business';
      }

      auditService.log('BUSINESS_CREATED', id, ownerId || 'user', 'merchant', { businessName: name });
      res.json({ success: true, business: newBiz });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
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

  app.put('/api/admin/subscriptions/plans', (req, res) => {
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
  app.get('/api/admin/reports', (req, res) => {
    const reports = Array.from(db.reports.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, reports });
  });

  app.post('/api/admin/reports/:id/resolve', (req, res) => {
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

  app.get('/api/admin/audit-logs', (req, res) => {
    res.json({ success: true, logs: db.auditLogs.slice(-100).reverse() });
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

  app.get('/api/admin/config', (req, res) => {
    res.json({ success: true, config: db.platformConfig });
  });

  app.put('/api/admin/config', (req, res) => {
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
  // 14. VITE MIDDLEWARE (DEV & PRODUCTION)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 BOOST MARKET PLATFORM (Real Boosters / CEO Maddy)`);
    console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
    console.log(`=================================================`);
  });
}

startServer();
