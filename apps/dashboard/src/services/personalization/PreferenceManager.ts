/**
 * Preference management system with cross-device synchronization
 * Handles user preferences storage, synchronization, and conflict resolution
 */

import { UserPreferences, ThemePreference, LayoutPreference, WidgetPreference } from './types';

export interface SyncResult {
  success: boolean;
  conflicts: PreferenceConflict[];
  lastSyncTime: Date;
}

export interface PreferenceConflict {
  key: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'merge';
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  platform: string;
  lastSeen: Date;
}

export class PreferenceManager {
  private userId: string;
  private deviceId: string;
  private preferences: UserPreferences;
  private syncInProgress = false;
  private changeListeners: Array<(preferences: UserPreferences) => void> = [];
  private readonly STORAGE_KEY_PREFIX = 'user_preferences_';
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(userId: string, deviceId?: string) {
    this.userId = userId;
    this.deviceId = deviceId || this.generateDeviceId();
    this.preferences = this.loadLocalPreferences();
    this.startSyncInterval();
  }

  /**
   * Get current user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update theme preferences
   */
  async updateThemePreference(theme: Partial<ThemePreference>): Promise<void> {
    const updatedTheme = { ...this.preferences.theme, ...theme };
    await this.updatePreferences({ theme: updatedTheme });
  }

  /**
   * Update layout preferences
   */
  async updateLayoutPreference(layout: Partial<LayoutPreference>): Promise<void> {
    const updatedLayout = { ...this.preferences.layout, ...layout };
    await this.updatePreferences({ layout: updatedLayout });
  }

  /**
   * Update widget preferences
   */
  async updateWidgetPreferences(widgets: WidgetPreference[]): Promise<void> {
    await this.updatePreferences({ widgets });
  }

  /**
   * Add or update a single widget preference
   */
  async updateWidgetPreference(widgetPreference: WidgetPreference): Promise<void> {
    const existingIndex = this.preferences.widgets.findIndex(
      w => w.widgetId === widgetPreference.widgetId
    );

    const updatedWidgets = [...this.preferences.widgets];
    if (existingIndex >= 0) {
      updatedWidgets[existingIndex] = widgetPreference;
    } else {
      updatedWidgets.push(widgetPreference);
    }

    await this.updateWidgetPreferences(updatedWidgets);
  }

  /**
   * Remove a widget preference
   */
  async removeWidgetPreference(widgetId: string): Promise<void> {
    const updatedWidgets = this.preferences.widgets.filter(
      w => w.widgetId !== widgetId
    );
    await this.updateWidgetPreferences(updatedWidgets);
  }

  /**
   * Update accessibility preferences
   */
  async updateAccessibilityPreferences(accessibility: Partial<UserPreferences['accessibility']>): Promise<void> {
    const updatedAccessibility = { ...this.preferences.accessibility, ...accessibility };
    await this.updatePreferences({ accessibility: updatedAccessibility });
  }

  /**
   * Update privacy preferences
   */
  async updatePrivacyPreferences(privacy: Partial<UserPreferences['privacy']>): Promise<void> {
    const updatedPrivacy = { ...this.preferences.privacy, ...privacy };
    await this.updatePreferences({ privacy: updatedPrivacy });
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultPreferences = this.createDefaultPreferences();
    this.preferences = defaultPreferences;
    await this.saveLocalPreferences();
    await this.syncToRemote();
    this.notifyListeners();
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from backup
   */
  async importPreferences(preferencesJson: string): Promise<void> {
    try {
      const importedPreferences = JSON.parse(preferencesJson) as UserPreferences;
      
      // Validate the imported preferences
      if (this.validatePreferences(importedPreferences)) {
        this.preferences = {
          ...importedPreferences,
          id: this.preferences.id,
          userId: this.userId,
          lastUpdated: new Date()
        };
        
        await this.saveLocalPreferences();
        await this.syncToRemote();
        this.notifyListeners();
      } else {
        throw new Error('Invalid preferences format');
      }
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error.message}`);
    }
  }

  /**
   * Sync preferences across devices
   */
  async syncPreferences(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, conflicts: [], lastSyncTime: new Date() };
    }

    this.syncInProgress = true;

    try {
      const remotePreferences = await this.fetchRemotePreferences();
      const conflicts = this.detectConflicts(this.preferences, remotePreferences);
      
      if (conflicts.length > 0) {
        const resolvedPreferences = this.resolveConflicts(conflicts);
        this.preferences = resolvedPreferences;
      } else if (remotePreferences && remotePreferences.lastUpdated > this.preferences.lastUpdated) {
        this.preferences = remotePreferences;
      }

      await this.saveLocalPreferences();
      await this.syncToRemote();
      this.notifyListeners();

      return {
        success: true,
        conflicts,
        lastSyncTime: new Date()
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        conflicts: [],
        lastSyncTime: new Date()
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    lastSyncTime?: Date;
    syncInProgress: boolean;
    hasUnsyncedChanges: boolean;
  } {
    return {
      lastSyncTime: this.preferences.syncedAt,
      syncInProgress: this.syncInProgress,
      hasUnsyncedChanges: !this.preferences.syncedAt || 
        this.preferences.lastUpdated > this.preferences.syncedAt
    };
  }

  /**
   * Add a change listener
   */
  addChangeListener(listener: (preferences: UserPreferences) => void): () => void {
    this.changeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get device-specific preferences
   */
  getDevicePreferences(): Partial<UserPreferences> {
    // Return preferences that are device-specific
    return {
      theme: this.preferences.theme,
      accessibility: this.preferences.accessibility,
      notifications: this.preferences.notifications
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.changeListeners = [];
  }

  private async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = {
      ...this.preferences,
      ...updates,
      lastUpdated: new Date()
    };

    await this.saveLocalPreferences();
    
    // Sync in background
    this.syncToRemote().catch(error => {
      console.warn('Background sync failed:', error);
    });

    this.notifyListeners();
  }

  private createDefaultPreferences(): UserPreferences {
    return {
      id: `pref_${this.userId}_${Date.now()}`,
      userId: this.userId,
      theme: {
        mode: 'auto',
        colorScheme: 'default',
        density: 'comfortable'
      },
      layout: {
        defaultView: 'dashboard',
        widgetOrder: [],
        columnCount: 3,
        showSidebar: true,
        compactMode: false
      },
      widgets: [],
      notifications: {
        enabled: true,
        frequency: 'hourly',
        channels: ['in_app'],
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        fontSize: 'medium',
        screenReaderOptimized: false,
        keyboardNavigation: false
      },
      privacy: {
        trackingEnabled: true,
        analyticsEnabled: true,
        personalizationEnabled: true,
        dataRetentionDays: 90,
        shareUsageData: false
      },
      lastUpdated: new Date()
    };
  }

  private loadLocalPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${this.userId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        // Ensure dates are properly parsed
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        if (parsed.syncedAt) {
          parsed.syncedAt = new Date(parsed.syncedAt);
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load local preferences:', error);
    }

    return this.createDefaultPreferences();
  }

  private async saveLocalPreferences(): Promise<void> {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}${this.userId}`,
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error('Failed to save local preferences:', error);
      throw error;
    }
  }

  private async fetchRemotePreferences(): Promise<UserPreferences | null> {
    // In a real implementation, this would fetch from a server
    // For now, simulate with localStorage from other devices
    try {
      const remoteKey = `${this.STORAGE_KEY_PREFIX}${this.userId}_remote`;
      const stored = localStorage.getItem(remoteKey);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        if (parsed.syncedAt) {
          parsed.syncedAt = new Date(parsed.syncedAt);
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to fetch remote preferences:', error);
    }
    return null;
  }

  private async syncToRemote(): Promise<void> {
    // In a real implementation, this would sync to a server
    // For now, simulate with localStorage
    try {
      const remoteKey = `${this.STORAGE_KEY_PREFIX}${this.userId}_remote`;
      const syncedPreferences = {
        ...this.preferences,
        syncedAt: new Date()
      };
      
      localStorage.setItem(remoteKey, JSON.stringify(syncedPreferences));
      this.preferences.syncedAt = syncedPreferences.syncedAt;
    } catch (error) {
      console.warn('Failed to sync to remote:', error);
    }
  }

  private detectConflicts(local: UserPreferences, remote: UserPreferences | null): PreferenceConflict[] {
    if (!remote) return [];

    const conflicts: PreferenceConflict[] = [];
    
    // Check for conflicts in different preference sections
    this.checkObjectConflicts('theme', local.theme, remote.theme, conflicts);
    this.checkObjectConflicts('layout', local.layout, remote.layout, conflicts);
    this.checkObjectConflicts('accessibility', local.accessibility, remote.accessibility, conflicts);
    this.checkObjectConflicts('privacy', local.privacy, remote.privacy, conflicts);

    return conflicts;
  }

  private checkObjectConflicts(
    section: string,
    localObj: any,
    remoteObj: any,
    conflicts: PreferenceConflict[]
  ): void {
    Object.keys(localObj).forEach(key => {
      const localValue = localObj[key];
      const remoteValue = remoteObj[key];
      
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        conflicts.push({
          key: `${section}.${key}`,
          localValue,
          remoteValue,
          resolution: 'remote' // Default to remote for now
        });
      }
    });
  }

  private resolveConflicts(conflicts: PreferenceConflict[]): UserPreferences {
    let resolved = { ...this.preferences };

    conflicts.forEach(conflict => {
      const keys = conflict.key.split('.');
      let current = resolved as any;
      
      // Navigate to the nested property
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Apply resolution
      const finalKey = keys[keys.length - 1];
      switch (conflict.resolution) {
        case 'remote':
          current[finalKey] = conflict.remoteValue;
          break;
        case 'local':
          current[finalKey] = conflict.localValue;
          break;
        case 'merge':
          // Simple merge strategy - could be more sophisticated
          if (typeof conflict.localValue === 'object' && typeof conflict.remoteValue === 'object') {
            current[finalKey] = { ...conflict.localValue, ...conflict.remoteValue };
          } else {
            current[finalKey] = conflict.remoteValue; // Default to remote
          }
          break;
      }
    });

    resolved.lastUpdated = new Date();
    return resolved;
  }

  private validatePreferences(preferences: any): preferences is UserPreferences {
    // Basic validation - could be more comprehensive
    return (
      preferences &&
      typeof preferences === 'object' &&
      preferences.userId &&
      preferences.theme &&
      preferences.layout &&
      preferences.widgets &&
      Array.isArray(preferences.widgets)
    );
  }

  private generateDeviceId(): string {
    // Generate a unique device ID
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      this.syncPreferences().catch(error => {
        console.warn('Periodic sync failed:', error);
      });
    }, this.SYNC_INTERVAL);
  }

  private notifyListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('Preference change listener error:', error);
      }
    });
  }
}