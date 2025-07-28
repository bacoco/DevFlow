import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { User, UserRole } from '@devflow/shared-types';
import { pubsub } from '../graphql/resolvers';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  user: User;
  subscriptions: Set<string>;
  lastPing: Date;
  isAlive: boolean;
}

export class WebSocketGateway {
  private connections = new Map<string, WebSocketConnection>();
  private subscriptions = new Map<string, Set<string>>(); // topic -> connection IDs
  private pingInterval: NodeJS.Timeout;

  constructor(private wsServer: WebSocketServer) {
    this.setupWebSocketServer();
    this.setupPubSubSubscriptions();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wsServer.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      try {
        const user = await this.authenticateConnection(request);
        if (!user) {
          ws.close(1008, 'Authentication required');
          return;
        }

        const connectionId = this.generateConnectionId();
        const connection: WebSocketConnection = {
          id: connectionId,
          ws,
          user,
          subscriptions: new Set(),
          lastPing: new Date(),
          isAlive: true
        };

        this.connections.set(connectionId, connection);
        
        logger.info('WebSocket connection established', {
          connectionId,
          userId: user.id,
          userRole: user.role
        });

        // Send welcome message
        this.sendMessage(connection, {
          type: 'connection_established',
          data: {
            connectionId,
            user: {
              id: user.id,
              name: user.name,
              role: user.role
            },
            timestamp: new Date().toISOString()
          }
        });

        // Setup message handlers
        ws.on('message', (data) => this.handleMessage(connection, data));
        ws.on('close', () => this.handleDisconnection(connection));
        ws.on('error', (error) => this.handleError(connection, error));
        ws.on('pong', () => this.handlePong(connection));

      } catch (error) {
        logger.error('WebSocket connection error', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  private async authenticateConnection(request: IncomingMessage): Promise<User | null> {
    try {
      const url = parse(request.url || '', true);
      const token = url.query.token as string || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return null;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      
      // In production, you would fetch the full user from database
      const user: User = {
        id: decoded.userId,
        email: decoded.email,
        name: '', // Would be fetched from DB
        role: decoded.role,
        teamIds: [], // Would be fetched from DB
        privacySettings: {} as any,
        preferences: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      return user;
    } catch (error) {
      logger.error('WebSocket authentication error', error);
      return null;
    }
  }

  private handleMessage(connection: WebSocketConnection, data: any) {
    try {
      const message = JSON.parse(data.toString());
      
      logger.debug('WebSocket message received', {
        connectionId: connection.id,
        type: message.type,
        userId: connection.user.id
      });

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(connection, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(connection, message);
          break;
        case 'ping':
          this.handlePing(connection);
          break;
        default:
          this.sendError(connection, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
      this.sendError(connection, 'Invalid message format');
    }
  }

  private handleSubscription(connection: WebSocketConnection, message: any) {
    const { topic, filters } = message.data;
    
    // Validate subscription permissions
    if (!this.canSubscribeToTopic(connection.user, topic, filters)) {
      this.sendError(connection, 'Insufficient permissions for this subscription');
      return;
    }

    const subscriptionKey = this.createSubscriptionKey(topic, filters);
    
    // Add to connection subscriptions
    connection.subscriptions.add(subscriptionKey);
    
    // Add to global subscriptions map
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    this.subscriptions.get(subscriptionKey)!.add(connection.id);

    this.sendMessage(connection, {
      type: 'subscription_confirmed',
      data: {
        topic,
        filters,
        subscriptionKey
      }
    });

    logger.info('WebSocket subscription added', {
      connectionId: connection.id,
      userId: connection.user.id,
      topic,
      filters
    });
  }

  private handleUnsubscription(connection: WebSocketConnection, message: any) {
    const { topic, filters } = message.data;
    const subscriptionKey = this.createSubscriptionKey(topic, filters);
    
    // Remove from connection subscriptions
    connection.subscriptions.delete(subscriptionKey);
    
    // Remove from global subscriptions map
    const topicSubscriptions = this.subscriptions.get(subscriptionKey);
    if (topicSubscriptions) {
      topicSubscriptions.delete(connection.id);
      if (topicSubscriptions.size === 0) {
        this.subscriptions.delete(subscriptionKey);
      }
    }

    this.sendMessage(connection, {
      type: 'unsubscription_confirmed',
      data: { topic, filters }
    });

    logger.info('WebSocket subscription removed', {
      connectionId: connection.id,
      userId: connection.user.id,
      topic,
      filters
    });
  }

  private handlePing(connection: WebSocketConnection) {
    connection.lastPing = new Date();
    this.sendMessage(connection, {
      type: 'pong',
      data: { timestamp: new Date().toISOString() }
    });
  }

  private handlePong(connection: WebSocketConnection) {
    connection.isAlive = true;
    connection.lastPing = new Date();
  }

  private handleDisconnection(connection: WebSocketConnection) {
    // Clean up subscriptions
    connection.subscriptions.forEach(subscriptionKey => {
      const topicSubscriptions = this.subscriptions.get(subscriptionKey);
      if (topicSubscriptions) {
        topicSubscriptions.delete(connection.id);
        if (topicSubscriptions.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
    });

    this.connections.delete(connection.id);

    logger.info('WebSocket connection closed', {
      connectionId: connection.id,
      userId: connection.user.id
    });
  }

  private handleError(connection: WebSocketConnection, error: Error) {
    logger.error('WebSocket connection error', {
      connectionId: connection.id,
      userId: connection.user.id,
      error: error.message
    });
  }

  private setupPubSubSubscriptions() {
    // Subscribe to GraphQL subscription events and broadcast to WebSocket clients
    
    // Metric updates
    pubsub.subscribe('METRIC_UPDATED', (payload) => {
      this.broadcastToSubscribers('metric_updated', payload.metricUpdated, {
        userId: payload.metricUpdated.userId,
        teamId: payload.metricUpdated.context?.teamId,
        type: payload.metricUpdated.metricType
      });
    });

    // Flow state updates
    pubsub.subscribe('FLOW_STATE_UPDATED', (payload) => {
      this.broadcastToSubscribers('flow_state_updated', payload.flowStateUpdated, {
        userId: payload.flowStateUpdated.userId
      });
    });

    // Alert notifications
    pubsub.subscribe('ALERT_CREATED', (payload) => {
      this.broadcastToSubscribers('alert_created', payload.alertCreated, {
        userId: payload.alertCreated.userId
      });
    });

    // Dashboard updates
    pubsub.subscribe('DASHBOARD_UPDATED', (payload) => {
      this.broadcastToSubscribers('dashboard_updated', payload.dashboardUpdated, {
        dashboardId: payload.dashboardUpdated.id,
        userId: payload.dashboardUpdated.userId
      });
    });

    // Team updates
    pubsub.subscribe('TEAM_UPDATED', (payload) => {
      this.broadcastToSubscribers('team_updated', payload.teamUpdated, {
        teamId: payload.teamUpdated.id
      });
    });

    // User status updates
    pubsub.subscribe('USER_STATUS_UPDATED', (payload) => {
      this.broadcastToSubscribers('user_status_updated', payload.userStatusUpdated, {
        userId: payload.userStatusUpdated.id
      });
    });
  }

  private broadcastToSubscribers(topic: string, data: any, filters: any = {}) {
    const subscriptionKey = this.createSubscriptionKey(topic, filters);
    const exactSubscribers = this.subscriptions.get(subscriptionKey) || new Set();
    
    // Also check for wildcard subscriptions (topic without specific filters)
    const wildcardKey = this.createSubscriptionKey(topic, {});
    const wildcardSubscribers = this.subscriptions.get(wildcardKey) || new Set();
    
    const allSubscribers = new Set([...exactSubscribers, ...wildcardSubscribers]);

    allSubscribers.forEach(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        // Apply additional permission checks
        if (this.canReceiveUpdate(connection.user, topic, data, filters)) {
          this.sendMessage(connection, {
            type: 'subscription_data',
            data: {
              topic,
              payload: data,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    });

    logger.debug('Broadcasted to WebSocket subscribers', {
      topic,
      subscriberCount: allSubscribers.size,
      filters
    });
  }

  private canSubscribeToTopic(user: User, topic: string, filters: any): boolean {
    switch (topic) {
      case 'metric_updated':
      case 'flow_state_updated':
        // Users can subscribe to their own metrics or team metrics if they're team leads
        if (filters.userId === user.id) return true;
        if (filters.teamId && user.teamIds.includes(filters.teamId)) {
          return user.role === UserRole.TEAM_LEAD || user.role === UserRole.MANAGER || user.role === UserRole.ADMIN;
        }
        return user.role === UserRole.ADMIN;
        
      case 'alert_created':
        // Users can only subscribe to their own alerts
        return filters.userId === user.id || user.role === UserRole.ADMIN;
        
      case 'dashboard_updated':
        // Users can subscribe to their own dashboards or team dashboards
        return filters.userId === user.id || user.role === UserRole.ADMIN;
        
      case 'team_updated':
        // Users can subscribe to their team updates
        return user.teamIds.includes(filters.teamId) || user.role === UserRole.ADMIN;
        
      case 'user_status_updated':
        // Users can subscribe to their own status or team member status
        return filters.userId === user.id || user.role === UserRole.ADMIN;
        
      default:
        return false;
    }
  }

  private canReceiveUpdate(user: User, topic: string, data: any, filters: any): boolean {
    // Additional runtime permission checks
    switch (topic) {
      case 'metric_updated':
      case 'flow_state_updated':
        return data.userId === user.id || 
               user.teamIds.includes(data.context?.teamId) ||
               user.role === UserRole.ADMIN;
               
      case 'alert_created':
        return data.userId === user.id || user.role === UserRole.ADMIN;
        
      default:
        return true;
    }
  }

  private sendMessage(connection: WebSocketConnection, message: any) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendError(connection: WebSocketConnection, error: string) {
    this.sendMessage(connection, {
      type: 'error',
      data: { message: error, timestamp: new Date().toISOString() }
    });
  }

  private createSubscriptionKey(topic: string, filters: any): string {
    return `${topic}:${JSON.stringify(filters)}`;
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((connection) => {
        if (!connection.isAlive) {
          logger.info('Terminating inactive WebSocket connection', {
            connectionId: connection.id,
            userId: connection.user.id
          });
          connection.ws.terminate();
          return;
        }

        connection.isAlive = false;
        connection.ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Public methods for external use
  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnectionsByUser(userId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.user.id === userId);
  }

  public broadcastToUser(userId: string, message: any) {
    const userConnections = this.getConnectionsByUser(userId);
    userConnections.forEach(connection => {
      this.sendMessage(connection, message);
    });
  }

  public broadcastToTeam(teamId: string, message: any) {
    const teamConnections = Array.from(this.connections.values())
      .filter(conn => conn.user.teamIds.includes(teamId));
    
    teamConnections.forEach(connection => {
      this.sendMessage(connection, message);
    });
  }

  public shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.connections.forEach(connection => {
      connection.ws.close(1001, 'Server shutting down');
    });
    
    this.connections.clear();
    this.subscriptions.clear();
  }
}