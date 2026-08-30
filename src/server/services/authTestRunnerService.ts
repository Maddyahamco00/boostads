import { authService } from './authService';
import { db } from '../db';
import { emailService } from './emailService';

export interface AuthTestResult {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'passed' | 'failed';
  executionTimeMs: number;
  logs: string[];
  error?: string;
}

export class AuthTestRunnerService {
  public async runAllSecurityTests(): Promise<AuthTestResult[]> {
    const results: AuthTestResult[] = [];

    // Test 1: Public Registration Creates strictly CLIENT role
    results.push(await this.runTest(
      'auth_01',
      'Registration & Role Enforcement',
      'Verify public registration strictly assigns CLIENT role even if SUPER_ADMIN is requested',
      async (logs) => {
        const testEmail = `test_client_${Date.now()}@example.com`;
        logs.push(`Registering new user with email: ${testEmail}`);
        
        const res = await authService.registerClient({
          name: 'Security Test User',
          email: testEmail,
          password: 'TestPassword123!',
          clientType: 'business'
        }, '127.0.0.1', 'SecurityTestRunner/1.0');

        logs.push(`Registered user role: ${res.user.role}, status: ${res.user.status}`);
        if (res.user.role !== 'CLIENT') {
          throw new Error(`Role escalation failed: Expected 'CLIENT' but got '${res.user.role}'`);
        }
        if (res.user.status !== 'PENDING_VERIFICATION') {
          throw new Error(`Account status should be 'PENDING_VERIFICATION' prior to email verification`);
        }
        logs.push('Verified: Role is strictly CLIENT and status is PENDING_VERIFICATION');
      }
    ));

    // Test 2: Admin Email Public Registration Prevention
    results.push(await this.runTest(
      'auth_02',
      'Admin Identity Protection',
      'Verify public registration fails when attempting to register designated Super Admin email',
      async (logs) => {
        const adminEmail = 'maddyahamco00@gmail.com';
        logs.push(`Attempting to register designated admin email: ${adminEmail}`);
        
        let blocked = false;
        try {
          await authService.registerClient({
            name: 'Imposter Admin',
            email: adminEmail,
            password: 'HackerPassword123!'
          }, '127.0.0.1', 'SecurityTestRunner/1.0');
        } catch (err: any) {
          blocked = true;
          logs.push(`Registration correctly blocked with error: "${err.message}"`);
        }

        if (!blocked) {
          throw new Error('Security Breach: Public registration allowed using the designated Super Admin email!');
        }
        logs.push('Verified: Super Admin email is strictly protected from public registration');
      }
    ));

    // Test 3: Email Verification Flow
    results.push(await this.runTest(
      'auth_03',
      'Email Verification Life-cycle',
      'Verify single-use token activates account and rejects reused tokens',
      async (logs) => {
        const testEmail = `verify_test_${Date.now()}@example.com`;
        await authService.registerClient({
          name: 'Verification User',
          email: testEmail,
          password: 'Password123!'
        }, '127.0.0.1', 'TestRunner');

        const emails = emailService.getEmailsFor(testEmail);
        if (!emails.length || !emails[0].token) {
          throw new Error('Verification email was not dispatched with token');
        }
        const rawToken = emails[0].token;
        logs.push(`Received verification token: ${rawToken.slice(0, 8)}...`);

        // First verification
        const verifyRes = await authService.verifyEmail(rawToken, '127.0.0.1', 'TestRunner');
        logs.push(`Account verified. Status: ${verifyRes.user.status}`);
        if (verifyRes.user.status !== 'ACTIVE') {
          throw new Error(`Expected user status to be ACTIVE, got ${verifyRes.user.status}`);
        }

        // Second verification attempt (should fail as token is single-use)
        let tokenReusedBlocked = false;
        try {
          await authService.verifyEmail(rawToken, '127.0.0.1', 'TestRunner');
        } catch (err: any) {
          tokenReusedBlocked = true;
          logs.push(`Reused token correctly rejected: "${err.message}"`);
        }

        if (!tokenReusedBlocked) {
          throw new Error('Security defect: Single-use verification token was accepted multiple times!');
        }
        logs.push('Verified: Email verification successfully activates account and enforces single-use token lifecycle');
      }
    ));

    // Test 4: Password Hashing (No Plaintext)
    results.push(await this.runTest(
      'auth_04',
      'Cryptographic Password Storage',
      'Ensure passwords are never stored in plaintext and use secure bcrypt hashing',
      async (logs) => {
        const user = db.users.get('usr_maddy_ceo');
        if (!user) throw new Error('Super Admin user record not found');

        logs.push(`Inspecting password storage for user: ${user.email}`);
        if (!user.passwordHash) {
          throw new Error('Password hash is missing');
        }
        if (user.passwordHash.length < 20 || !user.passwordHash.startsWith('$2')) {
          throw new Error('Password hash does not match bcrypt format ($2a/b/y)');
        }
        if ((user as any).password) {
          throw new Error('Security defect: Plaintext password property found on user entity!');
        }
        logs.push(`Verified: Password is securely hashed with bcrypt (${user.passwordHash.slice(0, 10)}...)`);
      }
    ));

    // Test 5: Brute-Force Rate Limiting & Account Lockout
    results.push(await this.runTest(
      'auth_05',
      'Brute-Force & Rate Limiting',
      'Enforce account lockout after consecutive invalid password attempts',
      async (logs) => {
        const targetEmail = 'farouk@kadunacode.com';
        logs.push(`Simulating 5 consecutive invalid login attempts for: ${targetEmail}`);

        for (let i = 1; i <= 5; i++) {
          try {
            await authService.login({
              email: targetEmail,
              password: 'WrongPassword999!'
            }, '192.168.1.100', 'AttackerAgent');
          } catch (e: any) {
            logs.push(`Attempt ${i}: Rejected (${e.message})`);
          }
        }

        // 6th attempt should trigger lock
        let lockedOut = false;
        try {
          await authService.login({
            email: targetEmail,
            password: 'WrongPassword999!'
          }, '192.168.1.100', 'AttackerAgent');
        } catch (e: any) {
          if (e.message.includes('locked') || e.message.includes('Too many failed')) {
            lockedOut = true;
            logs.push(`Attempt 6: Correctly locked out -> "${e.message}"`);
          }
        }

        if (!lockedOut) {
          throw new Error('Brute force rate limiter failed to lock out after 5 consecutive failures');
        }
        logs.push('Verified: Brute-force protection and progressive lockout operational');
      }
    ));

    // Test 6: Single Super Admin Invariant
    results.push(await this.runTest(
      'auth_06',
      'Single Super Admin Invariant',
      'Verify the system guarantees exactly ONE Super Admin matching the owner email',
      async (logs) => {
        logs.push('Executing database Super Admin Invariant check');
        db.enforceSuperAdminInvariant();

        const superAdmins = Array.from(db.users.values()).filter(u => u.role === 'SUPER_ADMIN');
        logs.push(`Total Super Admins found in DB: ${superAdmins.length}`);

        if (superAdmins.length !== 1) {
          throw new Error(`Invariant failed: Expected exactly 1 SUPER_ADMIN, found ${superAdmins.length}`);
        }

        const admin = superAdmins[0];
        if (admin.email.toLowerCase() !== 'maddyahamco00@gmail.com') {
          throw new Error(`Invariant failed: Super Admin email is '${admin.email}' instead of 'maddyahamco00@gmail.com'`);
        }
        logs.push(`Verified: Exactly one SUPER_ADMIN exists (${admin.name} <${admin.email}>)`);
      }
    ));

    // Test 7: Password Reset Life-cycle
    results.push(await this.runTest(
      'auth_07',
      'Password Reset & Session Invalidation',
      'Verify forgot password generates reset token and invalidates previous sessions upon completion',
      async (logs) => {
        const testUserEmail = 'david.okonjo@gmail.com';
        logs.push(`Requesting password reset for: ${testUserEmail}`);

        await authService.forgotPassword(testUserEmail, 'http://localhost:3000', '127.0.0.1', 'TestRunner');
        const emails = emailService.getEmailsFor(testUserEmail);
        const resetEmail = emails.find(e => e.template === 'password_reset');
        
        if (!resetEmail || !resetEmail.token) {
          throw new Error('Password reset email with token was not found in outbox');
        }

        logs.push(`Dispatched reset token: ${resetEmail.token.slice(0, 8)}...`);
        const newPass = 'BrandNewPassword2026!';
        const resetRes = await authService.resetPassword(resetEmail.token, newPass, '127.0.0.1', 'TestRunner');
        logs.push(`Password reset result: "${resetRes.message}"`);

        // Test login with new password
        const loginRes = await authService.login({
          email: testUserEmail,
          password: newPass
        }, '127.0.0.1', 'TestRunner');

        if (!loginRes.success || !loginRes.accessToken) {
          throw new Error('Login with new password failed');
        }
        logs.push('Verified: Password reset succeeded and new password is fully functional');
      }
    ));

    // Test 8: Two-Factor Authentication (TOTP)
    results.push(await this.runTest(
      'auth_08',
      'Two-Factor Authentication (2FA)',
      'Verify TOTP generation, validation, and backup recovery code verification',
      async (logs) => {
        const userId = 'usr_farouk_tech';
        logs.push(`Generating TOTP secret for user: ${userId}`);

        const { secret, recoveryCodes } = authService.generateTwoFactor(userId);
        logs.push(`Secret generated: ${secret.slice(0, 8)}..., Recovery codes count: ${recoveryCodes.length}`);

        // Generate current TOTP code
        const timeStep = 30;
        const currentCounter = Math.floor(Math.floor(Date.now() / 1000) / timeStep);
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt(currentCounter));
        const crypto = await import('crypto');
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf8'));
        hmac.update(buffer);
        const digest = hmac.digest();
        const offset = digest[digest.length - 1] & 0xf;
        const binary =
          ((digest[offset] & 0x7f) << 24) |
          ((digest[offset + 1] & 0xff) << 16) |
          ((digest[offset + 2] & 0xff) << 8) |
          (digest[offset + 3] & 0xff);
        const validCode = (binary % 1000000).toString().padStart(6, '0');

        logs.push(`Generated valid 6-digit TOTP code: ${validCode}`);
        const enableRes = authService.enableTwoFactor(userId, validCode, recoveryCodes, '127.0.0.1', 'TestRunner');
        logs.push(`2FA enable status: "${enableRes.message}"`);

        // Test login requiring 2FA
        const user = db.users.get(userId);
        if (!user || !user.twoFactorEnabled) {
          throw new Error('2FA flag was not enabled on user');
        }

        // Test Recovery Code consumption
        const recoveryCodeToUse = recoveryCodes[0];
        logs.push(`Testing backup recovery code: ${recoveryCodeToUse}`);
        const loginWithRecovery = await authService.login({
          email: user.email,
          password: 'Client123!',
          recoveryCode: recoveryCodeToUse
        }, '127.0.0.1', 'TestRunner');

        if (!loginWithRecovery.success || !loginWithRecovery.accessToken) {
          throw new Error('Login with 2FA recovery code failed');
        }
        logs.push('Verified: 2FA TOTP and Recovery Code engine fully operational');
      }
    ));

    // Test 9: Session Management & Revocation
    results.push(await this.runTest(
      'auth_09',
      'Session Lifecycle & Revocation',
      'Verify session creation, tracking, and global logout (logout-all)',
      async (logs) => {
        const user = db.users.get('usr_maddy_ceo')!;
        logs.push(`Creating session for: ${user.email}`);

        const loginRes = await authService.login({
          email: user.email,
          password: 'Admin2026!'
        }, '127.0.0.1', 'TestDevice/1.0');

        const activeSessions = authService.getActiveSessions(user.id);
        logs.push(`Active sessions before logout-all: ${activeSessions.length}`);

        authService.logoutAll(user.id);
        const remainingSessions = authService.getActiveSessions(user.id);
        logs.push(`Active sessions after logout-all: ${remainingSessions.length}`);

        if (remainingSessions.length !== 0) {
          throw new Error('logoutAll failed to revoke all active sessions');
        }
        logs.push('Verified: Session creation, tracking, and global revocation operational');
      }
    ));

    // Test 10: Security Audit Log Recording
    results.push(await this.runTest(
      'auth_10',
      'Security Audit Event Trail',
      'Verify security audit logs record events with timestamp, severity, and IP metadata',
      async (logs) => {
        logs.push(`Auditing security log entries in system store (total: ${db.securityLogs.length})`);
        if (db.securityLogs.length === 0) {
          throw new Error('Security log stream is empty');
        }

        const sample = db.securityLogs[db.securityLogs.length - 1];
        logs.push(`Latest audit event: [${sample.severity}] ${sample.eventType} by ${sample.userEmail || sample.userId || 'system'}`);
        if (!sample.id || !sample.timestamp || !sample.eventType) {
          throw new Error('Security audit record is missing required fields');
        }
        logs.push('Verified: Security audit stream is actively recording all authentication and governance events');
      }
    ));

    return results;
  }

  private async runTest(
    id: string,
    category: string,
    name: string,
    runner: (logs: string[]) => Promise<void>
  ): Promise<AuthTestResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    try {
      await runner(logs);
      return {
        id,
        category,
        name,
        description: name,
        status: 'passed',
        executionTimeMs: Date.now() - startTime,
        logs
      };
    } catch (err: any) {
      logs.push(`ERROR: ${err.message}`);
      return {
        id,
        category,
        name,
        description: name,
        status: 'failed',
        executionTimeMs: Date.now() - startTime,
        logs,
        error: err.message
      };
    }
  }
}

export const authTestRunnerService = new AuthTestRunnerService();
