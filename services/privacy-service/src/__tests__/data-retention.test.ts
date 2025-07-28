import { DataRetentionService, RetentionJob, DataRecord } from '../services/data-retention';
import { GDPRComplianceService } from '../services/gdpr-compliance';
import { PrivacyService } from '../services/privacy-service';
import { EncryptionService } from '../services/encryption-service';
import { PrivacySettingsRepository } from '../repositories/privacy-settings-repository';
import { PrivacyRuleEngine } from '../services/privacy-rule-engine';
import { AnonymizationService } from '../services/anonymization-service';

describe('Data Retention Service', () => {
  let retentionService: DataRetentionService;
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
    retentionService = new DataRetentionService(gdprService);
  });

  afterEach(() => {
    retentionService.shutdown();
    gdprService.shutdown();
  });

  describe('Service Initialization', () => {
    it('should initialize and start the service', () => {
      const status = retentionService.getServiceStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should emit serviceStarted event on initialization', (done) => {
      const newService = new DataRetentionService(gdprService);
      
      newService.on('serviceStarted', () => {
        expect(true).toBe(true);
        newService.shutdown();
        done();
      });
    });
  });

  describe('Data Record Management', () => {
    it('should add a data record', () => {
      const recordData = {
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date(),
        metadata: { test: true }
      };

      const record = retentionService.addDataRecord(recordData);

      expect(record.id).toBeDefined();
      expect(record.userId).toBe('user-123');
      expect(record.dataType).toBe('user_profile');
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.metadata.test).toBe(true);
    });

    it('should emit recordAdded event when adding a record', (done) => {
      retentionService.on('recordAdded', (record) => {
        expect(record.userId).toBe('user-123');
        done();
      });

      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });
    });

    it('should update a data record', () => {
      const record = retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      const updatedRecord = retentionService.updateDataRecord(record.id, {
        lastAccessedAt: new Date(),
        metadata: { updated: true }
      });

      expect(updatedRecord).not.toBeNull();
      expect(updatedRecord!.lastAccessedAt).toBeInstanceOf(Date);
      expect(updatedRecord!.metadata.updated).toBe(true);
    });

    it('should return null when updating non-existent record', () => {
      const result = retentionService.updateDataRecord('non-existent', {
        lastAccessedAt: new Date()
      });

      expect(result).toBeNull();
    });

    it('should get data record by ID', () => {
      const record = retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      const retrievedRecord = retentionService.getDataRecord(record.id);
      expect(retrievedRecord).toEqual(record);
    });

    it('should get data records by user', () => {
      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'activity_logs',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId: 'user-456',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      const userRecords = retentionService.getDataRecordsByUser('user-123');
      expect(userRecords.length).toBe(2);
      expect(userRecords.every(r => r.userId === 'user-123')).toBe(true);
    });

    it('should get data records by type', () => {
      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId: 'user-456',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'activity_logs',
        createdAt: new Date()
      });

      const profileRecords = retentionService.getDataRecordsByType('user_profile');
      expect(profileRecords.length).toBe(2);
      expect(profileRecords.every(r => r.dataType === 'user_profile')).toBe(true);
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule retention jobs for auto-delete policies', () => {
      const initialJobCount = retentionService.getRetentionJobs().length;
      
      retentionService.scheduleRetentionJobs();
      
      const finalJobCount = retentionService.getRetentionJobs().length;
      expect(finalJobCount).toBeGreaterThan(initialJobCount);
    });

    it('should emit jobsScheduled event', (done) => {
      retentionService.on('jobsScheduled', (data) => {
        expect(data.count).toBeGreaterThan(0);
        done();
      });

      retentionService.scheduleRetentionJobs();
    });

    it('should emit jobScheduled event for each job', (done) => {
      let eventCount = 0;
      
      retentionService.on('jobScheduled', (job) => {
        expect(job.id).toBeDefined();
        expect(job.policyId).toBeDefined();
        expect(job.status).toBe('scheduled');
        eventCount++;
        
        if (eventCount >= 1) {
          done();
        }
      });

      retentionService.scheduleRetentionJobs();
    });
  });

  describe('Job Execution', () => {
    it('should execute immediate retention job', async () => {
      const policies = gdprService.getAllRetentionPolicies();
      const policy = policies.find(p => p.autoDelete);
      
      if (!policy) {
        throw new Error('No auto-delete policy found for testing');
      }

      // Add some old data that should be deleted
      const oldDate = new Date(Date.now() - (policy.retentionPeriodDays + 1) * 24 * 60 * 60 * 1000);
      retentionService.addDataRecord({
        userId: 'user-123',
        dataType: policy.dataType,
        createdAt: oldDate
      });

      const job = await retentionService.executeImmediateRetention(policy.id);
      
      expect(job.status).toBe('completed');
      expect(job.recordsProcessed).toBeGreaterThanOrEqual(0);
      expect(job.recordsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should handle job execution errors gracefully', async () => {
      const result = await retentionService.executeImmediateRetention('non-existent-policy');
      
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Retention policy not found: non-existent-policy');
    });

    it('should emit job lifecycle events', async () => {
      const events: string[] = [];
      
      retentionService.on('jobStarted', () => events.push('started'));
      retentionService.on('jobCompleted', () => events.push('completed'));
      retentionService.on('dataRetained', () => events.push('dataRetained'));

      const policies = gdprService.getAllRetentionPolicies();
      const policy = policies.find(p => p.autoDelete);
      
      if (policy) {
        await retentionService.executeImmediateRetention(policy.id);
        
        expect(events).toContain('started');
        expect(events).toContain('completed');
        expect(events).toContain('dataRetained');
      }
    });

    it('should delete user data immediately', async () => {
      const userId = 'user-123';
      
      // Add multiple records for the user
      retentionService.addDataRecord({
        userId,
        dataType: 'user_profile',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId,
        dataType: 'activity_logs',
        createdAt: new Date()
      });

      retentionService.addDataRecord({
        userId: 'other-user',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      const initialUserRecords = retentionService.getDataRecordsByUser(userId);
      expect(initialUserRecords.length).toBe(2);

      const deletedCount = await retentionService.deleteUserDataImmediately(userId);
      
      expect(deletedCount).toBe(2);
      
      const finalUserRecords = retentionService.getDataRecordsByUser(userId);
      expect(finalUserRecords.length).toBe(0);
      
      // Other user's data should remain
      const otherUserRecords = retentionService.getDataRecordsByUser('other-user');
      expect(otherUserRecords.length).toBe(1);
    });

    it('should emit userDataDeleted event', async () => {
      const userId = 'user-123';
      let eventEmitted = false;
      
      retentionService.on('userDataDeleted', (data) => {
        expect(data.userId).toBe(userId);
        expect(data.recordsDeleted).toBeGreaterThan(0);
        eventEmitted = true;
      });

      retentionService.addDataRecord({
        userId,
        dataType: 'user_profile',
        createdAt: new Date()
      });

      await retentionService.deleteUserDataImmediately(userId);
      
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Metrics and Reporting', () => {
    beforeEach(() => {
      // Add test data with various ages
      const now = new Date();
      
      // Recent data (last 30 days)
      retentionService.addDataRecord({
        userId: 'user-1',
        dataType: 'user_profile',
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      });

      // Medium age data (last 90 days)
      retentionService.addDataRecord({
        userId: 'user-2',
        dataType: 'activity_logs',
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      });

      // Old data (last 365 days)
      retentionService.addDataRecord({
        userId: 'user-3',
        dataType: 'telemetry_data',
        createdAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000)
      });

      // Very old data (older than 365 days)
      retentionService.addDataRecord({
        userId: 'user-4',
        dataType: 'communication_data',
        createdAt: new Date(now.getTime() - 500 * 24 * 60 * 60 * 1000)
      });
    });

    it('should generate retention metrics', () => {
      const metrics = retentionService.getRetentionMetrics();

      expect(metrics.totalRecords).toBe(4);
      expect(metrics.recordsByDataType['user_profile']).toBe(1);
      expect(metrics.recordsByDataType['activity_logs']).toBe(1);
      expect(metrics.recordsByDataType['telemetry_data']).toBe(1);
      expect(metrics.recordsByDataType['communication_data']).toBe(1);

      expect(metrics.recordsByAge.last30Days).toBe(1);
      expect(metrics.recordsByAge.last90Days).toBe(1);
      expect(metrics.recordsByAge.last365Days).toBe(1);
      expect(metrics.recordsByAge.older).toBe(1);
    });

    it('should calculate upcoming deletions', () => {
      // Add data that will be deleted soon
      const now = new Date();
      const policy = gdprService.getAllRetentionPolicies().find(p => p.autoDelete);
      
      if (policy) {
        // Data that will be deleted in 5 days
        const nearDeletionDate = new Date(now.getTime() - (policy.retentionPeriodDays - 5) * 24 * 60 * 60 * 1000);
        retentionService.addDataRecord({
          userId: 'user-5',
          dataType: policy.dataType,
          createdAt: nearDeletionDate
        });

        const metrics = retentionService.getRetentionMetrics();
        expect(metrics.upcomingDeletions.next7Days).toBeGreaterThanOrEqual(1);
      }
    });

    it('should get retention jobs by status', async () => {
      const policies = gdprService.getAllRetentionPolicies();
      const policy = policies.find(p => p.autoDelete);
      
      if (policy) {
        await retentionService.executeImmediateRetention(policy.id);
        
        const completedJobs = retentionService.getRetentionJobs('completed');
        expect(completedJobs.length).toBeGreaterThanOrEqual(1);
        expect(completedJobs.every(j => j.status === 'completed')).toBe(true);
      }
    });

    it('should get service status', () => {
      const status = retentionService.getServiceStatus();

      expect(status.isRunning).toBe(true);
      expect(typeof status.scheduledJobs).toBe('number');
      expect(typeof status.completedJobs).toBe('number');
      expect(typeof status.failedJobs).toBe('number');
      expect(typeof status.totalRecords).toBe('number');
    });
  });

  describe('Policy Compliance', () => {
    it('should check policy compliance', () => {
      // Add compliant data
      retentionService.addDataRecord({
        userId: 'user-1',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      const compliance = retentionService.checkPolicyCompliance();
      
      expect(compliance.compliant).toBe(true);
      expect(compliance.violations.length).toBe(0);
    });

    it('should detect overdue deletion violations', () => {
      const policies = gdprService.getAllRetentionPolicies();
      const policy = policies.find(p => p.autoDelete);
      
      if (policy) {
        // Add overdue data
        const overdueDate = new Date(Date.now() - (policy.retentionPeriodDays + 10) * 24 * 60 * 60 * 1000);
        retentionService.addDataRecord({
          userId: 'user-1',
          dataType: policy.dataType,
          createdAt: overdueDate
        });

        const compliance = retentionService.checkPolicyCompliance();
        
        expect(compliance.compliant).toBe(false);
        expect(compliance.violations.length).toBeGreaterThan(0);
        
        const violation = compliance.violations.find(v => v.violationType === 'overdue_deletion');
        expect(violation).toBeDefined();
        expect(violation!.recordCount).toBeGreaterThan(0);
      }
    });

    it('should detect missing policy violations', () => {
      // Add data with unknown type
      retentionService.addDataRecord({
        userId: 'user-1',
        dataType: 'unknown_data_type',
        createdAt: new Date()
      });

      const compliance = retentionService.checkPolicyCompliance();
      
      expect(compliance.compliant).toBe(false);
      
      const violation = compliance.violations.find(v => v.violationType === 'missing_policy');
      expect(violation).toBeDefined();
      expect(violation!.dataType).toBe('unknown_data_type');
    });
  });

  describe('Service Management', () => {
    it('should pause and resume service', () => {
      expect(retentionService.getServiceStatus().isRunning).toBe(true);

      retentionService.pauseService();
      expect(retentionService.getServiceStatus().isRunning).toBe(false);

      retentionService.resumeService();
      expect(retentionService.getServiceStatus().isRunning).toBe(true);
    });

    it('should emit service lifecycle events', (done) => {
      let eventCount = 0;
      const expectedEvents = ['servicePaused', 'serviceResumed'];
      
      const eventHandler = (eventName: string) => {
        expect(expectedEvents).toContain(eventName);
        eventCount++;
        
        if (eventCount === expectedEvents.length) {
          done();
        }
      };

      retentionService.on('servicePaused', () => eventHandler('servicePaused'));
      retentionService.on('serviceResumed', () => eventHandler('serviceResumed'));

      retentionService.pauseService();
      retentionService.resumeService();
    });

    it('should shutdown service properly', () => {
      const removeListenersSpy = jest.spyOn(retentionService, 'removeAllListeners');
      
      retentionService.shutdown();
      
      expect(retentionService.getServiceStatus().isRunning).toBe(false);
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should simulate data creation', () => {
      const initialCount = retentionService.getRetentionMetrics().totalRecords;
      
      retentionService.simulateDataCreation(50);
      
      const finalCount = retentionService.getRetentionMetrics().totalRecords;
      expect(finalCount).toBe(initialCount + 50);
    });

    it('should create diverse simulated data', () => {
      retentionService.simulateDataCreation(20);
      
      const metrics = retentionService.getRetentionMetrics();
      
      // Should have multiple data types
      expect(Object.keys(metrics.recordsByDataType).length).toBeGreaterThan(1);
      
      // Should have records of different ages
      const ageCategories = [
        metrics.recordsByAge.last30Days,
        metrics.recordsByAge.last90Days,
        metrics.recordsByAge.last365Days,
        metrics.recordsByAge.older
      ];
      
      const nonZeroCategories = ageCategories.filter(count => count > 0);
      expect(nonZeroCategories.length).toBeGreaterThan(1);
    });
  });

  describe('Event Emission', () => {
    it('should emit recordDeleted event during deletion', async () => {
      let deletedRecord: DataRecord | null = null;
      
      retentionService.on('recordDeleted', (record) => {
        deletedRecord = record;
      });

      const record = retentionService.addDataRecord({
        userId: 'user-123',
        dataType: 'user_profile',
        createdAt: new Date()
      });

      await retentionService.deleteUserDataImmediately('user-123');
      
      expect(deletedRecord).not.toBeNull();
      expect(deletedRecord!.id).toBe(record.id);
    });
  });
});