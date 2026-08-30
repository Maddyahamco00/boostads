import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { db } from '../db';
import { UserEntity, UserRole } from '../../types';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
  sessionId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Check HttpOnly cookie first, then fallback to Authorization header
    let token: string | undefined;

    if (req.cookies && req.cookies.boost_access_token) {
      token = req.cookies.boost_access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session token provided.'
      });
    }

    const payload = authService.verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.'
      });
    }

    const user = db.users.get(payload.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authenticated user record no longer exists.'
      });
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by administration.'
      });
    }
    if (user.status === 'DISABLED' || user.status === 'DELETED') {
      return res.status(403).json({
        success: false,
        error: 'Your account is disabled.'
      });
    }

    // Check session validity if sessionId is present
    if (payload.sessionId) {
      const session = db.sessions.get(payload.sessionId);
      if (session) {
        if (session.isRevoked) {
          return res.status(401).json({
            success: false,
            error: 'Session has been revoked. Please sign in again.'
          });
        }
        if (new Date(session.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            error: 'Session has expired. Please sign in again.'
          });
        }
      }
    }

    req.user = user;
    req.sessionId = payload.sessionId;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return res.status(401).json({ success: false, error: msg });
  }
};

// Optional authentication: attaches user if token is present, does not fail if missing
export const optionalAuthenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies && req.cookies.boost_access_token) {
      token = req.cookies.boost_access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const payload = authService.verifyAccessToken(token);
      if (payload && payload.userId) {
        const user = db.users.get(payload.userId);
        if (user && user.status !== 'SUSPENDED' && user.status !== 'DELETED') {
          if (payload.sessionId) {
            const session = db.sessions.get(payload.sessionId);
            if (!session || (!session.isRevoked && new Date(session.expiresAt).getTime() > Date.now())) {
              req.user = user;
              req.sessionId = payload.sessionId;
            }
          } else {
            req.user = user;
          }
        }
      }
    }
  } catch {
    // Ignore error for optional auth
  }
  next();
};

// Require exact role (e.g. SUPER_ADMIN, CLIENT)
export const requireRole = (role: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      authService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user.id,
        userEmail: req.user.email,
        role: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        severity: 'CRITICAL',
        details: { requiredRole: role, userRole: req.user.role, path: req.path }
      });

      return res.status(403).json({
        success: false,
        error: `Access forbidden: ${role} privileges required.`
      });
    }

    next();
  };
};

// Role shortcuts
export const requireClient = requireRole('CLIENT');
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

// Require Active status
export const requireActiveStatus = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: 'Account verification is required to perform this action.'
    });
  }

  next();
};
