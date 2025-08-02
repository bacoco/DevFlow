import { useEffect, useRef, useState, useCallback } from 'react';
import { websocketService, ConnectionState, SubscriptionOptions } from '../services/websocketService';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: (event: { code: number; reason: string }) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (options: SubscriptionOptions) => Promise<void>;
  unsubscribe: (options: SubscriptionOptions) => Promise<void>;
  subscriptions: SubscriptionOptions[];
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    onConnected,
    onDisconnected,
    onError,
    onReconnecting,
    onReconnected
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    websocketService.getConnectionState()
  );
  const [connectionId, setConnectionId] = useState<string | null>(
    websocketService.getConnectionId()
  );
  const [subscriptions, setSubscriptions] = useState<SubscriptionOptions[]>(
    websocketService.getSubscriptions()
  );
  const [error, setError] = useState<Error | null>(null);

  const handlersRef = useRef({
    onConnected,
    onDisconnected,
    onError,
    onReconnecting,
    onReconnected
  });

  // Update handlers ref when props change
  useEffect(() => {
    handlersRef.current = {
      onConnected,
      onDisconnected,
      onError,
      onReconnecting,
      onReconnected
    };
  }, [onConnected, onDisconnected, onError, onReconnecting, onReconnected]);

  // Setup event listeners
  useEffect(() => {
    const handleStateChange = ({ to }: { from: ConnectionState; to: ConnectionState }) => {
      setConnectionState(to);
    };

    const handleConnected = () => {
      setError(null);
      setConnectionId(websocketService.getConnectionId());
      handlersRef.current.onConnected?.();
    };

    const handleDisconnected = (event: { code: number; reason: string }) => {
      setConnectionId(null);
      handlersRef.current.onDisconnected?.(event);
    };

    const handleError = (error: Error) => {
      setError(error);
      handlersRef.current.onError?.(error);
    };

    const handleReconnecting = ({ attempt }: { attempt: number }) => {
      handlersRef.current.onReconnecting?.(attempt);
    };

    const handleReconnected = () => {
      setError(null);
      setConnectionId(websocketService.getConnectionId());
      setSubscriptions(websocketService.getSubscriptions());
      handlersRef.current.onReconnected?.();
    };

    const handleConnectionEstablished = (data: any) => {
      setConnectionId(data.connectionId);
    };

    // Add event listeners
    websocketService.on('state_change', handleStateChange);
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    websocketService.on('reconnecting', handleReconnecting);
    websocketService.on('reconnected', handleReconnected);
    websocketService.on('connection_established', handleConnectionEstablished);

    return () => {
      // Remove event listeners
      websocketService.off('state_change', handleStateChange);
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.off('reconnecting', handleReconnecting);
      websocketService.off('reconnected', handleReconnected);
      websocketService.off('connection_established', handleConnectionEstablished);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && connectionState === ConnectionState.DISCONNECTED) {
      websocketService.connect().catch((error) => {
        console.error('Auto-connect failed:', error);
        setError(error);
      });
    }
  }, [autoConnect, connectionState]);

  const connect = useCallback(async () => {
    try {
      await websocketService.connect();
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const subscribe = useCallback(async (subscriptionOptions: SubscriptionOptions) => {
    try {
      await websocketService.subscribe(subscriptionOptions);
      setSubscriptions(websocketService.getSubscriptions());
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  const unsubscribe = useCallback(async (subscriptionOptions: SubscriptionOptions) => {
    try {
      await websocketService.unsubscribe(subscriptionOptions);
      setSubscriptions(websocketService.getSubscriptions());
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    connectionId,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscriptions,
    error
  };
}

export interface UseTopicSubscriptionOptions {
  topic: string;
  filters?: Record<string, any>;
  enabled?: boolean;
  onData?: (data: any) => void;
}

export interface UseTopicSubscriptionReturn {
  data: any[];
  lastData: any | null;
  isSubscribed: boolean;
  error: Error | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  clearData: () => void;
}

export function useTopicSubscription(options: UseTopicSubscriptionOptions): UseTopicSubscriptionReturn {
  const { topic, filters, enabled = true, onData } = options;
  const [data, setData] = useState<any[]>([]);
  const [lastData, setLastData] = useState<any | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const subscriptionOptions: SubscriptionOptions = {
    topic,
    filters
  };

  const subscribe = useCallback(async () => {
    if (!websocketService.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    try {
      await websocketService.subscribe(subscriptionOptions);
      setIsSubscribed(true);
      setError(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [topic, filters]);

  const unsubscribe = useCallback(async () => {
    try {
      await websocketService.unsubscribe(subscriptionOptions);
      setIsSubscribed(false);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [topic, filters]);

  const clearData = useCallback(() => {
    setData([]);
    setLastData(null);
  }, []);

  // Handle topic data
  useEffect(() => {
    const handleTopicData = (payload: any) => {
      const newData = {
        ...payload,
        receivedAt: new Date()
      };
      
      setData(prev => [...prev, newData]);
      setLastData(newData);
      onDataRef.current?.(newData);
    };

    websocketService.on(`topic:${topic}`, handleTopicData);

    return () => {
      websocketService.off(`topic:${topic}`, handleTopicData);
    };
  }, [topic]);

  // Auto-subscribe when enabled and connected
  useEffect(() => {
    if (enabled && websocketService.isConnected() && !isSubscribed) {
      subscribe().catch((error) => {
        console.error('Auto-subscribe failed:', error);
      });
    }
  }, [enabled, subscribe, isSubscribed]);

  // Auto-unsubscribe when disabled
  useEffect(() => {
    if (!enabled && isSubscribed) {
      unsubscribe().catch((error) => {
        console.error('Auto-unsubscribe failed:', error);
      });
    }
  }, [enabled, unsubscribe, isSubscribed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSubscribed) {
        unsubscribe().catch((error) => {
          console.error('Cleanup unsubscribe failed:', error);
        });
      }
    };
  }, []);

  return {
    data,
    lastData,
    isSubscribed,
    error,
    subscribe,
    unsubscribe,
    clearData
  };
}