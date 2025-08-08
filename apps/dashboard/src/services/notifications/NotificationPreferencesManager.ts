import {
  NotificationPreferences,
  NotificationChannelPreferences,
  NotificationFrequencyPreferences,
  NotificationCategoryPreferences,
  NotificationCategory,
  NotificationPriority,
  QuietHoursConfig,
  EscalationPreferences,
  WorkingHoursConfig
} from './types';

export class NotificationPreferencesManager {
  private preferences: Map<string, NotificationPreferences> = new Map();
  private defaultPreferences: NotificationPreferences;

  constructor(
    private storageService: NotificationStorageService,
    private validationService: PreferencesValidationService
  ) {
    this.defaultPreferences = this.createDefaultPreferences();
    this.loadPreferences().catch(error => {
      console.warn('Failed to load preferences:', error);
    });
  }

  /**
   * Gets user notification preferences with fallback to defaults
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    if (!this.preferences.has(userId)) {
      const stored = await this.storageService.getPreferences(userId);
      if (stored) {
        this.preferences.set(userId, stored);
      } else {
        const userDefaults = { ...this.defaultPreferences, userId };
        this.preferences.set(userId, userDefaults);
        await this.storageService.savePreferences(userDefaults);
      }
    }

    return this.preferences.get(userId)!;
  }

  /**
   * Updates user notification preferences with validation
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...updates, userId };

    // Validate the updated preferences
    const validation = await this.validationService.validate(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
    }

    // Apply any automatic adjustments
    const adjusted = this.applyAutomaticAdjustments(updated);

    this.preferences.set(userId, adjusted);
    await this.storageService.savePreferences(adjusted);

    return adjusted;
  }

  /**
   * Updates channel preferences for specific categories
   */
  async updateChannelPreferences(
    userId: string,
    category: NotificationCategory,
    channels: Partial<NotificationChannelPreferences>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.categories[category]) {
      preferences.categories[category] = this.createDefaultCategoryPreference();
    }

    const currentChannels = preferences.categories[category].channels;
    const updatedChannels = this.mergeChannelPreferences(currentChannels, channels);
    
    preferences.categories[category].channels = updatedChannels;
    
    await this.updatePreferences(userId, preferences);
  }

  /**
   * Updates frequency preferences for categories
   */
  async updateFrequencyPreferences(
    userId: string,
    updates: Partial<NotificationFrequencyPreferences>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    // Validate that categories don't appear in multiple frequency lists
    const allCategories = new Set<NotificationCategory>();
    const duplicates: NotificationCategory[] = [];

    Object.entries(updates).forEach(([frequency, categories]) => {
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          if (allCategories.has(category)) {
            duplicates.push(category);
          }
          allCategories.add(category);
        });
      }
    });

    if (duplicates.length > 0) {
      throw new Error(`Categories cannot appear in multiple frequency lists: ${duplicates.join(', ')}`);
    }

    preferences.frequency = { ...preferences.frequency, ...updates };
    await this.updatePreferences(userId, preferences);
  }

  /**
   * Configures quiet hours with timezone support
   */
  async updateQuietHours(
    userId: string,
    quietHours: Partial<QuietHoursConfig>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    // Validate time format
    if (quietHours.startTime && !this.isValidTimeFormat(quietHours.startTime)) {
      throw new Error('Invalid start time format. Use HH:mm format.');
    }
    
    if (quietHours.endTime && !this.isValidTimeFormat(quietHours.endTime)) {
      throw new Error('Invalid end time format. Use HH:mm format.');
    }

    // Validate timezone
    if (quietHours.timezone && !this.isValidTimezone(quietHours.timezone)) {
      throw new Error('Invalid timezone.');
    }

    preferences.quietHours = { ...preferences.quietHours, ...quietHours };
    await this.updatePreferences(userId, preferences);
  }

  /**
   * Configures escalation preferences
   */
  async updateEscalationPreferences(
    userId: string,
    escalation: Partial<EscalationPreferences>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    // Validate delay values
    if (escalation.urgentDelay !== undefined && escalation.urgentDelay < 0) {
      throw new Error('Urgent delay must be non-negative.');
    }
    
    if (escalation.highDelay !== undefined && escalation.highDelay < 0) {
      throw new Error('High priority delay must be non-negative.');
    }

    // Validate max escalations
    if (escalation.maxEscalations !== undefined && escalation.maxEscalations < 1) {
      throw new Error('Max escalations must be at least 1.');
    }

    preferences.escalation = { ...preferences.escalation, ...escalation };
    await this.updatePreferences(userId, preferences);
  }

  /**
   * Bulk updates category preferences
   */
  async updateCategoryPreferences(
    userId: string,
    categoryUpdates: Partial<NotificationCategoryPreferences>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    Object.entries(categoryUpdates).forEach(([category, settings]) => {
      if (settings) {
        preferences.categories[category as NotificationCategory] = {
          ...preferences.categories[category as NotificationCategory],
          ...settings
        };
      }
    });

    await this.updatePreferences(userId, preferences);
  }

  /**
   * Resets preferences to defaults for specific categories
   */
  async resetCategoryPreferences(
    userId: string,
    categories: NotificationCategory[]
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    categories.forEach(category => {
      preferences.categories[category] = this.createDefaultCategoryPreference();
    });

    await this.updatePreferences(userId, preferences);
  }

  /**
   * Gets smart recommendations for preference adjustments
   */
  async getPreferenceRecommendations(
    userId: string,
    userBehaviorData: UserBehaviorData
  ): Promise<PreferenceRecommendation[]> {
    const preferences = await this.getPreferences(userId);
    const recommendations: PreferenceRecommendation[] = [];

    // Analyze dismissal patterns
    const highDismissalCategories = userBehaviorData.dismissalPatterns
      .filter(pattern => pattern.dismissalRate > 0.8)
      .map(pattern => pattern.category);

    if (highDismissalCategories.length > 0) {
      recommendations.push({
        type: 'reduce_frequency',
        title: 'Reduce Notification Frequency',
        description: `Consider reducing notifications for categories you frequently dismiss: ${highDismissalCategories.join(', ')}`,
        impact: 'high',
        categories: highDismissalCategories,
        suggestedAction: {
          type: 'frequency_change',
          from: 'immediate',
          to: 'daily'
        }
      });
    }

    // Analyze engagement patterns
    const lowEngagementCategories = userBehaviorData.engagementPatterns
      .filter(pattern => pattern.engagementRate < 0.2)
      .map(pattern => pattern.category);

    if (lowEngagementCategories.length > 0) {
      recommendations.push({
        type: 'disable_category',
        title: 'Disable Low-Value Categories',
        description: `Consider disabling notifications for categories with low engagement: ${lowEngagementCategories.join(', ')}`,
        impact: 'medium',
        categories: lowEngagementCategories,
        suggestedAction: {
          type: 'category_disable',
          categories: lowEngagementCategories
        }
      });
    }

    // Analyze timing patterns
    if (userBehaviorData.optimalTimes.length > 0) {
      const suggestedQuietHours = this.calculateOptimalQuietHours(userBehaviorData.optimalTimes);
      if (suggestedQuietHours) {
        recommendations.push({
          type: 'optimize_timing',
          title: 'Optimize Notification Timing',
          description: 'Adjust quiet hours based on your engagement patterns',
          impact: 'medium',
          suggestedAction: {
            type: 'quiet_hours_update',
            quietHours: suggestedQuietHours
          }
        });
      }
    }

    return recommendations;
  }

  /**
   * Applies a preference recommendation
   */
  async applyRecommendation(
    userId: string,
    recommendation: PreferenceRecommendation
  ): Promise<void> {
    const { suggestedAction } = recommendation;

    switch (suggestedAction.type) {
      case 'frequency_change':
        await this.applyFrequencyChange(userId, recommendation.categories!, suggestedAction);
        break;
      case 'category_disable':
        await this.applyCategoryDisable(userId, suggestedAction.categories!);
        break;
      case 'quiet_hours_update':
        await this.updateQuietHours(userId, suggestedAction.quietHours!);
        break;
    }
  }

  /**
   * Exports user preferences for backup or migration
   */
  async exportPreferences(userId: string): Promise<string> {
    const preferences = await this.getPreferences(userId);
    return JSON.stringify(preferences, null, 2);
  }

  /**
   * Imports user preferences from backup
   */
  async importPreferences(userId: string, preferencesJson: string): Promise<void> {
    try {
      const preferences = JSON.parse(preferencesJson) as NotificationPreferences;
      preferences.userId = userId; // Ensure correct user ID
      
      const validation = await this.validationService.validate(preferences);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences format: ${validation.errors.join(', ')}`);
      }

      await this.updatePreferences(userId, preferences);
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createDefaultPreferences(): NotificationPreferences {
    return {
      userId: '',
      channels: {
        inApp: true,
        email: false,
        push: true,
        desktop: true,
        mobile: true
      },
      frequency: {
        immediate: ['security'],
        batched: ['performance', 'team'],
        daily: ['personal'],
        weekly: ['collaboration'],
        disabled: []
      },
      categories: {
        performance: {
          enabled: true,
          priority: 'medium',
          channels: ['inApp', 'push']
        },
        collaboration: {
          enabled: true,
          priority: 'medium',
          channels: ['inApp', 'email']
        },
        system: {
          enabled: true,
          priority: 'high',
          channels: ['inApp', 'desktop']
        },
        personal: {
          enabled: true,
          priority: 'low',
          channels: ['inApp']
        },
        team: {
          enabled: true,
          priority: 'medium',
          channels: ['inApp', 'push']
        },
        security: {
          enabled: true,
          priority: 'urgent',
          channels: ['inApp', 'email', 'push', 'desktop']
        }
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        allowUrgent: true
      },
      escalation: {
        enabled: false,
        urgentDelay: 5,
        highDelay: 15,
        maxEscalations: 3,
        escalationChannels: ['email', 'push']
      }
    };
  }

  private createDefaultCategoryPreference() {
    return {
      enabled: true,
      priority: 'medium' as NotificationPriority,
      channels: ['inApp' as keyof NotificationChannelPreferences]
    };
  }

  private async loadPreferences(): Promise<void> {
    // Load cached preferences from storage
    const allPreferences = await this.storageService.getAllPreferences();
    allPreferences.forEach(pref => {
      this.preferences.set(pref.userId, pref);
    });
  }

  private applyAutomaticAdjustments(
    preferences: NotificationPreferences
  ): NotificationPreferences {
    // Ensure security notifications are always enabled with high priority
    if (preferences.categories.security) {
      preferences.categories.security.enabled = true;
      if (preferences.categories.security.priority === 'low') {
        preferences.categories.security.priority = 'high';
      }
    }

    // Ensure urgent notifications have at least one channel enabled
    Object.entries(preferences.categories).forEach(([category, settings]) => {
      if (settings.priority === 'urgent' && settings.channels.length === 0) {
        settings.channels = ['inApp'];
      }
    });

    return preferences;
  }

  private mergeChannelPreferences(
    current: (keyof NotificationChannelPreferences)[],
    updates: Partial<NotificationChannelPreferences>
  ): (keyof NotificationChannelPreferences)[] {
    const enabled = Object.entries(updates)
      .filter(([_, enabled]) => enabled)
      .map(([channel, _]) => channel as keyof NotificationChannelPreferences);

    const disabled = Object.entries(updates)
      .filter(([_, enabled]) => !enabled)
      .map(([channel, _]) => channel as keyof NotificationChannelPreferences);

    return current
      .filter(channel => !disabled.includes(channel))
      .concat(enabled.filter(channel => !current.includes(channel)));
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private calculateOptimalQuietHours(optimalTimes: number[]): QuietHoursConfig | null {
    if (optimalTimes.length === 0) return null;

    // Find the period with lowest engagement (potential quiet hours)
    const hourCounts = new Array(24).fill(0);
    optimalTimes.forEach(hour => hourCounts[hour]++);

    // Find the longest consecutive period of low activity
    let minActivity = Math.min(...hourCounts);
    let quietStart = -1;
    let quietEnd = -1;
    let currentQuietLength = 0;
    let maxQuietLength = 0;

    for (let i = 0; i < 48; i++) { // Check twice to handle wrap-around
      const hour = i % 24;
      if (hourCounts[hour] <= minActivity + 1) {
        if (currentQuietLength === 0) {
          quietStart = hour;
        }
        currentQuietLength++;
      } else {
        if (currentQuietLength > maxQuietLength) {
          maxQuietLength = currentQuietLength;
          quietEnd = (hour - 1 + 24) % 24;
        }
        currentQuietLength = 0;
      }
    }

    if (maxQuietLength >= 6) { // At least 6 hours of quiet time
      return {
        enabled: true,
        startTime: `${quietStart.toString().padStart(2, '0')}:00`,
        endTime: `${quietEnd.toString().padStart(2, '0')}:00`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        allowUrgent: true
      };
    }

    return null;
  }

  private async applyFrequencyChange(
    userId: string,
    categories: NotificationCategory[],
    action: any
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    // Remove categories from current frequency lists
    Object.keys(preferences.frequency).forEach(freq => {
      const freqKey = freq as keyof NotificationFrequencyPreferences;
      if (Array.isArray(preferences.frequency[freqKey])) {
        preferences.frequency[freqKey] = preferences.frequency[freqKey].filter(
          cat => !categories.includes(cat)
        );
      }
    });

    // Add to new frequency list
    const targetFreq = action.to as keyof NotificationFrequencyPreferences;
    if (Array.isArray(preferences.frequency[targetFreq])) {
      preferences.frequency[targetFreq].push(...categories);
    }

    await this.updatePreferences(userId, preferences);
  }

  private async applyCategoryDisable(
    userId: string,
    categories: NotificationCategory[]
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    
    categories.forEach(category => {
      if (preferences.categories[category]) {
        preferences.categories[category].enabled = false;
      }
    });

    await this.updatePreferences(userId, preferences);
  }
}

// Supporting interfaces
interface NotificationStorageService {
  getPreferences(userId: string): Promise<NotificationPreferences | null>;
  savePreferences(preferences: NotificationPreferences): Promise<void>;
  getAllPreferences(): Promise<NotificationPreferences[]>;
}

interface PreferencesValidationService {
  validate(preferences: NotificationPreferences): Promise<ValidationResult>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface UserBehaviorData {
  dismissalPatterns: Array<{
    category: NotificationCategory;
    dismissalRate: number;
  }>;
  engagementPatterns: Array<{
    category: NotificationCategory;
    engagementRate: number;
  }>;
  optimalTimes: number[]; // Hours of day when user is most active
}

interface PreferenceRecommendation {
  type: 'reduce_frequency' | 'disable_category' | 'optimize_timing';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  categories?: NotificationCategory[];
  suggestedAction: {
    type: 'frequency_change' | 'category_disable' | 'quiet_hours_update';
    from?: string;
    to?: string;
    categories?: NotificationCategory[];
    quietHours?: QuietHoursConfig;
  };
}