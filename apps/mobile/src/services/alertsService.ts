import {apiClient} from './apiClient';
import {Alert} from '@/store/slices/alertsSlice';

class AlertsService {
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get<Alert[]>('/alerts');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch alerts');
    }
  }

  async markAsRead(alertId: string): Promise<void> {
    try {
      await apiClient.patch(`/alerts/${alertId}/read`);
    } catch (error) {
      throw new Error('Failed to mark alert as read');
    }
  }

  async dismissAlert(alertId: string): Promise<void> {
    try {
      await apiClient.delete(`/alerts/${alertId}`);
    } catch (error) {
      throw new Error('Failed to dismiss alert');
    }
  }

  async getAlertSettings(): Promise<any> {
    try {
      const response = await apiClient.get('/alerts/settings');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch alert settings');
    }
  }

  async updateAlertSettings(settings: any): Promise<void> {
    try {
      await apiClient.put('/alerts/settings', settings);
    } catch (error) {
      throw new Error('Failed to update alert settings');
    }
  }

  async executeAlertAction(alertId: string, actionId: string): Promise<void> {
    try {
      await apiClient.post(`/alerts/${alertId}/actions/${actionId}`);
    } catch (error) {
      throw new Error('Failed to execute alert action');
    }
  }
}

export const alertsService = new AlertsService();