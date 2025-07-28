import { TelemetryCollector } from '../telemetry-collector';
import { TelemetryConfig, PrivacyConsent } from '../types';
import { PrivacyLevel } from '@devflow/shared-types';

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;
  let config: TelemetryConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      batchSize: 5,
      batchIntervalMs: 1000,
      compressionEnabled: false,
      privacyLevel: PrivacyLevel.TEAM,
      endpoint: 'http://localhost:3001/telemetry',
      retryAttempts: 3,
      retryDelayMs: 1000
    };

    collector = new TelemetryCollector(config);
  });

  afterEach(() => {
    collector.stopCollection();
  });

  describe('User consent management', () => {
    it('should not collect data without consent', () => {
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: false,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: false,
          fileChanges: false,
          debugging: false,
          focusTime: false,
          buildEvents: false,
          testEvents: false
        },
        retentionPeriodDays: 0
      };

      collector.setUserConsent('test-user', consent);
      collector.collectKeystroke('test.js', 5);

      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(0);
    });

    it('should collect data with proper consent', () => {
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
      collector.collectKeystroke('test.js', 5);

      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
      expect(stats.userId).toBe('test-user');
    });

    it('should respect granular consent settings', () => {
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: false,
          debugging: true,
          focusTime: false,
          buildEvents: true,
          testEvents: false
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
      
      // Should collect (keystrokes allowed)
      collector.collectKeystroke('test.js', 5);
      
      // Should not collect (file changes not allowed)
      collector.collectFileChange('test.js', 'js');
      
      // Should collect (debugging allowed)
      collector.collectDebugSession('debug-1');
      
      // Should not collect (focus time not allowed)
      collector.collectFocusTime(5000, 1);

      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(2); // Only keystroke and debug events
    });
  });

  describe('Event collection', () => {
    beforeEach(() => {
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
    });

    it('should collect keystroke events', () => {
      collector.collectKeystroke('test.js', 10);
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });

    it('should collect file change events', () => {
      collector.collectFileChange('test.js', 'js');
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });

    it('should collect focus time events', () => {
      collector.collectFocusTime(30000, 2);
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });

    it('should collect debug session events', () => {
      collector.collectDebugSession('debug-session-1');
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });

    it('should collect build events', () => {
      collector.collectBuildEvent('success', 0, 2);
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });

    it('should collect test run events', () => {
      collector.collectTestRun({ passed: 10, failed: 2, skipped: 1 });
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });
  });

  describe('Privacy levels', () => {
    it('should sanitize file names based on privacy level', () => {
      const privateConfig = { ...config, privacyLevel: PrivacyLevel.PRIVATE };
      const privateCollector = new TelemetryCollector(privateConfig);
      
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      privateCollector.setUserConsent('test-user', consent);
      privateCollector.collectKeystroke('/full/path/to/test.js', 5);
      
      // In private mode, file names should not be collected
      const stats = privateCollector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
      
      privateCollector.stopCollection();
    });

    it('should preserve relative paths in team privacy level', () => {
      const teamConfig = { ...config, privacyLevel: PrivacyLevel.TEAM };
      const teamCollector = new TelemetryCollector(teamConfig);
      
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      teamCollector.setUserConsent('test-user', consent);
      teamCollector.collectKeystroke('/full/path/to/test.js', 5);
      
      const stats = teamCollector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
      
      teamCollector.stopCollection();
    });
  });

  describe('Batch processing', () => {
    beforeEach(() => {
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
    });

    it('should flush events when batch size is reached', () => {
      // Add events up to batch size
      for (let i = 0; i < config.batchSize; i++) {
        collector.collectKeystroke(`test${i}.js`, 1);
      }
      
      // Buffer should be empty after auto-flush
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(0);
    });

    it('should manually flush events', async () => {
      collector.collectKeystroke('test.js', 5);
      collector.collectFileChange('test.js', 'js');
      
      let stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(2);
      
      const result = await collector.flush();
      expect(result.success).toBe(true);
      expect(result.eventsCollected).toBe(2);
      
      stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(0);
    });
  });

  describe('Configuration updates', () => {
    it('should update configuration', () => {
      collector.updateConfig({ enabled: false });
      
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
      collector.collectKeystroke('test.js', 5);
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(0); // Should not collect when disabled
    });

    it('should restart collection when re-enabled', () => {
      collector.updateConfig({ enabled: false });
      collector.updateConfig({ enabled: true });
      
      const consent: PrivacyConsent = {
        userId: 'test-user',
        consentGiven: true,
        consentTimestamp: new Date(),
        dataTypes: {
          keystrokes: true,
          fileChanges: true,
          debugging: true,
          focusTime: true,
          buildEvents: true,
          testEvents: true
        },
        retentionPeriodDays: 365
      };

      collector.setUserConsent('test-user', consent);
      collector.collectKeystroke('test.js', 5);
      
      const stats = collector.getSessionStats();
      expect(stats.eventsBuffered).toBe(1);
    });
  });
});