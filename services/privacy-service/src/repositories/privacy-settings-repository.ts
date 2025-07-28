import { MongoClient, Db, Collection } from 'mongodb';
import { PrivacySettings, AnonymizationLevel } from '../types/privacy';

export class PrivacySettingsRepository {
  private db: Db;
  private collection: Collection<PrivacySettings>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<PrivacySettings>('privacy_settings');
  }

  async createDefaultSettings(userId: string): Promise<PrivacySettings> {
    const defaultSettings: PrivacySettings = {
      userId,
      dataCollection: {
        ideTelemtry: true,
        gitActivity: true,
        communicationData: false,
        granularControls: {
          keystrokeData: false,
          screenTime: true,
          fileChanges: true,
          debugSessions: true,
          buildEvents: true
        }
      },
      sharing: {
        teamMetrics: true,
        individualMetrics: false,
        aggregatedInsights: true,
        externalIntegrations: false
      },
      retention: {
        personalData: 730, // 2 years
        aggregatedData: 1095, // 3 years
        auditLogs: 2555, // 7 years
        autoDelete: true
      },
      anonymization: AnonymizationLevel.BASIC,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.collection.insertOne(defaultSettings);
    return defaultSettings;
  }

  async getByUserId(userId: string): Promise<PrivacySettings | null> {
    return await this.collection.findOne({ userId });
  }

  async updateSettings(userId: string, updates: Partial<PrivacySettings>): Promise<PrivacySettings | null> {
    const result = await this.collection.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    return result.value;
  }

  async deleteSettings(userId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ userId });
    return result.deletedCount > 0;
  }

  async getUsersWithExpiredData(): Promise<string[]> {
    const now = new Date();
    const settings = await this.collection.find({
      'retention.autoDelete': true
    }).toArray();

    return settings
      .filter(setting => {
        const expiryDate = new Date(setting.createdAt);
        expiryDate.setDate(expiryDate.getDate() + setting.retention.personalData);
        return expiryDate <= now;
      })
      .map(setting => setting.userId);
  }
}