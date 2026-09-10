/**
 * Centralized API Client & Authentication API Service for Boost Market
 * 
 * Features:
 * - Credentials included (`credentials: 'include'`) for secure HttpOnly cookie transport
 * - CSRF mitigation via standard `X-Requested-With` header
 * - Automatic silent refresh on 401 with retry for protected endpoints
 * - Type-safe endpoint wrappers
 */

import { UserProfile, AccountSecurityState, ClientProfile, ClientContactInfo, Business, CategoryConfig, BusinessCategory, LocationCoordinates, OpeningHour, BusinessContactInfo, UpdateBusinessContactPayload } from '../types';

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
  async changePassword(currentPassword: string, newPassword: string, confirmPassword?: string) {
    const payload: { currentPassword: string; newPassword: string; confirmPassword?: string } = {
      currentPassword,
      newPassword
    };
    if (confirmPassword !== undefined) {
      payload.confirmPassword = confirmPassword;
    }
    return fetchWithAuth<{ success: boolean; message: string; requireLogin?: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Get authenticated client's own profile and security status
   */
  async getProfile() {
    return fetchWithAuth<{
      success: boolean;
      user: UserProfile;
      securityState: AccountSecurityState;
    }>('/api/client/profile', {
      method: 'GET'
    });
  },

  /**
   * Create dedicated application profile for authenticated client (Epic 2 Task 2.1.1)
   */
  async createProfile(data: {
    name: string;
    username?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    clientType?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
      lat?: number;
      lng?: number;
      address?: string;
      serviceAreaKm?: number;
    };
  }) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      profile: ClientProfile;
      user: UserProfile;
    }>('/api/client/profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Update authenticated client's permitted profile fields (Epic 2 Task 2.1.2)
   */
  async updateProfile(updates: Partial<UserProfile> & { username?: string }) {
    return fetchWithAuth<{
      success: boolean;
      user: UserProfile;
      profile?: ClientProfile;
      securityState?: AccountSecurityState;
    }>('/api/client/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Upload or replace client profile avatar (Epic 2 Task 2.1.3)
   */
  async uploadAvatar(data: { image: string; filename?: string }) {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      avatarUrl: string;
      avatarKey: string;
      user: UserProfile;
      profile: ClientProfile;
    }>('/api/client/profile/avatar', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Remove client profile avatar (Epic 2 Task 2.1.3)
   */
  async removeAvatar() {
    return fetchWithAuth<{
      success: boolean;
      message: string;
      user: UserProfile;
      profile: ClientProfile;
    }>('/api/client/profile/avatar', {
      method: 'DELETE'
    });
  },

  /**
   * Get authenticated client's contact information (Epic 2 Task 2.1.4)
   */
  async getContactInfo() {
    return fetchWithAuth<{
      success: boolean;
      contact: ClientContactInfo;
    }>('/api/client/profile/contact', {
      method: 'GET'
    });
  },

  /**
   * Update authenticated client's personal contact information (Epic 2 Task 2.1.4)
   */
  async updateContactInfo(data: { phone?: string | null; contactEmail?: string | null }) {
    return fetchWithAuth<{
      success: boolean;
      contact: ClientContactInfo;
      user: UserProfile;
      profile: ClientProfile;
    }>('/api/client/profile/contact', {
      method: 'PATCH',
      body: JSON.stringify(data)
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

/**
 * Business API Client (Epic 2 Feature 2.2 Task 2.2.1)
 */
export const businessApi = {
  /**
   * Create a new business with authenticated user as owner
   */
  async create(data: { name: string; description?: string; categoryIds?: string[]; location?: LocationCoordinates }) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      message?: string;
    }>('/api/businesses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Fetch authenticated user's business
   */
  async getMyBusiness() {
    return fetchWithAuth<{
      success: boolean;
      business?: Business | null;
      businesses?: Business[];
    }>('/api/businesses/me', {
      method: 'GET'
    });
  },

  /**
   * Upload or replace business logo (Epic 2 Feature 2.2 Task 2.2.2)
   */
  async uploadLogo(businessId: string, data: { image: string; filename?: string }) {
    return fetchWithAuth<{
      success: boolean;
      logoUrl: string;
      logoKey: string;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/logo`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Remove business logo (Epic 2 Feature 2.2 Task 2.2.2)
   */
  async removeLogo(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/logo`, {
      method: 'DELETE'
    });
  },

  /**
   * Upload or replace business cover image (Epic 2 Feature 2.2 Task 2.2.3)
   */
  async uploadCover(businessId: string, data: { image: string; filename?: string }) {
    return fetchWithAuth<{
      success: boolean;
      coverUrl: string;
      coverKey: string;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/cover`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Remove business cover image (Epic 2 Feature 2.2 Task 2.2.3)
   */
  async removeCover(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/cover`, {
      method: 'DELETE'
    });
  },

  /**
   * Update or clear business description (Epic 2 Feature 2.2 Task 2.2.4)
   */
  async updateDescription(businessId: string, data: { description: string }) {
    return fetchWithAuth<{
      success: boolean;
      description: string;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/description`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Fetch categories for a business (Epic 2 Feature 2.2 Task 2.2.5)
   */
  async getCategories(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      businessId: string;
      categories: CategoryConfig[];
      categoryIds: string[];
      businessCategories: BusinessCategory[];
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/categories`, {
      method: 'GET'
    });
  },

  /**
   * Update categories for a business (Epic 2 Feature 2.2 Task 2.2.5)
   */
  async updateCategories(businessId: string, data: { categoryIds: string[] }) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      categoryIds: string[];
      businessCategories: BusinessCategory[];
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/categories`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Remove a single category from a business (Epic 2 Feature 2.2 Task 2.2.5)
   */
  async removeCategory(businessId: string, categoryId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      categoryIds: string[];
      businessCategories: BusinessCategory[];
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE'
    });
  },

  /**
   * Clear all categories from a business (Epic 2 Feature 2.2 Task 2.2.5)
   */
  async clearCategories(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      categoryIds: string[];
      businessCategories: BusinessCategory[];
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/categories`, {
      method: 'DELETE'
    });
  },

  /**
   * Fetch business location (Epic 2 Feature 2.2 Task 2.2.6)
   */
  async getLocation(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      businessId: string;
      location: LocationCoordinates | null;
      error?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/location`, {
      method: 'GET'
    });
  },

  /**
   * Update business location (Epic 2 Feature 2.2 Task 2.2.6)
   */
  async updateLocation(businessId: string, data: Partial<LocationCoordinates>) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      location: LocationCoordinates;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/location`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Clear business location (Epic 2 Feature 2.2 Task 2.2.6)
   */
  async clearLocation(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/location`, {
      method: 'DELETE'
    });
  },

  /**
   * Get business opening hours (Epic 2 Feature 2.2 Task 2.2.7)
   */
  async getOpeningHours(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      businessId: string;
      openingHours: OpeningHour[];
      error?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/opening-hours`, {
      method: 'GET'
    });
  },

  /**
   * Update business opening hours (Epic 2 Feature 2.2 Task 2.2.7)
   */
  async updateOpeningHours(businessId: string, openingHours: OpeningHour[]) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      openingHours: OpeningHour[];
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/opening-hours`, {
      method: 'PUT',
      body: JSON.stringify({ openingHours })
    });
  },

  /**
   * Clear business opening hours (Epic 2 Feature 2.2 Task 2.2.7)
   */
  async clearOpeningHours(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/opening-hours`, {
      method: 'DELETE'
    });
  },

  /**
   * Get business contact information (Epic 2 Feature 2.2 Task 2.2.8)
   */
  async getContactInfo(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      businessId: string;
      contact: BusinessContactInfo;
      error?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/contact`, {
      method: 'GET'
    });
  },

  /**
   * Update business contact information (Epic 2 Feature 2.2 Task 2.2.8)
   */
  async updateContactInfo(businessId: string, data: UpdateBusinessContactPayload) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      contact: BusinessContactInfo;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/contact`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Clear all business contact information (Epic 2 Feature 2.2 Task 2.2.8)
   */
  async clearContactInfo(businessId: string) {
    return fetchWithAuth<{
      success: boolean;
      business: Business;
      contact: BusinessContactInfo;
      message?: string;
    }>(`/api/businesses/${encodeURIComponent(businessId)}/contact`, {
      method: 'DELETE'
    });
  }
};

