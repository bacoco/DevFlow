/**
 * Network Status Component
 * Displays current network connection status and sync information
 */

import React from 'react';
import { Wifi, WifiOff, Sync, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useOfflineService } from '../../services/offlineService';
import { Button } from './Button';
import { Card } from './Card';

interface NetworkStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const { networkStatus, syncResult, syncData, isOffline, getQueuedOperations } = useOfflineService();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncData();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (isOffline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (isSyncing) {
      return <Sync className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    if (networkStatus.queueSize > 0) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isOffline) {
      return 'Offline';
    }
    
    if (isSyncing) {
      return 'Syncing...';
    }
    
    if (networkStatus.queueSize > 0) {
      return `${networkStatus.queueSize} pending`;
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (isOffline) return 'text-red-600 dark:text-red-400';
    if (isSyncing) return 'text-blue-600 dark:text-blue-400';
    if (networkStatus.queueSize > 0) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {networkStatus.queueSize > 0 && !isOffline && (
          <Button
            onClick={handleSync}
            variant="ghost"
            size="sm"
            disabled={isSyncing}
            className="h-6 px-2"
          >
            <Sync className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
            {networkStatus.lastSync && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last sync: {networkStatus.lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {networkStatus.queueSize > 0 && !isOffline && (
          <Button
            onClick={handleSync}
            variant="secondary"
            size="sm"
            disabled={isSyncing}
            icon={<Sync className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            Sync Now
          </Button>
        )}
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3">
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Connection:</span>
            <span className={getStatusColor()}>
              {isOffline ? 'Offline' : 'Online'}
            </span>
          </div>

          {/* Queue Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Pending operations:</span>
            <span className="font-medium">{networkStatus.queueSize}</span>
          </div>

          {/* Last Sync */}
          {networkStatus.lastSync && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Last sync:</span>
              <span className="font-medium">
                {networkStatus.lastSync.toLocaleString()}
              </span>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {syncResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  Last Sync Result
                </span>
              </div>
              
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Synced: {syncResult.syncedItems} items</div>
                {syncResult.failedItems > 0 && (
                  <div className="text-red-600 dark:text-red-400">
                    Failed: {syncResult.failedItems} items
                  </div>
                )}
                {syncResult.conflicts.length > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    Conflicts: {syncResult.conflicts.length} items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offline Message */}
          {isOffline && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  You're currently offline. Changes will be synced when connection is restored.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// Network status indicator for the header/navbar
export const NetworkStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOffline, networkStatus } = useOfflineService();
  
  if (!isOffline && networkStatus.queueSize === 0) {
    return null; // Don't show anything when everything is fine
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
        </>
      ) : networkStatus.queueSize > 0 ? (
        <>
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {networkStatus.queueSize} pending
          </span>
        </>
      ) : null}
    </div>
  );
};

// Toast notification for network status changes
export const useNetworkStatusNotifications = () => {
  const { isOffline } = useOfflineService();
  const [wasOffline, setWasOffline] = React.useState(isOffline);

  React.useEffect(() => {
    if (wasOffline && !isOffline) {
      // Just came back online
      // You could show a toast notification here
      console.log('Back online! Syncing data...');
    } else if (!wasOffline && isOffline) {
      // Just went offline
      console.log('Gone offline. Changes will be queued for sync.');
    }
    
    setWasOffline(isOffline);
  }, [isOffline, wasOffline]);
};