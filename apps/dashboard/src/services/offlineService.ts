/**
 * Offline Service
 * Handles offline capabilities, data caching, and synchronization
 */

import { errorReporting } from '../utils/errorReporting';

export interface OfflineData {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: ConflictResolution[];
}

export interface ConflictResolution {
  id: string;
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'merge' | 'manual';
  resolvedData?: any;
}

export interface OfflineConfig {
  enabled: boolean;
  maxQueueSize: number;
  syncInterval: number;
  retryDelay: number;
  maxRetries: number;
  conflictResolution: 'local' | 'server' | 'merge' | 'manual';
}

class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: OfflineData[] = [];
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  private config: OfflineConfig = {
    enabled: true,
    maxQueueSize: 1000,
    syncInterval: 30000, // 30 seconds
    retryDelay: 5000, // 5 seconds
    maxRetries: 3,
    conflictResolution: 'merge',
  };

  constructor(config?: Partial<OfflineConfig>) {
    this.config = { ...this.config, ...config };
    this.setupEventListeners();
    this.loadQueueFromStorage();
    
    if (this.config.enabled) {
      this.startPeriodicSync();
    }
  }

  private setupEventListeners(): void {
    // Network status listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Page visibility listener for sync on focus
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Beforeunload listener to save queue
    window.addEventListener('beforeunload', this.saveQueueToStorage.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.emit('online');
    
    // Trigger immediate sync when coming back online
    if (this.config.enabled && this.syncQueue.length > 0) {
      this.syncData();
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.emit('offline');
  }

  private handleVisibilityChange(): void {
    if (!document.hidden && this.isOnline && this.syncQueue.length > 0) {
      this.syncData();
    }
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncData();
      }
    }, this.config.syncInterval);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public isOffline(): boolean {
    return !this.isOnline;
  }

  public getNetworkStatus(): { online: boolean; lastSync: Date | null; queueSize: number } {
    return {
      online: this.isOnline,
      lastSync: this.getLastSyncTime(),
      queueSize: this.syncQueue.length,
    };
  }

  public queueOperation(operation: Omit<OfflineData, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>): string {
    if (!this.config.enabled) {
      throw new Error('Offline mode is disabled');
    }

    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineData: OfflineData = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      ...operation,
    };

    // Check queue size limit
    if (this.syncQueue.length >= this.config.maxQueueSize) {
      // Remove oldest items to make room
      this.syncQueue.splice(0, this.syncQueue.length - this.config.maxQueueSize + 1);
    }

    this.syncQueue.push(offlineData);
    this.saveQueueToStorage();
    this.emit('queueUpdated', { queueSize: this.syncQueue.length });

    // Try immediate sync if online
    if (this.isOnline) {
      this.syncData();
    }

    return id;
  }

  public async syncData(): Promise<SyncResult> {
    if (!this.config.enabled || this.syncInProgress || this.syncQueue.length === 0) {
      return { success: true, syncedItems: 0, failedItems: 0, conflicts: [] };
    }

    this.syncInProgress = true;
    this.emit('syncStarted');

    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
    };

    const itemsToSync = [...this.syncQueue];
    const failedItems: OfflineData[] = [];

    for (const item of itemsToSync) {
      try {
        const syncResult = await this.syncItem(item);
        
        if (syncResult.success) {
          result.syncedItems++;
          // Remove from queue
          this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
        } else if (syncResult.conflict) {
          result.conflicts.push(syncResult.conflict);
          // Handle conflict based on resolution strategy
          const resolved = await this.resolveConflict(syncResult.conflict);
          if (resolved) {
            result.syncedItems++;
            this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
          } else {
            failedItems.push(item);
          }
        } else {
          // Retry logic
          item.retryCount++;
          if (item.retryCount < item.maxRetries) {
            failedItems.push(item);
          } else {
            result.failedItems++;
            // Remove from queue after max retries
            this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
            
            // Report persistent sync failure
            errorReporting.reportError({
              error: new Error(`Failed to sync item after ${item.maxRetries} retries`),
              level: 'service',
              metadata: {
                itemId: item.id,
                itemType: item.type,
                entity: item.entity,
              },
            });
          }
        }
      } catch (error) {
        result.failedItems++;
        failedItems.push(item);
        
        errorReporting.reportError({
          error: error as Error,
          level: 'service',
          metadata: {
            itemId: item.id,
            syncOperation: true,
          },
        });
      }
    }

    // Update queue with failed items
    this.syncQueue = failedItems;
    this.saveQueueToStorage();

    // Update last sync time
    this.setLastSyncTime(new Date());

    result.success = result.failedItems === 0;
    this.syncInProgress = false;
    
    this.emit('syncCompleted', result);
    
    return result;
  }

  private async syncItem(item: OfflineData): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
  }> {
    try {
      // This would be replaced with actual API calls
      const response = await this.makeApiCall(item);
      
      if (response.status === 409) {
        // Conflict detected
        const serverData = await response.json();
        return {
          success: false,
          conflict: {
            id: item.id,
            localData: item.data,
            serverData: serverData.data,
            resolution: this.config.conflictResolution,
          },
        };
      }

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  private async makeApiCall(item: OfflineData): Promise<Response> {
    const endpoint = this.getEndpointForEntity(item.entity);
    const method = this.getMethodForType(item.type);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (item.type !== 'delete') {
      options.body = JSON.stringify(item.data);
    }

    return fetch(endpoint, options);
  }

  private getEndpointForEntity(entity: string): string {
    // This would be configured based on your API structure
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    return `${baseUrl}/${entity}`;
  }

  private getMethodForType(type: OfflineData['type']): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  private async resolveConflict(conflict: ConflictResolution): Promise<boolean> {
    try {
      let resolvedData: any;

      switch (conflict.resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = this.mergeData(conflict.localData, conflict.serverData);
          break;
        case 'manual':
          // Emit event for manual resolution
          this.emit('conflictRequiresManualResolution', conflict);
          return false;
        default:
          resolvedData = conflict.localData;
      }

      // Apply resolved data
      const response = await fetch(this.getEndpointForEntity('resolve-conflict'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: conflict.id,
          resolvedData,
        }),
      });

      return response.ok;
    } catch (error) {
      errorReporting.reportError({
        error: error as Error,
        level: 'service',
        metadata: {
          conflictId: conflict.id,
          conflictResolution: true,
        },
      });
      return false;
    }
  }

  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - in a real app, this would be more sophisticated
    if (typeof localData === 'object' && typeof serverData === 'object') {
      return {
        ...serverData,
        ...localData,
        // Prefer server timestamps
        createdAt: serverData.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
    
    // For non-objects, prefer local data
    return localData;
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('devflow_offline_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to save offline queue to storage:', error);
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('devflow_offline_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue from storage:', error);
      this.syncQueue = [];
    }
  }

  private setLastSyncTime(time: Date): void {
    try {
      localStorage.setItem('devflow_last_sync', time.toISOString());
    } catch (error) {
      console.warn('Failed to save last sync time:', error);
    }
  }

  private getLastSyncTime(): Date | null {
    try {
      const stored = localStorage.getItem('devflow_last_sync');
      return stored ? new Date(stored) : null;
    } catch (error) {
      return null;
    }
  }

  public clearQueue(): void {
    this.syncQueue = [];
    this.saveQueueToStorage();
    this.emit('queueCleared');
  }

  public getQueuedOperations(): OfflineData[] {
    return [...this.syncQueue];
  }

  public removeFromQueue(id: string): boolean {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
    
    if (this.syncQueue.length < initialLength) {
      this.saveQueueToStorage();
      this.emit('queueUpdated', { queueSize: this.syncQueue.length });
      return true;
    }
    
    return false;
  }

  public updateConfig(newConfig: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled) {
      this.startPeriodicSync();
    } else {
      this.stopPeriodicSync();
    }
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  public destroy(): void {
    this.stopPeriodicSync();
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.saveQueueToStorage.bind(this));
    this.eventListeners.clear();
  }
}

// Create singleton instance
export const offlineService = new OfflineService();

// React hook for using offline service
export const useOfflineService = () => {
  const [networkStatus, setNetworkStatus] = React.useState(() => 
    offlineService.getNetworkStatus()
  );
  const [syncResult, setSyncResult] = React.useState<SyncResult | null>(null);

  React.useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(offlineService.getNetworkStatus());
    };

    const handleSyncCompleted = (result: SyncResult) => {
      setSyncResult(result);
      updateNetworkStatus();
    };

    offlineService.on('online', updateNetworkStatus);
    offlineService.on('offline', updateNetworkStatus);
    offlineService.on('queueUpdated', updateNetworkStatus);
    offlineService.on('syncCompleted', handleSyncCompleted);

    return () => {
      offlineService.off('online', updateNetworkStatus);
      offlineService.off('offline', updateNetworkStatus);
      offlineService.off('queueUpdated', updateNetworkStatus);
      offlineService.off('syncCompleted', handleSyncCompleted);
    };
  }, []);

  const queueOperation = React.useCallback((operation: Omit<OfflineData, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => {
    return offlineService.queueOperation(operation);
  }, []);

  const syncData = React.useCallback(() => {
    return offlineService.syncData();
  }, []);

  const clearQueue = React.useCallback(() => {
    offlineService.clearQueue();
  }, []);

  return {
    networkStatus,
    syncResult,
    queueOperation,
    syncData,
    clearQueue,
    isOffline: offlineService.isOffline(),
    getQueuedOperations: () => offlineService.getQueuedOperations(),
  };
};

// Import React for the hook
import React from 'react';