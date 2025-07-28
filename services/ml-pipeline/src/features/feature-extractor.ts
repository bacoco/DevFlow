import { v4 as uuidv4 } from 'uuid';
import { 
  FeatureExtractor, 
  FeatureVector, 
  FeatureDefinition, 
  ProductivityData,
  AggregatedMetrics,
  FeatureGroup
} from '../types/ml-types';
import { MetricType } from '../types/shared-types';

export class ProductivityFeatureExtractor implements FeatureExtractor {
  private featureGroups: FeatureGroup[];
  private version: string = '1.0.0';

  constructor() {
    this.featureGroups = this.initializeFeatureGroups();
  }

  async extractFeatures(data: ProductivityData): Promise<FeatureVector> {
    const aggregated = this.aggregateData(data);
    const features: Record<string, number> = {};

    // Extract features from each group
    for (const group of this.featureGroups) {
      const groupFeatures = this.extractFeatureGroup(group, aggregated);
      Object.assign(features, groupFeatures);
    }

    return {
      id: uuidv4(),
      userId: data.userId,
      timestamp: new Date(),
      features,
      metadata: {
        featureVersion: this.version,
        extractionMethod: 'productivity_extractor',
        windowSize: data.timeWindow.duration,
        confidence: this.calculateConfidence(data),
        tags: ['productivity', 'developer_metrics']
      }
    };
  }

  getFeatureDefinitions(): FeatureDefinition[] {
    return this.featureGroups.flatMap(group => group.features);
  }

  validateFeatures(features: FeatureVector): boolean {
    const definitions = this.getFeatureDefinitions();
    
    for (const definition of definitions) {
      const value = features.features[definition.name];
      
      if (value === undefined || value === null) {
        if (definition.defaultValue === undefined) {
          return false;
        }
        continue;
      }

      if (typeof value !== 'number' || !isFinite(value)) {
        return false;
      }
    }

    return true;
  }

  private initializeFeatureGroups(): FeatureGroup[] {
    return [
      {
        name: 'productivity_metrics',
        description: 'Core productivity indicators',
        features: [
          {
            name: 'commits_per_day',
            type: 'numerical',
            description: 'Average number of commits per day',
            extractionFunction: (data: AggregatedMetrics) => 
              data.productivity.totalCommits / (data.timeWindow.duration / (24 * 60 * 60 * 1000)),
            normalizationMethod: 'zscore',
            defaultValue: 0
          },
          {
            name: 'lines_added_per_commit',
            type: 'numerical',
            description: 'Average lines of code added per commit',
            extractionFunction: (data: AggregatedMetrics) => 
              data.productivity.totalCommits > 0 ? 
                data.productivity.linesOfCodeAdded / data.productivity.totalCommits : 0,
            normalizationMethod: 'robust',
            defaultValue: 0
          },
          {
            name: 'code_churn_rate',
            type: 'numerical',
            description: 'Rate of code changes (additions + deletions)',
            extractionFunction: (data: AggregatedMetrics) => 
              (data.productivity.linesOfCodeAdded + data.productivity.linesOfCodeDeleted) / 
              Math.max(data.productivity.linesOfCodeAdded, 1),
            normalizationMethod: 'minmax',
            defaultValue: 0
          },
          {
            name: 'pr_creation_rate',
            type: 'numerical',
            description: 'Pull requests created per day',
            extractionFunction: (data: AggregatedMetrics) => 
              data.productivity.pullRequestsCreated / (data.timeWindow.duration / (24 * 60 * 60 * 1000)),
            normalizationMethod: 'zscore',
            defaultValue: 0
          }
        ],
        dependencies: []
      },
      {
        name: 'focus_metrics',
        description: 'Developer focus and flow state indicators',
        features: [
          {
            name: 'total_focus_time_hours',
            type: 'numerical',
            description: 'Total focus time in hours',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.totalFocusTime / (60 * 60 * 1000),
            normalizationMethod: 'minmax',
            defaultValue: 0
          },
          {
            name: 'average_flow_duration_minutes',
            type: 'numerical',
            description: 'Average flow session duration in minutes',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.averageFlowDuration / (60 * 1000),
            normalizationMethod: 'robust',
            defaultValue: 0
          },
          {
            name: 'interruption_rate_per_hour',
            type: 'numerical',
            description: 'Number of interruptions per hour of work',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.totalFocusTime > 0 ? 
                data.focus.interruptionRate / (data.focus.totalFocusTime / (60 * 60 * 1000)) : 0,
            normalizationMethod: 'zscore',
            defaultValue: 0
          },
          {
            name: 'deep_work_percentage',
            type: 'numerical',
            description: 'Percentage of time spent in deep work',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.deepWorkPercentage * 100,
            normalizationMethod: 'none',
            defaultValue: 0
          },
          {
            name: 'context_switching_frequency',
            type: 'numerical',
            description: 'Frequency of context switching per hour',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.contextSwitchingFrequency,
            normalizationMethod: 'zscore',
            defaultValue: 0
          }
        ],
        dependencies: ['productivity_metrics']
      },
      {
        name: 'quality_metrics',
        description: 'Code quality and review indicators',
        features: [
          {
            name: 'review_cycle_time_hours',
            type: 'numerical',
            description: 'Average review cycle time in hours',
            extractionFunction: (data: AggregatedMetrics) => 
              data.codeQuality.reviewCycleTime / (60 * 60 * 1000),
            normalizationMethod: 'robust',
            defaultValue: 0
          },
          {
            name: 'refactoring_ratio',
            type: 'numerical',
            description: 'Ratio of refactoring commits to total commits',
            extractionFunction: (data: AggregatedMetrics) => 
              data.codeQuality.refactoringRatio,
            normalizationMethod: 'none',
            defaultValue: 0
          },
          {
            name: 'bug_fix_ratio',
            type: 'numerical',
            description: 'Ratio of bug fix commits to total commits',
            extractionFunction: (data: AggregatedMetrics) => 
              data.codeQuality.bugFixRatio,
            normalizationMethod: 'none',
            defaultValue: 0
          },
          {
            name: 'average_complexity_score',
            type: 'numerical',
            description: 'Average code complexity score',
            extractionFunction: (data: AggregatedMetrics) => 
              data.codeQuality.averageComplexity,
            normalizationMethod: 'zscore',
            defaultValue: 1
          }
        ],
        dependencies: ['productivity_metrics']
      },
      {
        name: 'collaboration_metrics',
        description: 'Team collaboration and communication indicators',
        features: [
          {
            name: 'review_participation_score',
            type: 'numerical',
            description: 'Score indicating participation in code reviews',
            extractionFunction: (data: AggregatedMetrics) => 
              data.collaboration.reviewParticipation,
            normalizationMethod: 'minmax',
            defaultValue: 0
          },
          {
            name: 'knowledge_sharing_score',
            type: 'numerical',
            description: 'Score indicating knowledge sharing activity',
            extractionFunction: (data: AggregatedMetrics) => 
              data.collaboration.knowledgeSharing,
            normalizationMethod: 'minmax',
            defaultValue: 0
          },
          {
            name: 'cross_team_collaboration_score',
            type: 'numerical',
            description: 'Score indicating collaboration across teams',
            extractionFunction: (data: AggregatedMetrics) => 
              data.collaboration.crossTeamCollaboration,
            normalizationMethod: 'minmax',
            defaultValue: 0
          },
          {
            name: 'communication_frequency_per_day',
            type: 'numerical',
            description: 'Communication events per day',
            extractionFunction: (data: AggregatedMetrics) => 
              data.collaboration.communicationFrequency / (data.timeWindow.duration / (24 * 60 * 60 * 1000)),
            normalizationMethod: 'zscore',
            defaultValue: 0
          }
        ],
        dependencies: ['productivity_metrics', 'quality_metrics']
      },
      {
        name: 'temporal_metrics',
        description: 'Time-based patterns and trends',
        features: [
          {
            name: 'peak_productivity_hour',
            type: 'numerical',
            description: 'Hour of day with peak productivity (0-23)',
            extractionFunction: (data: AggregatedMetrics) => 
              data.focus.peakProductivityHours.length > 0 ? 
                data.focus.peakProductivityHours[0] : 12,
            normalizationMethod: 'none',
            defaultValue: 12
          },
          {
            name: 'work_consistency_score',
            type: 'numerical',
            description: 'Consistency of work patterns (0-1)',
            extractionFunction: (data: AggregatedMetrics) => 
              this.calculateWorkConsistency(data),
            normalizationMethod: 'none',
            defaultValue: 0.5
          },
          {
            name: 'weekend_activity_ratio',
            type: 'numerical',
            description: 'Ratio of weekend to weekday activity',
            extractionFunction: (data: AggregatedMetrics) => 
              this.calculateWeekendActivityRatio(data),
            normalizationMethod: 'minmax',
            defaultValue: 0
          }
        ],
        dependencies: ['productivity_metrics', 'focus_metrics']
      }
    ];
  }

  private extractFeatureGroup(group: FeatureGroup, data: AggregatedMetrics): Record<string, number> {
    const features: Record<string, number> = {};

    for (const feature of group.features) {
      try {
        const value = feature.extractionFunction(data);
        features[feature.name] = isFinite(value) ? value : feature.defaultValue;
      } catch (error) {
        console.warn(`Error extracting feature ${feature.name}:`, error);
        features[feature.name] = feature.defaultValue;
      }
    }

    return features;
  }

  private aggregateData(data: ProductivityData): AggregatedMetrics {
    const productivity = this.aggregateProductivityMetrics(data);
    const codeQuality = this.aggregateCodeQualityMetrics(data);
    const collaboration = this.aggregateCollaborationMetrics(data);
    const focus = this.aggregateFocusMetrics(data);

    return {
      userId: data.userId,
      timeWindow: data.timeWindow,
      productivity,
      codeQuality,
      collaboration,
      focus
    };
  }

  private aggregateProductivityMetrics(data: ProductivityData) {
    const gitEvents = data.gitEvents;
    const commits = gitEvents.filter(e => e.type === 'commit');
    const pullRequests = gitEvents.filter(e => e.type === 'pull_request');

    const totalLinesAdded = gitEvents.reduce((sum, event) => 
      sum + (event.metadata.linesAdded || 0), 0);
    const totalLinesDeleted = gitEvents.reduce((sum, event) => 
      sum + (event.metadata.linesDeleted || 0), 0);
    const filesModified = new Set(gitEvents.flatMap(e => e.metadata.filesChanged || [])).size;

    return {
      totalCommits: commits.length,
      linesOfCodeAdded: totalLinesAdded,
      linesOfCodeDeleted: totalLinesDeleted,
      filesModified,
      pullRequestsCreated: pullRequests.length,
      pullRequestsReviewed: 0, // Would need review data
      averageCommitSize: commits.length > 0 ? totalLinesAdded / commits.length : 0,
      commitFrequency: commits.length / (data.timeWindow.duration / (24 * 60 * 60 * 1000))
    };
  }

  private aggregateCodeQualityMetrics(data: ProductivityData) {
    const gitEvents = data.gitEvents;
    const totalLines = gitEvents.reduce((sum, event) => 
      sum + (event.metadata.linesAdded || 0) + (event.metadata.linesDeleted || 0), 0);
    const addedLines = gitEvents.reduce((sum, event) => 
      sum + (event.metadata.linesAdded || 0), 0);

    return {
      codeChurnRate: addedLines > 0 ? totalLines / addedLines : 0,
      averageComplexity: 1.0, // Would need complexity analysis
      refactoringRatio: 0.1, // Would need commit message analysis
      testCoverage: 0.8, // Would need test coverage data
      bugFixRatio: 0.05, // Would need commit message analysis
      reviewCycleTime: 24 * 60 * 60 * 1000 // 24 hours default
    };
  }

  private aggregateCollaborationMetrics(data: ProductivityData) {
    return {
      reviewParticipation: 0.7, // Would need review data
      knowledgeSharing: 0.5, // Would need communication data
      mentorshipActivity: 0.3, // Would need mentorship tracking
      crossTeamCollaboration: 0.2, // Would need team interaction data
      communicationFrequency: 10 // Would need communication data
    };
  }

  private aggregateFocusMetrics(data: ProductivityData) {
    const flowStates = data.flowStates;
    const totalFocusTime = flowStates.reduce((sum, flow) => 
      sum + flow.totalFocusTimeMs, 0);
    const averageFlowDuration = flowStates.length > 0 ? 
      flowStates.reduce((sum, flow) => sum + (flow.endTime ? 
        flow.endTime.getTime() - flow.startTime.getTime() : 0), 0) / flowStates.length : 0;

    return {
      totalFocusTime,
      averageFlowDuration,
      interruptionRate: flowStates.reduce((sum, flow) => sum + flow.interruptionCount, 0),
      deepWorkPercentage: flowStates.length > 0 ? 
        flowStates.reduce((sum, flow) => sum + flow.deepWorkPercentage, 0) / flowStates.length : 0,
      contextSwitchingFrequency: 5, // Would need detailed IDE telemetry
      peakProductivityHours: [9, 10, 14, 15] // Would need temporal analysis
    };
  }

  private calculateWorkConsistency(data: AggregatedMetrics): number {
    // Simplified consistency calculation
    // In practice, this would analyze temporal patterns
    return 0.7;
  }

  private calculateWeekendActivityRatio(data: AggregatedMetrics): number {
    // Simplified weekend activity calculation
    // In practice, this would analyze temporal distribution
    return 0.1;
  }

  private calculateConfidence(data: ProductivityData): number {
    let confidence = 1.0;
    
    // Reduce confidence based on data completeness
    if (data.metrics.length === 0) confidence *= 0.5;
    if (data.flowStates.length === 0) confidence *= 0.7;
    if (data.gitEvents.length === 0) confidence *= 0.6;
    if (data.ideTelemetry.length === 0) confidence *= 0.8;

    // Reduce confidence for short time windows
    const windowHours = data.timeWindow.duration / (60 * 60 * 1000);
    if (windowHours < 24) confidence *= 0.8;
    if (windowHours < 8) confidence *= 0.6;

    return Math.max(confidence, 0.1);
  }
}