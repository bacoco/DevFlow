import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket, UseWebSocketReturn } from '../hooks/useWebSocket';

interface WebSocketContextValue extends UseWebSocketReturn {
  reconnectAttempts: number;
  lastError: Error | null;
  isReconnecting: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function WebSocketProvider({ 
  children, 
  autoConnect = true,
  onConnectionChange 
}: WebSocketProviderProps) {
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const webSocket = useWebSocket({
    autoConnect,
    onConnected: () => {
      console.log('WebSocket connected');
      setReconnectAttempts(0);
      setIsReconnecting(false);
      setLastError(null);
      onConnectionChange?.(true);
    },
    onDisconnected: (event) => {
      console.log('WebSocket disconnected:', event);
      onConnectionChange?.(false);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setLastError(error);
    },
    onReconnecting: (attempt) => {
      console.log(`WebSocket reconnecting (attempt ${attempt})`);
      setReconnectAttempts(attempt);
      setIsReconnecting(true);
    },
    onReconnected: () => {
      console.log('WebSocket reconnected');
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setLastError(null);
      onConnectionChange?.(true);
    }
  });

  const contextValue: WebSocketContextValue = {
    ...webSocket,
    reconnectAttempts,
    lastError,
    isReconnecting
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Connection status component
export interface WebSocketStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function WebSocketStatus({ className = '', showDetails = false }: WebSocketStatusProps) {
  const { 
    connectionState, 
    isConnected, 
    reconnectAttempts, 
    lastError, 
    isReconnecting 
  } = useWebSocketContext();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return '🟢';
      case 'connecting':
      case 'reconnecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">{getStatusIcon()}</span>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {showDetails && lastError && (
        <span className="text-xs text-red-500 truncate max-w-xs" title={lastError.message}>
          {lastError.message}
        </span>
      )}
    </div>
  );
}

// Reconnect button component
export interface ReconnectButtonProps {
  className?: string;
  children?: ReactNode;
}

export function ReconnectButton({ className = '', children }: ReconnectButtonProps) {
  const { connect, isConnected, connectionState } = useWebSocketContext();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleReconnect = async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const isDisabled = isConnected || isConnecting || connectionState === 'connecting';

  return (
    <button
      onClick={handleReconnect}
      disabled={isDisabled}
      className={`px-3 py-1 text-sm rounded border ${
        isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${className}`}
    >
      {children || (isConnecting ? 'Connecting...' : 'Reconnect')}
    </button>
  );
}