import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Widget, WidgetData, ProductivityMetric } from '../../types/dashboard';
import { useTopicSubscription } from '../../hooks/useWebSocket';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export interface RealTimeWidgetProps {
  widget: Widget;
  onDataUpdate?: (widgetId: string, data: WidgetData) => void;
  autoRefreshInterval?: number;
  enableAutoRefresh?: boolean;
  className?: string;
  children: (props: RealTimeWidgetRenderProps) => React.ReactNode;
}

export interface RealTimeWidgetRenderProps {
  widget: Widget;
  data: WidgetData;
  isLive: boolean;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  updateCount: number;
  autoRefresh: {
    isEnabled: boolean;
    lastRefresh: Date | null;
    refreshCount: number;
    refresh: () => void;
    setEnabled: (enabled: boolean) => void;
  };
}

export function RealTimeWidget({ 
  widget, 
  onDataUpdate, 
  className = '',
  children 
}: RealTimeWidgetProps) {
  const { isConnected } = useWebSocketContext();
  const [data, setData] = useState<WidgetData>(widget.data);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Determine subscription options based on widget configuration
  const subscriptionOptions = useMemo(() => {
    const filters: Record<string, any> = {};
    
    // Add user-specific filters if needed
    if (widget.config.filters?.userId) {
      filters.userId = widget.config.filters.userId;
    }
    
    // Add team-specific filters if needed
    if (widget.config.filters?.teamId) {
      filters.teamId = widget.config.filters.teamId;
    }
    
    // Add metric type filters
    if (widget.config.metrics && widget.config.metrics.length > 0) {
      filters.type = widget.config.metrics;
    }

    return {
      topic: 'metric_updated',
      filters
    };
  }, [widget.config.filters, widget.config.metrics]);

  // Subscribe to real-time updates
  const {
    lastData: lastMetricUpdate,
    isSubscribed,
    error: subscriptionError
  } = useTopicSubscription({
    ...subscriptionOptions,
    enabled: isConnected,
    onData: handleMetricUpdate
  });

  function handleMetricUpdate(metricData: any) {
    if (!metricData || !metricData.metricType) return;

    // Check if this metric is relevant to this widget
    const isRelevantMetric = widget.config.metrics.includes(metricData.metricType);
    if (!isRelevantMetric) return;

    // Check if filters match
    if (widget.config.filters?.userId && metricData.userId !== widget.config.filters.userId) {
      return;
    }
    if (widget.config.filters?.teamId && metricData.context?.teamId !== widget.config.filters.teamId) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Update widget data with new metric
      const newMetric: ProductivityMetric = {
        id: metricData.id,
        userId: metricData.userId,
        metricType: metricData.metricType,
        value: metricData.value,
        timestamp: new Date(metricData.timestamp),
        aggregationPeriod: metricData.aggregationPeriod,
        context: metricData.context
      };

      setData(prevData => {
        const updatedMetrics = [...prevData.metrics];
        
        // Find existing metric or add new one
        const existingIndex = updatedMetrics.findIndex(
          m => m.metricType === newMetric.metricType && 
               m.userId === newMetric.userId &&
               m.context?.teamId === newMetric.context?.teamId
        );

        if (existingIndex >= 0) {
          updatedMetrics[existingIndex] = newMetric;
        } else {
          updatedMetrics.push(newMetric);
        }

        // Update chart data
        const updatedChartData = generateChartData(updatedMetrics, widget.config.metrics);
        
        // Calculate summary
        const summary = calculateSummary(updatedMetrics, widget.config.metrics[0]);

        const newData: WidgetData = {
          metrics: updatedMetrics,
          chartData: updatedChartData,
          summary,
          lastUpdated: new Date()
        };

        // Notify parent component
        onDataUpdate?.(widget.id, newData);
        
        return newData;
      });

      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
      setError(null);
    } catch (err) {
      console.error('Error processing metric update:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle subscription errors
  useEffect(() => {
    if (subscriptionError) {
      setError(subscriptionError);
    }
  }, [subscriptionError]);

  // Generate chart data from metrics
  function generateChartData(metrics: ProductivityMetric[], metricTypes: string[]) {
    if (metrics.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Group metrics by time period
    const timeGroups = new Map<string, Map<string, number>>();
    
    metrics.forEach(metric => {
      const timeKey = formatTimeKey(metric.timestamp, widget.config.timeRange);
      
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, new Map());
      }
      
      timeGroups.get(timeKey)!.set(metric.metricType, metric.value);
    });

    // Sort time keys
    const sortedTimeKeys = Array.from(timeGroups.keys()).sort();
    
    // Create datasets for each metric type
    const datasets = metricTypes.map((metricType, index) => ({
      label: formatMetricLabel(metricType),
      data: sortedTimeKeys.map(timeKey => 
        timeGroups.get(timeKey)?.get(metricType) || 0
      ),
      backgroundColor: getMetricColor(metricType, 0.2),
      borderColor: getMetricColor(metricType, 1),
      borderWidth: 2,
      fill: false
    }));

    return {
      labels: sortedTimeKeys.map(key => formatTimeLabel(key, widget.config.timeRange)),
      datasets
    };
  }

  // Calculate summary statistics
  function calculateSummary(metrics: ProductivityMetric[], primaryMetricType: string) {
    const relevantMetrics = metrics.filter(m => m.metricType === primaryMetricType);
    
    if (relevantMetrics.length === 0) {
      return {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: 'stable' as const
      };
    }

    // Sort by timestamp
    relevantMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const current = relevantMetrics[0]?.value || 0;
    const previous = relevantMetrics[1]?.value || current;
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      current,
      previous,
      change,
      changePercent,
      trend
    };
  }

  // Helper functions
  function formatTimeKey(timestamp: Date, timeRange: string): string {
    switch (timeRange) {
      case 'hour':
        return timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      case 'day':
        return timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(timestamp);
        weekStart.setDate(timestamp.getDate() - timestamp.getDay());
        return weekStart.toISOString().substring(0, 10);
      case 'month':
        return timestamp.toISOString().substring(0, 7); // YYYY-MM
      default:
        return timestamp.toISOString().substring(0, 10);
    }
  }

  function formatTimeLabel(timeKey: string, timeRange: string): string {
    const date = new Date(timeKey);
    switch (timeRange) {
      case 'hour':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'week':
        return `Week of ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
      default:
        return date.toLocaleDateString();
    }
  }

  function formatMetricLabel(metricType: string): string {
    return metricType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getMetricColor(metricType: string, alpha: number): string {
    const colors = {
      time_in_flow: `rgba(34, 197, 94, ${alpha})`, // green
      code_churn: `rgba(239, 68, 68, ${alpha})`, // red
      review_lag: `rgba(245, 158, 11, ${alpha})`, // amber
      commit_frequency: `rgba(59, 130, 246, ${alpha})`, // blue
      bug_rate: `rgba(168, 85, 247, ${alpha})`, // purple
      productivity_score: `rgba(6, 182, 212, ${alpha})` // cyan
    };
    return colors[metricType as keyof typeof colors] || `rgba(107, 114, 128, ${alpha})`;
  }

  const renderProps: RealTimeWidgetRenderProps = {
    widget,
    data,
    isLive: isConnected && isSubscribed,
    isLoading,
    error,
    lastUpdate,
    updateCount
  };

  return (
    <div className={`relative ${className}`}>
      {children(renderProps)}
      
      {/* Live indicator */}
      {isConnected && isSubscribed && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">LIVE</span>
        </div>
      )}
      
      {/* Error indicator */}
      {error && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs text-red-600 font-medium" title={error.message}>
            ERROR
          </span>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}