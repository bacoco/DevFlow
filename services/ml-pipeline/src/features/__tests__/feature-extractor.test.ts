import { ProductivityFeatureExtractor } from '../feature-extractor';
import { ProductivityData, TimeWindow } from '../../types/ml-types';
import { GitEvent, IDETelemetry, FlowState, ProductivityMetric, GitEventType, IDEEventType, MetricType } from '../../types/shared-types';

describe('ProductivityFeatureExtractor', () => {
  let extractor: ProductivityFeatureExtractor;
  let mockData: ProductivityData;

  beforeEach(() => {
    extractor = new ProductivityFeatureExtractor();
    
    const timeWindow: TimeWindow = {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-02T00:00:00Z'),
      duration: 24 * 60 * 60 * 1000, // 24 hours
      type: 'day'
    };

    const gitEvents: GitEvent[] = [
      {
        id: '1',
        type: GitEventType.COMMIT,
        repository: 'test-repo',
        author: 'test-user',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        metadata: {
          commitHash: 'abc123',
          linesAdded: 50,
          linesDeleted: 10,
          filesChanged: ['file1.ts', 'file2.ts']
        },
        privacyLevel: 'team' as any
      },
      {
        id: '2',
        type: GitEventType.PULL_REQUEST,
        repository: 'test-repo',
        author: 'test-user',
        timestamp: new Date('2024-01-01T14:00:00Z'),
        metadata: {
          pullRequestId: 'pr-1',
          linesAdded: 100,
          linesDeleted: 20
        },
        privacyLevel: 'team' as any
      }
    ];

    const flowStates: FlowState[] = [
      {
        userId: 'user-1',
        sessionId: 'session-1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        interruptionCount: 2,
        focusScore: 0.8,
        activities: [],
        totalFocusTimeMs: 2 * 60 * 60 * 1000, // 2 hours
        deepWorkPercentage: 0.7
      }
    ];

    const ideTelemetry: IDETelemetry[] = [
      {
        id: 'telemetry-1',
        userId: 'user-1',
        sessionId: 'session-1',
        eventType: IDEEventType.KEYSTROKE,
        timestamp: new Date('2024-01-01T10:30:00Z'),
        data: {
          keystrokeCount: 100,
          focusDurationMs: 30 * 60 * 1000 // 30 minutes
        },
        privacyLevel: 'private' as any
      }
    ];

    const metrics: ProductivityMetric[] = [
      {
        id: 'metric-1',
        userId: 'user-1',
        metricType: MetricType.TIME_IN_FLOW,
        value: 2.5,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        aggregationPeriod: 'hour' as any,
        context: {}
      }
    ];

    mockData = {
      userId: 'user-1',
      timeWindow,
      metrics,
      flowStates,
      gitEvents,
      ideTelemetry
    };
  });

  describe('extractFeatures', () => {
    it('should extract features successfully from valid data', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.timestamp).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should extract productivity metrics features', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result.features.commits_per_day).toBeDefined();
      expect(result.features.lines_added_per_commit).toBeDefined();
      expect(result.features.code_churn_rate).toBeDefined();
      expect(result.features.pr_creation_rate).toBeDefined();

      // Verify calculations
      expect(result.features.commits_per_day).toBe(1); // 1 commit in 1 day
      expect(result.features.lines_added_per_commit).toBe(150); // Total lines added (50+100) / 1 commit
      expect(result.features.pr_creation_rate).toBe(1); // 1 PR in 1 day
    });

    it('should extract focus metrics features', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result.features.total_focus_time_hours).toBeDefined();
      expect(result.features.average_flow_duration_minutes).toBeDefined();
      expect(result.features.interruption_rate_per_hour).toBeDefined();
      expect(result.features.deep_work_percentage).toBeDefined();
      expect(result.features.context_switching_frequency).toBeDefined();

      // Verify calculations
      expect(result.features.total_focus_time_hours).toBe(2); // 2 hours of focus time
      expect(result.features.deep_work_percentage).toBe(70); // 70% deep work
    });

    it('should extract quality metrics features', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result.features.review_cycle_time_hours).toBeDefined();
      expect(result.features.refactoring_ratio).toBeDefined();
      expect(result.features.bug_fix_ratio).toBeDefined();
      expect(result.features.average_complexity_score).toBeDefined();
    });

    it('should extract collaboration metrics features', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result.features.review_participation_score).toBeDefined();
      expect(result.features.knowledge_sharing_score).toBeDefined();
      expect(result.features.cross_team_collaboration_score).toBeDefined();
      expect(result.features.communication_frequency_per_day).toBeDefined();
    });

    it('should extract temporal metrics features', async () => {
      const result = await extractor.extractFeatures(mockData);

      expect(result.features.peak_productivity_hour).toBeDefined();
      expect(result.features.work_consistency_score).toBeDefined();
      expect(result.features.weekend_activity_ratio).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      const emptyData: ProductivityData = {
        userId: 'user-1',
        timeWindow: mockData.timeWindow,
        metrics: [],
        flowStates: [],
        gitEvents: [],
        ideTelemetry: []
      };

      const result = await extractor.extractFeatures(emptyData);

      expect(result).toBeDefined();
      expect(result.features.commits_per_day).toBe(0);
      expect(result.features.total_focus_time_hours).toBe(0);
      expect(result.metadata.confidence).toBeLessThan(1.0);
    });

    it('should calculate confidence based on data completeness', async () => {
      const result = await extractor.extractFeatures(mockData);
      expect(result.metadata.confidence).toBeGreaterThan(0.1);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1.0);

      // Test with incomplete data
      const incompleteData = { ...mockData, gitEvents: [] };
      const incompleteResult = await extractor.extractFeatures(incompleteData);
      expect(incompleteResult.metadata.confidence).toBeLessThan(result.metadata.confidence);
    });

    it('should handle invalid values gracefully', async () => {
      const invalidData = { ...mockData };
      invalidData.gitEvents[0].metadata.linesAdded = NaN;

      const result = await extractor.extractFeatures(invalidData);
      expect(result.features.lines_added_per_commit).toBe(100); // Should still calculate from valid PR data
    });
  });

  describe('getFeatureDefinitions', () => {
    it('should return all feature definitions', () => {
      const definitions = extractor.getFeatureDefinitions();

      expect(definitions).toBeInstanceOf(Array);
      expect(definitions.length).toBeGreaterThan(0);

      // Check that all definitions have required properties
      definitions.forEach(def => {
        expect(def.name).toBeDefined();
        expect(def.type).toBeDefined();
        expect(def.description).toBeDefined();
        expect(def.extractionFunction).toBeDefined();
        expect(def.normalizationMethod).toBeDefined();
        expect(def.defaultValue).toBeDefined();
      });
    });

    it('should include features from all groups', () => {
      const definitions = extractor.getFeatureDefinitions();
      const featureNames = definitions.map(def => def.name);

      // Check for features from each group
      expect(featureNames).toContain('commits_per_day');
      expect(featureNames).toContain('total_focus_time_hours');
      expect(featureNames).toContain('review_cycle_time_hours');
      expect(featureNames).toContain('review_participation_score');
      expect(featureNames).toContain('peak_productivity_hour');
    });
  });

  describe('validateFeatures', () => {
    it('should validate correct feature vectors', async () => {
      const features = await extractor.extractFeatures(mockData);
      const isValid = extractor.validateFeatures(features);
      expect(isValid).toBe(true);
    });

    it('should reject feature vectors with invalid values', () => {
      const invalidFeatures = {
        id: 'test-id',
        userId: 'user-1',
        timestamp: new Date(),
        features: {
          commits_per_day: NaN,
          total_focus_time_hours: Infinity
        },
        metadata: {
          featureVersion: '1.0.0',
          extractionMethod: 'test',
          windowSize: 1000,
          confidence: 1.0,
          tags: []
        }
      };

      const isValid = extractor.validateFeatures(invalidFeatures);
      expect(isValid).toBe(false);
    });

    it('should accept feature vectors with missing features that have defaults', () => {
      const incompleteFeatures = {
        id: 'test-id',
        userId: 'user-1',
        timestamp: new Date(),
        features: {
          commits_per_day: 1
          // Missing other features, but they have default values
        },
        metadata: {
          featureVersion: '1.0.0',
          extractionMethod: 'test',
          windowSize: 1000,
          confidence: 1.0,
          tags: []
        }
      };

      const isValid = extractor.validateFeatures(incompleteFeatures);
      expect(isValid).toBe(true); // Should be valid because missing features have defaults
    });
  });

  describe('feature calculations', () => {
    it('should calculate commits per day correctly', async () => {
      const result = await extractor.extractFeatures(mockData);
      const expected = 1; // 1 commit in 1 day
      expect(result.features.commits_per_day).toBe(expected);
    });

    it('should calculate code churn rate correctly', async () => {
      const result = await extractor.extractFeatures(mockData);
      // Total changes: 150 + 30 = 180, Added: 150, Churn rate: 180/150 = 1.2
      const expected = (150 + 30) / 150;
      expect(result.features.code_churn_rate).toBeCloseTo(expected, 2);
    });

    it('should handle division by zero in calculations', async () => {
      const noCommitsData = { ...mockData, gitEvents: [] };
      const result = await extractor.extractFeatures(noCommitsData);
      
      expect(result.features.commits_per_day).toBe(0);
      expect(result.features.lines_added_per_commit).toBe(0);
      expect(result.features.code_churn_rate).toBe(0);
    });
  });
});