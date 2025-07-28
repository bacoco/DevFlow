import axios from 'axios';
import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import {
  systemHealthScore,
  uptimeSeconds,
  databaseConnectionsActive,
  queueSize,
  cacheSize
} from '../metrics/prometheus-metrics';

interface ServiceEndpoint {
  name: string;
  url: string;
  healthPath: string;
  metricsPath?: string;
}

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTime: number;
  uptime?: number;
  details?: any;
}

export class MetricsCollector {
  private services: ServiceEndpoint[] = [
    {
      name: 'api-gateway',
      url: 'http://api-gateway:3000',
      healthPath: '/health',
      metricsPath: '/metrics'
    },
    {
      name: 'data-ingestion',
      url: 'http://data-ingestion:3001',
      healthPath: '/health',
      metricsPath: '/metrics'
    },
    {
      name: 'stream-processing',
      url: 'http://stream-processing:3002',
      healthPath: '/health',
      metricsPath: '/metrics'
    },
    {
      name: 'ml-pipeline',
      url: 'http://ml-pipeline:3003',
      healthPath: '/health',
      metricsPath: '/metrics'
    },
    {
      name: 'alert-service',
      url: 'http://alert-service:3004',
      healthPath: '/health',
      metricsPath: '/metrics'
    },
    {
      name: 'privacy-service',
      url: 'http://privacy-service:3005',
      healthPath: '/health',
      metricsPath: '/metrics'
    }
  ];

  private startTime = Date.now();

  constructor() {
    this.startPeriodicCollection();
  }

  private startPeriodicCollection(): void {
    // Collect health metrics every 30 seconds
    cron.schedule('*/30 * * * * *', () => {
      this.collectHealthMetrics();
    });

    // Collect system metrics every minute
    cron.schedule('0 * * * * *', () => {
      this.collectSystemMetrics();
    });

    // Collect infrastructure metrics every 5 minutes
    cron.schedule('0 */5 * * * *', () => {
      this.collectInfrastructureMetrics();
    });
  }

  private async collectHealthMetrics(): Promise<void> {
    try {
      const healthChecks = await Promise.allSettled(
        this.services.map(service => this.checkServiceHealth(service))
      );

      let totalHealthy = 0;
      let totalServices = this.services.length;

      healthChecks.forEach((result, index) => {
        const serviceName = this.services[index].name;
        
        if (result.status === 'fulfilled') {
          const healthResult = result.value;
          if (healthResult.healthy) {
            totalHealthy++;
          }
          
          // Update uptime metric
          if (healthResult.uptime) {
            uptimeSeconds.set({ service: serviceName }, healthResult.uptime);
          }
        } else {
          logger.error(`Health check failed for ${serviceName}:`, result.reason);
        }
      });

      // Calculate and update system health score
      const healthScore = (totalHealthy / totalServices) * 100;
      systemHealthScore.set({ service: 'monitoring-service' }, healthScore);

      logger.info(`System health score: ${healthScore}% (${totalHealthy}/${totalServices} services healthy)`);
    } catch (error) {
      logger.error('Error collecting health metrics:', error);
    }
  }

  private async checkServiceHealth(service: ServiceEndpoint): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${service.url}${service.healthPath}`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: service.name,
        healthy: response.status === 200,
        responseTime,
        uptime: response.data?.uptime,
        details: response.data
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: service.name,
        healthy: false,
        responseTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Update monitoring service uptime
      const currentUptime = (Date.now() - this.startTime) / 1000;
      uptimeSeconds.set({ service: 'monitoring-service' }, currentUptime);

      // Collect metrics from each service
      for (const service of this.services) {
        if (service.metricsPath) {
          await this.collectServiceMetrics(service);
        }
      }
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  private async collectServiceMetrics(service: ServiceEndpoint): Promise<void> {
    try {
      const response = await axios.get(`${service.url}${service.metricsPath}`, {
        timeout: 10000
      });

      // Parse Prometheus metrics format and extract key metrics
      const metricsText = response.data;
      this.parseAndUpdateMetrics(service.name, metricsText);
    } catch (error) {
      logger.warn(`Failed to collect metrics from ${service.name}:`, error instanceof Error ? error.message : error);
    }
  }

  private parseAndUpdateMetrics(serviceName: string, metricsText: string): void {
    const lines = metricsText.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) {
        continue;
      }

      try {
        // Simple parsing for key metrics
        if (line.includes('database_connections_active')) {
          const match = line.match(/database_connections_active{.*?}\s+(\d+\.?\d*)/);
          if (match) {
            const value = parseFloat(match[1]);
            databaseConnectionsActive.set({ database_type: 'unknown', service: serviceName }, value);
          }
        }

        if (line.includes('queue_size')) {
          const match = line.match(/queue_size{.*?}\s+(\d+\.?\d*)/);
          if (match) {
            const value = parseFloat(match[1]);
            queueSize.set({ queue_name: 'unknown', service: serviceName }, value);
          }
        }

        if (line.includes('cache_size_bytes')) {
          const match = line.match(/cache_size_bytes{.*?}\s+(\d+\.?\d*)/);
          if (match) {
            const value = parseFloat(match[1]);
            cacheSize.set({ cache_type: 'unknown', service: serviceName }, value);
          }
        }
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }
  }

  private async collectInfrastructureMetrics(): Promise<void> {
    try {
      // Collect database metrics
      await this.collectDatabaseMetrics();
      
      // Collect message queue metrics
      await this.collectQueueMetrics();
      
      // Collect cache metrics
      await this.collectCacheMetrics();
    } catch (error) {
      logger.error('Error collecting infrastructure metrics:', error);
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    // This would typically connect to database monitoring endpoints
    // For now, we'll simulate some metrics
    try {
      // MongoDB metrics
      databaseConnectionsActive.set({ database_type: 'mongodb', service: 'mongodb-service' }, Math.floor(Math.random() * 50) + 10);
      
      // InfluxDB metrics
      databaseConnectionsActive.set({ database_type: 'influxdb', service: 'influxdb-service' }, Math.floor(Math.random() * 30) + 5);
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
    }
  }

  private async collectQueueMetrics(): Promise<void> {
    // This would typically connect to Kafka/message queue monitoring
    try {
      queueSize.set({ queue_name: 'git-events', service: 'data-ingestion' }, Math.floor(Math.random() * 1000) + 100);
      queueSize.set({ queue_name: 'ide-telemetry', service: 'data-ingestion' }, Math.floor(Math.random() * 500) + 50);
      queueSize.set({ queue_name: 'processed-metrics', service: 'stream-processing' }, Math.floor(Math.random() * 200) + 20);
    } catch (error) {
      logger.error('Error collecting queue metrics:', error);
    }
  }

  private async collectCacheMetrics(): Promise<void> {
    // This would typically connect to Redis monitoring
    try {
      cacheSize.set({ cache_type: 'redis', service: 'redis-cache' }, Math.floor(Math.random() * 1000000) + 100000);
    } catch (error) {
      logger.error('Error collecting cache metrics:', error);
    }
  }

  public async getHealthSummary(): Promise<any> {
    const healthChecks = await Promise.allSettled(
      this.services.map(service => this.checkServiceHealth(service))
    );

    return {
      timestamp: new Date().toISOString(),
      services: healthChecks.map((result, index) => ({
        name: this.services[index].name,
        status: result.status === 'fulfilled' ? result.value : { healthy: false, error: result.reason }
      })),
      overallHealth: systemHealthScore.get()
    };
  }
}