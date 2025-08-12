import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface BiometricData {
  userId: string;
  timestamp: Date;
  heartRate?: number;
  heartRateVariability?: number;
  stressLevel?: number;
  concentration?: number;
  skinConductance?: number;
  bodyTemperature?: number;
  bloodOxygen?: number;
  sleepQuality?: number;
  activityLevel?: number;
  source: string;
  confidence: number;
}

export interface WellnessMetrics {
  overallWellness: number;
  stressLevel: number;
  fatigueLevel: number;
  focusCapacity: number;
  recommendedActions: WellnessAction[];
  riskFactors: string[];
}

export interface WellnessAction {
  type: 'break' | 'exercise' | 'hydration' | 'posture' | 'environment';
  priority: 'low' | 'medium' | 'high';
  description: string;
  duration: number; // minutes
  benefits: string[];
}

export interface DeviceIntegration {
  deviceType: string;
  deviceId: string;
  isConnected: boolean;
  lastSync: Date | null;
  supportedMetrics: string[];
  batteryLevel?: number;
}

export class BiometricDataCollector extends EventEmitter {
  private logger: Logger;
  private connectedDevices: Map<string, DeviceIntegration> = new Map();
  private dataBuffer: BiometricData[] = [];
  private consentGiven: Map<string, boolean> = new Map();
  private privacySettings: Map<string, any> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize device connections
      await this.initializeDeviceConnections();
      
      // Set up data collection intervals
      this.startDataCollection();
      
      this.logger.info('BiometricDataCollector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize BiometricDataCollector:', error);
      throw error;
    }
  }

  private async initializeDeviceConnections(): Promise<void> {
    // Fitness tracker integration (simulated)
    await this.connectFitnessTracker();
    
    // Smartwatch integration (simulated)
    await this.connectSmartwatch();
    
    // Camera-based heart rate detection
    await this.initializeCameraHeartRate();
    
    // Keyboard/mouse pattern analysis for stress detection
    this.initializeInputPatternAnalysis();
  }

  private async connectFitnessTracker(): Promise<void> {
    // Simulate fitness tracker connection
    const device: DeviceIntegration = {
      deviceType: 'fitness_tracker',
      deviceId: 'fitbit_001',
      isConnected: true,
      lastSync: new Date(),
      supportedMetrics: ['heartRate', 'stressLevel', 'sleepQuality', 'activityLevel'],
      batteryLevel: 85
    };
    
    this.connectedDevices.set(device.deviceId, device);
    this.emit('deviceConnected', device);
  }

  private async connectSmartwatch(): Promise<void> {
    // Simulate smartwatch connection
    const device: DeviceIntegration = {
      deviceType: 'smartwatch',
      deviceId: 'apple_watch_001',
      isConnected: true,
      lastSync: new Date(),
      supportedMetrics: ['heartRate', 'heartRateVariability', 'bloodOxygen', 'bodyTemperature'],
      batteryLevel: 72
    };
    
    this.connectedDevices.set(device.deviceId, device);
    this.emit('deviceConnected', device);
  }

  private async initializeCameraHeartRate(): Promise<void> {
    try {
      // Request camera access for heart rate detection
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      const device: DeviceIntegration = {
        deviceType: 'camera_hr',
        deviceId: 'camera_001',
        isConnected: true,
        lastSync: new Date(),
        supportedMetrics: ['heartRate', 'stressLevel'],
        batteryLevel: 100
      };
      
      this.connectedDevices.set(device.deviceId, device);
      this.startCameraHeartRateDetection(stream);
      
    } catch (error) {
      this.logger.warn('Camera heart rate detection not available:', error);
    }
  }

  private startCameraHeartRateDetection(stream: MediaStream): void {
    // Simplified camera-based heart rate detection
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of detection
        const heartRate = 60 + Math.random() * 40; // 60-100 BPM
        const stressLevel = Math.random() * 100;
        
        this.collectBiometricData({
          userId: 'current_user',
          timestamp: new Date(),
          heartRate,
          stressLevel,
          source: 'camera_hr',
          confidence: 0.7
        });
      }
    }, 10000); // Every 10 seconds
  }

  private initializeInputPatternAnalysis(): void {
    let keystrokes: number[] = [];
    let mouseMovements: Array<{x: number, y: number, time: number}> = [];
    
    document.addEventListener('keydown', (event) => {
      keystrokes.push(Date.now());
      
      // Keep only recent keystrokes (last 60 seconds)
      const cutoff = Date.now() - 60000;
      keystrokes = keystrokes.filter(time => time > cutoff);
      
      // Analyze typing patterns every 30 keystrokes
      if (keystrokes.length >= 30) {
        const stressLevel = this.analyzeTypingStress(keystrokes);
        const concentration = this.analyzeTypingConcentration(keystrokes);
        
        this.collectBiometricData({
          userId: 'current_user',
          timestamp: new Date(),
          stressLevel,
          concentration,
          source: 'typing_analysis',
          confidence: 0.6
        });
      }
    });
    
    document.addEventListener('mousemove', (event) => {
      mouseMovements.push({
        x: event.clientX,
        y: event.clientY,
        time: Date.now()
      });
      
      // Keep only recent movements (last 30 seconds)
      const cutoff = Date.now() - 30000;
      mouseMovements = mouseMovements.filter(move => move.time > cutoff);
      
      // Analyze mouse patterns every 100 movements
      if (mouseMovements.length >= 100) {
        const stressLevel = this.analyzeMouseStress(mouseMovements);
        
        this.collectBiometricData({
          userId: 'current_user',
          timestamp: new Date(),
          stressLevel,
          source: 'mouse_analysis',
          confidence: 0.5
        });
        
        // Reset to prevent constant analysis
        mouseMovements = mouseMovements.slice(-50);
      }
    });
  }

  private analyzeTypingStress(keystrokes: number[]): number {
    // Calculate typing rhythm irregularity as stress indicator
    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i] - keystrokes[i - 1]);
    }
    
    if (intervals.length < 5) return 50; // Default
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher variance indicates more stress
    const stressLevel = Math.min(100, (stdDev / avgInterval) * 100);
    return stressLevel;
  }

  private analyzeTypingConcentration(keystrokes: number[]): number {
    // Steady typing rhythm indicates better concentration
    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i] - keystrokes[i - 1]);
    }
    
    if (intervals.length < 5) return 50; // Default
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    // Lower variance indicates better concentration
    const concentration = Math.max(0, 100 - (Math.sqrt(variance) / avgInterval) * 50);
    return concentration;
  }

  private analyzeMouseStress(movements: Array<{x: number, y: number, time: number}>): number {
    // Erratic mouse movements can indicate stress
    let totalDistance = 0;
    let directionChanges = 0;
    let lastDirection = 0;
    
    for (let i = 1; i < movements.length; i++) {
      const deltaX = movements[i].x - movements[i - 1].x;
      const deltaY = movements[i].y - movements[i - 1].y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      totalDistance += distance;
      
      if (distance > 5) {
        const direction = Math.atan2(deltaY, deltaX);
        if (lastDirection !== 0 && Math.abs(direction - lastDirection) > Math.PI / 4) {
          directionChanges++;
        }
        lastDirection = direction;
      }
    }
    
    const timeSpan = movements[movements.length - 1].time - movements[0].time;
    const velocity = totalDistance / timeSpan;
    const changeRate = directionChanges / movements.length;
    
    // Higher velocity and more direction changes indicate stress
    const stressLevel = Math.min(100, (velocity * 0.1 + changeRate * 100) * 50);
    return stressLevel;
  }

  private startDataCollection(): void {
    // Simulate periodic data collection from connected devices
    setInterval(() => {
      this.collectFromConnectedDevices();
    }, 30000); // Every 30 seconds
    
    // Process collected data periodically
    setInterval(() => {
      this.processDataBuffer();
    }, 60000); // Every minute
  }

  private collectFromConnectedDevices(): void {
    for (const device of this.connectedDevices.values()) {
      if (device.isConnected) {
        this.simulateDeviceData(device);
      }
    }
  }

  private simulateDeviceData(device: DeviceIntegration): void {
    const data: Partial<BiometricData> = {
      userId: 'current_user',
      timestamp: new Date(),
      source: device.deviceId,
      confidence: 0.8
    };
    
    // Generate realistic biometric data based on device capabilities
    if (device.supportedMetrics.includes('heartRate')) {
      data.heartRate = 60 + Math.random() * 40 + Math.sin(Date.now() / 10000) * 10;
    }
    
    if (device.supportedMetrics.includes('heartRateVariability')) {
      data.heartRateVariability = 20 + Math.random() * 60;
    }
    
    if (device.supportedMetrics.includes('stressLevel')) {
      data.stressLevel = Math.random() * 100;
    }
    
    if (device.supportedMetrics.includes('bloodOxygen')) {
      data.bloodOxygen = 95 + Math.random() * 5;
    }
    
    if (device.supportedMetrics.includes('bodyTemperature')) {
      data.bodyTemperature = 36.5 + Math.random() * 1.5;
    }
    
    if (device.supportedMetrics.includes('sleepQuality')) {
      data.sleepQuality = 60 + Math.random() * 40;
    }
    
    if (device.supportedMetrics.includes('activityLevel')) {
      data.activityLevel = Math.random() * 100;
    }
    
    this.collectBiometricData(data as BiometricData);
  }

  collectBiometricData(data: BiometricData): void {
    // Check consent
    if (!this.consentGiven.get(data.userId)) {
      this.logger.warn(`No consent given for biometric data collection for user ${data.userId}`);
      return;
    }
    
    // Apply privacy settings
    const filteredData = this.applyPrivacyFilters(data);
    
    // Add to buffer
    this.dataBuffer.push(filteredData);
    
    // Keep buffer manageable
    if (this.dataBuffer.length > 1000) {
      this.dataBuffer = this.dataBuffer.slice(-1000);
    }
    
    // Emit data event
    this.emit('biometricData', filteredData);
    
    this.logger.debug(`Collected biometric data from ${data.source}`);
  }

  private applyPrivacyFilters(data: BiometricData): BiometricData {
    const settings = this.privacySettings.get(data.userId) || {};
    const filtered = { ...data };
    
    // Apply data minimization
    if (!settings.allowHeartRate) delete filtered.heartRate;
    if (!settings.allowStressLevel) delete filtered.stressLevel;
    if (!settings.allowSleepData) delete filtered.sleepQuality;
    
    // Apply data anonymization if requested
    if (settings.anonymize) {
      filtered.userId = 'anonymous';
    }
    
    return filtered;
  }

  private processDataBuffer(): void {
    if (this.dataBuffer.length === 0) return;
    
    try {
      // Group data by user
      const userGroups = this.groupDataByUser(this.dataBuffer);
      
      for (const [userId, userData] of userGroups) {
        const metrics = this.calculateWellnessMetrics(userData);
        this.emit('wellnessMetrics', { userId, metrics });
      }
      
    } catch (error) {
      this.logger.error('Failed to process biometric data buffer:', error);
    }
  }

  private groupDataByUser(data: BiometricData[]): Map<string, BiometricData[]> {
    const groups = new Map<string, BiometricData[]>();
    
    for (const item of data) {
      if (!groups.has(item.userId)) {
        groups.set(item.userId, []);
      }
      groups.get(item.userId)!.push(item);
    }
    
    return groups;
  }

  calculateWellnessMetrics(data: BiometricData[]): WellnessMetrics {
    if (data.length === 0) {
      return {
        overallWellness: 50,
        stressLevel: 50,
        fatigueLevel: 50,
        focusCapacity: 50,
        recommendedActions: [],
        riskFactors: []
      };
    }
    
    // Calculate averages
    const avgHeartRate = this.calculateAverage(data, 'heartRate');
    const avgStressLevel = this.calculateAverage(data, 'stressLevel');
    const avgConcentration = this.calculateAverage(data, 'concentration');
    const avgSleepQuality = this.calculateAverage(data, 'sleepQuality');
    
    // Calculate wellness scores
    const stressLevel = avgStressLevel || 50;
    const fatigueLevel = this.calculateFatigueLevel(avgHeartRate, avgSleepQuality);
    const focusCapacity = avgConcentration || 50;
    const overallWellness = this.calculateOverallWellness(stressLevel, fatigueLevel, focusCapacity);
    
    // Generate recommendations
    const recommendedActions = this.generateWellnessRecommendations(stressLevel, fatigueLevel, focusCapacity);
    const riskFactors = this.identifyRiskFactors(data);
    
    return {
      overallWellness,
      stressLevel,
      fatigueLevel,
      focusCapacity,
      recommendedActions,
      riskFactors
    };
  }

  private calculateAverage(data: BiometricData[], field: keyof BiometricData): number | null {
    const values = data.map(d => d[field]).filter(v => typeof v === 'number') as number[];
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
  }

  private calculateFatigueLevel(heartRate: number | null, sleepQuality: number | null): number {
    let fatigue = 50; // Base level
    
    if (heartRate) {
      // Higher resting heart rate can indicate fatigue
      if (heartRate > 80) fatigue += (heartRate - 80) * 0.5;
      if (heartRate < 60) fatigue -= (60 - heartRate) * 0.3;
    }
    
    if (sleepQuality) {
      // Poor sleep quality increases fatigue
      fatigue += (100 - sleepQuality) * 0.3;
    }
    
    return Math.max(0, Math.min(100, fatigue));
  }

  private calculateOverallWellness(stress: number, fatigue: number, focus: number): number {
    // Weighted average with stress having higher impact
    return Math.round((100 - stress) * 0.4 + (100 - fatigue) * 0.3 + focus * 0.3);
  }

  private generateWellnessRecommendations(stress: number, fatigue: number, focus: number): WellnessAction[] {
    const actions: WellnessAction[] = [];
    
    if (stress > 70) {
      actions.push({
        type: 'break',
        priority: 'high',
        description: 'Take a 10-minute break to reduce stress levels',
        duration: 10,
        benefits: ['Reduce stress', 'Improve focus', 'Prevent burnout']
      });
    }
    
    if (fatigue > 70) {
      actions.push({
        type: 'exercise',
        priority: 'medium',
        description: 'Light stretching or walking to boost energy',
        duration: 5,
        benefits: ['Increase energy', 'Improve circulation', 'Reduce fatigue']
      });
    }
    
    if (focus < 40) {
      actions.push({
        type: 'environment',
        priority: 'medium',
        description: 'Adjust lighting and minimize distractions',
        duration: 2,
        benefits: ['Improve concentration', 'Reduce eye strain', 'Enhance productivity']
      });
    }
    
    return actions;
  }

  private identifyRiskFactors(data: BiometricData[]): string[] {
    const risks: string[] = [];
    
    const avgStress = this.calculateAverage(data, 'stressLevel');
    const avgHeartRate = this.calculateAverage(data, 'heartRate');
    
    if (avgStress && avgStress > 80) {
      risks.push('Chronic high stress levels');
    }
    
    if (avgHeartRate && avgHeartRate > 100) {
      risks.push('Elevated heart rate');
    }
    
    // Check for data consistency (gaps might indicate device issues)
    const timeGaps = this.findDataGaps(data);
    if (timeGaps.length > 3) {
      risks.push('Inconsistent biometric monitoring');
    }
    
    return risks;
  }

  private findDataGaps(data: BiometricData[]): Array<{start: Date, end: Date}> {
    const gaps = [];
    const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 1; i < sortedData.length; i++) {
      const timeDiff = sortedData[i].timestamp.getTime() - sortedData[i - 1].timestamp.getTime();
      if (timeDiff > 300000) { // 5 minute gap
        gaps.push({
          start: sortedData[i - 1].timestamp,
          end: sortedData[i].timestamp
        });
      }
    }
    
    return gaps;
  }

  // Public API methods
  async requestConsent(userId: string): Promise<boolean> {
    // In a real implementation, this would show a consent dialog
    this.consentGiven.set(userId, true);
    this.emit('consentGranted', userId);
    return true;
  }

  revokeConsent(userId: string): void {
    this.consentGiven.set(userId, false);
    // Clear existing data for this user
    this.dataBuffer = this.dataBuffer.filter(data => data.userId !== userId);
    this.emit('consentRevoked', userId);
  }

  updatePrivacySettings(userId: string, settings: any): void {
    this.privacySettings.set(userId, settings);
    this.emit('privacySettingsUpdated', { userId, settings });
  }

  getConnectedDevices(): DeviceIntegration[] {
    return Array.from(this.connectedDevices.values());
  }

  getRecentData(userId: string, minutes: number = 60): BiometricData[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.dataBuffer.filter(data => 
      data.userId === userId && data.timestamp > cutoff
    );
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.isConnected = false;
      this.emit('deviceDisconnected', device);
    }
  }

  getWellnessInsights(userId: string): any {
    const recentData = this.getRecentData(userId, 1440); // Last 24 hours
    const metrics = this.calculateWellnessMetrics(recentData);
    
    return {
      currentMetrics: metrics,
      trends: this.calculateWellnessTrends(userId),
      recommendations: metrics.recommendedActions,
      dataQuality: this.assessDataQuality(recentData)
    };
  }

  private calculateWellnessTrends(userId: string): any {
    // Calculate trends over different time periods
    const last24h = this.getRecentData(userId, 1440);
    const last7d = this.getRecentData(userId, 10080);
    
    return {
      stressTrend: this.calculateTrend(last7d, 'stressLevel'),
      focusTrend: this.calculateTrend(last7d, 'concentration'),
      heartRateTrend: this.calculateTrend(last7d, 'heartRate')
    };
  }

  private calculateTrend(data: BiometricData[], field: keyof BiometricData): 'improving' | 'stable' | 'declining' {
    if (data.length < 10) return 'stable';
    
    const values = data.map(d => d[field]).filter(v => typeof v === 'number') as number[];
    if (values.length < 10) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (Math.abs(change) < 0.05) return 'stable';
    
    // For stress, lower is better; for focus/heart rate variability, higher is better
    if (field === 'stressLevel') {
      return change < 0 ? 'improving' : 'declining';
    } else {
      return change > 0 ? 'improving' : 'declining';
    }
  }

  private assessDataQuality(data: BiometricData[]): any {
    const gaps = this.findDataGaps(data);
    const sources = new Set(data.map(d => d.source));
    const avgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / data.length;
    
    return {
      completeness: Math.max(0, 100 - gaps.length * 10),
      diversity: sources.size,
      reliability: Math.round(avgConfidence * 100),
      dataPoints: data.length
    };
  }
}