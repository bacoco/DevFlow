import { useEffect, useState, useCallback, useRef } from 'react';
import { realTimeDataSync } from '../services/websocketService';
import { useDataStore } from '../stores/dataStore';

export interface UseRealTimeSyncOptions {
  enableDashboardSync?: boolean;
  enableTaskSync?: boolean;
  enableMetricSync?: boolean;
  enableUserActivitySync?: boolean;
  filters?: {
    userId?: string;
    teamId?: string;
    dashboardId?: string;
  };
  onSyncError?: (error: Error) => void;
  onConflictDetected?: (data: any) => void;
}

export interface UseRealTimeSyncReturn {
  isConnected: boolean;
  isOnline: boolean;
  syncStatus: 'connected' | 'disconnected' | 'reconnecting' | 'syncing';
  queueSize: number;
  subscriptionCount: number;
  lastSync: Date | null;
  error: Error | null;
  
  // Manual sync controls
  resync: () => Promise<void>;
  clearCache: () => void;
  
  // Subscription management
  subscribeToDataType: (dataType: string, filters?: Record<string, any>) => Promise<void>;
  unsubscribeFromDataType: (dataType: string, filters?: Record<string, any>) => Promise<void>;
}

export function useRealTimeSync(options: UseRealTimeSyncOptions = {}): UseRealTimeSyncReturn {
  const {
    enableDashboardSync = true,
    enableTaskSync = true,
    enableMetricSync = true,
    enableUserActivitySync = false,
    filters = {},
    onSyncError,
    onConflictDetected
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'syncing'>('disconnected');
  const [queueSize, setQueueSize] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Store actions
  const {
    setConnectionStatus,
    updateLastSync,
    updateWidgetData,
    addTask,
    updateTask,
    removeTask,
    setMetrics,
    updateMetricSummary
  } = useDataStore();

  const handlersRef = useRef({
    onSyncError,
    onConflictDetected
  });

  // Update handlers ref when props change
  useEffect(() => {
    handlersRef.current = {
      onSyncError,
      onConflictDetected
    };
  }, [onSyncError, onConflictDetected]);

  // Setup event listeners
  useEffect(() => {
    const handleSyncStatusChange = ({ status }: { status: string }) => {
      setSyncStatus(status as any);
      setIsConnected(status === 'connected' || status === 'reconnected');
      setConnectionStatus(status === 'connected' ? 'connected' : 
                         status === 'reconnecting' ? 'reconnecting' : 'disconnected');
    };

    const handleOnlineStatusChange = ({ isOnline }: { isOnline: boolean }) => {
      setIsOnline(isOnline);
    };

    const handleDataQueued = ({ queueSize }: { queueSize: number }) => {
      setQueueSize(queueSize);
    };

    const handleSyncTimeUpdated = ({ timestamp }: { timestamp: string }) => {
      const syncTime = new Date(timestamp);
      setLastSync(syncTime);
      updateLastSync();
    };

    const handleDashboardUpdated = ({ dashboardId, data, hasConflict }: any) => {
      if (hasConflict && handlersRef.current.onConflictDetected) {
        handlersRef.current.onConflictDetected(data);
      }
      // Update dashboard data in store
      // This would typically update the dashboard state
    };

    const handleWidgetUpdated = ({ widgetId, dashboardId, data }: any) => {
      updateWidgetData(widgetId, data);
    };

    const handleTaskCreated = ({ taskId, data }: any) => {
      addTask(data.task);
    };

    const handleTaskUpdated = ({ taskId, data }: any) => {
      updateTask(taskId, data.changes);
    };

    const handleTaskDeleted = ({ taskId }: any) => {
      removeTask(taskId);
    };

    const handleTaskMoved = ({ taskId, data }: any) => {
      updateTask(taskId, { 
        status: data.newStatus,
        columnId: data.newColumnId 
      });
    };

    const handleMetricUpdated = ({ metricType, userId, teamId, value, timestamp }: any) => {
      // Update metrics in analytics store
      const metric = {
        id: `${metricType}-${userId}-${Date.now()}`,
        userId,
        metricType,
        value,
        timestamp,
        aggregationPeriod: 'real-time',
        context: { teamId }
      };

      // This would update the metrics in the store
      // setMetrics(metricType, [metric]);
    };

    const handleUserActivity = ({ userId, activity, timestamp }: any) => {
      // Handle user activity updates
      // This could update presence indicators, activity feeds, etc.
    };

    const handleSubscriptionAdded = ({ dataType, filters }: any) => {
      setSubscriptionCount(prev => prev + 1);
    };

    const handleSubscriptionRemoved = ({ dataType, filters }: any) => {
      setSubscriptionCount(prev => Math.max(0, prev - 1));
    };

    const handleSubscriptionError = ({ dataType, filters, error }: any) => {
      setError(error);
      if (handlersRef.current.onSyncError) {
        handlersRef.current.onSyncError(error);
      }
    };

    const handleResyncStarted = () => {
      setSyncStatus('syncing');
    };

    const handleResyncError = ({ error }: { error: Error }) => {
      setError(error);
      setSyncStatus('connected');
      if (handlersRef.current.onSyncError) {
        handlersRef.current.onSyncError(error);
      }
    };

    // Add event listeners
    realTimeDataSync.on('sync_status_changed', handleSyncStatusChange);
    realTimeDataSync.on('online_status_changed', handleOnlineStatusChange);
    realTimeDataSync.on('data_queued', handleDataQueued);
    realTimeDataSync.on('sync_time_updated', handleSyncTimeUpdated);
    realTimeDataSync.on('dashboard_updated', handleDashboardUpdated);
    realTimeDataSync.on('widget_updated', handleWidgetUpdated);
    realTimeDataSync.on('task_created', handleTaskCreated);
    realTimeDataSync.on('task_updated', handleTaskUpdated);
    realTimeDataSync.on('task_deleted', handleTaskDeleted);
    realTimeDataSync.on('task_moved', handleTaskMoved);
    realTimeDataSync.on('metric_updated', handleMetricUpdated);
    realTimeDataSync.on('user_activity', handleUserActivity);
    realTimeDataSync.on('subscription_added', handleSubscriptionAdded);
    realTimeDataSync.on('subscription_removed', handleSubscriptionRemoved);
    realTimeDataSync.on('subscription_error', handleSubscriptionError);
    realTimeDataSync.on('resync_started', handleResyncStarted);
    realTimeDataSync.on('resync_error', handleResyncError);

    return () => {
      // Remove event listeners
      realTimeDataSync.off('sync_status_changed', handleSyncStatusChange);
      realTimeDataSync.off('online_status_changed', handleOnlineStatusChange);
      realTimeDataSync.off('data_queued', handleDataQueued);
      realTimeDataSync.off('sync_time_updated', handleSyncTimeUpdated);
      realTimeDataSync.off('dashboard_updated', handleDashboardUpdated);
      realTimeDataSync.off('widget_updated', handleWidgetUpdated);
      realTimeDataSync.off('task_created', handleTaskCreated);
      realTimeDataSync.off('task_updated', handleTaskUpdated);
      realTimeDataSync.off('task_deleted', handleTaskDeleted);
      realTimeDataSync.off('task_moved', handleTaskMoved);
      realTimeDataSync.off('metric_updated', handleMetricUpdated);
      realTimeDataSync.off('user_activity', handleUserActivity);
      realTimeDataSync.off('subscription_added', handleSubscriptionAdded);
      realTimeDataSync.off('subscription_removed', handleSubscriptionRemoved);
      realTimeDataSync.off('subscription_error', handleSubscriptionError);
      realTimeDataSync.off('resync_started', handleResyncStarted);
      realTimeDataSync.off('resync_error', handleResyncError);
    };
  }, []);

  // Auto-subscribe to enabled data types
  useEffect(() => {
    const subscribeToEnabledTypes = async () => {
      try {
        if (enableDashboardSync) {
          await realTimeDataSync.subscribeToDataType('dashboard', filters);
          await realTimeDataSync.subscribeToDataType('widget', filters);
        }

        if (enableTaskSync) {
          await realTimeDataSync.subscribeToDataType('task', filters);
        }

        if (enableMetricSync) {
          await realTimeDataSync.subscribeToDataType('metric', filters);
        }

        if (enableUserActivitySync) {
          await realTimeDataSync.subscribeToDataType('user_activity', filters);
        }
      } catch (error) {
        setError(error as Error);
        if (handlersRef.current.onSyncError) {
          handlersRef.current.onSyncError(error as Error);
        }
      }
    };

    if (isConnected) {
      subscribeToEnabledTypes();
    }
  }, [isConnected, enableDashboardSync, enableTaskSync, enableMetricSync, enableUserActivitySync, filters]);

  // Update connection status from service
  useEffect(() => {
    const updateStatus = () => {
      const status = realTimeDataSync.getConnectionStatus();
      setIsConnected(status.isConnected);
      setIsOnline(status.isOnline);
      setQueueSize(status.queueSize);
      setSubscriptionCount(status.subscriptionCount);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const resync = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      // Trigger a full resync
      realTimeDataSync.updateLastSyncTime();
      setSyncStatus('connected');
    } catch (error) {
      setError(error as Error);
      setSyncStatus('connected');
      throw error;
    }
  }, []);

  const clearCache = useCallback(() => {
    realTimeDataSync.clearCache();
    setError(null);
  }, []);

  const subscribeToDataType = useCallback(async (dataType: string, filters?: Record<string, any>) => {
    try {
      await realTimeDataSync.subscribeToDataType(dataType as any, filters);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  const unsubscribeFromDataType = useCallback(async (dataType: string, filters?: Record<string, any>) => {
    try {
      await realTimeDataSync.unsubscribeFromDataType(dataType as any, filters);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  return {
    isConnected,
    isOnline,
    syncStatus,
    queueSize,
    subscriptionCount,
    lastSync,
    error,
    resync,
    clearCache,
    subscribeToDataType,
    unsubscribeFromDataType
  };
}

export interface UseOfflineSyncOptions {
  enableOfflineMode?: boolean;
  maxQueueSize?: number;
  syncInterval?: number;
}

export interface UseOfflineSyncReturn {
  isOffline: boolean;
  queuedChanges: number;
  syncPending: boolean;
  queueChange: (type: string, data: any) => void;
  clearQueue: () => void;
  forcSync: () => Promise<void>;
}

/**
 * Hook for managing offline synchronization
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const {
    enableOfflineMode = true,
    maxQueueSize = 1000,
    syncInterval = 30000 // 30 seconds
  } = options;

  const [isOffline, setIsOffline] = useState(false);
  const [queuedChanges, setQueuedChanges] = useState(0);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    if (!enableOfflineMode) return;

    const handleOnlineStatusChange = ({ isOnline }: { isOnline: boolean }) => {
      setIsOffline(!isOnline);
    };

    const handleDataQueued = ({ queueSize }: { queueSize: number }) => {
      setQueuedChanges(queueSize);
    };

    const handleSyncQueueProcessed = () => {
      setSyncPending(false);
    };

    realTimeDataSync.on('online_status_changed', handleOnlineStatusChange);
    realTimeDataSync.on('data_queued', handleDataQueued);
    realTimeDataSync.on('sync_queue_processed', handleSyncQueueProcessed);

    return () => {
      realTimeDataSync.off('online_status_changed', handleOnlineStatusChange);
      realTimeDataSync.off('data_queued', handleDataQueued);
      realTimeDataSync.off('sync_queue_processed', handleSyncQueueProcessed);
    };
  }, [enableOfflineMode]);

  const queueChange = useCallback((type: string, data: any) => {
    if (enableOfflineMode) {
      realTimeDataSync.queueDataChange(type, data);
    }
  }, [enableOfflineMode]);

  const clearQueue = useCallback(() => {
    // This would clear the sync queue
    setQueuedChanges(0);
  }, []);

  const forcSync = useCallback(async () => {
    setSyncPending(true);
    try {
      // Force sync queued changes
      realTimeDataSync.updateLastSyncTime();
    } catch (error) {
      setSyncPending(false);
      throw error;
    }
  }, []);

  return {
    isOffline,
    queuedChanges,
    syncPending,
    queueChange,
    clearQueue,
    forcSync
  };
}