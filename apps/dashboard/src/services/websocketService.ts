import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface SubscriptionOptions {
  topic: string;
  filters?: Record<string, any>;
}

export interface ConnectionOptions {
  url: string;
  token?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private options: Required<ConnectionOptions>;
  private subscriptions = new Map<string, SubscriptionOptions>();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastPongReceived = Date.now();
  private connectionId: string | null = null;

  constructor(options: ConnectionOptions) {
    super();
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    };
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        resolve();
        return;
      }

      this.setConnectionState(ConnectionState.CONNECTING);

      try {
        const url = this.buildConnectionUrl();
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          this.handleError(error);
          if (this.connectionState === ConnectionState.CONNECTING) {
            reject(error);
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.setConnectionState(ConnectionState.ERROR);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.subscriptions.clear();
    this.connectionId = null;
  }

  /**
   * Subscribe to a topic
   */
  public subscribe(options: SubscriptionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState !== ConnectionState.CONNECTED) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const subscriptionKey = this.createSubscriptionKey(options);
      this.subscriptions.set(subscriptionKey, options);

      const message: WebSocketMessage = {
        type: 'subscribe',
        data: options
      };

      this.sendMessage(message);

      // Wait for subscription confirmation
      const confirmationHandler = (data: any) => {
        if (data.type === 'subscription_confirmed' && 
            data.data.topic === options.topic &&
            JSON.stringify(data.data.filters || {}) === JSON.stringify(options.filters || {})) {
          this.removeListener('message', confirmationHandler);
          resolve();
        }
      };

      const errorHandler = (data: any) => {
        if (data.type === 'error') {
          this.removeListener('message', confirmationHandler);
          this.removeListener('message', errorHandler);
          reject(new Error(data.data.message));
        }
      };

      this.on('message', confirmationHandler);
      this.on('message', errorHandler);

      // Timeout for subscription
      setTimeout(() => {
        this.removeListener('message', confirmationHandler);
        this.removeListener('message', errorHandler);
        reject(new Error('Subscription timeout'));
      }, 5000);
    });
  }

  /**
   * Unsubscribe from a topic
   */
  public unsubscribe(options: SubscriptionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState !== ConnectionState.CONNECTED) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const subscriptionKey = this.createSubscriptionKey(options);
      this.subscriptions.delete(subscriptionKey);

      const message: WebSocketMessage = {
        type: 'unsubscribe',
        data: options
      };

      this.sendMessage(message);

      // Wait for unsubscription confirmation
      const confirmationHandler = (data: any) => {
        if (data.type === 'unsubscription_confirmed' && 
            data.data.topic === options.topic &&
            JSON.stringify(data.data.filters || {}) === JSON.stringify(options.filters || {})) {
          this.removeListener('message', confirmationHandler);
          resolve();
        }
      };

      this.on('message', confirmationHandler);

      // Timeout for unsubscription
      setTimeout(() => {
        this.removeListener('message', confirmationHandler);
        resolve(); // Don't reject on timeout for unsubscribe
      }, 5000);
    });
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection ID
   */
  public getConnectionId(): string | null {
    return this.connectionId;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Get active subscriptions
   */
  public getSubscriptions(): SubscriptionOptions[] {
    return Array.from(this.subscriptions.values());
  }

  private buildConnectionUrl(): string {
    const url = new URL(this.options.url);
    if (this.options.token) {
      url.searchParams.set('token', this.options.token);
    }
    return url.toString();
  }

  private handleOpen(): void {
    this.setConnectionState(ConnectionState.CONNECTED);
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.emit('connected');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connection_established':
          this.connectionId = message.data.connectionId;
          this.emit('connection_established', message.data);
          break;
          
        case 'subscription_data':
          this.emit('subscription_data', message.data);
          this.emit(`topic:${message.data.topic}`, message.data.payload);
          break;
          
        case 'pong':
          this.lastPongReceived = Date.now();
          break;
          
        case 'error':
          this.emit('error', new Error(message.data.message));
          break;
          
        default:
          this.emit('message', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.clearHeartbeatTimer();
    this.connectionId = null;

    if (event.code === 1000) {
      // Normal closure
      this.setConnectionState(ConnectionState.DISCONNECTED);
      this.emit('disconnected', { code: event.code, reason: event.reason });
    } else {
      // Abnormal closure - attempt reconnection
      this.setConnectionState(ConnectionState.RECONNECTING);
      this.emit('disconnected', { code: event.code, reason: event.reason });
      this.attemptReconnection();
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setConnectionState(ConnectionState.ERROR);
      this.emit('reconnection_failed');
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        // Resubscribe to all previous subscriptions
        await this.resubscribeAll();
        this.emit('reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1)); // Exponential backoff
  }

  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values());
    
    for (const subscription of subscriptions) {
      try {
        await this.subscribe(subscription);
      } catch (error) {
        console.error('Failed to resubscribe to topic:', subscription.topic, error);
      }
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPongReceived > this.options.heartbeatInterval * 2) {
        // No pong received in time, consider connection dead
        console.warn('WebSocket heartbeat timeout, closing connection');
        this.ws?.close();
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping', data: {} });
      }
    }, this.options.heartbeatInterval);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;
      this.emit('state_change', { from: previousState, to: state });
    }
  }

  private createSubscriptionKey(options: SubscriptionOptions): string {
    return `${options.topic}:${JSON.stringify(options.filters || {})}`;
  }

  /**
   * Update authentication token and reconnect if necessary
   */
  updateToken(token: string | undefined): void {
    const wasConnected = this.isConnected;
    this.options.token = token;
    
    if (wasConnected) {
      // Reconnect with new token
      this.disconnect();
      this.connect();
    }
  }
}

// Singleton instance for the dashboard
export const websocketService = new WebSocketService({
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
  token: typeof window !== 'undefined' ? localStorage.getItem('devflow_auth_token') || undefined : undefined
});

export default websocketService;