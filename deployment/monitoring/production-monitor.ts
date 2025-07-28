import { PrometheusRegistry, Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from '../utils/logger';
import { AlertManager } from './alert-manager';

export interface MonitoringConfig {
  prometheus: {
    port: number;
    metricsPath: string;
  };
  alerting: {
    webhookUrl?: string;
    slackChannel?: string;
    emailRecipients?: string[];
  };
  healthChecks: {
    interval: number;
    timeout: number;
    endpoints: HealthCheckEndpoint[];
  };
}

export interface HealthCheckEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  expectedStatus: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
}

export class ProductionMonitor {
  private registry: PrometheusRegistry;
  private logger: Logger;
  private alertManager: AlertManager;
  private config: MonitoringConfig;
  
  // Prometheus metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestsInFlight: Gauge<string>;
  private systemMemoryUsage: Gauge<string>;
  private systemCpuUsage: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private deploymentStatus: Gauge<string>;
  private healthCheckStatus: Gauge<string>;

  constructor(config: MonitoringConfig, logger: Logger, alertManager: AlertManager) {
    this.config = config;
    this.logger = logger;
    this.alertManager = alertManager;
    this.registry = new PrometheusRegistry();
    
    this.initializeMetrics();
    this.startHealthChecks();
    this.startSystemMetricsCollection();
  }

  private initializeMetrics(): void {
    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['service'],
      registers: [this.registry]
    });

    // System metrics
    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['type', 'service'],
      registers: [this.registry]
    });

    this.systemCpuUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      labelNames: ['service'],
      registers: [this.registry]
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database', 'service'],
      registers: [this.registry]
    });

    // Deployment metrics
    this.deploymentStatus = new Gauge({
      name: 'deployment_status',
      help: 'Deployment status (1 = success, 0 = failure)',
      labelNames: ['deployment_id', 'service', 'slot'],
      registers: [this.registry]
    });

    // Health check metrics
    this.healthCheckStatus = new Gauge({
      name: 'health_check_status',
      help: 'Health check status (1 = healthy, 0 = unhealthy)',
      labelNames: ['endpoint', 'service'],
      registers: [this.registry]
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, service: string): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString(), service });
    this.httpRequestDuration.observe({ method, route, service }, duration);
  }

  recordRequestStart(service: string): void {
    this.httpRequestsInFlight.inc({ service });
  }

  recordRequestEnd(service: string): void {
    this.httpRequestsInFlight.dec({ service });
  }

  recordDeploymentStatus(deploymentId: string, service: string, slot: string, success: boolean): void {
    this.deploymentStatus.set({ deployment_id: deploymentId, service, slot }, success ? 1 : 0);
  }

  recordDatabaseConnections(database: string, service: string, count: number): void {
    this.databaseConnections.set({ database, service }, count);
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthChecks.interval);
  }

  private async performHealthChecks(): Promise<void> {
    for (const endpoint of this.config.healthChecks.endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: endpoint.headers,
          signal: AbortSignal.timeout(endpoint.timeout)
        });

        const duration = Date.now() - startTime;
        const isHealthy = response.status === endpoint.expectedStatus;

        this.healthCheckStatus.set({ endpoint: endpoint.name, service: 'system' }, isHealthy ? 1 : 0);

        if (!isHealthy) {
          await this.alertManager.sendAlert({
            severity: 'warning',
            title: `Health check failed: ${endpoint.name}`,
            message: `Health check for ${endpoint.name} returned status ${response.status}, expected ${endpoint.expectedStatus}`,
            metadata: {
              endpoint: endpoint.name,
              url: endpoint.url,
              status: response.status,
              duration
            }
          });
        }

        this.logger.debug(`Health check ${endpoint.name}: ${isHealthy ? 'PASS' : 'FAIL'}`, {
          endpoint: endpoint.name,
          status: response.status,
          duration
        });

      } catch (error) {
        this.healthCheckStatus.set({ endpoint: endpoint.name, service: 'system' }, 0);
        
        await this.alertManager.sendAlert({
          severity: 'critical',
          title: `Health check error: ${endpoint.name}`,
          message: `Health check for ${endpoint.name} failed with error: ${error}`,
          metadata: {
            endpoint: endpoint.name,
            url: endpoint.url,
            error: error.toString()
          }
        });

        this.logger.error(`Health check ${endpoint.name} failed`, { error });
      }
    }
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect every 10 seconds
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.systemMemoryUsage.set({ type: 'rss', service: 'system' }, memUsage.rss);
    this.systemMemoryUsage.set({ type: 'heapTotal', service: 'system' }, memUsage.heapTotal);
    this.systemMemoryUsage.set({ type: 'heapUsed', service: 'system' }, memUsage.heapUsed);
    this.systemMemoryUsage.set({ type: 'external', service: 'system' }, memUsage.external);

    // CPU usage would require additional libraries like 'pidusage'
    // For now, we'll use a placeholder
    this.systemCpuUsage.set({ service: 'system' }, process.cpuUsage().user / 1000000);
  }

  async checkSystemHealth(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      uptime: process.uptime(),
      memoryUsage: memUsage,
      cpuUsage: process.cpuUsage().user / 1000000,
      activeConnections: 0, // Would be populated from actual connection pools
      requestRate: 0, // Would be calculated from metrics
      errorRate: 0, // Would be calculated from metrics
      responseTime: 0 // Would be calculated from metrics
    };
  }

  async generateHealthReport(): Promise<any> {
    const metrics = await this.checkSystemHealth();
    const healthChecks = await this.getHealthCheckResults();
    
    return {
      timestamp: new Date().toISOString(),
      status: healthChecks.every(check => check.healthy) ? 'healthy' : 'unhealthy',
      metrics,
      healthChecks,
      alerts: await this.alertManager.getActiveAlerts()
    };
  }

  private async getHealthCheckResults(): Promise<any[]> {
    const results = [];
    
    for (const endpoint of this.config.healthChecks.endpoints) {
      const metric = await this.registry.getSingleMetric('health_check_status');
      const value = metric?.get();
      
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        healthy: value ? value.values.find(v => v.labels.endpoint === endpoint.name)?.value === 1 : false,
        lastCheck: new Date().toISOString()
      });
    }
    
    return results;
  }
}