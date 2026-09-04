/**
 * Centralized API Client & Authentication API Service for Boost Market
 * 
 * Features:
 * - Credentials included (`credentials: 'include'`) for secure HttpOnly cookie transport
 * - CSRF mitigation via standard `X-Requested-With` header
 * - Automatic silent refresh on 401 with retry for protected endpoints
 * - Type-safe endpoint wrappers
 */

import { UserProfile } from '../types';

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates and sanitizes internal redirect URLs to prevent Open Redirect vulnerabilities.
 * Strictly permits only safe relative paths (e.g., '/', '/merchant_dashboard', '/invoices', '/campaigns').
 * Rejects absolute URLs, protocol-relative URLs (//), javascript: or data: URIs, backslashes, and control characters.
 */
export function sanitizeRedirectUrl(redirectParam: string | null | undefined): string {
  if (!redirectParam) return '/';
  
  const trimmed = redirectParam.trim();
  // Reject absolute URLs, protocol-relative URLs (//), javascript: or data: URIs, or backslashes
  if (
    trimmed.startsWith('//') || 
    trimmed.startsWith('javascript:') || 
    trimmed.startsWith('data:') || 
    trimmed.startsWith('vbscript:') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return '/';
  }

  // Must begin with a single slash and not followed by another slash or backslash
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  return '/';
}

export interface FormattedAuthError {
  message: string;
  code: string;
  status: number;
  isNetworkError: boolean;
  isRateLimited: boolean;
  isSessionExpired: boolean;
  isForbidden: boolean;
  isServerError: boolean;
  retryAfterSeconds?: number;
}

/**
 * Centralized mechanism to convert any backend or network error into a safe, user-friendly message.
 * Strictly prevents leaking stack traces, database exceptions, internal service names, or raw SQL.
 */
export function formatAuthError(error: unknown): FormattedAuthError {
  if (error instanceof ApiError) {
    const isNetworkError = error.status === 0 || error.code === 'NETWORK_ERROR';
    const isRateLimited = error.status === 429 || error.code === 'RATE_LIMITED';
    const isSessionExpired = error.status === 401 && (
      error.code === 'SESSION_EXPIRED' || 
      error.code === 'TOKEN_EXPIRED' || 
      error.message.toLowerCase().includes('expired') || 
      error.message.toLowerCase().includes('revoked') ||
      error.message.toLowerCase().includes('session')
    );
    const isForbidden = error.status === 403;
    const isServerError = error.status >= 500 && error.status < 600;

    let safeMessage = error.message;

    if (isNetworkError) {
      safeMessage = 'Unable to connect to Boost Market. Please check your internet connection and try again.';
    } else if (isServerError) {
      safeMessage = 'Something went wrong on our side. Please try again shortly.';
    } else if (isRateLimited) {
      const remaining = error.details?.remainingSeconds || error.details?.retryAfter;
      safeMessage = remaining 
        ? `Too many requests. Please wait ${remaining} seconds and try again.` 
        : 'Too many requests. Please wait a moment and try again.';
    } else if (isSessionExpired) {
      safeMessage = 'Your session has expired. Please sign in again.';
    } else if (isForbidden) {
      if (error.code === 'EMAIL_NOT_VERIFIED' || error.message.toLowerCase().includes('verify your email')) {
        safeMessage = 'Your email address has not been verified yet. Please check your inbox or request a new verification link.';
      } else if (error.code === 'ACCOUNT_SUSPENDED' || error.message.toLowerCase().includes('suspended')) {
        safeMessage = 'This account has been suspended by administration. Please contact support.';
      } else {
        safeMessage = error.message || 'You do not have permission to access this resource.';
      }
    }

    return {
      message: safeMessage,
      code: error.code || (isNetworkError ? 'NETWORK_ERROR' : isRateLimited ? 'RATE_LIMITED' : isSessionExpired ? 'SESSION_EXPIRED' : isServerError ? 'SERVER_ERROR' : 'AUTH_ERROR'),
      status: error.status,
      isNetworkError,
      isRateLimited,
      isSessionExpired,
      isForbidden,
      isServerError,
      retryAfterSeconds: error.details?.remainingSeconds || error.details?.retryAfter
    };
  }

  // Generic Error / Network Exception / Fetch failure
  const rawMsg = error instanceof Error ? error.message : String(error || '');
  const isNet = rawMsg.toLowerCase().includes('network') || 
                rawMsg.toLowerCase().includes('failed to fetch') || 
                rawMsg.toLowerCase().includes('load failed') ||
                rawMsg.toLowerCase().includes('internet');
  
  return {
    message: isNet 
      ? 'Unable to connect to Boost Market. Please check your internet connection and try again.' 
      : 'Something went wrong on our side. Please try again shortly.',
    code: isNet ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
    status: isNet ? 0 : 500,
    isNetworkError: isNet,
    isRateLimited: false,
    isSessionExpired: false,
    isForbidden: false,
    isServerError: !isNet
  };
}

// Global listener for auth session expiry
type AuthStateListener = (isAuthenticated: boolean, user: UserProfile | null) => void;
const authListeners = new Set<AuthStateListener>();

// Cross-tab broadcast channel for auth state sync
const AUTH_CHANNEL_NAME = 'boost_auth_channel';
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'AUTH_LOGOUT') {
        notifyAuthState(false, null, false);
      } else if (event.data?.type === 'AUTH_LOGIN' && event.data.user) {
        notifyAuthState(true, event.data.user, false);
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported or restricted in iframe environment', e);
  }
}

// Fallback to storage event for multi-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'boost_auth_logout_signal') {
      notifyAuthState(false, null, false);
    }
  });
}

export const onAuthStateChange = (listener: AuthStateListener) => {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
};

export const notifyAuthState = (isAuthenticated: boolean, user: UserProfile | null, broadcast = true) => {
  authListeners.forEach(fn => fn(isAuthenticated, user));

  if (broadcast && typeof window !== 'undefined') {
    if (!isAuthenticated) {
      try {
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'AUTH_LOGOUT', timestamp: Date.now() });
        }
        localStorage.setItem('boost_auth_logout_signal', Date.now().toString());
        localStorage.removeItem('boost_auth_token');
        sessionStorage.clear();
      } catch (err) {
        // Safe failover
      }
    } else if (user) {
      try {
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'AUTH_LOGIN', user, timestamp: Date.now() });
        }
      } catch (err) {
        // Safe failover
      }
    }
  }
};

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export interface ExtendedRequestInit extends RequestInit {
  _isRetry?: boolean;
}

/**
 * Enhanced fetch with cookie credentials, security headers, single-flight refresh lock,
 * and strict refresh loop prevention for protected endpoints.
 */
export async function fetchWithAuth<T = any>(url: string, options: ExtendedRequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const defaultOptions: ExtendedRequestInit = {
    ...options,
    headers,
    credentials: 'include' // Sends HttpOnly session cookies
  };

  let response: Response;
  try {
    response = await fetch(url, defaultOptions);
  } catch (netErr: any) {
    throw new ApiError(
      netErr?.message || 'Unable to connect to Boost Market. Please check your internet connection and try again.', 
      0, 
      'NETWORK_ERROR'
    );
  }

  // Handle 401 (Unauthorized)
  const isAuthRoute = url.includes('/api/auth/login') ||
                      url.includes('/api/auth/refresh') ||
                      url.includes('/api/auth/logout') ||
                      url.includes('/api/auth/register') ||
                      url.includes('/api/auth/2fa') ||
                      url.includes('/api/auth/verify-email') ||
                      url.includes('/api/auth/resend-verification');

  if (response.status === 401 && !isAuthRoute) {
    // REFRESH LOOP PROTECTION: If this request is already a post-refresh retry, DO NOT attempt refresh again!
    if (options._isRetry) {
      notifyAuthState(false, null);
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }

    // SINGLE-FLIGHT LOCK: If not already refreshing, start one refresh promise for all concurrent requests
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          const refData = await refRes.json().catch(() => ({}));
          if (refRes.ok && refData.success) {
            if (refData.user) {
              notifyAuthState(true, refData.user);
            }
            return true;
          }
          // Refresh failed - session is dead
          notifyAuthState(false, null);
          return false;
        } catch {
          notifyAuthState(false, null);
          return false;
        } finally {
          isRefreshing = false;
        }
      })();
    }

    const refreshSuccess = await (refreshPromise || Promise.resolve(false));

    if (refreshSuccess) {
      // Retry original request ONCE with _isRetry flag set to true
      try {
        return await fetchWithAuth<T>(url, { ...options, _isRetry: true });
      } catch (retryErr: any) {
        if (retryErr instanceof ApiError) throw retryErr;
        throw new ApiError(retryErr?.message || 'Request failed after session refresh', 0, 'RETRY_ERROR');
      }
    } else {
      // Session refresh rejected or expired
      notifyAuthState(false, null);
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Sanitize server 5xx errors to prevent leaking database or backend details
    let errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
    if (response.status >= 500) {
      errorMessage = 'Something went wrong on our side. Please try again shortly.';
    }

    throw new ApiError(
      errorMessage,
      response.status,
      data.code,
      data
    );
  }

  return data;
}

export const authApi = {
  /**
   * Log in user with email & password
   */
  async login(credentials: { email: string; password: string; clientType?: 'business' | 'customer' }) {
    return fetchWithAuth<{
      success: boolean;
      user?: UserProfile;
      accessToken?: string;
      refreshToken?: string;
      twoFactorRequired?: boolean;
      preAuthToken?: string;
      maskedEmail?: string;
      message?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(preAuthToken: string, code: string) {
    return fetchWithAuth<{
      success: boolean;
      user: UserProfile;
      accessToken: string;
      refreshToken: string;
      message: string;
    }>('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ preAuthToken, code })
    });
  },

  /**
   * Register a new client account
   */
  async register(data: { name: string; email: string; password: string; clientType?: 'business' | 'customer' }) {
    return fetchWithAuth<{
      success: boolean;
      user: UserProfile;
      message: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(optional = false) {
    const query = optional ? '?optional=true' : '';
    return fetchWithAuth<{
      success: boolean;
      authenticated: boolean;
      user: UserProfile | null;
      sessionsCount?: number;
    }>(`/api/auth/me${query}`, {
      method: 'GET'
    });
  },

  /**
   * Log out current session
   */
  async logout() {
    try {
      const res = await fetchWithAuth<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST'
      });
      notifyAuthState(false, null);
      return res;
    } catch (err) {
      // Even if network failed, client state must be cleared
      notifyAuthState(false, null);
      return { success: true, message: 'Logged out locally' };
    }
  },

  /**
   * Log out all active sessions
   */
  async logoutAll() {
    try {
      const res = await fetchWithAuth<{ success: boolean; message: string }>('/api/auth/logout-all', {
        method: 'POST'
      });
      notifyAuthState(false, null);
      return res;
    } catch (err) {
      notifyAuthState(false, null);
      return { success: true, message: 'Logged out locally' };
    }
  },

  /**
   * Refresh session access token
   */
  async refreshToken() {
    return fetchWithAuth<{
      success: boolean;
      accessToken: string;
      user: UserProfile;
    }>('/api/auth/refresh', {
      method: 'POST'
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      user?: UserProfile;
    }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET'
    });
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Request password reset link
   */
  async forgotPassword(email: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  },

  /**
   * Change password for logged in user
   */
  async changePassword(currentPassword: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  /**
   * Super Admin Login
   */
  async adminLogin(data: { email: string; password: string; totpCode?: string }) {
    return fetchWithAuth<{
      success: boolean;
      requires2FA?: boolean;
      preAuthToken?: string;
      email?: string;
      user?: UserProfile;
      accessToken?: string;
      refreshToken?: string;
      message?: string;
    }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Dispatch Super Admin First-Time Setup Link
   */
  async initAdminSetup() {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      setupToken?: string;
      setupUrl?: string;
      adminEmail?: string;
    }>('/api/auth/admin/init-setup', {
      method: 'POST'
    });
  },

  /**
   * Super Admin Password Setup via Token
   */
  async setupAdminPassword(data: { token: string; newPassword: string }) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      user?: UserProfile;
    }>('/api/auth/admin/setup-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Complete 2FA login challenge with 6-digit TOTP code or recovery code
   */
  async verify2faLogin(preAuthToken: string, code: string) {
    return fetchWithAuth<{
      success: boolean;
      user: UserProfile;
      accessToken: string;
      refreshToken: string;
      error?: string;
    }>('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ preAuthToken, code })
    });
  },

  /**
   * Setup 2FA: generates secret, URI, and 8 recovery codes
   */
  async setup2FA() {
    return fetchWithAuth<{
      success: boolean;
      secret: string;
      otpauthUrl: string;
      recoveryCodes: string[];
    }>('/api/auth/2fa/setup', {
      method: 'POST'
    });
  },

  /**
   * Enable 2FA by verifying the first TOTP code
   */
  async enable2FA(totpCode: string, recoveryCodes: string[]) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
    }>('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ totpCode, recoveryCodes })
    });
  },

  /**
   * Disable 2FA (with optional password confirmation)
   */
  async disable2FA(password?: string) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
    }>('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  },

  /**
   * Get Super Admin 2FA Status
   */
  async get2FAStatus() {
    return adminApi.get2FAStatus();
  },

  /**
   * Regenerate Super Admin backup recovery codes
   */
  async regenerateRecoveryCodes(password?: string) {
    return adminApi.regenerateRecoveryCodes(password);
  },

  /**
   * Get active user sessions
   */
  async getSessions() {
    return fetchWithAuth<{
      success: boolean;
      sessions: Array<{
        id: string;
        ipAddress: string;
        userAgent: string;
        createdAt: string;
        lastActiveAt: string;
        isCurrent: boolean;
      }>;
    }>('/api/auth/sessions', {
      method: 'GET'
    });
  },

  /**
   * Revoke a specific user session
   */
  async revokeSession(sessionId: string) {
    return fetchWithAuth<{ success: boolean; message: string }>(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  },

  /**
   * Revoke all other user sessions (keeps current session)
   */
  async revokeAllOtherSessions() {
    return fetchWithAuth<{ success: boolean; message: string; revokedCount?: number }>('/api/auth/sessions/all-other', {
      method: 'POST'
    });
  }
};

export const adminApi = {
  /**
   * Get Super Admin 2FA Status
   */
  async get2FAStatus() {
    return fetchWithAuth<{
      success: boolean;
      enabled: boolean;
      twoFactorEnabled: boolean;
      userEmail?: string;
      remainingRecoveryCodes: number;
    }>('/api/admin/2fa/status', {
      method: 'GET'
    });
  },

  /**
   * Regenerate Super Admin backup recovery codes
   */
  async regenerateRecoveryCodes(password?: string) {
    return fetchWithAuth<{
      success: boolean;
      recoveryCodes: string[];
      message: string;
    }>('/api/admin/2fa/regenerate-recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  },
  /**
   * Fetch Super Admin Security Logs
   */
  async getSecurityLogs() {
    return fetchWithAuth<{ success: boolean; logs: any[] }>('/api/admin/security-logs', {
      method: 'GET'
    });
  },

  /**
   * Fetch Users List
   */
  async getUsers() {
    return fetchWithAuth<{ success: boolean; users: UserProfile[] }>('/api/admin/users', {
      method: 'GET'
    });
  },

  /**
   * Update User Status (Suspend, Activate, etc.)
   */
  async updateUserStatus(userId: string, status: string) {
    return fetchWithAuth<{ success: boolean; user: UserProfile }>('/api/admin/users/' + userId + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  /**
   * Fetch Content Reports
   */
  async getReports() {
    return fetchWithAuth<{ success: boolean; reports: any[] }>('/api/admin/reports', {
      method: 'GET'
    });
  },

  /**
   * Resolve Content Report
   */
  async resolveReport(reportId: string, action: string) {
    return fetchWithAuth<{ success: boolean; report: any }>('/api/admin/reports/' + reportId + '/resolve', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  },

  /**
   * Fetch Platform Audit Logs
   */
  async getAuditLogs() {
    return fetchWithAuth<{ success: boolean; logs: any[]; auditLogs?: any[] }>('/api/admin/audit-logs', {
      method: 'GET'
    });
  },

  /**
   * Fetch Platform Config
   */
  async getConfig() {
    return fetchWithAuth<{ success: boolean; config: any }>('/api/admin/config', {
      method: 'GET'
    });
  },

  /**
   * Update Platform Config
   */
  async updateConfig(config: any) {
    return fetchWithAuth<{ success: boolean; config: any }>('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }
};
