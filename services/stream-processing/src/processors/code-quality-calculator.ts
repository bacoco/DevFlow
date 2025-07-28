import { StreamEvent } from '../types/stream-processing';
import { ProductivityMetric, MetricType, TimePeriod, GitEvent, GitEventType } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

export interface CodeQualityConfiguration {
  churnThresholdLines: number; // Lines changed threshold for high churn
  complexityAnalysisEnabled: boolean; // Enable AST-based complexity analysis
  reviewLagThresholdHours: number; // Hours before review is considered lagged
  qualityScoreWeights: {
    churn: number;
    reviewLag: number;
    complexity: number;
    testCoverage: number;
  };
}

export interface CodeQualityResult {
  metrics: ProductivityMetric[];
  insights: CodeQualityInsight[];
  summary: CodeQualitySummary;
}

export interface CodeQualityInsight {
  type: 'high_churn' | 'review_bottleneck' | 'complexity_increase' | 'quality_improvement';
  message: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
}

export interface CodeQualitySummary {
  totalCommits: number;
  totalLinesChanged: number;
  averageChurnRate: number;
  averageReviewLag: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
}

export interface CommitAnalysis {
  commitHash: string;
  timestamp: Date;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: string[];
  churnRate: number;
  complexity?: number;
}

export interface PullRequestAnalysis {
  prId: string;
  createdAt: Date;
  reviewedAt?: Date;
  mergedAt?: Date;
  reviewLagHours: number;
  reviewers: string[];
  linesChanged: number;
}

export class CodeQualityCalculator {
  private config: CodeQualityConfiguration;

  constructor(config?: Partial<CodeQualityConfiguration>) {
    this.config = {
      churnThresholdLines: 500,
      complexityAnalysisEnabled: false, // Simplified for now
      reviewLagThresholdHours: 24,
      qualityScoreWeights: {
        churn: 0.3,
        reviewLag: 0.3,
        complexity: 0.2,
        testCoverage: 0.2
      },
      ...config
    };
  }

  calculateCodeQualityMetrics(events: StreamEvent[], windowStart: Date, windowEnd: Date): CodeQualityResult {
    // Filter Git events
    const gitEvents = this.filterGitEvents(events);
    
    if (gitEvents.length === 0) {
      return this.createEmptyResult(events[0]?.userId, windowStart, windowEnd);
    }

    // Analyze commits
    const commitAnalyses = this.analyzeCommits(gitEvents);
    
    // Analyze pull requests
    const prAnalyses = this.analyzePullRequests(gitEvents);
    
    // Calculate metrics
    const metrics = this.generateQualityMetrics(
      commitAnalyses, 
      prAnalyses, 
      events[0]?.userId, 
      windowStart, 
      windowEnd
    );
    
    // Generate insights
    const insights = this.generateQualityInsights(commitAnalyses, prAnalyses);
    
    // Create summary
    const summary = this.createQualitySummary(commitAnalyses, prAnalyses);

    return {
      metrics,
      insights,
      summary
    };
  }

  private filterGitEvents(events: StreamEvent[]): StreamEvent[] {
    return events.filter(event => event.type === 'git');
  }

  private analyzeCommits(gitEvents: StreamEvent[]): CommitAnalysis[] {
    const commitEvents = gitEvents.filter(event => {
      const gitEvent = event.data as GitEvent;
      return gitEvent.type === GitEventType.COMMIT || gitEvent.type === GitEventType.PUSH;
    });

    return commitEvents.map(event => {
      const gitEvent = event.data as GitEvent;
      const metadata = gitEvent.metadata;
      
      const linesAdded = metadata.linesAdded || 0;
      const linesDeleted = metadata.linesDeleted || 0;
      const totalLines = linesAdded + linesDeleted;
      
      return {
        commitHash: metadata.commitHash || `commit-${Date.now()}`,
        timestamp: gitEvent.timestamp,
        linesAdded,
        linesDeleted,
        filesChanged: metadata.filesChanged || [],
        churnRate: this.calculateChurnRate(totalLines, metadata.filesChanged?.length || 1),
        complexity: this.config.complexityAnalysisEnabled ? 
          this.estimateComplexity(metadata.filesChanged || []) : undefined
      };
    });
  }

  private analyzePullRequests(gitEvents: StreamEvent[]): PullRequestAnalysis[] {
    const prEvents = gitEvents.filter(event => {
      const gitEvent = event.data as GitEvent;
      return gitEvent.type === GitEventType.PULL_REQUEST;
    });

    // Group PR events by PR ID
    const prGroups = new Map<string, StreamEvent[]>();
    
    for (const event of prEvents) {
      const gitEvent = event.data as GitEvent;
      const prId = gitEvent.metadata.pullRequestId || `pr-${Date.now()}`;
      
      if (!prGroups.has(prId)) {
        prGroups.set(prId, []);
      }
      prGroups.get(prId)!.push(event);
    }

    return Array.from(prGroups.entries()).map(([prId, events]) => {
      const sortedEvents = events.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const gitEvent = firstEvent.data as GitEvent;
      
      const createdAt = firstEvent.timestamp;
      const reviewedAt = sortedEvents.length > 1 ? sortedEvents[1].timestamp : undefined;
      const mergedAt = lastEvent.timestamp;
      
      const reviewLagHours = reviewedAt ? 
        (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60) : 
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

      return {
        prId,
        createdAt,
        reviewedAt,
        mergedAt,
        reviewLagHours,
        reviewers: gitEvent.metadata.reviewers || [],
        linesChanged: (gitEvent.metadata.linesAdded || 0) + (gitEvent.metadata.linesDeleted || 0)
      };
    });
  }

  private calculateChurnRate(totalLines: number, fileCount: number): number {
    if (fileCount === 0) return 0;
    
    // Churn rate = lines changed per file
    const baseChurn = totalLines / fileCount;
    
    // Normalize to 0-1 scale (higher is worse)
    return Math.min(baseChurn / this.config.churnThresholdLines, 1);
  }

  private estimateComplexity(filesChanged: string[]): number {
    // Simplified complexity estimation based on file types and count
    let complexity = 0;
    
    for (const file of filesChanged) {
      const extension = file.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
          complexity += 1.0;
          break;
        case 'py':
        case 'java':
        case 'cpp':
        case 'c':
          complexity += 1.2;
          break;
        case 'html':
        case 'css':
        case 'scss':
          complexity += 0.5;
          break;
        case 'json':
        case 'yaml':
        case 'yml':
          complexity += 0.3;
          break;
        default:
          complexity += 0.8;
      }
    }
    
    // Normalize complexity score
    return Math.min(complexity / 10, 1);
  }

  private generateQualityMetrics(
    commits: CommitAnalysis[],
    prs: PullRequestAnalysis[],
    userId: string,
    windowStart: Date,
    windowEnd: Date
  ): ProductivityMetric[] {
    const metrics: ProductivityMetric[] = [];
    const windowDuration = windowEnd.getTime() - windowStart.getTime();
    const timePeriod = this.getTimePeriodFromDuration(windowDuration);

    if (!userId) return metrics;

    // Code churn metric
    if (commits.length > 0) {
      const totalChurn = commits.reduce((sum, commit) => 
        sum + commit.linesAdded + commit.linesDeleted, 0
      );
      const averageChurn = totalChurn / commits.length;

      metrics.push({
        id: uuidv4(),
        userId,
        metricType: MetricType.CODE_CHURN,
        value: averageChurn,
        timestamp: windowEnd,
        aggregationPeriod: timePeriod,
        context: {
          tags: {
            commits: commits.length.toString(),
            totalLines: totalChurn.toString(),
            repositories: this.getUniqueRepositories(commits).length.toString()
          }
        },
        confidence: this.calculateConfidence(commits.length),
        metadata: {
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          algorithm: 'churn-rate-v1'
        }
      });
    }

    // Review lag metric
    if (prs.length > 0) {
      const averageReviewLag = prs.reduce((sum, pr) => sum + pr.reviewLagHours, 0) / prs.length;

      metrics.push({
        id: uuidv4(),
        userId,
        metricType: MetricType.REVIEW_LAG,
        value: averageReviewLag,
        timestamp: windowEnd,
        aggregationPeriod: timePeriod,
        context: {
          tags: {
            pullRequests: prs.length.toString(),
            averageLagHours: averageReviewLag.toFixed(2),
            reviewedPRs: prs.filter(pr => pr.reviewedAt).length.toString()
          }
        },
        confidence: this.calculateConfidence(prs.length),
        metadata: {
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          algorithm: 'review-lag-v1'
        }
      });
    }

    // Complexity trend metric (if enabled)
    if (this.config.complexityAnalysisEnabled && commits.length > 0) {
      const complexityScores = commits
        .filter(c => c.complexity !== undefined)
        .map(c => c.complexity!);
      
      if (complexityScores.length > 0) {
        const averageComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;

        metrics.push({
          id: uuidv4(),
          userId,
          metricType: MetricType.COMPLEXITY_TREND,
          value: averageComplexity,
          timestamp: windowEnd,
          aggregationPeriod: timePeriod,
          context: {
            tags: {
              analyzedCommits: complexityScores.length.toString(),
              averageComplexity: averageComplexity.toFixed(3)
            }
          },
          confidence: this.calculateConfidence(complexityScores.length),
          metadata: {
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            algorithm: 'complexity-estimation-v1'
          }
        });
      }
    }

    return metrics;
  }

  private generateQualityInsights(commits: CommitAnalysis[], prs: PullRequestAnalysis[]): CodeQualityInsight[] {
    const insights: CodeQualityInsight[] = [];

    // High churn insight
    const highChurnCommits = commits.filter(c => c.churnRate > 0.7);
    if (highChurnCommits.length > commits.length * 0.3) {
      insights.push({
        type: 'high_churn',
        message: `High code churn detected in ${highChurnCommits.length} commits - consider refactoring or breaking down changes`,
        confidence: 0.8,
        severity: 'medium',
        metadata: {
          highChurnCommits: highChurnCommits.length,
          totalCommits: commits.length,
          averageChurn: highChurnCommits.reduce((sum, c) => sum + c.churnRate, 0) / highChurnCommits.length
        }
      });
    }

    // Review bottleneck insight
    const laggedPRs = prs.filter(pr => pr.reviewLagHours > this.config.reviewLagThresholdHours);
    if (laggedPRs.length > prs.length * 0.5) {
      insights.push({
        type: 'review_bottleneck',
        message: `Review bottleneck detected - ${laggedPRs.length} PRs exceeded ${this.config.reviewLagThresholdHours}h review time`,
        confidence: 0.9,
        severity: 'high',
        metadata: {
          laggedPRs: laggedPRs.length,
          totalPRs: prs.length,
          averageLag: laggedPRs.reduce((sum, pr) => sum + pr.reviewLagHours, 0) / laggedPRs.length,
          threshold: this.config.reviewLagThresholdHours
        }
      });
    }

    // Quality improvement insight
    if (commits.length > 5) {
      const recentCommits = commits.slice(-3);
      const olderCommits = commits.slice(0, -3);
      
      const recentAvgChurn = recentCommits.reduce((sum, c) => sum + c.churnRate, 0) / recentCommits.length;
      const olderAvgChurn = olderCommits.reduce((sum, c) => sum + c.churnRate, 0) / olderCommits.length;
      
      if (recentAvgChurn < olderAvgChurn * 0.8) {
        insights.push({
          type: 'quality_improvement',
          message: 'Code quality improving - recent commits show lower churn rates',
          confidence: 0.7,
          severity: 'low',
          metadata: {
            recentChurn: recentAvgChurn,
            olderChurn: olderAvgChurn,
            improvement: ((olderAvgChurn - recentAvgChurn) / olderAvgChurn * 100).toFixed(1) + '%'
          }
        });
      }
    }

    return insights;
  }

  private createQualitySummary(commits: CommitAnalysis[], prs: PullRequestAnalysis[]): CodeQualitySummary {
    const totalCommits = commits.length;
    const totalLinesChanged = commits.reduce((sum, c) => sum + c.linesAdded + c.linesDeleted, 0);
    const averageChurnRate = commits.length > 0 ? 
      commits.reduce((sum, c) => sum + c.churnRate, 0) / commits.length : 0;
    const averageReviewLag = prs.length > 0 ? 
      prs.reduce((sum, pr) => sum + pr.reviewLagHours, 0) / prs.length : 0;

    // Determine quality trend (simplified)
    let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (commits.length > 3) {
      const recentChurn = commits.slice(-2).reduce((sum, c) => sum + c.churnRate, 0) / 2;
      const olderChurn = commits.slice(0, -2).reduce((sum, c) => sum + c.churnRate, 0) / (commits.length - 2);
      
      if (recentChurn < olderChurn * 0.9) {
        qualityTrend = 'improving';
      } else if (recentChurn > olderChurn * 1.1) {
        qualityTrend = 'declining';
      }
    }

    return {
      totalCommits,
      totalLinesChanged,
      averageChurnRate,
      averageReviewLag,
      qualityTrend
    };
  }

  private getUniqueRepositories(commits: CommitAnalysis[]): string[] {
    // In a real implementation, this would extract repository info from commits
    return ['default-repo']; // Simplified
  }

  private getTimePeriodFromDuration(durationMs: number): TimePeriod {
    const hours = durationMs / (1000 * 60 * 60);
    
    if (hours <= 1) return TimePeriod.HOUR;
    if (hours <= 24) return TimePeriod.DAY;
    if (hours <= 168) return TimePeriod.WEEK;
    return TimePeriod.MONTH;
  }

  private calculateConfidence(dataPoints: number): number {
    return Math.min(dataPoints / 10, 1);
  }

  private createEmptyResult(userId: string, windowStart: Date, windowEnd: Date): CodeQualityResult {
    return {
      metrics: [],
      insights: [],
      summary: {
        totalCommits: 0,
        totalLinesChanged: 0,
        averageChurnRate: 0,
        averageReviewLag: 0,
        qualityTrend: 'stable'
      }
    };
  }

  // Configuration methods
  updateConfiguration(config: Partial<CodeQualityConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  getConfiguration(): CodeQualityConfiguration {
    return { ...this.config };
  }
}