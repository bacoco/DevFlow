/**
 * Tests for dashboard React Query hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import {
  useDashboard,
  useDashboardPreferences,
  useSaveDashboardLayout,
  useUpdateWidgetConfig,
  useAddWidget,
  useRemoveWidget,
  useSaveDashboardPreferences,
  useExportDashboard,
  useImportDashboard,
} from '../useDashboardQueries';
import { Dashboard, Widget, WidgetConfig } from '../../../types/dashboard';

// Mock the dashboard service
jest.mock('../../../services/dashboardService');
const mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

// Test data
const mockDashboard: Dashboard = {
  id: 'test-dashboard',
  userId: 'test-user',
  name: 'Test Dashboard',
  widgets: [
    {
      id: 'widget-1',
      type: 'metric',
      title: 'Test Widget',
      config: { title: 'Test Widget', refreshInterval: 30 },
      data: {
        metrics: [],
        chartData: { labels: [], datasets: [] },
        summary: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 0, y: 0, width: 4, height: 2 },
    },
  ],
  layout: { columns: 12, rows: 8 },
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWidget: Widget = {
  id: 'new-widget',
  type: 'chart',
  title: 'New Widget',
  config: { title: 'New Widget', refreshInterval: 60 },
  data: {
    metrics: [],
    chartData: { labels: [], datasets: [] },
    summary: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' },
    lastUpdated: new Date(),
  },
  permissions: [],
  position: { x: 4, y: 0, width: 4, height: 2 },
};

const mockPreferences = {
  theme: 'dark',
  autoRefresh: true,
  refreshInterval: 30,
  compactMode: false,
  defaultTimeRange: 'day',
};

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch dashboard data successfully', async () => {
    mockDashboardService.loadDashboardLayout.mockResolvedValue(mockDashboard);

    const { result } = renderHook(
      () => useDashboard('test-dashboard', 'test-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDashboard);
    expect(mockDashboardService.loadDashboardLayout).toHaveBeenCalledWith('test-dashboard', 'test-user');
  });

  it('should handle dashboard fetch error', async () => {
    const error = new Error('Failed to load dashboard');
    mockDashboardService.loadDashboardLayout.mockRejectedValue(error);

    const { result } = renderHook(
      () => useDashboard('test-dashboard', 'test-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should return null when dashboard not found', async () => {
    mockDashboardService.loadDashboardLayout.mockResolvedValue(null);

    const { result } = renderHook(
      () => useDashboard('nonexistent-dashboard', 'test-user'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useDashboardPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch dashboard preferences successfully', async () => {
    mockDashboardService.getDashboardPreferences.mockReturnValue(mockPreferences);

    const { result } = renderHook(
      () => useDashboardPreferences(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPreferences);
    expect(mockDashboardService.getDashboardPreferences).toHaveBeenCalled();
  });
});

describe('useSaveDashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save dashboard layout successfully', async () => {
    mockDashboardService.saveDashboardLayout.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useSaveDashboardLayout(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockDashboard);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDashboardService.saveDashboardLayout).toHaveBeenCalledWith(mockDashboard);
  });

  it('should handle save dashboard layout error', async () => {
    const error = new Error('Failed to save dashboard');
    mockDashboardService.saveDashboardLayout.mockRejectedValue(error);

    const { result } = renderHook(
      () => useSaveDashboardLayout(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockDashboard);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useUpdateWidgetConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update widget config successfully', async () => {
    mockDashboardService.updateWidgetConfig.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useUpdateWidgetConfig('test-dashboard'),
      { wrapper: createWrapper() }
    );

    const newConfig: WidgetConfig = { title: 'Updated Widget', refreshInterval: 60 };
    result.current.mutate({ widgetId: 'widget-1', config: newConfig });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDashboardService.updateWidgetConfig).toHaveBeenCalledWith(
      'test-dashboard',
      'widget-1',
      newConfig
    );
  });

  it('should handle update widget config error', async () => {
    const error = new Error('Failed to update widget');
    mockDashboardService.updateWidgetConfig.mockRejectedValue(error);

    const { result } = renderHook(
      () => useUpdateWidgetConfig('test-dashboard'),
      { wrapper: createWrapper() }
    );

    const newConfig: WidgetConfig = { title: 'Updated Widget', refreshInterval: 60 };
    result.current.mutate({ widgetId: 'widget-1', config: newConfig });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useAddWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add widget successfully', async () => {
    mockDashboardService.addWidget.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useAddWidget('test-dashboard'),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockWidget);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDashboardService.addWidget).toHaveBeenCalledWith('test-dashboard', mockWidget);
  });

  it('should handle add widget error', async () => {
    const error = new Error('Failed to add widget');
    mockDashboardService.addWidget.mockRejectedValue(error);

    const { result } = renderHook(
      () => useAddWidget('test-dashboard'),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockWidget);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useRemoveWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should remove widget successfully', async () => {
    mockDashboardService.removeWidget.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useRemoveWidget('test-dashboard'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('widget-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDashboardService.removeWidget).toHaveBeenCalledWith('test-dashboard', 'widget-1');
  });

  it('should handle remove widget error', async () => {
    const error = new Error('Failed to remove widget');
    mockDashboardService.removeWidget.mockRejectedValue(error);

    const { result } = renderHook(
      () => useRemoveWidget('test-dashboard'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('widget-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useSaveDashboardPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save dashboard preferences successfully', async () => {
    mockDashboardService.saveDashboardPreferences.mockReturnValue(undefined);

    const { result } = renderHook(
      () => useSaveDashboardPreferences(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockPreferences);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDashboardService.saveDashboardPreferences).toHaveBeenCalledWith(mockPreferences);
  });
});

describe('useExportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export dashboard successfully', async () => {
    const exportData = JSON.stringify({ dashboard: mockDashboard });
    mockDashboardService.exportDashboard.mockReturnValue(exportData);

    const { result } = renderHook(
      () => useExportDashboard(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(mockDashboard);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(exportData);
    expect(mockDashboardService.exportDashboard).toHaveBeenCalledWith(mockDashboard);
  });
});

describe('useImportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should import dashboard successfully', async () => {
    const importData = JSON.stringify({ dashboard: mockDashboard });
    mockDashboardService.importDashboard.mockResolvedValue(mockDashboard);

    const { result } = renderHook(
      () => useImportDashboard(),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ dashboardId: 'test-dashboard', importData });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDashboard);
    expect(mockDashboardService.importDashboard).toHaveBeenCalledWith('test-dashboard', importData);
  });

  it('should handle import dashboard error', async () => {
    const error = new Error('Invalid import data');
    mockDashboardService.importDashboard.mockRejectedValue(error);

    const { result } = renderHook(
      () => useImportDashboard(),
      { wrapper: createWrapper() }
    );

    const importData = 'invalid json';
    result.current.mutate({ dashboardId: 'test-dashboard', importData });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});