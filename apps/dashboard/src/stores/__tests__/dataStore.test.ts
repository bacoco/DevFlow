/**
 * Data Store Tests
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useDataStore, 
  useDashboardData, 
  useTaskData, 
  useAnalyticsData, 
  useConnectionStatus 
} from '../dataStore';
import { Dashboard, Widget, ProductivityMetric } from '../../types/dashboard';
import { Task } from '../../types/design-system';

// Mock zustand middleware
jest.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  subscribeWithSelector: (fn: any) => fn,
}));

describe('Data Store', () => {
  const mockDashboard: Dashboard = {
    id: 'dashboard-1',
    userId: 'user-1',
    name: 'Test Dashboard',
    widgets: [],
    layout: {
      columns: 12,
      rowHeight: 100,
      margin: [10, 10],
      containerPadding: [10, 10],
    },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWidget: Widget = {
    id: 'widget-1',
    type: 'metric_card',
    title: 'Test Widget',
    config: {
      timeRange: 'week',
      metrics: ['productivity_score'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    data: {
      metrics: [],
      chartData: { labels: [], datasets: [] },
      summary: {
        current: 100,
        previous: 90,
        change: 10,
        changePercent: 11.11,
        trend: 'up',
      },
      lastUpdated: new Date(),
    },
    permissions: [],
    position: { x: 0, y: 0, w: 4, h: 2 },
  };

  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'todo',
    priority: 'medium',
    assignee: {
      id: 'user-1',
      name: 'Test User',
    },
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useDataStore.setState({
      dashboard: {
        dashboards: [],
        activeDashboard: null,
        widgets: {},
        metrics: [],
        lastUpdated: null,
      },
      tasks: {
        tasks: [],
        columns: [
          { id: 'todo', title: 'To Do', status: 'todo', tasks: [] },
          { id: 'in-progress', title: 'In Progress', status: 'in-progress', tasks: [] },
          { id: 'review', title: 'Review', status: 'review', tasks: [] },
          { id: 'done', title: 'Done', status: 'done', tasks: [] },
        ],
        filters: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
        selectedTask: null,
      },
      analytics: {
        metrics: {},
        summaries: {},
        chartData: {},
        timeRange: 'week',
        filters: {},
      },
      connectionStatus: 'disconnected',
      lastSync: null,
    });
  });

  describe('Dashboard Data Management', () => {
    it('should set dashboards correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setDashboards([mockDashboard]);
      });

      expect(result.current.dashboard.dashboards).toHaveLength(1);
      expect(result.current.dashboard.dashboards[0]).toEqual(mockDashboard);
      expect(result.current.dashboard.lastUpdated).toBeInstanceOf(Date);
    });

    it('should set active dashboard', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setActiveDashboard(mockDashboard);
      });

      expect(result.current.dashboard.activeDashboard).toEqual(mockDashboard);
    });

    it('should add widgets correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addWidget(mockWidget);
      });

      expect(result.current.dashboard.widgets[mockWidget.id]).toEqual(mockWidget);
      expect(result.current.dashboard.lastUpdated).toBeInstanceOf(Date);
    });

    it('should update widgets correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addWidget(mockWidget);
        result.current.updateWidget(mockWidget.id, { title: 'Updated Widget' });
      });

      expect(result.current.dashboard.widgets[mockWidget.id].title).toBe('Updated Widget');
    });

    it('should remove widgets correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addWidget(mockWidget);
        result.current.removeWidget(mockWidget.id);
      });

      expect(result.current.dashboard.widgets[mockWidget.id]).toBeUndefined();
    });

    it('should update widget data', () => {
      const { result } = renderHook(() => useDataStore());
      const newData = { summary: { current: 150, previous: 100, change: 50, changePercent: 50, trend: 'up' as const } };

      act(() => {
        result.current.addWidget(mockWidget);
        result.current.updateWidgetData(mockWidget.id, newData);
      });

      expect(result.current.dashboard.widgets[mockWidget.id].data.summary.current).toBe(150);
    });

    it('should provide dashboard data selector hook', () => {
      const { result } = renderHook(() => useDashboardData());

      expect(result.current.dashboards).toEqual([]);
      expect(result.current.activeDashboard).toBeNull();
      expect(typeof result.current.setDashboards).toBe('function');
      expect(typeof result.current.addWidget).toBe('function');
    });
  });

  describe('Task Data Management', () => {
    it('should set tasks correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setTasks([mockTask]);
      });

      expect(result.current.tasks.tasks).toHaveLength(1);
      expect(result.current.tasks.tasks[0]).toEqual(mockTask);
      
      // Check that task is added to correct column
      const todoColumn = result.current.tasks.columns.find(c => c.status === 'todo');
      expect(todoColumn?.tasks).toHaveLength(1);
      expect(todoColumn?.tasks[0]).toEqual(mockTask);
    });

    it('should add tasks correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addTask(mockTask);
      });

      expect(result.current.tasks.tasks).toHaveLength(1);
      expect(result.current.tasks.tasks[0]).toEqual(mockTask);
    });

    it('should update tasks correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addTask(mockTask);
        result.current.updateTask(mockTask.id, { title: 'Updated Task' });
      });

      expect(result.current.tasks.tasks[0].title).toBe('Updated Task');
      expect(result.current.tasks.tasks[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should move tasks between columns', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addTask(mockTask);
        result.current.moveTask(mockTask.id, 'todo', 'in-progress');
      });

      const todoColumn = result.current.tasks.columns.find(c => c.status === 'todo');
      const inProgressColumn = result.current.tasks.columns.find(c => c.status === 'in-progress');
      
      expect(todoColumn?.tasks).toHaveLength(0);
      expect(inProgressColumn?.tasks).toHaveLength(1);
      expect(result.current.tasks.tasks[0].status).toBe('in-progress');
    });

    it('should remove tasks correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.addTask(mockTask);
        result.current.removeTask(mockTask.id);
      });

      expect(result.current.tasks.tasks).toHaveLength(0);
      
      // Check that task is removed from column
      const todoColumn = result.current.tasks.columns.find(c => c.status === 'todo');
      expect(todoColumn?.tasks).toHaveLength(0);
    });

    it('should set task filters', () => {
      const { result } = renderHook(() => useDataStore());
      const filters = { status: ['todo', 'in-progress'] as any, assignee: ['user-1'] };

      act(() => {
        result.current.setTaskFilters(filters);
      });

      expect(result.current.tasks.filters).toEqual(filters);
    });

    it('should set task sorting', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setTaskSort('priority', 'asc');
      });

      expect(result.current.tasks.sortBy).toBe('priority');
      expect(result.current.tasks.sortOrder).toBe('asc');
    });

    it('should bulk update tasks', () => {
      const { result } = renderHook(() => useDataStore());
      const task2: Task = { ...mockTask, id: 'task-2', title: 'Task 2' };

      act(() => {
        result.current.setTasks([mockTask, task2]);
        result.current.bulkUpdateTasks(['task-1', 'task-2'], { priority: 'high' });
      });

      expect(result.current.tasks.tasks[0].priority).toBe('high');
      expect(result.current.tasks.tasks[1].priority).toBe('high');
    });

    it('should provide task data selector hook', () => {
      const { result } = renderHook(() => useTaskData());

      expect(result.current.tasks).toEqual([]);
      expect(result.current.columns).toHaveLength(4);
      expect(typeof result.current.addTask).toBe('function');
      expect(typeof result.current.updateTask).toBe('function');
    });
  });

  describe('Analytics Data Management', () => {
    const mockMetrics: ProductivityMetric[] = [
      {
        id: 'metric-1',
        userId: 'user-1',
        metricType: 'productivity_score',
        value: 85,
        timestamp: new Date(),
        aggregationPeriod: 'day',
        context: {},
      },
    ];

    it('should set metrics correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setMetrics('productivity_score', mockMetrics);
      });

      expect(result.current.analytics.metrics.productivity_score).toEqual(mockMetrics);
    });

    it('should update metric summaries', () => {
      const { result } = renderHook(() => useDataStore());
      const summary = {
        current: 85,
        previous: 80,
        change: 5,
        changePercent: 6.25,
        trend: 'up' as const,
      };

      act(() => {
        result.current.updateMetricSummary('productivity_score', summary);
      });

      expect(result.current.analytics.summaries.productivity_score).toEqual(summary);
    });

    it('should set chart data', () => {
      const { result } = renderHook(() => useDataStore());
      const chartData = {
        labels: ['Mon', 'Tue', 'Wed'],
        datasets: [{ label: 'Productivity', data: [80, 85, 90] }],
      };

      act(() => {
        result.current.setChartData('productivity-chart', chartData);
      });

      expect(result.current.analytics.chartData['productivity-chart']).toEqual(chartData);
    });

    it('should set analytics time range', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setAnalyticsTimeRange('month');
      });

      expect(result.current.analytics.timeRange).toBe('month');
    });

    it('should set analytics filters', () => {
      const { result } = renderHook(() => useDataStore());
      const filters = { teamId: 'team-1', userId: 'user-1' };

      act(() => {
        result.current.setAnalyticsFilters(filters);
      });

      expect(result.current.analytics.filters).toEqual(filters);
    });

    it('should provide analytics data selector hook', () => {
      const { result } = renderHook(() => useAnalyticsData());

      expect(result.current.metrics).toEqual({});
      expect(result.current.summaries).toEqual({});
      expect(result.current.timeRange).toBe('week');
      expect(typeof result.current.setMetrics).toBe('function');
    });
  });

  describe('Connection Status Management', () => {
    it('should set connection status', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setConnectionStatus('connected');
      });

      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should update last sync time', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.updateLastSync();
      });

      expect(result.current.lastSync).toBeInstanceOf(Date);
    });

    it('should provide connection status selector hook', () => {
      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.status).toBe('disconnected');
      expect(result.current.lastSync).toBeNull();
      expect(typeof result.current.setConnectionStatus).toBe('function');
      expect(typeof result.current.updateLastSync).toBe('function');
    });
  });

  describe('Utility Actions', () => {
    it('should clear all data', () => {
      const { result } = renderHook(() => useDataStore());

      // Add some data first
      act(() => {
        result.current.setDashboards([mockDashboard]);
        result.current.addTask(mockTask);
        result.current.setConnectionStatus('connected');
      });

      // Clear all data
      act(() => {
        result.current.clearAllData();
      });

      expect(result.current.dashboard.dashboards).toEqual([]);
      expect(result.current.tasks.tasks).toEqual([]);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.lastSync).toBeNull();
    });

    it('should refresh data', async () => {
      const { result } = renderHook(() => useDataStore());

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.lastSync).toBeInstanceOf(Date);
    });
  });
});