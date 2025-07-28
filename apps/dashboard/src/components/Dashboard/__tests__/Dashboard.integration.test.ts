import { dashboardService } from '../../../services/dashboardService';
import { Dashboard as DashboardType, Widget, WidgetConfig } from '../../../types/dashboard';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('Dashboard Integration Tests', () => {
  const mockWidget: Widget = {
    id: 'widget-1',
    type: 'metric_card',
    title: 'Test Widget',
    config: {
      timeRange: 'day',
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
        changePercent: 11.1,
        trend: 'up',
      },
      lastUpdated: new Date(),
    },
    permissions: [],
    position: { x: 0, y: 0, w: 3, h: 3 },
  };

  const mockDashboard: DashboardType = {
    id: 'dashboard-1',
    userId: 'user-1',
    name: 'Test Dashboard',
    widgets: [mockWidget],
    layout: {
      columns: 12,
      rowHeight: 60,
      margin: [16, 16],
      containerPadding: [0, 0],
    },
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Dashboard Layout Persistence', () => {
    it('should save dashboard layout to localStorage', async () => {
      await dashboardService.saveDashboardLayout(mockDashboard);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_dashboard_layouts',
        expect.stringContaining(mockDashboard.id)
      );
    });

    it('should load dashboard layout from localStorage', async () => {
      const layoutData = {
        [mockDashboard.id]: {
          dashboardId: mockDashboard.id,
          userId: mockDashboard.userId,
          layout: mockDashboard.layout,
          widgets: mockDashboard.widgets,
          updatedAt: mockDashboard.updatedAt,
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(layoutData));

      const result = await dashboardService.loadDashboardLayout(
        mockDashboard.id,
        mockDashboard.userId
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: mockDashboard.id,
          userId: mockDashboard.userId,
          widgets: mockDashboard.widgets,
        })
      );
    });

    it('should return null for non-existent dashboard', async () => {
      localStorageMock.getItem.mockReturnValue('{}');

      const result = await dashboardService.loadDashboardLayout(
        'non-existent',
        'user-1'
      );

      expect(result).toBeNull();
    });
  });

  describe('Widget Configuration', () => {
    beforeEach(() => {
      const layoutData = {
        [mockDashboard.id]: {
          dashboardId: mockDashboard.id,
          userId: mockDashboard.userId,
          layout: mockDashboard.layout,
          widgets: mockDashboard.widgets,
          updatedAt: mockDashboard.updatedAt,
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(layoutData));
    });

    it('should update widget configuration', async () => {
      const newConfig: WidgetConfig = {
        title: 'Updated Widget',
        timeRange: 'week',
        metrics: ['time_in_flow'],
        filters: { teamId: 'team-1' },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
        },
      };

      await dashboardService.updateWidgetConfig(
        mockDashboard.id,
        mockWidget.id,
        newConfig
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_dashboard_layouts',
        expect.stringContaining('Updated Widget')
      );
    });

    it('should add new widget to dashboard', async () => {
      const newWidget: Widget = {
        id: 'widget-2',
        type: 'line_chart',
        title: 'New Widget',
        config: {
          timeRange: 'week',
          metrics: ['code_churn'],
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
            current: 0,
            previous: 0,
            change: 0,
            changePercent: 0,
            trend: 'stable',
          },
          lastUpdated: new Date(),
        },
        permissions: [],
        position: { x: 3, y: 0, w: 6, h: 4 },
      };

      await dashboardService.addWidget(mockDashboard.id, newWidget);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_dashboard_layouts',
        expect.stringContaining('New Widget')
      );
    });

    it('should remove widget from dashboard', async () => {
      await dashboardService.removeWidget(mockDashboard.id, mockWidget.id);

      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const savedData = JSON.parse(setItemCall[1]);
      const dashboardData = savedData[mockDashboard.id];

      expect(dashboardData.widgets).toHaveLength(0);
    });
  });

  describe('Dashboard Preferences', () => {
    it('should save dashboard preferences', () => {
      const preferences = {
        theme: 'dark',
        dashboard: {
          defaultTimeRange: 'week',
          autoRefresh: true,
          refreshInterval: 60,
          compactMode: true,
        },
      };

      dashboardService.saveDashboardPreferences(preferences);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_dashboard_preferences',
        JSON.stringify(preferences)
      );
    });

    it('should load dashboard preferences', () => {
      const preferences = {
        theme: 'dark',
        dashboard: {
          defaultTimeRange: 'week',
          autoRefresh: false,
          refreshInterval: 120,
          compactMode: true,
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(preferences));

      const result = dashboardService.getDashboardPreferences();

      expect(result).toEqual(preferences);
    });

    it('should return default preferences when none exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = dashboardService.getDashboardPreferences();

      expect(result).toEqual(
        expect.objectContaining({
          theme: 'light',
          autoRefresh: true,
          refreshInterval: 30,
          compactMode: false,
        })
      );
    });
  });

  describe('Dashboard Import/Export', () => {
    it('should export dashboard configuration', () => {
      const exportData = dashboardService.exportDashboard(mockDashboard);
      const parsed = JSON.parse(exportData);

      expect(parsed).toEqual(
        expect.objectContaining({
          version: '1.0',
          dashboard: expect.objectContaining({
            name: mockDashboard.name,
            widgets: expect.arrayContaining([
              expect.objectContaining({
                type: mockWidget.type,
                title: mockWidget.title,
                config: mockWidget.config,
                position: mockWidget.position,
              }),
            ]),
          }),
          exportedAt: expect.any(String),
        })
      );
    });

    it('should import dashboard configuration', async () => {
      const importData = {
        version: '1.0',
        dashboard: {
          name: 'Imported Dashboard',
          widgets: [
            {
              type: 'bar_chart',
              title: 'Imported Widget',
              config: {
                timeRange: 'month',
                metrics: ['bug_rate'],
                filters: {},
                chartOptions: {
                  responsive: true,
                  maintainAspectRatio: true,
                },
              },
              position: { x: 0, y: 0, w: 6, h: 4 },
            },
          ],
          layout: mockDashboard.layout,
        },
      };

      const result = await dashboardService.importDashboard(
        'imported-dashboard',
        JSON.stringify(importData)
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'imported-dashboard',
          name: 'Imported Dashboard',
          widgets: expect.arrayContaining([
            expect.objectContaining({
              type: 'bar_chart',
              title: 'Imported Widget',
            }),
          ]),
        })
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_dashboard_layouts',
        expect.stringContaining('Imported Widget')
      );
    });

    it('should throw error for invalid import data', async () => {
      const invalidData = '{"invalid": "data"}';

      await expect(
        dashboardService.importDashboard('test-dashboard', invalidData)
      ).rejects.toThrow('Invalid dashboard export format');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw, but log error
      await expect(
        dashboardService.saveDashboardLayout(mockDashboard)
      ).rejects.toThrow();
    });

    it('should handle JSON parsing errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = dashboardService.getDashboardPreferences();

      expect(result).toEqual({});
    });
  });
});