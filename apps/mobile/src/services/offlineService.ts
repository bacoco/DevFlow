import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private readonly CACHE_PREFIX = 'cache_';
  private readonly OFFLINE_ACTIONS_KEY = 'offline_actions';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRY_COUNT = 3;

  private isOnline = true;
  private offlineQueue: OfflineAction[] = [];

  async initialize(): Promise<void> {
    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.processOfflineQueue();
      }
    });

    // Load offline queue from storage
    await this.loadOfflineQueue();
  }

  async cacheData<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttl || this.DEFAULT_TTL);
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
      };

      const cacheKey = this.CACHE_PREFIX + key;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

      // Clean up old cache entries periodically
      if (Math.random() < 0.1) { // 10% chance
        this.cleanupCache();
      }
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if cache has expired
      if (Date.now() > cacheEntry.expiresAt) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  async removeCachedData(key: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineQueue.push(offlineAction);
    await this.saveOfflineQueue();
  }

  async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    const actionsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeOfflineAction(action);
      } catch (error) {
        console.error('Failed to execute offline action:', error);
        
        if (action.retryCount < this.MAX_RETRY_COUNT) {
          action.retryCount++;
          this.offlineQueue.push(action);
        } else {
          console.warn('Max retry count reached for action:', action);
        }
      }
    }

    await this.saveOfflineQueue();
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'UPDATE_SETTINGS':
        await this.executeSettingsUpdate(action.payload);
        break;
      case 'MARK_ALERT_READ':
        await this.executeMarkAlertRead(action.payload);
        break;
      case 'DISMISS_ALERT':
        await this.executeDismissAlert(action.payload);
        break;
      case 'UPDATE_NOTIFICATION_PREFERENCES':
        await this.executeNotificationPreferencesUpdate(action.payload);
        break;
      case 'SYNC_DASHBOARD_CONFIG':
        await this.executeDashboardConfigSync(action.payload);
        break;
      case 'SUBMIT_FEEDBACK':
        await this.executeSubmitFeedback(action.payload);
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async executeSettingsUpdate(payload: any): Promise<void> {
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Settings update failed: ${response.status}`);
    }
  }

  private async executeMarkAlertRead(payload: {alertId: string}): Promise<void> {
    const response = await fetch(`/api/alerts/${payload.alertId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mark alert read failed: ${response.status}`);
    }
  }

  private async executeDismissAlert(payload: {alertId: string}): Promise<void> {
    const response = await fetch(`/api/alerts/${payload.alertId}/dismiss`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Dismiss alert failed: ${response.status}`);
    }
  }

  private async executeNotificationPreferencesUpdate(payload: any): Promise<void> {
    const response = await fetch('/api/user/notification-preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Notification preferences update failed: ${response.status}`);
    }
  }

  private async executeDashboardConfigSync(payload: any): Promise<void> {
    const response = await fetch('/api/dashboard/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Dashboard config sync failed: ${response.status}`);
    }
  }

  private async executeSubmitFeedback(payload: any): Promise<void> {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Submit feedback failed: ${response.status}`);
    }
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_ACTIONS_KEY,
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      // Get cache entries with their sizes
      const cacheEntries: Array<{key: string; size: number; timestamp: number}> = [];
      let totalSize = 0;

      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = new Blob([data]).size;
          const entry = JSON.parse(data) as CacheEntry;
          
          cacheEntries.push({
            key,
            size,
            timestamp: entry.timestamp,
          });
          
          totalSize += size;
        }
      }

      // Remove expired entries
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry = JSON.parse(data) as CacheEntry;
          if (now > entry.expiresAt) {
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`Removed ${expiredKeys.length} expired cache entries`);
      }

      // If still over limit, remove oldest entries
      if (totalSize > this.MAX_CACHE_SIZE) {
        const sortedEntries = cacheEntries
          .filter(entry => !expiredKeys.includes(entry.key))
          .sort((a, b) => a.timestamp - b.timestamp);

        let currentSize = totalSize;
        const keysToRemove: string[] = [];

        for (const entry of sortedEntries) {
          if (currentSize <= this.MAX_CACHE_SIZE * 0.8) { // Keep 80% of max size
            break;
          }
          
          keysToRemove.push(entry.key);
          currentSize -= entry.size;
        }

        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
          console.log(`Removed ${keysToRemove.length} old cache entries to free space`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = new Blob([data]).size;
          const entry = JSON.parse(data) as CacheEntry;
          
          totalSize += size;
          
          if (oldestEntry === null || entry.timestamp < oldestEntry) {
            oldestEntry = entry.timestamp;
          }
          
          if (newestEntry === null || entry.timestamp > newestEntry) {
            newestEntry = entry.timestamp;
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}

export const offlineService = new OfflineService();