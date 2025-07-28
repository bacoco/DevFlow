import { eventValidator } from '../event-validator';
import { GitEventType, IDEEventType, PrivacyLevel } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

describe('EventValidator', () => {
  const mockContext = {
    source: 'test',
    timestamp: new Date(),
    metadata: { test: true }
  };

  describe('validateGitEvent', () => {
    it('should validate a correct Git event', () => {
      const validGitEvent = {
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: 'test/repo',
        author: 'test-user',
        timestamp: new Date(),
        metadata: {
          commitHash: 'abc123',
          branch: 'main',
          linesAdded: 10,
          linesDeleted: 5,
          filesChanged: ['src/test.ts']
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      const result = eventValidator.validateGitEvent(validGitEvent, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validGitEvent);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an invalid Git event', () => {
      const invalidGitEvent = {
        id: 'invalid-uuid',
        type: 'invalid-type',
        repository: '',
        author: '',
        timestamp: 'invalid-date'
      };

      const result = eventValidator.validateGitEvent(invalidGitEvent, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('should generate warnings for suspicious patterns', () => {
      const suspiciousGitEvent = {
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: 'test/repo',
        author: 'test-user',
        timestamp: new Date(),
        metadata: {
          commitHash: 'abc123',
          branch: 'main',
          linesAdded: 15000, // Unusually large
          linesDeleted: 5,
          filesChanged: Array.from({ length: 150 }, (_, i) => `file${i}.ts`) // Too many files
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      const result = eventValidator.validateGitEvent(suspiciousGitEvent, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Unusually large number of lines added');
      expect(result.warnings).toContain('Unusually large number of files changed');
    });

    it('should warn about missing important metadata', () => {
      const incompleteGitEvent = {
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: 'test/repo',
        author: 'test-user',
        timestamp: new Date(),
        metadata: {
          branch: 'main'
          // Missing commitHash
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      const result = eventValidator.validateGitEvent(incompleteGitEvent, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Commit event missing commit hash');
    });
  });

  describe('validateIDETelemetry', () => {
    it('should validate a correct IDE telemetry event', () => {
      const validTelemetry = {
        id: uuidv4(),
        userId: uuidv4(),
        sessionId: uuidv4(),
        eventType: IDEEventType.KEYSTROKE,
        timestamp: new Date(),
        data: {
          fileName: 'test.ts',
          fileExtension: 'ts',
          keystrokeCount: 50,
          focusDurationMs: 30000
        },
        privacyLevel: PrivacyLevel.PRIVATE
      };

      const result = eventValidator.validateIDETelemetry(validTelemetry, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validTelemetry);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an invalid IDE telemetry event', () => {
      const invalidTelemetry = {
        id: 'invalid-uuid',
        userId: 'invalid-uuid',
        sessionId: 'invalid-uuid',
        eventType: 'invalid-type',
        timestamp: 'invalid-date',
        data: 'invalid-data'
      };

      const result = eventValidator.validateIDETelemetry(invalidTelemetry, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('should generate warnings for suspicious patterns', () => {
      const suspiciousTelemetry = {
        id: uuidv4(),
        userId: uuidv4(),
        sessionId: uuidv4(),
        eventType: IDEEventType.FOCUS,
        timestamp: new Date(),
        data: {
          keystrokeCount: 15000, // Unusually high
          focusDurationMs: 10 * 60 * 60 * 1000 // 10 hours, exceeds 8 hour warning
        },
        privacyLevel: PrivacyLevel.PRIVATE
      };

      const result = eventValidator.validateIDETelemetry(suspiciousTelemetry, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Unusually high keystroke count');
      expect(result.warnings).toContain('Focus duration exceeds 8 hours');
    });

    it('should warn about missing context', () => {
      const incompleteTelemetry = {
        id: uuidv4(),
        userId: uuidv4(),
        sessionId: uuidv4(),
        eventType: IDEEventType.FILE_CHANGE,
        timestamp: new Date(),
        data: {
          // Missing fileName for file_change event
          fileExtension: 'ts'
        },
        privacyLevel: PrivacyLevel.PRIVATE
      };

      const result = eventValidator.validateIDETelemetry(incompleteTelemetry, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File change event missing file name');
    });
  });

  describe('validateCommunicationEvent', () => {
    it('should validate a correct communication event', () => {
      const validCommEvent = {
        id: uuidv4(),
        platform: 'slack',
        channel: 'general',
        userId: 'user123',
        timestamp: new Date(),
        type: 'message',
        content: 'Hello team!',
        metadata: {
          threadId: 'thread123'
        },
        privacyLevel: 'team'
      };

      const result = eventValidator.validateCommunicationEvent(validCommEvent, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validCommEvent);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an invalid communication event', () => {
      const invalidCommEvent = {
        id: 'invalid-uuid',
        platform: 'invalid-platform',
        channel: '',
        userId: '',
        timestamp: 'invalid-date',
        type: 'invalid-type'
      };

      const result = eventValidator.validateCommunicationEvent(invalidCommEvent, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
    });

    it('should generate warnings for suspicious patterns', () => {
      const suspiciousCommEvent = {
        id: uuidv4(),
        platform: 'slack',
        channel: 'general',
        userId: 'user123',
        timestamp: new Date(),
        type: 'message',
        content: 'A'.repeat(15000), // Unusually long message
        privacyLevel: 'team'
      };

      const result = eventValidator.validateCommunicationEvent(suspiciousCommEvent, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Unusually long message content');
    });
  });

  describe('validateBatch', () => {
    it('should validate a batch of mixed valid and invalid events', () => {
      const events = [
        {
          id: uuidv4(),
          type: GitEventType.COMMIT,
          repository: 'test/repo',
          author: 'test-user',
          timestamp: new Date(),
          metadata: { commitHash: 'abc123' },
          privacyLevel: PrivacyLevel.TEAM
        },
        {
          id: 'invalid-uuid',
          type: 'invalid-type',
          repository: '',
          author: ''
        },
        {
          id: uuidv4(),
          type: GitEventType.PUSH,
          repository: 'test/repo2',
          author: 'test-user2',
          timestamp: new Date(),
          metadata: { branch: 'main' },
          privacyLevel: PrivacyLevel.TEAM
        }
      ];

      const result = eventValidator.validateBatch(events, 'git', mockContext);

      expect(result.validEvents).toHaveLength(2);
      expect(result.invalidEvents).toHaveLength(1);
      expect(result.invalidEvents[0].index).toBe(1);
      expect(result.invalidEvents[0].errors.length).toBeGreaterThan(0);
    });

    it('should handle empty batch', () => {
      const result = eventValidator.validateBatch([], 'git', mockContext);

      expect(result.validEvents).toHaveLength(0);
      expect(result.invalidEvents).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle all valid events', () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: `test/repo${i}`,
        author: `test-user${i}`,
        timestamp: new Date(),
        metadata: { commitHash: `hash${i}` },
        privacyLevel: PrivacyLevel.TEAM
      }));

      const result = eventValidator.validateBatch(events, 'git', mockContext);

      expect(result.validEvents).toHaveLength(5);
      expect(result.invalidEvents).toHaveLength(0);
    });

    it('should handle all invalid events', () => {
      const events = Array.from({ length: 3 }, () => ({
        id: 'invalid-uuid',
        type: 'invalid-type',
        repository: '',
        author: ''
      }));

      const result = eventValidator.validateBatch(events, 'git', mockContext);

      expect(result.validEvents).toHaveLength(0);
      expect(result.invalidEvents).toHaveLength(3);
    });
  });
});