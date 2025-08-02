import {apiClient} from './apiClient';
import {DashboardData, DashboardWidget} from '@/store/slices/dashboardSlice';

class DashboardService {
  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await apiClient.get<DashboardData>('/dashboard');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch dashboard data');
    }
  }

  async updateWidget(widget: DashboardWidget): Promise<DashboardWidget> {
    try {
      const response = await apiClient.put<DashboardWidget>(
        `/dashboard/widgets/${widget.id}`,
        widget
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to update widget');
    }
  }

  async getWidgetData(widgetId: string, timeRange?: string): Promise<any> {
    try {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const response = await apiClient.get(`/dashboard/widgets/${widgetId}/data${params}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch widget data');
    }
  }

  async exportDashboard(format: 'pdf' | 'png' | 'json'): Promise<Blob> {
    try {
      const response = await apiClient.post(`/dashboard/export`, {format});
      return response.data;
    } catch (error) {
      throw new Error('Failed to export dashboard');
    }
  }
}

export const dashboardService = new DashboardService();