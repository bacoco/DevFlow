import {
  InterventionPlan,
  InterventionOutcome,
  DeliveryResult,
  EmergencyResponse,
  InterventionType,
  DeliveryMethod,
  EmergencySeverity,
  InterventionTiming,
  PersonalizationSettings
} from '@devflow/shared-types';

// ============================================================================
// INTERVENTION ENGINE SERVICE INTERFACES
// ============================================================================

export interface InterventionEngine {
  // Intervention Management
  scheduleIntervention(userId: string, intervention: InterventionPlan): Promise<ScheduleResult>;
  deliverIntervention(userId: string, interventionId: string): Promise<DeliveryResult>;
  cancelIntervention(userId: string, interventionId: string): Promise<CancellationResult>;
  rescheduleIntervention(userId: string, interventionId: string, newTiming: InterventionTiming): Promise<ScheduleResult>;
  
  // Effectiveness Tracking
  trackInterventionEffectiveness(userId: string, interventionId: string, outcome: InterventionOutcome): Promise<void>;
  getInterventionHistory(userId: string, timeRange?: TimeRange): Promise<InterventionHistory[]>;
  analyzeInterventionPatterns(userId: string): Promise<InterventionPatternAnalysis>;
  
  // Emergency Response
  triggerEmergencyIntervention(userId: string, severity: EmergencySeverity): Promise<EmergencyResponse>;
  escalateIntervention(interventionId: string, reason: string): Promise<EscalationResult>;
  notifyEmergencyContacts(userId: string, situation: EmergencySituation): Promise<NotificationResult>;
}

export interface InterventionScheduler {
  // Smart Scheduling
  findOptimalInterventionTime(userId: string, intervention: InterventionPlan): Promise<OptimalTiming>;
  resolveSchedulingConflicts(userId: string, interventions: InterventionPlan[]): Promise<ConflictResolution>;
  adaptScheduleBasedOnContext(userId: string, context: UserContext): Promise<ScheduleAdaptation>;
  
  // Timing Optimization
  analyzeUserAvailability(userId: string): Promise<AvailabilityAnalysis>;
  predictInterventionReceptivity(userId: string, time: Date): Promise<ReceptivityPrediction>;
  optimizeInterventionFrequency(userId: string): Promise<FrequencyOptimization>;
}

export interface DeliveryManager {
  // Multi-Modal Delivery
  deliverVisualIntervention(userId: string, content: VisualInterventionContent): Promise<DeliveryResult>;
  deliverAudioIntervention(userId: string, content: AudioInterventionContent): Promise<DeliveryResult>;
  deliverHapticIntervention(userId: string, content: HapticInterventionContent): Promise<DeliveryResult>;
  deliverMultiModalIntervention(userId: string, content: MultiModalInterventionContent): Promise<DeliveryResult>;
  
  // Delivery Optimization
  selectOptimalDeliveryMethod(userId: string, context: DeliveryContext): Promise<DeliveryMethod>;
  adaptContentForUser(userId: string, baseContent: InterventionContent): Promise<PersonalizedContent>;
  trackDeliveryEffectiveness(deliveryId: string, userResponse: UserResponse): Promise<void>;
}

export interface EffectivenessTracker {
  // Outcome Measurement
  measureInterventionImpact(interventionId: string, preState: WellnessState, postState: WellnessState): Promise<ImpactMeasurement>;
  trackBiometricChanges(userId: string, interventionId: string): Promise<BiometricImpactAnalysis>;
  assessUserSatisfaction(userId: string, interventionId: string): Promise<SatisfactionAssessment>;
  
  // Adaptive Learning
  updateInterventionEffectiveness(interventionType: InterventionType, outcome: InterventionOutcome): Promise<void>;
  identifyMostEffectiveInterventions(userId: string): Promise<EffectivenessRanking>;
  recommendInterventionImprovements(interventionId: string): Promise<ImprovementRecommendation[]>;
}

export interface EmergencyHandler {
  // Emergency Detection
  detectEmergencySituation(userId: string, indicators: EmergencyIndicator[]): Promise<EmergencyAssessment>;
  classifyEmergencySeverity(situation: EmergencySituation): Promise<EmergencySeverity>;
  validateEmergencyTriggers(userId: string): Promise<TriggerValidation>;
  
  // Emergency Response
  executeEmergencyProtocol(userId: string, severity: EmergencySeverity): Promise<ProtocolExecution>;
  contactEmergencyServices(userId: string, situation: EmergencySituation): Promise<EmergencyServiceResponse>;
  notifySupport(userId: string, situation: EmergencySituation): Promise<SupportNotificationResult>;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface ScheduleResult {
  success: boolean;
  interventionId: string;
  scheduledTime: Date;
  estimatedDuration: number; // minutes
  conflicts: SchedulingConflict[];
  adaptations: ScheduleAdaptation[];
}

export interface CancellationResult {
  success: boolean;
  interventionId: string;
  cancelledAt: Date;
  reason: string;
  rescheduled: boolean;
  newInterventionId?: string;
}

export interface InterventionHistory {
  interventionId: string;
  userId: string;
  type: InterventionType;
  scheduledTime: Date;
  deliveredTime?: Date;
  completedTime?: Date;
  effectiveness: number; // 0-5
  userFeedback?: string;
  biometricImpact?: BiometricImpact;
  status: 'scheduled' | 'delivered' | 'completed' | 'cancelled' | 'failed';
}

export interface InterventionPatternAnalysis {
  userId: string;
  patterns: {
    mostEffectiveTypes: InterventionType[];
    optimalTiming: TimePattern[];
    preferredDeliveryMethods: DeliveryMethod[];
    responsePatterns: ResponsePattern[];
  };
  insights: PatternInsight[];
  recommendations: PatternRecommendation[];
  confidence: number;
  analysisDate: Date;
}

export interface EscalationResult {
  success: boolean;
  escalationLevel: 'team_lead' | 'manager' | 'hr' | 'emergency_services';
  notifiedParties: string[];
  escalationTime: Date;
  followUpRequired: boolean;
}

export interface NotificationResult {
  success: boolean;
  contactsNotified: EmergencyContact[];
  notificationMethods: NotificationMethod[];
  deliveryTime: Date;
  acknowledgments: ContactAcknowledgment[];
}

export interface OptimalTiming {
  recommendedTime: Date;
  confidence: number; // 0-1
  reasoning: string[];
  alternativeTimes: Date[];
  contextFactors: ContextFactor[];
}

export interface ConflictResolution {
  conflicts: SchedulingConflict[];
  resolutions: ConflictResolutionStrategy[];
  finalSchedule: InterventionScheduleItem[];
  compromises: ScheduleCompromise[];
}

export interface ScheduleAdaptation {
  adaptationType: 'timing' | 'frequency' | 'content' | 'delivery_method';
  originalValue: any;
  adaptedValue: any;
  reason: string;
  confidence: number;
}

export interface AvailabilityAnalysis {
  userId: string;
  availabilityWindows: TimeWindow[];
  busyPeriods: TimeWindow[];
  preferredInterventionTimes: TimeWindow[];
  contextualFactors: AvailabilityFactor[];
  lastUpdated: Date;
}

export interface ReceptivityPrediction {
  time: Date;
  receptivityScore: number; // 0-1
  confidence: number; // 0-1
  influencingFactors: ReceptivityFactor[];
  recommendations: TimingRecommendation[];
}

export interface FrequencyOptimization {
  userId: string;
  currentFrequency: InterventionFrequency;
  recommendedFrequency: InterventionFrequency;
  reasoning: string[];
  expectedImpact: number; // 0-1
  trialPeriod: number; // days
}

export interface VisualInterventionContent {
  type: 'notification' | 'overlay' | 'widget' | 'full_screen';
  title: string;
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  interactiveElements?: InteractiveElement[];
  styling: VisualStyling;
  duration: number; // seconds
}

export interface AudioInterventionContent {
  type: 'notification' | 'guided_audio' | 'ambient_sound' | 'voice_prompt';
  audioUrl?: string;
  textToSpeech?: string;
  volume: number; // 0-1
  duration: number; // seconds
  fadeIn: boolean;
  fadeOut: boolean;
}

export interface HapticInterventionContent {
  type: 'vibration' | 'pulse' | 'pattern';
  intensity: number; // 0-1
  pattern: HapticPattern[];
  duration: number; // milliseconds
  repeatCount: number;
}

export interface MultiModalInterventionContent {
  visual?: VisualInterventionContent;
  audio?: AudioInterventionContent;
  haptic?: HapticInterventionContent;
  synchronization: SynchronizationSettings;
  fallbackMethods: DeliveryMethod[];
}

export interface DeliveryContext {
  userLocation: 'office' | 'home' | 'mobile' | 'unknown';
  currentActivity: 'coding' | 'meeting' | 'break' | 'focused' | 'idle';
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'wearable';
  environmentalFactors: EnvironmentalFactor[];
  userState: UserState;
  timeOfDay: string;
}

export interface PersonalizedContent {
  baseContent: InterventionContent;
  personalizations: Personalization[];
  adaptationReason: string[];
  effectivenessScore: number; // 0-1
}

export interface UserResponse {
  responseType: 'accepted' | 'dismissed' | 'snoozed' | 'completed' | 'ignored';
  responseTime: Date;
  engagementDuration: number; // seconds
  feedback?: UserFeedback;
  biometricResponse?: BiometricResponse;
}

export interface ImpactMeasurement {
  interventionId: string;
  userId: string;
  preInterventionState: WellnessState;
  postInterventionState: WellnessState;
  impact: {
    stressReduction: number; // -1 to 1
    energyIncrease: number; // -1 to 1
    focusImprovement: number; // -1 to 1
    moodImprovement: number; // -1 to 1
  };
  confidence: number; // 0-1
  measurementTime: Date;
}

export interface BiometricImpactAnalysis {
  interventionId: string;
  userId: string;
  biometricChanges: {
    heartRateChange: number;
    stressLevelChange: number;
    activityLevelChange: number;
  };
  timeToImpact: number; // minutes
  impactDuration: number; // minutes
  significance: 'low' | 'medium' | 'high';
}

export interface SatisfactionAssessment {
  interventionId: string;
  userId: string;
  satisfactionScore: number; // 1-5
  aspects: {
    timing: number; // 1-5
    content: number; // 1-5
    delivery: number; // 1-5
    effectiveness: number; // 1-5
  };
  feedback: string;
  wouldRecommend: boolean;
  assessmentDate: Date;
}

export interface EffectivenessRanking {
  userId: string;
  rankings: InterventionEffectivenessRank[];
  insights: EffectivenessInsight[];
  recommendations: EffectivenessRecommendation[];
  lastUpdated: Date;
}

export interface InterventionEffectivenessRank {
  interventionType: InterventionType;
  effectivenessScore: number; // 0-1
  sampleSize: number;
  confidence: number; // 0-1
  trends: EffectivenessTrend[];
}

// ============================================================================
// EMERGENCY TYPES
// ============================================================================

export interface EmergencyIndicator {
  type: 'biometric' | 'behavioral' | 'self_reported' | 'external';
  severity: number; // 0-1
  description: string;
  timestamp: Date;
  source: string;
}

export interface EmergencyAssessment {
  isEmergency: boolean;
  severity: EmergencySeverity;
  confidence: number; // 0-1
  indicators: EmergencyIndicator[];
  recommendedActions: EmergencyAction[];
  timeToAction: number; // minutes
}

export interface EmergencySituation {
  userId: string;
  situationType: 'medical' | 'psychological' | 'safety' | 'other';
  severity: EmergencySeverity;
  description: string;
  indicators: EmergencyIndicator[];
  location?: string;
  timestamp: Date;
}

export interface TriggerValidation {
  userId: string;
  triggers: EmergencyTrigger[];
  validationResults: TriggerValidationResult[];
  recommendedUpdates: TriggerUpdate[];
  lastValidated: Date;
}

export interface ProtocolExecution {
  protocolId: string;
  userId: string;
  executionSteps: ProtocolStep[];
  completedSteps: string[];
  failedSteps: ProtocolFailure[];
  executionTime: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

export interface EmergencyServiceResponse {
  serviceType: 'medical' | 'police' | 'fire' | 'mental_health';
  contacted: boolean;
  responseTime: Date;
  referenceNumber?: string;
  estimatedArrival?: Date;
  instructions: string[];
}

export interface SupportNotificationResult {
  supportType: 'internal' | 'external' | 'peer' | 'professional';
  contactsNotified: SupportContact[];
  notificationTime: Date;
  acknowledgments: SupportAcknowledgment[];
  followUpScheduled: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class InterventionEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: string,
    public interventionId?: string
  ) {
    super(message);
    this.name = 'InterventionEngineError';
  }
}

export class SchedulingError extends InterventionEngineError {
  constructor(message: string, userId: string, interventionId?: string) {
    super(message, 'SCHEDULING_ERROR', userId, interventionId);
    this.name = 'SchedulingError';
  }
}

export class DeliveryError extends InterventionEngineError {
  constructor(message: string, userId: string, interventionId: string) {
    super(message, 'DELIVERY_ERROR', userId, interventionId);
    this.name = 'DeliveryError';
  }
}

export class EmergencyError extends InterventionEngineError {
  constructor(message: string, userId: string) {
    super(message, 'EMERGENCY_ERROR', userId);
    this.name = 'EmergencyError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

export interface TimeWindow {
  start: Date;
  end: Date;
  confidence: number; // 0-1
  context?: string;
}

export interface SchedulingConflict {
  conflictType: 'time_overlap' | 'resource_conflict' | 'user_unavailable';
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedInterventions: string[];
}

export interface InterventionFrequency {
  daily: number;
  weekly: number;
  monthly: number;
  perHour: number;
}

export interface WellnessState {
  stressLevel: number; // 0-100
  energyLevel: number; // 0-100
  focusLevel: number; // 0-100
  moodLevel: number; // 0-100
  timestamp: Date;
}

export interface UserState {
  currentStress: number; // 0-100
  currentEnergy: number; // 0-100
  currentFocus: number; // 0-100
  currentMood: number; // 0-100
  lastInterventionTime?: Date;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number; // 1-5
}

export interface EmergencyAction {
  action: string;
  priority: number; // 1-5
  timeframe: string;
  responsible: 'user' | 'system' | 'contact' | 'service';
}