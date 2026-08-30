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

// Global listener for auth session expiry
type AuthStateListener = (isAuthenticated: boolean, user: UserProfile | null) => void;
const authListeners = new Set<AuthStateListener>();

export const onAuthStateChange = (listener: AuthStateListener) => {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
};

export const notifyAuthState = (isAuthenticated: boolean, user: UserProfile | null) => {
  authListeners.forEach(fn => fn(isAuthenticated, user));
};

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Enhanced fetch with cookie credentials, security headers, and automatic 401 silent token refresh
 */
export async function fetchWithAuth<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Sends HttpOnly session cookies
  };

  let response: Response;
  try {
    response = await fetch(url, defaultOptions);
  } catch (netErr: any) {
    throw new ApiError(netErr?.message || 'Network error occurred. Please check your connection.', 0, 'NETWORK_ERROR');
  }

  // Handle 401 (Unauthorized) - Attempt silent refresh once for protected endpoints
  const isAuthRoute = url.includes('/api/auth/login') ||
                      url.includes('/api/auth/refresh') ||
                      url.includes('/api/auth/logout') ||
                      url.includes('/api/auth/register') ||
                      url.includes('/api/auth/2fa');

  if (response.status === 401 && !isAuthRoute) {
    // If not already refreshing, start refresh
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

    const refreshSuccess = await refreshPromise;
    if (refreshSuccess) {
      // Retry original request once
      try {
        response = await fetch(url, defaultOptions);
      } catch (retryErr: any) {
        throw new ApiError(retryErr?.message || 'Request failed on retry', 0, 'RETRY_ERROR');
      }
    } else {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || 'Session expired. Please sign in again.', 401, data.code || 'SESSION_EXPIRED');
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed with status ${response.status}`,
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
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST'
    });
  },

  /**
   * Log out all active sessions
   */
  async logoutAll() {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/logout-all', {
      method: 'POST'
    });
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
  }
};
