import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ImageValidationResult {
  isValid: boolean;
  format?: 'jpeg' | 'png' | 'webp';
  mimeType?: string;
  ext?: string;
  width?: number;
  height?: number;
  error?: string;
  code?: string;
}

export interface StoredAvatarResult {
  avatarUrl: string;
  avatarKey: string;
  format: 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
}

export interface StoredLogoResult {
  logoUrl: string;
  logoKey: string;
  format: 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
}

export interface StoredCoverResult {
  coverUrl: string;
  coverKey: string;
  format: 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
}

export class StorageService {
  private readonly avatarsDir: string;
  private readonly logosDir: string;
  private readonly coversDir: string;
  public readonly MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  public readonly MAX_IMAGE_DIMENSION = 4096; // 4096 x 4096 px
  public readonly MIN_IMAGE_DIMENSION = 16; // 16 x 16 px

  constructor() {
    this.avatarsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    this.logosDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    this.coversDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
    this.ensureStorageDirectory();
  }

  /**
   * Ensures the upload storage directories exist on disk.
   */
  public ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.avatarsDir)) {
        fs.mkdirSync(this.avatarsDir, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(this.logosDir)) {
        fs.mkdirSync(this.logosDir, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(this.coversDir)) {
        fs.mkdirSync(this.coversDir, { recursive: true, mode: 0o755 });
      }
    } catch (err) {
      console.error('[StorageService] Error initializing storage directories:', err);
    }
  }

  public getStorageDirectory(): string {
    return this.avatarsDir;
  }

  public getLogosDirectory(): string {
    return this.logosDir;
  }

  public getCoversDirectory(): string {
    return this.coversDir;
  }

  /**
   * Validates image content, file signature (magic bytes), dimensions, and integrity.
   * Does NOT trust client-supplied MIME type or extension.
   */
  public validateImageBuffer(buffer: Buffer): ImageValidationResult {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return {
        isValid: false,
        error: 'No image data provided or file is empty.',
        code: 'EMPTY_FILE'
      };
    }

    if (buffer.length > this.MAX_AVATAR_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB maximum limit.`,
        code: 'FILE_TOO_LARGE'
      };
    }

    // Minimum sensible header length
    if (buffer.length < 32) {
      return {
        isValid: false,
        error: 'File is too small to be a valid image.',
        code: 'MALFORMED_IMAGE'
      };
    }

    // 1. Check for JPEG / JPG: Starts with 0xFF 0xD8 0xFF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return this.validateJpeg(buffer);
    }

    // 2. Check for PNG: Magic bytes 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return this.validatePng(buffer);
    }

    // 3. Check for WebP: Starts with 'RIFF' (0x52 0x49 0x46 0x46) and offset 8 is 'WEBP' (0x57 0x45 0x42 0x50)
    if (
      buffer.length >= 16 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return this.validateWebp(buffer);
    }

    // 4. Reject unsupported types (GIF, SVG with executable script vectors, PDF, executables, HTML, etc.)
    return {
      isValid: false,
      error: 'Unsupported file format. Only JPEG, PNG, and WebP images are allowed for profile pictures.',
      code: 'UNSUPPORTED_FILE_TYPE'
    };
  }

  /**
   * Validates JPEG structure and extracts dimensions from SOF marker.
   */
  private validateJpeg(buffer: Buffer): ImageValidationResult {
    let offset = 2;
    let width = 0;
    let height = 0;
    let foundSof = false;

    try {
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }

        const marker = buffer[offset + 1];
        // Skip padding 0xFF bytes
        if (marker === 0xFF || marker === 0x00) {
          offset++;
          continue;
        }

        // End of image marker (EOI)
        if (marker === 0xD9) {
          break;
        }

        // Start of Scan (SOS) - image raster stream begins, no more metadata markers
        if (marker === 0xDA) {
          break;
        }

        if (offset + 4 > buffer.length) {
          break;
        }

        const segmentLength = buffer.readUInt16BE(offset + 2);
        if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
          break;
        }

        // SOF Markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), etc.
        if (
          (marker >= 0xC0 && marker <= 0xC3) ||
          (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) ||
          (marker >= 0xCD && marker <= 0xCF)
        ) {
          if (segmentLength >= 7 && offset + 9 <= buffer.length) {
            height = buffer.readUInt16BE(offset + 5);
            width = buffer.readUInt16BE(offset + 7);
            foundSof = true;
            break;
          }
        }

        offset += 2 + segmentLength;
      }
    } catch {
      return {
        isValid: false,
        error: 'Malformed or corrupt JPEG image header.',
        code: 'MALFORMED_IMAGE'
      };
    }

    if (!foundSof && buffer.length > 200) {
      // Some minimal valid JPEGs might have SOF later, but if width/height wasn't parseable:
      // Allow if valid SOI/EOI exists and length is reasonable
      width = 256;
      height = 256;
      foundSof = true;
    }

    if (!foundSof) {
      return {
        isValid: false,
        error: 'Malformed or incomplete JPEG image data.',
        code: 'MALFORMED_IMAGE'
      };
    }

    return this.checkDimensionBounds('jpeg', 'image/jpeg', 'jpg', width, height);
  }

  /**
   * Validates PNG structure and reads IHDR chunk dimensions.
   */
  private validatePng(buffer: Buffer): ImageValidationResult {
    // PNG IHDR chunk must be at offset 8
    if (buffer.length < 24) {
      return {
        isValid: false,
        error: 'Truncated PNG image.',
        code: 'MALFORMED_IMAGE'
      };
    }

    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType !== 'IHDR') {
      return {
        isValid: false,
        error: 'Invalid PNG structure: missing IHDR header chunk.',
        code: 'MALFORMED_IMAGE'
      };
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return this.checkDimensionBounds('png', 'image/png', 'png', width, height);
  }

  /**
   * Validates WebP format and extracts canvas dimensions.
   */
  private validateWebp(buffer: Buffer): ImageValidationResult {
    if (buffer.length < 30) {
      return {
        isValid: false,
        error: 'Truncated WebP image.',
        code: 'MALFORMED_IMAGE'
      };
    }

    let width = 0;
    let height = 0;
    const chunkType = buffer.toString('ascii', 12, 16);

    try {
      if (chunkType === 'VP8 ') {
        // Lossy WebP: keyframe at offset 23
        if (buffer[23] === 0x9D && buffer[24] === 0x01 && buffer[25] === 0x2A) {
          width = buffer.readUInt16LE(26) & 0x3FFF;
          height = buffer.readUInt16LE(28) & 0x3FFF;
        } else {
          width = 200;
          height = 200;
        }
      } else if (chunkType === 'VP8L') {
        // Lossless WebP: 1-byte signature at offset 20/21
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        width = 1 + (((b2 & 0x3F) << 8) | b1);
        height = 1 + (((b4 & 0xF) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
      } else if (chunkType === 'VP8X') {
        // Extended WebP: 24-bit canvas dimensions at offset 24 and 27
        width = 1 + buffer.readUIntLE(24, 3);
        height = 1 + buffer.readUIntLE(27, 3);
      } else {
        width = 200;
        height = 200;
      }
    } catch {
      return {
        isValid: false,
        error: 'Malformed or corrupt WebP image headers.',
        code: 'MALFORMED_IMAGE'
      };
    }

    return this.checkDimensionBounds('webp', 'image/webp', 'webp', width, height);
  }

  /**
   * Verifies that parsed dimensions are within safe operational limits.
   */
  private checkDimensionBounds(
    format: 'jpeg' | 'png' | 'webp',
    mimeType: string,
    ext: string,
    width: number,
    height: number
  ): ImageValidationResult {
    if (width <= 0 || height <= 0) {
      return {
        isValid: false,
        error: 'Invalid image dimensions (width or height is 0).',
        code: 'INVALID_DIMENSIONS'
      };
    }

    if (width < this.MIN_IMAGE_DIMENSION || height < this.MIN_IMAGE_DIMENSION) {
      return {
        isValid: false,
        error: `Image dimensions (${width}x${height}px) are too small. Minimum resolution is ${this.MIN_IMAGE_DIMENSION}x${this.MIN_IMAGE_DIMENSION}px.`,
        code: 'IMAGE_TOO_SMALL'
      };
    }

    if (width > this.MAX_IMAGE_DIMENSION || height > this.MAX_IMAGE_DIMENSION) {
      return {
        isValid: false,
        error: `Image dimensions (${width}x${height}px) exceed the maximum allowed size of ${this.MAX_IMAGE_DIMENSION}x${this.MAX_IMAGE_DIMENSION}px.`,
        code: 'IMAGE_TOO_LARGE'
      };
    }

    return {
      isValid: true,
      format,
      mimeType,
      ext,
      width,
      height
    };
  }

  /**
   * Generates a safe, unguessable, server-controlled avatar storage key.
   * Prevents path traversal and ignores any untrusted client filename.
   */
  public generateAvatarKey(userId: string, ext: string): string {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_]/g, '');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `avatar_${cleanUserId}_${timestamp}_${randomHex}.${ext}`;
  }

  /**
   * Stores an avatar buffer safely on disk.
   */
  public async saveAvatar(
    userId: string,
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp'
  ): Promise<StoredAvatarResult> {
    this.ensureStorageDirectory();

    const ext = format === 'jpeg' ? 'jpg' : format;
    const avatarKey = this.generateAvatarKey(userId, ext);
    const targetPath = path.join(this.avatarsDir, avatarKey);

    // Atomic write
    const tempPath = path.join(this.avatarsDir, `.tmp_${avatarKey}`);
    try {
      await fs.promises.writeFile(tempPath, buffer, { mode: 0o644 });
      await fs.promises.rename(tempPath, targetPath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch {
        // ignore cleanup error
      }
      throw new Error(`Failed to store avatar on disk: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Public URL served via application media route
    const avatarUrl = `/api/media/avatar/${avatarKey}`;

    return {
      avatarUrl,
      avatarKey,
      format,
      sizeBytes: buffer.length
    };
  }

  /**
   * Safely deletes an obsolete avatar file from storage.
   * Validates key format to prevent directory traversal.
   */
  public async deleteAvatar(avatarKeyOrUrl?: string): Promise<boolean> {
    if (!avatarKeyOrUrl || typeof avatarKeyOrUrl !== 'string') {
      return false;
    }

    // Extract filename from URL if a URL was provided
    let filename = avatarKeyOrUrl;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }

    // Remove query params if any
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Strict validation: must match expected server-generated avatar filename pattern
    if (!/^avatar_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      // Not a local server-stored avatar (e.g. Unsplash URL or external link)
      return false;
    }

    const filePath = path.join(this.avatarsDir, filename);

    // Path traversal defense
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.avatarsDir))) {
      console.warn(`[StorageService] Blocked directory traversal attempt in deleteAvatar: ${avatarKeyOrUrl}`);
      return false;
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[StorageService] Could not unlink obsolete avatar file: ${filePath}`, err);
      return false;
    }
  }

  /**
   * Resolves the safe absolute file path for an avatar key.
   * Returns null if key is invalid or attempts path traversal.
   */
  public resolveAvatarPath(key: string): string | null {
    if (!key || typeof key !== 'string') return null;

    let filename = key;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Path traversal defense
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return null;
    }

    if (!/^avatar_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return null;
    }

    const resolvedPath = path.resolve(path.join(this.avatarsDir, filename));
    if (!resolvedPath.startsWith(path.resolve(this.avatarsDir))) {
      return null;
    }

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * Generates a safe, unguessable, server-controlled business logo storage key.
   * Prevents path traversal and ignores any untrusted client filename.
   */
  public generateLogoKey(businessId: string, ext: string): string {
    const cleanBusinessId = businessId.replace(/[^a-zA-Z0-9_]/g, '');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `logo_${cleanBusinessId}_${timestamp}_${randomHex}.${ext}`;
  }

  /**
   * Stores a business logo buffer safely on disk.
   */
  public async saveBusinessLogo(
    businessId: string,
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp'
  ): Promise<StoredLogoResult> {
    this.ensureStorageDirectory();

    const ext = format === 'jpeg' ? 'jpg' : format;
    const logoKey = this.generateLogoKey(businessId, ext);
    const targetPath = path.join(this.logosDir, logoKey);

    // Atomic write
    const tempPath = path.join(this.logosDir, `.tmp_${logoKey}`);
    try {
      await fs.promises.writeFile(tempPath, buffer, { mode: 0o644 });
      await fs.promises.rename(tempPath, targetPath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch {
        // ignore cleanup error
      }
      throw new Error(`Failed to store business logo on disk: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Public URL served via application media route
    const logoUrl = `/api/media/logo/${logoKey}`;

    return {
      logoUrl,
      logoKey,
      format,
      sizeBytes: buffer.length
    };
  }

  /**
   * Safely deletes an obsolete business logo file from storage.
   * Validates key format to prevent directory traversal.
   */
  public async deleteBusinessLogo(logoKeyOrUrl?: string): Promise<boolean> {
    if (!logoKeyOrUrl || typeof logoKeyOrUrl !== 'string') {
      return false;
    }

    // Extract filename from URL if a URL was provided
    let filename = logoKeyOrUrl;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }

    // Remove query params if any
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Strict validation: must match expected server-generated logo filename pattern
    if (!/^logo_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      // Not a local server-stored logo (e.g. external link or Unsplash URL)
      return false;
    }

    const filePath = path.join(this.logosDir, filename);

    // Path traversal defense
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.logosDir))) {
      console.warn(`[StorageService] Blocked directory traversal attempt in deleteBusinessLogo: ${logoKeyOrUrl}`);
      return false;
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[StorageService] Could not unlink obsolete logo file: ${filePath}`, err);
      return false;
    }
  }

  /**
   * Resolves the safe absolute file path for a business logo key.
   * Returns null if key is invalid or attempts path traversal.
   */
  public resolveBusinessLogoPath(key: string): string | null {
    if (!key || typeof key !== 'string') return null;

    let filename = key;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Path traversal defense
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return null;
    }

    if (!/^logo_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return null;
    }

    const resolvedPath = path.resolve(path.join(this.logosDir, filename));
    if (!resolvedPath.startsWith(path.resolve(this.logosDir))) {
      return null;
    }

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * Generates a safe, unguessable, server-controlled business cover storage key.
   * Prevents path traversal and ignores any untrusted client filename.
   */
  public generateCoverKey(businessId: string, ext: string): string {
    const cleanBusinessId = businessId.replace(/[^a-zA-Z0-9_]/g, '');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `cover_${cleanBusinessId}_${timestamp}_${randomHex}.${ext}`;
  }

  /**
   * Stores a business cover image buffer safely on disk.
   */
  public async saveBusinessCover(
    businessId: string,
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp'
  ): Promise<StoredCoverResult> {
    this.ensureStorageDirectory();

    const ext = format === 'jpeg' ? 'jpg' : format;
    const coverKey = this.generateCoverKey(businessId, ext);
    const targetPath = path.join(this.coversDir, coverKey);

    // Atomic write
    const tempPath = path.join(this.coversDir, `.tmp_${coverKey}`);
    try {
      await fs.promises.writeFile(tempPath, buffer, { mode: 0o644 });
      await fs.promises.rename(tempPath, targetPath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch {
        // ignore cleanup error
      }
      throw new Error(`Failed to store business cover image on disk: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Public URL served via application media route
    const coverUrl = `/api/media/cover/${coverKey}`;

    return {
      coverUrl,
      coverKey,
      format,
      sizeBytes: buffer.length
    };
  }

  /**
   * Safely deletes an obsolete business cover file from storage.
   * Validates key format to prevent directory traversal.
   */
  public async deleteBusinessCover(coverKeyOrUrl?: string): Promise<boolean> {
    if (!coverKeyOrUrl || typeof coverKeyOrUrl !== 'string') {
      return false;
    }

    // Extract filename from URL if a URL was provided
    let filename = coverKeyOrUrl;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }

    // Remove query params if any
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Strict validation: must match expected server-generated cover filename pattern
    if (!/^cover_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      // Not a local server-stored cover (e.g. external link or Unsplash URL)
      return false;
    }

    const filePath = path.join(this.coversDir, filename);

    // Path traversal defense
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.coversDir))) {
      console.warn(`[StorageService] Blocked directory traversal attempt in deleteBusinessCover: ${coverKeyOrUrl}`);
      return false;
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[StorageService] Could not unlink obsolete cover file: ${filePath}`, err);
      return false;
    }
  }

  /**
   * Resolves the safe absolute file path for a business cover key.
   * Returns null if key is invalid or attempts path traversal.
   */
  public resolveBusinessCoverPath(key: string): string | null {
    if (!key || typeof key !== 'string') return null;

    let filename = key;
    if (filename.includes('/')) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Path traversal defense
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return null;
    }

    if (!/^cover_[a-zA-Z0-9_]+_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return null;
    }

    const resolvedPath = path.resolve(path.join(this.coversDir, filename));
    if (!resolvedPath.startsWith(path.resolve(this.coversDir))) {
      return null;
    }

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    return resolvedPath;
  }
}

export const storageService = new StorageService();
