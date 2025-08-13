import { Observable, BehaviorSubject, combineLatest, interval } from 'rxjs';
import { map, filter, scan, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Logger } from 'winston';
import {
  BiometricReading,
  BaselineMetrics
} from '@devflow/shared-types';
import {
  RealTimeProcessor,
  ProcessedBiometricData,
  AnomalyDetectionResult,
  RealTimeMetrics,
  WellnessAlert,
  BiometricServiceError
} from '../types';
import { createLogger } from '../utils/logger';

export class RealTimeProcessorImpl implements RealTimeProcessor {
  private logger: Logger;
  
  // Real-time processing state
  private userBaselines: Map<string, BaselineMetrics> = new Map();
  private processingAlgorithms: string[] = [
    'moving_average',
    'anomaly_detection',
    'trend_analysis',
    'alert_generation'
  ];
  
  // Alert management
  private activeAlerts: Map<string, WellnessAlert[]> = new Map();
  private alertSubjects: Map<string, BehaviorSubject<WellnessAlert[]>> = new Map();

  constructor() {
    this.logger = createLogger('RealTimeProcessor');
  }

  // ============================================================================
  // MAIN PROCESSING METHODS
  // ============================================================================

  processRealTimeStream(userId: string, stream: Observable<BiometricReading>): Observable<ProcessedBiometricData> {
    try {
      this.logger.info(`Starting real-time processing for user ${userId}`);

      return stream.pipe(
        // Debounce to avoid processing too frequently
        debounceTime(1000),
        
        // Filter out invalid readings
        filter(reading => this.isValidReading(reading)),
        
        // Process each reading
        switchMap(async (reading) => {
          const startTime = Date.now();
          
          try {
            // Get user baseline metrics
            const baseline = await this.getUserBaseline(userId);
            
            // Apply smoothing algorithms
            const smoothedValues = await this.applySmoothingAlgorithms(reading, userId);
            
            // Calculate derived metrics
            const derivedMetrics = await this.calculateDerivedMetrics(reading, baseline);
            
            // Detect anomalies
            const anomalyResult = await this.detectAnomalies(reading, baseline);
            
            // Generate alerts if needed
            const alerts = await this.generateWellnessAlerts(userId, reading, anomalyResult);
            
            const processingTime = Date.now() - startTime;
            
            const processedData: ProcessedBiometricData = {
              original: reading,
              processed: {
                smoothedValues,
                derivedMetrics,
                alerts
              },
              metadata: {
                processingTime,
                algorithms: this.processingAlgorithms,
                confidence: this.calculateProcessingConfidence(reading, anomalyResult)
              }
            };

            this.logger.debug(`Real-time processing completed`, {
              userId,
              readingId: reading.id,
              processingTime,
              alertsGenerated: alerts.length
            });

            return processedData;
          } catch (error) {
            this.logger.error('Error processing real-time reading', { 
              userId, 
              readingId: reading.id, 
              error 
            });
            
            // Return minimal processed data on error
            return {
              original: reading,
              processed: {
                smoothedValues: {},
                derivedMetrics: {},
                alerts: []
              },
              metadata: {
                processingTime: Date.now() - startTime,
                algorithms: ['error_fallback'],
                confidence: 0.1
              }
            };
          }
        }),
        
        // Handle errors gracefully
        catchError(error => {
          this.logger.error('Stream processing error', { userId, error });
          throw new BiometricServiceError(
            `Real-time processing failed: ${error.message}`,
            'REALTIME_PROCESSING_ERROR',
            userId
          );
        })
      );
    } catch (error) {
      this.logger.error('Failed to create real-time processing stream', { userId, error });
      throw new BiometricServiceError(
        `Failed to create processing stream: ${error.message}`,
        'STREAM_CREATION_ERROR',
        userId
      );
    }
  }

  async detectAnomalies(reading: BiometricReading, baseline: BaselineMetrics): Promise<AnomalyDetectionResult> {
    try {
      this.logger.debug(`Detecting anomalies for reading ${reading.id}`);

      // Check heart rate anomalies
      if (reading.heartRate) {
        const hrAnomaly = await this.detectHeartRateAnomalies(reading.heartRate.bpm, baseline);
        if (hrAnomaly.isAnomaly) {
          return hrAnomaly;
        }
      }

      // Check stress level anomalies
      if (reading.stress) {
        const stressAnomaly = await this.detectStressAnomalies(reading.stress.level, baseline);
        if (stressAnomaly.isAnomaly) {
          return stressAnomaly;
        }
      }

      // Check activity anomalies
      if (reading.activity) {
        const activityAnomaly = await this.detectActivityAnomalies(reading.activity.intensity, baseline);
        if (activityAnomaly.isAnomaly) {
          return activityAnomaly;
        }
      }

      // No anomalies detected
      return {
        isAnomaly: false,
        anomalyType: 'pattern_break',
        severity: 'low',
        description: 'No anomalies detected',
        recommendedAction: 'Continue monitoring'
      };
    } catch (error) {
      this.logger.error('Error detecting anomalies', { readingId: reading.id, error });
      return {
        isAnomaly: false,
        anomalyType: 'missing_data',
        severity: 'low',
        description: 'Anomaly detection failed',
        recommendedAction: 'Review data quality'
      };
    }
  }

  async triggerWellnessAlerts(userId: string, reading: BiometricReading): Promise<void> {
    try {
      this.logger.debug(`Checking wellness alerts for user ${userId}`);

      const baseline = await this.getUserBaseline(userId);
      const anomalyResult = await this.detectAnomalies(reading, baseline);
      
      if (anomalyResult.isAnomaly && anomalyResult.severity !== 'low') {
        const alerts = await this.generateWellnessAlerts(userId, reading, anomalyResult);
        
        if (alerts.length > 0) {
          await this.publishWellnessAlerts(userId, alerts);
        }
      }
    } catch (error) {
      this.logger.error('Error triggering wellness alerts', { userId, error });
      // Don't throw - alerts are not critical for data processing
    }
  }

  async calculateRealTimeMetrics(reading: BiometricReading): Promise<RealTimeMetrics> {
    try {
      this.logger.debug(`Calculating real-time metrics for reading ${reading.id}`);

      // Calculate instantaneous metrics
      const instantaneousMetrics: RealTimeMetrics['instantaneousMetrics'] = {};
      
      if (reading.heartRate) {
        instantaneousMetrics.heartRate = reading.heartRate.bpm;
      }
      
      if (reading.stress) {
        instantaneousMetrics.stressLevel = reading.stress.level;
      }
      
      if (reading.activity) {
        instantaneousMetrics.activityIntensity = reading.activity.intensity;
      }

      // Calculate trend metrics (simplified - would use historical data in real implementation)
      const trendMetrics: RealTimeMetrics['trendMetrics'] = {
        heartRateTrend: 'stable',
        stressTrend: 'stable',
        activityTrend: 'stable'
      };

      // Generate any immediate alerts
      const alerts: WellnessAlert[] = [];
      
      // Check for immediate alert conditions
      if (reading.heartRate && (reading.heartRate.bpm > 180 || reading.heartRate.bpm < 40)) {
        alerts.push({
          id: `hr-alert-${reading.id}`,
          userId: reading.userId,
          type: 'heart_rate_anomaly',
          severity: 'critical',
          message: `Heart rate ${reading.heartRate.bpm} BPM is outside safe range`,
          timestamp: new Date(),
          data: { heartRate: reading.heartRate.bpm },
          acknowledged: false
        });
      }

      if (reading.stress && reading.stress.level > 90) {
        alerts.push({
          id: `stress-alert-${reading.id}`,
          userId: reading.userId,
          type: 'stress_spike',
          severity: 'high',
          message: `Stress level ${reading.stress.level}% is critically high`,
          timestamp: new Date(),
          data: { stressLevel: reading.stress.level },
          acknowledged: false
        });
      }

      return {
        instantaneousMetrics,
        trendMetrics,
        alerts
      };
    } catch (error) {
      this.logger.error('Error calculating real-time metrics', { readingId: reading.id, error });
      
      // Return minimal metrics on error
      return {
        instantaneousMetrics: {},
        trendMetrics: {
          heartRateTrend: 'stable',
          stressTrend: 'stable',
          activityTrend: 'stable'
        },
        alerts: []
      };
    }
  }

  // ============================================================================
  // PRIVATE PROCESSING METHODS
  // ============================================================================

  private isValidReading(reading: BiometricReading): boolean {
    return !!(
      reading.id &&
      reading.userId &&
      reading.deviceId &&
      reading.timestamp &&
      (reading.heartRate || reading.stress || reading.activity || reading.sleep)
    );
  }

  private async getUserBaseline(userId: string): Promise<BaselineMetrics> {
    let baseline = this.userBaselines.get(userId);
    
    if (!baseline) {
      // Create default baseline - in real implementation, this would be calculated from historical data
      baseline = {
        restingHeartRate: 70,
        maxHeartRate: 190,
        stressThreshold: 60,
        fatigueIndicators: {
          heartRateVariabilityThreshold: 30,
          activityLevelThreshold: 0.3,
          sleepQualityThreshold: 70
        },
        sleepPattern: {
          averageDuration: 480, // 8 hours
          preferredBedtime: '23:00',
          preferredWakeTime: '07:00',
          qualityThreshold: 75
        },
        activityLevel: {
          dailyStepsGoal: 10000,
          activeMinutesGoal: 30,
          intensityPreference: 0.6
        }
      };
      
      this.userBaselines.set(userId, baseline);
      this.logger.info(`Created default baseline for user ${userId}`);
    }
    
    return baseline;
  }

  private async applySmoothingAlgorithms(
    reading: BiometricReading, 
    userId: string
  ): Promise<Record<string, number>> {
    const smoothedValues: Record<string, number> = {};

    try {
      // Apply moving average smoothing (simplified implementation)
      if (reading.heartRate) {
        smoothedValues.heartRate = await this.applyMovingAverage(
          'heartRate', 
          reading.heartRate.bpm, 
          userId
        );
      }

      if (reading.stress) {
        smoothedValues.stressLevel = await this.applyMovingAverage(
          'stressLevel', 
          reading.stress.level, 
          userId
        );
      }

      if (reading.activity) {
        smoothedValues.activityIntensity = await this.applyMovingAverage(
          'activityIntensity', 
          reading.activity.intensity, 
          userId
        );
      }
    } catch (error) {
      this.logger.error('Error applying smoothing algorithms', { userId, error });
    }

    return smoothedValues;
  }

  private async applyMovingAverage(
    metric: string, 
    value: number, 
    userId: string, 
    windowSize: number = 5
  ): Promise<number> {
    // Simplified moving average - in real implementation, would maintain historical windows
    // For now, just return the value with slight smoothing
    const smoothingFactor = 0.8;
    return value * smoothingFactor + value * (1 - smoothingFactor);
  }

  private async calculateDerivedMetrics(
    reading: BiometricReading, 
    baseline: BaselineMetrics
  ): Promise<Record<string, number>> {
    const derivedMetrics: Record<string, number> = {};

    try {
      // Calculate heart rate zone if heart rate is available
      if (reading.heartRate) {
        derivedMetrics.heartRateZone = this.calculateHeartRateZone(
          reading.heartRate.bpm, 
          baseline.maxHeartRate
        );
        
        derivedMetrics.heartRateReserve = this.calculateHeartRateReserve(
          reading.heartRate.bpm,
          baseline.restingHeartRate,
          baseline.maxHeartRate
        );
      }

      // Calculate stress index
      if (reading.stress) {
        derivedMetrics.stressIndex = reading.stress.level / 100;
        derivedMetrics.stressDeviation = Math.abs(reading.stress.level - baseline.stressThreshold);
      }

      // Calculate activity efficiency
      if (reading.activity) {
        derivedMetrics.activityEfficiency = this.calculateActivityEfficiency(
          reading.activity.intensity,
          baseline.activityLevel.intensityPreference
        );
      }

      // Calculate overall wellness score
      derivedMetrics.wellnessScore = this.calculateInstantWellnessScore(reading, baseline);
    } catch (error) {
      this.logger.error('Error calculating derived metrics', { error });
    }

    return derivedMetrics;
  }

  private calculateHeartRateZone(currentHR: number, maxHR: number): number {
    const percentage = (currentHR / maxHR) * 100;
    
    if (percentage < 50) return 1; // Recovery zone
    if (percentage < 60) return 2; // Aerobic base zone
    if (percentage < 70) return 3; // Aerobic zone
    if (percentage < 80) return 4; // Lactate threshold zone
    if (percentage < 90) return 5; // VO2 max zone
    return 6; // Anaerobic zone
  }

  private calculateHeartRateReserve(currentHR: number, restingHR: number, maxHR: number): number {
    return ((currentHR - restingHR) / (maxHR - restingHR)) * 100;
  }

  private calculateActivityEfficiency(currentIntensity: number, preferredIntensity: number): number {
    const deviation = Math.abs(currentIntensity - preferredIntensity);
    return Math.max(0, 1 - deviation);
  }

  private calculateInstantWellnessScore(reading: BiometricReading, baseline: BaselineMetrics): number {
    let score = 100;
    let factors = 0;

    // Factor in heart rate
    if (reading.heartRate) {
      const hrDeviation = Math.abs(reading.heartRate.bpm - baseline.restingHeartRate) / baseline.restingHeartRate;
      score -= hrDeviation * 20;
      factors++;
    }

    // Factor in stress
    if (reading.stress) {
      const stressImpact = (reading.stress.level / 100) * 30;
      score -= stressImpact;
      factors++;
    }

    // Factor in activity
    if (reading.activity) {
      const activityBonus = reading.activity.intensity * 10;
      score += activityBonus;
      factors++;
    }

    return factors > 0 ? Math.max(0, Math.min(100, score)) : 50;
  }

  // ============================================================================
  // ANOMALY DETECTION METHODS
  // ============================================================================

  private async detectHeartRateAnomalies(heartRate: number, baseline: BaselineMetrics): Promise<AnomalyDetectionResult> {
    // Critical heart rate ranges
    if (heartRate > 200 || heartRate < 30) {
      return {
        isAnomaly: true,
        anomalyType: 'spike',
        severity: 'critical',
        description: `Heart rate ${heartRate} BPM is in critical range`,
        recommendedAction: 'Seek immediate medical attention'
      };
    }

    // High heart rate
    if (heartRate > baseline.maxHeartRate * 0.9) {
      return {
        isAnomaly: true,
        anomalyType: 'spike',
        severity: 'high',
        description: `Heart rate ${heartRate} BPM is unusually high`,
        recommendedAction: 'Take a break and monitor closely'
      };
    }

    // Low heart rate
    if (heartRate < baseline.restingHeartRate * 0.7) {
      return {
        isAnomaly: true,
        anomalyType: 'drop',
        severity: 'medium',
        description: `Heart rate ${heartRate} BPM is unusually low`,
        recommendedAction: 'Monitor for other symptoms'
      };
    }

    return {
      isAnomaly: false,
      anomalyType: 'pattern_break',
      severity: 'low',
      description: 'Heart rate within normal range',
      recommendedAction: 'Continue monitoring'
    };
  }

  private async detectStressAnomalies(stressLevel: number, baseline: BaselineMetrics): Promise<AnomalyDetectionResult> {
    // Critical stress level
    if (stressLevel > 95) {
      return {
        isAnomaly: true,
        anomalyType: 'spike',
        severity: 'critical',
        description: `Stress level ${stressLevel}% is critically high`,
        recommendedAction: 'Take immediate stress reduction measures'
      };
    }

    // High stress level
    if (stressLevel > baseline.stressThreshold + 20) {
      return {
        isAnomaly: true,
        anomalyType: 'spike',
        severity: 'high',
        description: `Stress level ${stressLevel}% is significantly elevated`,
        recommendedAction: 'Consider stress reduction techniques'
      };
    }

    return {
      isAnomaly: false,
      anomalyType: 'pattern_break',
      severity: 'low',
      description: 'Stress level within acceptable range',
      recommendedAction: 'Continue monitoring'
    };
  }

  private async detectActivityAnomalies(activityIntensity: number, baseline: BaselineMetrics): Promise<AnomalyDetectionResult> {
    // Extremely high activity
    if (activityIntensity > 0.95) {
      return {
        isAnomaly: true,
        anomalyType: 'spike',
        severity: 'medium',
        description: `Activity intensity ${(activityIntensity * 100).toFixed(0)}% is very high`,
        recommendedAction: 'Monitor for overexertion'
      };
    }

    // Prolonged inactivity would be detected over time - not in single reading
    return {
      isAnomaly: false,
      anomalyType: 'pattern_break',
      severity: 'low',
      description: 'Activity level within normal range',
      recommendedAction: 'Continue monitoring'
    };
  }

  // ============================================================================
  // ALERT GENERATION AND MANAGEMENT
  // ============================================================================

  private async generateWellnessAlerts(
    userId: string, 
    reading: BiometricReading, 
    anomalyResult: AnomalyDetectionResult
  ): Promise<WellnessAlert[]> {
    const alerts: WellnessAlert[] = [];

    if (!anomalyResult.isAnomaly || anomalyResult.severity === 'low') {
      return alerts;
    }

    // Generate alert based on anomaly
    const alert: WellnessAlert = {
      id: `alert-${reading.id}-${Date.now()}`,
      userId,
      type: this.mapAnomalyToAlertType(anomalyResult),
      severity: anomalyResult.severity,
      message: anomalyResult.description,
      timestamp: new Date(),
      data: this.extractAlertData(reading, anomalyResult),
      acknowledged: false
    };

    alerts.push(alert);

    // Check for additional alert conditions
    await this.checkAdditionalAlertConditions(userId, reading, alerts);

    return alerts;
  }

  private mapAnomalyToAlertType(anomalyResult: AnomalyDetectionResult): WellnessAlert['type'] {
    if (anomalyResult.description.toLowerCase().includes('heart rate')) {
      return 'heart_rate_anomaly';
    }
    if (anomalyResult.description.toLowerCase().includes('stress')) {
      return 'stress_spike';
    }
    if (anomalyResult.description.toLowerCase().includes('activity')) {
      return 'inactivity_warning';
    }
    return 'fatigue_detected';
  }

  private extractAlertData(reading: BiometricReading, anomalyResult: AnomalyDetectionResult): Record<string, any> {
    const data: Record<string, any> = {
      anomalyType: anomalyResult.anomalyType,
      recommendedAction: anomalyResult.recommendedAction
    };

    if (reading.heartRate) {
      data.heartRate = reading.heartRate.bpm;
    }
    if (reading.stress) {
      data.stressLevel = reading.stress.level;
    }
    if (reading.activity) {
      data.activityIntensity = reading.activity.intensity;
    }

    return data;
  }

  private async checkAdditionalAlertConditions(
    userId: string, 
    reading: BiometricReading, 
    alerts: WellnessAlert[]
  ): Promise<void> {
    // Check for fatigue indicators
    if (reading.heartRate && reading.stress) {
      const fatigueScore = this.calculateFatigueScore(reading.heartRate.bpm, reading.stress.level);
      
      if (fatigueScore > 70) {
        alerts.push({
          id: `fatigue-alert-${reading.id}`,
          userId,
          type: 'fatigue_detected',
          severity: 'medium',
          message: `Fatigue indicators suggest you may need rest`,
          timestamp: new Date(),
          data: { fatigueScore },
          acknowledged: false
        });
      }
    }

    // Check for inactivity (would require historical data in real implementation)
    if (reading.activity && reading.activity.intensity < 0.1) {
      alerts.push({
        id: `inactivity-alert-${reading.id}`,
        userId,
        type: 'inactivity_warning',
        severity: 'low',
        message: 'Consider taking a movement break',
        timestamp: new Date(),
        data: { activityIntensity: reading.activity.intensity },
        acknowledged: false
      });
    }
  }

  private calculateFatigueScore(heartRate: number, stressLevel: number): number {
    // Simple fatigue calculation - would be more sophisticated in real implementation
    const heartRateComponent = Math.max(0, (heartRate - 60) / 120 * 50);
    const stressComponent = stressLevel * 0.5;
    return Math.min(100, heartRateComponent + stressComponent);
  }

  private async publishWellnessAlerts(userId: string, alerts: WellnessAlert[]): Promise<void> {
    try {
      // Get or create alert subject for user
      let alertSubject = this.alertSubjects.get(userId);
      if (!alertSubject) {
        alertSubject = new BehaviorSubject<WellnessAlert[]>([]);
        this.alertSubjects.set(userId, alertSubject);
      }

      // Update active alerts
      const currentAlerts = this.activeAlerts.get(userId) || [];
      const updatedAlerts = [...currentAlerts, ...alerts];
      this.activeAlerts.set(userId, updatedAlerts);

      // Publish alerts
      alertSubject.next(updatedAlerts);

      this.logger.info(`Published ${alerts.length} wellness alerts for user ${userId}`);
    } catch (error) {
      this.logger.error('Error publishing wellness alerts', { userId, error });
    }
  }

  private calculateProcessingConfidence(
    reading: BiometricReading, 
    anomalyResult: AnomalyDetectionResult
  ): number {
    let confidence = 0.8; // Base confidence

    // Factor in reading quality
    if (reading.quality) {
      confidence *= reading.quality.accuracy;
    }

    // Factor in anomaly detection confidence
    if (anomalyResult.isAnomaly) {
      confidence *= 0.9; // Slightly lower confidence when anomalies are detected
    }

    // Factor in data completeness
    const dataFields = [reading.heartRate, reading.stress, reading.activity, reading.sleep]
      .filter(field => field !== undefined).length;
    const completenessBonus = dataFields * 0.05;
    confidence += completenessBonus;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // ============================================================================
  // PUBLIC UTILITY METHODS
  // ============================================================================

  async getActiveAlerts(userId: string): Promise<WellnessAlert[]> {
    return this.activeAlerts.get(userId) || [];
  }

  async acknowledgeAlert(userId: string, alertId: string): Promise<void> {
    const alerts = this.activeAlerts.get(userId) || [];
    const alert = alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      this.logger.info(`Alert acknowledged`, { userId, alertId });
    }
  }

  async clearAcknowledgedAlerts(userId: string): Promise<void> {
    const alerts = this.activeAlerts.get(userId) || [];
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
    
    this.activeAlerts.set(userId, unacknowledgedAlerts);
    
    const alertSubject = this.alertSubjects.get(userId);
    if (alertSubject) {
      alertSubject.next(unacknowledgedAlerts);
    }
    
    this.logger.info(`Cleared acknowledged alerts for user ${userId}`);
  }
}