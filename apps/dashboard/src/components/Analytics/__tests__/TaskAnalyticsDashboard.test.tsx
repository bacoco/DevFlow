/**
 * Unit tests for TaskAnalyticsDashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskAnalyticsDashboard } from '../TaskAnalyticsDashboard';
import { useTaskAnalytics } from '../../../hooks/useTaskAnalytics';

// Mock the hook
jest.mock('../../../hooks/useTaskAnalytics');

const mockUseTaskAnalytics = useTaskAnalytics as jest.MockedFunction<typeof useTaskAnalytics>;

// Mock child components
jest.mock('../TaskMetricsCards', () => ({
  TaskMetricsCards: ({ metrics }: any) => (
    <div data-testid="task-metrics-cards">
      Metrics: {metrics?.totalTasks || 0} tasks
    </div>
  ),
}));

jest.mock('../CompletionTrendChart', () => ({
  CompletionTrendChart: ({ data, title }: any) => (
    <div data-testid="completion-trend-chart">
      {title}: {data?.length || 0} data points
    </div>
  ),
}));

jest.mock('../VelocityChart', () => ({
  VelocityChart: ({ data, title }: any) => (
    <div data-testid="velocity-chart">
      {title}: {data?.length || 0} data points
    </div>
  ),
}));

jest.mock('../BurndownChart', () => ({
  BurndownChart: ({ data, title }: any) => (
    <div data-testid="burndown-chart">
      {title}: {data?.length || 0} data points
    </div>
  ),
}));

jest.mock('../ProductivityInsights', () => ({
  ProductivityInsights: ({ insights }: any) => (
    <div data-testid="productivity-insights">
      Insights: {insights?.length || 0} items
    </div>
  ),
}));

jest.mock('../TeamPerformanceTable', () => ({
  TeamPerformanceTable: ({ teamPerformance }: any) => (
    <div data-testid="team-performance-table">
      Team: {teamPerformance?.teamName || 'No team'}
    </div>
  ),
}));

jest.mock('../ReportGenerator', () => ({
  ReportGenerator: ({ filters }: any) => (
    <div data-testid="report-generator">
      Report for: {filters?.timeRange || 'unknown'}
    </div>
  ),
}));

jest.mock('../AnalyticsFilters', () => ({
  AnalyticsFilters: ({ filters, onChange }: any) => (
    <div data-testid="analytics-filters">
      <button onClick={() => onChange({ ...filters, timeRange: 'last7days' })}>
        Change Filter
      </button>
    </div>
  ),
}));

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
  members: [],
  aggregatedMetrics: mockMetrics,
  comparisons: {
    previousPeriod: mockMetrics,
    teamAverage: mockMetrics,
  },
  rankings: {
    velocity: [],
    quality: [],
    efficiency: [],
  },
};

// Test wrapper
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

describe('TaskAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseTaskAnalytics.mockReturnValue({
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
      teamPerformance: undefined,
      analytics: {
        id: 'analytics-1',
        timeRange: 'last30days',
        generatedAt: '2024-01-01T00:00:00Z',
        metrics: mockMetrics,
        trends: mockTrends,
        insights: mockInsights,
      },
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });
  });

  it('should render dashboard with analytics data', () => {
    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Task Analytics')).toBeInTheDocument();
    expect(screen.getByText('Insights and performance metrics for your tasks')).toBeInTheDocument();
    
    // Should show metrics cards
    expect(screen.getByTestId('task-metrics-cards')).toBeInTheDocument();
    expect(screen.getByText('Metrics: 10 tasks')).toBeInTheDocument();
    
    // Should show charts
    expect(screen.getByTestId('completion-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('velocity-chart')).toBeInTheDocument();
    
    // Should show insights
    expect(screen.getByTestId('productivity-insights')).toBeInTheDocument();
    expect(screen.getByText('Insights: 1 items')).toBeInTheDocument();
  });

  it('should render with team performance when teamId is provided', () => {
    mockUseTaskAnalytics.mockReturnValue({
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
      teamPerformance: mockTeamPerformance,
      analytics: undefined,
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard teamId="team-1" />, { wrapper: createWrapper() });

    // Team tab should be enabled
    const teamTab = screen.getByText('Team Performance');
    expect(teamTab).toBeInTheDocument();
    expect(teamTab.closest('button')).not.toBeDisabled();
  });

  it('should disable team tab when no teamId is provided', () => {
    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    const teamTab = screen.getByText('Team Performance');
    expect(teamTab.closest('button')).toBeDisabled();
  });

  it('should handle loading state', () => {
    mockUseTaskAnalytics.mockReturnValue({
      metrics: undefined,
      trends: undefined,
      insights: undefined,
      teamPerformance: undefined,
      analytics: undefined,
      isLoading: true,
      isLoadingMetrics: true,
      isLoadingTrends: true,
      isLoadingInsights: true,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    // Refresh button should show loading state
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  it('should handle error state', () => {
    const error = new Error('Failed to load analytics');
    mockUseTaskAnalytics.mockReturnValue({
      metrics: undefined,
      trends: undefined,
      insights: undefined,
      teamPerformance: undefined,
      analytics: undefined,
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error,
      metricsError: error,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to Load Analytics')).toBeInTheDocument();
    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should handle tab navigation', () => {
    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    // Initially on Overview tab
    expect(screen.getByTestId('task-metrics-cards')).toBeInTheDocument();

    // Click on Trends tab
    fireEvent.click(screen.getByText('Trends'));

    // Should show trend charts
    expect(screen.getByTestId('burndown-chart')).toBeInTheDocument();
    expect(screen.getByText('Burndown Chart: 2 data points')).toBeInTheDocument();

    // Click on Reports tab
    fireEvent.click(screen.getByText('Reports'));

    // Should show report generator
    expect(screen.getByTestId('report-generator')).toBeInTheDocument();
  });

  it('should handle time range selection', () => {
    const mockRefetch = jest.fn();
    mockUseTaskAnalytics.mockReturnValue({
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
      teamPerformance: undefined,
      analytics: undefined,
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: mockRefetch,
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    // Find and change time range selector
    const timeRangeSelect = screen.getByDisplayValue('Last 30 Days');
    fireEvent.change(timeRangeSelect, { target: { value: 'last7days' } });

    // Should call useTaskAnalytics with new filters
    expect(mockUseTaskAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: 'last7days',
      })
    );
  });

  it('should handle refresh button click', () => {
    const mockRefetch = jest.fn();
    mockUseTaskAnalytics.mockReturnValue({
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
      teamPerformance: undefined,
      analytics: undefined,
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: mockRefetch,
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Refresh'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should handle filters modal', () => {
    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    // Open filters modal
    fireEvent.click(screen.getByText('Filters'));

    // Should show analytics filters
    expect(screen.getByTestId('analytics-filters')).toBeInTheDocument();
  });

  it('should handle export modal', () => {
    render(<TaskAnalyticsDashboard />, { wrapper: createWrapper() });

    // Open export modal
    fireEvent.click(screen.getByText('Export'));

    // Should show report generator
    expect(screen.getByTestId('report-generator')).toBeInTheDocument();
  });

  it('should pass correct props to child components', () => {
    render(<TaskAnalyticsDashboard userId="user-1" teamId="team-1" />, { wrapper: createWrapper() });

    // Should call useTaskAnalytics with correct filters
    expect(mockUseTaskAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: 'last30days',
        userIds: ['user-1'],
        teamIds: ['team-1'],
      })
    );
  });

  it('should handle team performance tab when team data is available', () => {
    mockUseTaskAnalytics.mockReturnValue({
      metrics: mockMetrics,
      trends: mockTrends,
      insights: mockInsights,
      teamPerformance: mockTeamPerformance,
      analytics: undefined,
      isLoading: false,
      isLoadingMetrics: false,
      isLoadingTrends: false,
      isLoadingInsights: false,
      isLoadingTeamPerformance: false,
      error: null,
      metricsError: null,
      trendsError: null,
      insightsError: null,
      teamPerformanceError: null,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });

    render(<TaskAnalyticsDashboard teamId="team-1" />, { wrapper: createWrapper() });

    // Click on Team Performance tab
    fireEvent.click(screen.getByText('Team Performance'));

    // Should show team performance table
    expect(screen.getByTestId('team-performance-table')).toBeInTheDocument();
    expect(screen.getByText('Team: Test Team')).toBeInTheDocument();
  });
});