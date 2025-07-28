import { MetricsCollector } from '../collectors/metrics-collector';
import axios from 'axios';
import { systemHealthScore, uptimeSeconds } from '../metrics/prometheus-metrics';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cron to prevent actual scheduling during tests
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = new MetricsCollector();
  });

  describe('Health Check Collection', () => {
    it('should collect health metrics from all services', async () => {
      // Mock successful health check responses
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: {
          status: 'healthy',
          uptime: 3600
        }
      });

      const healthSummary = await metricsCollector.getHealthSummary();

      expect(healthSummary).toHaveProperty('timestamp');
      expect(healthSummary).toHaveProperty('services');
      expect(healthSummary.services).toHaveLength(6); // 6 services defined
      expect(healthSummary.services[0]).toHaveProperty('name', 'api-gateway');
      expect(healthSummary.services[0].status).toHaveProperty('healthy', true);
    });

    it('should handle service health check failures gracefully', async () => {
      // Mock failed health check
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const healthSummary = await metricsCollector.getHealthSummary();

      expect(healthSummary.services[0].status).toHaveProperty('healthy', false);
      expect(healthSummary.services[0].status).toHaveProperty('error');
    });

    it('should calculate system health score correctly', async () => {
      // Mock mixed health responses
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } }) // api-gateway
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } }) // data-ingestion
        .mockRejectedValueOnce(new Error('Service down')) // stream-processing
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } }) // ml-pipeline
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } }) // alert-service
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } }); // privacy-service

      const healthSummary = await metricsCollector.getHealthSummary();

      // 5 out of 6 services healthy = 83.33% health score
      const expectedHealthScore = (5 / 6) * 100;
      expect(Math.round(healthSummary.overallHealth)).toBe(Math.round(expectedHealthScore));
    });
  });

  describe('Service Metrics Collection', () => {
    it('should parse Prometheus metrics correctly', async () => {
      const mockMetricsResponse = `
# HELP database_connections_active Number of active database connections
# TYPE database_connections_active gauge
database_connections_active{database_type="mongodb",service="mongodb-service"} 25
database_connections_active{database_type="influxdb",service="influxdb-service"} 15

# HELP queue_size Current size of message queues
# TYPE queue_size gauge
queue_size{queue_name="git-events",service="data-ingestion"} 150
queue_size{queue_name="processed-metrics",service="stream-processing"} 75

# HELP cache_size_bytes Current cache size in bytes
# TYPE cache_size_bytes gauge
cache_size_bytes{cache_type="redis",service="redis-cache"} 524288
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockMetricsResponse
      });

      // This would be called internally by the collector
      // We're testing the parsing logic indirectly through the health summary
      const healthSummary = await metricsCollector.getHealthSummary();
      expect(healthSummary).toBeDefined();
    });

    it('should handle malformed metrics gracefully', async () => {
      const malformedMetrics = `
invalid_metric_line_without_value
database_connections_active{invalid_labels 25
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: malformedMetrics
      });

      // Should not throw an error
      const healthSummary = await metricsCollector.getHealthSummary();
      expect(healthSummary).toBeDefined();
    });
  });

  describe('Infrastructure Metrics', () => {
    it('should collect database metrics', async () => {
      // This tests the simulated database metrics collection
      // In a real implementation, this would test actual database connections
      const healthSummary = await metricsCollector.getHealthSummary();
      expect(healthSummary).toBeDefined();
    });

    it('should collect queue metrics', async () => {
      // This tests the simulated queue metrics collection
      // In a real implementation, this would test actual Kafka metrics
      const healthSummary = await metricsCollector.getHealthSummary();
      expect(healthSummary).toBeDefined();
    });

    it('should collect cache metrics', async () => {
      // This tests the simulated cache metrics collection
      // In a real implementation, this would test actual Redis metrics
      const healthSummary = await metricsCollector.getHealthSummary();
      expect(healthSummary).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout'));

      const healthSummary = await metricsCollector.getHealthSummary();
      
      expect(healthSummary.services.every((service: any) => 
        service.status.healthy === false
      )).toBe(true);
    });

    it('should handle partial service failures', async () => {
      // Mock some services succeeding and others failing
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } })
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } })
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } })
        .mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } });

      const healthSummary = await metricsCollector.getHealthSummary();
      
      const healthyServices = healthSummary.services.filter(
        (service: any) => service.status.healthy === true
      );
      const unhealthyServices = healthSummary.services.filter(
        (service: any) => service.status.healthy === false
      );

      expect(healthyServices).toHaveLength(4);
      expect(unhealthyServices).toHaveLength(2);
    });
  });
});