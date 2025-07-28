import { PrivacySettingsRepository } from '../repositories/privacy-settings-repository';
import { PrivacyRuleEngine } from './privacy-rule-engine';
import { AnonymizationService } from './anonymization-service';
import { 
  PrivacySettings, 
  PrivacyRule, 
  AnonymizationLevel, 
  PrivacyViolation,
  PrivacyLevel 
} from '../types/privacy';

export class PrivacyService {
  constructor(
    private settingsRepository: PrivacySettingsRepository,
    private ruleEngine: PrivacyRuleEngine,
    private anonymizationService: AnonymizationService
  ) {}

  async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    let settings = await this.settingsRepository.getByUserId(userId);
    if (!settings) {
      settings = await this.settingsRepository.createDefaultSettings(userId);
    }
    return settings;
  }

  async updatePrivacySettings(
    userId: string, 
    updates: Partial<PrivacySettings>
  ): Promise<PrivacySettings | null> {
    return await this.settingsRepository.updateSettings(userId, updates);
  }

  async addPrivacyRule(rule: PrivacyRule): Promise<void> {
    this.ruleEngine.addRule(rule);
  }

  async removePrivacyRule(userId: string, ruleId: string): Promise<boolean> {
    return this.ruleEngine.removeRule(userId, ruleId);
  }

  async processDataWithPrivacy(
    data: any, 
    userId: string, 
    dataType: string
  ): Promise<{
    allowed: boolean;
    processedData: any;
    appliedRules: string[];
    privacyLevel: PrivacyLevel;
  }> {
    // Get user privacy settings
    const settings = await this.getUserPrivacySettings(userId);

    // Check if data collection is allowed for this type
    if (!this.isDataCollectionAllowed(settings, dataType)) {
      return {
        allowed: false,
        processedData: null,
        appliedRules: ['data_collection_disabled'],
        privacyLevel: PrivacyLevel.RESTRICTED
      };
    }

    // Apply privacy rules
    const ruleResult = this.ruleEngine.evaluateData(data, userId, dataType);
    if (!ruleResult.allowed) {
      return {
        allowed: false,
        processedData: null,
        appliedRules: ruleResult.appliedRules,
        privacyLevel: PrivacyLevel.RESTRICTED
      };
    }

    // Apply anonymization based on user settings
    const anonymizationResult = this.anonymizationService.anonymizeData(
      ruleResult.processedData,
      settings.anonymization,
      userId
    );

    // Determine privacy level
    const privacyLevel = this.determinePrivacyLevel(settings, dataType);

    return {
      allowed: true,
      processedData: anonymizationResult.anonymizedData,
      appliedRules: ruleResult.appliedRules,
      privacyLevel
    };
  }

  async checkDataRetention(userId: string): Promise<{
    shouldDelete: boolean;
    retentionPeriod: number;
    dataAge: number;
  }> {
    const settings = await this.getUserPrivacySettings(userId);
    const dataAge = Date.now() - settings.createdAt.getTime();
    const retentionPeriod = settings.retention.personalData * 24 * 60 * 60 * 1000; // Convert days to ms

    return {
      shouldDelete: settings.retention.autoDelete && dataAge > retentionPeriod,
      retentionPeriod: settings.retention.personalData,
      dataAge: Math.floor(dataAge / (24 * 60 * 60 * 1000)) // Convert to days
    };
  }

  async reportPrivacyViolation(violation: Omit<PrivacyViolation, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const fullViolation: PrivacyViolation = {
      ...violation,
      id: this.generateViolationId(),
      timestamp: new Date(),
      resolved: false
    };

    // Log the violation (in a real implementation, this would go to a secure audit log)
    console.error('Privacy Violation Detected:', fullViolation);

    // If critical, halt data collection immediately
    if (fullViolation.severity === 'critical') {
      await this.haltDataCollection(fullViolation.userId);
    }
  }

  private async haltDataCollection(userId: string): Promise<void> {
    const settings = await this.getUserPrivacySettings(userId);
    await this.updatePrivacySettings(userId, {
      dataCollection: {
        ...settings.dataCollection,
        ideTelemtry: false,
        gitActivity: false,
        communicationData: false,
        granularControls: Object.keys(settings.dataCollection.granularControls).reduce(
          (acc, key) => ({ ...acc, [key]: false }),
          {}
        )
      }
    });
  }

  private isDataCollectionAllowed(settings: PrivacySettings, dataType: string): boolean {
    switch (dataType) {
      case 'ide_telemetry':
        return settings.dataCollection.ideTelemtry;
      case 'git_event':
        return settings.dataCollection.gitActivity;
      case 'communication':
        return settings.dataCollection.communicationData;
      default:
        return false;
    }
  }

  private determinePrivacyLevel(settings: PrivacySettings, dataType: string): PrivacyLevel {
    if (settings.anonymization === AnonymizationLevel.FULL) {
      return PrivacyLevel.PRIVATE;
    }
    
    if (!settings.sharing.teamMetrics) {
      return PrivacyLevel.PRIVATE;
    }

    if (settings.sharing.individualMetrics) {
      return PrivacyLevel.PUBLIC;
    }

    return PrivacyLevel.TEAM;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUsersWithExpiredData(): Promise<string[]> {
    return await this.settingsRepository.getUsersWithExpiredData();
  }

  async deleteUserData(userId: string): Promise<boolean> {
    return await this.settingsRepository.deleteSettings(userId);
  }
}