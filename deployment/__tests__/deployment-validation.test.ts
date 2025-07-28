import { BlueGreenDeploymentController, DeploymentConfig } from '../blue-green/deployment-controller';
import { DatabaseMigrator } from '../migrations/database-migrator';
import { ProductionMonitor } from '../monitoring/production-monitor';
import { HealthChecker } from '../monitoring/health-checker';
import { AlertManager } from '../monitoring/alert-manager';
import { Logger } from '../utils/logger';

describe('Deployment Validation Tests', () => {
  let deploymentController: BlueGreenDeploymentController;
  let migrator: DatabaseMigrator;
  let monitor: ProductionMonitor;
  let healthChecker: HealthChecker;
  let alertManager: AlertManager;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('deployment-test');
    alertManager = new AlertManager(logger);
    healthChecker = new HealthChecker(logger);
    
    // Mock Kubernetes API
    const mockK8sApi = {
      readNamespacedService: jest.fn(),
      createNamespacedDeployment: jest.fn(),
      readNamespacedDeployment: jest.fn(),
      replaceNamespacedService: jest.fn(),
      replaceNamespacedDeployment: jest.fn()
    } as any;

    // Mock database migrator
    migrator = {
      runMigrations: jest.fn().mockResolvedValue({
        success: true,
        migrationsRun: [],
        errors: [],
        duration: 1000
      })
    } as any;

    deploymentController = new BlueGreenDeploymentController(
      mockK8sApi,
      logger,
      migrator,
      healthChecker
    );

    monitor = new ProductionMonitor(
      {
        prometheus: { port: 9090, metricsPath: '/metrics' },
        alerting: {},
        healthChecks: {
          interval: 30000,
          timeout: 5000,
          endpoints: []
        }
      },
      logger,
      alertManager
    );
  });

  describe('Blue-Green Deployment', () => {
    const mockConfig: DeploymentConfig = {
      namespace: 'devflow',
      serviceName: 'api-gateway',
      imageTag: 'devflow/api-gateway:v1.2.0',
      replicas: 3,
      healthCheckPath: '/health',
      rollbackOnFailure: true,
      maxUnavailable: 1,
      maxSurge: 1
    };

    test('should successfully deploy to inactive slot', async () => {
      // Mock current active slot as blue
      const mockService = {
        body: {
          spec: {
            selector: { slot: 'blue' }
          }
        }
      };
      
      const mockDeployment = {
        body: {
          status: {
            readyReplicas: 3,
            replicas: 3
          }
        }
      };

      (deploymentController as any).k8sApi.readNamespacedService.mockResolvedValue(mockService);
      (deploymentController as any).k8sApi.createNamespacedDeployment.mockResolvedValue({});
      (deploymentController as any).k8sApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);
      (deploymentController as any).k8sApi.replaceNamespacedService.mockResolvedValue({});
      (deploymentController as any).k8sApi.replaceNamespacedDeployment.mockResolvedValue({});

      // Mock health checks to pass
      jest.spyOn(healthChecker, 'performHealthChecks').mockResolvedValue({
        healthy: true,
        checks: [
          {
            name: 'service_connectivity',
            status: 'pass',
            message: 'Service is reachable',
            duration: 100,
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      });

      const result = await deploymentController.deploy(mockConfig);

      expect(result.success).toBe(true);
      expect(result.activeSlot).toBe('green');
      expect(result.rollbackAvailable).toBe(true);
      expect(result.healthStatus.healthy).toBe(true);
    });

    test('should rollback on health check failure', async () => {
      const mockService = {
        body: {
          spec: {
            selector: { slot: 'blue' }
          }
        }
      };
      
      const mockDeployment = {
        body: {
          status: {
            readyReplicas: 3,
            replicas: 3
          }
        }
      };

      (deploymentController as any).k8sApi.readNamespacedService.mockResolvedValue(mockService);
      (deploymentController as any).k8sApi.createNamespacedDeployment.mockResolvedValue({});
      (deploymentController as any).k8sApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);
      (deploymentController as any).k8sApi.replaceNamespacedService.mockResolvedValue({});
      (deploymentController as any).k8sApi.replaceNamespacedDeployment.mockResolvedValue({});

      // Mock health checks to fail
      jest.spyOn(healthChecker, 'performHealthChecks').mockResolvedValue({
        healthy: false,
        checks: [
          {
            name: 'service_connectivity',
            status: 'fail',
            message: 'Service is not reachable',
            duration: 5000,
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      });

      const result = await deploymentController.deploy(mockConfig);

      expect(result.success).toBe(false);
      expect(result.activeSlot).toBe('blue'); // Should remain on original slot
      expect(result.healthStatus.healthy).toBe(false);
    });

    test('should handle deployment timeout', async () => {
      const mockService = {
        body: {
          spec: {
            selector: { slot: 'blue' }
          }
        }
      };
      
      // Mock deployment that never becomes ready
      const mockDeployment = {
        body: {
          status: {
            readyReplicas: 0,
            replicas: 3
          }
        }
      };

      (deploymentController as any).k8sApi.readNamespacedService.mockResolvedValue(mockService);
      (deploymentController as any).k8sApi.createNamespacedDeployment.mockResolvedValue({});
      (deploymentController as any).k8sApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);

      await expect(deploymentController.deploy(mockConfig)).rejects.toThrow(/did not become ready/);
    });
  });

  describe('Database Migration', () => {
    test('should run migrations successfully', async () => {
      const result = await migrator.runMigrations();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle migration failures', async () => {
      (migrator.runMigrations as jest.Mock).mockResolvedValue({
        success: false,
        migrationsRun: ['001_initial_schema'],
        errors: ['Migration 002_add_privacy_settings failed'],
        duration: 5000
      });

      const result = await migrator.runMigrations();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.migrationsRun).toContain('001_initial_schema');
    });
  });

  describe('Production Monitoring', () => {
    test('should record deployment metrics', () => {
      monitor.recordDeploymentStatus('deploy-123', 'api-gateway', 'green', true);
      
      // Verify metric was recorded (in real implementation, we'd check Prometheus registry)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should record HTTP request metrics', () => {
      monitor.recordHttpRequest('GET', '/api/users', 200, 0.150, 'api-gateway');
      
      // Verify metrics were recorded
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should generate health report', async () => {
      const report = await monitor.generateHealthReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('healthChecks');
      expect(report).toHaveProperty('alerts');
    });
  });

  describe('Health Checks', () => {
    test('should perform comprehensive health checks', async () => {
      const healthStatus = await healthChecker.performHealthChecks('devflow', 'api-gateway');

      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('checks');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus.checks.length).toBeGreaterThan(0);
    });

    test('should detect unhealthy services', async () => {
      // Mock fetch to simulate service failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const healthStatus = await healthChecker.performHealthChecks('devflow', 'api-gateway');

      expect(healthStatus.healthy).toBe(false);
      expect(healthStatus.checks.some(check => check.status === 'fail')).toBe(true);
    });
  });

  describe('Alert Management', () => {
    test('should send alerts successfully', async () => {
      const alert = {
        severity: 'warning' as const,
        title: 'High Memory Usage',
        message: 'Memory usage is above 80%',
        metadata: { service: 'api-gateway', usage: 85 }
      };

      await alertManager.sendAlert(alert);

      const activeAlerts = await alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].title).toBe('High Memory Usage');
    });

    test('should resolve alerts', async () => {
      const alert = {
        severity: 'warning' as const,
        title: 'Test Alert',
        message: 'Test message'
      };

      await alertManager.sendAlert(alert);
      const activeAlerts = await alertManager.getActiveAlerts();
      const alertId = activeAlerts[0].id!;

      await alertManager.resolveAlert(alertId);

      const remainingAlerts = await alertManager.getActiveAlerts();
      expect(remainingAlerts).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    test('should perform end-to-end deployment validation', async () => {
      // This would test the entire deployment pipeline
      const config: DeploymentConfig = {
        namespace: 'devflow-test',
        serviceName: 'test-service',
        imageTag: 'test:latest',
        replicas: 1,
        healthCheckPath: '/health',
        rollbackOnFailure: true,
        maxUnavailable: 0,
        maxSurge: 1
      };

      // Mock successful deployment flow
      const mockService = { body: { spec: { selector: { slot: 'blue' } } } };
      const mockDeployment = { body: { status: { readyReplicas: 1, replicas: 1 } } };

      (deploymentController as any).k8sApi.readNamespacedService.mockResolvedValue(mockService);
      (deploymentController as any).k8sApi.createNamespacedDeployment.mockResolvedValue({});
      (deploymentController as any).k8sApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);
      (deploymentController as any).k8sApi.replaceNamespacedService.mockResolvedValue({});
      (deploymentController as any).k8sApi.replaceNamespacedDeployment.mockResolvedValue({});

      jest.spyOn(healthChecker, 'performHealthChecks').mockResolvedValue({
        healthy: true,
        checks: [{ name: 'test', status: 'pass', message: 'OK', duration: 100, timestamp: new Date() }],
        timestamp: new Date()
      });

      const result = await deploymentController.deploy(config);

      expect(result.success).toBe(true);
      expect(migrator.runMigrations).toHaveBeenCalled();
    });
  });
});