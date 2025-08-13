import { Observable } from 'rxjs';
import {
  BiometricReading,
  BiometricProfile,
  ConnectedDevice,
  DeviceCredentials,
  ConnectionResult,
  DeviceType,
  BiometricDataType,
  HeartRateReading,
  StressReading,
  ActivityReading,
  SleepReading
} from '@devflow/shared-types';

// ============================================================================
// BIOMETRIC SERVICE INTERFACES
// ============================================================================

export interface BiometricService {
  // Device Management
  connectDevice(userId: string, deviceType: DeviceType, credentials: DeviceCredentials): Promise<ConnectionResult>;
  disconnectDevice(userId: string, deviceId: string): Promise<void>;
  getConnectedDevices(userId: string): Promise<ConnectedDevice[]>;
  syncDeviceData(userId: string, deviceId: string): Promise<void>;
  
  // Data Collection
  collectBiometricData(userId: string, timeRange: TimeRange): Promise<BiometricReading[]>;
  streamBiometricData(userId: string): Observable<BiometricReading>;
  getBiometricProfile(userId: string): Promise<BiometricProfile>;
  updateBiometricProfile(userId: string, profile: Partial<BiometricProfile>): Promise<BiometricProfile>;
  
  // Health Metrics
  calculateStressLevel(userId: string): Promise<StressMetrics>;
  detectFatigue(userId: string): Promise<FatigueIndicators>;
  assessWellnessScore(userId: string): Promise<WellnessScore>;
  analyzeHeartRateVariability(userId: string): Promise<HRVAnalysis>;
}

export interface DeviceIntegrationManager {
  // Device-specific integrations
  connectAppleHealthKit(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult>;
  connectFitbit(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult>;
  connectGarmin(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult>;
  
  // Generic device management
  validateDeviceCredentials(deviceType: DeviceType, credentials: DeviceCredentials): Promise<boolean>;
  refreshDeviceConnection(deviceId: string): Promise<ConnectionResult>;
  getDeviceCapabilities(deviceType: DeviceType): Promise<BiometricDataType[]>;
}

export interface DataValidationEngine {
  validateBiometricReading(reading: BiometricReading): Promise<ValidationResult>;
  detectOutliers(readings: BiometricReading[]): Promise<OutlierDetectionResult>;
  assessDataQuality(readings: BiometricReading[]): Promise<DataQualityAssessment>;
  interpolateMissingData(readings: BiometricReading[]): Promise<BiometricReading[]>;
}

export interface PrivacyFilter {
  applyPrivacySettings(userId: string, data: BiometricReading[]): Promise<BiometricReading[]>;
  anonymizeForTeamReporting(teamId: string, data: BiometricReading[]): Promise<AnonymizedBiometricData[]>;
  checkConsentStatus(userId: string, dataType: BiometricDataType): Promise<boolean>;
  updateConsentSettings(userId: string, settings: ConsentSettings): Promise<void>;
}

export interface RealTimeProcessor {
  processRealTimeStream(userId: string, stream: Observable<BiometricReading>): Observable<ProcessedBiometricData>;
  detectAnomalies(reading: BiometricReading, baseline: import('@devflow/shared-types').BaselineMetrics): Promise<AnomalyDetectionResult>;
  triggerWellnessAlerts(userId: string, reading: BiometricReading): Promise<void>;
  calculateRealTimeMetrics(reading: BiometricReading): Promise<RealTimeMetrics>;
}

// ============================================================================
// SUPPORTING TYPES
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
  correctedReading?: BiometricReading;
}

export interface OutlierDetectionResult {
  outliers: BiometricReading[];
  method: string;
  threshold: number;
  confidence: number;
}

export interface DataQualityAssessment {
  accuracy: number; // 0-1
  completeness: number; // 0-1
  consistency: number; // 0-1
  timeliness: number; // 0-1
  overallQuality: number; // 0-1
  issues: string[];
}

export interface AnonymizedBiometricData {
  timestamp: Date;
  aggregatedMetrics: {
    averageHeartRate?: number;
    averageStressLevel?: number;
    averageActivityLevel?: number;
  };
  participantCount: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ConsentSettings {
  dataTypes: Record<BiometricDataType, boolean>;
  sharingLevel: 'none' | 'team' | 'organization';
  retentionPeriod: number; // days
  allowResearch: boolean;
  emergencyOverride: boolean;
}

export interface ProcessedBiometricData {
  original: BiometricReading;
  processed: {
    smoothedValues: Record<string, number>;
    derivedMetrics: Record<string, number>;
    alerts: WellnessAlert[];
  };
  metadata: {
    processingTime: number;
    algorithms: string[];
    confidence: number;
  };
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType: 'spike' | 'drop' | 'pattern_break' | 'missing_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
}

export interface RealTimeMetrics {
  instantaneousMetrics: {
    heartRate?: number;
    stressLevel?: number;
    activityIntensity?: number;
  };
  trendMetrics: {
    heartRateTrend: 'increasing' | 'decreasing' | 'stable';
    stressTrend: 'increasing' | 'decreasing' | 'stable';
    activityTrend: 'increasing' | 'decreasing' | 'stable';
  };
  alerts: WellnessAlert[];
}

export interface WellnessAlert {
  id: string;
  userId: string;
  type: 'stress_spike' | 'fatigue_detected' | 'heart_rate_anomaly' | 'inactivity_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  data: Record<string, any>;
  acknowledged: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BiometricServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public userId?: string,
    public deviceId?: string
  ) {
    super(message);
    this.name = 'BiometricServiceError';
  }
}

export class DeviceConnectionError extends BiometricServiceError {
  constructor(message: string, deviceId: string, userId?: string) {
    super(message, 'DEVICE_CONNECTION_ERROR', userId, deviceId);
    this.name = 'DeviceConnectionError';
  }
}

export class DataValidationError extends BiometricServiceError {
  constructor(message: string, userId?: string) {
    super(message, 'DATA_VALIDATION_ERROR', userId);
    this.name = 'DataValidationError';
  }
}

export class PrivacyViolationError extends BiometricServiceError {
  constructor(message: string, userId: string) {
    super(message, 'PRIVACY_VIOLATION_ERROR', userId);
    this.name = 'PrivacyViolationError';
  }
}