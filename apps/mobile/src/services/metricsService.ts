import {apiClient} from './apiClient';
import {MetricCategory} from '@/store/slices/metricsSlice';

class MetricsService {
  async getMetrics(timeRange: string): Promise<MetricCategory[]> {
    try {
      const response = await apiClient.get<MetricCategory[]>(`/metrics?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch metrics');
    }
  }

  async getMetricHistory(metricId: string, timeRange: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/metrics/${metricId}/history?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch metric history');
    }
  }

  async getProductivityInsights(userId?: string): Promise<any> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`/metrics/insights${params}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch productivity insights');
    }
  }

  async getTeamMetrics(teamId: string, timeRange: string): Promise<any> {
    try {
      const response = await apiClient.get(`/metrics/team/${teamId}?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch team metrics');
    }
  }
}

export const metricsService = new MetricsService();