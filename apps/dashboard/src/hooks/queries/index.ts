/**
 * React Query hooks index
 * Exports all query hooks for easy importing
 */

// Dashboard queries
export * from './useDashboardQueries';

// Task queries
export * from './useTaskQueries';

// Analytics queries
export * from './useAnalyticsQueries';

// Re-export React Query utilities for convenience
export { useQueryClient, useIsFetching, useIsMutating } from '@tanstack/react-query';