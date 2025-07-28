import { FeatureStore, FeatureVector } from '../types/ml-types';

// In-memory feature store implementation for testing
export class InMemoryFeatureStore implements FeatureStore {
  private features: Map<string, FeatureVector[]> = new Map();

  async saveFeatures(features: FeatureVector[]): Promise<void> {
    for (const feature of features) {
      const userFeatures = this.features.get(feature.userId) || [];
      userFeatures.push(feature);
      this.features.set(feature.userId, userFeatures);
    }
  }

  async getFeatures(userId: string, startTime: Date, endTime: Date): Promise<FeatureVector[]> {
    const userFeatures = this.features.get(userId) || [];
    return userFeatures.filter(f => 
      f.timestamp >= startTime && f.timestamp <= endTime
    );
  }

  async getLatestFeatures(userId: string, limit: number = 100): Promise<FeatureVector[]> {
    const userFeatures = this.features.get(userId) || [];
    return userFeatures
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async deleteFeatures(userId: string, beforeDate: Date): Promise<void> {
    const userFeatures = this.features.get(userId) || [];
    const filteredFeatures = userFeatures.filter(f => f.timestamp >= beforeDate);
    this.features.set(userId, filteredFeatures);
  }
}

// Factory function for creating feature store
export function createFeatureStore(): FeatureStore {
  return new InMemoryFeatureStore();
}