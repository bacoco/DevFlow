import { MLflowClient } from './mlflow-client';
import { 
  MLflowConfig, 
  RegisteredModel, 
  ModelVersion, 
  ModelStage, 
  ModelMetrics,
  ModelValidationResult,
  TrainingJob,
  ModelDeployment
} from '../types/mlflow-types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
// import * as tar from 'tar';

export interface ModelRegistryConfig extends MLflowConfig {
  validationThresholds: Record<string, number>;
  autoPromoteToStaging: boolean;
  autoPromoteToProduction: boolean;
  modelStoragePath: string;
}

export class ModelRegistry {
  private mlflowClient: MLflowClient;
  private config: ModelRegistryConfig;
  private deployments: Map<string, ModelDeployment> = new Map();

  constructor(config: ModelRegistryConfig) {
    this.config = config;
    this.mlflowClient = new MLflowClient(config);
  }

  // ============================================================================
  // MODEL REGISTRATION
  // ============================================================================

  async registerModel(
    modelName: string,
    runId: string,
    modelPath: string,
    description?: string,
    tags?: Record<string, string>
  ): Promise<ModelVersion> {
    try {
      // Ensure the registered model exists
      await this.mlflowClient.ensureRegisteredModel(modelName, description);

      // Create model version
      const modelVersion = await this.mlflowClient.createModelVersion(
        modelName,
        modelPath,
        runId,
        description
      );

      // Add tags if provided
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          await this.mlflowClient.setTag(runId, key, value);
        }
      }

      // Log registration event
      await this.mlflowClient.setTag(runId, 'mlflow.model.registered', 'true');
      await this.mlflowClient.setTag(runId, 'mlflow.model.name', modelName);
      await this.mlflowClient.setTag(runId, 'mlflow.model.version', modelVersion.version);

      return modelVersion;
    } catch (error) {
      throw new Error(`Failed to register model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateModel(
    modelName: string,
    modelVersion: string,
    validationData?: any
  ): Promise<ModelValidationResult> {
    try {
      const version = await this.mlflowClient.getModelVersion(modelName, modelVersion);
      const run = await this.mlflowClient.getRun(version.run_id);

      // Extract metrics from the run
      const metrics: ModelMetrics = {
        accuracy: run.data.metrics.accuracy,
        precision: run.data.metrics.precision,
        recall: run.data.metrics.recall,
        f1_score: run.data.metrics.f1_score,
        mae: run.data.metrics.mae,
        mse: run.data.metrics.mse,
        rmse: run.data.metrics.rmse,
        r2: run.data.metrics.r2,
        auc: run.data.metrics.auc
      };

      // Validate against thresholds
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const [metricName, threshold] of Object.entries(this.config.validationThresholds)) {
        const metricValue = metrics[metricName as keyof ModelMetrics] as number;
        
        if (metricValue !== undefined) {
          if (metricValue < threshold) {
            errors.push(`${metricName} (${metricValue}) is below threshold (${threshold})`);
          } else if (metricValue < threshold * 1.1) {
            warnings.push(`${metricName} (${metricValue}) is close to threshold (${threshold})`);
          }
        }
      }

      // Additional validation logic can be added here
      if (validationData) {
        // Perform validation with provided data
        // This would involve loading the model and running predictions
        // For now, we'll skip this implementation
      }

      const passed = errors.length === 0;

      const result: ModelValidationResult = {
        modelName,
        modelVersion,
        validationTime: new Date(),
        passed,
        metrics,
        thresholds: this.config.validationThresholds,
        errors,
        warnings
      };

      // Log validation result
      await this.mlflowClient.setTag(version.run_id, 'validation.passed', passed.toString());
      await this.mlflowClient.setTag(version.run_id, 'validation.errors', errors.join('; '));
      await this.mlflowClient.setTag(version.run_id, 'validation.warnings', warnings.join('; '));

      return result;
    } catch (error) {
      throw new Error(`Failed to validate model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async promoteModel(
    modelName: string,
    modelVersion: string,
    targetStage: ModelStage,
    archiveExisting: boolean = true
  ): Promise<ModelVersion> {
    try {
      // Validate model before promotion to Production
      if (targetStage === 'Production') {
        const validationResult = await this.validateModel(modelName, modelVersion);
        if (!validationResult.passed) {
          throw new Error(`Model validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Transition model stage
      const updatedVersion = await this.mlflowClient.transitionModelVersionStage(
        modelName,
        modelVersion,
        targetStage,
        archiveExisting
      );

      // Log promotion event
      await this.mlflowClient.setTag(updatedVersion.run_id, 'promotion.stage', targetStage);
      await this.mlflowClient.setTag(updatedVersion.run_id, 'promotion.time', new Date().toISOString());

      return updatedVersion;
    } catch (error) {
      throw new Error(`Failed to promote model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async archiveModel(modelName: string, modelVersion: string): Promise<ModelVersion> {
    return this.promoteModel(modelName, modelVersion, 'Archived', false);
  }

  // ============================================================================
  // MODEL DEPLOYMENT
  // ============================================================================

  async deployModel(
    modelName: string,
    modelVersion: string,
    deploymentConfig?: Record<string, any>
  ): Promise<ModelDeployment> {
    try {
      const version = await this.mlflowClient.getModelVersion(modelName, modelVersion);
      
      if (version.current_stage !== 'Production' && version.current_stage !== 'Staging') {
        throw new Error(`Model must be in Staging or Production stage for deployment. Current stage: ${version.current_stage}`);
      }

      const deploymentId = uuidv4();
      const deployment: ModelDeployment = {
        id: deploymentId,
        modelName,
        modelVersion,
        stage: version.current_stage,
        deploymentTime: new Date(),
        status: 'deploying'
      };

      this.deployments.set(deploymentId, deployment);

      try {
        // Simulate deployment process
        // In a real implementation, this would involve:
        // 1. Downloading model artifacts
        // 2. Creating deployment infrastructure (containers, endpoints, etc.)
        // 3. Health checks
        // 4. Load balancer configuration

        await this.simulateDeployment(deployment, deploymentConfig);

        deployment.status = 'active';
        deployment.endpoint = `http://ml-service:8080/models/${modelName}/${modelVersion}`;
        deployment.healthCheck = {
          lastCheck: new Date(),
          status: 'healthy',
          latency: 50,
          errorRate: 0
        };

        // Log deployment event
        await this.mlflowClient.setTag(version.run_id, 'deployment.id', deploymentId);
        await this.mlflowClient.setTag(version.run_id, 'deployment.status', 'active');
        await this.mlflowClient.setTag(version.run_id, 'deployment.endpoint', deployment.endpoint);

      } catch (error) {
        deployment.status = 'failed';
        throw error;
      }

      return deployment;
    } catch (error) {
      throw new Error(`Failed to deploy model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async undeployModel(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    try {
      // Simulate undeployment process
      await this.simulateUndeployment(deployment);

      deployment.status = 'inactive';
      deployment.healthCheck = undefined;

      // Log undeployment event
      const version = await this.mlflowClient.getModelVersion(deployment.modelName, deployment.modelVersion);
      await this.mlflowClient.setTag(version.run_id, 'deployment.status', 'inactive');

    } catch (error) {
      throw new Error(`Failed to undeploy model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDeployment(deploymentId: string): Promise<ModelDeployment | undefined> {
    return this.deployments.get(deploymentId);
  }

  async listDeployments(modelName?: string): Promise<ModelDeployment[]> {
    const deployments = Array.from(this.deployments.values());
    
    if (modelName) {
      return deployments.filter(d => d.modelName === modelName);
    }
    
    return deployments;
  }

  async checkDeploymentHealth(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return;
    }

    try {
      // Simulate health check
      // In a real implementation, this would ping the model endpoint
      const isHealthy = Math.random() > 0.1; // 90% healthy
      const latency = Math.random() * 100 + 20; // 20-120ms
      const errorRate = Math.random() * 0.05; // 0-5%

      deployment.healthCheck = {
        lastCheck: new Date(),
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency,
        errorRate
      };

      if (!isHealthy) {
        console.warn(`Deployment ${deploymentId} is unhealthy`);
      }

    } catch (error) {
      if (deployment.healthCheck) {
        deployment.healthCheck.status = 'unhealthy';
        deployment.healthCheck.lastCheck = new Date();
      }
    }
  }

  // ============================================================================
  // MODEL VERSIONING
  // ============================================================================

  async listModelVersions(modelName: string, stage?: ModelStage): Promise<ModelVersion[]> {
    try {
      if (stage) {
        return await this.mlflowClient.getLatestModelVersions(modelName, [stage]);
      } else {
        const model = await this.mlflowClient.getRegisteredModel(modelName);
        return model.latest_versions;
      }
    } catch (error) {
      throw new Error(`Failed to list model versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getModelVersion(modelName: string, version: string): Promise<ModelVersion> {
    return this.mlflowClient.getModelVersion(modelName, version);
  }

  async getLatestModelVersion(modelName: string, stage: ModelStage): Promise<ModelVersion | null> {
    try {
      const versions = await this.mlflowClient.getLatestModelVersions(modelName, [stage]);
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      throw new Error(`Failed to get latest model version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async compareModelVersions(
    modelName: string,
    version1: string,
    version2: string
  ): Promise<{ version1: ModelVersion; version2: ModelVersion; comparison: Record<string, any> }> {
    try {
      const [v1, v2] = await Promise.all([
        this.mlflowClient.getModelVersion(modelName, version1),
        this.mlflowClient.getModelVersion(modelName, version2)
      ]);

      const [run1, run2] = await Promise.all([
        this.mlflowClient.getRun(v1.run_id),
        this.mlflowClient.getRun(v2.run_id)
      ]);

      const comparison = {
        metrics: this.compareMetrics(run1.data.metrics, run2.data.metrics),
        parameters: this.compareParameters(run1.data.params, run2.data.params),
        stages: {
          version1: v1.current_stage,
          version2: v2.current_stage
        },
        creation_time: {
          version1: new Date(v1.creation_timestamp),
          version2: new Date(v2.creation_timestamp)
        }
      };

      return { version1: v1, version2: v2, comparison };
    } catch (error) {
      throw new Error(`Failed to compare model versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // MODEL ARTIFACTS
  // ============================================================================

  async downloadModelArtifacts(modelName: string, modelVersion: string, outputPath: string): Promise<void> {
    try {
      const version = await this.mlflowClient.getModelVersion(modelName, modelVersion);
      const artifacts = await this.mlflowClient.listArtifacts(version.run_id);

      // Create output directory
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Download each artifact
      for (const artifact of artifacts) {
        const artifactData = await this.mlflowClient.downloadArtifact(version.run_id, artifact.path);
        const filePath = path.join(outputPath, artifact.path);
        
        // Create directory if needed
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, artifactData);
      }

    } catch (error) {
      throw new Error(`Failed to download model artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async packageModel(modelName: string, modelVersion: string, outputPath: string): Promise<string> {
    try {
      const tempDir = path.join(this.config.modelStoragePath, 'temp', `${modelName}-${modelVersion}`);
      
      // Download artifacts to temp directory
      await this.downloadModelArtifacts(modelName, modelVersion, tempDir);

      // Create tar.gz package (simplified for now)
      const packagePath = path.join(outputPath, `${modelName}-${modelVersion}.tar.gz`);
      
      // TODO: Implement tar.gz packaging when tar dependency is available
      // await tar.create(
      //   {
      //     gzip: true,
      //     file: packagePath,
      //     cwd: path.dirname(tempDir)
      //   },
      //   [path.basename(tempDir)]
      // );
      
      // For now, just create an empty file as placeholder
      fs.writeFileSync(packagePath, 'placeholder');

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      return packagePath;
    } catch (error) {
      throw new Error(`Failed to package model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async simulateDeployment(deployment: ModelDeployment, config?: Record<string, any>): Promise<void> {
    // Simulate deployment time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Pull model artifacts
    // 2. Create container/service
    // 3. Configure load balancer
    // 4. Run health checks
    
    console.log(`Deployed model ${deployment.modelName}:${deployment.modelVersion}`, config);
  }

  private async simulateUndeployment(deployment: ModelDeployment): Promise<void> {
    // Simulate undeployment time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Undeployed model ${deployment.modelName}:${deployment.modelVersion}`);
  }

  private compareMetrics(metrics1: Record<string, number>, metrics2: Record<string, number>): Record<string, any> {
    const comparison: Record<string, any> = {};
    const allMetrics = new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]);

    for (const metric of allMetrics) {
      const val1 = metrics1[metric];
      const val2 = metrics2[metric];

      comparison[metric] = {
        version1: val1,
        version2: val2,
        difference: val1 !== undefined && val2 !== undefined ? val2 - val1 : undefined,
        percentChange: val1 !== undefined && val2 !== undefined && val1 !== 0 ? 
          ((val2 - val1) / val1) * 100 : undefined
      };
    }

    return comparison;
  }

  private compareParameters(params1: Record<string, string>, params2: Record<string, string>): Record<string, any> {
    const comparison: Record<string, any> = {};
    const allParams = new Set([...Object.keys(params1), ...Object.keys(params2)]);

    for (const param of allParams) {
      comparison[param] = {
        version1: params1[param],
        version2: params2[param],
        changed: params1[param] !== params2[param]
      };
    }

    return comparison;
  }
}