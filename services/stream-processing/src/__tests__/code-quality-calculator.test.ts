import { CodeQualityCalculator, CodeQualityConfiguration } from '../processors/code-quality-calculator';
import { StreamEvent } from '../types/stream-processing';
import { GitEvent, GitEventType, MetricType } from '@devflow/shared-types';

describe('CodeQualityCalculator', () => {
  let calculator: CodeQualityCalculator;
  let mockConfig: Partial<CodeQualityConfiguration>;

  beforeEach(() => {
    mockConfig = {
      churnThresholdLines: 500,
      complexityAnalysisEnabled: true,
      reviewLagThresholdHours: 24,
      qualityScoreWeights: {
        churn: 0.3,
        reviewLag: 0.3,
        complexity: 0.2,
        testCoverage: 0.2
      }
    };
    
    calculator = new CodeQualityCalculator(mockConfig);
  });

  describe('Configuration Management', () => {
    it('should use default configuration when none provided', () => {
      const defaultCalculator = new CodeQualityCalculator();
      const config = defaultCalculator.getConfiguration();
      
      expect(config.churnThresholdLines).toBe(500);
      expect(config.reviewLagThresholdHours).toBe(24);
      expect(config.complexityAnalysisEnabled).toBe(false);
    });

    it('should allow configuration updates', () => {
      const newConfig = { churnThresholdLines: 1000 };
      calculator.updateConfiguration(newConfig);
      
      const config = calculator.getConfiguration();
      expect(config.churnThresholdLines).toBe(1000);
    });
  });

  describe('Code Quality Metrics Calculation', () => {
    it('should handle empty events gracefully', () => {
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      const result = calculator.calculateCodeQualityMetrics([], windowStart, windowEnd);
      
      expect(result.metrics).toHaveLength(0);
      expect(result.insights).toHaveLength(0);
      expect(result.summary.totalCommits).toBe(0);
    });

    it('should calculate code churn metrics from commit events', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      const events: StreamEvent[] = [
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'abc123',
          linesAdded: 50,
          linesDeleted: 20,
          filesChanged: ['src/file1.ts', 'src/file2.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:20:00Z'), GitEventType.COMMIT, {
          commitHash: 'def456',
          linesAdded: 100,
          linesDeleted: 30,
          filesChanged: ['src/file3.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:30:00Z'), GitEventType.PUSH, {
          commitHash: 'ghi789',
          linesAdded: 25,
          linesDeleted: 10,
          filesChanged: ['src/file4.ts', 'test/file4.test.ts']
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      expect(result.metrics.length).toBeGreaterThan(0);
      
      // Should have code churn metric
      const churnMetric = result.metrics.find(m => m.metricType === MetricType.CODE_CHURN);
      expect(churnMetric).toBeDefined();
      expect(churnMetric?.value).toBeGreaterThan(0);
      expect(churnMetric?.userId).toBe(userId);
      
      // Check summary
      expect(result.summary.totalCommits).toBe(3);
      expect(result.summary.totalLinesChanged).toBe(235); // 50+20+100+30+25+10
      expect(result.summary.averageChurnRate).toBeGreaterThan(0);
    });

    it('should calculate review lag metrics from PR events', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T12:00:00Z');
      
      const events: StreamEvent[] = [
        // PR created
        createGitEvent(userId, new Date('2024-01-01T09:00:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-123',
          linesAdded: 80,
          linesDeleted: 20,
          reviewers: ['reviewer1', 'reviewer2']
        }),
        // PR reviewed (2 hours later)
        createGitEvent(userId, new Date('2024-01-01T11:00:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-123',
          linesAdded: 80,
          linesDeleted: 20,
          reviewers: ['reviewer1', 'reviewer2']
        }),
        // Another PR with longer review time
        createGitEvent(userId, new Date('2024-01-01T09:30:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-456',
          linesAdded: 150,
          linesDeleted: 50,
          reviewers: ['reviewer3']
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      // Should have review lag metric
      const reviewLagMetric = result.metrics.find(m => m.metricType === MetricType.REVIEW_LAG);
      expect(reviewLagMetric).toBeDefined();
      expect(reviewLagMetric?.value).toBeGreaterThan(0);
      
      // Check summary
      expect(result.summary.averageReviewLag).toBeGreaterThan(0);
    });

    it('should calculate complexity metrics when enabled', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      const events: StreamEvent[] = [
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'abc123',
          linesAdded: 100,
          linesDeleted: 50,
          filesChanged: ['src/complex.ts', 'src/utils.js', 'styles/main.css']
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      // Should have complexity metric when enabled
      const complexityMetric = result.metrics.find(m => m.metricType === MetricType.COMPLEXITY_TREND);
      expect(complexityMetric).toBeDefined();
      expect(complexityMetric?.value).toBeGreaterThan(0);
    });

    it('should not calculate complexity metrics when disabled', () => {
      const disabledConfig = { ...mockConfig, complexityAnalysisEnabled: false };
      const disabledCalculator = new CodeQualityCalculator(disabledConfig);
      
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      const events: StreamEvent[] = [
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'abc123',
          linesAdded: 100,
          linesDeleted: 50,
          filesChanged: ['src/file.ts']
        })
      ];

      const result = disabledCalculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      // Should not have complexity metric when disabled
      const complexityMetric = result.metrics.find(m => m.metricType === MetricType.COMPLEXITY_TREND);
      expect(complexityMetric).toBeUndefined();
    });
  });

  describe('Quality Insights Generation', () => {
    it('should generate high churn insight', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      // Create events with high churn (many lines changed)
      const events: StreamEvent[] = [];
      for (let i = 0; i < 5; i++) {
        events.push(createGitEvent(userId, new Date(`2024-01-01T09:${10 + i * 5}:00Z`), GitEventType.COMMIT, {
          commitHash: `commit-${i}`,
          linesAdded: 800, // High churn
          linesDeleted: 200,
          filesChanged: [`src/file${i}.ts`]
        }));
      }

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      const highChurnInsight = result.insights.find(i => i.type === 'high_churn');
      expect(highChurnInsight).toBeDefined();
      expect(highChurnInsight?.severity).toBe('medium');
      expect(highChurnInsight?.message).toContain('High code churn detected');
    });

    it('should generate review bottleneck insight', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-02T09:00:00Z'); // 24 hour window
      
      // Create PRs with long review times
      const events: StreamEvent[] = [
        // PR 1 - created at start
        createGitEvent(userId, new Date('2024-01-01T09:00:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-1',
          linesAdded: 100,
          linesDeleted: 20
        }),
        // PR 2 - created 2 hours later
        createGitEvent(userId, new Date('2024-01-01T11:00:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-2',
          linesAdded: 150,
          linesDeleted: 30
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      const bottleneckInsight = result.insights.find(i => i.type === 'review_bottleneck');
      expect(bottleneckInsight).toBeDefined();
      expect(bottleneckInsight?.severity).toBe('high');
      expect(bottleneckInsight?.message).toContain('Review bottleneck detected');
    });

    it('should generate quality improvement insight', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      // Create commits showing improvement (decreasing churn over time)
      const events: StreamEvent[] = [
        // Older commits with high churn
        createGitEvent(userId, new Date('2024-01-01T09:05:00Z'), GitEventType.COMMIT, {
          commitHash: 'old-1',
          linesAdded: 500,
          linesDeleted: 200,
          filesChanged: ['src/file1.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'old-2',
          linesAdded: 600,
          linesDeleted: 300,
          filesChanged: ['src/file2.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:15:00Z'), GitEventType.COMMIT, {
          commitHash: 'old-3',
          linesAdded: 400,
          linesDeleted: 150,
          filesChanged: ['src/file3.ts']
        }),
        // Recent commits with lower churn
        createGitEvent(userId, new Date('2024-01-01T09:45:00Z'), GitEventType.COMMIT, {
          commitHash: 'recent-1',
          linesAdded: 50,
          linesDeleted: 20,
          filesChanged: ['src/file4.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:50:00Z'), GitEventType.COMMIT, {
          commitHash: 'recent-2',
          linesAdded: 30,
          linesDeleted: 10,
          filesChanged: ['src/file5.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:55:00Z'), GitEventType.COMMIT, {
          commitHash: 'recent-3',
          linesAdded: 40,
          linesDeleted: 15,
          filesChanged: ['src/file6.ts']
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      const improvementInsight = result.insights.find(i => i.type === 'quality_improvement');
      expect(improvementInsight).toBeDefined();
      expect(improvementInsight?.severity).toBe('low');
      expect(improvementInsight?.message).toContain('Code quality improving');
    });
  });

  describe('Quality Summary', () => {
    it('should create accurate quality summary', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      const events: StreamEvent[] = [
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'commit-1',
          linesAdded: 100,
          linesDeleted: 50,
          filesChanged: ['src/file1.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:20:00Z'), GitEventType.COMMIT, {
          commitHash: 'commit-2',
          linesAdded: 200,
          linesDeleted: 75,
          filesChanged: ['src/file2.ts']
        }),
        createGitEvent(userId, new Date('2024-01-01T09:30:00Z'), GitEventType.PULL_REQUEST, {
          pullRequestId: 'pr-1',
          linesAdded: 150,
          linesDeleted: 25,
          reviewers: ['reviewer1']
        })
      ];

      const result = calculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
      
      expect(result.summary.totalCommits).toBe(2);
      expect(result.summary.totalLinesChanged).toBe(425); // 100+50+200+75
      expect(result.summary.averageChurnRate).toBeGreaterThan(0);
      expect(result.summary.qualityTrend).toMatch(/improving|stable|declining/);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on data points', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const windowStart = new Date('2024-01-01T09:00:00Z');
      const windowEnd = new Date('2024-01-01T10:00:00Z');
      
      // Few commits - low confidence
      const fewEvents: StreamEvent[] = [
        createGitEvent(userId, new Date('2024-01-01T09:10:00Z'), GitEventType.COMMIT, {
          commitHash: 'commit-1',
          linesAdded: 50,
          linesDeleted: 20,
          filesChanged: ['src/file1.ts']
        })
      ];
      
      const lowConfidenceResult = calculator.calculateCodeQualityMetrics(fewEvents, windowStart, windowEnd);
      
      // Many commits - high confidence
      const manyEvents: StreamEvent[] = [];
      for (let i = 0; i < 15; i++) {
        manyEvents.push(createGitEvent(userId, new Date(`2024-01-01T09:${10 + i}:00Z`), GitEventType.COMMIT, {
          commitHash: `commit-${i}`,
          linesAdded: 50,
          linesDeleted: 20,
          filesChanged: [`src/file${i}.ts`]
        }));
      }
      
      const highConfidenceResult = calculator.calculateCodeQualityMetrics(manyEvents, windowStart, windowEnd);
      
      if (lowConfidenceResult.metrics.length > 0 && highConfidenceResult.metrics.length > 0) {
        expect(highConfidenceResult.metrics[0].confidence).toBeGreaterThan(
          lowConfidenceResult.metrics[0].confidence || 0
        );
      }
    });
  });
});

// Helper function to create Git events
function createGitEvent(
  userId: string,
  timestamp: Date,
  eventType: GitEventType,
  metadata: Partial<any> = {}
): StreamEvent {
  const gitEvent: GitEvent = {
    id: `git-${Date.now()}-${Math.random()}`,
    type: eventType,
    repository: 'test-repo',
    author: 'test-author',
    timestamp,
    metadata: {
      commitHash: 'default-hash',
      linesAdded: 0,
      linesDeleted: 0,
      filesChanged: [],
      ...metadata
    },
    privacyLevel: 'team' as any
  };

  return {
    id: `stream-${Date.now()}-${Math.random()}`,
    type: 'git',
    timestamp,
    userId,
    data: gitEvent
  };
}