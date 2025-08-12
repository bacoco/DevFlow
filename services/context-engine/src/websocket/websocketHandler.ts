import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ContextEngineService } from '../services/ContextEngineService';
import { Logger } from '../utils/Logger';
import { WorkContext } from '../types';

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, WebSocketClient>();

export function websocketHandler(
  ws: WebSocket,
  req: IncomingMessage,
  contextService: ContextEngineService,
  logger: Logger
): void {
  const client: WebSocketClient = {
    ws,
    subscriptions: new Set()
  };
  
  clients.set(ws, client);
  logger.info('WebSocket client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(client, message, contextService, logger);
    } catch (error) {
      logger.error('Failed to handle WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket client disconnected${client.userId ? ` (user: ${client.userId})` : ''}`);
    
    // Unsubscribe from all context changes
    client.subscriptions.forEach(userId => {
      contextService.removeAllListeners(`context-change-${userId}`);
    });
    
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Context Engine WebSocket'
  }));
}

async function handleMessage(
  client: WebSocketClient,
  message: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  const { type, payload } = message;

  switch (type) {
    case 'authenticate':
      await handleAuthenticate(client, payload, logger);
      break;

    case 'subscribe_context':
      await handleSubscribeContext(client, payload, contextService, logger);
      break;

    case 'unsubscribe_context':
      await handleUnsubscribeContext(client, payload, contextService, logger);
      break;

    case 'get_context':
      await handleGetContext(client, payload, contextService, logger);
      break;

    case 'update_context':
      await handleUpdateContext(client, payload, contextService, logger);
      break;

    case 'get_predictions':
      await handleGetPredictions(client, payload, contextService, logger);
      break;

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`
      }));
  }
}

async function handleAuthenticate(
  client: WebSocketClient,
  payload: any,
  logger: Logger
): Promise<void> {
  const { userId, token } = payload;

  // TODO: Implement proper JWT token validation
  if (!userId) {
    client.ws.send(JSON.stringify({
      type: 'auth_error',
      message: 'User ID is required'
    }));
    return;
  }

  client.userId = userId;
  logger.info(`WebSocket client authenticated as user: ${userId}`);

  client.ws.send(JSON.stringify({
    type: 'authenticated',
    userId
  }));
}

async function handleSubscribeContext(
  client: WebSocketClient,
  payload: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  const { userId } = payload;

  if (!userId) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'User ID is required for context subscription'
    }));
    return;
  }

  // Subscribe to context changes
  const contextChangeHandler = (context: WorkContext) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'context_change',
        userId,
        context
      }));
    }
  };

  contextService.subscribeToContextChanges(userId, contextChangeHandler);
  client.subscriptions.add(userId);

  logger.info(`WebSocket client subscribed to context changes for user: ${userId}`);

  client.ws.send(JSON.stringify({
    type: 'subscribed',
    userId
  }));
}

async function handleUnsubscribeContext(
  client: WebSocketClient,
  payload: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  const { userId } = payload;

  if (!userId) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'User ID is required for context unsubscription'
    }));
    return;
  }

  contextService.removeAllListeners(`context-change-${userId}`);
  client.subscriptions.delete(userId);

  logger.info(`WebSocket client unsubscribed from context changes for user: ${userId}`);

  client.ws.send(JSON.stringify({
    type: 'unsubscribed',
    userId
  }));
}

async function handleGetContext(
  client: WebSocketClient,
  payload: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  try {
    const { userId } = payload;

    if (!userId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'User ID is required'
      }));
      return;
    }

    const context = await contextService.getCurrentContext(userId);

    client.ws.send(JSON.stringify({
      type: 'context',
      userId,
      context
    }));
  } catch (error) {
    logger.error('Failed to get context via WebSocket:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to get context'
    }));
  }
}

async function handleUpdateContext(
  client: WebSocketClient,
  payload: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  try {
    const { userId, contextUpdate } = payload;

    if (!userId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'User ID is required'
      }));
      return;
    }

    await contextService.updateContext(userId, contextUpdate);
    const updatedContext = await contextService.getCurrentContext(userId);

    client.ws.send(JSON.stringify({
      type: 'context_updated',
      userId,
      context: updatedContext
    }));
  } catch (error) {
    logger.error('Failed to update context via WebSocket:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to update context'
    }));
  }
}

async function handleGetPredictions(
  client: WebSocketClient,
  payload: any,
  contextService: ContextEngineService,
  logger: Logger
): Promise<void> {
  try {
    const { userId } = payload;

    if (!userId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'User ID is required'
      }));
      return;
    }

    const context = await contextService.getCurrentContext(userId);
    const predictions = await contextService.predictNextActions(context);

    client.ws.send(JSON.stringify({
      type: 'predictions',
      userId,
      predictions
    }));
  } catch (error) {
    logger.error('Failed to get predictions via WebSocket:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to get predictions'
    }));
  }
}

// Broadcast context change to all subscribed clients
export function broadcastContextChange(userId: string, context: WorkContext): void {
  clients.forEach((client) => {
    if (client.subscriptions.has(userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'context_change',
        userId,
        context
      }));
    }
  });
}