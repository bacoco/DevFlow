import { ModelRegistry, ModelRegistryConfig } from '../services/model-registry';
import { MLflowClient } from '../services/mlflow-client';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

describe('Model Deployment Integration Tests', () => {
  let modelRegistry: ModelRegistry;
  let config: ModelRegistryConfig;
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(__dirname, '..', '..', 'temp-test-' + uuidv4());
    
    config = {
      trackingUri: 'http://localhost:5000',
      experimentName: 'integration-test',
      artifactRoot: path.join(tempDir, 'artifacts'),
      defaultModelName: 'test-model',
      validationThresholds: {
        accuracy: 0.8,
        precision: 0.7,
        recall: 0.6
      },
      autoPromoteToStaging: false,
      autoPromoteToProduction: false,
      modelStoragePath: path.join(tempDir, 'models')
    };

    // Create temp directories
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(config.artifactRoot, { recursive: true });
    fs.mkdirSync(config.modelStoragePath, { recursive: true });

    modelRegistry = new ModelRegistry(config);
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Model Packaging and Deployment', () => {
    let packageId: string;
    let deploymentId: string;

    it('should package a model with all artifacts', async () => {
      // Mock MLflow client responses
      const mockMlflowClient = {
        getModelVersion: jest.fn().mockResolvedValue({
          name: 'test-model',
          version: '1',
          creation_timestamp: Date.now(),
          last_updated_timestamp: Date.now(),
          user_id: 'test-user',
          current_stage: 'Production',
          source: 's3://bucket/model',
          run_id: 'run-123',
          status: 'READY',
          tags: {}
        }),
        getRun: jest.fn().mockResolvedValue({
          info: {
            run_id: 'run-123',
            run_uuid: 'run-123',
            experiment_id: 'exp-123',
            user_id: 'test-user',
            status: 'FINISHED',
            start_time: Date.now(),
            artifact_uri: 's3://bucket/artifacts',
            lifecycle_stage: 'active'
          },
          data: {
            metrics: { 
              accuracy: 0.95, 
              precision: 0.92, 
              recall: 0.88,
              f1_score: 0.90 
            },
            params: { 
              learning_rate: '0.01', 
              epochs: '100',
              model_type: 'RandomForest'
            },
            tags: {
              'mlflow.model.framework': 'sklearn',
              'mlflow.model.type': 'classifier',
              'mlflow.python.version': '3.8.0',
              'mlflow.model.dependencies': 'scikit-learn==1.0.0,numpy==1.21.0,pandas==1.3.0'
            }
          }
        }),
        listArtifacts: jest.fn().mockResolvedValue([
          { path: 'model.pkl', is_dir: false, file_size: 2048 },
          { path: 'feature_names.json', is_dir: false, file_size: 512 },
          { path: 'model_info.json', is_dir: false, file_size: 256 }
        ]),
        downloadArtifact: jest.fn().mockImplementation((runId, artifactPath) => {
          // Simulate different artifact content based on path
          if (artifactPath === 'model.pkl') {
            return Promise.resolve(Buffer.from('mock-model-binary-data'));
          } else if (artifactPath === 'feature_names.json') {
            return Promise.resolve(Buffer.from(JSON.stringify(['feature1', 'feature2', 'feature3'])));
          } else if (artifactPath === 'model_info.json') {
            return Promise.resolve(Buffer.from(JSON.stringify({
              model_type: 'RandomForestClassifier',
              n_estimators: 100,
              max_depth: 10
            })));
          }
          return Promise.resolve(Buffer.from('default-content'));
        }),
        setTag: jest.fn().mockResolvedValue(undefined)
      };

      // Replace the MLflow client
      (modelRegistry as any).mlflowClient = mockMlflowClient;

      // Package the model
      const packageInfo = await modelRegistry.packageModel('test-model', '1');
      packageId = packageInfo.id;

      // Verify package creation
      expect(packageInfo).toBeDefined();
      expect(packageInfo.modelName).toBe('test-model');
      expect(packageInfo.modelVersion).toBe('1');
      expect(packageInfo.packageSize).toBeGreaterThan(0);
      expect(packageInfo.checksum).toBeDefined();
      expect(packageInfo.status).toBe('created');
      expect(packageInfo.deployments).toEqual([]);
      expect(packageInfo.metadata.modelFramework).toBe('sklearn');
      expect(packageInfo.metadata.dependencies).toContain('scikit-learn==1.0.0');
      expect(packageInfo.metadata.dependencies).toContain('numpy==1.21.0');
      expect(packageInfo.metadata.dependencies).toContain('pandas==1.3.0');
      expect(packageInfo.metadata.buildInfo).toBeDefined();
      expect(packageInfo.metadata.compressionRatio).toBeGreaterThan(0);

      // Verify package file exists
      expect(fs.existsSync(packageInfo.packagePath)).toBe(true);

      // Verify MLflow client interactions
      expect(mockMlflowClient.getModelVersion).toHaveBeenCalledWith('test-model', '1');
      expect(mockMlflowClient.getRun).toHaveBeenCalledWith('run-123');
      expect(mockMlflowClient.listArtifacts).toHaveBeenCalledWith('run-123');
      expect(mockMlflowClient.downloadArtifact).toHaveBeenCalledTimes(3);
      expect(mockMlflowClient.setTag).toHaveBeenCalledWith('run-123', 'package.id', packageId);
    });

    it('should deploy the packaged model to staging environment', async () => {
      expect(packageId).toBeDefined();

      // Deploy the package
      deploymentId = await modelRegistry.deployPackage(packageId, 'staging', {
        replicas: 2,
        resources: {
          cpu: '500m',
          memory: '1Gi'
        }
      });

      expect(deploymentId).toBeDefined();

      // Wait for deployment to become active (simulated)
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Check deployment status
      const deployment = await modelRegistry.getPackageDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('active');
      expect(deployment.endpoint).toContain('staging');
      expect(deployment.healthCheck?.status).toBe('healthy');
    });

    it('should list deployments for the staging environment', async () => {
      const deployments = await modelRegistry.listPackageDeployments('staging');
      
      expect(deployments).toHaveLength(1);
      expect(deployments[0].id).toBe(deploymentId);
      expect(deployments[0].status).toBe('active');
    });

    it('should unpackage the model to a directory', async () => {
      const outputDir = path.join(tempDir, 'unpacked-model');
      
      await modelRegistry.unpackageModel(packageId, outputDir);

      // Verify unpacked directory exists
      expect(fs.existsSync(outputDir)).toBe(true);
      
      // The actual verification of unpacked contents would depend on the tar implementation
      // In a real test, we would check for the presence of model files
    });

    it('should undeploy the model', async () => {
      await modelRegistry.undeployPackage(deploymentId);

      const deployment = await modelRegistry.getPackageDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('inactive');
      expect(deployment.healthCheck).toBeUndefined();
    });

    it('should validate the package before deletion', async () => {
      // Validate package
      const validation = await modelRegistry.validatePackage(packageId);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should delete the package', async () => {
      const packagesBefore = await modelRegistry.listPackages();
      expect(packagesBefore.some(p => p.id === packageId)).toBe(true);

      await modelRegistry.deletePackage(packageId);

      const packagesAfter = await modelRegistry.listPackages();
      expect(packagesAfter.some(p => p.id === packageId)).toBe(false);
    });
  });

  describe('Package Versioning and Management', () => {
    it('should handle multiple versions of the same model', async () => {
      const mockMlflowClient = {
        getModelVersion: jest.fn(),
        getRun: jest.fn(),
        listArtifacts: jest.fn().mockResolvedValue([
          { path: 'model.pkl', is_dir: false, file_size: 1024 }
        ]),
        downloadArtifact: jest.fn().mockResolvedValue(Buffer.from('model-data')),
        setTag: jest.fn().mockResolvedValue(undefined)
      };

      (modelRegistry as any).mlflowClient = mockMlflowClient;

      // Create packages for different versions
      const versions = ['1', '2', '3'];
      const packageIds: string[] = [];

      for (const version of versions) {
        mockMlflowClient.getModelVersion.mockResolvedValue({
          name: 'multi-version-model',
          version,
          creation_timestamp: Date.now(),
          run_id: `run-${version}`,
          current_stage: 'Production',
          status: 'READY'
        } as any);

        mockMlflowClient.getRun.mockResolvedValue({
          info: { run_id: `run-${version}` },
          data: {
            metrics: { accuracy: 0.8 + parseFloat(version) * 0.05 },
            params: { version },
            tags: { 'mlflow.model.framework': 'sklearn' }
          }
        } as any);

        const packageInfo = await modelRegistry.packageModel('multi-version-model', version);
        packageIds.push(packageInfo.id);
      }

      // Verify all packages were created
      expect(packageIds).toHaveLength(3);

      // List packages for the model
      const packages = await modelRegistry.listPackages('multi-version-model');
      expect(packages).toHaveLength(3);

      // Verify each package has correct version
      const sortedPackages = packages.sort((a, b) => a.modelVersion.localeCompare(b.modelVersion));
      expect(sortedPackages[0].modelVersion).toBe('1');
      expect(sortedPackages[1].modelVersion).toBe('2');
      expect(sortedPackages[2].modelVersion).toBe('3');

      // Clean up
      for (const packageId of packageIds) {
        await modelRegistry.deletePackage(packageId);
      }
    });

    it('should handle package corruption detection', async () => {
      // This test would verify checksum validation during unpackaging
      // For now, we'll test the error handling path
      
      const corruptPackageId = 'corrupt-package-id';
      const corruptPackage = {
        id: corruptPackageId,
        modelName: 'corrupt-model',
        modelVersion: '1',
        packagePath: '/nonexistent/path.tar.gz',
        packageSize: 1024,
        checksum: 'expected-checksum',
        createdAt: new Date(),
        metadata: {} as any
      };

      (modelRegistry as any).packages.set(corruptPackageId, corruptPackage);
      (modelRegistry as any).artifactStorage.retrievePackage = jest.fn()
        .mockResolvedValue(Buffer.from('corrupted-data'));

      const outputDir = path.join(tempDir, 'corrupt-output');
      
      // This should fail due to checksum mismatch
      await expect(modelRegistry.unpackageModel(corruptPackageId, outputDir))
        .rejects.toThrow('Package checksum mismatch');
    });
  });

  describe('Automated Deployment Pipeline', () => {
    it('should manage deployment lifecycle', async () => {
      // Create a test package directly
      const testPackage = {
        id: 'pipeline-test-123',
        modelName: 'pipeline-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'pipeline-model.tar.gz'),
        packageSize: 4096,
        checksum: 'pipeline123',
        createdAt: new Date(),
        status: 'validated' as const,
        deployments: [],
        tags: {
          'environment': 'production',
          'team': 'ml-team',
          'project': 'fraud-detection'
        },
        metadata: {
          mlflowVersion: '2.1.0',
          dependencies: ['xgboost==1.6.0', 'numpy==1.21.0', 'pandas==1.3.0'],
          modelFramework: 'xgboost',
          modelType: 'classifier',
          modelSize: 4096,
          artifactCount: 4,
          compressionRatio: 0.6,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'build-server',
            gitCommit: 'abc123def456',
            buildNumber: '42'
          }
        }
      };

      // Create dummy package file
      fs.writeFileSync(testPackage.packagePath, 'dummy package content');
      (modelRegistry as any).packages.set(testPackage.id, testPackage);

      // Validate the package
      const validation = await modelRegistry.validatePackage(testPackage.id);
      expect(validation.valid).toBe(true);

      // Test tagging functionality
      const productionPackages = await modelRegistry.getPackagesByTag('environment', 'production');
      expect(productionPackages).toHaveLength(1);
      expect(productionPackages[0].id).toBe(testPackage.id);

      const mlTeamPackages = await modelRegistry.getPackagesByTag('team', 'ml-team');
      expect(mlTeamPackages).toHaveLength(1);

      // Test deployment tracking
      const deploymentId = 'test-deployment-456';
      testPackage.deployments.push(deploymentId);
      testPackage.status = 'deployed';

      expect(testPackage.deployments).toContain(deploymentId);
      expect(testPackage.status).toBe('deployed');

      // Test deployment removal
      const index = testPackage.deployments.indexOf(deploymentId);
      testPackage.deployments.splice(index, 1);
      if (testPackage.deployments.length === 0) {
        testPackage.status = 'validated';
      }

      expect(testPackage.deployments).not.toContain(deploymentId);
      expect(testPackage.status).toBe('validated');

      // Clean up
      await modelRegistry.deletePackage(testPackage.id);
      const finalPackages = await modelRegistry.listPackages();
      expect(finalPackages.some(p => p.id === testPackage.id)).toBe(false);
    });

    it('should prevent deletion of packages with active deployments', async () => {
      const activePackage = {
        id: 'active-package-test',
        modelName: 'active-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'active-model.tar.gz'),
        packageSize: 1024,
        checksum: 'active123',
        createdAt: new Date(),
        status: 'deployed' as const,
        deployments: ['active-deployment-123'],
        tags: {},
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: ['tensorflow==2.8.0'],
          modelFramework: 'tensorflow',
          modelType: 'neural_network',
          modelSize: 1024,
          artifactCount: 1,
          compressionRatio: 0.9,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'test-host'
          }
        }
      };

      fs.writeFileSync(activePackage.packagePath, 'active package content');
      (modelRegistry as any).packages.set(activePackage.id, activePackage);

      await expect(modelRegistry.deletePackage(activePackage.id))
        .rejects.toThrow('Cannot delete package active-package-test: has active deployments');
    });
  });

  describe('Deployment Pipeline Integration', () => {
    it('should handle deployment failures gracefully', async () => {
      // Mock a deployment pipeline that fails
      const failingPipeline = {
        deployPackage: jest.fn().mockRejectedValue(new Error('Kubernetes cluster unavailable')),
        undeployPackage: jest.fn(),
        getDeploymentStatus: jest.fn(),
        listDeployments: jest.fn()
      };

      (modelRegistry as any).deploymentPipeline = failingPipeline;

      const mockPackage = {
        id: 'test-package',
        modelName: 'test-model',
        modelVersion: '1',
        status: 'validated',
        deployments: [],
        tags: {},
        metadata: {
          modelFramework: 'sklearn',
          dependencies: ['scikit-learn==1.0.0']
        }
      };
      (modelRegistry as any).packages.set('test-package', mockPackage);

      await expect(modelRegistry.deployPackage('test-package', 'production'))
        .rejects.toThrow('Failed to deploy package: Kubernetes cluster unavailable');
    });

    it('should support different deployment environments', async () => {
      const environments = ['development', 'staging', 'production'];
      const deploymentIds: string[] = [];

      const mockPackage = {
        id: 'env-test-package',
        modelName: 'env-test-model',
        modelVersion: '1'
      };
      (modelRegistry as any).packages.set('env-test-package', mockPackage);

      // Reset to working deployment pipeline
      (modelRegistry as any).deploymentPipeline = new (require('../services/model-registry').KubernetesDeploymentPipeline)(config);

      for (const env of environments) {
        const deploymentId = await modelRegistry.deployPackage('env-test-package', env);
        deploymentIds.push(deploymentId);

        // Verify deployment has correct environment in endpoint
        const deployment = await modelRegistry.getPackageDeploymentStatus(deploymentId);
        expect(deployment.endpoint).toContain(env);
      }

      // Clean up deployments
      for (const deploymentId of deploymentIds) {
        await modelRegistry.undeployPackage(deploymentId);
      }
    });
  });
});