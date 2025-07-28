import { ProductivityMetric, FlowState, GitEvent, IDETelemetry, MetricType } from '@devflow/shared-types';

// ============================================================================
// FEATURE ENGINEERING TYPES
// ============================================================================

export interface FeatureVector {
  id: string;
  userId: string;
  timestamp: Date;
  features: Record<string, number>;
  metadata: FeatureMetadata;
}

export interface FeatureMetadata {
  featureVersion: string;
  extractionMethod: string;
  windowSize: number;
  confidence: number;
  tags: string[];
}

export interface FeatureDefinition {
  name: string;
  type: 'numerical' | 'categorical' | 'binary';
  description: string;
  extractionFunction: (data: any) => number;
  normalizationMethod: 'minmax' | 'zscore' | 'robust' | 'none';
  defaultValue: number;
}

export interface FeatureGroup {
  name: string;
  description: string;
  features: FeatureDefinition[];
  dependencies: string[];
}

export interface FeatureStore {
  saveFeatures(features: FeatureVector[]): Promise<void>;
  getFeatures(userId: string, startTime: Date, endTime: Date): Promise<FeatureVector[]>;
  getLatestFeatures(userId: string, limit?: number): Promise<FeatureVector[]>;
  deleteFeatures(userId: string, beforeDate: Date): Promise<void>;
}

export interface FeatureExtractor {
  extractFeatures(data: ProductivityData): Promise<FeatureVector>;
  getFeatureDefinitions(): FeatureDefinition[];
  validateFeatures(features: FeatureVector): boolean;
}

export interface FeatureNormalizer {
  fit(features: FeatureVector[]): void;
  transform(features: FeatureVector[]): FeatureVector[];
  fitTransform(features: FeatureVector[]): FeatureVector[];
  getScalingParameters(): ScalingParameters;
  setScalingParameters(params: ScalingParameters): void;
}

export interface ScalingParameters {
  method: 'minmax' | 'zscore' | 'robust' | 'mixed';
  parameters: Record<string, {
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
    median?: number;
    q25?: number;
    q75?: number;
  }>;
}

// ============================================================================
// DATA AGGREGATION TYPES
// ============================================================================

export interface ProductivityData {
  userId: string;
  timeWindow: TimeWindow;
  metrics: ProductivityMetric[];
  flowStates: FlowState[];
  gitEvents: GitEvent[];
  ideTelemetry: IDETelemetry[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  duration: number; // in milliseconds
  type: 'hour' | 'day' | 'week' | 'month';
}

export interface AggregatedMetrics {
  userId: string;
  timeWindow: TimeWindow;
  productivity: ProductivitySummary;
  codeQuality: CodeQualitySummary;
  collaboration: CollaborationSummary;
  focus: FocusSummary;
}

export interface ProductivitySummary {
  totalCommits: number;
  linesOfCodeAdded: number;
  linesOfCodeDeleted: number;
  filesModified: number;
  pullRequestsCreated: number;
  pullRequestsReviewed: number;
  averageCommitSize: number;
  commitFrequency: number;
}

export interface CodeQualitySummary {
  codeChurnRate: number;
  averageComplexity: number;
  refactoringRatio: number;
  testCoverage: number;
  bugFixRatio: number;
  reviewCycleTime: number;
}

export interface CollaborationSummary {
  reviewParticipation: number;
  knowledgeSharing: number;
  mentorshipActivity: number;
  crossTeamCollaboration: number;
  communicationFrequency: number;
}

export interface FocusSummary {
  totalFocusTime: number;
  averageFlowDuration: number;
  interruptionRate: number;
  deepWorkPercentage: number;
  contextSwitchingFrequency: number;
  peakProductivityHours: number[];
}

// ============================================================================
// FEATURE EXTRACTION CONFIGURATION
// ============================================================================

export interface FeatureExtractionConfig {
  windowSizes: number[]; // in hours
  featureGroups: string[];
  normalizationEnabled: boolean;
  outlierDetection: boolean;
  missingValueStrategy: 'drop' | 'impute' | 'default';
  aggregationMethods: AggregationMethod[];
}

export interface AggregationMethod {
  name: string;
  function: 'sum' | 'mean' | 'median' | 'min' | 'max' | 'std' | 'count';
  windowSize: number;
}

// ============================================================================
// VALIDATION AND QUALITY TYPES
// ============================================================================

export interface FeatureQualityMetrics {
  completeness: number; // percentage of non-null values
  uniqueness: number; // percentage of unique values
  consistency: number; // consistency score
  validity: number; // percentage of valid values
  accuracy: number; // accuracy score if ground truth available
}

export interface FeatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityMetrics: FeatureQualityMetrics;
  recommendations: string[];
}

export interface DataDriftMetrics {
  featureName: string;
  driftScore: number;
  pValue: number;
  isDrifted: boolean;
  driftType: 'covariate' | 'prior' | 'concept';
  detectionMethod: string;
}