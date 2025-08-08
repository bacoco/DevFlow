/**
 * React Query hooks for dashboard data management
 * Provides caching, background updates, and optimistic updates for dashboard operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';
import { Dashboard, Widget, WidgetConfig } from '../../types/dashboard';

// Query keys for consistent cache management
export const dashboardKeys = {
  all: ['dashboards'] as const,
  dashboard: (id: string, userId: string) => [...dashboardKeys.all, 'dashboard', id, userId] as const,
  preferences: () => [...dashboardKeys.all, 'preferences'] as const,
} as const;

// Dashboard data query hook
export function useDashboard(
  dashboardId: string,
  userId: string,
  options?: Omit<UseQueryOptions<Dashboard | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.dashboard(dashboardId, userId),
    queryFn: () => dashboardService.loadDashboardLayout(dashboardId, userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication')) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });
}

// Dashboard preferences query hook
export function useDashboardPreferences(
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.preferences(),
    queryFn: () => dashboardService.getDashboardPreferences(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Save dashboard layout mutation
export function useSaveDashboardLayout(
  options?: UseMutationOptions<void, Error, Dashboard>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dashboard: Dashboard) => dashboardService.saveDashboardLayout(dashboard),
    onMutate: async (newDashboard) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: dashboardKeys.dashboard(newDashboard.id, newDashboard.userId)
      });

      // Snapshot the previous value
      const previousDashboard = queryClient.getQueryData(
        dashboardKeys.dashboard(newDashboard.id, newDashboard.userId)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        dashboardKeys.dashboard(newDashboard.id, newDashboard.userId),
        newDashboard
      );

      // Return a context object with the snapshotted value
      return { previousDashboard, newDashboard };
    },
    onError: (err, newDashboard, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDashboard) {
        queryClient.setQueryData(
          dashboardKeys.dashboard(newDashboard.id, newDashboard.userId),
          context.previousDashboard
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.dashboard(variables.id, variables.userId)
      });
    },
    ...options,
  });
}

// Update widget configuration mutation
export function useUpdateWidgetConfig(
  dashboardId: string,
  options?: UseMutationOptions<void, Error, { widgetId: string; config: WidgetConfig }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ widgetId, config }) => 
      dashboardService.updateWidgetConfig(dashboardId, widgetId, config),
    onMutate: async ({ widgetId, config }) => {
      // Cancel any outgoing refetches
      const queryKey = dashboardKeys.all;
      await queryClient.cancelQueries({ queryKey });

      // Get all dashboard queries and update them optimistically
      const queryCache = queryClient.getQueryCache();
      const dashboardQueries = queryCache.findAll({
        queryKey: dashboardKeys.all,
        type: 'active'
      });

      const previousData: Array<{ queryKey: any; data: any }> = [];

      dashboardQueries.forEach((query) => {
        const currentData = query.state.data as Dashboard | null;
        if (currentData && currentData.id === dashboardId) {
          previousData.push({
            queryKey: query.queryKey,
            data: currentData
          });

          // Optimistically update the widget
          const updatedDashboard = {
            ...currentData,
            widgets: currentData.widgets.map(widget =>
              widget.id === widgetId
                ? { ...widget, config, title: config.title || widget.title }
                : widget
            ),
            updatedAt: new Date(),
          };

          queryClient.setQueryData(query.queryKey, updatedDashboard);
        }
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Roll back optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all
      });
    },
    ...options,
  });
}

// Add widget mutation
export function useAddWidget(
  dashboardId: string,
  options?: UseMutationOptions<void, Error, Widget>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (widget: Widget) => dashboardService.addWidget(dashboardId, widget),
    onMutate: async (newWidget) => {
      // Cancel any outgoing refetches
      const queryKey = dashboardKeys.all;
      await queryClient.cancelQueries({ queryKey });

      // Get all dashboard queries and update them optimistically
      const queryCache = queryClient.getQueryCache();
      const dashboardQueries = queryCache.findAll({
        queryKey: dashboardKeys.all,
        type: 'active'
      });

      const previousData: Array<{ queryKey: any; data: any }> = [];

      dashboardQueries.forEach((query) => {
        const currentData = query.state.data as Dashboard | null;
        if (currentData && currentData.id === dashboardId) {
          previousData.push({
            queryKey: query.queryKey,
            data: currentData
          });

          // Optimistically add the widget
          const updatedDashboard = {
            ...currentData,
            widgets: [...currentData.widgets, newWidget],
            updatedAt: new Date(),
          };

          queryClient.setQueryData(query.queryKey, updatedDashboard);
        }
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Roll back optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all
      });
    },
    ...options,
  });
}

// Remove widget mutation
export function useRemoveWidget(
  dashboardId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (widgetId: string) => dashboardService.removeWidget(dashboardId, widgetId),
    onMutate: async (widgetId) => {
      // Cancel any outgoing refetches
      const queryKey = dashboardKeys.all;
      await queryClient.cancelQueries({ queryKey });

      // Get all dashboard queries and update them optimistically
      const queryCache = queryClient.getQueryCache();
      const dashboardQueries = queryCache.findAll({
        queryKey: dashboardKeys.all,
        type: 'active'
      });

      const previousData: Array<{ queryKey: any; data: any }> = [];

      dashboardQueries.forEach((query) => {
        const currentData = query.state.data as Dashboard | null;
        if (currentData && currentData.id === dashboardId) {
          previousData.push({
            queryKey: query.queryKey,
            data: currentData
          });

          // Optimistically remove the widget
          const updatedDashboard = {
            ...currentData,
            widgets: currentData.widgets.filter(widget => widget.id !== widgetId),
            updatedAt: new Date(),
          };

          queryClient.setQueryData(query.queryKey, updatedDashboard);
        }
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Roll back optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all
      });
    },
    ...options,
  });
}

// Save dashboard preferences mutation
export function useSaveDashboardPreferences(
  options?: UseMutationOptions<void, Error, any>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: any) => {
      dashboardService.saveDashboardPreferences(preferences);
      return Promise.resolve();
    },
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: dashboardKeys.preferences()
      });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData(dashboardKeys.preferences());

      // Optimistically update to the new value
      queryClient.setQueryData(dashboardKeys.preferences(), newPreferences);

      // Return a context object with the snapshotted value
      return { previousPreferences };
    },
    onError: (err, newPreferences, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPreferences) {
        queryClient.setQueryData(dashboardKeys.preferences(), context.previousPreferences);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.preferences()
      });
    },
    ...options,
  });
}

// Export dashboard mutation
export function useExportDashboard(
  options?: UseMutationOptions<string, Error, Dashboard>
) {
  return useMutation({
    mutationFn: (dashboard: Dashboard) => {
      const exportData = dashboardService.exportDashboard(dashboard);
      return Promise.resolve(exportData);
    },
    ...options,
  });
}

// Import dashboard mutation
export function useImportDashboard(
  options?: UseMutationOptions<Dashboard, Error, { dashboardId: string; importData: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dashboardId, importData }) => 
      dashboardService.importDashboard(dashboardId, importData),
    onSuccess: (dashboard) => {
      // Update the cache with the imported dashboard
      queryClient.setQueryData(
        dashboardKeys.dashboard(dashboard.id, dashboard.userId),
        dashboard
      );
      
      // Invalidate all dashboard queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all
      });
    },
    ...options,
  });
}