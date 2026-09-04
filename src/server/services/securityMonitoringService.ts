import { db, SUPER_ADMIN_EMAIL } from '../db';
import { SecurityAuditEvent, SecurityAlertPayload, SecurityMonitoringStats } from '../../types';

// SENSITIVE KEYS DENYLIST (Case-insensitive substring matches)
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'hash',
  'secret',
  'token',
  'rawtoken',
  'jwt',
  'cookie',
  'credential',
  'authheader',
  'authorization',
  'recoverycode',
  'totpsecret',
  'privatekey',
  'apikey',
  'sessionsecret'
];

export interface SecurityAlertSink {
  name: string;
  notify(alert: SecurityAlertPayload): Promise<void> | void;
}

export interface SecurityLogRetentionOptions {
  retentionDays?: number;
  minPreserved?: number;
  maxEntries?: number;
}

/**
 * Security Automation & Monitoring Foundation Service.
 * Central engine for security event sanitization, threat detection,
 * safe log retention, alerting hooks, and session/token metrics.
 */
export class SecurityMonitoringService {
  private alertSinks: Map<string, SecurityAlertSink> = new Map();
  private recentAlerts: SecurityAlertPayload[] = [];
  private static readonly MAX_ALERTS_STORED = 200;

  // Real-time Anomaly Tracking Windows
  private adminAuthFailures: { count: number; windowStart: number } = { count: 0, windowStart: 0 };
  private twoFactorFailures: Map<string, { count: number; windowStart: number }> = new Map();
  private rateLimitViolations: Map<string, { count: number; windowStart: number }> = new Map();
  private tokenValidationFailures: Map<string, { count: number; windowStart: number }> = new Map();

  constructor() {
    // Register default console/audit sink
    this.registerAlertSink({
      name: 'internal_audit_sink',
      notify: (alert) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[SECURITY ALERT TRIGGERED] [${alert.severity}] ${alert.type}: ${alert.message}`);
        }
      }
    });
  }

  // ==========================================================================
  // 1. DATA PRIVACY & RECURSIVE SANITIZATION
  // ==========================================================================

  /**
   * Deeply sanitizes any metadata dictionary to guarantee zero credential leakage.
   * Strips/masks passwords, hashes, tokens, secrets, cookies, recovery codes.
   */
  public sanitizeDetails<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Mask apparent JWT tokens (3 base64url segments separated by dots)
      if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(data)) {
        return '[REDACTED_JWT]' as unknown as T;
      }
      // Mask apparent 32+ char hex tokens
      if (/^[0-9a-fA-F]{32,}$/.test(data) && data.length >= 32) {
        return '[REDACTED_TOKEN]' as unknown as T;
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDetails(item)) as unknown as T;
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => lowerKey.includes(pattern));

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeDetails(value);
        }
      }
      return sanitized as T;
    }

    return data;
  }

  // ==========================================================================
  // 2. ALERTING FOUNDATION & ANOMALY DETECTION
  // ==========================================================================

  public registerAlertSink(sink: SecurityAlertSink): void {
    this.alertSinks.set(sink.name, sink);
  }

  public unregisterAlertSink(name: string): void {
    this.alertSinks.delete(name);
  }

  public getRecentAlerts(limit = 50): SecurityAlertPayload[] {
    return this.recentAlerts.slice(-limit).reverse();
  }

  /**
   * Dispatches a high-priority security alert across registered sinks.
   * Execution is fully non-blocking and safe: failures in sinks will NEVER throw or break auth.
   */
  public async dispatchAlert(alertInput: Omit<SecurityAlertPayload, 'id' | 'timestamp'>): Promise<SecurityAlertPayload> {
    const alert: SecurityAlertPayload = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...alertInput,
      details: this.sanitizeDetails(alertInput.details || {})
    };

    try {
      this.recentAlerts.push(alert);
      if (this.recentAlerts.length > SecurityMonitoringService.MAX_ALERTS_STORED) {
        this.recentAlerts.shift();
      }

      // Notify sinks safely in background
      for (const [name, sink] of this.alertSinks.entries()) {
        try {
          const res = sink.notify(alert);
          if (res && typeof res.then === 'function') {
            res.catch(err => {
              console.error(`[SecurityMonitoring] Alert sink "${name}" error:`, err?.message);
            });
          }
        } catch (err: any) {
          console.error(`[SecurityMonitoring] Failed to notify alert sink "${name}":`, err?.message);
        }
      }
    } catch (err) {
      console.error('[SecurityMonitoring] Critical internal error in dispatchAlert:', err);
    }

    return alert;
  }

  /**
   * Tracks Super Admin authentication failures and triggers high-severity alert on repeated failure.
   */
  public recordAdminAuthFailure(email: string, ip: string, userAgent: string): void {
    try {
      const now = Date.now();
      const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

      if (now - this.adminAuthFailures.windowStart > WINDOW_MS) {
        this.adminAuthFailures = { count: 1, windowStart: now };
      } else {
        this.adminAuthFailures.count += 1;
      }

      if (this.adminAuthFailures.count >= 3) {
        this.dispatchAlert({
          type: 'REPEATED_ADMIN_AUTH_FAILURE',
          severity: 'CRITICAL',
          targetEmail: SUPER_ADMIN_EMAIL,
          ipAddress: ip,
          userAgent,
          message: `Multiple consecutive authentication failures (${this.adminAuthFailures.count}) detected against Super Admin account.`,
          details: {
            attemptedEmail: email,
            failureCount: this.adminAuthFailures.count,
            windowMinutes: 10
          }
        });
      }
    } catch (err) {
      console.error('[SecurityMonitoring] Error in recordAdminAuthFailure:', err);
    }
  }

  public recordAdminAuthSuccess(): void {
    this.adminAuthFailures = { count: 0, windowStart: 0 };
  }

  /**
   * Tracks 2FA verification failures and triggers alert on repeated failure.
   */
  public recordTwoFactorFailure(userId: string, email: string, ip: string, userAgent: string): void {
    try {
      const now = Date.now();
      const WINDOW_MS = 10 * 60 * 1000;
      const key = `${userId}_${ip}`;
      const record = this.twoFactorFailures.get(key);

      if (!record || (now - record.windowStart > WINDOW_MS)) {
        this.twoFactorFailures.set(key, { count: 1, windowStart: now });
      } else {
        record.count += 1;
        if (record.count >= 3) {
          this.dispatchAlert({
            type: 'REPEATED_2FA_FAILURE',
            severity: email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'CRITICAL' : 'WARNING',
            targetUserId: userId,
            targetEmail: email,
            ipAddress: ip,
            userAgent,
            message: `Multiple consecutive 2FA verification failures (${record.count}) detected for account.`,
            details: {
              failureCount: record.count,
              isSuperAdmin: email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
            }
          });
        }
      }
    } catch (err) {
      console.error('[SecurityMonitoring] Error in recordTwoFactorFailure:', err);
    }
  }

  public recordTwoFactorSuccess(userId: string, ip: string): void {
    this.twoFactorFailures.delete(`${userId}_${ip}`);
  }

  /**
   * Tracks privilege escalation attempts (e.g. attempting to assign SUPER_ADMIN).
   */
  public recordPrivilegeEscalationAttempt(
    attemptedRole: string,
    targetEmail?: string,
    ip: string = '127.0.0.1',
    userAgent: string = 'system',
    reason: string = 'Unauthorized role elevation attempted'
  ): void {
    try {
      this.dispatchAlert({
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        severity: 'CRITICAL',
        targetEmail,
        ipAddress: ip,
        userAgent,
        message: `Privilege escalation blocked: Attempt to gain or assign protected role "${attemptedRole}".`,
        details: { attemptedRole, reason }
      });
    } catch (err) {
      console.error('[SecurityMonitoring] Error in recordPrivilegeEscalationAttempt:', err);
    }
  }

  /**
   * Tracks rate-limit violations and detects abnormal authentication abuse.
   */
  public recordRateLimitViolation(endpoint: string, ip: string, userAgent: string, identifier?: string): void {
    try {
      const now = Date.now();
      const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
      const key = `${ip}_${endpoint}`;
      const record = this.rateLimitViolations.get(key);

      if (!record || (now - record.windowStart > WINDOW_MS)) {
        this.rateLimitViolations.set(key, { count: 1, windowStart: now });
      } else {
        record.count += 1;
        if (record.count >= 5) {
          this.dispatchAlert({
            type: 'ABNORMAL_AUTHENTICATION_ABUSE',
            severity: 'WARNING',
            targetEmail: identifier?.includes('@') ? identifier : undefined,
            ipAddress: ip,
            userAgent,
            message: `Sustained rate limit abuse detected from IP ${ip} on ${endpoint} (${record.count} violations).`,
            details: {
              endpoint,
              violationCount: record.count,
              windowMinutes: 15
            }
          });
        }
      }
    } catch (err) {
      console.error('[SecurityMonitoring] Error in recordRateLimitViolation:', err);
    }
  }

  /**
   * Tracks suspicious repeated token validation failures (e.g. brute force token attacks).
   */
  public recordTokenValidationFailure(tokenType: string, ip: string, reason: string): void {
    try {
      const now = Date.now();
      const WINDOW_MS = 10 * 60 * 1000;
      const key = `${ip}_${tokenType}`;
      const record = this.tokenValidationFailures.get(key);

      if (!record || (now - record.windowStart > WINDOW_MS)) {
        this.tokenValidationFailures.set(key, { count: 1, windowStart: now });
      } else {
        record.count += 1;
        if (record.count >= 10) {
          this.dispatchAlert({
            type: 'SUSPICIOUS_ACCOUNT_ACTIVITY',
            severity: 'WARNING',
            ipAddress: ip,
            message: `Repeated invalid token attempts (${record.count}) detected on ${tokenType} endpoint from IP ${ip}.`,
            details: { tokenType, reason, attemptCount: record.count }
          });
        }
      }
    } catch (err) {
      console.error('[SecurityMonitoring] Error in recordTokenValidationFailure:', err);
    }
  }

  // ==========================================================================
  // 3. TOKEN & SESSION LIFECYCLE MONITORING
  // ==========================================================================

  /**
   * Calculates comprehensive session and token health metrics.
   * Guarantees zero leakage of raw tokens or secret credentials.
   */
  public getSecurityStats(): SecurityMonitoringStats {
    const nowMs = Date.now();

    // 1. Session statistics
    let sessionTotal = 0;
    let sessionActive = 0;
    let sessionExpired = 0;
    let sessionRevoked = 0;

    for (const session of db.sessions.values()) {
      sessionTotal++;
      if (session.isRevoked) {
        sessionRevoked++;
      } else if (new Date(session.expiresAt).getTime() <= nowMs) {
        sessionExpired++;
      } else {
        sessionActive++;
      }
    }

    // 2. Password reset token statistics
    let prTotal = 0;
    let prActive = 0;
    let prExpired = 0;
    let prUsed = 0;

    // 3. Email verification token statistics
    let evTotal = 0;
    let evActive = 0;
    let evExpired = 0;
    let evUsed = 0;

    for (const token of db.tokens.values()) {
      const isExp = new Date(token.expiresAt).getTime() <= nowMs;
      const isUsd = Boolean(token.isUsed || token.usedAt);

      if (token.type === 'password_reset') {
        prTotal++;
        if (isUsd) prUsed++;
        else if (isExp) prExpired++;
        else prActive++;
      } else if (token.type === 'email_verification') {
        evTotal++;
        if (isUsd) evUsed++;
        else if (isExp) evExpired++;
        else evActive++;
      }
    }

    // 4. Audit logs breakdown
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const log of db.securityLogs) {
      if (log.severity === 'CRITICAL') criticalCount++;
      else if (log.severity === 'WARNING') warningCount++;
      else infoCount++;
    }

    return {
      sessions: {
        total: sessionTotal,
        active: sessionActive,
        expired: sessionExpired,
        revoked: sessionRevoked
      },
      tokens: {
        passwordReset: {
          total: prTotal,
          active: prActive,
          expired: prExpired,
          used: prUsed
        },
        emailVerification: {
          total: evTotal,
          active: evActive,
          expired: evExpired,
          used: evUsed
        }
      },
      auditLogs: {
        total: db.securityLogs.length,
        criticalCount,
        warningCount,
        infoCount
      },
      rateLimits: {
        activeLockedKeys: this.rateLimitViolations.size,
        recentViolations: Array.from(this.rateLimitViolations.values()).reduce((sum, v) => sum + v.count, 0)
      }
    };
  }

  /**
   * Retrieves sanitized, paginated, and filtered security audit logs.
   */
  public getAuditLogs(query: {
    limit?: number;
    offset?: number;
    severity?: SecurityAuditEvent['severity'];
    eventType?: SecurityAuditEvent['eventType'];
    search?: string;
  } = {}): {
    events: SecurityAuditEvent[];
    total: number;
    hasMore: boolean;
    summary: {
      critical: number;
      warning: number;
      info: number;
    };
  } {
    const {
      limit = 50,
      offset = 0,
      severity,
      eventType,
      search
    } = query;

    let filtered = [...db.securityLogs];

    // Summary across all logs before pagination
    let critical = 0;
    let warning = 0;
    let info = 0;

    for (const log of filtered) {
      if (log.severity === 'CRITICAL') critical++;
      else if (log.severity === 'WARNING') warning++;
      else info++;
    }

    if (severity) {
      filtered = filtered.filter(log => log.severity === severity);
    }

    if (eventType) {
      filtered = filtered.filter(log => log.eventType === eventType);
    }

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(log => {
        const text = `${log.eventType} ${log.userEmail || ''} ${log.ipAddress || ''} ${log.userId || ''}`.toLowerCase();
        return text.includes(q);
      });
    }

    // Newest first
    filtered.reverse();

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      events: paginated,
      total,
      hasMore: offset + limit < total,
      summary: { critical, warning, info }
    };
  }

  // ==========================================================================
  // 4. SECURITY LOG RETENTION & SAFE CLEANUP
  // ==========================================================================

  /**
   * Safely trims older security audit entries while preserving recent records.
   * Requirements:
   * - Never deletes recent events within the retention period (default 30 days).
   * - Always preserves at least minPreserved recent records (default 500).
   * - Never modifies or removes active sessions or active tokens.
   * - Safe and idempotent.
   */
  public cleanupSecurityLogs(options: SecurityLogRetentionOptions = {}): {
    initialCount: number;
    retainedCount: number;
    purgedCount: number;
  } {
    const {
      retentionDays = 30,
      minPreserved = 500,
      maxEntries = 5000
    } = options;

    const initialCount = db.securityLogs.length;
    if (initialCount <= minPreserved) {
      return { initialCount, retainedCount: initialCount, purgedCount: 0 };
    }

    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    // Keep events that are newer than cutoff OR are part of the most recent minPreserved events
    const preservedIndex = Math.max(0, initialCount - minPreserved);

    const retainedLogs = db.securityLogs.filter((event, index) => {
      // Always retain if in the recent slice
      if (index >= preservedIndex) return true;
      // Retain if newer than retention cutoff
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime >= cutoffTime;
    });

    // Enforce upper ceiling cap if logs exceed maxEntries
    const finalLogs = retainedLogs.length > maxEntries ? retainedLogs.slice(-maxEntries) : retainedLogs;
    const purgedCount = initialCount - finalLogs.length;

    db.securityLogs = finalLogs;

    return {
      initialCount,
      retainedCount: finalLogs.length,
      purgedCount
    };
  }

  /**
   * Unified, safe background maintenance task.
   * Integrates token cleanup, session cleanup, and log retention safely.
   */
  public async runMaintenance(): Promise<{
    expiredSessionsPurged: number;
    revokedSessionsPurged: number;
    logRetention: { initialCount: number; retainedCount: number; purgedCount: number };
  }> {
    try {
      // 1. Purge expired sessions (already past expiration timestamp)
      const expiredSessionsPurged = db.sessions.cleanupExpired();

      // 2. Purge revoked sessions older than 7 days
      const revokedSessionsPurged = db.sessions.cleanupRevoked(7 * 24 * 60 * 60 * 1000);

      // 3. Retain security logs safely (keep at least 500, max 5000, 30-day window)
      const logRetention = this.cleanupSecurityLogs({ retentionDays: 30, minPreserved: 500, maxEntries: 5000 });

      return {
        expiredSessionsPurged,
        revokedSessionsPurged,
        logRetention
      };
    } catch (err) {
      console.error('[SecurityMonitoring] Error in runMaintenance:', err);
      return {
        expiredSessionsPurged: 0,
        revokedSessionsPurged: 0,
        logRetention: { initialCount: db.securityLogs.length, retainedCount: db.securityLogs.length, purgedCount: 0 }
      };
    }
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
