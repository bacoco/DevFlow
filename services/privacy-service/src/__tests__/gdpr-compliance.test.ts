import { GDPRComplianceService, DataRetentionPolicy, GDPRRequest } from '../services/gdpr-compliance';
import { PrivacyService } from '../services/privacy-service';
import { EncryptionService } from '../services/encryption-service';
import { PrivacySettingsRepository } from '../repositories/privacy-settings-repository';
import { PrivacyRuleEngine } from '../services/privacy-rule-engine';
import { AnonymizationService } from '../services/anonymization-service';

describe('GDPR Compliance Service', () => {
  let gdprService: GDPRComplianceService;
  let privacyService: PrivacyService;
  let encryptionService: EncryptionService;
  let settingsRepository: PrivacySettingsRepository;
  let ruleEngine: PrivacyRuleEngine;
  let anonymizationService: AnonymizationService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    settingsRepository = new PrivacySettingsRepository();
    ruleEngine = new PrivacyRuleEngine();
    anonymizationService = new AnonymizationService(encryptionService);
    privacyService = new PrivacyService(settingsRepository, ruleEngine, anonymizationService);
    gdprService = new GDPRComplianceService(privacyService, encryptionService);
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

    it('should return null when updating non-existent policy', () => {
      const result = gdprService.updateRetentionPolicy('non-existent', {
        retentionPeriodDays: 60
      });

      expect(result).toBeNull();
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

    it('should submit a GDPR erasure request', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'erasure',
        { dataTypes: ['personal', 'activity'] }
      );

      expect(request.requestType).toBe('erasure');
      expect(request.requestDetails.dataTypes).toEqual(['personal', 'activity']);
    });

    it('should auto-process access requests', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'access',
        { reason: 'User wants to see their data' }
      );

      // Wait for auto-processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const processedRequest = gdprService.getGDPRRequest(request.id);
      expect(processedRequest?.status).toBe('completed');
      expect(processedRequest?.responseData).toBeDefined();
      expect(processedRequest?.responseData.exportId).toBeDefined();
    });

    it('should auto-process portability requests', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'portability',
        { format: 'json' }
      );

      // Wait for auto-processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const processedRequest = gdprService.getGDPRRequest(request.id);
      expect(processedRequest?.status).toBe('completed');
      expect(processedRequest?.responseData.exportId).toBeDefined();
    });

    it('should process erasure requests', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'erasure',
        { dataTypes: ['personal'] }
      );

      const processedRequest = await gdprService.processGDPRRequest(request.id);
      
      expect(processedRequest?.status).toBe('completed');
      expect(processedRequest?.responseData.deletionId).toBeDefined();
    });

    it('should get user GDPR requests', async () => {
      await gdprService.submitGDPRRequest(testUserId, 'access', {});
      await gdprService.submitGDPRRequest(testUserId, 'erasure', {});
      await gdprService.submitGDPRRequest('other-user', 'access', {});

      const userRequests = gdprService.getUserGDPRRequests(testUserId);
      
      expect(userRequests.length).toBe(2);
      expect(userRequests.every(r => r.userId === testUserId)).toBe(true);
    });

    it('should handle request processing errors gracefully', async () => {
      const request = await gdprService.submitGDPRRequest(
        testUserId,
        'rectification',
        { invalidData: true }
      );

      // Mock an error during processing
      const originalMethod = gdprService['collectPersonalData'];
      gdprService['collectPersonalData'] = jest.fn().mockRejectedValue(new Error('Database error'));

      const processedRequest = await gdprService.processGDPRRequest(request.id);
      
      expect(processedRequest?.status).toBe('rejected');
      expect(processedRequest?.rejectionReason).toBe('Database error');

      // Restore original method
      gdprService['collectPersonalData'] = originalMethod;
    });
  });

  describe('Data Export (Right to Access)', () => {
    const testUserId = 'user-123';

    it('should export user data in JSON format', async () => {
      const exportResult = await gdprService.exportUserData(testUserId, 'json');

      expect(exportResult.userId).toBe(testUserId);
      expect(exportResult.exportId).toBeDefined();
      expect(exportResult.format).toBe('json');
      expect(exportResult.data).toBeDefined();
      expect(exportResult.expiresAt).toBeInstanceOf(Date);
      expect(exportResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include all required data types in export', async () => {
      const exportResult = await gdprService.exportUserData(testUserId);
      const decryptedData = await gdprService.downloadDataExport(exportResult.exportId);

      expect(decryptedData.personalData).toBeDefined();
      expect(decryptedData.activityData).toBeDefined();
      expect(decryptedData.preferences).toBeDefined();
      expect(decryptedData.metadata).toBeDefined();
      expect(decryptedData.metadata.exportedAt).toBeDefined();
      expect(decryptedData.metadata.dataTypes).toContain('personal');
      expect(decryptedData.metadata.dataTypes).toContain('activity');
      expect(decryptedData.metadata.dataTypes).toContain('preferences');
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

    it('should return null for expired exports', async () => {
      const exportResult = await gdprService.exportUserData(testUserId);
      
      // Manually expire the export
      exportResult.expiresAt = new Date(Date.now() - 1000);

      const retrievedExport = gdprService.getDataExport(exportResult.exportId);
      expect(retrievedExport).toBeNull();
    });

    it('should return null for non-existent exports', async () => {
      const result = gdprService.getDataExport('non-existent-export');
      expect(result).toBeNull();
    });
  });

  describe('Data Deletion (Right to Erasure)', () => {
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

    it('should complete data deletion asynchronously', async () => {
      const deletionResult = await gdprService.deleteUserData(testUserId, ['all']);

      // Wait for async deletion to complete
      await new Promise(resolve => setTimeout(resolve, 2500));

      const updatedResult = gdprService.getDeletionResult(deletionResult.deletionId);
      expect(updatedResult?.status).toBe('completed');
      expect(updatedResult?.deletionCompletedAt).toBeInstanceOf(Date);
    });

    it('should handle deletion errors gracefully', async () => {
      // Mock deletion failure
      const originalMethod = gdprService['deletePersonalData'];
      gdprService['deletePersonalData'] = jest.fn().mockRejectedValue(new Error('Deletion failed'));

      const deletionResult = await gdprService.deleteUserData(testUserId, ['personal']);

      // Wait for async deletion to fail
      await new Promise(resolve => setTimeout(resolve, 2500));

      const updatedResult = gdprService.getDeletionResult(deletionResult.deletionId);
      expect(updatedResult?.status).toBe('failed');
      expect(updatedResult?.errors).toContain('Deletion failed');

      // Restore original method
      gdprService['deletePersonalData'] = originalMethod;
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

    it('should get user deletions', async () => {
      await gdprService.deleteUserData(testUserId, ['personal']);
      await gdprService.deleteUserData(testUserId, ['activity']);
      await gdprService.deleteUserData('other-user', ['personal']);

      const userDeletions = gdprService.getUserDeletions(testUserId);
      
      expect(userDeletions.length).toBe(2);
      expect(userDeletions.every(d => d.userId === testUserId)).toBe(true);
    });
  });

  describe('Automatic Data Purging', () => {
    it('should perform automatic data purging', async () => {
      const purgeSpy = jest.spyOn(gdprService as any, 'purgeDataByPolicy');
      
      await gdprService.performAutomaticDataPurging();
      
      expect(purgeSpy).toHaveBeenCalled();
      
      purgeSpy.mockRestore();
    });

    it('should emit events during data purging', async () => {
      const dataPurgedSpy = jest.fn();
      gdprService.on('dataPurged', dataPurgedSpy);

      await gdprService.performAutomaticDataPurging();

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(dataPurgedSpy).toHaveBeenCalled();
    });

    it('should handle purging errors gracefully', async () => {
      const errorSpy = jest.fn();
      gdprService.on('dataPurgeError', errorSpy);

      // Mock purging error
      const originalMethod = gdprService['purgeDataByPolicy'];
      gdprService['purgeDataByPolicy'] = jest.fn().mockRejectedValue(new Error('Purge failed'));

      await gdprService.performAutomaticDataPurging();

      expect(errorSpy).toHaveBeenCalled();

      // Restore original method
      gdprService['purgeDataByPolicy'] = originalMethod;
    });
  });

  describe('Compliance Reporting', () => {
    const testUserId = 'user-123';

    it('should generate compliance report', async () => {
      // Create some test data
      await gdprService.submitGDPRRequest(testUserId, 'access', {});
      await gdprService.submitGDPRRequest(testUserId, 'erasure', {});
      await gdprService.exportUserData(testUserId);
      await gdprService.deleteUserData(testUserId, ['personal']);

      const report = gdprService.generateComplianceReport();

      expect(report.reportGeneratedAt).toBeInstanceOf(Date);
      expect(report.period.from).toBeInstanceOf(Date);
      expect(report.period.to).toBeInstanceOf(Date);
      expect(report.summary.totalGDPRRequests).toBeGreaterThanOrEqual(2);
      expect(report.summary.dataExports).toBeGreaterThanOrEqual(1);
      expect(report.summary.dataDeletions).toBeGreaterThanOrEqual(1);
      expect(report.requestsByType).toBeDefined();
      expect(report.retentionPolicies).toBeDefined();
      expect(typeof report.averageProcessingTime).toBe('number');
    });

    it('should calculate average processing time correctly', async () => {
      const request1 = await gdprService.submitGDPRRequest(testUserId, 'access', {});
      const request2 = await gdprService.submitGDPRRequest(testUserId, 'portability', {});

      // Wait for auto-processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const report = gdprService.generateComplianceReport();
      
      expect(report.averageProcessingTime).toBeGreaterThan(0);
      expect(report.summary.completedRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit events for retention policy creation', () => {
      const eventSpy = jest.fn();
      gdprService.on('retentionPolicyCreated', eventSpy);

      gdprService.createRetentionPolicy({
        dataType: 'test_data',
        retentionPeriodDays: 30,
        autoDelete: true,
        legalBasis: 'Test purpose'
      });

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should emit events for GDPR request lifecycle', async () => {
      const submittedSpy = jest.fn();
      const processingSpy = jest.fn();
      const completedSpy = jest.fn();

      gdprService.on('gdprRequestSubmitted', submittedSpy);
      gdprService.on('gdprRequestProcessing', processingSpy);
      gdprService.on('gdprRequestCompleted', completedSpy);

      const request = await gdprService.submitGDPRRequest('user-123', 'access', {});
      
      // Wait for auto-processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(submittedSpy).toHaveBeenCalled();
      expect(processingSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });

    it('should emit events for data export and deletion', async () => {
      const exportSpy = jest.fn();
      const deletionStartedSpy = jest.fn();
      const deletionCompletedSpy = jest.fn();

      gdprService.on('dataExported', exportSpy);
      gdprService.on('dataDeletionStarted', deletionStartedSpy);
      gdprService.on('dataDeletionCompleted', deletionCompletedSpy);

      await gdprService.exportUserData('user-123');
      await gdprService.deleteUserData('user-123', ['personal']);

      // Wait for async deletion
      await new Promise(resolve => setTimeout(resolve, 2500));

      expect(exportSpy).toHaveBeenCalled();
      expect(deletionStartedSpy).toHaveBeenCalled();
      expect(deletionCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('Service Lifecycle', () => {
    it('should start automatic cleanup on initialization', () => {
      const service = new GDPRComplianceService(privacyService, encryptionService);
      
      expect(service['cleanupInterval']).not.toBeNull();
      
      service.shutdown();
    });

    it('should cleanup resources on shutdown', () => {
      const service = new GDPRComplianceService(privacyService, encryptionService);
      const removeListenersSpy = jest.spyOn(service, 'removeAllListeners');
      
      service.shutdown();
      
      expect(service['cleanupInterval']).toBeNull();
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});