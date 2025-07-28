import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { Dashboard as DashboardType, Widget } from '../../../types/dashboard';
import { dashboardService } from '../../../services/dashboardService';

// Mock the dashboard service
jest.mock('../../../services/dashboardService');
const mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

// Mock react-grid-layout
jest.mock('react-grid-layout', () => ({
  Responsive: ({ children, onLayoutChange }: any) => (
    <div data-testid="grid-layout" onClick={() => onLayoutChange([], {})}>
      {children}
    </div>
  ),
  WidthProvider: (component: any) => component,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Settings: () => <div data-testid="settings-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Sliders: () => <div data-testid="sliders-icon" />,
  X: () => <div data-testid="x-icon" />,
  GripVertical: () => <div data-testid="grip-icon" />,
  MoreHorizontal: () => <div data-testid="more-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Code: () => <div data-testid="code-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Layout: () => <div data-testid="layout-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
}));

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

describe('Dashboard Customization', () => {
  const mockOnDashboardUpdate = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardService.updateWidgetConfig.mockResolvedValue();
    mockDashboardService.exportDashboard.mockReturnValue('{"test": "data"}');
    mockDashboardService.importDashboard.mockResolvedValue(mockDashboard);
    mockDashboardService.getDashboardPreferences.mockReturnValue({
      dashboard: {
        defaultTimeRange: 'day',
        autoRefresh: true,
        refreshInterval: 30,
        compactMode: false,
      },
    });
  });

  describe('Widget Management', () => {
    it('should open widget selector when Add Widget button is clicked', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const addButton = screen.getByRole('button', { name: /add new widget/i });
      await user.click(addButton);

      expect(screen.getByText('Add Widget to Dashboard')).toBeInTheDocument();
    });

    it('should display widget templates in selector', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const addButton = screen.getByRole('button', { name: /add new widget/i });
      await user.click(addButton);

      expect(screen.getByText('Productivity Score')).toBeInTheDocument();
      expect(screen.getByText('Time in Flow')).toBeInTheDocument();
      expect(screen.getByText('Code Quality Metrics')).toBeInTheDocument();
    });

    it('should add widget when template is selected', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const addButton = screen.getByRole('button', { name: /add new widget/i });
      await user.click(addButton);

      const addWidgetButton = screen.getAllByText('Add Widget')[1]; // Second one is in the template
      await user.click(addWidgetButton);

      await waitFor(() => {
        expect(mockOnDashboardUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            widgets: expect.arrayContaining([
              expect.objectContaining({
                type: 'metric_card',
                title: 'Productivity Score',
              }),
            ]),
          })
        );
      });
    });

    it('should open widget configuration modal', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      // Click on widget menu
      const moreButton = screen.getByLabelText('Widget options');
      await user.click(moreButton);

      // Click configure
      const configureButton = screen.getByText('Configure');
      await user.click(configureButton);

      expect(screen.getByText('Configure Widget')).toBeInTheDocument();
    });

    it('should save widget configuration', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      // Open configuration modal
      const moreButton = screen.getByLabelText('Widget options');
      await user.click(moreButton);
      const configureButton = screen.getByText('Configure');
      await user.click(configureButton);

      // Change title
      const titleInput = screen.getByLabelText('Widget Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Widget Title');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDashboardService.updateWidgetConfig).toHaveBeenCalledWith(
          'dashboard-1',
          'widget-1',
          expect.objectContaining({
            title: 'Updated Widget Title',
          })
        );
      });
    });

    it('should remove widget', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      // Click on widget menu
      const moreButton = screen.getByLabelText('Widget options');
      await user.click(moreButton);

      // Click remove
      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockOnDashboardUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            widgets: [],
          })
        );
      });
    });
  });

  describe('Dashboard Layout', () => {
    it('should enter edit mode when Edit button is clicked', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit dashboard/i });
      await user.click(editButton);

      expect(screen.getByText(/edit mode is active/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should show drag handles in edit mode', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit dashboard/i });
      await user.click(editButton);

      expect(screen.getByTestId('grip-icon')).toBeInTheDocument();
    });

    it('should save layout changes', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit dashboard/i });
      await user.click(editButton);

      // Simulate layout change
      const gridLayout = screen.getByTestId('grid-layout');
      fireEvent.click(gridLayout);

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnDashboardUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Dashboard Preferences', () => {
    it('should open preferences modal', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const preferencesButton = screen.getByRole('button', { name: /dashboard preferences/i });
      await user.click(preferencesButton);

      expect(screen.getByText('Dashboard Preferences')).toBeInTheDocument();
    });

    it('should load existing preferences', async () => {
      mockDashboardService.getDashboardPreferences.mockReturnValue({
        dashboard: {
          defaultTimeRange: 'week',
          autoRefresh: false,
          refreshInterval: 60,
          compactMode: true,
        },
        theme: 'dark',
      });

      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const preferencesButton = screen.getByRole('button', { name: /dashboard preferences/i });
      await user.click(preferencesButton);

      await waitFor(() => {
        const timeRangeSelect = screen.getByLabelText('Default Time Range');
        expect(timeRangeSelect).toHaveValue('week');
        
        const compactModeCheckbox = screen.getByLabelText('Compact mode');
        expect(compactModeCheckbox).toBeChecked();
      });
    });

    it('should save preferences', async () => {
      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const preferencesButton = screen.getByRole('button', { name: /dashboard preferences/i });
      await user.click(preferencesButton);

      // Change compact mode
      const compactModeCheckbox = screen.getByLabelText('Compact mode');
      await user.click(compactModeCheckbox);

      // Save preferences
      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDashboardService.saveDashboardPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            dashboard: expect.objectContaining({
              compactMode: true,
            }),
          })
        );
      });
    });
  });

  describe('Import/Export', () => {
    it('should export dashboard', async () => {
      // Mock URL.createObjectURL and related methods
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      const mockCreateElement = jest.fn(() => mockAnchor);
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      
      document.createElement = mockCreateElement;
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;

      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export dashboard/i });
      await user.click(exportButton);

      expect(mockDashboardService.exportDashboard).toHaveBeenCalledWith(mockDashboard);
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should import dashboard', async () => {
      const mockFile = new File(['{"test": "data"}'], 'dashboard.json', {
        type: 'application/json',
      });

      render(
        <Dashboard
          dashboard={mockDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const importInput = screen.getByLabelText(/import/i).querySelector('input');
      expect(importInput).toBeInTheDocument();

      if (importInput) {
        await user.upload(importInput, mockFile);

        await waitFor(() => {
          expect(mockDashboardService.importDashboard).toHaveBeenCalledWith(
            'dashboard-1',
            '{"test": "data"}'
          );
        });
      }
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no widgets', () => {
      const emptyDashboard = { ...mockDashboard, widgets: [] };
      
      render(
        <Dashboard
          dashboard={emptyDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      expect(screen.getByText('No widgets yet')).toBeInTheDocument();
      expect(screen.getByText('Add Your First Widget')).toBeInTheDocument();
    });

    it('should open widget selector from empty state', async () => {
      const emptyDashboard = { ...mockDashboard, widgets: [] };
      
      render(
        <Dashboard
          dashboard={emptyDashboard}
          onDashboardUpdate={mockOnDashboardUpdate}
        />
      );

      const addFirstWidgetButton = screen.getByText('Add Your First Widget');
      await user.click(addFirstWidgetButton);

      expect(screen.getByText('Add Widget to Dashboard')).toBeInTheDocument();
    });
  });
});