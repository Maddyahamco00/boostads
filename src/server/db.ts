import crypto from 'crypto';
import { passwordService } from './services/passwordService';
import { 
  Merchant, 
  Customer, 
  Payment, 
  PaymentQuote, 
  PaymentAttempt, 
  WebhookEvent, 
  LedgerEntry, 
  Settlement, 
  ReconciliationRecord, 
  RefundRecord, 
  AuditLog, 
  PlatformConfig,
  SupportedCurrency,
  CurrencyConfig,
  NigerianBank,
  UserProfile,
  UserEntity,
  ClientProfile,
  AuthSession,
  VerificationToken,
  SecurityAuditEvent,
  Business,
  OpeningHour,
  Product,
  Service,
  PortfolioItem,
  Advertisement,
  Invoice,
  ChatMessage,
  Conversation,
  PushNotification,
  Review,
  Report,
  Category,
  CategoryConfig,
  CategoryTreeNode,
  CreateCategoryInput,
  CreateSubcategoryInput,
  UpdateCategoryInput,
  BusinessCategory,
  SubscriptionPlan,
  PlatformStats,
  MultiPlatformCampaign,
  Lead,
  BusinessVerificationRequest,
  BusinessVerificationStatus
} from '../types';
import {
  validateCreateCategoryPayload,
  validateCreateSubcategoryPayload,
  validateAddSubcategoryItemPayload,
  validateUpdateCategoryPayload,
  slugifyCategory,
  MAX_CATEGORY_DEPTH
} from './validators/categoryValidators';
import { INITIAL_CATEGORY_SEEDS } from './seeds/categorySeeds';

export const SUPER_ADMIN_EMAIL = 'maddyahamco00@gmail.com';
export const SUPER_ADMIN_ID = 'usr_maddy_ceo';

/**
 * Robust verification helper for the designated executive Super Admin email.
 * Defends against:
 * - Case manipulation (mAdDyAhamCo00@GMAIL.COM)
 * - Leading/trailing and internal zero-width whitespace
 * - Gmail dot tricks (m.a.d.d.y.a.h.a.m.c.o.0.0@gmail.com)
 * - Gmail plus tag injection (maddyahamco00+attacker@gmail.com)
 * - Domain aliases (googlemail.com vs gmail.com)
 */
export function isDesignatedSuperAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const target = SUPER_ADMIN_EMAIL.toLowerCase();
  if (clean === target) return true;

  const [localPart, domain] = clean.split('@');
  const [targetLocal, targetDomain] = target.split('@');
  if (!localPart || !domain || !targetLocal || !targetDomain) return false;

  const isTargetGmail = targetDomain === 'gmail.com' || targetDomain === 'googlemail.com';
  const isInputGmail = domain === 'gmail.com' || domain === 'googlemail.com';

  if (isTargetGmail && isInputGmail) {
    const strippedInput = localPart.split('+')[0].replace(/\./g, '');
    const strippedTarget = targetLocal.split('+')[0].replace(/\./g, '');
    if (strippedInput === strippedTarget) {
      return true;
    }
  }

  return false;
}

export class DatabaseUniqueConstraintError extends Error {
  public readonly code = 'P2002'; // Standard Prisma / DB unique constraint code
  public readonly target: string[];
  constructor(message = 'Unique constraint failed on the fields: (`email`)', target: string[] = ['email']) {
    super(message);
    this.name = 'DatabaseUniqueConstraintError';
    this.target = target;
  }
}

export class DatabaseRoleConstraintError extends Error {
  public readonly code = 'ROLE_CONSTRAINT_VIOLATION';
  constructor(message = 'Role integrity constraint violation') {
    super(message);
    this.name = 'DatabaseRoleConstraintError';
  }
}

export class DatabaseValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  constructor(message = 'Database entity validation failed') {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseConcurrencyError extends Error {
  public readonly code = 'CONCURRENCY_CONFLICT';
  constructor(message = 'Database concurrent transaction conflict') {
    super(message);
    this.name = 'DatabaseConcurrencyError';
  }
}

export class DatabaseNotFoundError extends Error {
  public readonly code = 'RECORD_NOT_FOUND';
  constructor(message = 'Database record not found') {
    super(message);
    this.name = 'DatabaseNotFoundError';
  }
}

/**
 * Storage-Level Collection for Users that enforces Single-Super-Admin Invariants,
 * Email Normalization, and O(1) Unique Email Constraints.
 * Even direct operations cannot violate:
 * 1. MAXIMUM SUPER_ADMIN ACCOUNTS = 1
 * 2. Only designated executive email (maddyahamco00@gmail.com) can hold SUPER_ADMIN
 * 3. Primary Super Admin role cannot be demoted
 * 4. Unique email constraint across all user accounts
 * 5. Required authentication and identity fields cannot be empty or invalid
 */
export class UserCollection extends Map<string, UserEntity> {
  private emailIndex: Map<string, string> = new Map();

  override set(key: string, value: UserEntity): this {
    if (!value || typeof value !== 'object') {
      return super.set(key, value);
    }

    // 1. Validate required fields
    if (!value.id || typeof value.id !== 'string' || !value.id.trim()) {
      throw new DatabaseValidationError('User entity requires a valid non-empty "id".');
    }
    if (!value.name || typeof value.name !== 'string' || !value.name.trim()) {
      throw new DatabaseValidationError('User entity requires a valid non-empty "name".');
    }
    if (!value.email || typeof value.email !== 'string' || !value.email.trim()) {
      throw new DatabaseValidationError('User entity requires a valid non-empty "email".');
    }
    if (!value.role || (value.role !== 'SUPER_ADMIN' && value.role !== 'CLIENT')) {
      throw new DatabaseValidationError(`User role "${value.role}" is invalid. Permitted roles: SUPER_ADMIN, CLIENT.`);
    }
    const validStatuses = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'DELETED'];
    if (!value.status || !validStatuses.includes(value.status)) {
      throw new DatabaseValidationError(`User status "${value.status}" is invalid. Permitted statuses: ${validStatuses.join(', ')}.`);
    }

    // 2. Email normalization
    const normalizedEmail = value.email.toLowerCase().trim();
    value.email = normalizedEmail;

    // 3. Database-level Email Uniqueness Constraint (O(1) lookup via index)
    const existingId = this.emailIndex.get(normalizedEmail);
    if (existingId && existingId !== key) {
      throw new DatabaseUniqueConstraintError(
        `Unique constraint failed on the fields: (\`email\`). An account with email "${normalizedEmail}" already exists in the database.`
      );
    }

    // 4. Super Admin Invariant Enforcement
    if (value.role === 'SUPER_ADMIN') {
      // Rule 4a: Only designated executive email can hold SUPER_ADMIN
      if (!isDesignatedSuperAdminEmail(normalizedEmail)) {
        throw new DatabaseRoleConstraintError(
          `Role integrity violation: Account "${normalizedEmail}" cannot be assigned SUPER_ADMIN role. Only designated executive account (${SUPER_ADMIN_EMAIL}) is permitted.`
        );
      }

      // Rule 4b: Exactly one Super Admin allowed
      for (const [existingKey, existingUser] of this.entries()) {
        if (existingKey !== key && existingUser.role === 'SUPER_ADMIN') {
          throw new DatabaseRoleConstraintError(
            `Single Super Admin invariant violation: Another Super Admin account (${existingUser.email}) already exists. Maximum SUPER_ADMIN accounts = 1.`
          );
        }
      }
    } else {
      // Rule 4c: Prevent demotion of designated Super Admin
      const existingUser = super.get(key);
      if (existingUser && existingUser.role === 'SUPER_ADMIN' && isDesignatedSuperAdminEmail(existingUser.email)) {
        throw new DatabaseRoleConstraintError(
          'Primary Super Admin account role cannot be demoted or altered.'
        );
      }
    }

    // 5. Maintain Email Index
    const priorUser = super.get(key);
    if (priorUser && priorUser.email && priorUser.email !== normalizedEmail) {
      this.emailIndex.delete(priorUser.email);
    }
    this.emailIndex.set(normalizedEmail, key);

    return super.set(key, value);
  }

  override delete(key: string): boolean {
    const existing = super.get(key);
    if (existing && existing.email) {
      this.emailIndex.delete(existing.email.toLowerCase().trim());
    }
    return super.delete(key);
  }

  override clear(): void {
    this.emailIndex.clear();
    super.clear();
  }

  public getByEmail(email: string): UserEntity | undefined {
    if (!email || typeof email !== 'string') return undefined;
    const normalized = email.toLowerCase().trim();
    const userId = this.emailIndex.get(normalized);
    if (userId) {
      const user = super.get(userId);
      if (user) return user;
    }
    // Fallback scan in case of index sync edge case
    for (const u of this.values()) {
      if (u.email && u.email.toLowerCase().trim() === normalized) {
        this.emailIndex.set(normalized, u.id);
        return u;
      }
    }
    return undefined;
  }
}

/**
 * Storage-Level Indexed Collection for Verification and Password Reset Tokens.
 * Provides optimized indexing on tokenHash and userId for O(1) lookups,
 * and safe query helpers for active, expired, and used tokens.
 */
export class TokenCollection extends Map<string, VerificationToken> {
  private hashIndex: Map<string, string> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();

  override set(key: string, value: VerificationToken): this {
    if (value && typeof value === 'object') {
      // Remove any prior hash mapping if overwriting
      const existing = super.get(key);
      if (existing && existing.tokenHash && existing.tokenHash !== value.tokenHash) {
        this.hashIndex.delete(existing.tokenHash);
      }
      if (existing && existing.userId && existing.userId !== value.userId) {
        const oldSet = this.userIndex.get(existing.userId);
        if (oldSet) oldSet.delete(key);
      }

      if (value.tokenHash) {
        this.hashIndex.set(value.tokenHash, key);
      }
      if (value.userId) {
        let userSet = this.userIndex.get(value.userId);
        if (!userSet) {
          userSet = new Set();
          this.userIndex.set(value.userId, userSet);
        }
        userSet.add(key);
      }
    }
    return super.set(key, value);
  }

  override delete(key: string): boolean {
    const existing = super.get(key);
    if (existing) {
      if (existing.tokenHash) {
        this.hashIndex.delete(existing.tokenHash);
      }
      if (existing.userId) {
        const userSet = this.userIndex.get(existing.userId);
        if (userSet) {
          userSet.delete(key);
          if (userSet.size === 0) {
            this.userIndex.delete(existing.userId);
          }
        }
      }
    }
    return super.delete(key);
  }

  override clear(): void {
    this.hashIndex.clear();
    this.userIndex.clear();
    super.clear();
  }

  public findByHash(tokenHash: string, type?: VerificationToken['type']): VerificationToken | undefined {
    if (!tokenHash) return undefined;
    const tokenId = this.hashIndex.get(tokenHash);
    if (tokenId) {
      const token = super.get(tokenId);
      if (token && (!type || token.type === type)) {
        return token;
      }
    }
    // Fallback scan
    for (const t of this.values()) {
      if (t.tokenHash === tokenHash && (!type || t.type === type)) {
        return t;
      }
    }
    return undefined;
  }

  public findByUserId(userId: string, type?: VerificationToken['type']): VerificationToken[] {
    const results: VerificationToken[] = [];
    const tokenIds = this.userIndex.get(userId);
    if (tokenIds) {
      for (const id of tokenIds) {
        const t = super.get(id);
        if (t && (!type || t.type === type)) {
          results.push(t);
        }
      }
      return results;
    }
    // Fallback scan
    for (const t of this.values()) {
      if (t.userId === userId && (!type || t.type === type)) {
        results.push(t);
      }
    }
    return results;
  }

  public findActive(type?: VerificationToken['type'], nowMs: number = Date.now()): VerificationToken[] {
    const results: VerificationToken[] = [];
    for (const t of this.values()) {
      if ((!type || t.type === type) && !t.isUsed && new Date(t.expiresAt).getTime() > nowMs) {
        results.push(t);
      }
    }
    return results;
  }

  public findExpired(type?: VerificationToken['type'], nowMs: number = Date.now()): VerificationToken[] {
    const results: VerificationToken[] = [];
    for (const t of this.values()) {
      if ((!type || t.type === type) && new Date(t.expiresAt).getTime() <= nowMs) {
        results.push(t);
      }
    }
    return results;
  }

  public findUsed(type?: VerificationToken['type'], cutoffMs: number = Date.now()): VerificationToken[] {
    const results: VerificationToken[] = [];
    for (const t of this.values()) {
      if ((!type || t.type === type) && t.isUsed) {
        if (!t.usedAt || new Date(t.usedAt).getTime() <= cutoffMs) {
          results.push(t);
        }
      }
    }
    return results;
  }

  /**
   * Atomically consumes an active, unexpired token.
   * Returns success status, consumed token entity, or failure reason.
   */
  public consumeToken(
    tokenHash: string,
    type?: VerificationToken['type'],
    nowMs: number = Date.now()
  ): { success: boolean; token?: VerificationToken; reason?: string } {
    if (!tokenHash) {
      return { success: false, reason: 'Token hash is required for consumption.' };
    }

    const token = this.findByHash(tokenHash, type);
    if (!token) {
      return { success: false, reason: 'Verification link or token is invalid or does not exist.' };
    }

    if (token.isUsed || token.usedAt) {
      return { success: false, reason: 'This token has already been used.', token };
    }

    if (new Date(token.expiresAt).getTime() <= nowMs) {
      return { success: false, reason: 'This token has expired. Please request a new link.', token };
    }

    token.isUsed = true;
    token.usedAt = new Date().toISOString();
    return { success: true, token };
  }
}

/**
 * Storage-Level Indexed Collection for Authenticated User Sessions.
 * Provides:
 * - O(1) userId indexing for fast multi-device lookups & cascade revocation
 * - O(1) tokenHash indexing for fast session token verification
 * - Automatic expiration and revocation filtering
 * - Strict non-null and sensitive-field validation
 */
export class SessionCollection extends Map<string, AuthSession> {
  private userIndex: Map<string, Set<string>> = new Map();
  private tokenHashIndex: Map<string, string> = new Map();

  override set(key: string, value: AuthSession): this {
    if (!value || typeof value !== 'object') {
      return super.set(key, value);
    }

    // Required field validation
    if (!value.id || typeof value.id !== 'string') {
      throw new DatabaseValidationError('Session entity requires a non-empty string "id".');
    }
    if (!value.userId || typeof value.userId !== 'string') {
      throw new DatabaseValidationError('Session entity requires a non-empty string "userId".');
    }
    if (!value.email || typeof value.email !== 'string') {
      throw new DatabaseValidationError('Session entity requires a non-empty string "email".');
    }
    if (!value.role || (value.role !== 'SUPER_ADMIN' && value.role !== 'CLIENT')) {
      throw new DatabaseValidationError(`Session role "${value.role}" is invalid.`);
    }
    if (!value.tokenHash || typeof value.tokenHash !== 'string') {
      throw new DatabaseValidationError('Session entity requires a non-empty "tokenHash".');
    }
    if (!value.expiresAt || typeof value.expiresAt !== 'string') {
      throw new DatabaseValidationError('Session entity requires a valid "expiresAt" timestamp.');
    }

    // Ensure sensitive fields (passwords, secrets) are never persisted in session objects
    if ('passwordHash' in value || 'twoFactorSecret' in value || 'twoFactorRecoveryCodes' in value) {
      throw new DatabaseValidationError('Session entity cannot contain sensitive authentication credentials.');
    }

    // Normalize email
    value.email = value.email.toLowerCase().trim();

    // Clean prior index entries if overwriting
    const existing = super.get(key);
    if (existing) {
      if (existing.userId && existing.userId !== value.userId) {
        const oldSet = this.userIndex.get(existing.userId);
        if (oldSet) oldSet.delete(key);
      }
      if (existing.tokenHash && existing.tokenHash !== value.tokenHash) {
        this.tokenHashIndex.delete(existing.tokenHash);
      }
    }

    // Maintain indices
    if (value.userId) {
      let userSet = this.userIndex.get(value.userId);
      if (!userSet) {
        userSet = new Set();
        this.userIndex.set(value.userId, userSet);
      }
      userSet.add(key);
    }

    if (value.tokenHash) {
      this.tokenHashIndex.set(value.tokenHash, key);
    }

    return super.set(key, value);
  }

  override delete(key: string): boolean {
    const existing = super.get(key);
    if (existing) {
      if (existing.userId) {
        const userSet = this.userIndex.get(existing.userId);
        if (userSet) {
          userSet.delete(key);
          if (userSet.size === 0) {
            this.userIndex.delete(existing.userId);
          }
        }
      }
      if (existing.tokenHash) {
        this.tokenHashIndex.delete(existing.tokenHash);
      }
    }
    return super.delete(key);
  }

  override clear(): void {
    this.userIndex.clear();
    this.tokenHashIndex.clear();
    super.clear();
  }

  public findByUserId(userId: string): AuthSession[] {
    const results: AuthSession[] = [];
    const sessionIds = this.userIndex.get(userId);
    if (sessionIds) {
      for (const id of sessionIds) {
        const s = super.get(id);
        if (s) results.push(s);
      }
      return results;
    }
    for (const s of this.values()) {
      if (s.userId === userId) results.push(s);
    }
    return results;
  }

  public findActiveByUserId(userId: string, nowMs: number = Date.now()): AuthSession[] {
    return this.findByUserId(userId).filter(
      s => !s.isRevoked && new Date(s.expiresAt).getTime() > nowMs
    );
  }

  public findByTokenHash(tokenHash: string): AuthSession | undefined {
    if (!tokenHash) return undefined;
    const sessionId = this.tokenHashIndex.get(tokenHash);
    if (sessionId) {
      const s = super.get(sessionId);
      if (s) return s;
    }
    for (const s of this.values()) {
      if (s.tokenHash === tokenHash) return s;
    }
    return undefined;
  }

  public revokeById(sessionId: string): boolean {
    const session = super.get(sessionId);
    if (session) {
      session.isRevoked = true;
      return true;
    }
    return false;
  }

  public revokeAllForUser(userId: string, exceptSessionId?: string): number {
    let count = 0;
    const sessions = this.findByUserId(userId);
    for (const s of sessions) {
      if (!exceptSessionId || s.id !== exceptSessionId) {
        if (!s.isRevoked) {
          s.isRevoked = true;
          count++;
        }
      }
    }
    return count;
  }

  public cleanupExpired(nowMs: number = Date.now()): number {
    let removed = 0;
    for (const [id, s] of this.entries()) {
      if (new Date(s.expiresAt).getTime() <= nowMs) {
        this.delete(id);
        removed++;
      }
    }
    return removed;
  }

  public cleanupRevoked(retentionMs: number = 0, nowMs: number = Date.now()): number {
    let removed = 0;
    for (const [id, s] of this.entries()) {
      if (s.isRevoked) {
        const lastActive = new Date(s.lastActiveAt || s.createdAt).getTime();
        if (nowMs - lastActive >= retentionMs) {
          this.delete(id);
          removed++;
        }
      }
    }
    return removed;
  }
}

/**
 * Storage-Level Indexed Collection for Client User Profiles.
 * Enforces:
 * 1. 1-to-1 Uniqueness Constraint: Exactly one profile per authenticated user account (userId).
 * 2. Case-Insensitive Unique Username Constraint.
 * 3. Validation of non-empty identifiers and display name.
 */
export class ProfileCollection extends Map<string, ClientProfile> {
  private userIndex: Map<string, string> = new Map(); // userId -> profileId (1-to-1)
  private usernameIndex: Map<string, string> = new Map(); // normalizedUsername -> profileId

  override set(key: string, value: ClientProfile): this {
    if (!value || typeof value !== 'object') {
      return super.set(key, value);
    }

    if (!value.id || typeof value.id !== 'string' || !value.id.trim()) {
      throw new DatabaseValidationError('Profile requires a valid non-empty "id".');
    }

    if (!value.userId || typeof value.userId !== 'string' || !value.userId.trim()) {
      throw new DatabaseValidationError('Profile requires a valid non-empty "userId".');
    }

    if (!value.name || typeof value.name !== 'string' || !value.name.trim()) {
      throw new DatabaseValidationError('Profile requires a valid non-empty "name".');
    }

    // 1-to-1 Uniqueness Constraint on userId
    const existingForUser = this.userIndex.get(value.userId);
    if (existingForUser && existingForUser !== key) {
      throw new DatabaseUniqueConstraintError(
        `User "${value.userId}" already has an active profile (${existingForUser}). Duplicate profiles are forbidden.`
      );
    }

    // Uniqueness constraint on username (if provided)
    if (value.username && typeof value.username === 'string') {
      const normalizedUsername = value.username.toLowerCase().trim();
      const existingForUsername = this.usernameIndex.get(normalizedUsername);
      if (existingForUsername && existingForUsername !== key) {
        throw new DatabaseUniqueConstraintError(
          `Username "${value.username}" is already claimed by profile "${existingForUsername}".`
        );
      }
    }

    // Cleanup old indices if updating existing profile
    const existing = super.get(key);
    if (existing) {
      if (existing.userId && existing.userId !== value.userId) {
        this.userIndex.delete(existing.userId);
      }
      if (existing.username) {
        this.usernameIndex.delete(existing.username.toLowerCase().trim());
      }
    }

    // Record indices
    this.userIndex.set(value.userId, key);
    if (value.username) {
      this.usernameIndex.set(value.username.toLowerCase().trim(), key);
    }

    return super.set(key, value);
  }

  override delete(key: string): boolean {
    const existing = super.get(key);
    if (existing) {
      if (existing.userId) {
        this.userIndex.delete(existing.userId);
      }
      if (existing.username) {
        this.usernameIndex.delete(existing.username.toLowerCase().trim());
      }
    }
    return super.delete(key);
  }

  override clear(): void {
    this.userIndex.clear();
    this.usernameIndex.clear();
    super.clear();
  }

  public getByUserId(userId: string): ClientProfile | undefined {
    if (!userId) return undefined;
    const profileId = this.userIndex.get(userId);
    if (profileId) {
      return super.get(profileId);
    }
    // Fallback search
    for (const p of this.values()) {
      if (p.userId === userId) {
        return p;
      }
    }
    return undefined;
  }

  public getByUsername(username: string): ClientProfile | undefined {
    if (!username) return undefined;
    const profileId = this.usernameIndex.get(username.toLowerCase().trim());
    if (profileId) {
      return super.get(profileId);
    }
    return undefined;
  }

  public hasProfileForUser(userId: string): boolean {
    return this.userIndex.has(userId) || !!this.getByUserId(userId);
  }
}

export interface DatabaseTransactionContext {
  users: UserCollection;
  sessions: SessionCollection;
  tokens: TokenCollection;
  profiles: ProfileCollection;
  verificationRequests?: Map<string, BusinessVerificationRequest>;
  createUser(user: UserEntity): UserEntity;
  updateUser(userId: string, updates: Partial<UserEntity>): UserEntity;
  deleteUser(userId: string): boolean;
  deactivateUser(userId: string, status?: 'SUSPENDED' | 'DISABLED' | 'DELETED'): UserEntity;
  updateProfile?(userId: string, updates: Partial<ClientProfile>): ClientProfile;
  consumeToken(tokenHash: string, type?: VerificationToken['type']): VerificationToken;
  revokeAllUserSessions(userId: string): number;
}

export class DatabaseStore {
  // Core E-commerce & Marketplace Entities
  public users: UserCollection = new UserCollection();
  public sessions: SessionCollection = new SessionCollection();
  public tokens: TokenCollection = new TokenCollection();
  public profiles: ProfileCollection = new ProfileCollection();
  public securityLogs: SecurityAuditEvent[] = [];
  public businesses: Map<string, Business> = new Map();
  public verificationRequests: Map<string, BusinessVerificationRequest> = new Map();
  public products: Map<string, Product> = new Map();
  public services: Map<string, Service> = new Map();
  public portfolioItems: Map<string, PortfolioItem> = new Map();
  public advertisements: Map<string, Advertisement> = new Map();
  public campaigns: Map<string, MultiPlatformCampaign> = new Map();
  public leads: Map<string, Lead> = new Map();
  public invoices: Map<string, Invoice> = new Map();
  public conversations: Map<string, Conversation> = new Map();
  public messages: Map<string, ChatMessage> = new Map();
  public notifications: Map<string, PushNotification> = new Map();
  public reviews: Map<string, Review> = new Map();
  public reports: Map<string, Report> = new Map();
  public categories: Category[] = [];
  public businessCategories: Map<string, BusinessCategory> = new Map();
  public subscriptionPlans: SubscriptionPlan[] = [];

  // Financial & Settlement Entities
  public merchants: Map<string, Merchant> = new Map();
  public customers: Map<string, Customer> = new Map();
  public quotes: Map<string, PaymentQuote> = new Map();
  public payments: Map<string, Payment> = new Map();
  public paymentAttempts: Map<string, PaymentAttempt> = new Map();
  public webhookEvents: Map<string, WebhookEvent> = new Map();
  public processedEventIds: Set<string> = new Set();
  public ledgerEntries: LedgerEntry[] = [];
  public settlements: Map<string, Settlement> = new Map();
  public reconciliationRecords: ReconciliationRecord[] = [];
  public refunds: Map<string, RefundRecord> = new Map();
  public auditLogs: AuditLog[] = [];

  public platformConfig: PlatformConfig = {
    primaryProvider: 'flutterwave',
    secondaryProvider: 'paystack',
    providerFailoverEnabled: true,
    platformFeePercent: 1.5, // 1.5% platform fee
    fxSpreadPercent: 0.8, // 0.8% FX hedging spread
    quoteExpirationSeconds: 600, // 10 minutes rate lock
    autoSettlementEnabled: true,
    settlementSchedule: 'instant',
    fraudRiskThreshold: 80,
    webhookSecret: process.env.WEBHOOK_SECRET || 'flw_sec_hash_production_grade_9981'
  };

  public supportedCurrencies: CurrencyConfig[] = [
    {
      code: 'NGN',
      name: 'Nigerian Naira',
      symbol: '₦',
      flag: '🇳🇬',
      minAmount: 100,
      maxAmount: 100000000,
      supportedMethods: ['card', 'bank_transfer', 'ussd', 'qr'],
      enabled: true,
      settlementSupported: true
    },
    {
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      flag: '🇺🇸',
      minAmount: 1,
      maxAmount: 50000,
      supportedMethods: ['card', 'apple_pay', 'google_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'EUR',
      name: 'Euro (SEPA / Europe)',
      symbol: '€',
      flag: '🇪🇺',
      minAmount: 1,
      maxAmount: 50000,
      supportedMethods: ['card', 'apple_pay', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'GBP',
      name: 'British Pound Sterling',
      symbol: '£',
      flag: '🇬🇧',
      minAmount: 1,
      maxAmount: 40000,
      supportedMethods: ['card', 'apple_pay', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'AED',
      name: 'UAE Dirham (Dubai / GCC)',
      symbol: 'AED',
      flag: '🇦🇪',
      minAmount: 5,
      maxAmount: 150000,
      supportedMethods: ['card', 'apple_pay', 'google_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'CA$',
      flag: '🇨🇦',
      minAmount: 1,
      maxAmount: 60000,
      supportedMethods: ['card', 'google_pay', 'apple_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'ZAR',
      name: 'South African Rand',
      symbol: 'R',
      flag: '🇿🇦',
      minAmount: 20,
      maxAmount: 500000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'GHS',
      name: 'Ghanaian Cedi',
      symbol: 'GH₵',
      flag: '🇬🇭',
      minAmount: 10,
      maxAmount: 200000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'KES',
      name: 'Kenyan Shilling',
      symbol: 'KSh',
      flag: '🇰🇪',
      minAmount: 100,
      maxAmount: 5000000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    }
  ];

  public nigerianBanks: NigerianBank[] = [
    { name: 'Zenith Bank PLC', code: '057', ussdPrefix: '*966#' },
    { name: 'Guaranty Trust Bank (GTBank)', code: '058', ussdPrefix: '*737#' },
    { name: 'Access Bank PLC', code: '044', ussdPrefix: '*901#' },
    { name: 'First Bank of Nigeria', code: '011', ussdPrefix: '*894#' },
    { name: 'United Bank for Africa (UBA)', code: '033', ussdPrefix: '*919#' },
    { name: 'Stanbic IBTC Bank', code: '221', ussdPrefix: '*909#' },
    { name: 'Fidelity Bank PLC', code: '070', ussdPrefix: '*770#' },
    { name: 'Kuda Microfinance Bank', code: '50211', ussdPrefix: '*50211#' },
    { name: 'Moniepoint MFB', code: '50515', ussdPrefix: '*50515#' },
    { name: 'OPay Digital Services', code: '999992', ussdPrefix: '*955#' }
  ];

  constructor() {
    this.seedDatabase();
  }

  private seedDatabase() {
    // 1. Categories (Epic 3 Feature 3.1 Task 3.1.1: Idempotent Broad Sector Seeding)
    this.seedCategories();

    // 2. Subscription Plans
    this.subscriptionPlans = [
      {
        id: 'free',
        displayName: 'Starter Business',
        priceNGN: 0,
        priceUSD: 0,
        billingCycle: 'monthly',
        features: [
          'Standard verified business profile',
          'Up to 3 active advertisements',
          '5 portfolio project showcases',
          'Unlimited customer messaging',
          'Standard payment links & invoices',
          'Basic performance analytics'
        ],
        limits: {
          maxActiveAds: 3,
          maxPortfolioItems: 5,
          maxProducts: 10,
          aiGenerationsPerMonth: 3,
          prioritySearchRanking: false,
          verifiedGoldBadge: false,
          customDomain: false,
          analyticsTier: 'basic'
        }
      },
      {
        id: 'pro',
        displayName: 'Growth Booster Pro',
        priceNGN: 15000,
        priceUSD: 12,
        billingCycle: 'monthly',
        recommended: true,
        features: [
          'High-priority local discovery ranking',
          'Up to 25 active advertisements',
          'Unlimited portfolio showcases with HD video',
          'AI Advertising & Copywriting Assistant',
          '50% discount on boosted ad placements',
          'Verified Blue badge on listings',
          'Advanced customer CRM & export analytics',
          'Custom WhatsApp & Direct Call CTAs'
        ],
        limits: {
          maxActiveAds: 25,
          maxPortfolioItems: 50,
          maxProducts: 100,
          aiGenerationsPerMonth: 100,
          prioritySearchRanking: true,
          verifiedGoldBadge: true,
          customDomain: false,
          analyticsTier: 'advanced'
        }
      },
      {
        id: 'enterprise',
        displayName: 'Enterprise Corporate Suite',
        priceNGN: 45000,
        priceUSD: 35,
        billingCycle: 'monthly',
        features: [
          'Top-tier #1 search & category sponsor placement',
          'Unlimited advertisements & catalog products',
          'Unlimited AI marketing generation & visual prompts',
          'Golden Verified Corporate seal of trust',
          'Dedicated account manager & 24/7 priority support',
          'Multi-staff sub-accounts for sales teams',
          'Automated daily NGN settlement to commercial bank',
          'Full-featured invoicing & recurring billing'
        ],
        limits: {
          maxActiveAds: 999,
          maxPortfolioItems: 500,
          maxProducts: 1000,
          aiGenerationsPerMonth: 9999,
          prioritySearchRanking: true,
          verifiedGoldBadge: true,
          customDomain: true,
          analyticsTier: 'enterprise'
        }
      }
    ];

    // 3. Seed Users with Authentication Passwords and strictly enforced Roles
    const defaultPasswordHash = passwordService.hashSync('Client123!', 12);
    
    // Provision Super Admin idempotently without hardcoded plaintext passwords in source code
    this.provisionSuperAdmin();

    const bizUser1: UserEntity = {
      id: 'usr_farouk_tech',
      name: 'Farouk Usman',
      email: 'farouk@kadunacode.com',
      phone: '+2348021112233',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      bio: 'Lead Architect at Arewa Tech Labs - Building high-performance mobile apps & cloud platforms.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Barnawa Shopping Complex, Kaduna'
      },
      businessId: 'biz_arewa_tech',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser1.id, bizUser1);

    const bizUser2: UserEntity = {
      id: 'usr_amina_couture',
      name: 'Hajiya Amina Bello',
      email: 'amina@zeenatcouture.ng',
      phone: '+2348035557788',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      bio: 'Creative Director at Zeenat Northern Couture - Bespoke Northern Nigerian luxury Kaftans & bridal attire.',
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai Road, Commercial Area, Kano'
      },
      businessId: 'biz_zeenat_couture',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser2.id, bizUser2);

    const bizUser3: UserEntity = {
      id: 'usr_tunde_auto',
      name: 'Babajide Tunde',
      email: 'tunde@apexautolagos.com',
      phone: '+2348083334455',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'enterprise',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      bio: 'Master Certified Automobile Technician & Diagnostic Specialist at Apex Auto Works.',
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: 'Oregun Industrial Area, Ikeja, Lagos'
      },
      businessId: 'biz_apex_auto',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser3.id, bizUser3);

    const bizUser4: UserEntity = {
      id: 'usr_mallam_farms',
      name: 'Alhaji Sani Daurawa',
      email: 'sani@arewafreshfarms.ng',
      phone: '+2348067778899',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
      bio: 'Managing Partner at Savannah Agro & Grain Millers - Bulk grain, fertilizer and tractor services.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Zaria Road Agro Industrial Hub, Kaduna'
      },
      businessId: 'biz_savannah_agro',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser4.id, bizUser4);

    const customerUser: UserEntity = {
      id: 'usr_david_customer',
      name: 'David Okonjo',
      email: 'david.okonjo@gmail.com',
      phone: '+2348123456789',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'customer',
      tier: 'free',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      bio: 'Entrepreneur & Tech enthusiast looking for high-quality verified vendors & services.',
      location: {
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        lat: 9.0765,
        lng: 7.3986,
        address: 'Maitama District, Abuja'
      },
      savedAdIds: ['ad_zeenat_kaftan', 'ad_arewa_dev'],
      savedBusinessIds: ['biz_real_boosters', 'biz_zeenat_couture'],
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(customerUser.id, customerUser);

    // Seed initial client profiles for seeded clients
    const seededClients = [bizUser1, bizUser2, bizUser3, bizUser4, customerUser];
    for (const client of seededClients) {
      const profile: ClientProfile = {
        id: `prof_${client.id}`,
        userId: client.id,
        name: client.name,
        username: client.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
        bio: client.bio,
        phone: client.phone,
        clientType: client.clientType,
        avatarUrl: client.avatarUrl,
        location: client.location,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      };
      this.profiles.set(profile.id, profile);
      client.hasProfile = true;
      client.profileId = profile.id;
      client.username = profile.username;
      this.users.set(client.id, client);
    }

    // Enforce Super Admin Invariant check at startup
    this.enforceSuperAdminInvariant();

    // 4. Seed Businesses
    const bizRealBoosters: Business = {
      id: 'biz_real_boosters',
      ownerId: 'usr_maddy_ceo',
      name: 'Real Boosters Agency',
      slug: 'real-boosters',
      tagline: 'Premier Business Growth, Performance Advertising & Digital Marketing Agency',
      description: 'Real Boosters is the flagship venture led by Muhammad Kabir Ahmad (Maddy). We empower businesses with comprehensive digital transformation, brand design, targeted social advertising, SEO optimization, and corporate SaaS technology integration.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
      category: 'professional',
      categoryLabel: 'Professional & Digital Marketing Agency',
      subcategories: ['Brand Strategy', 'Performance Marketing', 'Corporate SaaS', 'Social Ads Campaign', 'SEO Optimization'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Plot 4, Independence Way, Commercial Central, Kaduna',
        serviceAreaKm: 100
      },
      phone: '+2348039876543',
      whatsapp: '+2348039876543',
      email: 'maddyahamco00@gmail.com',
      website: 'https://realboosters.com',
      openingHours: [
        { day: 'Mon - Fri', hours: '08:00 AM - 06:00 PM', isOpen: true },
        { day: 'Saturday', hours: '09:00 AM - 04:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'Closed', isOpen: false }
      ],
      rating: 4.9,
      reviewCount: 48,
      isVerified: true,
      tier: 'enterprise',
      featured: true,
      stats: {
        views: 18450,
        leads: 320,
        conversions: 89,
        totalRevenue: 6750000
      },
      socialLinks: {
        whatsapp: 'https://wa.me/2348039876543',
        instagram: 'https://instagram.com/realboosters',
        twitter: 'https://twitter.com/realboosters',
        linkedin: 'https://linkedin.com/company/realboosters'
      },
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    };
    this.businesses.set(bizRealBoosters.id, bizRealBoosters);

    const bizArewaTech: Business = {
      id: 'biz_arewa_tech',
      ownerId: 'usr_farouk_tech',
      name: 'Arewa Tech Labs',
      slug: 'arewa-tech-labs',
      tagline: 'Custom Full-Stack Web, Mobile Apps & Enterprise Cloud Software',
      description: 'We craft high-performance web applications, iOS/Android mobile solutions, payment gateway integrations (Flutterwave/Paystack), and modern SaaS cloud platforms for growing companies across Nigeria and the UK/US diaspora.',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
      category: 'tech_development',
      categoryLabel: 'Software & Cloud Engineering',
      subcategories: ['Full-Stack Web Apps', 'Mobile App Development', 'Flutterwave Integration', 'Cloud Architecture'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Suite 12, Barnawa Complex, Kaduna South',
        serviceAreaKm: 250
      },
      phone: '+2348021112233',
      whatsapp: '+2348021112233',
      email: 'farouk@kadunacode.com',
      website: 'https://arewatechlabs.io',
      openingHours: [
        { day: 'Mon - Sat', hours: '08:30 AM - 07:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'Remote on demand', isOpen: true }
      ],
      rating: 4.8,
      reviewCount: 32,
      isVerified: true,
      tier: 'pro',
      featured: true,
      stats: {
        views: 12300,
        leads: 185,
        conversions: 42,
        totalRevenue: 4200000
      },
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    };
    this.businesses.set(bizArewaTech.id, bizArewaTech);

    const bizZeenat: Business = {
      id: 'biz_zeenat_couture',
      ownerId: 'usr_amina_couture',
      name: 'Zeenat Northern Couture & Bridal',
      slug: 'zeenat-northern-couture',
      tagline: 'Luxury Northern Attire, Royal Kaftans, Handcrafted Aso-Ebi & Bridal Wear',
      description: 'Zeenat Northern Couture is a celebrated fashion house crafting custom embroidered Kaftans, flowing Babbar Riga, luxury silk veils, and bespoke bridal wardrobes using genuine European cashmere and pure cotton fabrics.',
      logoUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80',
      category: 'retail',
      categoryLabel: 'Fashion & Bespoke Tailoring',
      subcategories: ['Fashion & Apparel', 'Bespoke Tailoring', 'Bridal Attire', 'Luxury Kaftans'],
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai GRA, Commercial Arcade, Kano',
        serviceAreaKm: 500
      },
      phone: '+2348035557788',
      whatsapp: '+2348035557788',
      email: 'amina@zeenatcouture.ng',
      website: 'https://zeenatcouture.ng',
      openingHours: [
        { day: 'Mon - Sat', hours: '09:00 AM - 08:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'By Appointment Only', isOpen: false }
      ],
      rating: 5.0,
      reviewCount: 64,
      isVerified: true,
      tier: 'pro',
      featured: true,
      stats: {
        views: 22100,
        leads: 410,
        conversions: 128,
        totalRevenue: 8900000
      },
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString()
    };
    this.businesses.set(bizZeenat.id, bizZeenat);

    const bizApexAuto: Business = {
      id: 'biz_apex_auto',
      ownerId: 'usr_tunde_auto',
      name: 'Apex Auto Diagnostics & Engineering',
      slug: 'apex-auto-lagos',
      tagline: 'German & Japanese Vehicle Computer Diagnostics, Engine Rebuilding & AC Overhaul',
      description: 'State-of-the-art auto engineering garage equipped with OEM computerized diagnostic tools (Autel/Launch), certified master technicians, genuine replacement parts, and emergency mobile breakdown recovery across Lagos.',
      logoUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
      category: 'services',
      categoryLabel: 'Automobile Engineering & Diagnostics',
      subcategories: ['Auto Mechanic', 'Computer Diagnostics', 'Auto Spare Parts', 'Mobile Breakdown Recovery'],
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: '45 Kudirat Abiola Way, Oregun, Ikeja, Lagos',
        serviceAreaKm: 40
      },
      phone: '+2348083334455',
      whatsapp: '+2348083334455',
      email: 'tunde@apexautolagos.com',
      website: 'https://apexautolagos.com',
      openingHours: [
        { day: 'Mon - Sat', hours: '08:00 AM - 06:30 PM', isOpen: true },
        { day: 'Sunday', hours: 'Emergency Breakdown Callouts', isOpen: true }
      ],
      rating: 4.9,
      reviewCount: 51,
      isVerified: true,
      tier: 'enterprise',
      featured: true,
      stats: {
        views: 15700,
        leads: 290,
        conversions: 110,
        totalRevenue: 5400000
      },
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    this.businesses.set(bizApexAuto.id, bizApexAuto);

    const bizSavannahAgro: Business = {
      id: 'biz_savannah_agro',
      ownerId: 'usr_mallam_farms',
      name: 'Savannah Agro Mills & Machinery',
      slug: 'savannah-agro-kaduna',
      tagline: 'Wholesale Grain Supply, Soya Millers, Certified Seeds & Tractor Leasing',
      description: 'Direct farm-gate supply of high-grade dried maize, clean soya beans, sorghum, NPK fertilizers, and mechanized tractor plowing services for commercial farms in Kaduna, Kano, and Plateau States.',
      logoUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80',
      category: 'agriculture',
      categoryLabel: 'Agriculture & Farm Equipment',
      subcategories: ['Crop & Grain Supply', 'Agro-Chemicals & Fertilizers', 'Farm Machinery & Tractors', 'Livestock Feed'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Km 14 Zaria Express Highway, Rigachikun, Kaduna',
        serviceAreaKm: 300
      },
      phone: '+2348067778899',
      whatsapp: '+2348067778899',
      email: 'sani@arewafreshfarms.ng',
      website: 'https://savannahagro.ng',
      openingHours: [
        { day: 'Mon - Fri', hours: '07:30 AM - 05:30 PM', isOpen: true },
        { day: 'Saturday', hours: '08:00 AM - 02:00 PM', isOpen: true }
      ],
      rating: 4.7,
      reviewCount: 28,
      isVerified: true,
      tier: 'pro',
      featured: false,
      stats: {
        views: 9400,
        leads: 140,
        conversions: 35,
        totalRevenue: 12500000
      },
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString()
    };
    this.businesses.set(bizSavannahAgro.id, bizSavannahAgro);

    // 4b. Seed Business Categories (Join Table)
    const seedCategoriesForBiz = (bizId: string, primaryCatId: string) => {
      const catRec: BusinessCategory = {
        id: `bc_${bizId}_${primaryCatId}`,
        businessId: bizId,
        categoryId: primaryCatId,
        isPrimary: true,
        assignedAt: new Date().toISOString()
      };
      this.businessCategories.set(catRec.id, catRec);
      const biz = this.businesses.get(bizId);
      if (biz) {
        biz.categories = [primaryCatId];
        biz.businessCategories = [catRec];
      }
    };

    seedCategoriesForBiz('biz_maddy_realboosters', 'professional');
    seedCategoriesForBiz('biz_zeenat_couture', 'retail');
    seedCategoriesForBiz('biz_khemsafe_tech', 'tech_development');
    seedCategoriesForBiz('biz_arewa_motors', 'services');
    seedCategoriesForBiz('biz_savannah_agro', 'agriculture');

    // 5. Seed Products & Services
    const p1: Product = {
      id: 'prod_royal_kaftan',
      businessId: 'biz_zeenat_couture',
      name: 'Royal Northern Gold-Embroidered Kaftan (3-Piece Set)',
      description: 'Hand-tailored 100% fine cotton Kaftan featuring intricate gold thread neckline embroidery, matching trousers, and lightweight ceremonial cap.',
      price: 85000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80'],
      category: 'Fashion & Apparel',
      inStock: true,
      sku: 'ZNT-KFT-001',
      createdAt: new Date().toISOString()
    };
    this.products.set(p1.id, p1);

    const p2: Product = {
      id: 'prod_soya_beans',
      businessId: 'biz_savannah_agro',
      name: 'Clean Dried Soya Beans (100kg Jute Bag)',
      description: 'Grade-A cleaned yellow soya beans, moisture level < 10%, perfect for commercial feed mills and food processing plants.',
      price: 68000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'],
      category: 'Crop & Grain Supply',
      inStock: true,
      sku: 'SVN-SOY-100',
      createdAt: new Date().toISOString()
    };
    this.products.set(p2.id, p2);

    const s1: Service = {
      id: 'serv_saas_ad_campaign',
      businessId: 'biz_real_boosters',
      name: '30-Day Omnichannel Boost Ad & Lead Generation Package',
      description: 'Complete campaign setup: targeted Meta & Google ads, copywriting, creative design, conversion tracking, and 24/7 analytics monitoring.',
      startingPrice: 150000,
      currency: 'NGN',
      durationUnit: 'per month',
      imageUrls: ['https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop&q=80'],
      category: 'Performance Marketing',
      categoryId: 'professional',
      subcategoryId: 'sub_marketing_advertising',
      subcategoryName: 'Digital Marketing & Ads',
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    this.services.set(s1.id, s1);

    const s2: Service = {
      id: 'serv_mobile_app_dev',
      businessId: 'biz_arewa_tech',
      name: 'Custom Mobile Application (React Native / Flutter) MVP',
      description: 'End-to-end mobile development including UI/UX design, real-time backend API, payment integration, and App Store / Play Store deployment.',
      startingPrice: 850000,
      currency: 'NGN',
      durationUnit: 'per project (4 weeks)',
      imageUrls: ['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80'],
      category: 'Software & Cloud Engineering',
      categoryId: 'tech_development',
      subcategoryId: 'sub_mobile_app_dev',
      subcategoryName: 'Mobile Application Development',
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    this.services.set(s2.id, s2);

    const s3: Service = {
      id: 'serv_auto_diagnostics',
      businessId: 'biz_apex_auto',
      name: 'Full Vehicle OBD-II Computer Diagnostics & Live Sensor Inspection',
      description: 'Complete 120-point digital scan including engine ECU, transmission, ABS, airbag modules, and live fuel trim graphs with printable technician report.',
      startingPrice: 25000,
      currency: 'NGN',
      durationUnit: 'per vehicle',
      imageUrls: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80'],
      category: 'Automobile Engineering & Diagnostics',
      categoryId: 'services',
      subcategoryId: 'sub_auto_mechanic',
      subcategoryName: 'Auto Mechanic & Diagnostics',
      deliveryMode: 'on-premise',
      createdAt: new Date().toISOString()
    };
    this.services.set(s3.id, s3);

    const s4: Service = {
      id: 'serv_tractor_plowing',
      businessId: 'biz_savannah_agro',
      name: 'Commercial Farm Tractor Plowing & Mechanical Land Clearing',
      description: 'Heavy-duty 4WD tractor plowing, harrowing, and ridge preparation for large-scale agricultural acreage across Kaduna and neighboring states.',
      startingPrice: 45000,
      currency: 'NGN',
      durationUnit: 'per hectare',
      imageUrls: ['https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=80'],
      category: 'Agriculture & Farm Equipment',
      categoryId: 'agriculture',
      subcategoryId: 'sub_machinery_tractors',
      subcategoryName: 'Farm Machinery & Tractors',
      deliveryMode: 'at-client',
      createdAt: new Date().toISOString()
    };
    this.services.set(s4.id, s4);

    const s5: Service = {
      id: 'serv_bespoke_tailoring',
      businessId: 'biz_zeenat_couture',
      name: 'Bespoke Senator & Bridal Wear Custom Tailoring',
      description: 'Handcrafted luxury traditional attires, kaftans, Senator suits, and bridal gowns tailored to precise personal measurements with premium imported fabrics.',
      startingPrice: 35000,
      currency: 'NGN',
      durationUnit: 'per outfit',
      imageUrls: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80'],
      category: 'Fashion & Tailoring',
      categoryId: 'retail',
      subcategoryId: 'sub_fashion_tailoring',
      subcategoryName: 'Fashion Design & Tailoring',
      deliveryMode: 'at-client',
      createdAt: new Date().toISOString()
    };
    this.services.set(s5.id, s5);

    // 6. Seed Advertisements
    const ad1: Advertisement = {
      id: 'ad_real_boosters_growth',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'professional',
      title: 'Double Your Customer Enquiries & Revenue with Boost Market Ads',
      description: 'Ready to scale your business in Kaduna, Abuja, Lagos and beyond? Real Boosters creates high-converting digital advertising campaigns, interactive catalogs, and automated WhatsApp CRM systems tailored to your industry.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Professional & Business Services',
      subcategory: 'Performance Marketing',
      price: 150000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Independence Way, Kaduna'
      },
      tags: ['Marketing', 'Ads', 'Business Growth', 'Kaduna', 'Real Boosters'],
      targetRadiusKm: 50,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'homepage',
        durationDays: 30,
        budgetNGN: 45000,
        expiresAt: new Date(Date.now() + 25 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
      viewsCount: 4210,
      clicksCount: 384,
      enquiriesCount: 68,
      contactPhone: '+2348039876543',
      contactWhatsApp: '+2348039876543',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    };
    this.advertisements.set(ad1.id, ad1);

    const ad2: Advertisement = {
      id: 'ad_zeenat_kaftan',
      businessId: 'biz_zeenat_couture',
      businessName: 'Zeenat Northern Couture & Bridal',
      businessLogo: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'retail',
      title: 'Exclusive 2026 Northern Royal Kaftan & Aso-Ebi Collection',
      description: 'Step out in unmatched elegance. Hand-stitched with authentic Swiss Voile & Cashmere fabrics. Custom tailoring dispatched nationwide within 5 business days with door-to-door DHL delivery.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Retail & Commerce',
      subcategory: 'Fashion & Apparel',
      price: 85000,
      currency: 'NGN',
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai GRA, Kano'
      },
      tags: ['Fashion', 'Kaftan', 'Bridal', 'Kano', 'Luxury'],
      targetRadiusKm: 100,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'featured',
        durationDays: 14,
        budgetNGN: 25000,
        expiresAt: new Date(Date.now() + 10 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      viewsCount: 3120,
      clicksCount: 295,
      enquiriesCount: 52,
      contactPhone: '+2348035557788',
      contactWhatsApp: '+2348035557788',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    };
    this.advertisements.set(ad2.id, ad2);

    const ad3: Advertisement = {
      id: 'ad_arewa_dev',
      businessId: 'biz_arewa_tech',
      businessName: 'Arewa Tech Labs',
      businessLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'tech_development',
      title: 'Launch Your Business Mobile App & Web Portal in 21 Days',
      description: 'Get a modern, fast, and secure mobile application for iOS and Android with automated Flutterwave & Paystack checkout, push notifications, and admin dashboard. Free 3-month maintenance included.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Software, IT & Digital',
      subcategory: 'Mobile App Development',
      price: 850000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Barnawa, Kaduna'
      },
      tags: ['Mobile App', 'Web Development', 'Flutterwave', 'Kaduna Tech'],
      targetRadiusKm: 50,
      status: 'active',
      isBoosted: false,
      expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
      viewsCount: 1980,
      clicksCount: 160,
      enquiriesCount: 24,
      contactPhone: '+2348021112233',
      contactWhatsApp: '+2348021112233',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    };
    this.advertisements.set(ad3.id, ad3);

    const ad4: Advertisement = {
      id: 'ad_apex_diagnostics',
      businessId: 'biz_apex_auto',
      businessName: 'Apex Auto Diagnostics',
      businessLogo: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'services',
      title: 'Fix Check Engine Lights & Auto Electrical Faults with Precision',
      description: 'Avoid trial-and-error repairs. We diagnose all Mercedes, BMW, Toyota, Honda, and Ford error codes with OEM dealership equipment in Ikeja, Lagos. Fast 45-minute turnaround.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Services & Trades',
      subcategory: 'Auto Mechanic',
      price: 25000,
      currency: 'NGN',
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: 'Kudirat Abiola Way, Ikeja, Lagos'
      },
      tags: ['Auto Repair', 'Mechanic', 'Check Engine', 'Lagos'],
      targetRadiusKm: 25,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'category_top',
        durationDays: 7,
        budgetNGN: 15000,
        expiresAt: new Date(Date.now() + 5 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      viewsCount: 2540,
      clicksCount: 210,
      enquiriesCount: 44,
      contactPhone: '+2348083334455',
      contactWhatsApp: '+2348083334455',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    };
    this.advertisements.set(ad4.id, ad4);

    const ad5: Advertisement = {
      id: 'ad_savannah_soya',
      businessId: 'biz_savannah_agro',
      businessName: 'Savannah Agro Mills',
      businessLogo: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'agriculture',
      title: 'Bulk Premium Clean Dried Soya Beans & Maize (Truckload Supply)',
      description: 'Direct wholesale delivery from farm silos to processing plants across Nigeria. Moisture tested, stones removed, certified 100kg bags. Special bulk pricing for 10-ton to 30-ton orders.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Agriculture & Farm Produce',
      subcategory: 'Crop & Grain Supply',
      price: 68000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Zaria Road, Kaduna'
      },
      tags: ['Agriculture', 'Soya Beans', 'Grain Millers', 'Wholesale', 'Kaduna'],
      targetRadiusKm: 200,
      status: 'active',
      isBoosted: false,
      expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
      viewsCount: 1420,
      clicksCount: 88,
      enquiriesCount: 19,
      contactPhone: '+2348067778899',
      contactWhatsApp: '+2348067778899',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    };
    this.advertisements.set(ad5.id, ad5);

    // 7. Seed Portfolio Items
    const pf1: PortfolioItem = {
      id: 'pf_real_boosters_1',
      businessId: 'biz_real_boosters',
      title: 'Northern Agro Summit 2025 - 400% Lead Acceleration Campaign',
      description: 'Delivered end-to-end digital advertising generating 1,200 qualified agribusiness attendees across 8 Northern states in 14 days.',
      category: 'Performance Marketing',
      mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'Northern Agro Council',
      dateCompleted: 'November 2025',
      tags: ['Digital Ads', 'Social Marketing', 'Agribusiness']
    };
    this.portfolioItems.set(pf1.id, pf1);

    const pf2: PortfolioItem = {
      id: 'pf_zeenat_bridal',
      businessId: 'biz_zeenat_couture',
      title: 'Royal Kano Wedding - 12 Bespoke Velvet & Silk Ensembles',
      description: 'Designed and hand-embroidered complete bridal wardrobe for high-profile wedding in Kano, featuring Swarovski crystals and gold Zari work.',
      category: 'Bridal Fashion',
      mediaUrl: 'https://images.unsplash.com/photo-1546804784-896d0d517245?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'Aliyu & Fatima Royal Wedding',
      dateCompleted: 'January 2026',
      tags: ['Couture', 'Bridal Wear', 'Hand Embroidery']
    };
    this.portfolioItems.set(pf2.id, pf2);

    const pf3: PortfolioItem = {
      id: 'pf_arewa_fintech',
      businessId: 'biz_arewa_tech',
      title: 'QuickPay Merchant Wallet - iOS & Android Mobile App',
      description: 'Engineered a multi-currency payment wallet processing over ₦50M monthly with Flutterwave webhooks, biometric login, and offline QR scanning.',
      category: 'Mobile App',
      mediaUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'QuickPay Microfinance',
      dateCompleted: 'December 2025',
      tags: ['Fintech', 'React Native', 'Flutterwave API']
    };
    this.portfolioItems.set(pf3.id, pf3);

    const pf4: PortfolioItem = {
      id: 'pf_apex_engine_rebuild',
      businessId: 'biz_apex_auto',
      title: 'Mercedes-Benz E350 V6 Engine Overhaul & ECU Tuning',
      description: 'Full mechanical teardown, piston rings replacement, timing chain recalibration, and ECU remap restoring factory horsepower and 28% fuel efficiency gain.',
      category: 'Engine Rebuild',
      mediaUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=80',
      secondaryMediaUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      isBeforeAfter: true,
      beforeLabel: 'Worn Timing & Carbon Sludge',
      afterLabel: 'Precision Rebuilt & Dyno Tuned',
      clientName: 'Corporate Fleet Client',
      dateCompleted: 'January 2026',
      tags: ['Engine Overhaul', 'Mercedes-Benz', 'Diagnostics', 'Before & After']
    };
    this.portfolioItems.set(pf4.id, pf4);

    // 7.1 Seed Multi-Platform Campaigns
    const camp1: MultiPlatformCampaign = {
      id: 'camp_rb_omnichannel_1',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      title: 'Q1 High-Ticket SME Customer Acquisition Blitz',
      objective: 'more_leads',
      targetLocation: {
        name: 'Kaduna, Abuja & Kano Metros',
        radiusKm: 150,
        lat: 10.5105,
        lng: 7.4165
      },
      audience: {
        minAge: 25,
        maxAge: 55,
        gender: 'all',
        interests: ['Entrepreneurship', 'Small Business Growth', 'E-commerce', 'Wholesale Trade'],
        languages: ['English', 'Hausa']
      },
      totalBudgetNGN: 180000,
      adSpendBudgetNGN: 165000,
      platformFeeNGN: 15000,
      durationDays: 14,
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 9 * 86400000).toISOString(),
      status: 'active',
      selectedPlatforms: ['facebook', 'instagram', 'google', 'tiktok'],
      platformAllocations: [
        {
          platform: 'facebook',
          allocatedBudgetNGN: 60000,
          percentage: 36,
          estimatedReachMin: 45000,
          estimatedReachMax: 85000,
          estimatedClicksMin: 950,
          estimatedClicksMax: 1800,
          spentAmountNGN: 24500,
          impressions: 34200,
          reach: 22800,
          clicks: 640,
          leads: 28,
          conversions: 8,
          status: 'active'
        },
        {
          platform: 'instagram',
          allocatedBudgetNGN: 45000,
          percentage: 27,
          estimatedReachMin: 30000,
          estimatedReachMax: 60000,
          estimatedClicksMin: 600,
          estimatedClicksMax: 1200,
          spentAmountNGN: 18200,
          impressions: 21500,
          reach: 16400,
          clicks: 410,
          leads: 19,
          conversions: 5,
          status: 'active'
        },
        {
          platform: 'google',
          allocatedBudgetNGN: 40000,
          percentage: 25,
          estimatedReachMin: 15000,
          estimatedReachMax: 35000,
          estimatedClicksMin: 500,
          estimatedClicksMax: 900,
          spentAmountNGN: 15600,
          impressions: 11200,
          reach: 9800,
          clicks: 380,
          leads: 16,
          conversions: 6,
          status: 'active'
        },
        {
          platform: 'tiktok',
          allocatedBudgetNGN: 20000,
          percentage: 12,
          estimatedReachMin: 25000,
          estimatedReachMax: 70000,
          estimatedClicksMin: 400,
          estimatedClicksMax: 1100,
          spentAmountNGN: 8100,
          impressions: 29800,
          reach: 19500,
          clicks: 310,
          leads: 11,
          conversions: 2,
          status: 'active'
        }
      ],
      dailySpendCapNGN: 13000,
      spentSoFarNGN: 66400,
      remainingBudgetNGN: 98600,
      headline: 'Scale Your Business With Automated Leads & Multi-Platform Ads',
      primaryText: 'Stop wasting money on random boosting. Real Boosters deploys AI-targeted campaigns across Facebook, Instagram, Google, and TikTok that deliver verified buyer enquiries directly to your WhatsApp.',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      callToAction: 'Get Free Marketing Audit',
      destinationUrl: 'https://realboosters.com/audit',
      leadsCount: 74,
      conversionsCount: 21,
      costPerLeadNGN: 897,
      paymentId: 'pay_camp_001',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.campaigns.set(camp1.id, camp1);

    // 7.2 Seed CRM Leads
    const lead1: Lead = {
      id: 'lead_001',
      businessId: 'biz_real_boosters',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      customerPhone: '+2348039876543',
      customerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      source: 'boost_market',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'invoice_sent',
      estimatedValueNGN: 150000,
      notes: 'Interested in 30-day omnichannel advertising for Abuja expansion. Invoice BM-INV-2026-0891 sent.',
      lastContactedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      conversationId: 'conv_david_maddy',
      invoiceId: 'inv_001',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead1.id, lead1);

    const lead2: Lead = {
      id: 'lead_002',
      businessId: 'biz_real_boosters',
      customerId: 'usr_hajia_fatima',
      customerName: 'Hajia Fatima Balarabe',
      customerEmail: 'fatima.balarabe@kanotrade.ng',
      customerPhone: '+2348031234567',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      source: 'instagram',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'qualified',
      estimatedValueNGN: 350000,
      notes: 'Textile manufacturing company in Kano looking for nationwide distributor acquisition.',
      lastContactedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead2.id, lead2);

    const lead3: Lead = {
      id: 'lead_003',
      businessId: 'biz_real_boosters',
      customerId: 'usr_tunde_auto',
      customerName: 'Engr. Babatunde Adeleke',
      customerEmail: 'tunde@adeleke-engineering.com',
      customerPhone: '+2348028889900',
      customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      source: 'google',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'new',
      estimatedValueNGN: 500000,
      notes: 'Industrial generator maintenance company seeking corporate leads in Kaduna and Abuja.',
      lastContactedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead3.id, lead3);

    // 8. Seed Invoices
    const inv1: Invoice = {
      id: 'inv_001',
      invoiceNumber: 'BM-INV-2026-0891',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      description: 'Monthly Boost Market Growth Advertising Package & CRM Integration',
      items: [
        { id: 'item_1', description: 'Performance Advertising Setup & Optimization', quantity: 1, unitPrice: 120000, amount: 120000 },
        { id: 'item_2', description: 'Custom Creative Design & Video Reels (4 sets)', quantity: 1, unitPrice: 30000, amount: 30000 }
      ],
      subtotal: 150000,
      taxPercent: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 150000,
      currency: 'NGN',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    };
    this.invoices.set(inv1.id, inv1);

    const inv2: Invoice = {
      id: 'inv_002',
      invoiceNumber: 'BM-INV-2026-0742',
      businessId: 'biz_zeenat_couture',
      businessName: 'Zeenat Northern Couture',
      businessLogo: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      description: 'Custom Gold-Embroidered Kaftan Set & Express Courier Delivery',
      items: [
        { id: 'item_1', description: 'Bespoke Royal Kaftan 3-Piece Set', quantity: 1, unitPrice: 85000, amount: 85000 },
        { id: 'item_2', description: 'DHL Express Door Delivery (Kano -> Abuja)', quantity: 1, unitPrice: 5000, amount: 5000 }
      ],
      subtotal: 90000,
      taxPercent: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 90000,
      currency: 'NGN',
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      status: 'paid',
      paymentMethod: 'Flutterwave Card',
      transactionRef: 'FLW_MOCK_88291039',
      paidAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    };
    this.invoices.set(inv2.id, inv2);

    // 9. Seed Conversations & Messages
    const conv1: Conversation = {
      id: 'conv_david_maddy',
      participants: ['usr_david_customer', 'usr_maddy_ceo'],
      participantDetails: [
        { id: 'usr_david_customer', name: 'David Okonjo', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80', role: 'customer' },
        { id: 'usr_maddy_ceo', name: 'Muhammad Kabir Ahmad (Maddy)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', role: 'ceo', businessName: 'Real Boosters Agency', online: true }
      ],
      unreadCount: 1,
      updatedAt: new Date().toISOString()
    };
    this.conversations.set(conv1.id, conv1);

    const msg1: ChatMessage = {
      id: 'msg_1',
      conversationId: 'conv_david_maddy',
      senderId: 'usr_david_customer',
      senderName: 'David Okonjo',
      text: 'Hello Maddy! I saw your Boost Market advertisement. We want to run a targeted advertising campaign for our new branch in Abuja.',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    };
    this.messages.set(msg1.id, msg1);

    const msg2: ChatMessage = {
      id: 'msg_2',
      conversationId: 'conv_david_maddy',
      senderId: 'usr_maddy_ceo',
      senderName: 'Muhammad Kabir Ahmad (Maddy)',
      text: 'Salam David! Absolutely, Real Boosters has extensive reach in Abuja and Northern business corridors. I have generated a custom invoice with our 30-Day Omnichannel Boost package below.',
      invoiceRef: inv1,
      deliveryStatus: 'delivered',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };
    this.messages.set(msg2.id, msg2);

    conv1.lastMessage = msg2;

    // 10. Seed Notifications
    const notif1: PushNotification = {
      id: 'notif_1',
      userId: 'usr_maddy_ceo',
      title: 'New Customer Enquiry',
      message: 'David Okonjo sent a message regarding your Real Boosters advertising campaign.',
      type: 'message',
      read: false,
      link: '/messages',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    };
    this.notifications.set(notif1.id, notif1);

    const notif2: PushNotification = {
      id: 'notif_2',
      userId: 'usr_amina_couture',
      title: 'Payment Received (₦90,000)',
      message: 'Invoice BM-INV-2026-0742 paid by David Okonjo via Flutterwave. Settled to Zenith Bank.',
      type: 'payment',
      read: true,
      link: '/merchant',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    };
    this.notifications.set(notif2.id, notif2);

    const notif3: PushNotification = {
      id: 'notif_3',
      userId: 'usr_maddy_ceo',
      title: 'Advertisement Boost Active',
      message: 'Your ad "Double Your Customer Enquiries" is currently boosted on Homepage Spotlight.',
      type: 'ad_status',
      read: true,
      link: '/merchant',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    };
    this.notifications.set(notif3.id, notif3);

    // 11. Seed Reviews
    const rev1: Review = {
      id: 'rev_1',
      businessId: 'biz_real_boosters',
      authorId: 'usr_farouk_tech',
      authorName: 'Farouk Usman',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'Real Boosters transformed our software agency leads. Maddy and his team set up our advertising campaigns and we gained 4 corporate clients in week one!',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    };
    this.reviews.set(rev1.id, rev1);

    const rev2: Review = {
      id: 'rev_2',
      businessId: 'biz_zeenat_couture',
      authorId: 'usr_david_customer',
      authorName: 'David Okonjo',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'The quality of the Kaftan is breathtaking. Perfectly fitted, premium fabric, and received the invoice and paid through Boost Market smoothly.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    };
    this.reviews.set(rev2.id, rev2);

    // 12. Seed Merchant for Financial Integration
    const merchantMaddy: Merchant = {
      id: 'mer_real_boosters',
      businessName: 'Real Boosters Agency Ltd',
      email: 'maddyahamco00@gmail.com',
      country: 'Nigeria',
      settlementCurrency: 'NGN',
      settlementBank: 'Zenith Bank PLC',
      settlementBankCode: '057',
      settlementAccountNumber: '1018892044',
      settlementAccountName: 'REAL BOOSTERS ENTERPRISE',
      verificationStatus: 'verified',
      kycTier: 'corporate_tier_3',
      dailyLimitNGN: 50000000,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.merchants.set(merchantMaddy.id, merchantMaddy);

    // Run database migrations on initialization
    this.runMigrations();
  }

  public getUserByEmail(email: string): UserEntity | undefined {
    return this.users.getByEmail(email);
  }

  /**
   * Idempotent Super Admin Account Provisioning.
   * Guarantees:
   * - Exactly ONE designated Super Admin ("maddyahamco00@gmail.com")
   * - No duplicate accounts
   * - No unintended credential overwrites
   * - Safe upgrade if user existed as CLIENT
   * - Secure initial password hashing (from env or high-entropy random hash; never hardcoded in source code)
   */
  public provisionSuperAdmin(explicitPassword?: string): UserEntity {
    const normalizedAdminEmail = SUPER_ADMIN_EMAIL.toLowerCase().trim();

    // 1. Demote any rogue non-designated accounts holding SUPER_ADMIN
    for (const [id, user] of this.users.entries()) {
      if (user.email.toLowerCase().trim() !== normalizedAdminEmail && user.role === 'SUPER_ADMIN') {
        console.warn(`[Security Invariant] Demoting unauthorized SUPER_ADMIN: ${user.email} -> CLIENT`);
        user.role = 'CLIENT';
        user.updatedAt = new Date().toISOString();
        this.users.set(id, user);
      }
    }

    // 2. Check if the designated Super Admin account already exists (by ID or normalized email)
    let admin = this.users.get(SUPER_ADMIN_ID) || this.getUserByEmail(normalizedAdminEmail);

    if (admin) {
      // Existing Account Conflict / Update Resolution:
      // Ensure role is SUPER_ADMIN, status is ACTIVE, and enterprise tier
      admin.email = normalizedAdminEmail;
      admin.role = 'SUPER_ADMIN';
      admin.status = 'ACTIVE';
      admin.tier = 'enterprise';
      if (!admin.emailVerifiedAt) {
        admin.emailVerifiedAt = new Date().toISOString();
      }

      // If an explicit password override was passed, update hash
      if (explicitPassword) {
        admin.passwordHash = passwordService.hashSync(explicitPassword, 12);
      } else if (!admin.passwordHash) {
        // If no password hash exists yet, inspect env var or generate high-entropy secure seed hash
        const envPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_INITIAL_PASSWORD;
        if (envPassword) {
          admin.passwordHash = passwordService.hashSync(envPassword, 12);
        } else {
          // Cryptographically secure seed hash; Super Admin can sign in using env password or setup token
          const randomSeed = crypto.randomBytes(32).toString('hex') + '!Aa1';
          admin.passwordHash = passwordService.hashSync(randomSeed, 12);
        }
      }
      // If admin already had a valid passwordHash and no explicit override is provided,
      // we PRESERVE it to prevent unintended resets.

      admin.updatedAt = new Date().toISOString();
      this.users.set(admin.id, admin);
      return admin;
    }

    // 3. First-time creation of the single Super Admin
    const envPassword = explicitPassword || process.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_INITIAL_PASSWORD;
    const initialHash = envPassword 
      ? passwordService.hashSync(envPassword, 12)
      : passwordService.hashSync(crypto.randomBytes(32).toString('hex') + '!Aa1', 12);

    const newAdmin: UserEntity = {
      id: SUPER_ADMIN_ID,
      name: 'Muhammad Kabir Ahmad (Maddy)',
      email: normalizedAdminEmail,
      phone: '+2348039876543',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tier: 'enterprise',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Founder & CEO of Real Boosters / Boost Market. Empowering African and global businesses with world-class discovery, advertising, and instant settlement.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Real Boosters HQ, Independence Way, Kaduna'
      },
      businessId: 'biz_real_boosters',
      passwordHash: initialHash,
      emailVerifiedAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.set(newAdmin.id, newAdmin);
    return newAdmin;
  }

  /**
   * Database-Level User Creation with Strict UNIQUE and Role Constraints.
   * Prevents race conditions, duplicate accounts, and unauthorized role escalation.
   */
  public createUser(user: UserEntity): UserEntity {
    if (!user || !user.email) {
      throw new Error('User email is required for entity persistence');
    }
    const normalizedEmail = user.email.toLowerCase().trim();

    // 1. Role Integrity Constraint: Only designated email can hold SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      if (!isDesignatedSuperAdminEmail(normalizedEmail)) {
        throw new DatabaseRoleConstraintError(
          `Role integrity violation: Only designated executive email (${SUPER_ADMIN_EMAIL}) can be assigned SUPER_ADMIN role.`
        );
      }
      // Single Super Admin Invariant: Check if another Super Admin already exists
      const existingSuperAdmin = Array.from(this.users.values()).find(
        u => u.role === 'SUPER_ADMIN' && u.id !== user.id
      );
      if (existingSuperAdmin) {
        throw new DatabaseRoleConstraintError(
          'Single Super Admin invariant violation: A Super Admin account already exists. Maximum SUPER_ADMIN accounts = 1.'
        );
      }
    } else {
      // Non-admin user cannot be created with designated Super Admin email
      if (isDesignatedSuperAdminEmail(normalizedEmail)) {
        throw new DatabaseRoleConstraintError(
          `Role integrity violation: Account with designated executive email (${SUPER_ADMIN_EMAIL}) must be provisioned through designated Super Admin initialization, not client creation.`
        );
      }
    }

    // 2. Email Unique Constraint Check
    const existing = Array.from(this.users.values()).find(
      u => u.email.toLowerCase().trim() === normalizedEmail
    );

    if (existing) {
      throw new DatabaseUniqueConstraintError(
        `Unique constraint failed on the fields: (\`email\`). An account with email "${normalizedEmail}" already exists in the database.`
      );
    }

    user.email = normalizedEmail;
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Database-Level User Updates with Role & Identity Integrity Guards.
   */
  public updateUser(userId: string, updates: Partial<UserEntity>): UserEntity {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    // 1. Guard Email Updates
    if (updates.email) {
      const normalizedNewEmail = updates.email.toLowerCase().trim();
      if (normalizedNewEmail !== user.email.toLowerCase().trim()) {
        // Prevent claiming Super Admin email by normal users
        if (isDesignatedSuperAdminEmail(normalizedNewEmail) && user.role !== 'SUPER_ADMIN') {
          throw new DatabaseRoleConstraintError(
            `Unauthorized email update: "${SUPER_ADMIN_EMAIL}" is restricted for executive governance.`
          );
        }
        // Check uniqueness
        const duplicate = Array.from(this.users.values()).find(
          u => u.id !== userId && u.email.toLowerCase().trim() === normalizedNewEmail
        );
        if (duplicate) {
          throw new DatabaseUniqueConstraintError(
            `Unique constraint failed on the fields: (\`email\`). Email "${normalizedNewEmail}" is already in use.`
          );
        }
        user.email = normalizedNewEmail;
      }
    }

    // 2. Guard Role Updates
    if (updates.role) {
      if (updates.role === 'SUPER_ADMIN') {
        if (!isDesignatedSuperAdminEmail(user.email)) {
          throw new DatabaseRoleConstraintError(
            `Role escalation blocked: Only "${SUPER_ADMIN_EMAIL}" can be assigned the SUPER_ADMIN role.`
          );
        }
        // Invariant: Ensure no other Super Admin exists
        const existingOther = Array.from(this.users.values()).find(
          u => u.role === 'SUPER_ADMIN' && u.id !== userId
        );
        if (existingOther) {
          throw new DatabaseRoleConstraintError(
            'Single Super Admin invariant violation: A Super Admin account already exists. Maximum SUPER_ADMIN accounts = 1.'
          );
        }
      }
      if (user.role === 'SUPER_ADMIN' && updates.role !== 'SUPER_ADMIN') {
        throw new DatabaseRoleConstraintError(
          'Primary Super Admin account role cannot be demoted or altered.'
        );
      }
      user.role = updates.role;
    }

    // 3. Apply general safe fields
    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.username !== undefined) user.username = updates.username ? updates.username.trim() : undefined;
    if (updates.hasProfile !== undefined) user.hasProfile = updates.hasProfile;
    if (updates.profileId !== undefined) user.profileId = updates.profileId;
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    if (updates.location !== undefined) user.location = updates.location;
    if (updates.clientType !== undefined) user.clientType = updates.clientType;
    if (updates.tier !== undefined) user.tier = updates.tier;
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.businessId !== undefined) user.businessId = updates.businessId;
    if (updates.passwordHash !== undefined) user.passwordHash = updates.passwordHash;
    if (updates.emailVerifiedAt !== undefined) user.emailVerifiedAt = updates.emailVerifiedAt;
    if (updates.twoFactorEnabled !== undefined) user.twoFactorEnabled = updates.twoFactorEnabled;
    if (updates.twoFactorSecret !== undefined) user.twoFactorSecret = updates.twoFactorSecret;
    if (updates.twoFactorRecoveryCodes !== undefined) user.twoFactorRecoveryCodes = updates.twoFactorRecoveryCodes;
    if (updates.failedLoginAttempts !== undefined) user.failedLoginAttempts = updates.failedLoginAttempts;
    if (updates.lockedUntil !== undefined) user.lockedUntil = updates.lockedUntil;

    user.updatedAt = new Date().toISOString();
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Database-Level Profile Creation with 1-to-1 and Username Uniqueness Constraints.
   */
  public createProfile(profile: ClientProfile): ClientProfile {
    if (!profile || !profile.userId) {
      throw new DatabaseValidationError('Profile requires a valid "userId".');
    }

    const user = this.users.get(profile.userId);
    if (!user) {
      throw new DatabaseNotFoundError(`User with ID "${profile.userId}" not found.`);
    }

    if (user.role !== 'CLIENT') {
      throw new DatabaseRoleConstraintError('Only CLIENT accounts can create user profiles.');
    }

    // 1-to-1 Uniqueness Check
    if (this.profiles.hasProfileForUser(profile.userId)) {
      throw new DatabaseUniqueConstraintError(
        `User "${profile.userId}" already has a registered profile. Duplicate profiles are forbidden.`
      );
    }

    // Username Uniqueness Check (if provided)
    if (profile.username) {
      const normalized = profile.username.toLowerCase().trim();
      const existingUsername = this.profiles.getByUsername(normalized);
      if (existingUsername && existingUsername.userId !== profile.userId) {
        throw new DatabaseUniqueConstraintError(
          `Username "${profile.username}" is already claimed by another user.`
        );
      }
    }

    this.profiles.set(profile.id, profile);
    user.hasProfile = true;
    user.profileId = profile.id;
    if (profile.name) user.name = profile.name.trim();
    if (profile.username) user.username = profile.username.trim();
    if (profile.bio) user.bio = profile.bio.trim();
    if (profile.phone) user.phone = profile.phone.trim();
    if (profile.contactEmail) user.contactEmail = profile.contactEmail.trim().toLowerCase();
    if (profile.clientType) user.clientType = profile.clientType;
    if (profile.location) user.location = profile.location;
    user.updatedAt = new Date().toISOString();
    this.users.set(user.id, user);

    return profile;
  }

  /**
   * Database-Level Profile Editing with Safe Partial Updates and Username Uniqueness (Epic 2 Task 2.1.2).
   */
  public updateProfile(userId: string, updates: Partial<ClientProfile>): ClientProfile {
    if (!userId) {
      throw new DatabaseValidationError('Profile update requires a valid "userId".');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new DatabaseNotFoundError(`User with ID "${userId}" not found.`);
    }

    let profile = this.profiles.getByUserId(userId);

    // If user does not have a profile yet, auto-provision one using base user details
    if (!profile) {
      const newProfile: ClientProfile = {
        id: `prof_${crypto.randomBytes(8).toString('hex')}`,
        userId,
        name: (updates.name && updates.name.trim()) || user.name,
        username: updates.username ? updates.username.trim() : user.username,
        phone: updates.phone !== undefined ? updates.phone : user.phone,
        contactEmail: updates.contactEmail !== undefined ? updates.contactEmail : user.contactEmail,
        clientType: updates.clientType || user.clientType || 'customer',
        bio: updates.bio !== undefined ? updates.bio : user.bio,
        avatarUrl: updates.avatarUrl !== undefined ? (updates.avatarUrl || undefined) : user.avatarUrl,
        avatarKey: updates.avatarKey !== undefined ? (updates.avatarKey || undefined) : user.avatarKey,
        location: updates.location || user.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return this.createProfile(newProfile);
    }

    // Check username uniqueness if username is being updated or changed
    if (updates.username !== undefined) {
      const trimmedUsername = updates.username ? updates.username.trim() : undefined;
      if (trimmedUsername) {
        const normalized = trimmedUsername.toLowerCase();
        const existingWithUsername = this.profiles.getByUsername(normalized);
        if (existingWithUsername && existingWithUsername.userId !== userId) {
          throw new DatabaseUniqueConstraintError(
            `Username "${trimmedUsername}" is already claimed by another user.`
          );
        }
        profile.username = trimmedUsername;
      } else {
        delete profile.username;
      }
    }

    // Safe partial updates without overwriting unprovided fields
    if (updates.name !== undefined && typeof updates.name === 'string' && updates.name.trim()) {
      profile.name = updates.name.trim();
    }
    if (updates.bio !== undefined && typeof updates.bio === 'string') {
      profile.bio = updates.bio.trim();
    }
    if (updates.phone !== undefined) {
      if (updates.phone === null || updates.phone === '') {
        delete profile.phone;
        delete user.phone;
      } else if (typeof updates.phone === 'string') {
        profile.phone = updates.phone.trim();
      }
    }
    if (updates.contactEmail !== undefined) {
      if (updates.contactEmail === null || updates.contactEmail === '') {
        delete profile.contactEmail;
        delete user.contactEmail;
      } else if (typeof updates.contactEmail === 'string') {
        profile.contactEmail = updates.contactEmail.trim().toLowerCase();
      }
    }
    if (updates.clientType !== undefined) {
      profile.clientType = updates.clientType;
    }
    if (updates.avatarUrl !== undefined) {
      if (updates.avatarUrl === null || updates.avatarUrl === '') {
        delete profile.avatarUrl;
        delete profile.avatarKey;
      } else if (typeof updates.avatarUrl === 'string') {
        profile.avatarUrl = updates.avatarUrl.trim();
      }
    }
    if (updates.avatarKey !== undefined) {
      if (updates.avatarKey === null || updates.avatarKey === '') {
        delete profile.avatarKey;
      } else if (typeof updates.avatarKey === 'string') {
        profile.avatarKey = updates.avatarKey.trim();
      }
    }
    if (updates.location !== undefined && typeof updates.location === 'object') {
      profile.location = {
        ...(profile.location || { city: '', state: '', country: 'Nigeria', lat: 9.0820, lng: 8.6753 }),
        ...updates.location
      };
    }

    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profile.id, profile);

    // Synchronize user entity
    if (profile.name) user.name = profile.name;
    if (profile.username !== undefined) user.username = profile.username;
    if (profile.bio !== undefined) user.bio = profile.bio;
    if (profile.phone !== undefined) user.phone = profile.phone;
    if (profile.contactEmail !== undefined) {
      user.contactEmail = profile.contactEmail;
    } else {
      delete user.contactEmail;
    }
    if (profile.clientType) user.clientType = profile.clientType;
    if (updates.avatarUrl !== undefined) {
      if (profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      } else {
        delete user.avatarUrl;
        delete user.avatarKey;
      }
    }
    if (updates.avatarKey !== undefined) {
      if (profile.avatarKey) {
        user.avatarKey = profile.avatarKey;
      } else {
        delete user.avatarKey;
      }
    }
    if (profile.location) user.location = profile.location;
    user.hasProfile = true;
    user.profileId = profile.id;
    user.updatedAt = new Date().toISOString();
    this.users.set(user.id, user);

    return profile;
  }

  public getUserById(id: string): UserEntity | undefined {
    return this.users.get(id);
  }

  public getProfileByUserId(userId: string): ClientProfile | undefined {
    return this.profiles.getByUserId(userId);
  }

  public getProfileByUsername(username: string): ClientProfile | undefined {
    return this.profiles.getByUsername(username);
  }

  /**
   * Epic 2 Task 2.2.1: Business Creation with database-level ownership integrity and user linking
   */
  public createBusiness(business: Business): Business {
    if (!business || typeof business !== 'object') {
      throw new DatabaseValidationError('Business object is required.');
    }
    if (!business.id || typeof business.id !== 'string' || !business.id.trim()) {
      throw new DatabaseValidationError('Business requires a valid non-empty "id".');
    }
    if (!business.ownerId || typeof business.ownerId !== 'string' || !business.ownerId.trim()) {
      throw new DatabaseValidationError('Business requires a valid non-empty "ownerId".');
    }
    if (!business.name || typeof business.name !== 'string' || !business.name.trim()) {
      throw new DatabaseValidationError('Business requires a valid non-empty "name".');
    }

    const owner = this.users.get(business.ownerId);
    if (!owner) {
      throw new DatabaseNotFoundError(`Owner user with ID "${business.ownerId}" does not exist.`);
    }

    if (owner.role !== 'CLIENT' && owner.role !== 'SUPER_ADMIN') {
      throw new DatabaseRoleConstraintError('Only CLIENT accounts can own and create a business.');
    }

    // Slug generation or uniqueness
    let slug = business.slug;
    if (!slug || !slug.trim()) {
      slug = business.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'biz';
    }
    const existingWithSlug = Array.from(this.businesses.values()).find(b => b.slug === slug && b.id !== business.id);
    if (existingWithSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    business.slug = slug;

    // Ensure timestamps
    if (!business.createdAt) {
      business.createdAt = new Date().toISOString();
    }
    business.updatedAt = new Date().toISOString();

    // Ensure default verificationStatus
    if (!business.verificationStatus) {
      business.verificationStatus = business.isVerified ? 'APPROVED' : 'NOT_SUBMITTED';
    }

    // Persist business
    this.businesses.set(business.id, business);

    // Atomically link to owner user
    owner.businessId = business.id;
    owner.clientType = 'business';
    owner.updatedAt = new Date().toISOString();
    this.users.set(owner.id, owner);

    return business;
  }

  /**
   * Update business profile safely (Epic 2 Task 2.2.2)
   */
  public updateBusiness(id: string, updates: Partial<Business>): Business {
    const business = this.businesses.get(id);
    if (!business) {
      throw new DatabaseNotFoundError(`Business with ID "${id}" does not exist.`);
    }

    // Do NOT allow changing id or ownerId via updateBusiness directly
    if (updates.id && updates.id !== business.id) {
      throw new DatabaseValidationError('Cannot modify business ID.');
    }
    if (updates.ownerId && updates.ownerId !== business.ownerId) {
      throw new DatabaseValidationError('Cannot transfer business ownership via updateBusiness.');
    }

    if (updates.name !== undefined) {
      if (!updates.name || typeof updates.name !== 'string' || !updates.name.trim()) {
        throw new DatabaseValidationError('Business requires a valid non-empty "name".');
      }
      business.name = updates.name.trim();
    }

    if (updates.slug !== undefined) {
      business.slug = updates.slug;
    }

    if (updates.logoUrl !== undefined) {
      business.logoUrl = updates.logoUrl;
    }

    if (updates.logoKey !== undefined) {
      if (updates.logoKey) {
        business.logoKey = updates.logoKey;
      } else {
        delete business.logoKey;
      }
    }

    if (updates.coverImageUrl !== undefined) {
      business.coverImageUrl = updates.coverImageUrl;
    }

    if (updates.coverImageKey !== undefined) {
      if (updates.coverImageKey) {
        business.coverImageKey = updates.coverImageKey;
      } else {
        delete business.coverImageKey;
      }
    }

    if (updates.description !== undefined) {
      if (updates.description && typeof updates.description === 'string' && updates.description.trim()) {
        business.description = updates.description.trim();
      } else {
        delete business.description;
      }
    }

    if (updates.location !== undefined) {
      if (updates.location && typeof updates.location === 'object') {
        business.location = { ...updates.location };
      } else {
        delete business.location;
      }
    }

    if (updates.openingHours !== undefined) {
      if (Array.isArray(updates.openingHours)) {
        business.openingHours = JSON.parse(JSON.stringify(updates.openingHours));
      } else {
        delete business.openingHours;
      }
    }

    if (updates.phone !== undefined) {
      if (updates.phone && typeof updates.phone === 'string' && updates.phone.trim()) {
        business.phone = updates.phone.trim();
      } else {
        delete business.phone;
      }
    }

    if (updates.email !== undefined) {
      if (updates.email && typeof updates.email === 'string' && updates.email.trim()) {
        business.email = updates.email.trim().toLowerCase();
      } else {
        delete business.email;
      }
    }

    if (updates.website !== undefined) {
      if (updates.website && typeof updates.website === 'string' && updates.website.trim()) {
        business.website = updates.website.trim();
      } else {
        delete business.website;
      }
    }

    if (updates.tagline !== undefined) {
      if (updates.tagline && typeof updates.tagline === 'string' && updates.tagline.trim()) {
        business.tagline = updates.tagline.trim();
      } else {
        delete business.tagline;
      }
    }

    if (updates.isVerified !== undefined) {
      business.isVerified = Boolean(updates.isVerified);
    }

    if (updates.categories !== undefined) {
      if (Array.isArray(updates.categories)) {
        business.categories = [...updates.categories];
      } else {
        delete business.categories;
      }
    }

    if (updates.category !== undefined) {
      business.category = updates.category;
    }

    if (updates.categoryLabel !== undefined) {
      business.categoryLabel = updates.categoryLabel;
    }

    business.updatedAt = new Date().toISOString();
    this.businesses.set(business.id, business);
    return business;
  }

  public getBusinessContactInfo(businessId: string): { phone?: string; email?: string; website?: string } | undefined {
    const biz = this.businesses.get(businessId);
    if (!biz) return undefined;
    return {
      phone: biz.phone,
      email: biz.email,
      website: biz.website
    };
  }

  public updateBusinessContactInfo(businessId: string, contact: { phone?: string | null; email?: string | null; website?: string | null }): Business {
    return this.updateBusiness(businessId, {
      phone: contact.phone === null ? '' : contact.phone,
      email: contact.email === null ? '' : contact.email,
      website: contact.website === null ? '' : contact.website
    });
  }

  public getBusinessOpeningHours(businessId: string): OpeningHour[] | undefined {
    const biz = this.businesses.get(businessId);
    return biz?.openingHours;
  }

  public updateBusinessOpeningHours(businessId: string, hours: OpeningHour[] | undefined): Business {
    return this.updateBusiness(businessId, { openingHours: hours });
  }

  public getBusinessById(id: string): Business | undefined {
    return this.businesses.get(id);
  }

  public getBusinessBySlug(slug: string): Business | undefined {
    if (!slug) return undefined;
    const normalized = slug.trim().toLowerCase();
    for (const b of this.businesses.values()) {
      if (b.slug && b.slug.toLowerCase() === normalized) {
        return b;
      }
    }
    return undefined;
  }

  public getBusinessByIdOrSlug(idOrSlug: string): Business | undefined {
    if (!idOrSlug) return undefined;
    const direct = this.businesses.get(idOrSlug);
    if (direct) return direct;
    return this.getBusinessBySlug(idOrSlug);
  }

  public getBusinessByOwnerId(ownerId: string): Business | undefined {
    for (const b of this.businesses.values()) {
      if (b.ownerId === ownerId) return b;
    }
    return undefined;
  }

  public getBusinessesByOwnerId(ownerId: string): Business[] {
    const list: Business[] = [];
    for (const b of this.businesses.values()) {
      if (b.ownerId === ownerId) list.push(b);
    }
    return list;
  }

  // ==========================================
  // Product database methods (Epic 3 Feature 3.2 Task 3.2.2)
  // ==========================================

  public getProductById(id: string): Product | undefined {
    if (!id || typeof id !== 'string') return undefined;
    return this.products.get(id);
  }

  public getProductsByBusinessId(businessId: string): Product[] {
    if (!businessId) return [];
    const list: Product[] = [];
    for (const p of this.products.values()) {
      if (p.businessId === businessId) {
        list.push(p);
      }
    }
    return list;
  }

  public createProduct(product: Product): Product {
    this.products.set(product.id, product);
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated: Product = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
      updatedAt: new Date().toISOString()
    };
    this.products.set(id, updated);
    return updated;
  }

  public deleteProduct(id: string): boolean {
    return this.products.delete(id);
  }

  // ==========================================
  // Service database methods (Epic 3 Feature 3.2 Task 3.2.3)
  // ==========================================

  public getServiceById(id: string): Service | undefined {
    if (!id || typeof id !== 'string') return undefined;
    return this.services.get(id);
  }

  public getServicesByBusinessId(businessId: string): Service[] {
    if (!businessId) return [];
    const list: Service[] = [];
    for (const s of this.services.values()) {
      if (s.businessId === businessId) {
        list.push(s);
      }
    }
    return list;
  }

  public createService(service: Service): Service {
    this.services.set(service.id, service);
    return service;
  }

  public updateService(id: string, updates: Partial<Service>): Service | undefined {
    const existing = this.services.get(id);
    if (!existing) return undefined;
    const updated: Service = {
      ...existing,
      ...updates,
      id: existing.id,
      businessId: existing.businessId,
      updatedAt: new Date().toISOString()
    };
    this.services.set(id, updated);
    return updated;
  }

  public deleteService(id: string): boolean {
    return this.services.delete(id);
  }

  // ==========================================
  // Category management database methods (Epic 3 Feature 3.1 Task 3.1.1)
  // ==========================================

  public getCategoryById(id: string): Category | undefined {
    if (!id || typeof id !== 'string') return undefined;
    const norm = id.trim().toLowerCase();
    return this.categories.find(c => c.id.toLowerCase() === norm || c.slug.toLowerCase() === norm);
  }

  public getCategoryBySlug(slug: string): Category | undefined {
    if (!slug || typeof slug !== 'string') return undefined;
    const norm = slug.trim().toLowerCase();
    return this.categories.find(c => c.slug.toLowerCase() === norm);
  }

  public getCategoryByName(name: string): Category | undefined {
    if (!name || typeof name !== 'string') return undefined;
    const norm = name.trim().toLowerCase();
    return this.categories.find(c => c.name.trim().toLowerCase() === norm);
  }

  public getAllCategories(options?: { status?: 'active' | 'inactive' | 'all'; parentId?: string | null }): Category[] {
    let result = [...this.categories];
    if (options?.status && options.status !== 'all') {
      result = result.filter(c => c.status === options.status);
    }
    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        result = result.filter(c => !c.parentId);
      } else {
        const targetParent = this.getCategoryById(options.parentId);
        const pId = targetParent ? targetParent.id : options.parentId;
        const pSlug = targetParent ? targetParent.slug : options.parentId;
        result = result.filter(c => c.parentId === pId || c.parentId === pSlug);
      }
    }
    return result;
  }

  public getActiveCategories(): Category[] {
    return this.categories.filter(c => c.status === 'active' && c.active !== false);
  }

  /**
   * Returns top-level categories (where parentId is null/undefined)
   */
  public getTopLevelCategories(options?: { status?: 'active' | 'inactive' | 'all' }): Category[] {
    let result = this.categories.filter(c => !c.parentId);
    if (options?.status && options.status !== 'all') {
      result = result.filter(c => c.status === options.status);
    }
    return result;
  }

  /**
   * Retrieves all subcategories belonging to a parent category
   */
  public getSubcategories(parentId: string, options?: { status?: 'active' | 'inactive' | 'all' }): Category[] {
    const parent = this.getCategoryById(parentId);
    if (!parent) {
      const err: any = new Error(`Parent category "${parentId}" not found.`);
      err.statusCode = 404;
      err.code = 'PARENT_CATEGORY_NOT_FOUND';
      throw err;
    }

    let result = this.categories.filter(c => c.parentId === parent.id || c.parentId === parent.slug);
    if (options?.status && options.status !== 'all') {
      result = result.filter(c => c.status === options.status);
    }
    return result;
  }

  /**
   * Checks if prospectiveParentId is an ancestor or descendant creating a circular reference
   */
  public checkCircularAncestry(categoryId: string, prospectiveParentId: string): boolean {
    if (!categoryId || !prospectiveParentId) return false;
    const cat = this.getCategoryById(categoryId);
    const prospective = this.getCategoryById(prospectiveParentId);
    if (!cat || !prospective) return false;

    // Direct self-parenting
    if (prospective.id === cat.id || prospective.slug === cat.slug) return true;

    // Traverse prospective parent's ancestor chain upwards
    let currentParentId = prospective.parentId;
    const visited = new Set<string>([prospective.id, prospective.slug]);

    while (currentParentId) {
      if (currentParentId === cat.id || currentParentId === cat.slug) {
        return true; // Cycle detected: prospective parent descends from this category
      }
      if (visited.has(currentParentId)) {
        break; // Guard against loop in existing chain
      }
      visited.add(currentParentId);

      const parentCat = this.getCategoryById(currentParentId);
      currentParentId = parentCat?.parentId ?? null;
    }

    return false;
  }

  /**
   * Computes taxonomy nesting depth for a prospective parent category
   */
  public getCategoryDepth(prospectiveParentId: string): number {
    let depth = 1;
    let current = this.getCategoryById(prospectiveParentId);
    const visited = new Set<string>();

    while (current && current.parentId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      depth++;
      current = this.getCategoryById(current.parentId);
    }

    return depth;
  }

  /**
   * Returns a complete hierarchical Category Tree (Epic 3 Feature 3.1 Task 3.1.2)
   */
  public getCategoryTree(options?: { status?: 'active' | 'inactive' | 'all' }): CategoryTreeNode[] {
    const statusFilter = options?.status && options.status !== 'all' ? options.status : undefined;
    const topLevels = this.getTopLevelCategories({ status: options?.status });

    return topLevels.map(top => this.buildCategoryTreeNode(top, 0, statusFilter));
  }

  private buildCategoryTreeNode(cat: Category, depth: number, statusFilter?: 'active' | 'inactive'): CategoryTreeNode {
    let directChildren = this.categories.filter(c => c.parentId === cat.id || c.parentId === cat.slug);
    if (statusFilter) {
      directChildren = directChildren.filter(c => c.status === statusFilter);
    }

    let directBizCount = 0;
    for (const biz of this.businesses.values()) {
      const bizCatIds = biz.categories || (biz.category ? [biz.category] : []);
      if (bizCatIds.includes(cat.id as any) || bizCatIds.includes(cat.slug as any)) {
        directBizCount++;
      }
    }

    const childrenNodes = depth < MAX_CATEGORY_DEPTH - 1
      ? directChildren.map(child => this.buildCategoryTreeNode(child, depth + 1, statusFilter))
      : [];

    return {
      ...cat,
      children: childrenNodes,
      depth,
      subcategoriesCount: (cat.subcategories?.length || 0) + childrenNodes.length,
      businessCount: directBizCount
    };
  }

  /**
   * Appends a subcategory name tag to a category's subcategories array
   */
  public addSubcategoryTag(parentIdOrSlug: string, tag: string): Category {
    const cat = this.getCategoryById(parentIdOrSlug);
    if (!cat) {
      const err: any = new Error(`Category "${parentIdOrSlug}" not found.`);
      err.statusCode = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }
    const cleanTag = tag.trim();
    if (!cleanTag) {
      const err: any = new Error('Subcategory tag cannot be empty.');
      err.statusCode = 400;
      err.code = 'INVALID_SUBCATEGORY_TAG';
      throw err;
    }
    if (!cat.subcategories) {
      cat.subcategories = [];
    }
    if (!cat.subcategories.some(t => t.toLowerCase() === cleanTag.toLowerCase())) {
      cat.subcategories.push(cleanTag);
      cat.updatedAt = new Date().toISOString();
    }
    return cat;
  }

  /**
   * Removes a subcategory name tag from a category's subcategories array
   */
  public removeSubcategoryTag(parentIdOrSlug: string, tag: string): Category {
    const cat = this.getCategoryById(parentIdOrSlug);
    if (!cat) {
      const err: any = new Error(`Category "${parentIdOrSlug}" not found.`);
      err.statusCode = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }
    const cleanTag = tag.trim().toLowerCase();
    if (cat.subcategories) {
      cat.subcategories = cat.subcategories.filter(t => t.toLowerCase() !== cleanTag);
      cat.updatedAt = new Date().toISOString();
    }
    return cat;
  }

  public createCategory(input: CreateCategoryInput): Category {
    const validation = validateCreateCategoryPayload(input);
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid category payload';
      const err: any = new Error(msg);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = validation.errors;
      throw err;
    }

    const data = validation.data;

    // Check slug uniqueness
    const existingBySlug = this.getCategoryBySlug(data.slug);
    if (existingBySlug) {
      const err: any = new Error(`Category slug "${data.slug}" already exists.`);
      err.statusCode = 409;
      err.code = 'CATEGORY_SLUG_EXISTS';
      throw err;
    }

    // Check name uniqueness
    const existingByName = this.getCategoryByName(data.name);
    if (existingByName) {
      const err: any = new Error(`Category name "${data.name}" already exists.`);
      err.statusCode = 409;
      err.code = 'CATEGORY_NAME_EXISTS';
      throw err;
    }

    // Check parent if provided (Subcategories in Task 3.1.2)
    if (data.parentId) {
      const parent = this.getCategoryById(data.parentId);
      if (!parent) {
        const err: any = new Error(`Parent category "${data.parentId}" not found.`);
        err.statusCode = 404;
        err.code = 'PARENT_CATEGORY_NOT_FOUND';
        throw err;
      }
      if (parent.status === 'inactive' && data.status === 'active') {
        const err: any = new Error(`Cannot assign active subcategory to inactive parent category "${parent.name}".`);
        err.statusCode = 400;
        err.code = 'PARENT_CATEGORY_INACTIVE';
        throw err;
      }
      const parentDepth = this.getCategoryDepth(parent.id);
      if (parentDepth >= MAX_CATEGORY_DEPTH) {
        const err: any = new Error(`Cannot create subcategory: maximum taxonomy depth (${MAX_CATEGORY_DEPTH}) reached.`);
        err.statusCode = 400;
        err.code = 'EXCEEDED_MAX_CATEGORY_DEPTH';
        throw err;
      }
      data.parentId = parent.id;
    }

    const now = new Date().toISOString();
    const id = data.id && !this.getCategoryById(data.id)
      ? data.id
      : `cat_${data.slug.replace(/[^a-z0-9]/g, '_')}`;

    const newCategory: Category = {
      id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      status: data.status || 'active',
      active: data.active !== false && data.status !== 'inactive',
      parentId: data.parentId ?? null,
      iconName: data.iconName || 'Folder',
      bannerImage: data.bannerImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
      createdAt: now,
      updatedAt: now
    };

    this.categories.push(newCategory);
    return newCategory;
  }

  public updateCategory(id: string, updates: UpdateCategoryInput): Category {
    const category = this.getCategoryById(id);
    if (!category) {
      const err: any = new Error(`Category not found: ${id}`);
      err.statusCode = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    const validation = validateUpdateCategoryPayload(updates);
    if (!validation.success || !validation.data) {
      const msg = validation.errors ? Object.values(validation.errors).join(' ') : 'Invalid update payload';
      const err: any = new Error(msg);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = validation.errors;
      throw err;
    }

    const data = validation.data;

    // Check slug uniqueness if changed
    if (data.slug && data.slug.toLowerCase() !== category.slug.toLowerCase()) {
      const existing = this.getCategoryBySlug(data.slug);
      if (existing && existing.id !== category.id) {
        const err: any = new Error(`Category slug "${data.slug}" is already taken.`);
        err.statusCode = 409;
        err.code = 'CATEGORY_SLUG_EXISTS';
        throw err;
      }
      category.slug = data.slug;
    }

    // Check name uniqueness if changed
    if (data.name && data.name.trim().toLowerCase() !== category.name.trim().toLowerCase()) {
      const existing = this.getCategoryByName(data.name);
      if (existing && existing.id !== category.id) {
        const err: any = new Error(`Category name "${data.name}" already exists.`);
        err.statusCode = 409;
        err.code = 'CATEGORY_NAME_EXISTS';
        throw err;
      }
      category.name = data.name;
    }

    // Hierarchy check: cannot be parent of itself or cause circular references (Task 3.1.2)
    if (data.parentId !== undefined) {
      if (data.parentId !== null) {
        if (data.parentId === category.id || data.parentId === category.slug) {
          const err: any = new Error('Category cannot be its own parent.');
          err.statusCode = 400;
          err.code = 'CIRCULAR_PARENT_REFERENCE';
          throw err;
        }
        const parent = this.getCategoryById(data.parentId);
        if (!parent) {
          const err: any = new Error(`Parent category "${data.parentId}" not found.`);
          err.statusCode = 404;
          err.code = 'PARENT_CATEGORY_NOT_FOUND';
          throw err;
        }
        if (this.checkCircularAncestry(category.id, data.parentId)) {
          const err: any = new Error(`Cannot set parent to "${parent.name}": circular hierarchy detected.`);
          err.statusCode = 400;
          err.code = 'CIRCULAR_PARENT_REFERENCE';
          throw err;
        }
        const prospectiveDepth = this.getCategoryDepth(parent.id);
        if (prospectiveDepth >= MAX_CATEGORY_DEPTH) {
          const err: any = new Error(`Cannot reassign parent: maximum taxonomy depth (${MAX_CATEGORY_DEPTH}) reached.`);
          err.statusCode = 400;
          err.code = 'EXCEEDED_MAX_CATEGORY_DEPTH';
          throw err;
        }
        category.parentId = parent.id;
      } else {
        category.parentId = null;
      }
    }

    if (data.description !== undefined) category.description = data.description;
    if (data.status !== undefined) {
      category.status = data.status;
      category.active = data.status === 'active';
    } else if (data.active !== undefined) {
      category.active = data.active;
      category.status = data.active ? 'active' : 'inactive';
    }
    if (data.iconName !== undefined) category.iconName = data.iconName;
    if (data.bannerImage !== undefined) category.bannerImage = data.bannerImage;
    if (data.subcategories !== undefined) category.subcategories = data.subcategories;

    category.updatedAt = new Date().toISOString();
    return category;
  }

  public deleteCategory(id: string, options?: { force?: boolean }): boolean {
    const categoryIndex = this.categories.findIndex(c => c.id === id || c.slug === id);
    if (categoryIndex === -1) {
      const err: any = new Error(`Category not found: ${id}`);
      err.statusCode = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    const cat = this.categories[categoryIndex];

    // Check for child subcategories (Task 3.1.2 Orphan & Cascade Protection)
    const childCategories = this.categories.filter(c => c.parentId === cat.id || c.parentId === cat.slug);
    if (childCategories.length > 0) {
      if (!options?.force) {
        const err: any = new Error(
          `Cannot delete category "${cat.name}": it has ${childCategories.length} child subcategories (${childCategories.slice(0, 3).map(c => c.name).join(', ')}${childCategories.length > 3 ? '...' : ''}). Re-assign or remove subcategories first, or specify force=true.`
        );
        err.statusCode = 400;
        err.code = 'CATEGORY_HAS_CHILDREN';
        err.childCount = childCategories.length;
        throw err;
      }

      // Safe re-parenting if force is true: promote child subcategories to top-level or dissociate parent
      for (const child of childCategories) {
        child.parentId = null;
        child.updatedAt = new Date().toISOString();
      }
    }

    // Check for business references
    const referencingJoinRecords: string[] = [];
    for (const [key, bc] of this.businessCategories.entries()) {
      if (bc.categoryId === cat.id || bc.categoryId === cat.slug) {
        referencingJoinRecords.push(key);
      }
    }

    // Also check businesses collection
    const referencingBusinesses: Business[] = [];
    for (const biz of this.businesses.values()) {
      const catIds = biz.categories || (biz.category ? [biz.category] : []);
      if (catIds.includes(cat.id as any) || catIds.includes(cat.slug as any)) {
        referencingBusinesses.push(biz);
      }
    }

    // Also check advertisements and products collections
    const referencingAds: Advertisement[] = [];
    for (const ad of this.advertisements.values()) {
      if (ad.category === cat.id || ad.category === cat.slug || ad.category === cat.name) {
        referencingAds.push(ad);
      }
    }

    const referencingProducts: Product[] = [];
    for (const prod of this.products.values()) {
      if (prod.category === cat.id || prod.category === cat.slug || prod.category === cat.name) {
        referencingProducts.push(prod);
      }
    }

    if (referencingJoinRecords.length > 0 || referencingBusinesses.length > 0 || referencingAds.length > 0 || referencingProducts.length > 0) {
      if (!options?.force) {
        const reasons: string[] = [];
        const bizTotal = referencingBusinesses.length || referencingJoinRecords.length;
        if (bizTotal > 0) reasons.push(`${bizTotal} businesses`);
        if (referencingAds.length > 0) reasons.push(`${referencingAds.length} advertisements`);
        if (referencingProducts.length > 0) reasons.push(`${referencingProducts.length} catalog products`);
        const err: any = new Error(`Cannot delete category "${cat.name}": it is currently assigned to ${reasons.join(', ')}. Safe retention preserves existing records. Please deactivate the category instead, or specify force=true.`);
        err.statusCode = 400;
        err.code = 'CATEGORY_IN_USE';
        throw err;
      }

      // Safe dissociation without deleting entities (Section 7)
      for (const recId of referencingJoinRecords) {
        this.businessCategories.delete(recId);
      }
      for (const biz of referencingBusinesses) {
        biz.categories = (biz.categories || []).filter(cId => cId !== cat.id && cId !== cat.slug);
        if (biz.category === cat.id || biz.category === cat.slug) {
          biz.category = (biz.categories[0] as any) || undefined;
          const nextPrimary = biz.categories[0] ? this.getCategoryById(biz.categories[0] as string) : undefined;
          biz.categoryLabel = nextPrimary?.name;
        }
        biz.businessCategories = (biz.businessCategories || []).filter(bc => bc.categoryId !== cat.id && bc.categoryId !== cat.slug);
        biz.updatedAt = new Date().toISOString();
        this.businesses.set(biz.id, biz);
      }
      for (const ad of referencingAds) {
        ad.category = 'General';
        this.advertisements.set(ad.id, ad);
      }
      for (const prod of referencingProducts) {
        prod.category = 'General';
        this.products.set(prod.id, prod);
      }
    }

    // Remove category
    this.categories.splice(categoryIndex, 1);
    return true;
  }

  public seedCategories(customSeeds?: Partial<Category>[]): { created: number; existing: number; total: number } {
    const seeds: Array<Partial<Category>> = (customSeeds || INITIAL_CATEGORY_SEEDS) as Array<Partial<Category>>;
    let created = 0;
    let existing = 0;
    const now = new Date().toISOString();

    for (const seed of seeds) {
      if (!seed.name || !seed.slug) continue;
      const found = this.getCategoryById(seed.id || '') || this.getCategoryBySlug(seed.slug);
      if (found) {
        // Idempotent: ensure timestamps and status are present if missing, but do not duplicate
        if (!found.createdAt) found.createdAt = now;
        if (!found.updatedAt) found.updatedAt = now;
        if (!found.status) found.status = found.active === false ? 'inactive' : 'active';
        if (found.active === undefined) found.active = found.status === 'active';
        if (found.parentId === undefined) found.parentId = null;
        existing++;
      } else {
        const newCat: Category = {
          id: seed.id || `cat_${seed.slug.replace(/[^a-z0-9]/g, '_')}`,
          name: seed.name,
          slug: seed.slug,
          description: seed.description || '',
          status: seed.status || (seed.active === false ? 'inactive' : 'active'),
          active: seed.status ? seed.status === 'active' : seed.active !== false,
          parentId: seed.parentId ?? null,
          iconName: seed.iconName || 'Folder',
          bannerImage: seed.bannerImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
          subcategories: Array.isArray(seed.subcategories) ? seed.subcategories : [],
          createdAt: seed.createdAt || now,
          updatedAt: seed.updatedAt || now
        };
        this.categories.push(newCat);
        created++;
      }
    }

    return { created, existing, total: this.categories.length };
  }

  public getBusinessCategories(businessId: string): BusinessCategory[] {
    const list: BusinessCategory[] = [];
    for (const bc of this.businessCategories.values()) {
      if (bc.businessId === businessId) {
        list.push(bc);
      }
    }
    return list;
  }

  public getBusinessCategoryConfigs(businessId: string): CategoryConfig[] {
    const bcs = this.getBusinessCategories(businessId);
    const configs: CategoryConfig[] = [];
    for (const bc of bcs) {
      const cat = this.getCategoryById(bc.categoryId);
      if (cat) configs.push(cat);
    }
    return configs;
  }

  public setBusinessCategories(businessId: string, categoryIds: string[]): { business: Business; businessCategories: BusinessCategory[] } {
    const business = this.businesses.get(businessId);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Validate foreign keys & active status
    for (const catId of categoryIds) {
      const cat = this.getCategoryById(catId);
      if (!cat) {
        throw new Error(`Category does not exist: "${catId}"`);
      }
      if (cat.active === false) {
        throw new Error(`Category is inactive: "${catId}"`);
      }
    }

    // Remove old join records for this business
    for (const [key, bc] of Array.from(this.businessCategories.entries())) {
      if (bc.businessId === businessId) {
        this.businessCategories.delete(key);
      }
    }

    // Create new join records
    const newRecords: BusinessCategory[] = [];
    const now = new Date().toISOString();
    categoryIds.forEach((catId, index) => {
      const recordId = `bc_${businessId}_${catId}`;
      const record: BusinessCategory = {
        id: recordId,
        businessId,
        categoryId: catId as any,
        isPrimary: index === 0,
        assignedAt: now
      };
      this.businessCategories.set(recordId, record);
      newRecords.push(record);
    });

    // Update business entity fields for compatibility
    const primaryCat = categoryIds.length > 0 ? this.getCategoryById(categoryIds[0]) : undefined;
    business.categories = categoryIds;
    business.category = (categoryIds[0] as any) || undefined;
    business.categoryLabel = primaryCat?.name || undefined;
    business.businessCategories = newRecords;
    business.updatedAt = now;
    this.businesses.set(business.id, business);

    return { business, businessCategories: newRecords };
  }

  public removeBusinessCategory(businessId: string, categoryId: string): { business: Business; businessCategories: BusinessCategory[] } {
    const business = this.businesses.get(businessId);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    const currentIds = (business.categories || []).filter(id => id !== categoryId);
    return this.setBusinessCategories(businessId, currentIds as string[]);
  }

  public clearBusinessCategories(businessId: string): { business: Business; businessCategories: BusinessCategory[] } {
    return this.setBusinessCategories(businessId, []);
  }

  public deleteProfile(id: string): boolean {
    const profile = this.profiles.get(id);
    if (profile) {
      const user = this.users.get(profile.userId);
      if (user) {
        user.hasProfile = false;
        delete user.profileId;
      }
    }
    return this.profiles.delete(id);
  }

  /**
   * Verification Request Methods (Epic 2 Feature 2.3 Task 2.3.1)
   */
  public getVerificationRequestById(id: string): BusinessVerificationRequest | undefined {
    return this.verificationRequests.get(id);
  }

  public getVerificationRequestsByBusinessId(businessId: string): BusinessVerificationRequest[] {
    const list: BusinessVerificationRequest[] = [];
    for (const req of this.verificationRequests.values()) {
      if (req.businessId === businessId) {
        list.push(req);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getActivePendingVerificationRequest(businessId: string): BusinessVerificationRequest | undefined {
    for (const req of this.verificationRequests.values()) {
      if (req.businessId === businessId && req.status === 'PENDING') {
        return req;
      }
    }
    return undefined;
  }

  public createVerificationRequest(data: {
    businessId: string;
    requesterId: string;
    notes?: string;
  }): BusinessVerificationRequest {
    const business = this.businesses.get(data.businessId);
    if (!business) {
      throw new DatabaseNotFoundError(`Business with ID "${data.businessId}" not found.`);
    }

    if (business.isVerified) {
      throw new DatabaseValidationError('This business is already verified.');
    }

    // Strict constraint: Exactly ONE active PENDING request per business
    const existingPending = this.getActivePendingVerificationRequest(data.businessId);
    if (existingPending) {
      throw new DatabaseUniqueConstraintError(
        'An active pending verification request already exists for this business.',
        ['businessId', 'status']
      );
    }

    const now = new Date().toISOString();
    const id = `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRequest: BusinessVerificationRequest = {
      id,
      businessId: data.businessId,
      requesterId: data.requesterId,
      status: 'PENDING',
      notes: data.notes && typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : undefined,
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.verificationRequests.set(id, newRequest);

    // Synchronize business server-controlled status
    business.verificationStatus = 'PENDING';
    business.isVerified = false;
    business.updatedAt = now;
    this.businesses.set(business.id, business);

    return newRequest;
  }

  public getAllVerificationRequests(): BusinessVerificationRequest[] {
    return Array.from(this.verificationRequests.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateVerificationRequest(
    id: string,
    updates: Partial<BusinessVerificationRequest>,
    expectedStatus?: BusinessVerificationStatus
  ): BusinessVerificationRequest {
    const req = this.verificationRequests.get(id);
    if (!req) {
      throw new DatabaseNotFoundError(`Verification request with ID "${id}" not found.`);
    }

    if (expectedStatus && req.status !== expectedStatus) {
      const err: any = new Error(
        `Concurrency conflict: Verification request is currently "${req.status}", expected "${expectedStatus}". Operation rejected.`
      );
      err.code = 'STALE_OPERATION_CONFLICT';
      err.statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const updated: BusinessVerificationRequest = {
      ...req,
      ...updates,
      updatedAt: now
    };

    this.verificationRequests.set(id, updated);

    // Synchronize status with business record
    const biz = this.businesses.get(updated.businessId);
    if (biz) {
      if (updated.status === 'APPROVED') {
        biz.isVerified = true;
        biz.verificationStatus = 'APPROVED';
      } else if (updated.status === 'REJECTED') {
        biz.isVerified = false;
        biz.verificationStatus = 'REJECTED';
      } else if (updated.status === 'PENDING') {
        biz.isVerified = false;
        biz.verificationStatus = 'PENDING';
      }
      biz.updatedAt = now;
      this.businesses.set(biz.id, biz);
    }

    return updated;
  }

  public countSuperAdmins(): number {
    let count = 0;
    for (const u of this.users.values()) {
      if (u.role === 'SUPER_ADMIN') count++;
    }
    return count;
  }

  public getSuperAdmin(): UserEntity | undefined {
    return Array.from(this.users.values()).find(u => u.role === 'SUPER_ADMIN');
  }

  public verifySingleSuperAdminInvariant(): { valid: boolean; count: number; designatedEmail: string; superAdminId?: string } {
    const superAdmins = Array.from(this.users.values()).filter(u => u.role === 'SUPER_ADMIN');
    const count = superAdmins.length;
    const isValid = count === 1 && isDesignatedSuperAdminEmail(superAdmins[0].email);
    return {
      valid: isValid,
      count,
      designatedEmail: SUPER_ADMIN_EMAIL,
      superAdminId: superAdmins[0]?.id
    };
  }

  public enforceSuperAdminInvariant(): void {
    this.provisionSuperAdmin();
  }

  public getPlatformStats(): PlatformStats {
    let totalVol = 0;
    for (const inv of this.invoices.values()) {
      if (inv.status === 'paid') totalVol += inv.total;
    }
    for (const p of this.payments.values()) {
      if (p.status === 'successful') totalVol += p.baseAmountNGN;
    }

    let boosted = 0;
    let active = 0;
    for (const ad of this.advertisements.values()) {
      if (ad.status === 'active') active++;
      if (ad.isBoosted) boosted++;
    }

    let verified = 0;
    for (const b of this.businesses.values()) {
      if (b.isVerified) verified++;
    }

    return {
      totalUsers: this.users.size + 148,
      totalBusinesses: this.businesses.size + 85,
      activeAds: active + 210,
      totalVolumeNGN: totalVol + 38500000,
      totalInvoicesPaid: 142,
      mrrNGN: 2450000,
      boostedAdsCount: boosted + 46,
      verifiedBusinessesCount: verified + 72
    };
  }

  public appliedMigrations: Set<string> = new Set();
  private transactionLock: Promise<void> = Promise.resolve();

  /**
   * Cascading user deletion:
   * 1. Protects designated Super Admin from deletion
   * 2. Automatically revokes and purges active sessions
   * 3. Purges active and consumed tokens
   * 4. Removes user entity
   */
  public deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    // Invariant: cannot delete designated Super Admin account
    if (user.role === 'SUPER_ADMIN' || isDesignatedSuperAdminEmail(user.email)) {
      throw new DatabaseRoleConstraintError('The primary Super Admin account cannot be deleted.');
    }

    // Cascade 1: Revoke and purge all user sessions
    this.sessions.revokeAllForUser(userId);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }

    // Cascade 2: Invalidate and purge all tokens
    for (const [tokenId, token] of this.tokens.entries()) {
      if (token.userId === userId) {
        this.tokens.delete(tokenId);
      }
    }

    // Remove user
    return this.users.delete(userId);
  }

  /**
   * Account deactivation/suspension with cascading session and token revocation.
   */
  public deactivateUser(userId: string, status: 'SUSPENDED' | 'DISABLED' | 'DELETED' = 'SUSPENDED'): UserEntity {
    const user = this.users.get(userId);
    if (!user) {
      throw new DatabaseNotFoundError(`User with ID "${userId}" not found.`);
    }

    if (user.role === 'SUPER_ADMIN' || isDesignatedSuperAdminEmail(user.email)) {
      throw new DatabaseRoleConstraintError('The primary Super Admin account cannot be deactivated or suspended.');
    }

    user.status = status;
    user.updatedAt = new Date().toISOString();

    // Cascade: Revoke all active sessions immediately
    this.sessions.revokeAllForUser(userId);

    // Invalidate active tokens
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.isUsed) {
        token.isUsed = true;
        token.usedAt = new Date().toISOString();
      }
    }

    this.users.set(user.id, user);
    return user;
  }

  /**
   * ACID-like serialized transaction executor with snapshot rollback.
   * Protects multi-step authentication operations against race conditions and mid-flight failures.
   */
  public async transaction<T>(fn: (tx: DatabaseTransactionContext) => Promise<T> | T): Promise<T> {
    let releaseLock: () => void;
    const currentLock = new Promise<void>(resolve => { releaseLock = resolve; });
    const priorLock = this.transactionLock;
    this.transactionLock = priorLock.then(() => currentLock);

    await priorLock;

    // Snapshot state for atomic rollback on failure
    const userSnapshot = new Map(Array.from(this.users.entries()).map(([k, v]) => [k, { ...v }]));
    const sessionSnapshot = new Map(Array.from(this.sessions.entries()).map(([k, v]) => [k, { ...v }]));
    const tokenSnapshot = new Map(Array.from(this.tokens.entries()).map(([k, v]) => [k, { ...v }]));
    const profileSnapshot = new Map(Array.from(this.profiles.entries()).map(([k, v]) => [k, { ...v }]));
    const vreqSnapshot = new Map(Array.from(this.verificationRequests.entries()).map(([k, v]) => [k, { ...v }]));

    try {
      const txContext: DatabaseTransactionContext = {
        users: this.users,
        sessions: this.sessions,
        tokens: this.tokens,
        profiles: this.profiles,
        verificationRequests: this.verificationRequests,
        createUser: (user) => this.createUser(user),
        updateUser: (userId, updates) => this.updateUser(userId, updates),
        deleteUser: (userId) => this.deleteUser(userId),
        deactivateUser: (userId, status) => this.deactivateUser(userId, status),
        updateProfile: (userId, updates) => this.updateProfile(userId, updates),
        consumeToken: (tokenHash, type) => {
          const res = this.tokens.consumeToken(tokenHash, type);
          if (!res.success || !res.token) {
            throw new Error(res.reason || 'Failed to consume token');
          }
          return res.token;
        },
        revokeAllUserSessions: (userId) => this.sessions.revokeAllForUser(userId)
      };

      const result = await fn(txContext);
      return result;
    } catch (err) {
      // Rollback to snapshots
      this.users.clear();
      for (const [k, v] of userSnapshot) {
        this.users.set(k, v);
      }
      this.sessions.clear();
      for (const [k, v] of sessionSnapshot) {
        this.sessions.set(k, v);
      }
      this.tokens.clear();
      for (const [k, v] of tokenSnapshot) {
        this.tokens.set(k, v);
      }
      this.profiles.clear();
      for (const [k, v] of profileSnapshot) {
        this.profiles.set(k, v);
      }
      this.verificationRequests.clear();
      for (const [k, v] of vreqSnapshot) {
        this.verificationRequests.set(k, v);
      }
      throw err;
    } finally {
      releaseLock!();
    }
  }

  /**
   * Idempotent Forward Schema Migrations Engine.
   * Runs versioned integrity checks on database startup.
   */
  public runMigrations(): { applied: string[]; skipped: string[] } {
    const applied: string[] = [];
    const skipped: string[] = [];

    // Migration 001: 001_auth_schema_hardening
    const m1 = '001_auth_schema_hardening';
    if (!this.appliedMigrations.has(m1)) {
      for (const user of this.users.values()) {
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
        if (!user.status) {
          user.status = 'ACTIVE';
        }
        if (!user.createdAt) {
          user.createdAt = new Date().toISOString();
        }
        if (user.failedLoginAttempts === undefined) {
          user.failedLoginAttempts = 0;
        }
      }

      this.enforceSuperAdminInvariant();
      this.appliedMigrations.add(m1);
      applied.push(m1);
    } else {
      skipped.push(m1);
    }

    // Migration 002: 002_session_token_indexing
    const m2 = '002_session_token_indexing';
    if (!this.appliedMigrations.has(m2)) {
      for (const [id, session] of this.sessions.entries()) {
        if (!session.createdAt) session.createdAt = new Date().toISOString();
        if (!session.lastActiveAt) session.lastActiveAt = session.createdAt;
        if (!session.tokenHash) {
          session.tokenHash = crypto.createHash('sha256').update(id).digest('hex');
        }
      }
      this.appliedMigrations.add(m2);
      applied.push(m2);
    } else {
      skipped.push(m2);
    }

    // Migration 003: 003_client_profile_uniqueness_and_indexing
    const m3 = '003_client_profile_uniqueness_and_indexing';
    if (!this.appliedMigrations.has(m3)) {
      for (const user of this.users.values()) {
        if (user.role === 'CLIENT') {
          const existingProfile = this.profiles.getByUserId(user.id);
          if (existingProfile) {
            user.hasProfile = true;
            user.profileId = existingProfile.id;
            if (existingProfile.username) {
              user.username = existingProfile.username;
            }
          }
        }
      }
      this.appliedMigrations.add(m3);
      applied.push(m3);
    } else {
      skipped.push(m3);
    }

    return { applied, skipped };
  }
}

export const db = new DatabaseStore();
