import { EncryptionService } from '../services/encryption-service';
import crypto from 'crypto';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = 'This is sensitive data that needs encryption';
      
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted.decryptedData).toBe(testData);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.keyId).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
    });

    it('should produce different encrypted output for same input', () => {
      const testData = 'Same input data';
      
      const encrypted1 = encryptionService.encrypt(testData);
      const encrypted2 = encryptionService.encrypt(testData);

      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to same data
      const decrypted1 = encryptionService.decrypt(encrypted1);
      const decrypted2 = encryptionService.decrypt(encrypted2);
      
      expect(decrypted1.decryptedData).toBe(testData);
      expect(decrypted2.decryptedData).toBe(testData);
    });

    it('should handle empty strings', () => {
      const testData = '';
      
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted.decryptedData).toBe(testData);
    });

    it('should handle unicode characters', () => {
      const testData = '🔐 Encrypted émojis and spëcial chars 中文';
      
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted.decryptedData).toBe(testData);
    });

    it('should handle large data', () => {
      const testData = 'x'.repeat(10000); // 10KB of data
      
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted.decryptedData).toBe(testData);
    });
  });

  describe('Object Encryption/Decryption', () => {
    it('should encrypt and decrypt objects correctly', () => {
      const testObject = {
        userId: 'user123',
        email: 'test@example.com',
        preferences: {
          theme: 'dark',
          notifications: true
        },
        tags: ['admin', 'developer']
      };
      
      const encrypted = encryptionService.encryptObject(testObject);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(testObject);
    });

    it('should handle nested objects and arrays', () => {
      const complexObject = {
        users: [
          { id: 1, name: 'John', roles: ['admin'] },
          { id: 2, name: 'Jane', roles: ['user', 'moderator'] }
        ],
        metadata: {
          created: '2023-07-25',
          version: 1.0,
          config: {
            debug: true,
            features: {
              auth: true,
              logging: false
            }
          }
        }
      };
      
      const encrypted = encryptionService.encryptObject(complexObject);
      const decrypted = encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(complexObject);
    });
  });

  describe('Key Management', () => {
    it('should generate new keys', () => {
      const initialKeyId = encryptionService.getCurrentKeyId();
      const newKeyId = encryptionService.generateNewKey();

      expect(newKeyId).not.toBe(initialKeyId);
      expect(newKeyId).toMatch(/^key_\d+_[a-f0-9]{16}$/);
    });

    it('should rotate keys correctly', () => {
      const oldKeyId = encryptionService.getCurrentKeyId();
      const newKeyId = encryptionService.rotateKey();

      expect(newKeyId).not.toBe(oldKeyId);
      expect(encryptionService.getCurrentKeyId()).toBe(newKeyId);

      // Old key should be deactivated
      const activeKeys = encryptionService.getActiveKeys();
      const oldKey = activeKeys.find(key => key.id === oldKeyId);
      expect(oldKey).toBeUndefined();
    });

    it('should encrypt with specific key', () => {
      const newKeyId = encryptionService.generateNewKey();
      const testData = 'Test data for specific key';

      const encrypted = encryptionService.encrypt(testData, newKeyId);
      expect(encrypted.keyId).toBe(newKeyId);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted.decryptedData).toBe(testData);
      expect(decrypted.keyId).toBe(newKeyId);
    });

    it('should handle key expiration', () => {
      // Create a key that expires in the past
      const keyId = encryptionService.generateNewKey();
      const key = (encryptionService as any).keys.get(keyId);
      key.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      
      expect(() => {
        encryptionService.encrypt('test', keyId);
      }).toThrow('Encryption key has expired');
    });

    it('should deactivate keys', () => {
      const keyId = encryptionService.generateNewKey();
      
      const deactivated = encryptionService.deactivateKey(keyId);
      expect(deactivated).toBe(true);

      expect(() => {
        encryptionService.encrypt('test', keyId);
      }).toThrow('Encryption key is inactive');
    });

    it('should delete keys safely', () => {
      const keyId = encryptionService.generateNewKey();
      
      const deleted = encryptionService.deleteKey(keyId);
      expect(deleted).toBe(true);

      expect(() => {
        encryptionService.encrypt('test', keyId);
      }).toThrow('Encryption key not found');
    });

    it('should not delete current active key', () => {
      const currentKeyId = encryptionService.getCurrentKeyId();
      
      expect(() => {
        encryptionService.deleteKey(currentKeyId);
      }).toThrow('Cannot delete current active key');
    });

    it('should cleanup expired keys', () => {
      const expiredKey1 = encryptionService.generateNewKey();
      const expiredKey2 = encryptionService.generateNewKey();
      const activeKey = encryptionService.generateNewKey(30);

      // Manually set expiration dates
      const key1 = (encryptionService as any).keys.get(expiredKey1);
      const key2 = (encryptionService as any).keys.get(expiredKey2);
      key1.expiresAt = new Date(Date.now() - 1000);
      key2.expiresAt = new Date(Date.now() - 1000);

      const deletedKeys = encryptionService.cleanupExpiredKeys();
      expect(deletedKeys).toContain(expiredKey1);
      expect(deletedKeys).toContain(expiredKey2);
      expect(deletedKeys).not.toContain(activeKey);
    });
  });

  describe('Deterministic Encryption', () => {
    it('should produce same hash for same input and salt', () => {
      const data = 'consistent data';
      const salt = 'consistent salt';

      const hash1 = encryptionService.encryptDeterministic(data, salt);
      const hash2 = encryptionService.encryptDeterministic(data, salt);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce different hashes for different salts', () => {
      const data = 'same data';
      const salt1 = 'salt1';
      const salt2 = 'salt2';

      const hash1 = encryptionService.encryptDeterministic(data, salt1);
      const hash2 = encryptionService.encryptDeterministic(data, salt2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Password Management', () => {
    it('should generate secure passwords', () => {
      const password = encryptionService.generateSecurePassword();
      
      expect(password).toHaveLength(32);
      expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/);
    });

    it('should generate passwords of specified length', () => {
      const shortPassword = encryptionService.generateSecurePassword(16);
      const longPassword = encryptionService.generateSecurePassword(64);
      
      expect(shortPassword).toHaveLength(16);
      expect(longPassword).toHaveLength(64);
    });

    it('should hash and verify passwords correctly', () => {
      const password = 'mySecurePassword123!';
      
      const { hash, salt } = encryptionService.hashPassword(password);
      
      expect(hash).toMatch(/^[a-f0-9]{128}$/); // scrypt produces 64-byte hash
      expect(salt).toMatch(/^[a-f0-9]{32}$/);
      
      const isValid = encryptionService.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
      
      const isInvalid = encryptionService.verifyPassword('wrongPassword', hash, salt);
      expect(isInvalid).toBe(false);
    });

    it('should use provided salt for password hashing', () => {
      const password = 'testPassword';
      const customSalt = 'customSalt123';
      
      const { hash, salt } = encryptionService.hashPassword(password, customSalt);
      
      expect(salt).toBe(customSalt);
      
      const isValid = encryptionService.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });
  });

  describe('Key Export/Import', () => {
    it('should export and import keys correctly', () => {
      const masterPassword = 'SuperSecret123!';
      const testData = 'test data for key export';
      
      // Encrypt some data with current keys
      const encrypted = encryptionService.encrypt(testData);
      
      // Export keys
      const exportedKeys = encryptionService.exportKeys(masterPassword);
      expect(exportedKeys).toBeTruthy();
      
      // Create new service and import keys
      const newService = new EncryptionService();
      newService.importKeys(exportedKeys, masterPassword);
      
      // Should be able to decrypt data with imported keys
      const decrypted = newService.decrypt(encrypted);
      expect(decrypted.decryptedData).toBe(testData);
    });

    it('should fail import with wrong master password', () => {
      const masterPassword = 'CorrectPass123!';
      const wrongPassword = 'WrongPass456@';
      
      const exportedKeys = encryptionService.exportKeys(masterPassword);
      
      const newService = new EncryptionService();
      expect(() => {
        newService.importKeys(exportedKeys, wrongPassword);
      }).toThrow();
    });
  });

  describe('Security Properties', () => {
    it('should not decrypt with wrong key', () => {
      const testData = 'sensitive data';
      const encrypted = encryptionService.encrypt(testData);
      
      // Tamper with key ID
      const tamperedEncrypted = {
        ...encrypted,
        keyId: 'invalid_key_id'
      };
      
      expect(() => {
        encryptionService.decrypt(tamperedEncrypted);
      }).toThrow('Decryption key not found');
    });

    it('should not decrypt tampered data', () => {
      const testData = 'sensitive data';
      const encrypted = encryptionService.encrypt(testData);
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.replace('a', 'b')
      };
      
      expect(() => {
        encryptionService.decrypt(tamperedEncrypted);
      }).toThrow();
    });

    it('should use different IVs for each encryption', () => {
      const testData = 'same data';
      
      const encrypted1 = encryptionService.encrypt(testData);
      const encrypted2 = encryptionService.encrypt(testData);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should include key ID in authentication', () => {
      const testData = 'test data';
      const encrypted = encryptionService.encrypt(testData);
      
      // Tamper with key ID after encryption
      const tamperedEncrypted = {
        ...encrypted,
        keyId: encryptionService.generateNewKey()
      };
      
      expect(() => {
        encryptionService.decrypt(tamperedEncrypted);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent encryptions', async () => {
      const testData = 'concurrent test data';
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(encryptionService.encrypt(testData + i)));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        const decrypted = encryptionService.decrypt(result);
        expect(decrypted.decryptedData).toBe(testData + index);
      });
    });

    it('should encrypt large objects efficiently', () => {
      const largeObject = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: [`tag${i}`, `category${i % 10}`]
          }
        }))
      };
      
      const startTime = Date.now();
      const encrypted = encryptionService.encryptObject(largeObject);
      const encryptTime = Date.now() - startTime;
      
      const decryptStartTime = Date.now();
      const decrypted = encryptionService.decryptObject(encrypted);
      const decryptTime = Date.now() - decryptStartTime;
      
      expect(decrypted).toEqual(largeObject);
      expect(encryptTime).toBeLessThan(1000); // Should encrypt in less than 1 second
      expect(decryptTime).toBeLessThan(1000); // Should decrypt in less than 1 second
    });
  });
});