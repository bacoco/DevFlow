import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeSync, useOfflineSync } from '../../hooks/useRealTimeSync';
import { Button } from './Button';

export interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export function ConnectionStatus({ 
  className = '', 
  showDetails = false,
  position = 'top-right',
  compact = false
}: ConnectionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isConnected,
    isOnline,
    syncStatus,
    queueSize,
    subscriptionCount,
    lastSync,
    error,
    resync,
    clearCache
  } = useRealTimeSync();

  const {
    isOffline,
    queuedChanges,
    syncPending,
    forcSync
  } = useOfflineSync();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500';
    if (error) return 'bg-red-500';
    if (syncStatus === 'reconnecting' || syncStatus === 'syncing') return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (error) return 'Error';
    if (syncStatus === 'reconnecting') return 'Reconnecting';
    if (syncStatus === 'syncing') return 'Syncing';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    if (error) return '❌';
    if (syncStatus === 'reconnecting' || syncStatus === 'syncing') return '🔄';
    if (isConnected) return '✅';
    return '⚪';
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const handleRetry = async () => {
    try {
      if (isOffline && queuedChanges > 0) {
        await forcSync();
      } else {
        await resync();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
          syncStatus === 'syncing' || syncStatus === 'reconnecting' ? 'animate-pulse' : ''
        }`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {/* Status indicator */}
        <div 
          className="flex items-center space-x-3 p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${
            syncStatus === 'syncing' || syncStatus === 'reconnecting' ? 'animate-pulse' : ''
          }`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {getStatusIcon()} {getStatusText()}
              </span>
              {queuedChanges > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {queuedChanges} queued
                </span>
              )}
            </div>
            
            {lastSync && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last sync: {lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            ▼
          </motion.div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {(isExpanded || showDetails) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-3 space-y-3">
                {/* Connection details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                      {getStatusText()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Online:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                      {isOnline ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Subscriptions:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                      {subscriptionCount}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Queue:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                      {queueSize}
                    </span>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Error: {error.message}
                    </p>
                  </div>
                )}

                {/* Offline indicator */}
                {isOffline && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                      Working offline. {queuedChanges} changes will sync when online.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRetry}
                    disabled={syncPending}
                    className="text-xs"
                  >
                    {syncPending ? 'Syncing...' : isOffline ? 'Sync Now' : 'Retry'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearCache}
                    className="text-xs"
                  >
                    Clear Cache
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export interface ConnectionBadgeProps {
  className?: string;
  showText?: boolean;
}

/**
 * Simple connection badge for use in headers or toolbars
 */
export function ConnectionBadge({ className = '', showText = true }: ConnectionBadgeProps) {
  const { isConnected, isOnline, syncStatus, error } = useRealTimeSync();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500';
    if (error) return 'bg-red-500';
    if (syncStatus === 'reconnecting' || syncStatus === 'syncing') return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (error) return 'Error';
    if (syncStatus === 'reconnecting') return 'Reconnecting';
    if (syncStatus === 'syncing') return 'Syncing';
    if (isConnected) return 'Live';
    return 'Disconnected';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
        syncStatus === 'syncing' || syncStatus === 'reconnecting' ? 'animate-pulse' : ''
      }`} />
      {showText && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

export interface SyncIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated sync indicator for showing real-time activity
 */
export function SyncIndicator({ className = '', size = 'md' }: SyncIndicatorProps) {
  const { syncStatus, isConnected } = useRealTimeSync();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const isActive = syncStatus === 'syncing' || syncStatus === 'reconnecting';

  if (!isConnected && syncStatus !== 'reconnecting') {
    return null;
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={isActive ? { rotate: 360 } : {}}
      transition={isActive ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
    >
      <svg
        className="w-full h-full text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </motion.div>
  );
}