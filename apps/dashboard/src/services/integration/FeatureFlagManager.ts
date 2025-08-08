/**
 * Feature Flag Manager
 * 
 * Manages feature flags for gradual rollout of UX improvements.
 * Supports user-based, percentage-based, and conditional rollouts.
 */

import { EventEmitter } from 'events';

export interface FeatureFlag {
  id: string;
  enabled: boolean;
  rolloutPercentage?: number;
  userGroups?: string[];
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagCondition {
  type: 'user_attribute' | 'device_type' | 'browser' | 'location' | 'time_range';
  attribute?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface FeatureFlagContext {
  userId?: string;
  userAttributes?: Record<string, any>;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  browser?: string;
  location?: string;
  timestamp?: Date;
}

export class FeatureFlagManager extends EventEmitter {
  private flags: Map<string, FeatureFlag> = new Map();
  private cache: Map<string, { result: boolean; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.loadFlags();
  }

  /**
   * Load feature flags from storage
   */
  private loadFlags(): void {
    try {
      const stored = localStorage.getItem('devflow_feature_flags');
      if (stored) {
        const flags = JSON.parse(stored);
        Object.entries(flags).forEach(([id, flag]: [string, any]) => {
          this.flags.set(id, {
            ...flag,
            createdAt: new Date(flag.createdAt),
            updatedAt: new Date(flag.updatedAt)
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
  }

  /**
   * Save feature flags to storage
   */
  private saveFlags(): void {
    try {
      const flags: Record<string, FeatureFlag> = {};
      this.flags.forEach((flag, id) => {
        flags[id] = flag;
      });
      localStorage.setItem('devflow_feature_flags', JSON.stringify(flags));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  /**
   * Register a new feature flag
   */
  registerFeature(
    id: string, 
    enabled: boolean = false, 
    options: Partial<FeatureFlag> = {}
  ): void {
    const flag: FeatureFlag = {
      id,
      enabled,
      rolloutPercentage: options.rolloutPercentage,
      userGroups: options.userGroups,
      conditions: options.conditions,
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options
    };

    this.flags.set(id, flag);
    this.saveFlags();
    this.clearCache(id);

    this.emit('flag_registered', { id, flag });
  }

  /**
   * Enable a feature flag
   */
  enableFeature(id: string): void {
    const flag = this.flags.get(id);
    if (flag) {
      flag.enabled = true;
      flag.updatedAt = new Date();
      this.saveFlags();
      this.clearCache(id);
      this.emit('flag_enabled', { id, flag });
    }
  }

  /**
   * Disable a feature flag
   */
  disableFeature(id: string): void {
    const flag = this.flags.get(id);
    if (flag) {
      flag.enabled = false;
      flag.updatedAt = new Date();
      this.saveFlags();
      this.clearCache(id);
      this.emit('flag_disabled', { id, flag });
    }
  }

  /**
   * Check if a feature is enabled for the given context
   */
  isEnabled(id: string, context: FeatureFlagContext = {}): boolean {
    const cacheKey = this.getCacheKey(id, context);
    const cached = this.cache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const result = this.evaluateFlag(id, context);
    
    // Cache the result
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Evaluate a feature flag against the given context
   */
  private evaluateFlag(id: string, context: FeatureFlagContext): boolean {
    const flag = this.flags.get(id);
    if (!flag) {
      return false;
    }

    // If flag is disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check user groups
    if (flag.userGroups && flag.userGroups.length > 0) {
      const userGroups = context.userAttributes?.groups || [];
      const hasRequiredGroup = flag.userGroups.some(group => 
        userGroups.includes(group)
      );
      if (!hasRequiredGroup) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const userId = context.userId || 'anonymous';
      const hash = this.hashString(userId + id);
      const percentage = hash % 100;
      if (percentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions && flag.conditions.length > 0) {
      const conditionsMet = flag.conditions.every(condition => 
        this.evaluateCondition(condition, context)
      );
      if (!conditionsMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    let contextValue: any;

    switch (condition.type) {
      case 'user_attribute':
        contextValue = context.userAttributes?.[condition.attribute || ''];
        break;
      case 'device_type':
        contextValue = context.deviceType;
        break;
      case 'browser':
        contextValue = context.browser;
        break;
      case 'location':
        contextValue = context.location;
        break;
      case 'time_range':
        contextValue = context.timestamp || new Date();
        break;
      default:
        return false;
    }

    return this.evaluateOperator(contextValue, condition.operator, condition.value);
  }

  /**
   * Evaluate an operator
   */
  private evaluateOperator(contextValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === expectedValue;
      case 'not_equals':
        return contextValue !== expectedValue;
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(expectedValue);
      case 'greater_than':
        return contextValue > expectedValue;
      case 'less_than':
        return contextValue < expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      default:
        return false;
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(id: string): FeatureFlag | undefined {
    return this.flags.get(id);
  }

  /**
   * Update feature flag configuration
   */
  updateFlag(id: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(id);
    if (flag) {
      Object.assign(flag, updates, { updatedAt: new Date() });
      this.saveFlags();
      this.clearCache(id);
      this.emit('flag_updated', { id, flag });
    }
  }

  /**
   * Remove a feature flag
   */
  removeFlag(id: string): void {
    if (this.flags.delete(id)) {
      this.saveFlags();
      this.clearCache(id);
      this.emit('flag_removed', { id });
    }
  }

  /**
   * Clear cache for a specific flag or all flags
   */
  private clearCache(flagId?: string): void {
    if (flagId) {
      // Clear cache entries for this specific flag
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${flagId}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Generate cache key for flag evaluation
   */
  private getCacheKey(id: string, context: FeatureFlagContext): string {
    const contextStr = JSON.stringify({
      userId: context.userId,
      userGroups: context.userAttributes?.groups,
      deviceType: context.deviceType,
      browser: context.browser,
      location: context.location
    });
    return `${id}:${this.hashString(contextStr)}`;
  }

  /**
   * Hash a string to a number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get feature flag statistics
   */
  getStatistics(): {
    totalFlags: number;
    enabledFlags: number;
    flagsWithRollout: number;
    flagsWithConditions: number;
  } {
    const flags = Array.from(this.flags.values());
    
    return {
      totalFlags: flags.length,
      enabledFlags: flags.filter(f => f.enabled).length,
      flagsWithRollout: flags.filter(f => f.rolloutPercentage !== undefined).length,
      flagsWithConditions: flags.filter(f => f.conditions && f.conditions.length > 0).length
    };
  }

  /**
   * Export feature flags configuration
   */
  exportFlags(): string {
    const flags: Record<string, FeatureFlag> = {};
    this.flags.forEach((flag, id) => {
      flags[id] = flag;
    });
    return JSON.stringify(flags, null, 2);
  }

  /**
   * Import feature flags configuration
   */
  importFlags(flagsJson: string): void {
    try {
      const flags = JSON.parse(flagsJson);
      Object.entries(flags).forEach(([id, flag]: [string, any]) => {
        this.flags.set(id, {
          ...flag,
          createdAt: new Date(flag.createdAt),
          updatedAt: new Date(flag.updatedAt)
        });
      });
      this.saveFlags();
      this.clearCache();
      this.emit('flags_imported', { count: Object.keys(flags).length });
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      throw new Error('Invalid feature flags JSON');
    }
  }

  /**
   * Reset all feature flags
   */
  reset(): void {
    this.flags.clear();
    this.clearCache();
    this.saveFlags();
    this.emit('flags_reset');
  }

  /**
   * Dispose of the manager
   */
  dispose(): void {
    this.removeAllListeners();
    this.clearCache();
  }
}