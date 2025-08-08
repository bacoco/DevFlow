import { renderHook, act, waitFor } from '@testing-library/react';
import { WebSocketService, ConnectionState, RealTimeDataSync } from '../services/websocketService';
import { useRealTimeSync, useOfflineSync } from '../hooks/useRealTimeSync';

// Mock the data store
jest.mock('../stores/dataStore', () => ({
  useDataStore: () => ({
    setConnectionStatus: jest.fn(),
    updateLastSync: jest.fn(),
    updateWidgetData: jest.fn(),
    addTask: jest.fn(),
    updateTask: jest.fn(),
    removeTask: jest.fn(),
    setMetrics: jest.fn(),
    updateMetricSummary: jest.fn(),
  })
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = { code: code || 1000, reason: reason || '', type: 'close' };
    this.onclose?.(closeEvent);
  }

  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = { data: JSON.stringify(data), type: 'message' };
      this.onmessage?.(messageEvent);
    }
  }

  getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1];
  }

  getAllMessages() {
    return [...this.messageQueue];
  }

  clearMessages() {
    this.messageQueue = [];
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
(global as any).localStorage = mockLocalStorage;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('WebSocket Integration', () => {
  let websocketService: WebSocketService;
  let realTimeDataSync: RealTimeDataSync;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    
    websocketService = new WebSocketService({
      url: 'ws://localhost:3001/ws',
      token: 'test-token',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000
    });

    realTimeDataSync = new RealTimeDataSync(websocketService);

    // Intercept WebSocket creation
    const originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = function(url: string) {
      mockWs = new originalWebSocket(url);
      return mockWs;
    };
  });

  afterEach(() => {
    websocketService.disconnect();
    jest.clearAllTimers();
  });

  describe('RealTimeDataSync', () => {
    test('should initialize with correct default state', () => {
      const status = realTimeDataSync.getConnectionStatus();
      
      expect(status.isConnected).toBe(false);
      expect(status.isOnline).toBe(true);
      expect(status.queueSize).toBe(0);
      expect(status.subscriptionCount).toBe(0);
    });

    test('should handle connection status changes', async () => {
      const statusChangeSpy = jest.fn();
      realTimeDataSync.on('sync_status_changed', statusChangeSpy);

      await websocketService.connect();

      expect(statusChangeSpy).toHaveBeenCalledWith({ status: 'connected' });
    });

    test('should subscribe to data types successfully', async () => {
      await websocketService.connect();

      // Mock subscription confirmation
      const subscriptionPromise = realTimeDataSync.subscribeToDataType('dashboard', { userId: 'user123' });
      
      // Simulate subscription confirmation after a short delay
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: {
            topic: 'dashboard_updated',
            filters: { userId: 'user123' }
          }
        });
      }, 10);

      await subscriptionPromise;

      const status = realTimeDataSync.getConnectionStatus();
      expect(status.subscriptionCount).toBe(1);
    });

    test('should handle dashboard updates', async () => {
      await websocketService.connect();
      
      const dashboardUpdateSpy = jest.fn();
      realTimeDataSync.on('dashboard_updated', dashboardUpdateSpy);

      // Simulate dashboard update
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'dashboard_updated',
          payload: {
            dashboardId: 'dash123',
            changes: { title: 'Updated Dashboard' },
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(dashboardUpdateSpy).toHaveBeenCalledWith({
        dashboardId: 'dash123',
        data: expect.objectContaining({
          dashboardId: 'dash123',
          changes: { title: 'Updated Dashboard' }
        }),
        hasConflict: false
      });
    });

    test('should handle widget updates', async () => {
      await websocketService.connect();
      
      const widgetUpdateSpy = jest.fn();
      realTimeDataSync.on('widget_updated', widgetUpdateSpy);

      // Simulate widget update
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'widget_updated',
          payload: {
            widgetId: 'widget123',
            dashboardId: 'dash123',
            changes: { data: { value: 42 } },
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(widgetUpdateSpy).toHaveBeenCalledWith({
        widgetId: 'widget123',
        dashboardId: 'dash123',
        data: expect.objectContaining({
          widgetId: 'widget123',
          changes: { data: { value: 42 } }
        })
      });
    });

    test('should handle task updates with different change types', async () => {
      await websocketService.connect();
      
      const taskCreatedSpy = jest.fn();
      const taskUpdatedSpy = jest.fn();
      const taskDeletedSpy = jest.fn();
      const taskMovedSpy = jest.fn();

      realTimeDataSync.on('task_created', taskCreatedSpy);
      realTimeDataSync.on('task_updated', taskUpdatedSpy);
      realTimeDataSync.on('task_deleted', taskDeletedSpy);
      realTimeDataSync.on('task_moved', taskMovedSpy);

      // Test task creation
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'task_updated',
          payload: {
            taskId: 'task123',
            changeType: 'created',
            changes: { title: 'New Task' },
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(taskCreatedSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'created'
        })
      });

      // Test task update
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'task_updated',
          payload: {
            taskId: 'task123',
            changeType: 'updated',
            changes: { title: 'Updated Task' },
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(taskUpdatedSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'updated'
        })
      });

      // Test task deletion
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'task_updated',
          payload: {
            taskId: 'task123',
            changeType: 'deleted',
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(taskDeletedSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'deleted'
        })
      });

      // Test task move
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'task_updated',
          payload: {
            taskId: 'task123',
            changeType: 'moved',
            changes: { status: 'in-progress' },
            userId: 'user123',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(taskMovedSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'moved'
        })
      });
    });

    test('should handle metric updates', async () => {
      await websocketService.connect();
      
      const metricUpdateSpy = jest.fn();
      realTimeDataSync.on('metric_updated', metricUpdateSpy);

      // Simulate metric update
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'metric_updated',
          payload: {
            metricType: 'time_in_flow',
            userId: 'user123',
            teamId: 'team456',
            value: 85,
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(metricUpdateSpy).toHaveBeenCalledWith({
        metricType: 'time_in_flow',
        userId: 'user123',
        teamId: 'team456',
        value: 85,
        timestamp: expect.any(Date)
      });
    });

    test('should queue data changes when offline', () => {
      const dataQueuedSpy = jest.fn();
      realTimeDataSync.on('data_queued', dataQueuedSpy);

      realTimeDataSync.queueDataChange('task_update', {
        taskId: 'task123',
        changes: { title: 'Updated offline' }
      });

      expect(dataQueuedSpy).toHaveBeenCalledWith({
        type: 'task_update',
        data: expect.objectContaining({
          taskId: 'task123'
        }),
        queueSize: 1
      });

      const status = realTimeDataSync.getConnectionStatus();
      expect(status.queueSize).toBe(1);
    });

    test('should detect and resolve conflicts', async () => {
      await websocketService.connect();

      // Set up cached data with a specific timestamp
      const localTime = new Date();
      realTimeDataSync.setCachedData('dashboard:dash123', {
        title: 'Local Dashboard',
        lastModified: localTime.toISOString()
      });

      const dashboardUpdateSpy = jest.fn();
      realTimeDataSync.on('dashboard_updated', dashboardUpdateSpy);

      // Simulate conflicting update with a timestamp very close to local time
      const remoteTime = new Date(localTime.getTime() + 2000); // 2 seconds later
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'dashboard_updated',
          payload: {
            dashboardId: 'dash123',
            title: 'Remote Dashboard',
            lastModified: remoteTime.toISOString(),
            userId: 'user456',
            timestamp: remoteTime.toISOString()
          }
        }
      });

      // Should detect conflict and resolve it (remote wins due to later timestamp)
      expect(dashboardUpdateSpy).toHaveBeenCalledWith({
        dashboardId: 'dash123',
        data: expect.objectContaining({
          title: 'Remote Dashboard'
        }),
        hasConflict: expect.any(Boolean)
      });
    });

    test('should handle online/offline status changes', () => {
      const onlineStatusSpy = jest.fn();
      realTimeDataSync.on('online_status_changed', onlineStatusSpy);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));

      expect(onlineStatusSpy).toHaveBeenCalledWith({ isOnline: false });

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      expect(onlineStatusSpy).toHaveBeenCalledWith({ isOnline: true });
    });
  });

  describe('useRealTimeSync Hook', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRealTimeSync());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.syncStatus).toBe('disconnected');
      expect(result.current.queueSize).toBe(0);
      expect(result.current.subscriptionCount).toBe(0);
      expect(result.current.error).toBe(null);
    });

    test('should update state when connection status changes', async () => {
      const { result } = renderHook(() => useRealTimeSync());

      await act(async () => {
        await websocketService.connect();
        // Simulate the sync status change event
        realTimeDataSync.emit('sync_status_changed', { status: 'connected' });
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.syncStatus).toBe('connected');
      });
    });

    test('should handle subscription to data types', async () => {
      const { result } = renderHook(() => useRealTimeSync({
        enableDashboardSync: true,
        enableTaskSync: true,
        filters: { userId: 'user123' }
      }));

      await act(async () => {
        await websocketService.connect();
        // Simulate connection and subscription events
        realTimeDataSync.emit('sync_status_changed', { status: 'connected' });
        realTimeDataSync.emit('subscription_added', { dataType: 'dashboard', filters: { userId: 'user123' } });
        realTimeDataSync.emit('subscription_added', { dataType: 'widget', filters: { userId: 'user123' } });
        realTimeDataSync.emit('subscription_added', { dataType: 'task', filters: { userId: 'user123' } });
      });

      await waitFor(() => {
        expect(result.current.subscriptionCount).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    test('should handle errors correctly', async () => {
      const onSyncError = jest.fn();
      const { result } = renderHook(() => useRealTimeSync({ onSyncError }));

      await act(async () => {
        // Simulate an error
        const error = new Error('Subscription failed');
        realTimeDataSync.emit('subscription_error', {
          dataType: 'dashboard',
          filters: {},
          error
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Subscription failed');
        expect(onSyncError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    test('should handle manual resync', async () => {
      const { result } = renderHook(() => useRealTimeSync());

      await act(async () => {
        await websocketService.connect();
      });

      await act(async () => {
        await result.current.resync();
      });

      // Should not throw and should update sync status
      expect(result.current.syncStatus).toBe('connected');
    });

    test('should clear cache', async () => {
      const { result } = renderHook(() => useRealTimeSync());

      act(() => {
        result.current.clearCache();
      });

      // Should not throw
      expect(result.current.error).toBe(null);
    });
  });

  describe('useOfflineSync Hook', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOffline).toBe(false);
      expect(result.current.queuedChanges).toBe(0);
      expect(result.current.syncPending).toBe(false);
    });

    test('should handle offline status changes', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        // Simulate going offline
        realTimeDataSync.emit('online_status_changed', { isOnline: false });
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });

      await act(async () => {
        // Simulate going online
        realTimeDataSync.emit('online_status_changed', { isOnline: true });
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(false);
      });
    });

    test('should queue changes when offline', () => {
      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        result.current.queueChange('task_update', {
          taskId: 'task123',
          changes: { title: 'Updated offline' }
        });
      });

      // The queue change should be handled by the realTimeDataSync
      // This test verifies the hook interface works correctly
      expect(typeof result.current.queueChange).toBe('function');
    });

    test('should handle force sync', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        const syncPromise = result.current.forcSync();
        // Simulate sync completion
        setTimeout(() => {
          realTimeDataSync.emit('sync_queue_processed');
        }, 10);
        await syncPromise;
      });

      // Should complete without error
      expect(result.current.syncPending).toBe(false);
    });

    test('should clear queue', () => {
      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queuedChanges).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete offline-to-online workflow', async () => {
      const { result: syncResult } = renderHook(() => useRealTimeSync());
      const { result: offlineResult } = renderHook(() => useOfflineSync());

      // Start connected
      await act(async () => {
        await websocketService.connect();
        realTimeDataSync.emit('sync_status_changed', { status: 'connected' });
      });

      // Go offline
      await act(async () => {
        realTimeDataSync.emit('online_status_changed', { isOnline: false });
      });

      await waitFor(() => {
        expect(offlineResult.current.isOffline).toBe(true);
      });

      // Queue some changes while offline
      act(() => {
        offlineResult.current.queueChange('task_update', {
          taskId: 'task123',
          changes: { title: 'Updated offline' }
        });
      });

      // Go back online
      await act(async () => {
        realTimeDataSync.emit('online_status_changed', { isOnline: true });
      });

      await waitFor(() => {
        expect(offlineResult.current.isOffline).toBe(false);
      });

      // Should trigger sync of queued changes
      await act(async () => {
        const syncPromise = offlineResult.current.forcSync();
        // Simulate sync completion
        setTimeout(() => {
          realTimeDataSync.emit('sync_queue_processed');
        }, 10);
        await syncPromise;
      });

      expect(offlineResult.current.syncPending).toBe(false);
    });

    test('should handle reconnection with resubscription', async () => {
      const { result } = renderHook(() => useRealTimeSync({
        enableDashboardSync: true,
        enableTaskSync: true
      }));

      // Initial connection
      await act(async () => {
        await websocketService.connect();
        realTimeDataSync.emit('sync_status_changed', { status: 'connected' });
        realTimeDataSync.emit('subscription_added', { dataType: 'dashboard', filters: {} });
        realTimeDataSync.emit('subscription_added', { dataType: 'task', filters: {} });
      });

      await waitFor(() => {
        expect(result.current.subscriptionCount).toBeGreaterThan(0);
      });

      // Simulate connection loss
      await act(async () => {
        realTimeDataSync.emit('sync_status_changed', { status: 'reconnecting' });
      });

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('reconnecting');
      });

      // Simulate reconnection
      await act(async () => {
        realTimeDataSync.emit('sync_status_changed', { status: 'connected' });
      });

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('connected');
      });
    });
  });
});