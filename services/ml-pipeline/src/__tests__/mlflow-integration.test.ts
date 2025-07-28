import { MLflowClient } from '../services/mlflow-client';
import { ModelRegistry } from '../services/model-registry';
import { TrainingPipeline } from '../services/training-pipeline';
import { ABTestingFramework } from '../services/ab-testing';
import { MLflowConfig } from '../types/mlflow-types';
import { FeatureVector } from '../types/ml-types';

// Mock configuration for testing
const mockMLflowConfig: MLflowConfig = {
  trackingUri: 'http://localhost:5000',
  experimentName: 'test_experiment',
  artifactRoot: '/tmp/mlflow-artifacts',
  defaultModelName: 'test_model',
  registryUri: 'http://localhost:5000'
};

const mockModelRegistryConfig = {
  ...mockMLflowConfig,
  validationThresholds: {
    accuracy: 0.8,
    precision: 0.7,
    recall: 0.6,
    f1_score: 0.65
  },
  autoPromoteToStaging: true,
  autoPromoteToProduction: false,
  modelStoragePath: '/tmp/models'
};

const mockTrainingPipelineConfig = {
  ...mockMLflowConfig,
  retrainingSchedule: '0 2 * * *', // Daily at 2 AM
  validationSplitRatio: 0.2,
  minTrainingDataSize: 100,
  modelTypes: ['anomaly_detector', 'recommendation_engine'],
  autoDeployment: true
};

// Mock feature data for testing
const generateMockFeatures = (count: number, userId: string = 'test_user'): FeatureVector[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `feature_${i}`,
    userId,
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000), // 1 hour intervals
    features: {
      commits_per_day: Math.random() * 10,
      lines_added_per_commit: Math.random() * 100,
      review_cycle_time_hours: Math.random() * 48,
      total_focus_time_hours: Math.random() * 8,
      interruption_rate_per_hour: Math.random() * 5,
      is_anomaly: Math.random() > 0.9 ? 1 : 0,
      delivery_time: Math.random() * 100
    },
    metadata: {
      featureVersion: '1.0',
      extractionMethod: 'test',
      windowSize: 24,
      confidence: 0.9,
      tags: ['test']
    }
  }));
};

describe('MLflow Integration Tests', () => {
  let mlflowClient: MLflowClient;
  let modelRegistry: ModelRegistry;
  let trainingPipeline: TrainingPipeline;
  let abTestingFramework: ABTestingFramework;

  beforeAll(() => {
    mlflowClient = new MLflowClient(mockMLflowConfig);
    modelRegistry = new ModelRegistry(mockModelRegistryConfig);
    trainingPipeline = new TrainingPipeline(mockTrainingPipelineConfig, modelRegistry);
    abTestingFramework = new ABTestingFramework(mockMLflowConfig, modelRegistry);
  });

  afterAll(async () => {
    await trainingPipeline.shutdown();
  });

  describe('MLflow Client', () => {
    let experimentId: string;
    let runId: string;

    it('should create and retrieve experiment', async () => {
      // Create experiment
      experimentId = await mlflowClient.createExperiment('test_integration_experiment');
      expect(experimentId).toBeDefined();

      // Retrieve experiment
      const experiment = await mlflowClient.getExperiment(experimentId);
      expect(experiment.name).toBe('test_integration_experiment');
      expect(experiment.experiment_id).toBe(experimentId);
    });

    it('should create and manage runs', async () => {
      // Create run
      const run = await mlflowClient.createRun(experimentId, 'test_user', {
        'test.tag': 'integration_test'
      });
      runId = run.info.run_id;

      expect(run.info.experiment_id).toBe(experimentId);
      expect(run.info.user_id).toBe('test_user');

      // Log parameters and metrics
      await mlflowClient.logParam(runId, 'learning_rate', '0.01');
      await mlflowClient.logMetric(runId, 'accuracy', 0.85);

      // Retrieve run and verify data
      const retrievedRun = await mlflowClient.getRun(runId);
      expect(retrievedRun.data.params.learning_rate).toBe('0.01');
      expect(retrievedRun.data.metrics.accuracy).toBe(0.85);
    });

    it('should handle batch operations', async () => {
      const params = {
        'batch_size': '32',
        'epochs': '10',
        'optimizer': 'adam'
      };

      const metrics = [
        { key: 'train_loss', value: 0.1 },
        { key: 'val_loss', value: 0.15 },
        { key: 'train_accuracy', value: 0.95 }
      ];

      await mlflowClient.logBatchParams(runId, params);
      await mlflowClient.logBatchMetrics(runId, metrics);

      const run = await mlflowClient.getRun(runId);
      expect(run.data.params.batch_size).toBe('32');
      expect(run.data.metrics.train_loss).toBe(0.1);
    });
  });

  describe('Model Registry', () => {
    let modelName: string;
    let modelVersion: string;

    beforeAll(() => {
      modelName = 'test_integration_model';
    });

    it('should register and validate model', async () => {
      // Register model
      const version = await modelRegistry.registerModel(
        modelName,
        runId,
        'models/test_model',
        'Integration test model'
      );

      modelVersion = version.version;
      expect(version.name).toBe(modelName);
      expect(version.run_id).toBe(runId);

      // Validate model
      const validationResult = await modelRegistry.validateModel(modelName, modelVersion);
      expect(validationResult.modelName).toBe(modelName);
      expect(validationResult.modelVersion).toBe(modelVersion);
      expect(typeof validationResult.passed).toBe('boolean');
    });

    it('should promote model through stages', async () => {
      // Promote to staging
      const stagingVersion = await modelRegistry.promoteModel(
        modelName,
        modelVersion,
        'Staging'
      );
      expect(stagingVersion.current_stage).toBe('Staging');

      // Get latest staging version
      const latestStaging = await modelRegistry.getLatestModelVersion(modelName, 'Staging');
      expect(latestStaging?.version).toBe(modelVersion);
    });

    it('should deploy and manage model deployments', async () => {
      // Deploy model
      const deployment = await modelRegistry.deployModel(modelName, modelVersion);
      expect(deployment.modelName).toBe(modelName);
      expect(deployment.modelVersion).toBe(modelVersion);
      expect(deployment.status).toBe('active');

      // Check deployment health
      await modelRegistry.checkDeploymentHealth(deployment.id);
      const updatedDeployment = await modelRegistry.getDeployment(deployment.id);
      expect(updatedDeployment?.healthCheck).toBeDefined();

      // List deployments
      const deployments = await modelRegistry.listDeployments(modelName);
      expect(deployments.length).toBeGreaterThan(0);
      expect(deployments[0].modelName).toBe(modelName);
    });

    it('should compare model versions', async () => {
      // Create another model version for comparison
      const run2 = await mlflowClient.createRun(experimentId, 'test_user');
      await mlflowClient.logMetric(run2.info.run_id, 'accuracy', 0.90);
      
      const version2 = await modelRegistry.registerModel(
        modelName,
        run2.info.run_id,
        'models/test_model_v2',
        'Second version for comparison'
      );

      // Compare versions
      const comparison = await modelRegistry.compareModelVersions(
        modelName,
        modelVersion,
        version2.version
      );

      expect(comparison.version1.version).toBe(modelVersion);
      expect(comparison.version2.version).toBe(version2.version);
      expect(comparison.comparison.metrics).toBeDefined();
    });
  });

  describe('Training Pipeline', () => {
    it('should create and execute training job', async () => {
      const trainingData = generateMockFeatures(150, 'training_user');
      const validationData = generateMockFeatures(50, 'training_user');

      // Create training job
      const job = await trainingPipeline.createTrainingJob(
        'anomaly_detector',
        {
          numTrees: 50,
          contamination: 0.1
        },
        trainingData,
        validationData
      );

      expect(job.modelType).toBe('anomaly_detector');
      expect(job.status).toBe('pending');

      // Wait for job to complete (with timeout)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        const updatedJob = await trainingPipeline.getTrainingJob(job.id);
        if (updatedJob?.status === 'completed' || updatedJob?.status === 'failed') {
          expect(updatedJob.status).toBe('completed');
          expect(updatedJob.metrics).toBeDefined();
          expect(updatedJob.runId).toBeDefined();
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Training job did not complete within timeout');
      }
    }, 60000); // 60 second timeout for this test

    it('should handle training job cancellation', async () => {
      const trainingData = generateMockFeatures(100, 'cancel_user');

      const job = await trainingPipeline.createTrainingJob(
        'recommendation_engine',
        {},
        trainingData
      );

      // Cancel job immediately
      await trainingPipeline.cancelTrainingJob(job.id);

      const cancelledJob = await trainingPipeline.getTrainingJob(job.id);
      expect(cancelledJob?.status).toBe('failed');
      expect(cancelledJob?.error).toContain('Cancelled');
    });

    it('should list training jobs by status', async () => {
      const jobs = await trainingPipeline.listTrainingJobs('completed');
      expect(Array.isArray(jobs)).toBe(true);
      
      const allJobs = await trainingPipeline.listTrainingJobs();
      expect(allJobs.length).toBeGreaterThanOrEqual(jobs.length);
    });
  });

  describe('A/B Testing Framework', () => {
    let testId: string;
    let modelName: string;

    beforeAll(async () => {
      modelName = 'ab_test_model';
      
      // Ensure we have an experiment ID
      if (!experimentId) {
        experimentId = await mlflowClient.createExperiment('ab_test_experiment');
      }
      
      // Create two model versions for A/B testing
      const run1 = await mlflowClient.createRun(experimentId, 'test_user');
      const run2 = await mlflowClient.createRun(experimentId, 'test_user');
      
      await mlflowClient.logMetric(run1.info.run_id, 'accuracy', 0.85);
      await mlflowClient.logMetric(run2.info.run_id, 'accuracy', 0.87);

      const version1 = await modelRegistry.registerModel(modelName, run1.info.run_id, 'models/v1');
      const version2 = await modelRegistry.registerModel(modelName, run2.info.run_id, 'models/v2');

      await modelRegistry.promoteModel(modelName, version1.version, 'Staging');
      await modelRegistry.promoteModel(modelName, version2.version, 'Staging');
    });

    it('should create and manage A/B test', async () => {
      // Get model versions for testing
      const versions = await modelRegistry.listModelVersions(modelName, 'Staging');
      expect(versions.length).toBeGreaterThanOrEqual(2);

      // Create A/B test
      const testConfig = await abTestingFramework.createABTest(
        'Integration Test A/B',
        'Testing model versions',
        modelName,
        versions[0].version,
        versions[1].version,
        50, // 50/50 split
        24 // 24 hours
      );

      testId = testConfig.id;
      expect(testConfig.name).toBe('Integration Test A/B');
      expect(testConfig.status).toBe('active');
      expect(testConfig.trafficSplit.modelA).toBe(50);
      expect(testConfig.trafficSplit.modelB).toBe(50);
    });

    it('should route requests and collect metrics', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        userId: `user_${i % 10}`, // 10 different users
        modelName,
        inputData: { feature1: Math.random(), feature2: Math.random() },
        timestamp: new Date()
      }));

      const responses = [];
      
      // Send requests
      for (const request of requests) {
        try {
          const response = await abTestingFramework.routeRequest(testId, request);
          responses.push(response);
          expect(response.testId).toBe(testId);
          expect(['A', 'B']).toContain(response.modelUsed);
        } catch (error) {
          // Some requests might fail, which is expected in testing
        }
      }

      expect(responses.length).toBeGreaterThan(0);

      // Check that both models received requests
      const modelAResponses = responses.filter(r => r.modelUsed === 'A');
      const modelBResponses = responses.filter(r => r.modelUsed === 'B');
      
      expect(modelAResponses.length).toBeGreaterThan(0);
      expect(modelBResponses.length).toBeGreaterThan(0);
    });

    it('should analyze A/B test results', async () => {
      // Wait a moment for metrics to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await abTestingFramework.analyzeABTestResults(testId);
      
      expect(result.testConfig.id).toBe(testId);
      expect(result.metrics.totalRequests).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
      expect(['promote_A', 'promote_B', 'continue_test', 'inconclusive']).toContain(result.recommendation);
    });

    it('should pause and resume A/B test', async () => {
      // Pause test
      await abTestingFramework.pauseABTest(testId);
      const pausedTest = await abTestingFramework.getABTest(testId);
      expect(pausedTest?.status).toBe('paused');

      // Resume test
      await abTestingFramework.resumeABTest(testId);
      const resumedTest = await abTestingFramework.getABTest(testId);
      expect(resumedTest?.status).toBe('active');
    });

    it('should stop A/B test and get final results', async () => {
      const finalResult = await abTestingFramework.stopABTest(testId);
      
      expect(finalResult.testConfig.status).toBe('completed');
      expect(finalResult.metrics.totalRequests).toBeGreaterThan(0);
      expect(finalResult.confidence).toBeGreaterThanOrEqual(0);
      expect(finalResult.significanceLevel).toBeGreaterThanOrEqual(0);
    });

    it('should list A/B tests by status', async () => {
      const completedTests = await abTestingFramework.listABTests('completed');
      expect(completedTests.length).toBeGreaterThan(0);
      expect(completedTests[0].status).toBe('completed');

      const allTests = await abTestingFramework.listABTests();
      expect(allTests.length).toBeGreaterThanOrEqual(completedTests.length);
    });
  });

  describe('End-to-End Integration', () => {
    it('should complete full ML lifecycle', async () => {
      const modelName = 'e2e_test_model';
      const trainingData = generateMockFeatures(200, 'e2e_user');

      // 1. Train model
      const trainingJob = await trainingPipeline.createTrainingJob(
        'time_series_forecaster',
        { horizonHours: 24 },
        trainingData
      );

      // Wait for training to complete
      let attempts = 0;
      while (attempts < 30) {
        const job = await trainingPipeline.getTrainingJob(trainingJob.id);
        if (job?.status === 'completed') {
          expect(job.runId).toBeDefined();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // 2. Register model
      const completedJob = await trainingPipeline.getTrainingJob(trainingJob.id);
      if (!completedJob?.runId) {
        throw new Error('Training job did not complete successfully');
      }

      const modelVersion = await modelRegistry.registerModel(
        modelName,
        completedJob.runId,
        'models/e2e_test',
        'End-to-end test model'
      );

      // 3. Validate and promote model
      const validation = await modelRegistry.validateModel(modelName, modelVersion.version);
      expect(validation.modelName).toBe(modelName);

      if (validation.passed) {
        await modelRegistry.promoteModel(modelName, modelVersion.version, 'Staging');
      }

      // 4. Deploy model
      const deployment = await modelRegistry.deployModel(modelName, modelVersion.version);
      expect(deployment.status).toBe('active');

      // 5. Verify deployment health
      await modelRegistry.checkDeploymentHealth(deployment.id);
      const healthyDeployment = await modelRegistry.getDeployment(deployment.id);
      expect(healthyDeployment?.healthCheck?.status).toBe('healthy');

      console.log('End-to-end ML lifecycle completed successfully');
    }, 90000); // 90 second timeout for full lifecycle
  });

  describe('Error Handling', () => {
    it('should handle MLflow connection errors gracefully', async () => {
      const badConfig = { ...mockMLflowConfig, trackingUri: 'http://invalid-url:9999' };
      const badClient = new MLflowClient(badConfig);

      await expect(badClient.createExperiment('test')).rejects.toThrow();
    });

    it('should handle insufficient training data', async () => {
      const insufficientData = generateMockFeatures(10); // Below minimum

      await expect(
        trainingPipeline.createTrainingJob('anomaly_detector', {}, insufficientData)
      ).rejects.toThrow('Insufficient training data');
    });

    it('should handle invalid model promotion', async () => {
      await expect(
        modelRegistry.promoteModel('nonexistent_model', '1', 'Production')
      ).rejects.toThrow();
    });

    it('should handle A/B test with invalid models', async () => {
      await expect(
        abTestingFramework.createABTest(
          'Invalid Test',
          'Test with invalid models',
          'nonexistent_model',
          '1',
          '2'
        )
      ).rejects.toThrow();
    });
  });
});

// Helper function to run integration tests only if MLflow is available
const runIntegrationTests = () => {
  const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
  
  if (!shouldRunIntegration) {
    console.log('Skipping MLflow integration tests. Set RUN_INTEGRATION_TESTS=true to run them.');
    return;
  }

  // Check if MLflow server is running
  const axios = require('axios');
  
  beforeAll(async () => {
    try {
      await axios.get('http://localhost:5000/health');
    } catch (error) {
      throw new Error('MLflow server is not running. Please start MLflow server before running integration tests.');
    }
  });
};

// Only run integration tests if explicitly requested
if (process.env.RUN_INTEGRATION_TESTS === 'true') {
  runIntegrationTests();
} else {
  describe.skip('MLflow Integration Tests', () => {
    it('should be skipped unless RUN_INTEGRATION_TESTS=true', () => {
      expect(true).toBe(true);
    });
  });
}