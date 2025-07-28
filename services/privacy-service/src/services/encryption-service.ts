import crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  keyId: string;
  algorithm: string;
}

export interface DecryptionResult {
  decryptedData: string;
  keyId: string;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class EncryptionService {
  private keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  constructor() {
    this.currentKeyId = this.generateMasterKey();
  }

  private generateMasterKey(): string {
    const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const key: EncryptionKey = {
      id: keyId,
      key: crypto.randomBytes(this.keyLength),
      algorithm: this.algorithm,
      createdAt: new Date(),
      isActive: true
    };
    
    this.keys.set(keyId, key);
    return keyId;
  }

  generateNewKey(expiresInDays?: number): string {
    const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = expiresInDays !== undefined
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const key: EncryptionKey = {
      id: keyId,
      key: crypto.randomBytes(this.keyLength),
      algorithm: this.algorithm,
      createdAt: new Date(),
      expiresAt,
      isActive: true
    };
    
    this.keys.set(keyId, key);
    return keyId;
  }

  rotateKey(): string {
    // Deactivate current key
    const currentKey = this.keys.get(this.currentKeyId);
    if (currentKey) {
      currentKey.isActive = false;
    }

    // Generate new key
    this.currentKeyId = this.generateNewKey();
    return this.currentKeyId;
  }

  encrypt(data: string, keyId?: string): EncryptionResult {
    const useKeyId = keyId || this.currentKeyId;
    const key = this.keys.get(useKeyId);
    
    if (!key) {
      throw new Error(`Encryption key not found: ${useKeyId}`);
    }

    if (!key.isActive) {
      throw new Error(`Encryption key is inactive: ${useKeyId}`);
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new Error(`Encryption key has expired: ${useKeyId}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(key.algorithm, key.key, iv) as crypto.CipherGCM;
    cipher.setAAD(Buffer.from(useKeyId)); // Additional authenticated data
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    const encryptedData = encrypted + ':' + authTag.toString('hex');

    return {
      encryptedData,
      iv: iv.toString('hex'),
      keyId: useKeyId,
      algorithm: key.algorithm
    };
  }

  decrypt(encryptionResult: EncryptionResult): DecryptionResult {
    const key = this.keys.get(encryptionResult.keyId);
    
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptionResult.keyId}`);
    }

    const [encryptedData, authTagHex] = encryptionResult.encryptedData.split(':');
    const authTag = Buffer.from(authTagHex, 'hex');
    const iv = Buffer.from(encryptionResult.iv, 'hex');

    const decipher = crypto.createDecipheriv(key.algorithm, key.key, iv) as crypto.DecipherGCM;
    decipher.setAAD(Buffer.from(encryptionResult.keyId));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return {
      decryptedData: decrypted,
      keyId: encryptionResult.keyId
    };
  }

  encryptObject(obj: any, keyId?: string): EncryptionResult {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, keyId);
  }

  decryptObject<T>(encryptionResult: EncryptionResult): T {
    const decryptionResult = this.decrypt(encryptionResult);
    return JSON.parse(decryptionResult.decryptedData) as T;
  }

  // Hash-based encryption for deterministic results (useful for indexing)
  encryptDeterministic(data: string, salt: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(data + salt);
    return hash.digest('hex');
  }

  // Key management methods
  getActiveKeys(): EncryptionKey[] {
    return Array.from(this.keys.values()).filter(key => key.isActive);
  }

  getExpiredKeys(): EncryptionKey[] {
    const now = new Date();
    return Array.from(this.keys.values()).filter(key => 
      key.expiresAt && key.expiresAt < now
    );
  }

  deactivateKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (key) {
      key.isActive = false;
      return true;
    }
    return false;
  }

  deleteKey(keyId: string): boolean {
    if (keyId === this.currentKeyId) {
      throw new Error('Cannot delete current active key');
    }
    return this.keys.delete(keyId);
  }

  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  // Validate master password strength
  private validateMasterPassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Master password too weak: minimum 8 characters required');
    }
    
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new Error('Master password too weak: common password detected');
    }
    
    // Check for basic complexity
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const complexityScore = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (complexityScore < 3) {
      throw new Error('Master password too weak: must contain at least 3 of: lowercase, uppercase, numbers, special characters');
    }
  }

  // Secure key export for backup (encrypted with master password)
  exportKeys(masterPassword: string): string {
    this.validateMasterPassword(masterPassword);
    const keyData = Array.from(this.keys.entries()).map(([id, key]) => ({
      id,
      key: key.key.toString('hex'),
      algorithm: key.algorithm,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      isActive: key.isActive
    }));

    const exportData = {
      keys: keyData,
      currentKeyId: this.currentKeyId,
      exportedAt: new Date().toISOString()
    };

    // Encrypt the export with master password
    const masterKey = crypto.scryptSync(masterPassword, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(JSON.stringify(exportData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  // Import keys from backup
  importKeys(exportedData: string, masterPassword: string): void {
    const parsed = JSON.parse(exportedData);
    const masterKey = crypto.scryptSync(masterPassword, 'salt', 32);
    const iv = Buffer.from(parsed.iv, 'hex');
    const authTag = Buffer.from(parsed.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(parsed.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const importData = JSON.parse(decrypted);
    
    // Clear existing keys
    this.keys.clear();
    
    // Import keys
    importData.keys.forEach((keyData: any) => {
      const key: EncryptionKey = {
        id: keyData.id,
        key: Buffer.from(keyData.key, 'hex'),
        algorithm: keyData.algorithm,
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined,
        isActive: keyData.isActive
      };
      this.keys.set(key.id, key);
    });

    this.currentKeyId = importData.currentKeyId;
  }

  // Cleanup expired keys
  cleanupExpiredKeys(): string[] {
    const expiredKeys = this.getExpiredKeys();
    const deletedKeys: string[] = [];

    expiredKeys.forEach(key => {
      if (key.id !== this.currentKeyId) {
        this.keys.delete(key.id);
        deletedKeys.push(key.id);
      }
    });

    return deletedKeys;
  }

  // Generate secure random password
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  // Secure hash for passwords
  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, useSalt, 64).toString('hex');
    return { hash, salt: useSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  }
}