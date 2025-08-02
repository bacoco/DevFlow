import { Dashboard, Widget, WidgetConfig } from '../types/dashboard';
import { authService } from './authService';

export interface DashboardLayoutData {
  dashboardId: string;
  userId: string;
  layout: any;
  widgets: Widget[];
  updatedAt: Date;
}

class DashboardService {
  private readonly STORAGE_KEY = 'devflow_dashboard_layouts';
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Save dashboard layout to local storage and optionally to server
   */
  async saveDashboardLayout(dashboard: Dashboard): Promise<void> {
    try {
      // Save to local storage for immediate persistence
      this.saveToLocalStorage(dashboard);

      // Save to server if available
      if (this.isServerAvailable()) {
        await this.saveToServer(dashboard);
      }
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      throw error;
    }
  }

  /**
   * Load dashboard layout from local storage or server
   */
  async loadDashboardLayout(dashboardId: string, userId: string): Promise<Dashboard | null> {
    try {
      // Try to load from server first
      if (this.isServerAvailable()) {
        const serverData = await this.loadFromServer(dashboardId, userId);
        if (serverData) {
          // Update local storage with server data
          this.saveToLocalStorage(serverData);
          return serverData;
        }
      }

      // Fallback to local storage
      return this.loadFromLocalStorage(dashboardId, userId);
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
      // Fallback to local storage on server error
      return this.loadFromLocalStorage(dashboardId, userId);
    }
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(dashboardId: string, widgetId: string, config: WidgetConfig): Promise<void> {
    try {
      // Try to get the user ID from the stored dashboard data first
      const layouts = this.getLocalStorageLayouts();
      const layoutData = layouts[dashboardId];
      const userId = layoutData?.userId || this.getCurrentUserId();
      
      const dashboard = await this.loadDashboardLayout(dashboardId, userId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const updatedWidgets = dashboard.widgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, config, title: config.title || widget.title }
          : widget
      );

      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };

      await this.saveDashboardLayout(updatedDashboard);
    } catch (error) {
      console.error('Failed to update widget configuration:', error);
      throw error;
    }
  }

  /**
   * Add a new widget to the dashboard
   */
  async addWidget(dashboardId: string, widget: Widget): Promise<void> {
    try {
      // Try to get the user ID from the stored dashboard data first
      const layouts = this.getLocalStorageLayouts();
      const layoutData = layouts[dashboardId];
      const userId = layoutData?.userId || this.getCurrentUserId();
      
      const dashboard = await this.loadDashboardLayout(dashboardId, userId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const updatedDashboard = {
        ...dashboard,
        widgets: [...dashboard.widgets, widget],
        updatedAt: new Date(),
      };

      await this.saveDashboardLayout(updatedDashboard);
    } catch (error) {
      console.error('Failed to add widget:', error);
      throw error;
    }
  }

  /**
   * Remove a widget from the dashboard
   */
  async removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    try {
      // Try to get the user ID from the stored dashboard data first
      const layouts = this.getLocalStorageLayouts();
      const layoutData = layouts[dashboardId];
      const userId = layoutData?.userId || this.getCurrentUserId();
      
      const dashboard = await this.loadDashboardLayout(dashboardId, userId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const updatedWidgets = dashboard.widgets.filter(widget => widget.id !== widgetId);
      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };

      await this.saveDashboardLayout(updatedDashboard);
    } catch (error) {
      console.error('Failed to remove widget:', error);
      throw error;
    }
  }

  /**
   * Get user's dashboard preferences
   */
  getDashboardPreferences(): any {
    try {
      const preferences = localStorage.getItem('devflow_dashboard_preferences');
      return preferences ? JSON.parse(preferences) : {
        theme: 'light',
        autoRefresh: true,
        refreshInterval: 30,
        compactMode: false,
        defaultTimeRange: 'day',
      };
    } catch (error) {
      console.error('Failed to load dashboard preferences:', error);
      return {};
    }
  }

  /**
   * Save user's dashboard preferences
   */
  saveDashboardPreferences(preferences: any): void {
    try {
      localStorage.setItem('devflow_dashboard_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save dashboard preferences:', error);
    }
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(dashboard: Dashboard): string {
    try {
      const exportData = {
        version: '1.0',
        dashboard: {
          name: dashboard.name,
          widgets: dashboard.widgets.map(widget => ({
            type: widget.type,
            title: widget.title,
            config: widget.config,
            position: widget.position,
          })),
          layout: dashboard.layout,
        },
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      throw error;
    }
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(dashboardId: string, importData: string): Promise<Dashboard> {
    try {
      const data = JSON.parse(importData);
      
      if (!data.version || !data.dashboard) {
        throw new Error('Invalid dashboard export format');
      }

      const dashboard: Dashboard = {
        id: dashboardId,
        userId: this.getCurrentUserId(),
        name: data.dashboard.name,
        widgets: data.dashboard.widgets.map((widget: any, index: number) => ({
          id: `widget-${Date.now()}-${index}`,
          type: widget.type,
          title: widget.title,
          config: widget.config,
          data: { metrics: [], chartData: { labels: [], datasets: [] }, summary: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' }, lastUpdated: new Date() },
          permissions: [],
          position: widget.position,
        })),
        layout: data.dashboard.layout,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveDashboardLayout(dashboard);
      return dashboard;
    } catch (error) {
      console.error('Failed to import dashboard:', error);
      throw error;
    }
  }

  private saveToLocalStorage(dashboard: Dashboard): void {
    try {
      const layouts = this.getLocalStorageLayouts();
      layouts[dashboard.id] = {
        dashboardId: dashboard.id,
        userId: dashboard.userId,
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        updatedAt: dashboard.updatedAt,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layouts));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
      throw error; // Re-throw for proper error handling in tests
    }
  }

  private loadFromLocalStorage(dashboardId: string, userId: string): Dashboard | null {
    try {
      const layouts = this.getLocalStorageLayouts();
      const layoutData = layouts[dashboardId];
      
      if (!layoutData || layoutData.userId !== userId) {
        return null;
      }

      // Ensure widgets have proper date objects
      const widgets = layoutData.widgets.map(widget => ({
        ...widget,
        data: {
          ...widget.data,
          lastUpdated: new Date(widget.data.lastUpdated),
        },
      }));

      return {
        id: dashboardId,
        userId: userId,
        name: `Dashboard ${dashboardId}`,
        widgets,
        layout: layoutData.layout,
        isDefault: false,
        createdAt: new Date(layoutData.updatedAt),
        updatedAt: new Date(layoutData.updatedAt),
      };
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return null;
    }
  }

  private getLocalStorageLayouts(): Record<string, DashboardLayoutData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to parse local storage data:', error);
      return {};
    }
  }

  private async saveToServer(dashboard: Dashboard): Promise<void> {
    const token = authService.getStoredToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.API_BASE_URL}/api/dashboards/${dashboard.id}/layout`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        updatedAt: dashboard.updatedAt,
      }),
    });

    if (response.status === 401) {
      // Token might be expired, try to refresh
      try {
        await authService.refreshToken(token);
        // Retry the request with new token
        const newToken = authService.getStoredToken();
        if (newToken) {
          const retryResponse = await fetch(`${this.API_BASE_URL}/api/dashboards/${dashboard.id}/layout`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify({
              layout: dashboard.layout,
              widgets: dashboard.widgets,
              updatedAt: dashboard.updatedAt,
            }),
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Server error: ${retryResponse.status}`);
          }
          return;
        }
      } catch (refreshError) {
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
  }

  private async loadFromServer(dashboardId: string, userId: string): Promise<Dashboard | null> {
    const token = authService.getStoredToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.API_BASE_URL}/api/dashboards/${dashboardId}/layout`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 401) {
      // Token might be expired, try to refresh
      try {
        await authService.refreshToken(token);
        // Retry the request with new token
        const newToken = authService.getStoredToken();
        if (newToken) {
          const retryResponse = await fetch(`${this.API_BASE_URL}/api/dashboards/${dashboardId}/layout`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (retryResponse.status === 404) {
            return null;
          }
          
          if (!retryResponse.ok) {
            throw new Error(`Server error: ${retryResponse.status}`);
          }
          
          const data = await retryResponse.json();
          return {
            id: dashboardId,
            userId: userId,
            name: data.name || `Dashboard ${dashboardId}`,
            widgets: data.widgets,
            layout: data.layout,
            isDefault: data.isDefault || false,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };
        }
      } catch (refreshError) {
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: dashboardId,
      userId: userId,
      name: data.name || `Dashboard ${dashboardId}`,
      widgets: data.widgets,
      layout: data.layout,
      isDefault: data.isDefault || false,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private isServerAvailable(): boolean {
    // Simple check - in a real app, you might want to ping the server
    return !!this.API_BASE_URL && this.API_BASE_URL !== 'http://localhost:3001';
  }

  private getCurrentUserId(): string {
    const token = authService.getStoredToken();
    if (!token) {
      return 'anonymous';
    }

    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || 'unknown';
    } catch (error) {
      console.error('Failed to decode token:', error);
      return 'unknown';
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;