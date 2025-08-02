import { WebSocketService, ConnectionState } from '../services/websocketService';

// Mock CloseEvent for test environment
class MockCloseEvent {
  code: number;
  reason: string;
  type = 'close';

  constructor(type: string, options: { code?: number; reason?: string } = {}) {
    this.code = options.code || 1000;
    this.reason = options.reason || '';
  }
}

// Mock MessageEvent for test environment
class MockMessageEvent {
  data: string;
  type = 'message';

  constructor(type: string, options: { data: string }) {
    this.data = options.data;
  }
}

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
    // Simulate async connection
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
    const closeEvent = new MockCloseEvent('close', { code: code || 1000, reason: reason || '' });
    this.onclose?.(closeEvent);
  }

  ping() {
    // Simulate ping
  }

  // Test helpers
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = new MockMessageEvent('message', { data: JSON.stringify(data) });
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

// Mock global WebSocket and events
(global as any).WebSocket = MockWebSocket;
(global as any).CloseEvent = MockCloseEvent;
(global as any).MessageEvent = MockMessageEvent;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    service = new WebSocketService({
      url: 'ws://localhost:3001/ws',
      token: 'test-token',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000
    });

    // Intercept WebSocket creation
    const originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = function(url: string) {
      mockWs = new originalWebSocket(url);
      return mockWs;
    };
  });

  afterEach(() => {
    service.disconnect();
    jest.clearAllTimers();
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      const connectPromise = service.connect();
      
      expect(service.getConnectionState()).toBe(ConnectionState.CONNECTING);
      
      await connectPromise;
      
      expect(service.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(service.isConnected()).toBe(true);
    });

    test('should handle connection failure', async () => {
      const originalWebSocket = (global as any).WebSocket;
      (global as any).WebSocket = function(url: string) {
        const ws = new originalWebSocket(url);
        // Override to simulate immediate error
        setTimeout(() => {
          ws.readyState = MockWebSocket.CLOSED;
          ws.onerror?.(new Event('error'));
        }, 5);
        return ws;
      };

      await expect(service.connect()).rejects.toThrow();
    });

    test('should disconnect cleanly', async () => {
      await service.connect();
      
      const disconnectSpy = jest.fn();
      service.on('disconnected', disconnectSpy);
      
      service.disconnect();
      
      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(service.isConnected()).toBe(false);
    });

    test('should build connection URL with token', async () => {
      await service.connect();
      
      expect(mockWs.url).toContain('ws://localhost:3001/ws?token=test-token');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await service.connect();
      mockWs.clearMessages();
    });

    test('should subscribe to topic successfully', async () => {
      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Simulate subscription confirmation
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);

      await service.subscribe(subscriptionOptions);

      const lastMessage = JSON.parse(mockWs.getLastMessage());
      expect(lastMessage.type).toBe('subscribe');
      expect(lastMessage.data).toEqual(subscriptionOptions);
      
      const subscriptions = service.getSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toEqual(subscriptionOptions);
    });

    test('should unsubscribe from topic successfully', async () => {
      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Subscribe first
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);
      await service.subscribe(subscriptionOptions);

      mockWs.clearMessages();

      // Unsubscribe
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'unsubscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);

      await service.unsubscribe(subscriptionOptions);

      const lastMessage = JSON.parse(mockWs.getLastMessage());
      expect(lastMessage.type).toBe('unsubscribe');
      expect(lastMessage.data).toEqual(subscriptionOptions);
      
      const subscriptions = service.getSubscriptions();
      expect(subscriptions).toHaveLength(0);
    });

    test('should handle subscription error', async () => {
      const subscriptionOptions = {
        topic: 'invalid_topic',
        filters: {}
      };

      // Simulate error response
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'error',
          data: { message: 'Invalid topic' }
        });
      }, 10);

      await expect(service.subscribe(subscriptionOptions)).rejects.toThrow('Invalid topic');
    });

    test('should emit topic-specific events', async () => {
      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Subscribe first
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);
      await service.subscribe(subscriptionOptions);

      const topicDataSpy = jest.fn();
      service.on('topic:metric_updated', topicDataSpy);

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
  });

  describe('Reconnection Logic', () => {
    beforeEach(async () => {
      await service.connect();
    });

    test('should attempt reconnection on abnormal close', (done) => {
      const reconnectingSpy = jest.fn();
      service.on('reconnecting', reconnectingSpy);

      // Simulate abnormal close
      mockWs.close(1006, 'Connection lost');

      setTimeout(() => {
        expect(service.getConnectionState()).toBe(ConnectionState.RECONNECTING);
        expect(reconnectingSpy).toHaveBeenCalledWith({ attempt: 1 });
        done();
      }, 50);
    });

    test('should resubscribe after reconnection', async () => {
      const subscriptionOptions = {
        topic: 'metric_updated',
        filters: { userId: 'user123' }
      };

      // Subscribe first
      setTimeout(() => {
        mockWs.simulateMessage({
          type: 'subscription_confirmed',
          data: subscriptionOptions
        });
      }, 10);
      await service.subscribe(subscriptionOptions);

      // Simulate connection loss and reconnection
      mockWs.close(1006, 'Connection lost');

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check that resubscription happened
      const messages = mockWs.getAllMessages();
      const subscribeMessages = messages.filter(msg => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'subscribe';
      });

      expect(subscribeMessages.length).toBeGreaterThan(1); // Original + resubscription
    });

    test('should stop reconnecting after max attempts', (done) => {
      const reconnectionFailedSpy = jest.fn();
      service.on('reconnection_failed', reconnectionFailedSpy);

      // Mock failed reconnections
      const originalWebSocket = (global as any).WebSocket;
      (global as any).WebSocket = function(url: string) {
        const ws = new originalWebSocket(url);
        setTimeout(() => {
          ws.readyState = MockWebSocket.CLOSED;
          ws.onerror?.(new Event('error'));
        }, 5);
        return ws;
      };

      // Simulate abnormal close
      mockWs.close(1006, 'Connection lost');

      setTimeout(() => {
        expect(reconnectionFailedSpy).toHaveBeenCalled();
        expect(service.getConnectionState()).toBe(ConnectionState.ERROR);
        done();
      }, 500);
    });
  });

  describe('Heartbeat Mechanism', () => {
    beforeEach(async () => {
      await service.connect();
    });

    test('should send ping messages periodically', (done) => {
      jest.useFakeTimers();
      
      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(1000);
      
      const messages = mockWs.getAllMessages();
      const pingMessage = messages.find(msg => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'ping';
      });

      expect(pingMessage).toBeDefined();
      
      jest.useRealTimers();
      done();
    });

    test('should handle pong responses', async () => {
      // Simulate pong response
      mockWs.simulateMessage({
        type: 'pong',
        data: { timestamp: new Date().toISOString() }
      });

      // Should not close connection
      expect(service.isConnected()).toBe(true);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await service.connect();
    });

    test('should handle connection established message', async () => {
      const connectionEstablishedSpy = jest.fn();
      service.on('connection_established', connectionEstablishedSpy);

      mockWs.simulateMessage({
        type: 'connection_established',
        data: {
          connectionId: 'conn123',
          user: { id: 'user123', name: 'Test User' }
        }
      });

      expect(connectionEstablishedSpy).toHaveBeenCalled();
      expect(service.getConnectionId()).toBe('conn123');
    });

    test('should handle error messages', async () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);

      mockWs.simulateMessage({
        type: 'error',
        data: { message: 'Test error' }
      });

      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error'
      }));
    });

    test('should handle malformed messages gracefully', async () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);

      // Simulate malformed JSON
      const messageEvent = new MessageEvent('message', { data: 'invalid json' });
      mockWs.onmessage?.(messageEvent);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    test('should emit state change events', async () => {
      const stateChangeSpy = jest.fn();
      service.on('state_change', stateChangeSpy);

      await service.connect();

      expect(stateChangeSpy).toHaveBeenCalledWith({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING
      });

      expect(stateChangeSpy).toHaveBeenCalledWith({
        from: ConnectionState.CONNECTING,
        to: ConnectionState.CONNECTED
      });
    });

    test('should track connection state correctly', async () => {
      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      
      const connectPromise = service.connect();
      expect(service.getConnectionState()).toBe(ConnectionState.CONNECTING);
      
      await connectPromise;
      expect(service.getConnectionState()).toBe(ConnectionState.CONNECTED);
      
      service.disconnect();
      expect(service.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });
});