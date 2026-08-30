import bcrypt from 'bcryptjs';

/**
 * ============================================================================
 * BOOST MARKET - REUSABLE PASSWORD SECURITY SERVICE
 * ============================================================================
 * Provides centralized, cryptographically secure password hashing and verification.
 * 
 * Hashing Algorithm: Bcrypt (adaptive key derivation)
 * Cost Factor (Rounds): 12 (4,096 iterations)
 * Salt: Cryptographically random 128-bit salt generated per hash (ensures uniqueness)
 * Constant-time verification prevents timing analysis and side-channel attacks.
 * 
 * Architecture:
 * Controller -> AuthService -> PasswordService -> DatabaseStore
 * ============================================================================
 */
export class PasswordService {
  private readonly defaultSaltRounds: number = 12;

  private static readonly DUMMY_HASH = '$2a$12$e8rG.MvP51W7qjB5y5uEoezTqQ0v9YV/6dE2L3.bX1zG0vB9YV/6d';

  /**
   * Performs a constant-time dummy verification against a static hash
   * to eliminate timing side-channels when a user is not found.
   */
  public async dummyVerify(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password || 'dummyPassword', PasswordService.DUMMY_HASH);
    } catch {
      return false;
    }
  }

  /**
   * Hashes a plaintext password asynchronously using Bcrypt with a high work factor (12 rounds)
   * and a cryptographically random unique salt.
   *
   * @param password Plaintext password to hash
   * @param saltRounds Optional custom work factor (defaults to 12)
   * @returns Resolves with the secure hashed password string (never plaintext)
   */
  public async hash(password: string, saltRounds: number = this.defaultSaltRounds): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verifies a plaintext password against a stored cryptographic password hash
   * using constant-time comparison.
   *
   * @param password Plaintext password provided during authentication
   * @param passwordHash Secure cryptographic hash stored in the database
   * @returns True if password matches hash, false otherwise
   */
  public async verify(password: string, passwordHash: string): Promise<boolean> {
    if (!password || !passwordHash || typeof password !== 'string' || typeof passwordHash !== 'string') {
      return false;
    }
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch {
      return false;
    }
  }

  /**
   * Synchronously hashes a password (primarily for database seeding and testing).
   */
  public hashSync(password: string, saltRounds: number = this.defaultSaltRounds): string {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    const salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(password, salt);
  }

  /**
   * Synchronously verifies a password against a hash.
   */
  public verifySync(password: string, passwordHash: string): boolean {
    if (!password || !passwordHash || typeof password !== 'string' || typeof passwordHash !== 'string') {
      return false;
    }
    try {
      return bcrypt.compareSync(password, passwordHash);
    } catch {
      return false;
    }
  }
}

export const passwordService = new PasswordService();
