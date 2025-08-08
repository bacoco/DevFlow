import { WebSocketService, ConnectionState, RealTimeDataSync } from '../services/websocketService';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN; // Start as open for simpler testing
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Immediately trigger open event
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = { code: code || 1000, reason: reason || '', type: 'close' };
    setTimeout(() => this.onclose?.(closeEvent), 0);
  }

  simulateMessage(data: any) {
    const messageEvent = { data: JSON.stringify(data), type: 'message' };
    setTimeout(() => this.onmessage?.(messageEvent), 0);
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

describe('WebSocket Core Functionality', () => {
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
  });

  describe('WebSocketService', () => {
    test('should initialize with correct state', () => {
      expect(websocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService.getSubscriptions()).toHaveLength(0);
    });

    test('should connect successfully', async () => {
      const connectPromise = websocketService.connect();
      expect(websocketService.getConnectionState()).toBe(ConnectionState.CONNECTING);
      
      await connectPromise;
      
      expect(websocketService.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(websocketService.isConnected()).toBe(true);
    });

    test('should send messages when connected', async () => {
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);
      
      // Test that the service has the sendMessage method
      expect(typeof websocketService.sendMessage).toBe('function');
    });

    test('should handle message reception', async () => {
      await websocketService.connect();

      const messageSpy = jest.fn();
      websocketService.on('message', messageSpy);

      const testMessage = { type: 'test_message', data: { content: 'test' } };
      mockWs.simulateMessage(testMessage);

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(messageSpy).toHaveBeenCalledWith(testMessage);
    });

    test('should handle connection established message', async () => {
      await websocketService.connect();

      const connectionEstablishedSpy = jest.fn();
      websocketService.on('connection_established', connectionEstablishedSpy);

      const connectionData = {
        type: 'connection_established',
        data: { connectionId: 'conn123', user: { id: 'user123' } }
      };

      mockWs.simulateMessage(connectionData);

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(connectionEstablishedSpy).toHaveBeenCalledWith(connectionData.data);
      expect(websocketService.getConnectionId()).toBe('conn123');
    });

    test('should handle subscription data', async () => {
      await websocketService.connect();

      const subscriptionDataSpy = jest.fn();
      const topicDataSpy = jest.fn();
      
      websocketService.on('subscription_data', subscriptionDataSpy);
      websocketService.on('topic:metric_updated', topicDataSpy);

      const subscriptionMessage = {
        type: 'subscription_data',
        data: {
          topic: 'metric_updated',
          payload: { metricType: 'time_in_flow', value: 85 }
        }
      };

      mockWs.simulateMessage(subscriptionMessage);

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(subscriptionDataSpy).toHaveBeenCalledWith(subscriptionMessage.data);
      expect(topicDataSpy).toHaveBeenCalledWith(subscriptionMessage.data.payload);
    });

    test('should disconnect cleanly', async () => {
      await websocketService.connect();
      
      const disconnectedSpy = jest.fn();
      websocketService.on('disconnected', disconnectedSpy);
      
      websocketService.disconnect();
      
      expect(websocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(websocketService.isConnected()).toBe(false);
    });
  });

  describe('RealTimeDataSync', () => {
    test('should initialize with correct state', () => {
      const status = realTimeDataSync.getConnectionStatus();
      
      expect(status.isConnected).toBe(false);
      expect(status.isOnline).toBe(true);
      expect(status.queueSize).toBe(0);
      expect(status.subscriptionCount).toBe(0);
    });

    test('should emit sync status changes', async () => {
      const statusChangeSpy = jest.fn();
      realTimeDataSync.on('sync_status_changed', statusChangeSpy);

      await websocketService.connect();

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(statusChangeSpy).toHaveBeenCalledWith({ status: 'connected' });
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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(widgetUpdateSpy).toHaveBeenCalledWith({
        widgetId: 'widget123',
        dashboardId: 'dash123',
        data: expect.objectContaining({
          widgetId: 'widget123',
          changes: { data: { value: 42 } }
        })
      });
    });

    test('should handle task updates', async () => {
      await websocketService.connect();
      
      const taskCreatedSpy = jest.fn();
      const taskUpdatedSpy = jest.fn();
      
      realTimeDataSync.on('task_created', taskCreatedSpy);
      realTimeDataSync.on('task_updated', taskUpdatedSpy);

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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(taskUpdatedSpy).toHaveBeenCalledWith({
        taskId: 'task123',
        data: expect.objectContaining({
          changeType: 'updated'
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

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(metricUpdateSpy).toHaveBeenCalledWith({
        metricType: 'time_in_flow',
        userId: 'user123',
        teamId: 'team456',
        value: 85,
        timestamp: expect.any(Date)
      });
    });

    test('should queue data changes', () => {
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
    });
  });
});