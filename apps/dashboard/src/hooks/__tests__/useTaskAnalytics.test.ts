/**
 * Unit tests for useTaskAnalytics hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTaskAnalytics } from '../useTaskAnalytics';
import { taskAnalyticsService } from '../../services/taskAnalyticsService';
import { AnalyticsFilters } from '../../types/analytics';

// Mock the analytics service
jest.mock('../../services/taskAnalyticsService');

const mockTaskAnalyticsService = taskAnalyticsService as jest.Mocked<typeof taskAnalyticsService>;

// Mock data
const mockMetrics = {
  totalTasks: 10,
  completedTasks: 8,
  inProgressTasks: 1,
  todoTasks: 1,
  overdueTasks: 0,
  completionRate: 80,
  averageCompletionTime: 24,
  velocity: 2.5,
  burndownRate: 85,
  cycleTime: 48,
  leadTime: 24,
};

const mockTrends = {
  completion: [
    { date: '2024-01-01', value: 2 },
    { date: '2024-01-02', value: 3 },
  ],
  velocity: [
    { date: '2024-01-01', value: 2 },
    { date: '2024-01-02', value: 3 },
  ],
  burndown: [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 8 },
  ],
  cycleTime: [
    { date: '2024-01-01', value: 24 },
    { date: '2024-01-02', value: 48 },
  ],
  workload: [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 9 },
  ],
};

const mockInsights = [
  {
    id: 'insight-1',
    type: 'achievement' as const,
    title: 'Great Performance',
    description: 'You are performing well',
    impact: 'high' as const,
    confidence: 90,
    actionable: false,
  },
];

const mockTeamPerformance = {
  teamId: 'team-1',
  teamName: 'Test Team',
  timeRange: 'last30days' as const,
  members: [
    {
      userId: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      metrics: mockMetrics,
      trends: mockTrends,
      productivityScore: 85,
      focusScore: 90,
      collaborationScore: 80,
      qualityScore: 88,
    },
  ],
  aggregatedMetrics: mockMetrics,
  comparisons: {
    previousPeriod: mockMetrics,
    teamAverage: mockMetrics,
  },
  rankings: {
    velocity: [
      {
        userId: 'user-1',
        name: 'Alice',
        score: 2.5,
        rank: 1,
        change: 0,
      },
    ],
    quality: [
      {
        userId: 'user-1',
        name: 'Alice',
        score: 88,
        rank: 1,
        change: 0,
      },
    ],
    efficiency: [
      {
        userId: 'user-1',
        name: 'Alice',
        score: 85,
        rank: 1,
        change: 0,
      },
    ],
  },
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTaskAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockTaskAnalyticsService.calculateTaskMetrics.mockResolvedValue(mockMetrics);
    mockTaskAnalyticsService.generateTaskTrends.mockResolvedValue(mockTrends);
    mockTaskAnalyticsService.generateTaskInsights.mockResolvedValue(mockInsights);
    mockTaskAnalyticsService.generateTeamPerformanceMetrics.mockResolvedValue(mockTeamPerformance);
  });

  it('should fetch and return analytics data', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
      userIds: ['user-1'],
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.metrics).toBeUndefined();
    expect(result.current.trends).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
    expect(result.current.trends).toEqual(mockTrends);
    expect(result.current.insights).toEqual(mockInsights);
    expect(result.current.analytics).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('should fetch team performance when teamId is provided', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
      teamIds: ['team-1'],
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.teamPerformance).toEqual(mockTeamPerformance);
    expect(mockTaskAnalyticsService.generateTeamPerformanceMetrics).toHaveBeenCalledWith(
      'team-1',
      filters
    );
  });

  it('should not fetch team performance when teamId is not provided', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
      userIds: ['user-1'],
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.teamPerformance).toBeUndefined();
    expect(mockTaskAnalyticsService.generateTeamPerformanceMetrics).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('API Error');
    mockTaskAnalyticsService.calculateTaskMetrics.mockRejectedValue(error);

    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.metrics).toBeUndefined();
  });

  it('should respect enabled option', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(
      () => useTaskAnalytics(filters, { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    // Should not be loading since enabled is false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.metrics).toBeUndefined();
    expect(mockTaskAnalyticsService.calculateTaskMetrics).not.toHaveBeenCalled();
  });

  it('should provide refetch functionality', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock calls
    jest.clearAllMocks();

    // Call refetch
    result.current.refetch();

    // Should call service methods again
    expect(mockTaskAnalyticsService.calculateTaskMetrics).toHaveBeenCalledWith(filters);
    expect(mockTaskAnalyticsService.generateTaskTrends).toHaveBeenCalledWith(filters);
  });

  it('should generate analytics object when metrics and trends are available', async () => {
    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
      userIds: ['user-1'],
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics).toBeDefined();
    expect(result.current.analytics).toMatchObject({
      userId: 'user-1',
      timeRange: 'last30days',
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
    });
  });

  it('should handle insights dependency on metrics and trends', async () => {
    // Mock metrics to resolve but trends to fail
    mockTaskAnalyticsService.generateTaskTrends.mockRejectedValue(new Error('Trends error'));

    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingMetrics).toBe(false);
      expect(result.current.isLoadingTrends).toBe(false);
    });

    // Metrics should be available
    expect(result.current.metrics).toEqual(mockMetrics);
    
    // Trends should be undefined due to error
    expect(result.current.trends).toBeUndefined();
    
    // Insights should not be called since trends failed
    expect(result.current.insights).toBeUndefined();
    expect(mockTaskAnalyticsService.generateTaskInsights).not.toHaveBeenCalled();
  });

  it('should provide individual loading states', async () => {
    // Make trends take longer to resolve
    mockTaskAnalyticsService.generateTaskTrends.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTrends), 100))
    );

    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    // Initially all should be loading
    expect(result.current.isLoadingMetrics).toBe(true);
    expect(result.current.isLoadingTrends).toBe(true);

    // Wait for metrics to load first
    await waitFor(() => {
      expect(result.current.isLoadingMetrics).toBe(false);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
    expect(result.current.isLoadingTrends).toBe(true);

    // Wait for trends to load
    await waitFor(() => {
      expect(result.current.isLoadingTrends).toBe(false);
    });

    expect(result.current.trends).toEqual(mockTrends);
  });

  it('should provide individual error states', async () => {
    const metricsError = new Error('Metrics error');
    const trendsError = new Error('Trends error');

    mockTaskAnalyticsService.calculateTaskMetrics.mockRejectedValue(metricsError);
    mockTaskAnalyticsService.generateTaskTrends.mockRejectedValue(trendsError);

    const filters: AnalyticsFilters = {
      timeRange: 'last30days',
    };

    const { result } = renderHook(() => useTaskAnalytics(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metricsError).toEqual(metricsError);
    expect(result.current.trendsError).toEqual(trendsError);
    expect(result.current.error).toEqual(metricsError); // First error encountered
  });
});