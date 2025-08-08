/**
 * React Query hooks for analytics data management
 * Provides caching, background updates, and real-time data synchronization for analytics
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Analytics data interfaces
interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
  timestamp: string;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: ChartDataPoint[];
  metadata: {
    totalPoints: number;
    timeRange: string;
    lastUpdated: string;
  };
}

interface AnalyticsFilters {
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  metrics?: string[];
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

interface TeamPerformanceData {
  teamId: string;
  teamName: string;
  members: Array<{
    userId: string;
    name: string;
    tasksCompleted: number;
    averageCompletionTime: number;
    productivityScore: number;
  }>;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    averageVelocity: number;
    burndownRate: number;
  };
  trends: {
    velocity: ChartDataPoint[];
    completion: ChartDataPoint[];
  };
}

interface ProductivityInsights {
  userId: string;
  timeRange: string;
  insights: Array<{
    type: 'pattern' | 'recommendation' | 'achievement' | 'warning';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    metadata?: Record<string, any>;
  }>;
  scores: {
    overall: number;
    focus: number;
    efficiency: number;
    collaboration: number;
  };
}

// Mock analytics service (in a real app, this would be a proper service)
class AnalyticsService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async getMetrics(filters: AnalyticsFilters = {}): Promise<MetricData[]> {
    // Mock implementation - replace with actual API call
    const mockMetrics: MetricData[] = [
      {
        id: 'tasks-completed',
        name: 'Tasks Completed',
        value: 42,
        previousValue: 38,
        change: 4,
        changePercent: 10.5,
        trend: 'up',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'avg-completion-time',
        name: 'Avg Completion Time',
        value: 2.5,
        previousValue: 3.1,
        change: -0.6,
        changePercent: -19.4,
        trend: 'down',
        unit: 'hours',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'productivity-score',
        name: 'Productivity Score',
        value: 87,
        previousValue: 85,
        change: 2,
        changePercent: 2.4,
        trend: 'up',
        timestamp: new Date().toISOString(),
      },
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockMetrics;
  }

  async getChartData(chartId: string, filters: AnalyticsFilters = {}): Promise<ChartData> {
    // Mock implementation - replace with actual API call
    const mockData: ChartData = {
      id: chartId,
      title: `Chart ${chartId}`,
      type: 'line',
      data: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        value: Math.floor(Math.random() * 100) + 20,
        label: `Day ${i + 1}`,
      })),
      metadata: {
        totalPoints: 30,
        timeRange: filters.timeRange || 'month',
        lastUpdated: new Date().toISOString(),
      },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockData;
  }

  async getTeamPerformance(teamId: string, filters: AnalyticsFilters = {}): Promise<TeamPerformanceData> {
    // Mock implementation - replace with actual API call
    const mockData: TeamPerformanceData = {
      teamId,
      teamName: `Team ${teamId}`,
      members: [
        {
          userId: 'user1',
          name: 'Alice Johnson',
          tasksCompleted: 15,
          averageCompletionTime: 2.3,
          productivityScore: 92,
        },
        {
          userId: 'user2',
          name: 'Bob Smith',
          tasksCompleted: 12,
          averageCompletionTime: 3.1,
          productivityScore: 85,
        },
      ],
      metrics: {
        totalTasks: 45,
        completedTasks: 38,
        averageVelocity: 12.5,
        burndownRate: 0.85,
      },
      trends: {
        velocity: Array.from({ length: 14 }, (_, i) => ({
          timestamp: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 20) + 5,
        })),
        completion: Array.from({ length: 14 }, (_, i) => ({
          timestamp: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 15) + 3,
        })),
      },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockData;
  }

  async getProductivityInsights(userId: string, filters: AnalyticsFilters = {}): Promise<ProductivityInsights> {
    // Mock implementation - replace with actual API call
    const mockData: ProductivityInsights = {
      userId,
      timeRange: filters.timeRange || 'week',
      insights: [
        {
          type: 'pattern',
          title: 'Peak Productivity Hours',
          description: 'You are most productive between 9-11 AM and 2-4 PM',
          impact: 'high',
          actionable: true,
          metadata: { peakHours: ['9-11', '14-16'] },
        },
        {
          type: 'recommendation',
          title: 'Break Frequency',
          description: 'Consider taking more frequent short breaks to maintain focus',
          impact: 'medium',
          actionable: true,
        },
        {
          type: 'achievement',
          title: 'Consistency Streak',
          description: 'You have maintained consistent daily productivity for 7 days',
          impact: 'high',
          actionable: false,
        },
      ],
      scores: {
        overall: 87,
        focus: 92,
        efficiency: 85,
        collaboration: 83,
      },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockData;
  }

  async exportAnalyticsData(filters: AnalyticsFilters, format: 'csv' | 'json' | 'pdf'): Promise<Blob> {
    // Mock implementation - replace with actual API call
    const mockData = JSON.stringify({ filters, format, exportedAt: new Date().toISOString() });
    return new Blob([mockData], { type: 'application/json' });
  }
}

const analyticsService = new AnalyticsService();

// Query keys for consistent cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  metrics: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'metrics', filters] as const,
  charts: () => [...analyticsKeys.all, 'charts'] as const,
  chart: (id: string, filters: AnalyticsFilters) => [...analyticsKeys.charts(), id, filters] as const,
  teamPerformance: (teamId: string, filters: AnalyticsFilters) => 
    [...analyticsKeys.all, 'team', teamId, filters] as const,
  insights: (userId: string, filters: AnalyticsFilters) => 
    [...analyticsKeys.all, 'insights', userId, filters] as const,
} as const;

// Get metrics query hook
export function useMetrics(
  filters: AnalyticsFilters = {},
  options?: Omit<UseQueryOptions<MetricData[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.metrics(filters),
    queryFn: () => analyticsService.getMetrics(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for real-time updates
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error.message.includes('4')) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });
}

// Get chart data query hook
export function useChartData(
  chartId: string,
  filters: AnalyticsFilters = {},
  options?: Omit<UseQueryOptions<ChartData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.chart(chartId, filters),
    queryFn: () => analyticsService.getChartData(chartId, filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for real-time updates
    enabled: !!chartId,
    ...options,
  });
}

// Get team performance query hook
export function useTeamPerformance(
  teamId: string,
  filters: AnalyticsFilters = {},
  options?: Omit<UseQueryOptions<TeamPerformanceData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.teamPerformance(teamId, filters),
    queryFn: () => analyticsService.getTeamPerformance(teamId, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    enabled: !!teamId,
    ...options,
  });
}

// Get productivity insights query hook
export function useProductivityInsights(
  userId: string,
  filters: AnalyticsFilters = {},
  options?: Omit<UseQueryOptions<ProductivityInsights, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.insights(userId, filters),
    queryFn: () => analyticsService.getProductivityInsights(userId, filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    enabled: !!userId,
    ...options,
  });
}

// Export analytics data mutation
export function useExportAnalytics(
  options?: UseMutationOptions<Blob, Error, { filters: AnalyticsFilters; format: 'csv' | 'json' | 'pdf' }>
) {
  return useMutation({
    mutationFn: ({ filters, format }) => analyticsService.exportAnalyticsData(filters, format),
    ...options,
  });
}

// Prefetch chart data utility
export function usePrefetchChartData() {
  const queryClient = useQueryClient();

  return (chartId: string, filters: AnalyticsFilters = {}) => {
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.chart(chartId, filters),
      queryFn: () => analyticsService.getChartData(chartId, filters),
      staleTime: 3 * 60 * 1000,
    });
  };
}

// Invalidate analytics data utility
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    invalidateMetrics: (filters?: AnalyticsFilters) => 
      filters 
        ? queryClient.invalidateQueries({ queryKey: analyticsKeys.metrics(filters) })
        : queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'metrics'] }),
    invalidateCharts: () => queryClient.invalidateQueries({ queryKey: analyticsKeys.charts() }),
    invalidateChart: (chartId: string, filters?: AnalyticsFilters) =>
      filters
        ? queryClient.invalidateQueries({ queryKey: analyticsKeys.chart(chartId, filters) })
        : queryClient.invalidateQueries({ queryKey: [...analyticsKeys.charts(), chartId] }),
    invalidateTeamPerformance: (teamId?: string) =>
      teamId
        ? queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'team', teamId] })
        : queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'team'] }),
    invalidateInsights: (userId?: string) =>
      userId
        ? queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'insights', userId] })
        : queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'insights'] }),
  };
}

// Real-time analytics hook (for WebSocket integration)
export function useRealTimeAnalytics(
  enabled: boolean = true,
  options?: {
    onMetricUpdate?: (metric: MetricData) => void;
    onChartUpdate?: (chartData: ChartData) => void;
    onInsightUpdate?: (insight: ProductivityInsights) => void;
  }
) {
  const queryClient = useQueryClient();
  const { onMetricUpdate, onChartUpdate, onInsightUpdate } = options || {};

  // This would integrate with WebSocket service in a real implementation
  const handleRealTimeUpdate = (data: any) => {
    switch (data.type) {
      case 'metric_update':
        // Update specific metric in cache
        queryClient.setQueryData(
          analyticsKeys.metrics(data.filters || {}),
          (old: MetricData[] | undefined) => {
            if (!old) return old;
            return old.map(metric => 
              metric.id === data.metric.id ? { ...metric, ...data.metric } : metric
            );
          }
        );
        onMetricUpdate?.(data.metric);
        break;

      case 'chart_update':
        // Update specific chart in cache
        queryClient.setQueryData(
          analyticsKeys.chart(data.chartId, data.filters || {}),
          (old: ChartData | undefined) => {
            if (!old) return old;
            return { ...old, ...data.chartData };
          }
        );
        onChartUpdate?.(data.chartData);
        break;

      case 'insight_update':
        // Update insights in cache
        queryClient.setQueryData(
          analyticsKeys.insights(data.userId, data.filters || {}),
          (old: ProductivityInsights | undefined) => {
            if (!old) return old;
            return { ...old, ...data.insights };
          }
        );
        onInsightUpdate?.(data.insights);
        break;

      default:
        // Invalidate all analytics data for unknown updates
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    }
  };

  // In a real implementation, this would set up WebSocket listeners
  // For now, we'll just return the handler for manual integration
  return {
    handleRealTimeUpdate,
    isEnabled: enabled,
  };
}