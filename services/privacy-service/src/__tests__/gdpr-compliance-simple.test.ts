import { GDPRComplianceService } from '../services/gdpr-compliance';
import { EncryptionService } from '../services/encryption-service';

// Mock the dependencies
const mockPrivacyService = {
  getUserPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
  applyPrivacyRules: jest.fn(),
  anonymizeData: jest.fn()
};

describe('GDPR Compliance Service - Basic Tests', () => {
  let gdprService: GDPRComplianceService;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    gdprService = new GDPRComplianceService(mockPrivacyService as any, encryptionService);
  });

  afterEach(() => {
    gdprService.shutdown();
  });

  describe('Data Retention Policy Management', () => {
    it('should create default retention policies on initialization', () => {
      const policies = gdprService.getAllRetentionPolicies();
      
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.dataType === 'user_profile')).toBe(true);
      expect(policies.some(p => p.dataType === 'activity_logs')).toBe(true);
      expect(policies.some(p => p.dataType === 'telemetry_data')).toBe(true);
      expect(policies.some(p => p.dataType === 'communication_data')).toBe(true);
      expect(policies.some(p => p.dataType === 'audit_logs')).toBe(true);
    });

    it('should create a new retention policy', () => {
      const policyData = {
        dataType: 'test_data',
        retentionPeriodDays: 30,
        autoDelete: true,
        legalBasis: 'Test purpose'
      };

      const policy = gdprService.createRetentionPolicy(policyData);

      expect(policy.id).toBeDefined();
      expect(policy.dataType).toBe('test_data');
      expect(policy.retentionPeriodDays).toBe(30);
      expect(policy.autoDelete).toBe(true);
      expect(policy.legalBasis).toBe('Test purpose');
      expect(policy.createdAt).toBeInstanceOf(Date);
      expect(policy.updatedAt).toBeInstanceOf(Date);
    });

    it('should update an existing retention policy', () => {
      const policy = gdprService.createRetentionPolicy({
        dataType: 'test_data',
        retentionPeriodDays: 30,
        autoDelete: true,
        legalBasis: 'Test purpose'
      });

      const updatedPolicy = gdprService.updateRetentionPolicy(policy.id, {
        retentionPeriodDays: 60,
        autoDelete: false
      });

      expect(updatedPolicy).not.toBeNull();
      expect(updatedPolicy!.retentionPeriodDays).toBe(60);
      expect(updatedPolicy!.autoDelete).toBe(false);
      expect(updatedPolicy!.updatedAt.getTime()).toBeGreaterThan(policy.createdAt.getTime());
    });

    it('should get retention policies by data type', () => {
      gdprService.createRetentionPolicy({
        dataType: 'test_data',
        retentionPeriodDays: 30,
        autoDelete: true,
        legalBasis: 'Test purpose'
      });

      gdprService.createRetentionPolicy({
        dataType: 'test_data',
        retentionPeriodDays: 60,
        autoDelete: false,
        legalBasis: 'Another test purpose'
      });

      const policies = gdprService.getRetentionPoliciesByDataType('test_data');
      expect(policies.length).toBe(2);
      expect(policies.every(p => p.dataType === 'test_data')).toBe(true);
    });
  });

  describe('GDPR Request Management', () => {
    const testUserId = 'user-123';

    it('should submit a GDPR access request', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'access',
        { reason: 'User wants to see their data' }
      );

      expect(request.id).toBeDefined();
      expect(request.userId).toBe(testUserId);
      expect(request.requestType).toBe('access');
      expect(request.status).toBe('pending');
      expect(request.requestedAt).toBeInstanceOf(Date);
      expect(request.requestDetails.reason).toBe('User wants to see their data');
    });

    it('should submit different types of GDPR requests', async () => {
      const requestTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'] as const;
      
      for (const requestType of requestTypes) {
        const request = await gdprService.submitGDPRRequest(
          testUserId,
          requestType,
          { type: requestType }
        );

        expect(request.requestType).toBe(requestType);
        expect(request.status).toBe('pending');
      }
    });

    it('should get user GDPR requests', async () => {
      await gdprService.submitGDPRRequest(testUserId, 'access', {});
      await gdprService.submitGDPRRequest(testUserId, 'erasure', {});
      await gdprService.submitGDPRRequest('other-user', 'access', {});

      const userRequests = gdprService.getUserGDPRRequests(testUserId);
      
      expect(userRequests.length).toBe(2);
      expect(userRequests.every(r => r.userId === testUserId)).toBe(true);
    });
  });

  describe('Data Export', () => {
    const testUserId = 'user-123';

    it('should export user data', async () => {
      const exportResult = await gdprService.exportUserData(testUserId, 'json');

      expect(exportResult.userId).toBe(testUserId);
      expect(exportResult.exportId).toBeDefined();
      expect(exportResult.format).toBe('json');
      expect(exportResult.data).toBeDefined();
      expect(exportResult.expiresAt).toBeInstanceOf(Date);
      expect(exportResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should encrypt exported data', async () => {
      const exportResult = await gdprService.exportUserData(testUserId);

      // The stored data should be encrypted
      expect(typeof exportResult.data).toBe('object');
      expect(exportResult.data).toHaveProperty('encryptedData');
      expect(exportResult.data).toHaveProperty('iv');
      expect(exportResult.data).toHaveProperty('keyId');
    });

    it('should allow downloading decrypted export data', async () => {
      const exportResult = await gdprService.exportUserData(testUserId);
      const downloadedData = await gdprService.downloadDataExport(exportResult.exportId);

      expect(downloadedData).toBeDefined();
      expect(downloadedData.personalData.userId).toBe(testUserId);
      expect(downloadedData.activityData.userId).toBe(testUserId);
      expect(downloadedData.preferences.userId).toBe(testUserId);
    });
  });

  describe('Data Deletion', () => {
    const testUserId = 'user-123';

    it('should initiate user data deletion', async () => {
      const deletionResult = await gdprService.deleteUserData(testUserId, ['personal']);

      expect(deletionResult.userId).toBe(testUserId);
      expect(deletionResult.deletionId).toBeDefined();
      expect(deletionResult.deletedDataTypes).toEqual(['personal']);
      expect(deletionResult.status).toBe('pending');
      expect(deletionResult.verificationHash).toBeDefined();
      expect(deletionResult.deletionStartedAt).toBeInstanceOf(Date);
    });

    it('should verify deletion with hash', async () => {
      const deletionResult = await gdprService.deleteUserData(testUserId, ['personal']);
      
      const isValid = gdprService.verifyDeletion(
        deletionResult.deletionId,
        deletionResult.verificationHash
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid verification hash', async () => {
      const deletionResult = await gdprService.deleteUserData(testUserId, ['personal']);
      
      const isValid = gdprService.verifyDeletion(
        deletionResult.deletionId,
        'invalid-hash'
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      const testUserId = 'user-123';
      
      // Create some test data
      await gdprService.submitGDPRRequest(testUserId, 'access', {});
      await gdprService.submitGDPRRequest(testUserId, 'erasure', {});

      const report = gdprService.generateComplianceReport();

      expect(report.reportGeneratedAt).toBeInstanceOf(Date);
      expect(report.period.from).toBeInstanceOf(Date);
      expect(report.period.to).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.requestsByType).toBeDefined();
      expect(report.retentionPolicies).toBeDefined();
      expect(typeof report.averageProcessingTime).toBe('number');
    });
  });

  describe('Automatic Data Purging', () => {
    it('should perform automatic data purging', async () => {
      // This is a basic test to ensure the method doesn't throw
      await expect(gdprService.performAutomaticDataPurging()).resolves.not.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should shutdown service properly', () => {
      const removeListenersSpy = jest.spyOn(gdprService, 'removeAllListeners');
      
      gdprService.shutdown();
      
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});