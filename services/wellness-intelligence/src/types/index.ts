import {
  WellnessProfile,
  WellnessSnapshot,
  RiskFactor,
  WellnessGoal,
  WellnessRiskLevel,
  BiometricReading
} from '@devflow/shared-types';

// ============================================================================
// WELLNESS INTELLIGENCE SERVICE INTERFACES
// ============================================================================

export interface WellnessIntelligence {
  // Predictive Analytics
  predictBurnoutRisk(userId: string): Promise<BurnoutRiskAssessment>;
  forecastWellnessTrends(teamId: string, timeHorizon: number): Promise<WellnessForecast>;
  predictOptimalWorkSchedule(userId: string): Promise<OptimalSchedule>;
  
  // Pattern Analysis
  analyzeWellnessPatterns(userId: string): Promise<WellnessPatterns>;
  correlateProductivityWellness(userId: string): Promise<CorrelationAnalysis>;
  identifyWellnessDrivers(userId: string): Promise<WellnessDrivers>;
  
  // Recommendations
  generateWellnessRecommendations(userId: string): Promise<WellnessRecommendation[]>;
  personalizeInterventions(userId: string, preferences: UserPreferences): Promise<PersonalizedPlan>;
  optimizeTeamWellness(teamId: string): Promise<TeamOptimizationPlan>;
}

export interface WellnessPredictor {
  // Machine Learning Models
  trainBurnoutModel(trainingData: BurnoutTrainingData[]): Promise<ModelTrainingResult>;
  predictBurnout(features: BurnoutFeatures): Promise<BurnoutPrediction>;
  updateModelWithFeedback(modelId: string, feedback: ModelFeedback): Promise<void>;
  
  // Forecasting
  forecastWellnessMetrics(userId: string, days: number): Promise<WellnessMetricsForecast>;
  predictInterventionEffectiveness(userId: string, intervention: InterventionType): Promise<EffectivenessPrediction>;
  estimateRecoveryTime(userId: string, currentState: WellnessSnapshot): Promise<RecoveryEstimate>;
}

export interface PatternAnalyzer {
  // Pattern Detection
  detectWellnessPatterns(data: WellnessSnapshot[]): Promise<DetectedPattern[]>;
  analyzeCircadianRhythms(userId: string): Promise<CircadianAnalysis>;
  identifyStressTriggers(userId: string): Promise<StressTriggerAnalysis>;
  
  // Correlation Analysis
  correlateBiometricProductivity(userId: string): Promise<BiometricProductivityCorrelation>;
  analyzeSleepProductivityRelation(userId: string): Promise<SleepProductivityAnalysis>;
  identifyOptimalWorkingConditions(userId: string): Promise<OptimalConditions>;
}

export interface RecommendationEngine {
  // Recommendation Generation
  generatePersonalizedRecommendations(userId: string, context: UserContext): Promise<PersonalizedRecommendation[]>;
  recommendInterventionTiming(userId: string): Promise<InterventionTimingRecommendation[]>;
  suggestLifestyleChanges(userId: string): Promise<LifestyleRecommendation[]>;
  
  // A/B Testing
  createRecommendationExperiment(experimentConfig: ExperimentConfig): Promise<Experiment>;
  trackRecommendationEffectiveness(recommendationId: string, outcome: RecommendationOutcome): Promise<void>;
  optimizeRecommendationAlgorithm(algorithmId: string): Promise<OptimizationResult>;
}

export interface ComplianceMonitor {
  // Regulatory Compliance
  validateHIPAACompliance(operation: string, data: any): Promise<ComplianceResult>;
  checkGDPRCompliance(userId: string, dataProcessing: DataProcessingActivity): Promise<ComplianceResult>;
  generateAuditTrail(userId: string, activity: AuditActivity): Promise<void>;
  
  // Privacy Protection
  anonymizeWellnessData(data: WellnessSnapshot[], level: AnonymizationLevel): Promise<AnonymizedWellnessData[]>;
  validateConsentRequirements(userId: string, operation: string): Promise<ConsentValidationResult>;
  handleDataDeletionRequest(userId: string): Promise<DeletionResult>;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface BurnoutRiskAssessment {
  riskLevel: WellnessRiskLevel;
  riskScore: number; // 0-100
  confidence: number; // 0-1
  contributingFactors: ContributingFactor[];
  recommendedActions: RecommendedAction[];
  timeToIntervention: number; // hours
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastAssessment: Date;
}

export interface ContributingFactor {
  factor: string;
  impact: number; // 0-1
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  dataSource: string;
}

export interface RecommendedAction {
  action: string;
  priority: number; // 1-5
  expectedImpact: number; // 0-1
  timeframe: string;
  category: 'immediate' | 'short_term' | 'long_term';
}

export interface WellnessForecast {
  teamId: string;
  forecastPeriod: {
    startDate: Date;
    endDate: Date;
  };
  predictions: {
    overallWellnessTrend: 'improving' | 'declining' | 'stable';
    riskMembers: string[]; // user IDs at risk
    optimalWorkloadDistribution: WorkloadDistribution[];
    recommendedInterventions: TeamIntervention[];
  };
  confidence: number;
  lastUpdated: Date;
}

export interface OptimalSchedule {
  userId: string;
  schedule: {
    optimalWorkHours: TimeSlot[];
    recommendedBreaks: BreakRecommendation[];
    focusTimeWindows: TimeSlot[];
    meetingPreferences: MeetingPreference[];
  };
  reasoning: string[];
  confidence: number;
  validUntil: Date;
}

export interface WellnessPatterns {
  userId: string;
  patterns: DetectedPattern[];
  insights: PatternInsight[];
  recommendations: PatternBasedRecommendation[];
  confidence: number;
  analysisDate: Date;
}

export interface DetectedPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  name: string;
  description: string;
  strength: number; // 0-1
  frequency: number;
  examples: PatternExample[];
}

export interface CorrelationAnalysis {
  userId: string;
  correlations: WellnessProductivityCorrelation[];
  insights: CorrelationInsight[];
  recommendations: CorrelationBasedRecommendation[];
  statisticalSignificance: number;
  analysisDate: Date;
}

export interface WellnessProductivityCorrelation {
  wellnessMetric: string;
  productivityMetric: string;
  correlation: number; // -1 to 1
  pValue: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative';
}

export interface WellnessDrivers {
  userId: string;
  drivers: WellnessDriver[];
  insights: DriverInsight[];
  actionableRecommendations: DriverRecommendation[];
  confidence: number;
  lastAnalyzed: Date;
}

export interface WellnessDriver {
  factor: string;
  impact: number; // 0-1
  controllability: number; // 0-1 (how much user can control this)
  trend: 'improving' | 'worsening' | 'stable';
  category: 'behavioral' | 'environmental' | 'physiological' | 'psychological';
}

export interface WellnessRecommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionItems: ActionItem[];
  expectedOutcome: string;
  timeframe: number; // minutes
  evidenceBased: boolean;
  personalizationScore: number; // 0-1
  category: 'immediate' | 'daily' | 'weekly' | 'lifestyle';
  createdAt: Date;
  expiresAt?: Date;
}

export interface PersonalizedPlan {
  userId: string;
  planId: string;
  goals: PersonalizedGoal[];
  interventions: PersonalizedIntervention[];
  schedule: PersonalizedSchedule;
  trackingMetrics: TrackingMetric[];
  adaptationRules: AdaptationRule[];
  createdAt: Date;
  validUntil: Date;
}

export interface TeamOptimizationPlan {
  teamId: string;
  planId: string;
  teamWellnessGoals: TeamWellnessGoal[];
  workloadOptimization: WorkloadOptimization;
  teamInterventions: TeamIntervention[];
  communicationRecommendations: CommunicationRecommendation[];
  monitoringStrategy: MonitoringStrategy;
  createdAt: Date;
  reviewDate: Date;
}

// ============================================================================
// MACHINE LEARNING TYPES
// ============================================================================

export interface BurnoutTrainingData {
  userId: string;
  features: BurnoutFeatures;
  outcome: BurnoutOutcome;
  timestamp: Date;
}

export interface BurnoutFeatures {
  biometricFeatures: {
    avgHeartRate: number;
    heartRateVariability: number;
    stressLevel: number;
    sleepQuality: number;
    activityLevel: number;
  };
  behavioralFeatures: {
    workingHours: number;
    breakFrequency: number;
    focusTime: number;
    interruptionCount: number;
  };
  contextualFeatures: {
    workload: number;
    deadlinePressure: number;
    teamSize: number;
    projectComplexity: number;
  };
}

export interface BurnoutOutcome {
  burnoutOccurred: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  timeToOnset: number; // days
  recoveryTime: number; // days
}

export interface ModelTrainingResult {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  featureImportance: Record<string, number>;
  validationResults: ValidationResults;
}

export interface BurnoutPrediction {
  probability: number; // 0-1
  riskLevel: WellnessRiskLevel;
  confidence: number; // 0-1
  timeHorizon: number; // days
  keyFactors: string[];
  uncertainty: number; // 0-1
}

export interface ModelFeedback {
  predictionId: string;
  actualOutcome: BurnoutOutcome;
  feedbackType: 'correct' | 'false_positive' | 'false_negative';
  userFeedback?: string;
  timestamp: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WellnessIntelligenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WellnessIntelligenceError';
  }
}

export class ModelTrainingError extends WellnessIntelligenceError {
  constructor(message: string, modelId: string, context?: Record<string, any>) {
    super(message, 'MODEL_TRAINING_ERROR', undefined, { modelId, ...context });
    this.name = 'ModelTrainingError';
  }
}

export class PredictionError extends WellnessIntelligenceError {
  constructor(message: string, userId: string, context?: Record<string, any>) {
    super(message, 'PREDICTION_ERROR', userId, context);
    this.name = 'PredictionError';
  }
}

export class ComplianceError extends WellnessIntelligenceError {
  constructor(message: string, userId: string, operation: string) {
    super(message, 'COMPLIANCE_ERROR', userId, { operation });
    this.name = 'ComplianceError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RecommendationType = 
  | 'stress_reduction'
  | 'activity_increase'
  | 'sleep_improvement'
  | 'break_scheduling'
  | 'workload_adjustment'
  | 'environment_optimization';

export type InterventionType = 
  | 'breathing_exercise'
  | 'movement_break'
  | 'hydration_reminder'
  | 'posture_check'
  | 'eye_rest'
  | 'meditation';

export type AnonymizationLevel = 'none' | 'partial' | 'full';

export interface ActionItem {
  description: string;
  estimatedTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface UserPreferences {
  interventionTypes: InterventionType[];
  notificationFrequency: 'low' | 'medium' | 'high';
  privacyLevel: 'strict' | 'moderate' | 'open';
  goals: string[];
}

export interface UserContext {
  currentActivity: string;
  location: string;
  timeOfDay: string;
  workload: number;
  stressLevel: number;
}