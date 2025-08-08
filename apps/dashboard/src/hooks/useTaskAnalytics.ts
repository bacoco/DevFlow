/**
 * Custom hook for task analytics data management
 * Provides analytics data with caching and real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { taskAnalyticsService } from '../services/taskAnalyticsService';
import {
  TaskAnalytics,
  TaskMetrics,
  TaskTrends,
  TaskInsight,
  TeamPerformanceMetrics,
  AnalyticsFilters,
} from '../types/analytics';

interface UseTaskAnalyticsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

interface UseTaskAnalyticsReturn {
  // Data
  metrics: TaskMetrics | undefined;
  trends: TaskTrends | undefined;
  insights: TaskInsight[] | undefined;
  teamPerformance: TeamPerformanceMetrics | undefined;
  analytics: TaskAnalytics | undefined;
  
  // Loading states
  isLoading: boolean;
  isLoadingMetrics: boolean;
  isLoadingTrends: boolean;
  isLoadingInsights: boolean;
  isLoadingTeamPerformance: boolean;
  
  // Error states
  error: Error | null;
  metricsError: Error | null;
  trendsError: Error | null;
  insightsError: Error | null;
  teamPerformanceError: Error | null;
  
  // Actions
  refetch: () => void;
  invalidate: () => void;
}

// Query keys for consistent cache management
const analyticsKeys = {
  all: ['task-analytics'] as const,
  metrics: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'metrics', filters] as const,
  trends: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'trends', filters] as const,
  insights: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'insights', filters] as const,
  teamPerformance: (teamId: string, filters: AnalyticsFilters) => 
    [...analyticsKeys.all, 'team-performance', teamId, filters] as const,
} as const;

export function useTaskAnalytics(
  filters: AnalyticsFilters,
  options: UseTaskAnalyticsOptions = {}
): UseTaskAnalyticsReturn {
  const {
    enabled = true,
    refetchInterval = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000, // 2 minutes
  } = options;

  const queryClient = useQueryClient();

  // Metrics query
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: analyticsKeys.metrics(filters),
    queryFn: () => taskAnalyticsService.calculateTaskMetrics(filters),
    enabled,
    staleTime,
    refetchInterval,
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error.message.includes('4')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Trends query
  const {
    data: trends,
    isLoading: isLoadingTrends,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: analyticsKeys.trends(filters),
    queryFn: () => taskAnalyticsService.generateTaskTrends(filters),
    enabled,
    staleTime,
    refetchInterval,
    retry: (failureCount, error) => {
      if (error.message.includes('4')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Insights query (depends on metrics and trends)
  const {
    data: insights,
    isLoading: isLoadingInsights,
    error: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: analyticsKeys.insights(filters),
    queryFn: async () => {
      if (!metrics || !trends) {
        throw new Error('Metrics and trends data required for insights');
      }
      return taskAnalyticsService.generateTaskInsights(metrics, trends, filters);
    },
    enabled: enabled && !!metrics && !!trends,
    staleTime: staleTime * 2, // Insights can be stale longer
    refetchInterval: refetchInterval * 2, // Refetch less frequently
  });

  // Team performance query (only if teamId is provided)
  const {
    data: teamPerformance,
    isLoading: isLoadingTeamPerformance,
    error: teamPerformanceError,
    refetch: refetchTeamPerformance,
  } = useQuery({
    queryKey: filters.teamIds?.[0] 
      ? analyticsKeys.teamPerformance(filters.teamIds[0], filters)
      : ['disabled'],
    queryFn: () => {
      if (!filters.teamIds?.[0]) {
        throw new Error('Team ID required for team performance metrics');
      }
      return taskAnalyticsService.generateTeamPerformanceMetrics(filters.teamIds[0], filters);
    },
    enabled: enabled && !!filters.teamIds?.[0],
    staleTime: staleTime * 1.5,
    refetchInterval: refetchInterval * 1.5,
  });

  // Combined analytics data
  const analytics: TaskAnalytics | undefined = metrics && trends ? {
    id: `analytics-${Date.now()}`,
    userId: filters.userIds?.[0],
    teamId: filters.teamIds?.[0],
    timeRange: filters.timeRange || 'last30days',
    generatedAt: new Date().toISOString(),
    metrics,
    trends,
    insights: insights || [],
  } : undefined;

  // Combined loading state
  const isLoading = isLoadingMetrics || isLoadingTrends || isLoadingInsights || 
    (filters.teamIds?.[0] && isLoadingTeamPerformance);

  // Combined error state (prioritize the first error encountered)
  const error = metricsError || trendsError || insightsError || teamPerformanceError;

  // Refetch all data
  const refetch = useCallback(() => {
    refetchMetrics();
    refetchTrends();
    refetchInsights();
    if (filters.teamIds?.[0]) {
      refetchTeamPerformance();
    }
  }, [refetchMetrics, refetchTrends, refetchInsights, refetchTeamPerformance, filters.teamIds]);

  // Invalidate all analytics data
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  }, [queryClient]);

  // Real-time updates (if WebSocket is available)
  useEffect(() => {
    // This would integrate with WebSocket service for real-time updates
    // For now, we'll just set up the structure
    const handleRealTimeUpdate = (data: any) => {
      switch (data.type) {
        case 'task_completed':
        case 'task_created':
        case 'task_updated':
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: analyticsKeys.metrics(filters) });
          queryClient.invalidateQueries({ queryKey: analyticsKeys.trends(filters) });
          break;
        
        case 'team_update':
          if (filters.teamIds?.includes(data.teamId)) {
            queryClient.invalidateQueries({ 
              queryKey: analyticsKeys.teamPerformance(data.teamId, filters) 
            });
          }
          break;
      }
    };

    // In a real implementation, this would set up WebSocket listeners
    // window.addEventListener('task-update', handleRealTimeUpdate);
    
    // return () => {
    //   window.removeEventListener('task-update', handleRealTimeUpdate);
    // };
  }, [queryClient, filters]);

  return {
    // Data
    metrics,
    trends,
    insights,
    teamPerformance,
    analytics,
    
    // Loading states
    isLoading,
    isLoadingMetrics,
    isLoadingTrends,
    isLoadingInsights,
    isLoadingTeamPerformance,
    
    // Error states
    error,
    metricsError,
    trendsError,
    insightsError,
    teamPerformanceError,
    
    // Actions
    refetch,
    invalidate,
  };
}

// Hook for prefetching analytics data
export function usePrefetchTaskAnalytics() {
  const queryClient = useQueryClient();

  return useCallback((filters: AnalyticsFilters) => {
    // Prefetch metrics
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.metrics(filters),
      queryFn: () => taskAnalyticsService.calculateTaskMetrics(filters),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch trends
    queryClient.prefetchQuery({
      queryKey: analyticsKeys.trends(filters),
      queryFn: () => taskAnalyticsService.generateTaskTrends(filters),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch team performance if team ID is provided
    if (filters.teamIds?.[0]) {
      queryClient.prefetchQuery({
        queryKey: analyticsKeys.teamPerformance(filters.teamIds[0], filters),
        queryFn: () => taskAnalyticsService.generateTeamPerformanceMetrics(
          filters.teamIds[0], 
          filters
        ),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, [queryClient]);
}

// Hook for invalidating specific analytics data
export function useInvalidateTaskAnalytics() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    }, [queryClient]),

    invalidateMetrics: useCallback((filters?: AnalyticsFilters) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.metrics(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'metrics'] });
      }
    }, [queryClient]),

    invalidateTrends: useCallback((filters?: AnalyticsFilters) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.trends(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'trends'] });
      }
    }, [queryClient]),

    invalidateInsights: useCallback((filters?: AnalyticsFilters) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.insights(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'insights'] });
      }
    }, [queryClient]),

    invalidateTeamPerformance: useCallback((teamId?: string, filters?: AnalyticsFilters) => {
      if (teamId && filters) {
        queryClient.invalidateQueries({ 
          queryKey: analyticsKeys.teamPerformance(teamId, filters) 
        });
      } else {
        queryClient.invalidateQueries({ 
          queryKey: [...analyticsKeys.all, 'team-performance'] 
        });
      }
    }, [queryClient]),
  };
}