import { AnonymizationService } from '../services/anonymization-service';
import { AnonymizationLevel } from '../types/privacy';

describe('AnonymizationService', () => {
  let anonymizationService: AnonymizationService;

  beforeEach(() => {
    anonymizationService = new AnonymizationService();
  });

  describe('Basic Anonymization', () => {
    it('should hash user identifiers', () => {
      const testData = {
        userId: 'john.doe@company.com',
        email: 'john.doe@company.com',
        author: 'john.doe'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);

      expect(result.anonymizedData.userId).not.toBe(testData.userId);
      expect(result.anonymizedData.email).not.toBe(testData.email);
      expect(result.anonymizedData.author).not.toBe(testData.author);
      expect(result.anonymizedData.userId).toMatch(/^[a-f0-9]{16}$/);
      expect(result.level).toBe(AnonymizationLevel.BASIC);
    });

    it('should anonymize IP addresses correctly', () => {
      const testData = {
        ip: '192.168.1.100',
        metadata: {
          clientIp: '10.0.0.50'
        }
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);

      expect(result.anonymizedData.ip).toBe('192.168.1.0');
      expect(result.anonymizedData.metadata.clientIp).toBe('10.0.0.0');
    });

    it('should handle IPv6 addresses', () => {
      const testData = {
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);

      expect(result.anonymizedData.ip).toBe('2001:0db8:85a3:0000::');
    });

    it('should preserve original data in result', () => {
      const testData = { userId: 'test123', data: 'sensitive' };
      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);

      expect(result.originalData).toEqual(testData);
      expect(result.originalData).not.toBe(testData); // Should be a copy
    });
  });

  describe('Enhanced Anonymization', () => {
    it('should anonymize filenames while preserving extensions', () => {
      const testData = {
        filename: 'secret_config.json',
        files: [
          { name: 'private.key' },
          { name: 'public.pem' }
        ]
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.ENHANCED);

      expect(result.anonymizedData.filename).toMatch(/^file_[a-f0-9]+\.json$/);
      expect(result.anonymizedData.files[0].name).toMatch(/^file_[a-f0-9]+\.key$/);
      expect(result.anonymizedData.files[1].name).toMatch(/^file_[a-f0-9]+\.pem$/);
    });

    it('should hash repository and branch names', () => {
      const testData = {
        repository: 'company/secret-project',
        branch: 'feature/user-authentication'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.ENHANCED);

      expect(result.anonymizedData.repository).not.toBe(testData.repository);
      expect(result.anonymizedData.branch).not.toBe(testData.branch);
      expect(result.anonymizedData.repository).toMatch(/^[a-f0-9]{16}$/);
      expect(result.anonymizedData.branch).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should anonymize text content', () => {
      const testData = {
        message: 'Fix bug in UserService for john@company.com',
        comment: 'This change affects the Authentication module'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.ENHANCED);

      expect(result.anonymizedData.message).toBe('Name word word Name word email@domain.com');
      expect(result.anonymizedData.comment).toBe('Name word word word Name word');
    });

    it('should handle nested objects', () => {
      const testData = {
        commit: {
          message: 'Update UserProfile settings',
          author: 'john.doe',
          files: [
            { filename: 'user_profile.ts' }
          ]
        }
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.ENHANCED);

      expect(result.anonymizedData.commit.message).toBe('Name Name word');
      expect(result.anonymizedData.commit.author).toMatch(/^[a-f0-9]{16}$/);
      expect(result.anonymizedData.commit.files[0].filename).toMatch(/^file_[a-f0-9]+\.ts$/);
    });
  });

  describe('Full Anonymization', () => {
    it('should remove identifying fields', () => {
      const testData = {
        userId: 'user123',
        name: 'John Doe',
        fullName: 'John Michael Doe',
        username: 'johndoe',
        phone: '555-1234',
        address: '123 Main St',
        personalNotes: 'Prefers morning meetings',
        data: 'some data'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.FULL);

      expect(result.anonymizedData.userId).toMatch(/^[a-f0-9]{16}$/);
      expect(result.anonymizedData.name).toBeUndefined();
      expect(result.anonymizedData.fullName).toBeUndefined();
      expect(result.anonymizedData.username).toBeUndefined();
      expect(result.anonymizedData.phone).toBeUndefined();
      expect(result.anonymizedData.address).toBeUndefined();
      expect(result.anonymizedData.personalNotes).toBeUndefined();
      expect(result.anonymizedData.data).toBe('some data'); // Non-identifying data preserved
    });

    it('should anonymize timestamps to quarters', () => {
      const testData = {
        timestamp: '2023-07-15T10:30:00Z',
        createdAt: '2023-11-22T14:45:00Z'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.FULL);

      expect(result.anonymizedData.timestamp).toBe('2023-Q3');
      expect(result.anonymizedData.createdAt).toBe('2023-Q4');
    });

    it('should handle arrays and nested structures', () => {
      const testData = {
        users: [
          {
            name: 'John Doe',
            timestamp: '2023-05-10T12:00:00Z',
            data: 'preserved'
          },
          {
            fullName: 'Jane Smith',
            createdAt: '2023-08-20T16:30:00Z',
            info: 'also preserved'
          }
        ]
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.FULL);

      expect(result.anonymizedData.users[0].name).toBeUndefined();
      expect(result.anonymizedData.users[0].timestamp).toBe('2023-Q2');
      expect(result.anonymizedData.users[0].data).toBe('preserved');
      
      expect(result.anonymizedData.users[1].fullName).toBeUndefined();
      expect(result.anonymizedData.users[1].createdAt).toBe('2023-Q3');
      expect(result.anonymizedData.users[1].info).toBe('also preserved');
    });
  });

  describe('No Anonymization', () => {
    it('should return original data unchanged', () => {
      const testData = {
        userId: 'user123',
        email: 'test@example.com',
        sensitiveData: 'should remain'
      };

      const result = anonymizationService.anonymizeData(testData, AnonymizationLevel.NONE);

      expect(result.anonymizedData).toEqual(testData);
      expect(result.level).toBe(AnonymizationLevel.NONE);
      expect(result.method).toBe('none_anonymization');
    });
  });

  describe('PII Detection', () => {
    it('should detect email addresses', () => {
      const dataWithEmail = { message: 'Contact john@example.com' };
      const dataWithoutEmail = { message: 'Contact support team' };

      expect(anonymizationService.containsPII(dataWithEmail)).toBe(true);
      expect(anonymizationService.containsPII(dataWithoutEmail)).toBe(false);
    });

    it('should detect phone numbers', () => {
      const dataWithPhone = { contact: '555-123-4567' };
      const dataWithoutPhone = { contact: 'email preferred' };

      expect(anonymizationService.containsPII(dataWithPhone)).toBe(true);
      expect(anonymizationService.containsPII(dataWithoutPhone)).toBe(false);
    });

    it('should detect IP addresses', () => {
      const dataWithIP = { server: '192.168.1.1' };
      const dataWithoutIP = { server: 'localhost' };

      expect(anonymizationService.containsPII(dataWithIP)).toBe(true);
      expect(anonymizationService.containsPII(dataWithoutIP)).toBe(false);
    });

    it('should detect sensitive keywords', () => {
      const dataWithPassword = { config: 'password=secret123' };
      const dataWithToken = { auth: 'api_key=abc123' };
      const dataSafe = { config: 'timeout=30' };

      expect(anonymizationService.containsPII(dataWithPassword)).toBe(true);
      expect(anonymizationService.containsPII(dataWithToken)).toBe(true);
      expect(anonymizationService.containsPII(dataSafe)).toBe(false);
    });

    it('should detect PII in nested objects', () => {
      const nestedData = {
        user: {
          profile: {
            contact: 'user@example.com'
          }
        }
      };

      expect(anonymizationService.containsPII(nestedData)).toBe(true);
    });
  });

  describe('Consistency', () => {
    it('should produce consistent hashes for same input', () => {
      const testData = { userId: 'consistent-test' };
      
      const result1 = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);
      const result2 = anonymizationService.anonymizeData(testData, AnonymizationLevel.BASIC);

      expect(result1.anonymizedData.userId).toBe(result2.anonymizedData.userId);
    });

    it('should produce different hashes for different inputs', () => {
      const testData1 = { userId: 'user1' };
      const testData2 = { userId: 'user2' };
      
      const result1 = anonymizationService.anonymizeData(testData1, AnonymizationLevel.BASIC);
      const result2 = anonymizationService.anonymizeData(testData2, AnonymizationLevel.BASIC);

      expect(result1.anonymizedData.userId).not.toBe(result2.anonymizedData.userId);
    });
  });
});