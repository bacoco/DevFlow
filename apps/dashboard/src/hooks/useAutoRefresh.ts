import { useEffect, useRef, useState, useCallback } from 'react';
import { autoRefreshService, AutoRefreshOptions } from '../services/autoRefreshService';

export interface UseAutoRefreshOptions extends Omit<AutoRefreshOptions, 'onRefresh'> {
  onRefresh: () => void | Promise<void>;
  dependencies?: any[];
}

export interface UseAutoRefreshReturn {
  isEnabled: boolean;
  lastRefresh: Date | null;
  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: number) => void;
  refresh: () => void;
  refreshCount: number;
}

export function useAutoRefresh(
  id: string,
  options: UseAutoRefreshOptions
): UseAutoRefreshReturn {
  const { onRefresh, interval, enabled = true, dependencies = [] } = options;
  const [isEnabled, setIsEnabledState] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const onRefreshRef = useRef(onRefresh);
  const intervalRef = useRef(interval);
  const enabledRef = useRef(enabled);

  // Update refs when props change
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Wrapped refresh function that handles async operations
  const wrappedRefresh = useCallback(async () => {
    try {
      await onRefreshRef.current();
      setLastRefresh(new Date());
      setRefreshCount(prev => prev + 1);
    } catch (error) {
      console.error(`Auto-refresh error for ${id}:`, error);
    }
  }, [id]);

  // Subscribe to auto-refresh service
  useEffect(() => {
    autoRefreshService.subscribe(id, {
      interval: intervalRef.current,
      enabled: enabledRef.current,
      onRefresh: wrappedRefresh
    });

    return () => {
      autoRefreshService.unsubscribe(id);
    };
  }, [id, wrappedRefresh]);

  // Update subscription when dependencies change
  useEffect(() => {
    autoRefreshService.subscribe(id, {
      interval: intervalRef.current,
      enabled: enabledRef.current,
      onRefresh: wrappedRefresh
    });
  }, dependencies);

  // Control functions
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    autoRefreshService.setEnabled(id, enabled);
  }, [id]);

  const setInterval = useCallback((newInterval: number) => {
    autoRefreshService.updateInterval(id, newInterval);
  }, [id]);

  const refresh = useCallback(() => {
    autoRefreshService.refresh(id);
  }, [id]);

  // Listen to service events
  useEffect(() => {
    const handleAutoRefresh = ({ id: refreshId }: { id: string }) => {
      if (refreshId === id) {
        setLastRefresh(new Date());
        setRefreshCount(prev => prev + 1);
      }
    };

    const handleSubscriptionToggled = ({ id: toggledId, enabled }: { id: string; enabled: boolean }) => {
      if (toggledId === id) {
        setIsEnabledState(enabled);
      }
    };

    autoRefreshService.on('auto_refresh', handleAutoRefresh);
    autoRefreshService.on('subscription_toggled', handleSubscriptionToggled);

    return () => {
      autoRefreshService.off('auto_refresh', handleAutoRefresh);
      autoRefreshService.off('subscription_toggled', handleSubscriptionToggled);
    };
  }, [id]);

  return {
    isEnabled,
    lastRefresh,
    setEnabled,
    setInterval,
    refresh,
    refreshCount
  };
}

export interface UseGlobalAutoRefreshReturn {
  isGlobalEnabled: boolean;
  setGlobalEnabled: (enabled: boolean) => void;
  refreshAll: () => void;
  activeSubscriptions: number;
}

export function useGlobalAutoRefresh(): UseGlobalAutoRefreshReturn {
  const [isGlobalEnabled, setIsGlobalEnabledState] = useState(
    autoRefreshService.isGlobalEnabled()
  );
  const [activeSubscriptions, setActiveSubscriptions] = useState(
    autoRefreshService.getAllSubscriptions().length
  );

  const setGlobalEnabled = useCallback((enabled: boolean) => {
    autoRefreshService.setGlobalEnabled(enabled);
  }, []);

  const refreshAll = useCallback(() => {
    autoRefreshService.refreshAll();
  }, []);

  useEffect(() => {
    const handleGlobalToggle = ({ enabled }: { enabled: boolean }) => {
      setIsGlobalEnabledState(enabled);
    };

    const handleSubscriptionChange = () => {
      setActiveSubscriptions(autoRefreshService.getAllSubscriptions().length);
    };

    autoRefreshService.on('global_toggle', handleGlobalToggle);
    autoRefreshService.on('subscription_added', handleSubscriptionChange);
    autoRefreshService.on('subscription_removed', handleSubscriptionChange);

    return () => {
      autoRefreshService.off('global_toggle', handleGlobalToggle);
      autoRefreshService.off('subscription_added', handleSubscriptionChange);
      autoRefreshService.off('subscription_removed', handleSubscriptionChange);
    };
  }, []);

  return {
    isGlobalEnabled,
    setGlobalEnabled,
    refreshAll,
    activeSubscriptions
  };
}