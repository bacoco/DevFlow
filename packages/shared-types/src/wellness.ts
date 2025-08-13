import { z } from 'zod';

// ============================================================================
// WELLNESS ENUMS AND CONSTANTS
// ============================================================================

export enum DeviceType {
  APPLE_WATCH = 'apple_watch',
  FITBIT = 'fitbit',
  GARMIN = 'garmin',
  CUSTOM = 'custom'
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export enum BiometricDataType {
  HEART_RATE = 'heart_rate',
  STRESS_LEVEL = 'stress_level',
  ACTIVITY_LEVEL = 'activity_level',
  SLEEP_QUALITY = 'sleep_quality',
  BLOOD_PRESSURE = 'blood_pressure',
  BODY_TEMPERATURE = 'body_temperature'
}

export enum WellnessRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InterventionType {
  BREAK_REMINDER = 'break_reminder',
  STRESS_REDUCTION = 'stress_reduction',
  MOVEMENT_PROMPT = 'movement_prompt',
  HYDRATION_REMINDER = 'hydration_reminder',
  BREATHING_EXERCISE = 'breathing_exercise',
  POSTURE_CHECK = 'posture_check'
}

export enum DeliveryMethod {
  VISUAL = 'visual',
  AUDIO = 'audio',
  HAPTIC = 'haptic',
  MULTI_MODAL = 'multi_modal'
}

export enum EmergencySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Device and Connection Schemas
export const DeviceCredentialsSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  apiKey: z.string().optional(),
  deviceId: z.string().optional(),
  additionalParams: z.record(z.string(), z.any()).optional()
});

export const ConnectedDeviceSchema = z.object({
  deviceId: z.string(),
  deviceType: z.nativeEnum(DeviceType),
  connectionStatus: z.nativeEnum(ConnectionStatus),
  lastSync: z.date(),
  dataTypes: z.array(z.nativeEnum(BiometricDataType)),
  batteryLevel: z.number().min(0).max(100).optional(),
  firmwareVersion: z.string().optional(),
  model: z.string().optional()
});

export const ConnectionResultSchema = z.object({
  success: z.boolean(),
  deviceId: z.string().optional(),
  error: z.string().optional(),
  connectionStatus: z.nativeEnum(ConnectionStatus)
});

// Biometric Data Schemas
export const HeartRateReadingSchema = z.object({
  bpm: z.number().min(30).max(220),
  variability: z.number().min(0).optional(),
  confidence: z.number().min(0).max(1)
});

export const StressReadingSchema = z.object({
  level: z.number().min(0).max(100),
  indicators: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1)
});

export const ActivityReadingSchema = z.object({
  steps: z.number().min(0).optional(),
  calories: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  activeMinutes: z.number().min(0).optional(),
  intensity: z.number().min(0).max(1)
});

export const SleepReadingSchema = z.object({
  duration: z.number().min(0), // minutes
  quality: z.number().min(0).max(100),
  deepSleepMinutes: z.number().min(0).optional(),
  remSleepMinutes: z.number().min(0).optional(),
  efficiency: z.number().min(0).max(100).optional()
});

export const EnvironmentReadingSchema = z.object({
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  lightLevel: z.number().min(0).optional(),
  noiseLevel: z.number().min(0).optional()
});

export const DataQualitySchema = z.object({
  accuracy: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
  outlierDetected: z.boolean()
});

export const BiometricReadingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string(),
  timestamp: z.date(),
  heartRate: HeartRateReadingSchema.optional(),
  stress: StressReadingSchema.optional(),
  activity: ActivityReadingSchema.optional(),
  sleep: SleepReadingSchema.optional(),
  environment: EnvironmentReadingSchema.optional(),
  quality: DataQualitySchema
});

// Wellness Profile and Analytics Schemas
export const BaselineMetricsSchema = z.object({
  restingHeartRate: z.number().min(30).max(120),
  maxHeartRate: z.number().min(120).max(220),
  stressThreshold: z.number().min(0).max(100),
  fatigueIndicators: z.object({
    heartRateVariabilityThreshold: z.number(),
    activityLevelThreshold: z.number(),
    sleepQualityThreshold: z.number()
  }),
  sleepPattern: z.object({
    averageDuration: z.number().min(0),
    preferredBedtime: z.string(),
    preferredWakeTime: z.string(),
    qualityThreshold: z.number().min(0).max(100)
  }),
  activityLevel: z.object({
    dailyStepsGoal: z.number().min(0),
    activeMinutesGoal: z.number().min(0),
    intensityPreference: z.number().min(0).max(1)
  })
});

export const BiometricPrivacySettingsSchema = z.object({
  shareHeartRate: z.boolean(),
  shareStressLevel: z.boolean(),
  shareActivityData: z.boolean(),
  shareSleepData: z.boolean(),
  allowTeamAggregation: z.boolean(),
  anonymizeInReports: z.boolean()
});

export const MedicalConsiderationsSchema = z.object({
  hasHeartCondition: z.boolean(),
  takesStressmedication: z.boolean(),
  hasChronicConditions: z.array(z.string()),
  physicalLimitations: z.array(z.string()),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string()
  }).optional()
});

export const BiometricProfileSchema = z.object({
  userId: z.string().uuid(),
  connectedDevices: z.array(ConnectedDeviceSchema),
  baselineMetrics: BaselineMetricsSchema,
  privacySettings: BiometricPrivacySettingsSchema,
  medicalConsiderations: MedicalConsiderationsSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Wellness Intelligence Schemas
export const RiskFactorSchema = z.object({
  type: z.string(),
  severity: z.nativeEnum(WellnessRiskLevel),
  description: z.string(),
  contributingMetrics: z.array(z.string()),
  lastDetected: z.date()
});

export const WellnessGoalSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  deadline: z.date().optional(),
  priority: z.number().min(1).max(5)
});

export const InterventionPreferencesSchema = z.object({
  preferredTypes: z.array(z.nativeEnum(InterventionType)),
  preferredDeliveryMethods: z.array(z.nativeEnum(DeliveryMethod)),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string()
  }),
  maxInterventionsPerHour: z.number().min(0).max(10),
  emergencyContactEnabled: z.boolean()
});

export const ComplianceSettingsSchema = z.object({
  hipaaCompliant: z.boolean(),
  gdprCompliant: z.boolean(),
  auditTrailEnabled: z.boolean(),
  dataRetentionDays: z.number().min(30).max(2555),
  anonymizationLevel: z.enum(['none', 'partial', 'full'])
});

export const WellnessSnapshotSchema = z.object({
  timestamp: z.date(),
  overallScore: z.number().min(0).max(100),
  dimensions: z.object({
    physical: z.number().min(0).max(100),
    mental: z.number().min(0).max(100),
    emotional: z.number().min(0).max(100),
    social: z.number().min(0).max(100),
    productivity: z.number().min(0).max(100)
  }),
  riskIndicators: z.array(RiskFactorSchema),
  interventionsActive: z.array(z.string())
});

export const WellnessProfileSchema = z.object({
  userId: z.string().uuid(),
  wellnessGoals: z.array(WellnessGoalSchema),
  riskFactors: z.array(RiskFactorSchema),
  interventionPreferences: InterventionPreferencesSchema,
  wellnessHistory: z.array(WellnessSnapshotSchema),
  complianceSettings: ComplianceSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// Intervention Schemas
export const InterventionTimingSchema = z.object({
  scheduledTime: z.date().optional(),
  triggerConditions: z.array(z.string()),
  repeatInterval: z.number().optional(), // minutes
  maxRepeats: z.number().optional()
});

export const PersonalizationSettingsSchema = z.object({
  userPreferences: z.record(z.string(), z.any()),
  adaptationLevel: z.number().min(0).max(1),
  learningEnabled: z.boolean(),
  customContent: z.string().optional()
});

export const InterventionPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.nativeEnum(InterventionType),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  timing: InterventionTimingSchema,
  personalization: PersonalizationSettingsSchema,
  duration: z.number().min(0), // seconds
  content: z.object({
    title: z.string(),
    description: z.string(),
    instructions: z.array(z.string()),
    mediaUrl: z.string().optional()
  }),
  priority: z.number().min(1).max(5),
  createdAt: z.date()
});

export const InterventionOutcomeSchema = z.object({
  interventionId: z.string().uuid(),
  userId: z.string().uuid(),
  completed: z.boolean(),
  effectiveness: z.number().min(0).max(5),
  feedback: z.string().optional(),
  biometricImpact: z.object({
    stressReduction: z.number().optional(),
    heartRateChange: z.number().optional(),
    activityIncrease: z.number().optional()
  }).optional(),
  timestamp: z.date()
});

export const DeliveryResultSchema = z.object({
  success: z.boolean(),
  deliveredAt: z.date(),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  userResponse: z.enum(['accepted', 'dismissed', 'snoozed']).optional(),
  error: z.string().optional()
});

export const EmergencyResponseSchema = z.object({
  interventionId: z.string().uuid(),
  severity: z.nativeEnum(EmergencySeverity),
  triggeredAt: z.date(),
  actions: z.array(z.string()),
  contactsNotified: z.array(z.string()),
  resolved: z.boolean(),
  resolvedAt: z.date().optional()
});

// ============================================================================
// ADDITIONAL WELLNESS TYPES
// ============================================================================

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

export interface StressMetrics {
  currentLevel: number; // 0-100
  trend: 'increasing' | 'decreasing' | 'stable';
  contributingFactors: string[];
  recommendations: string[];
  confidence: number;
}

export interface FatigueIndicators {
  fatigueLevel: number; // 0-100
  indicators: {
    heartRateVariability: number;
    activityLevel: number;
    sleepQuality: number;
    typingPatterns?: number;
  };
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WellnessScore {
  overallScore: number; // 0-100
  components: {
    physical: number;
    mental: number;
    stress: number;
    recovery: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: Date;
}

export interface HRVAnalysis {
  rmssd: number; // Root Mean Square of Successive Differences
  pnn50: number; // Percentage of successive RR intervals that differ by more than 50ms
  stressIndex: number;
  recoveryStatus: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

// ============================================================================
// TYPESCRIPT INTERFACES (derived from Zod schemas)
// ============================================================================

export type DeviceCredentials = z.infer<typeof DeviceCredentialsSchema>;
export type ConnectedDevice = z.infer<typeof ConnectedDeviceSchema>;
export type ConnectionResult = z.infer<typeof ConnectionResultSchema>;

export type HeartRateReading = z.infer<typeof HeartRateReadingSchema>;
export type StressReading = z.infer<typeof StressReadingSchema>;
export type ActivityReading = z.infer<typeof ActivityReadingSchema>;
export type SleepReading = z.infer<typeof SleepReadingSchema>;
export type EnvironmentReading = z.infer<typeof EnvironmentReadingSchema>;
export type DataQuality = z.infer<typeof DataQualitySchema>;
export type BiometricReading = z.infer<typeof BiometricReadingSchema>;

export type BaselineMetrics = z.infer<typeof BaselineMetricsSchema>;
export type BiometricPrivacySettings = z.infer<typeof BiometricPrivacySettingsSchema>;
export type MedicalConsiderations = z.infer<typeof MedicalConsiderationsSchema>;
export type BiometricProfile = z.infer<typeof BiometricProfileSchema>;

export type RiskFactor = z.infer<typeof RiskFactorSchema>;
export type WellnessGoal = z.infer<typeof WellnessGoalSchema>;
export type InterventionPreferences = z.infer<typeof InterventionPreferencesSchema>;
export type ComplianceSettings = z.infer<typeof ComplianceSettingsSchema>;
export type WellnessSnapshot = z.infer<typeof WellnessSnapshotSchema>;
export type WellnessProfile = z.infer<typeof WellnessProfileSchema>;

export type InterventionTiming = z.infer<typeof InterventionTimingSchema>;
export type PersonalizationSettings = z.infer<typeof PersonalizationSettingsSchema>;
export type InterventionPlan = z.infer<typeof InterventionPlanSchema>;
export type InterventionOutcome = z.infer<typeof InterventionOutcomeSchema>;
export type DeliveryResult = z.infer<typeof DeliveryResultSchema>;
export type EmergencyResponse = z.infer<typeof EmergencyResponseSchema>;



// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateBiometricReading = (data: unknown): BiometricReading => BiometricReadingSchema.parse(data);
export const validateBiometricProfile = (data: unknown): BiometricProfile => BiometricProfileSchema.parse(data);
export const validateWellnessProfile = (data: unknown): WellnessProfile => WellnessProfileSchema.parse(data);
export const validateInterventionPlan = (data: unknown): InterventionPlan => InterventionPlanSchema.parse(data);


// Safe validation functions
export const safeValidateBiometricReading = (data: unknown) => BiometricReadingSchema.safeParse(data);
export const safeValidateBiometricProfile = (data: unknown) => BiometricProfileSchema.safeParse(data);
export const safeValidateWellnessProfile = (data: unknown) => WellnessProfileSchema.safeParse(data);
export const safeValidateInterventionPlan = (data: unknown) => InterventionPlanSchema.safeParse(data);


// ============================================================================
// UTILITY TYPES AND FUNCTIONS
// ============================================================================

export type CreateBiometricProfileInput = Omit<BiometricProfile, 'createdAt' | 'updatedAt'>;
export type UpdateBiometricProfileInput = Partial<Omit<BiometricProfile, 'userId' | 'createdAt' | 'updatedAt'>>;
export type CreateWellnessProfileInput = Omit<WellnessProfile, 'createdAt' | 'updatedAt'>;
export type UpdateWellnessProfileInput = Partial<Omit<WellnessProfile, 'userId' | 'createdAt' | 'updatedAt'>>;

// Helper function to create default biometric privacy settings
export const createDefaultBiometricPrivacySettings = (): BiometricPrivacySettings => ({
  shareHeartRate: false,
  shareStressLevel: false,
  shareActivityData: true,
  shareSleepData: false,
  allowTeamAggregation: true,
  anonymizeInReports: true
});

// Helper function to create default intervention preferences
export const createDefaultInterventionPreferences = (): InterventionPreferences => ({
  preferredTypes: [InterventionType.BREAK_REMINDER, InterventionType.HYDRATION_REMINDER],
  preferredDeliveryMethods: [DeliveryMethod.VISUAL],
  quietHours: {
    enabled: true,
    startTime: '18:00',
    endTime: '09:00'
  },
  maxInterventionsPerHour: 3,
  emergencyContactEnabled: false
});

