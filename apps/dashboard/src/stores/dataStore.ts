/**
 * Data State Store
 * Manages application data state using Zustand
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
  Dashboard, 
  Widget, 
  ProductivityMetric, 
  ChartData,
  MetricSummary,
  TimePeriod,
  MetricType,
  WidgetType
} from '../types/dashboard';
import { Task, TaskColumn, TaskStatus } from '../types/design-system';

interface DashboardData {
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  widgets: Record<string, Widget>;
  metrics: ProductivityMetric[];
  lastUpdated: Date | null;
}

interface TaskData {
  tasks: Task[];
  columns: TaskColumn[];
  filters: {
    status?: TaskStatus[];
    assignee?: string[];
    priority?: string[];
    tags?: string[];
    search?: string;
  };
  sortBy: keyof Task;
  sortOrder: 'asc' | 'desc';
  selectedTask: Task | null;
}

interface AnalyticsData {
  metrics: Record<MetricType, ProductivityMetric[]>;
  summaries: Record<MetricType, MetricSummary>;
  chartData: Record<string, ChartData>;
  timeRange: TimePeriod;
  filters: {
    teamId?: string;
    userId?: string;
    projectId?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

interface DataState {
  // Dashboard data
  dashboard: DashboardData;
  
  // Task data
  tasks: TaskData;
  
  // Analytics data
  analytics: AnalyticsData;
  
  // Real-time connection status
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastSync: Date | null;
  
  // Dashboard actions
  setDashboards: (dashboards: Dashboard[]) => void;
  setActiveDashboard: (dashboard: Dashboard | null) => void;
  addWidget: (widget: Widget) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
  removeWidget: (widgetId: string) => void;
  updateWidgetData: (widgetId: string, data: any) => void;
  reorderWidgets: (widgetIds: string[]) => void;
  
  // Task actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  moveTask: (taskId: string, fromColumn: string, toColumn: string) => void;
  setTaskFilters: (filters: Partial<TaskData['filters']>) => void;
  setTaskSort: (sortBy: keyof Task, sortOrder: 'asc' | 'desc') => void;
  setSelectedTask: (task: Task | null) => void;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => void;
  
  // Analytics actions
  setMetrics: (metricType: MetricType, metrics: ProductivityMetric[]) => void;
  updateMetricSummary: (metricType: MetricType, summary: MetricSummary) => void;
  setChartData: (chartId: string, data: ChartData) => void;
  setAnalyticsTimeRange: (timeRange: TimePeriod) => void;
  setAnalyticsFilters: (filters: Partial<AnalyticsData['filters']>) => void;
  
  // Real-time actions
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  updateLastSync: () => void;
  
  // Utility actions
  clearAllData: () => void;
  refreshData: () => Promise<void>;
}

const initialDashboardData: DashboardData = {
  dashboards: [],
  activeDashboard: null,
  widgets: {},
  metrics: [],
  lastUpdated: null,
};

const initialTaskData: TaskData = {
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
};

const initialAnalyticsData: AnalyticsData = {
  metrics: {} as Record<MetricType, ProductivityMetric[]>,
  summaries: {} as Record<MetricType, MetricSummary>,
  chartData: {},
  timeRange: 'week',
  filters: {},
};

export const useDataStore = create<DataState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        dashboard: initialDashboardData,
        tasks: initialTaskData,
        analytics: initialAnalyticsData,
        connectionStatus: 'disconnected',
        lastSync: null,

        // Dashboard actions
        setDashboards: (dashboards) => set((state) => ({
          dashboard: { ...state.dashboard, dashboards, lastUpdated: new Date() }
        })),

        setActiveDashboard: (dashboard) => set((state) => ({
          dashboard: { ...state.dashboard, activeDashboard: dashboard }
        })),

        addWidget: (widget) => set((state) => ({
          dashboard: {
            ...state.dashboard,
            widgets: { ...state.dashboard.widgets, [widget.id]: widget },
            lastUpdated: new Date()
          }
        })),

        updateWidget: (widgetId, updates) => set((state) => {
          const widget = state.dashboard.widgets[widgetId];
          if (!widget) return state;

          return {
            dashboard: {
              ...state.dashboard,
              widgets: {
                ...state.dashboard.widgets,
                [widgetId]: { ...widget, ...updates }
              },
              lastUpdated: new Date()
            }
          };
        }),

        removeWidget: (widgetId) => set((state) => {
          const { [widgetId]: removed, ...remainingWidgets } = state.dashboard.widgets;
          return {
            dashboard: {
              ...state.dashboard,
              widgets: remainingWidgets,
              lastUpdated: new Date()
            }
          };
        }),

        updateWidgetData: (widgetId, data) => set((state) => {
          const widget = state.dashboard.widgets[widgetId];
          if (!widget) return state;

          return {
            dashboard: {
              ...state.dashboard,
              widgets: {
                ...state.dashboard.widgets,
                [widgetId]: { ...widget, data: { ...widget.data, ...data } }
              },
              lastUpdated: new Date()
            }
          };
        }),

        reorderWidgets: (widgetIds) => set((state) => {
          const reorderedWidgets: Record<string, Widget> = {};
          widgetIds.forEach((id, index) => {
            const widget = state.dashboard.widgets[id];
            if (widget) {
              reorderedWidgets[id] = { ...widget, position: { ...widget.position, x: index } };
            }
          });

          return {
            dashboard: {
              ...state.dashboard,
              widgets: { ...state.dashboard.widgets, ...reorderedWidgets },
              lastUpdated: new Date()
            }
          };
        }),

        // Task actions
        setTasks: (tasks) => set((state) => {
          // Group tasks by status
          const tasksByStatus = tasks.reduce((acc, task) => {
            if (!acc[task.status]) acc[task.status] = [];
            acc[task.status].push(task);
            return acc;
          }, {} as Record<TaskStatus, Task[]>);

          // Update columns with tasks
          const updatedColumns = state.tasks.columns.map(column => ({
            ...column,
            tasks: tasksByStatus[column.status] || []
          }));

          return {
            tasks: { ...state.tasks, tasks, columns: updatedColumns }
          };
        }),

        addTask: (task) => set((state) => {
          const updatedTasks = [...state.tasks.tasks, task];
          const updatedColumns = state.tasks.columns.map(column => 
            column.status === task.status 
              ? { ...column, tasks: [...column.tasks, task] }
              : column
          );

          return {
            tasks: { ...state.tasks, tasks: updatedTasks, columns: updatedColumns }
          };
        }),

        updateTask: (taskId, updates) => set((state) => {
          const taskIndex = state.tasks.tasks.findIndex(t => t.id === taskId);
          if (taskIndex === -1) return state;

          const oldTask = state.tasks.tasks[taskIndex];
          const updatedTask = { ...oldTask, ...updates, updatedAt: new Date() };
          const updatedTasks = [...state.tasks.tasks];
          updatedTasks[taskIndex] = updatedTask;

          // Update columns if status changed
          let updatedColumns = state.tasks.columns;
          if (updates.status && updates.status !== oldTask.status) {
            updatedColumns = state.tasks.columns.map(column => {
              if (column.status === oldTask.status) {
                return { ...column, tasks: column.tasks.filter(t => t.id !== taskId) };
              }
              if (column.status === updates.status) {
                return { ...column, tasks: [...column.tasks, updatedTask] };
              }
              return column;
            });
          } else {
            updatedColumns = state.tasks.columns.map(column => ({
              ...column,
              tasks: column.tasks.map(t => t.id === taskId ? updatedTask : t)
            }));
          }

          return {
            tasks: { ...state.tasks, tasks: updatedTasks, columns: updatedColumns }
          };
        }),

        removeTask: (taskId) => set((state) => {
          const updatedTasks = state.tasks.tasks.filter(t => t.id !== taskId);
          const updatedColumns = state.tasks.columns.map(column => ({
            ...column,
            tasks: column.tasks.filter(t => t.id !== taskId)
          }));

          return {
            tasks: { 
              ...state.tasks, 
              tasks: updatedTasks, 
              columns: updatedColumns,
              selectedTask: state.tasks.selectedTask?.id === taskId ? null : state.tasks.selectedTask
            }
          };
        }),

        moveTask: (taskId, fromColumn, toColumn) => {
          const task = get().tasks.tasks.find(t => t.id === taskId);
          if (!task) return;

          const newStatus = get().tasks.columns.find(c => c.id === toColumn)?.status;
          if (!newStatus) return;

          get().updateTask(taskId, { status: newStatus });
        },

        setTaskFilters: (filters) => set((state) => ({
          tasks: { ...state.tasks, filters: { ...state.tasks.filters, ...filters } }
        })),

        setTaskSort: (sortBy, sortOrder) => set((state) => ({
          tasks: { ...state.tasks, sortBy, sortOrder }
        })),

        setSelectedTask: (task) => set((state) => ({
          tasks: { ...state.tasks, selectedTask: task }
        })),

        bulkUpdateTasks: (taskIds, updates) => set((state) => {
          const updatedTasks = state.tasks.tasks.map(task => 
            taskIds.includes(task.id) 
              ? { ...task, ...updates, updatedAt: new Date() }
              : task
          );

          // Update columns
          const tasksByStatus = updatedTasks.reduce((acc, task) => {
            if (!acc[task.status]) acc[task.status] = [];
            acc[task.status].push(task);
            return acc;
          }, {} as Record<TaskStatus, Task[]>);

          const updatedColumns = state.tasks.columns.map(column => ({
            ...column,
            tasks: tasksByStatus[column.status] || []
          }));

          return {
            tasks: { ...state.tasks, tasks: updatedTasks, columns: updatedColumns }
          };
        }),

        // Analytics actions
        setMetrics: (metricType, metrics) => set((state) => ({
          analytics: {
            ...state.analytics,
            metrics: { ...state.analytics.metrics, [metricType]: metrics }
          }
        })),

        updateMetricSummary: (metricType, summary) => set((state) => ({
          analytics: {
            ...state.analytics,
            summaries: { ...state.analytics.summaries, [metricType]: summary }
          }
        })),

        setChartData: (chartId, data) => set((state) => ({
          analytics: {
            ...state.analytics,
            chartData: { ...state.analytics.chartData, [chartId]: data }
          }
        })),

        setAnalyticsTimeRange: (timeRange) => set((state) => ({
          analytics: { ...state.analytics, timeRange }
        })),

        setAnalyticsFilters: (filters) => set((state) => ({
          analytics: { 
            ...state.analytics, 
            filters: { ...state.analytics.filters, ...filters } 
          }
        })),

        // Real-time actions
        setConnectionStatus: (status) => set({ connectionStatus: status }),

        updateLastSync: () => set({ lastSync: new Date() }),

        // Utility actions
        clearAllData: () => set({
          dashboard: initialDashboardData,
          tasks: initialTaskData,
          analytics: initialAnalyticsData,
          connectionStatus: 'disconnected',
          lastSync: null,
        }),

        refreshData: async () => {
          // This would typically trigger data refetch from APIs
          // For now, just update the last sync time
          set({ lastSync: new Date() });
        },
      })
    ),
    {
      name: 'data-store',
    }
  )
);

// Selector hooks for better performance
export const useDashboardData = () => useDataStore((state) => ({
  dashboards: state.dashboard.dashboards,
  activeDashboard: state.dashboard.activeDashboard,
  widgets: state.dashboard.widgets,
  metrics: state.dashboard.metrics,
  lastUpdated: state.dashboard.lastUpdated,
  setDashboards: state.setDashboards,
  setActiveDashboard: state.setActiveDashboard,
  addWidget: state.addWidget,
  updateWidget: state.updateWidget,
  removeWidget: state.removeWidget,
  updateWidgetData: state.updateWidgetData,
  reorderWidgets: state.reorderWidgets,
}));

export const useTaskData = () => useDataStore((state) => ({
  tasks: state.tasks.tasks,
  columns: state.tasks.columns,
  filters: state.tasks.filters,
  sortBy: state.tasks.sortBy,
  sortOrder: state.tasks.sortOrder,
  selectedTask: state.tasks.selectedTask,
  setTasks: state.setTasks,
  addTask: state.addTask,
  updateTask: state.updateTask,
  removeTask: state.removeTask,
  moveTask: state.moveTask,
  setTaskFilters: state.setTaskFilters,
  setTaskSort: state.setTaskSort,
  setSelectedTask: state.setSelectedTask,
  bulkUpdateTasks: state.bulkUpdateTasks,
}));

export const useAnalyticsData = () => useDataStore((state) => ({
  metrics: state.analytics.metrics,
  summaries: state.analytics.summaries,
  chartData: state.analytics.chartData,
  timeRange: state.analytics.timeRange,
  filters: state.analytics.filters,
  setMetrics: state.setMetrics,
  updateMetricSummary: state.updateMetricSummary,
  setChartData: state.setChartData,
  setAnalyticsTimeRange: state.setAnalyticsTimeRange,
  setAnalyticsFilters: state.setAnalyticsFilters,
}));

export const useConnectionStatus = () => useDataStore((state) => ({
  status: state.connectionStatus,
  lastSync: state.lastSync,
  setConnectionStatus: state.setConnectionStatus,
  updateLastSync: state.updateLastSync,
}));