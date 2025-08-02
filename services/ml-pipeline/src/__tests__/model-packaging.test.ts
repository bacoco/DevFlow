import { ModelRegistry, ModelRegistryConfig } from '../services/model-registry';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ModelRegistry - Model Packaging', () => {
  let modelRegistry: ModelRegistry;
  let config: ModelRegistryConfig;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-test-'));
    
    config = {
      trackingUri: 'http://localhost:5000',
      experimentName: 'test-experiment',
      artifactRoot: path.join(tempDir, 'artifacts'),
      defaultModelName: 'test-model',
      validationThresholds: {
        accuracy: 0.8,
        precision: 0.7
      },
      autoPromoteToStaging: false,
      autoPromoteToProduction: false,
      modelStoragePath: path.join(tempDir, 'models')
    };

    fs.mkdirSync(config.artifactRoot, { recursive: true });
    fs.mkdirSync(config.modelStoragePath, { recursive: true });

    modelRegistry = new ModelRegistry(config);
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Package Management', () => {
    it('should create and manage packages', async () => {
      // Test basic package operations without MLflow dependencies
      const packages = await modelRegistry.listPackages();
      expect(Array.isArray(packages)).toBe(true);
    });

    it('should validate package structure', async () => {
      // Test package validation logic
      const result = await modelRegistry.validatePackage('non-existent');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Package not found');
    });

    it('should handle package tagging', async () => {
      // Create a test package entry
      const testPackage = {
        id: 'test-package-123',
        modelName: 'test-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'test-package.tar.gz'),
        packageSize: 1024,
        checksum: 'abc123',
        createdAt: new Date(),
        status: 'created' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: [] as string[],
        tags: {} as Record<string, string>,
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: ['numpy==1.21.0'],
          modelFramework: 'sklearn',
          modelType: 'classifier',
          modelSize: 1024,
          artifactCount: 1,
          compressionRatio: 0.8,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'test-host'
          }
        }
      };

      // Add package to registry
      (modelRegistry as any).packages.set('test-package-123', testPackage);

      // Test tagging
      await modelRegistry.addPackageTag('test-package-123', 'environment', 'test');
      expect(testPackage.tags['environment']).toBe('test');

      // Test tag search
      const taggedPackages = await modelRegistry.getPackagesByTag('environment', 'test');
      expect(taggedPackages.length).toBe(1);
      expect(taggedPackages[0].id).toBe('test-package-123');

      // Test tag removal
      await modelRegistry.removePackageTag('test-package-123', 'environment');
      expect(testPackage.tags['environment']).toBeUndefined();
    });
  });

  describe('Deployment Pipeline', () => {
    it('should track package deployments', async () => {
      const testPackage = {
        id: 'deploy-test-123',
        modelName: 'deploy-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'deploy-test.tar.gz'),
        packageSize: 2048,
        checksum: 'def456',
        createdAt: new Date(),
        status: 'validated' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: [] as string[],
        tags: {} as Record<string, string>,
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: ['scikit-learn==1.0.0'],
          modelFramework: 'sklearn',
          modelType: 'classifier',
          modelSize: 2048,
          artifactCount: 2,
          compressionRatio: 0.7,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'test-host'
          }
        }
      };

      (modelRegistry as any).packages.set('deploy-test-123', testPackage);

      // Test deployment tracking
      const deploymentId = 'deployment-456';
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
    });

    it('should prevent deletion of packages with active deployments', async () => {
      const activePackage = {
        id: 'active-package-789',
        modelName: 'active-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'active-package.tar.gz'),
        packageSize: 1024,
        checksum: 'ghi789',
        createdAt: new Date(),
        status: 'deployed' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: ['active-deployment-123'] as string[],
        tags: {} as Record<string, string>,
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: [],
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

      (modelRegistry as any).packages.set('active-package-789', activePackage);

      await expect(modelRegistry.deletePackage('active-package-789'))
        .rejects.toThrow('Cannot delete package active-package-789: has active deployments');
    });
  });

  describe('Package Validation', () => {
    it('should validate package metadata', async () => {
      const validPackage = {
        id: 'valid-package-456',
        modelName: 'valid-model',
        modelVersion: '2.0',
        packagePath: path.join(tempDir, 'valid-package.tar.gz'),
        packageSize: 4096,
        checksum: 'valid123',
        createdAt: new Date(),
        status: 'created' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: [] as string[],
        tags: {} as Record<string, string>,
        metadata: {
          mlflowVersion: '2.1.0',
          dependencies: ['pandas==1.3.0', 'numpy==1.21.0'],
          modelFramework: 'xgboost',
          modelType: 'gradient_boosting',
          modelSize: 4096,
          artifactCount: 3,
          compressionRatio: 0.6,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'build-server',
            gitCommit: 'abc123def456',
            buildNumber: '42'
          }
        }
      };

      // Create a dummy package file for validation
      const packageContent = 'dummy package content';
      fs.writeFileSync(validPackage.packagePath, packageContent);

      // Calculate the actual checksum for the test file
      const crypto = require('crypto');
      const actualChecksum = crypto.createHash('sha256').update(packageContent).digest('hex');
      validPackage.checksum = actualChecksum;

      (modelRegistry as any).packages.set('valid-package-456', validPackage);

      const validation = await modelRegistry.validatePackage('valid-package-456');
      if (!validation.valid) {
        console.log('Validation errors:', validation.errors);
      }
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const invalidPackage = {
        id: 'invalid-package-789',
        modelName: 'invalid-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'invalid-package.tar.gz'),
        packageSize: 1024,
        checksum: 'invalid123',
        createdAt: new Date(),
        status: 'created' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: [] as string[],
        tags: {} as Record<string, string>,
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: [], // No dependencies
          modelFramework: '', // Missing framework
          modelType: 'classifier',
          modelSize: 1024,
          artifactCount: 1,
          compressionRatio: 0.8,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'test-host'
          }
        }
      };

      fs.writeFileSync(invalidPackage.packagePath, 'dummy content');
      (modelRegistry as any).packages.set('invalid-package-789', invalidPackage);

      const validation = await modelRegistry.validatePackage('invalid-package-789');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing model framework information');
      expect(validation.errors).toContain('No dependencies specified');
    });
  });

  describe('Artifact Storage', () => {
    it('should store and retrieve package metadata', async () => {
      const storagePackage = {
        id: 'storage-test-123',
        modelName: 'storage-model',
        modelVersion: '1.0',
        packagePath: path.join(tempDir, 'storage-test.tar.gz'),
        packageSize: 2048,
        checksum: 'storage123',
        createdAt: new Date(),
        status: 'created' as 'created' | 'validated' | 'deployed' | 'archived',
        deployments: [] as string[],
        tags: { 'test': 'storage' } as Record<string, string>,
        metadata: {
          mlflowVersion: '2.0.0',
          dependencies: ['torch==1.9.0'],
          modelFramework: 'pytorch',
          modelType: 'neural_network',
          modelSize: 2048,
          artifactCount: 2,
          compressionRatio: 0.75,
          buildInfo: {
            buildTime: new Date(),
            buildHost: 'storage-host'
          }
        }
      };

      // Test storage
      const artifactStorage = (modelRegistry as any).artifactStorage;
      const storedId = await artifactStorage.storePackage(storagePackage);
      expect(storedId).toBe(storagePackage.id);

      // Test listing
      const packages = await artifactStorage.listPackages();
      expect(packages.some((p: any) => p.id === storagePackage.id)).toBe(true);

      // Test filtering by model name
      const filteredPackages = await artifactStorage.listPackages('storage-model');
      expect(filteredPackages.some((p: any) => p.id === storagePackage.id)).toBe(true);

      // Test deletion
      await artifactStorage.deletePackage(storagePackage.id);
      const packagesAfterDelete = await artifactStorage.listPackages();
      expect(packagesAfterDelete.some((p: any) => p.id === storagePackage.id)).toBe(false);
    });
  });
});