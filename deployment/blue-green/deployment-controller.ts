import { KubernetesApi, V1Deployment, V1Service } from '@kubernetes/client-node';
import { Logger } from '../utils/logger';
import { DatabaseMigrator } from '../migrations/database-migrator';
import { HealthChecker } from '../monitoring/health-checker';

export interface DeploymentConfig {
  namespace: string;
  serviceName: string;
  imageTag: string;
  replicas: number;
  healthCheckPath: string;
  rollbackOnFailure: boolean;
  maxUnavailable: number;
  maxSurge: number;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  activeSlot: 'blue' | 'green';
  rollbackAvailable: boolean;
  healthStatus: HealthStatus;
}

export interface HealthStatus {
  healthy: boolean;
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration: number;
}

export class BlueGreenDeploymentController {
  private k8sApi: KubernetesApi;
  private logger: Logger;
  private migrator: DatabaseMigrator;
  private healthChecker: HealthChecker;

  constructor(
    k8sApi: KubernetesApi,
    logger: Logger,
    migrator: DatabaseMigrator,
    healthChecker: HealthChecker
  ) {
    this.k8sApi = k8sApi;
    this.logger = logger;
    this.migrator = migrator;
    this.healthChecker = healthChecker;
  }

  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const deploymentId = this.generateDeploymentId();
    this.logger.info(`Starting blue-green deployment ${deploymentId}`, { config });

    try {
      // 1. Determine current active slot
      const currentSlot = await this.getCurrentActiveSlot(config.namespace, config.serviceName);
      const targetSlot = currentSlot === 'blue' ? 'green' : 'blue';

      this.logger.info(`Deploying to ${targetSlot} slot`, { currentSlot, targetSlot });

      // 2. Run database migrations if needed
      await this.runMigrations(config);

      // 3. Deploy to inactive slot
      await this.deployToSlot(config, targetSlot, deploymentId);

      // 4. Wait for deployment to be ready
      await this.waitForDeploymentReady(config.namespace, `${config.serviceName}-${targetSlot}`);

      // 5. Run health checks
      const healthStatus = await this.performHealthChecks(config, targetSlot);

      if (!healthStatus.healthy && config.rollbackOnFailure) {
        this.logger.error('Health checks failed, rolling back deployment', { healthStatus });
        await this.rollback(config, currentSlot);
        return {
          success: false,
          deploymentId,
          activeSlot: currentSlot,
          rollbackAvailable: true,
          healthStatus
        };
      }

      // 6. Switch traffic to new slot
      await this.switchTraffic(config.namespace, config.serviceName, targetSlot);

      // 7. Scale down old slot
      await this.scaleDownSlot(config.namespace, `${config.serviceName}-${currentSlot}`);

      this.logger.info(`Blue-green deployment ${deploymentId} completed successfully`, {
        activeSlot: targetSlot
      });

      return {
        success: true,
        deploymentId,
        activeSlot: targetSlot,
        rollbackAvailable: true,
        healthStatus
      };

    } catch (error) {
      this.logger.error(`Deployment ${deploymentId} failed`, { error });
      
      if (config.rollbackOnFailure) {
        await this.rollback(config, currentSlot);
      }

      throw error;
    }
  }

  async rollback(config: DeploymentConfig, targetSlot: 'blue' | 'green'): Promise<void> {
    this.logger.info(`Rolling back to ${targetSlot} slot`, { config });

    try {
      // Switch traffic back to previous slot
      await this.switchTraffic(config.namespace, config.serviceName, targetSlot);

      // Scale up previous slot if needed
      await this.scaleUpSlot(config.namespace, `${config.serviceName}-${targetSlot}`, config.replicas);

      this.logger.info(`Rollback to ${targetSlot} completed successfully`);
    } catch (error) {
      this.logger.error('Rollback failed', { error });
      throw error;
    }
  }

  private async getCurrentActiveSlot(namespace: string, serviceName: string): Promise<'blue' | 'green'> {
    try {
      const service = await this.k8sApi.readNamespacedService(serviceName, namespace);
      const selector = service.body.spec?.selector;
      
      if (selector?.slot === 'blue') return 'blue';
      if (selector?.slot === 'green') return 'green';
      
      // Default to blue if no slot is set
      return 'blue';
    } catch (error) {
      this.logger.warn('Could not determine active slot, defaulting to blue', { error });
      return 'blue';
    }
  }

  private async deployToSlot(config: DeploymentConfig, slot: 'blue' | 'green', deploymentId: string): Promise<void> {
    const deploymentName = `${config.serviceName}-${slot}`;
    
    const deployment: V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deploymentName,
        namespace: config.namespace,
        labels: {
          app: config.serviceName,
          slot: slot,
          'deployment-id': deploymentId
        }
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: {
            app: config.serviceName,
            slot: slot
          }
        },
        strategy: {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxUnavailable: config.maxUnavailable,
            maxSurge: config.maxSurge
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.serviceName,
              slot: slot,
              'deployment-id': deploymentId
            }
          },
          spec: {
            containers: [{
              name: config.serviceName,
              image: config.imageTag,
              ports: [{
                containerPort: 3000
              }],
              livenessProbe: {
                httpGet: {
                  path: config.healthCheckPath,
                  port: 3000
                },
                initialDelaySeconds: 30,
                periodSeconds: 10
              },
              readinessProbe: {
                httpGet: {
                  path: config.healthCheckPath,
                  port: 3000
                },
                initialDelaySeconds: 5,
                periodSeconds: 5
              },
              resources: {
                requests: {
                  cpu: '100m',
                  memory: '128Mi'
                },
                limits: {
                  cpu: '500m',
                  memory: '512Mi'
                }
              }
            }]
          }
        }
      }
    };

    await this.k8sApi.createNamespacedDeployment(config.namespace, deployment);
  }

  private async waitForDeploymentReady(namespace: string, deploymentName: string): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const deployment = await this.k8sApi.readNamespacedDeployment(deploymentName, namespace);
        const status = deployment.body.status;

        if (status?.readyReplicas === status?.replicas && status?.replicas > 0) {
          this.logger.info(`Deployment ${deploymentName} is ready`);
          return;
        }

        this.logger.info(`Waiting for deployment ${deploymentName} to be ready`, {
          readyReplicas: status?.readyReplicas,
          totalReplicas: status?.replicas
        });

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.logger.warn(`Error checking deployment status: ${error}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Deployment ${deploymentName} did not become ready within ${maxWaitTime}ms`);
  }

  private async performHealthChecks(config: DeploymentConfig, slot: 'blue' | 'green'): Promise<HealthStatus> {
    const serviceName = `${config.serviceName}-${slot}`;
    return await this.healthChecker.performHealthChecks(config.namespace, serviceName);
  }

  private async switchTraffic(namespace: string, serviceName: string, targetSlot: 'blue' | 'green'): Promise<void> {
    const service = await this.k8sApi.readNamespacedService(serviceName, namespace);
    
    if (service.body.spec?.selector) {
      service.body.spec.selector.slot = targetSlot;
      await this.k8sApi.replaceNamespacedService(serviceName, namespace, service.body);
    }
  }

  private async scaleDownSlot(namespace: string, deploymentName: string): Promise<void> {
    const deployment = await this.k8sApi.readNamespacedDeployment(deploymentName, namespace);
    
    if (deployment.body.spec) {
      deployment.body.spec.replicas = 0;
      await this.k8sApi.replaceNamespacedDeployment(deploymentName, namespace, deployment.body);
    }
  }

  private async scaleUpSlot(namespace: string, deploymentName: string, replicas: number): Promise<void> {
    const deployment = await this.k8sApi.readNamespacedDeployment(deploymentName, namespace);
    
    if (deployment.body.spec) {
      deployment.body.spec.replicas = replicas;
      await this.k8sApi.replaceNamespacedDeployment(deploymentName, namespace, deployment.body);
    }
  }

  private async runMigrations(config: DeploymentConfig): Promise<void> {
    this.logger.info('Running database migrations');
    await this.migrator.runMigrations();
  }

  private generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}