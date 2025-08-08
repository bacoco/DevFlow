import { WebSocketService, ConnectionState, RealTimeDataSync } from '../services/websocketService';

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

describe('WebSocket Real-time Sync', () => {
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

  describe('WebSocketService Core Functionality', () => {
    test('should connect successfully', async () => {
      const connectPromise = websocketService.connect();
      
      expect(websocketService.getConnectionState()).toBe(ConnectionState.CONNECTING);
      
      await connectPromise;
      
      expect(websocketService.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(websocketService.isConnected()).toBe(true);
    });

    test('should disconnect cleanly', async () => {
      await websocketService.connect();
      
      const disconnectSpy = jest.fn();
      websocketService.on('disconnected', disconnectSpy);
      
      websocketService.disconnect();
      
      expect(websocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(websocketService.isConnected()).toBe(false);
    });

    test('should handle subscription and unsubscription', async () => {
      await websocketService.connect();
      mockWs.clearMessages();

      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Mock subscription confirmation
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);

      await websocketService.subscribe(subscriptionOptions);

      const lastMessage = JSON.parse(mockWs.getLastMessage());
      expect(lastMessage.type).toBe('subscribe');
      expect(lastMessage.data).toEqual(subscriptionOptions);
      
      const subscriptions = websocketService.getSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toEqual(subscriptionOptions);

      // Test unsubscription
      mockWs.clearMessages();
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'unsubscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);

      await websocketService.unsubscribe(subscriptionOptions);

      const unsubscribeMessage = JSON.parse(mockWs.getLastMessage());
      expect(unsubscribeMessage.type).toBe('unsubscribe');
      expect(unsubscribeMessage.data).toEqual(subscriptionOptions);
      
      const finalSubscriptions = websocketService.getSubscriptions();
      expect(finalSubscriptions).toHaveLength(0);
    });

    test('should emit topic-specific events', async () => {
      await websocketService.connect();

      const topicDataSpy = jest.fn();
      websocketService.on('topic:metric_updated', topicDataSpy);

      // Simulate topic data
      const testData = { metricType: 'time_in_flow', value: 85 };
      mockWs.simulateMessage({
        type: 'subscription_data',
        data: {
          topic: 'metric_updated',
          payload: testData
        }
      });

      expect(topicDataSpy).toHaveBeenCalledWith(testData);
    });

    test('should handle heartbeat mechanism', async () => {
      jest.useFakeTimers();
      await websocketService.connect();
      mockWs.clearMessages();
      
      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(1000);
      
      const messages = mockWs.getAllMessages();
      const pingMessage = messages.find(msg => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'ping';
      });

      expect(pingMessage).toBeDefined();
      
      jest.useRealTimers();
    });
  });

  describe('RealTimeDataSync Functionality', () => {
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

    test('should subscribe to data types', async () => {
      await websocketService.connect();

      // Mock subscription confirmation
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: {
            topic: 'dashboard_updated',
            filters: { userId: 'user123' }
          }
        });
      }, 10);

      await realTimeDataSync.subscribeToDataType('dashboard', { userId: 'user123' });

      const status = realTimeDataSync.getConnectionStatus();
      expect(status.subscriptionCount).toBe(1);
    });

    test('should handle real-time data updates', async () => {
      await websocketService.connect();
      
      const dashboardUpdateSpy = jest.fn();
      const widgetUpdateSpy = jest.fn();
      const taskUpdateSpy = jest.fn();
      const metricUpdateSpy = jest.fn();

      realTimeDataSync.on('dashboard_updated', dashboardUpdateSpy);
      realTimeDataSync.on('widget_updated', widgetUpdateSpy);
      realTimeDataSync.on('task_created', taskUpdateSpy);
      realTimeDataSync.on('metric_updated', metricUpdateSpy);

      // Test dashboard update
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

      // Test widget update
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

      expect(taskUpdateSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'created'
        })
      });

      // Test metric update
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

    test('should manage cached data', () => {
      const testData = { id: 'test123', value: 'test data' };
      
      realTimeDataSync.setCachedData('test:key', testData);
      const retrievedData = realTimeDataSync.getCachedData('test:key');
      
      expect(retrievedData).toEqual(testData);
      
      realTimeDataSync.clearCache();
      const clearedData = realTimeDataSync.getCachedData('test:key');
      
      expect(clearedData).toBeUndefined();
    });

    test('should update last sync time', () => {
      const syncTimeSpy = jest.fn();
      realTimeDataSync.on('sync_time_updated', syncTimeSpy);

      realTimeDataSync.updateLastSyncTime();

      expect(syncTimeSpy).toHaveBeenCalledWith({
        timestamp: expect.any(String)
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'devflow_last_sync',
        expect.any(String)
      );
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle reconnection workflow', async () => {
      const reconnectingSpy = jest.fn();
      const reconnectedSpy = jest.fn();
      
      websocketService.on('reconnecting', reconnectingSpy);
      websocketService.on('reconnected', reconnectedSpy);

      // Initial connection
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      // Simulate connection loss
      mockWs.close(1006, 'Connection lost');

      // Should trigger reconnection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(reconnectingSpy).toHaveBeenCalledWith({ attempt: 1 });
      expect(websocketService.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    test('should handle subscription management across reconnections', async () => {
      await websocketService.connect();

      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Initial subscription
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);

      await websocketService.subscribe(subscriptionOptions);
      expect(websocketService.getSubscriptions()).toHaveLength(1);

      // Simulate connection loss
      mockWs.close(1006, 'Connection lost');

      // Subscriptions should be maintained for resubscription
      expect(websocketService.getSubscriptions()).toHaveLength(1);
    });
  });
});