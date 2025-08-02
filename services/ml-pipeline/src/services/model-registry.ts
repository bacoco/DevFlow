import { MLflowClient } from './mlflow-client';
import { 
  MLflowConfig, 
  RegisteredModel, 
  ModelVersion, 
  ModelStage, 
  ModelMetrics,
  ModelValidationResult,
  TrainingJob,
  ModelDeployment,
  MLflowRun
} from '../types/mlflow-types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import tar for model packaging - handle when not available
let tar: any;
try {
  tar = require('tar');
} catch (error) {
  console.warn('tar dependency not available - model packaging will use fallback implementation');
  tar = null;
}

export interface ModelRegistryConfig extends MLflowConfig {
  validationThresholds: Record<string, number>;
  autoPromoteToStaging: boolean;
  autoPromoteToProduction: boolean;
  modelStoragePath: string;
}

export interface ModelPackage {
  id: string;
  modelName: string;
  modelVersion: string;
  packagePath: string;
  packageSize: number;
  checksum: string;
  createdAt: Date;
  metadata: ModelPackageMetadata;
  status: 'created' | 'validated' | 'deployed' | 'archived';
  deployments: string[]; // List of deployment IDs
  tags: Record<string, string>;
}

export interface ModelPackageMetadata {
  mlflowVersion: string;
  pythonVersion?: string;
  dependencies: string[];
  modelFramework: string;
  modelType: string;
  inputSchema?: any;
  outputSchema?: any;
  signature?: any;
  modelSize: number;
  artifactCount: number;
  compressionRatio: number;
  buildInfo: {
    buildTime: Date;
    buildHost: string;
    gitCommit?: string;
    buildNumber?: string;
  };
}

export interface ModelArtifactStorage {
  storePackage(packageInfo: ModelPackage): Promise<string>;
  retrievePackage(packageId: string): Promise<Buffer>;
  deletePackage(packageId: string): Promise<void>;
  listPackages(modelName?: string): Promise<ModelPackage[]>;
}

export interface ModelDeploymentPipeline {
  deployPackage(packageId: string, environment: string, config?: any): Promise<string>;
  undeployPackage(deploymentId: string): Promise<void>;
  getDeploymentStatus(deploymentId: string): Promise<ModelDeployment>;
  listDeployments(environment?: string): Promise<ModelDeployment[]>;
}

export class ModelRegistry {
  private mlflowClient: MLflowClient;
  private config: ModelRegistryConfig;
  private deployments: Map<string, ModelDeployment> = new Map();
  private packages: Map<string, ModelPackage> = new Map();
  private artifactStorage: ModelArtifactStorage;
  private deploymentPipeline: ModelDeploymentPipeline;

  constructor(config: ModelRegistryConfig) {
    this.config = config;
    this.mlflowClient = new MLflowClient(config);
    this.artifactStorage = new FileSystemArtifactStorage(config.modelStoragePath);
    this.deploymentPipeline = new KubernetesDeploymentPipeline(config);
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

  async packageModel(modelName: string, modelVersion: string, outputPath?: string): Promise<ModelPackage> {
    try {
      const version = await this.mlflowClient.getModelVersion(modelName, modelVersion);
      const run = await this.mlflowClient.getRun(version.run_id);
      
      const packageId = uuidv4();
      const tempDir = path.join(this.config.modelStoragePath, 'temp', packageId);
      const finalOutputPath = outputPath || path.join(this.config.modelStoragePath, 'packages');
      
      // Ensure directories exist
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(finalOutputPath, { recursive: true });

      // Download artifacts to temp directory
      await this.downloadModelArtifacts(modelName, modelVersion, tempDir);

      // Create model metadata
      const metadata = await this.createModelMetadata(version, run);
      const metadataPath = path.join(tempDir, 'model-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Create MLmodel file for MLflow compatibility
      const mlmodelContent = this.createMLModelFile(version, metadata);
      const mlmodelPath = path.join(tempDir, 'MLmodel');
      fs.writeFileSync(mlmodelPath, mlmodelContent);

      // Create requirements.txt if dependencies exist
      if (metadata.dependencies.length > 0) {
        const requirementsPath = path.join(tempDir, 'requirements.txt');
        fs.writeFileSync(requirementsPath, metadata.dependencies.join('\n'));
      }

      // Create tar.gz package
      const packageFileName = `${modelName}-${modelVersion}-${packageId}.tar.gz`;
      const packagePath = path.join(finalOutputPath, packageFileName);
      
      if (tar) {
        await tar.create(
          {
            gzip: true,
            file: packagePath,
            cwd: path.dirname(tempDir)
          },
          [path.basename(tempDir)]
        );
      } else {
        // Fallback implementation when tar is not available
        await this.createFallbackPackage(tempDir, packagePath);
      }

      // Calculate package size and checksum
      const stats = fs.statSync(packagePath);
      const checksum = await this.calculateChecksum(packagePath);

      // Calculate compression ratio
      const uncompressedSize = this.calculateDirectorySize(tempDir);
      const compressionRatio = stats.size / uncompressedSize;

      // Add build info to metadata
      metadata.buildInfo = {
        buildTime: new Date(),
        buildHost: require('os').hostname(),
        gitCommit: process.env.GIT_COMMIT,
        buildNumber: process.env.BUILD_NUMBER
      };
      metadata.compressionRatio = compressionRatio;

      // Create package info
      const packageInfo: ModelPackage = {
        id: packageId,
        modelName,
        modelVersion,
        packagePath,
        packageSize: stats.size,
        checksum,
        createdAt: new Date(),
        metadata,
        status: 'created',
        deployments: [],
        tags: {
          'package.type': 'ml-model',
          'package.format': 'tar.gz',
          'mlflow.run_id': version.run_id,
          'mlflow.stage': version.current_stage
        }
      };

      // Store package info
      this.packages.set(packageId, packageInfo);
      
      // Store in artifact storage
      await this.artifactStorage.storePackage(packageInfo);

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      // Log packaging event
      await this.mlflowClient.setTag(version.run_id, 'package.id', packageId);
      await this.mlflowClient.setTag(version.run_id, 'package.path', packagePath);
      await this.mlflowClient.setTag(version.run_id, 'package.checksum', checksum);

      return packageInfo;
    } catch (error) {
      console.error('Packaging error:', error);
      throw new Error(`Failed to package model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unpackageModel(packageId: string, outputPath: string): Promise<void> {
    try {
      const packageInfo = this.packages.get(packageId);
      if (!packageInfo) {
        throw new Error(`Package ${packageId} not found`);
      }

      // Retrieve package from storage
      const packageData = await this.artifactStorage.retrievePackage(packageId);
      
      // Write package to temp file
      const tempPackagePath = path.join(this.config.modelStoragePath, 'temp', `${packageId}.tar.gz`);
      fs.mkdirSync(path.dirname(tempPackagePath), { recursive: true });
      fs.writeFileSync(tempPackagePath, packageData);

      // Verify checksum
      const actualChecksum = await this.calculateChecksum(tempPackagePath);
      if (actualChecksum !== packageInfo.checksum) {
        throw new Error(`Package checksum mismatch. Expected: ${packageInfo.checksum}, Actual: ${actualChecksum}`);
      }

      // Extract package
      fs.mkdirSync(outputPath, { recursive: true });
      
      if (tar) {
        await tar.extract({
          file: tempPackagePath,
          cwd: outputPath
        });
      } else {
        // Fallback implementation when tar is not available
        await this.extractFallbackPackage(tempPackagePath, outputPath);
      }

      // Clean up temp file
      fs.unlinkSync(tempPackagePath);

    } catch (error) {
      throw new Error(`Failed to unpackage model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listPackages(modelName?: string): Promise<ModelPackage[]> {
    const packages = Array.from(this.packages.values());
    
    if (modelName) {
      return packages.filter(pkg => pkg.modelName === modelName);
    }
    
    return packages;
  }

  async getPackage(packageId: string): Promise<ModelPackage | undefined> {
    return this.packages.get(packageId);
  }

  async deletePackage(packageId: string): Promise<void> {
    try {
      const packageInfo = this.packages.get(packageId);
      if (!packageInfo) {
        throw new Error(`Package ${packageId} not found`);
      }

      // Check if package has active deployments
      if (packageInfo.deployments.length > 0) {
        throw new Error(`Cannot delete package ${packageId}: has active deployments`);
      }

      // Delete from artifact storage
      await this.artifactStorage.deletePackage(packageId);

      // Delete local file if it exists
      if (fs.existsSync(packageInfo.packagePath)) {
        fs.unlinkSync(packageInfo.packagePath);
      }

      // Remove from memory
      this.packages.delete(packageId);

    } catch (error) {
      throw new Error(`Failed to delete package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validatePackage(packageId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const packageInfo = this.packages.get(packageId);
      if (!packageInfo) {
        return { valid: false, errors: ['Package not found'] };
      }

      const errors: string[] = [];

      // Check if package file exists
      if (!fs.existsSync(packageInfo.packagePath)) {
        errors.push('Package file not found');
      } else {
        // Verify checksum
        const actualChecksum = await this.calculateChecksum(packageInfo.packagePath);
        if (actualChecksum !== packageInfo.checksum) {
          errors.push('Package checksum mismatch');
        }

        // Verify file size
        const stats = fs.statSync(packageInfo.packagePath);
        if (stats.size !== packageInfo.packageSize) {
          errors.push('Package size mismatch');
        }
      }

      // Validate metadata
      if (!packageInfo.metadata.modelFramework) {
        errors.push('Missing model framework information');
      }

      if (packageInfo.metadata.dependencies.length === 0) {
        errors.push('No dependencies specified');
      }

      // Update package status
      if (errors.length === 0) {
        packageInfo.status = 'validated';
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { 
        valid: false, 
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  async addPackageTag(packageId: string, key: string, value: string): Promise<void> {
    const packageInfo = this.packages.get(packageId);
    if (!packageInfo) {
      throw new Error(`Package ${packageId} not found`);
    }

    packageInfo.tags[key] = value;
    await this.artifactStorage.storePackage(packageInfo);
  }

  async removePackageTag(packageId: string, key: string): Promise<void> {
    const packageInfo = this.packages.get(packageId);
    if (!packageInfo) {
      throw new Error(`Package ${packageId} not found`);
    }

    delete packageInfo.tags[key];
    await this.artifactStorage.storePackage(packageInfo);
  }

  async getPackagesByTag(key: string, value?: string): Promise<ModelPackage[]> {
    const packages = Array.from(this.packages.values());
    
    return packages.filter(pkg => {
      if (value) {
        return pkg.tags[key] === value;
      } else {
        return key in pkg.tags;
      }
    });
  }

  // ============================================================================
  // MODEL DEPLOYMENT PIPELINE
  // ============================================================================

  async deployPackage(packageId: string, environment: string, config?: any): Promise<string> {
    try {
      const packageInfo = this.packages.get(packageId);
      if (!packageInfo) {
        throw new Error(`Package ${packageId} not found`);
      }

      // Validate package before deployment
      const validation = await this.validatePackage(packageId);
      if (!validation.valid) {
        throw new Error(`Package validation failed: ${validation.errors.join(', ')}`);
      }

      const deploymentId = await this.deploymentPipeline.deployPackage(packageId, environment, config);
      
      // Track deployment in package
      packageInfo.deployments.push(deploymentId);
      packageInfo.status = 'deployed';
      await this.artifactStorage.storePackage(packageInfo);

      return deploymentId;
    } catch (error) {
      throw new Error(`Failed to deploy package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async undeployPackage(deploymentId: string): Promise<void> {
    try {
      await this.deploymentPipeline.undeployPackage(deploymentId);
      
      // Remove deployment from package tracking
      for (const packageInfo of this.packages.values()) {
        const index = packageInfo.deployments.indexOf(deploymentId);
        if (index > -1) {
          packageInfo.deployments.splice(index, 1);
          if (packageInfo.deployments.length === 0) {
            packageInfo.status = 'validated';
          }
          await this.artifactStorage.storePackage(packageInfo);
          break;
        }
      }
    } catch (error) {
      throw new Error(`Failed to undeploy package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPackageDeploymentStatus(deploymentId: string): Promise<ModelDeployment> {
    try {
      return await this.deploymentPipeline.getDeploymentStatus(deploymentId);
    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listPackageDeployments(environment?: string): Promise<ModelDeployment[]> {
    try {
      return await this.deploymentPipeline.listDeployments(environment);
    } catch (error) {
      throw new Error(`Failed to list deployments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async createModelMetadata(version: ModelVersion, run: MLflowRun): Promise<ModelPackageMetadata> {
    // Extract dependencies from run tags or parameters
    const dependencies = this.extractDependencies(run);
    
    // Determine model framework from tags or artifacts
    const modelFramework = run.data.tags['mlflow.model.framework'] || 'unknown';
    const modelType = run.data.tags['mlflow.model.type'] || 'unknown';
    
    // Get artifact information
    const artifacts = await this.mlflowClient.listArtifacts(version.run_id);
    const modelSize = artifacts.reduce((total, artifact) => total + (artifact.file_size || 0), 0);
    
    return {
      mlflowVersion: run.data.tags['mlflow.version'] || '2.0.0',
      pythonVersion: run.data.tags['mlflow.python.version'],
      dependencies,
      modelFramework,
      modelType,
      inputSchema: run.data.tags['mlflow.model.input_schema'] ? 
        JSON.parse(run.data.tags['mlflow.model.input_schema']) : undefined,
      outputSchema: run.data.tags['mlflow.model.output_schema'] ? 
        JSON.parse(run.data.tags['mlflow.model.output_schema']) : undefined,
      signature: run.data.tags['mlflow.model.signature'] ? 
        JSON.parse(run.data.tags['mlflow.model.signature']) : undefined,
      modelSize,
      artifactCount: artifacts.length,
      compressionRatio: 0, // Will be calculated later
      buildInfo: {
        buildTime: new Date(),
        buildHost: '',
        gitCommit: run.data.tags['mlflow.source.git.commit'],
        buildNumber: run.data.tags['mlflow.source.build.number']
      }
    };
  }

  private extractDependencies(run: MLflowRun): string[] {
    const dependencies: string[] = [];
    
    // Extract from tags
    if (run.data.tags['mlflow.model.dependencies']) {
      dependencies.push(...run.data.tags['mlflow.model.dependencies'].split(','));
    }
    
    // Extract from parameters
    Object.entries(run.data.params).forEach(([key, value]) => {
      if (key.startsWith('dependency_') && typeof value === 'string') {
        dependencies.push(value);
      }
    });
    
    return dependencies.filter(dep => dep.trim().length > 0);
  }

  private createMLModelFile(version: ModelVersion, metadata: ModelPackageMetadata): string {
    const mlmodelContent = {
      artifact_path: 'model',
      flavors: {
        [metadata.modelFramework]: {
          model_path: 'model.pkl', // This should be dynamic based on the actual model file
          python_version: metadata.pythonVersion || '3.8.0'
        }
      },
      model_uuid: version.run_id,
      mlflow_version: metadata.mlflowVersion,
      signature: metadata.signature,
      utc_time_created: new Date(version.creation_timestamp).toISOString()
    };

    return Object.entries(mlmodelContent)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    const calculateSize = (currentPath: string) => {
      const stats = fs.statSync(currentPath);
      
      if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
          calculateSize(path.join(currentPath, file));
        }
      } else {
        totalSize += stats.size;
      }
    };
    
    calculateSize(dirPath);
    return totalSize;
  }

  private async createFallbackPackage(sourceDir: string, packagePath: string): Promise<void> {
    // Simple fallback: create a JSON manifest with base64-encoded files
    const manifest: any = {
      type: 'devflow-model-package',
      version: '1.0',
      files: {}
    };

    const addFilesToManifest = (dir: string, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          addFilesToManifest(fullPath, itemRelativePath);
        } else {
          const content = fs.readFileSync(fullPath);
          manifest.files[itemRelativePath] = {
            content: content.toString('base64'),
            size: stats.size,
            isDirectory: false
          };
        }
      }
    };

    addFilesToManifest(sourceDir);
    
    // Write manifest as JSON
    fs.writeFileSync(packagePath, JSON.stringify(manifest, null, 2));
  }

  private async extractFallbackPackage(packagePath: string, outputDir: string): Promise<void> {
    // Read and parse the JSON manifest
    const manifestContent = fs.readFileSync(packagePath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    if (manifest.type !== 'devflow-model-package') {
      throw new Error('Invalid package format');
    }

    // Extract files from manifest
    for (const [filePath, fileInfo] of Object.entries(manifest.files as any)) {
      const fullOutputPath = path.join(outputDir, filePath);
      const dir = path.dirname(fullOutputPath);
      
      // Create directory if needed
      fs.mkdirSync(dir, { recursive: true });
      
      // Write file content
      const content = Buffer.from((fileInfo as any).content, 'base64');
      fs.writeFileSync(fullOutputPath, content);
    }
  }



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

// ============================================================================
// ARTIFACT STORAGE IMPLEMENTATIONS
// ============================================================================

export class FileSystemArtifactStorage implements ModelArtifactStorage {
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    fs.mkdirSync(path.join(storagePath, 'packages'), { recursive: true });
  }

  async storePackage(packageInfo: ModelPackage): Promise<string> {
    const metadataPath = path.join(this.storagePath, 'packages', `${packageInfo.id}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(packageInfo, null, 2));
    return packageInfo.id;
  }

  async retrievePackage(packageId: string): Promise<Buffer> {
    const metadataPath = path.join(this.storagePath, 'packages', `${packageId}.json`);
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Package metadata not found: ${packageId}`);
    }

    const packageInfo: ModelPackage = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    if (!fs.existsSync(packageInfo.packagePath)) {
      throw new Error(`Package file not found: ${packageInfo.packagePath}`);
    }

    return fs.readFileSync(packageInfo.packagePath);
  }

  async deletePackage(packageId: string): Promise<void> {
    const metadataPath = path.join(this.storagePath, 'packages', `${packageId}.json`);
    
    if (fs.existsSync(metadataPath)) {
      const packageInfo: ModelPackage = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Delete package file
      if (fs.existsSync(packageInfo.packagePath)) {
        fs.unlinkSync(packageInfo.packagePath);
      }
      
      // Delete metadata
      fs.unlinkSync(metadataPath);
    }
  }

  async listPackages(modelName?: string): Promise<ModelPackage[]> {
    const packagesDir = path.join(this.storagePath, 'packages');
    const files = fs.readdirSync(packagesDir).filter(f => f.endsWith('.json'));
    
    const packages: ModelPackage[] = [];
    
    for (const file of files) {
      try {
        const packageInfo: ModelPackage = JSON.parse(
          fs.readFileSync(path.join(packagesDir, file), 'utf8')
        );
        
        if (!modelName || packageInfo.modelName === modelName) {
          packages.push(packageInfo);
        }
      } catch (error) {
        console.warn(`Failed to parse package metadata: ${file}`, error);
      }
    }
    
    return packages;
  }
}

// ============================================================================
// DEPLOYMENT PIPELINE IMPLEMENTATIONS
// ============================================================================

export class KubernetesDeploymentPipeline implements ModelDeploymentPipeline {
  private config: ModelRegistryConfig;
  private deployments: Map<string, ModelDeployment> = new Map();

  constructor(config: ModelRegistryConfig) {
    this.config = config;
  }

  async deployPackage(packageId: string, environment: string, config?: any): Promise<string> {
    const deploymentId = uuidv4();
    
    // In a real implementation, this would:
    // 1. Create Kubernetes deployment manifest
    // 2. Apply the manifest to the cluster
    // 3. Wait for deployment to be ready
    // 4. Create service and ingress
    // 5. Configure monitoring and logging
    
    const deployment: ModelDeployment = {
      id: deploymentId,
      modelName: `package-${packageId}`,
      modelVersion: 'latest',
      stage: 'Production',
      deploymentTime: new Date(),
      status: 'deploying',
      endpoint: `http://ml-${environment}.devflow.local/models/${packageId}`
    };

    this.deployments.set(deploymentId, deployment);

    // Simulate deployment process
    setTimeout(() => {
      deployment.status = 'active';
      deployment.healthCheck = {
        lastCheck: new Date(),
        status: 'healthy',
        latency: 45,
        errorRate: 0
      };
    }, 3000);

    return deploymentId;
  }

  async undeployPackage(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    // In a real implementation, this would:
    // 1. Delete Kubernetes deployment
    // 2. Delete service and ingress
    // 3. Clean up monitoring resources
    
    deployment.status = 'inactive';
    deployment.healthCheck = undefined;
  }

  async getDeploymentStatus(deploymentId: string): Promise<ModelDeployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }
    return deployment;
  }

  async listDeployments(environment?: string): Promise<ModelDeployment[]> {
    const deployments = Array.from(this.deployments.values());
    
    if (environment) {
      return deployments.filter(d => d.endpoint?.includes(environment));
    }
    
    return deployments;
  }
}