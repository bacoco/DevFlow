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

      this._sendMessage(message);

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

      this._sendMessage(message);

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

  private _sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  /**
   * Send a message to the WebSocket server (public method)
   */
  public sendMessage(message: WebSocketMessage): void {
    this._sendMessage(message);
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
        this._sendMessage({ type: 'ping', data: {} });
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

// Real-time data synchronization service
export class RealTimeDataSync extends EventEmitter {
  private websocketService: WebSocketService;
  private subscriptions = new Map<string, SubscriptionOptions>();
  private dataCache = new Map<string, any>();
  private syncQueue: Array<{ type: string; data: any; timestamp: Date }> = [];
  private isOnline = true;
  private conflictResolver?: (local: any, remote: any) => any;

  constructor(websocketService: WebSocketService) {
    super();
    this.websocketService = websocketService;
    this.setupEventHandlers();
    this.setupOnlineDetection();
  }

  private setupEventHandlers() {
    this.websocketService.on('connected', () => {
      this.emit('sync_status_changed', { status: 'connected' });
      this.processSyncQueue();
    });

    this.websocketService.on('disconnected', () => {
      this.emit('sync_status_changed', { status: 'disconnected' });
    });

    this.websocketService.on('reconnected', () => {
      this.emit('sync_status_changed', { status: 'reconnected' });
      this.resyncAllData();
    });

    // Handle different types of real-time data
    this.websocketService.on('topic:dashboard_updated', (data) => {
      this.handleDashboardUpdate(data);
    });

    this.websocketService.on('topic:widget_updated', (data) => {
      this.handleWidgetUpdate(data);
    });

    this.websocketService.on('topic:task_updated', (data) => {
      this.handleTaskUpdate(data);
    });

    this.websocketService.on('topic:metric_updated', (data) => {
      this.handleMetricUpdate(data);
    });

    this.websocketService.on('topic:user_activity', (data) => {
      this.handleUserActivity(data);
    });
  }

  private setupOnlineDetection() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.emit('online_status_changed', { isOnline: true });
        if (this.websocketService.isConnected()) {
          this.resyncAllData();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.emit('online_status_changed', { isOnline: false });
      });

      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Subscribe to real-time updates for a specific data type
   */
  async subscribeToDataType(
    dataType: 'dashboard' | 'widget' | 'task' | 'metric' | 'user_activity',
    filters: Record<string, any> = {}
  ): Promise<void> {
    const topic = `${dataType}_updated`;
    const subscriptionKey = `${topic}:${JSON.stringify(filters)}`;

    if (this.subscriptions.has(subscriptionKey)) {
      return; // Already subscribed
    }

    const subscriptionOptions: SubscriptionOptions = {
      topic,
      filters
    };

    try {
      await this.websocketService.subscribe(subscriptionOptions);
      this.subscriptions.set(subscriptionKey, subscriptionOptions);
      this.emit('subscription_added', { dataType, filters });
    } catch (error) {
      this.emit('subscription_error', { dataType, filters, error });
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribeFromDataType(
    dataType: 'dashboard' | 'widget' | 'task' | 'metric' | 'user_activity',
    filters: Record<string, any> = {}
  ): Promise<void> {
    const topic = `${dataType}_updated`;
    const subscriptionKey = `${topic}:${JSON.stringify(filters)}`;

    const subscriptionOptions = this.subscriptions.get(subscriptionKey);
    if (!subscriptionOptions) {
      return; // Not subscribed
    }

    try {
      await this.websocketService.unsubscribe(subscriptionOptions);
      this.subscriptions.delete(subscriptionKey);
      this.emit('subscription_removed', { dataType, filters });
    } catch (error) {
      this.emit('subscription_error', { dataType, filters, error });
      throw error;
    }
  }

  /**
   * Queue data changes for synchronization when offline
   */
  queueDataChange(type: string, data: any): void {
    this.syncQueue.push({
      type,
      data,
      timestamp: new Date()
    });

    // Limit queue size
    if (this.syncQueue.length > 1000) {
      this.syncQueue = this.syncQueue.slice(-1000);
    }

    this.emit('data_queued', { type, data, queueSize: this.syncQueue.length });
  }

  /**
   * Process queued changes when connection is restored
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const queueToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queueToProcess) {
      try {
        await this.syncDataChange(item.type, item.data);
      } catch (error) {
        console.error('Failed to sync queued data:', error);
        // Re-queue failed items
        this.syncQueue.push(item);
      }
    }

    this.emit('sync_queue_processed', { processedCount: queueToProcess.length });
  }

  /**
   * Sync a data change to the server
   */
  private async syncDataChange(type: string, data: any): Promise<void> {
    if (!this.websocketService.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'data_sync',
      data: {
        changeType: type,
        payload: data,
        timestamp: new Date().toISOString(),
        clientId: this.websocketService.getConnectionId()
      }
    };

    this.websocketService.sendMessage(message);
  }

  /**
   * Handle dashboard updates
   */
  private handleDashboardUpdate(data: any): void {
    const { dashboardId, changes, userId, timestamp } = data;
    
    // Check for conflicts with local changes
    const localData = this.dataCache.get(`dashboard:${dashboardId}`);
    if (localData && this.hasConflict(localData, data)) {
      const resolved = this.resolveConflict(localData, data);
      this.dataCache.set(`dashboard:${dashboardId}`, resolved);
      this.emit('dashboard_updated', { dashboardId, data: resolved, hasConflict: true });
    } else {
      this.dataCache.set(`dashboard:${dashboardId}`, data);
      this.emit('dashboard_updated', { dashboardId, data, hasConflict: false });
    }
  }

  /**
   * Handle widget updates
   */
  private handleWidgetUpdate(data: any): void {
    const { widgetId, dashboardId, changes, userId, timestamp } = data;
    
    this.dataCache.set(`widget:${widgetId}`, data);
    this.emit('widget_updated', { widgetId, dashboardId, data });
  }

  /**
   * Handle task updates
   */
  private handleTaskUpdate(data: any): void {
    const { taskId, changes, userId, timestamp } = data;
    
    // Handle different types of task updates
    switch (data.changeType) {
      case 'created':
        this.emit('task_created', { taskId, data });
        break;
      case 'updated':
        this.emit('task_updated', { taskId, data });
        break;
      case 'deleted':
        this.emit('task_deleted', { taskId, data });
        break;
      case 'moved':
        this.emit('task_moved', { taskId, data });
        break;
      case 'status_changed':
        this.emit('task_status_changed', { taskId, data });
        break;
      default:
        this.emit('task_changed', { taskId, data });
    }
    
    this.dataCache.set(`task:${taskId}`, data);
  }

  /**
   * Handle metric updates
   */
  private handleMetricUpdate(data: any): void {
    const { metricType, userId, teamId, value, timestamp } = data;
    
    this.emit('metric_updated', {
      metricType,
      userId,
      teamId,
      value,
      timestamp: new Date(timestamp)
    });
  }

  /**
   * Handle user activity updates
   */
  private handleUserActivity(data: any): void {
    const { userId, activity, timestamp } = data;
    
    this.emit('user_activity', {
      userId,
      activity,
      timestamp: new Date(timestamp)
    });
  }

  /**
   * Check if there's a conflict between local and remote data
   */
  private hasConflict(localData: any, remoteData: any): boolean {
    if (!localData.lastModified || !remoteData.lastModified) {
      return false;
    }

    const localTime = new Date(localData.lastModified).getTime();
    const remoteTime = new Date(remoteData.lastModified).getTime();
    
    // Consider it a conflict if both were modified within 5 seconds of each other
    return Math.abs(localTime - remoteTime) < 5000;
  }

  /**
   * Resolve conflicts between local and remote data
   */
  private resolveConflict(localData: any, remoteData: any): any {
    if (this.conflictResolver) {
      return this.conflictResolver(localData, remoteData);
    }

    // Default resolution: use the most recent data
    const localTime = new Date(localData.lastModified || 0).getTime();
    const remoteTime = new Date(remoteData.lastModified || 0).getTime();
    
    return remoteTime > localTime ? remoteData : localData;
  }

  /**
   * Set a custom conflict resolver
   */
  setConflictResolver(resolver: (local: any, remote: any) => any): void {
    this.conflictResolver = resolver;
  }

  /**
   * Resync all data after reconnection
   */
  private async resyncAllData(): Promise<void> {
    this.emit('resync_started');
    
    try {
      // Request full data sync from server
      const message = {
        type: 'request_full_sync',
        data: {
          subscriptions: Array.from(this.subscriptions.values()),
          lastSync: this.getLastSyncTime(),
          clientId: this.websocketService.getConnectionId()
        }
      };

      this.websocketService.sendMessage(message);
      this.emit('resync_requested');
    } catch (error) {
      this.emit('resync_error', { error });
    }
  }

  /**
   * Get the last sync time
   */
  private getLastSyncTime(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('devflow_last_sync');
    }
    return null;
  }

  /**
   * Update the last sync time
   */
  updateLastSyncTime(): void {
    const now = new Date().toISOString();
    if (typeof window !== 'undefined') {
      localStorage.setItem('devflow_last_sync', now);
    }
    this.emit('sync_time_updated', { timestamp: now });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    isOnline: boolean;
    queueSize: number;
    subscriptionCount: number;
  } {
    return {
      isConnected: this.websocketService.isConnected(),
      isOnline: this.isOnline,
      queueSize: this.syncQueue.length,
      subscriptionCount: this.subscriptions.size
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.dataCache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Get cached data
   */
  getCachedData(key: string): any {
    return this.dataCache.get(key);
  }

  /**
   * Set cached data
   */
  setCachedData(key: string, data: any): void {
    this.dataCache.set(key, data);
  }
}

// Singleton instance for the dashboard - disabled in development
export const websocketService = process.env.NODE_ENV === 'development' 
  ? {
      updateToken: () => {},
      connect: () => Promise.resolve(),
      disconnect: () => {},
      send: () => {},
      subscribe: () => Promise.resolve(() => {}),
      unsubscribe: () => {},
      isConnected: () => true,
      getConnectionState: () => ConnectionState.CONNECTED,
      getConnectionInfo: () => ({ url: 'mock://localhost', readyState: 1 }),
      on: () => {},
      off: () => {},
      emit: () => {}
    } as any
  : new WebSocketService({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
      token: typeof window !== 'undefined' ? localStorage.getItem('devflow_auth_token') || undefined : undefined
    });

// Real-time data synchronization instance - disabled in development
export const realTimeDataSync = process.env.NODE_ENV === 'development'
  ? {
      start: () => {},
      stop: () => {},
      syncDashboard: () => Promise.resolve(),
      syncTasks: () => Promise.resolve(),
      syncMetrics: () => Promise.resolve(),
      getConnectionStatus: () => ({
        isConnected: true,
        isOnline: true,
        queueSize: 0,
        subscriptionCount: 0,
        lastSyncTime: new Date(),
        syncErrors: []
      }),
      updateLastSyncTime: () => {},
      clearCache: () => {},
      subscribeToDataType: () => Promise.resolve(),
      unsubscribeFromDataType: () => Promise.resolve(),
      on: () => {},
      off: () => {},
      emit: () => {}
    } as any
  : new RealTimeDataSync(websocketService);

export default websocketService;