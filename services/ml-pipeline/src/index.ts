import express from 'express';
import { config } from 'dotenv';
import { MLflowClient } from './services/mlflow-client';
import { ModelRegistry } from './services/model-registry';
import { TrainingPipeline } from './services/training-pipeline';
import { ABTestingFramework } from './services/ab-testing';
import { MLflowConfig } from './types/mlflow-types';

config();

const app = express();
const PORT = process.env.PORT || 3003;

// MLflow configuration
const mlflowConfig: MLflowConfig = {
  trackingUri: process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000',
  experimentName: process.env.MLFLOW_EXPERIMENT_NAME || 'devflow_ml_pipeline',
  artifactRoot: process.env.MLFLOW_ARTIFACT_ROOT || '/tmp/mlflow-artifacts',
  defaultModelName: process.env.MLFLOW_DEFAULT_MODEL_NAME || 'devflow_model',
  registryUri: process.env.MLFLOW_REGISTRY_URI,
  s3EndpointUrl: process.env.MLFLOW_S3_ENDPOINT_URL,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

const modelRegistryConfig = {
  ...mlflowConfig,
  validationThresholds: {
    accuracy: parseFloat(process.env.MODEL_ACCURACY_THRESHOLD || '0.8'),
    precision: parseFloat(process.env.MODEL_PRECISION_THRESHOLD || '0.7'),
    recall: parseFloat(process.env.MODEL_RECALL_THRESHOLD || '0.6'),
    f1_score: parseFloat(process.env.MODEL_F1_THRESHOLD || '0.65'),
    mae: parseFloat(process.env.MODEL_MAE_THRESHOLD || '10'),
    mse: parseFloat(process.env.MODEL_MSE_THRESHOLD || '100'),
    r2: parseFloat(process.env.MODEL_R2_THRESHOLD || '0.5')
  },
  autoPromoteToStaging: process.env.AUTO_PROMOTE_STAGING === 'true',
  autoPromoteToProduction: process.env.AUTO_PROMOTE_PRODUCTION === 'true',
  modelStoragePath: process.env.MODEL_STORAGE_PATH || '/tmp/models'
};

const trainingPipelineConfig = {
  ...mlflowConfig,
  retrainingSchedule: process.env.RETRAINING_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  validationSplitRatio: parseFloat(process.env.VALIDATION_SPLIT_RATIO || '0.2'),
  minTrainingDataSize: parseInt(process.env.MIN_TRAINING_DATA_SIZE || '100'),
  modelTypes: (process.env.MODEL_TYPES || 'anomaly_detector,recommendation_engine,time_series_forecaster').split(','),
  autoDeployment: process.env.AUTO_DEPLOYMENT === 'true',
  notificationWebhook: process.env.NOTIFICATION_WEBHOOK
};

// Initialize services
let mlflowClient: MLflowClient;
let modelRegistry: ModelRegistry;
let trainingPipeline: TrainingPipeline;
let abTestingFramework: ABTestingFramework;

async function initializeServices() {
  try {
    mlflowClient = new MLflowClient(mlflowConfig);
    modelRegistry = new ModelRegistry(modelRegistryConfig);
    trainingPipeline = new TrainingPipeline(trainingPipelineConfig, modelRegistry);
    abTestingFramework = new ABTestingFramework(mlflowConfig, modelRegistry);

    console.log('MLflow services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MLflow services:', error);
    process.exit(1);
  }
}

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MLflow connection
    const experiments = await mlflowClient.listExperiments();
    
    res.status(200).json({
      service: 'ml-pipeline',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mlflow: {
        connected: true,
        experiments: experiments.length,
        trackingUri: mlflowConfig.trackingUri
      }
    });
  } catch (error) {
    res.status(503).json({
      service: 'ml-pipeline',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Intelligence ML Pipeline Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      models: '/api/models',
      training: '/api/training',
      experiments: '/api/experiments',
      abTests: '/api/ab-tests'
    }
  });
});

// ============================================================================
// MODEL REGISTRY ENDPOINTS
// ============================================================================

app.get('/api/models', async (req, res) => {
  try {
    const models = await mlflowClient.listRegisteredModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/models/:name', async (req, res) => {
  try {
    const model = await mlflowClient.getRegisteredModel(req.params.name);
    res.json(model);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Model not found' });
  }
});

app.get('/api/models/:name/versions', async (req, res) => {
  try {
    const { stage } = req.query;
    const versions = await modelRegistry.listModelVersions(
      req.params.name, 
      stage as any
    );
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/models/:name/versions/:version/promote', async (req, res) => {
  try {
    const { stage, archiveExisting } = req.body;
    const version = await modelRegistry.promoteModel(
      req.params.name,
      req.params.version,
      stage,
      archiveExisting
    );
    res.json(version);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Promotion failed' });
  }
});

app.post('/api/models/:name/versions/:version/deploy', async (req, res) => {
  try {
    const deployment = await modelRegistry.deployModel(
      req.params.name,
      req.params.version,
      req.body.config
    );
    res.json(deployment);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Deployment failed' });
  }
});

app.get('/api/deployments', async (req, res) => {
  try {
    const { modelName } = req.query;
    const deployments = await modelRegistry.listDeployments(modelName as string);
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/deployments/:id', async (req, res) => {
  try {
    await modelRegistry.undeployModel(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Undeployment failed' });
  }
});

// ============================================================================
// TRAINING PIPELINE ENDPOINTS
// ============================================================================

app.post('/api/training/jobs', async (req, res) => {
  try {
    const { modelType, parameters, trainingData, validationData } = req.body;
    const job = await trainingPipeline.createTrainingJob(
      modelType,
      parameters,
      trainingData,
      validationData
    );
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Training job creation failed' });
  }
});

app.get('/api/training/jobs', async (req, res) => {
  try {
    const { status } = req.query;
    const jobs = await trainingPipeline.listTrainingJobs(status as any);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/training/jobs/:id', async (req, res) => {
  try {
    const job = await trainingPipeline.getTrainingJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Training job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/training/jobs/:id', async (req, res) => {
  try {
    await trainingPipeline.cancelTrainingJob(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Job cancellation failed' });
  }
});

// ============================================================================
// EXPERIMENT ENDPOINTS
// ============================================================================

app.get('/api/experiments', async (req, res) => {
  try {
    const experiments = await mlflowClient.listExperiments();
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/experiments', async (req, res) => {
  try {
    const { name, artifactLocation } = req.body;
    const experimentId = await mlflowClient.createExperiment(name, artifactLocation);
    const experiment = await mlflowClient.getExperiment(experimentId);
    res.status(201).json(experiment);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Experiment creation failed' });
  }
});

app.get('/api/experiments/:id/runs', async (req, res) => {
  try {
    const { filter, maxResults } = req.query;
    const runs = await mlflowClient.searchRuns(
      [req.params.id],
      filter as string,
      maxResults ? parseInt(maxResults as string) : undefined
    );
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================================
// A/B TESTING ENDPOINTS
// ============================================================================

app.post('/api/ab-tests', async (req, res) => {
  try {
    const { name, description, modelName, versionA, versionB, trafficSplitA, durationHours } = req.body;
    const test = await abTestingFramework.createABTest(
      name,
      description,
      modelName,
      versionA,
      versionB,
      trafficSplitA,
      durationHours
    );
    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'A/B test creation failed' });
  }
});

app.get('/api/ab-tests', async (req, res) => {
  try {
    const { status } = req.query;
    const tests = await abTestingFramework.listABTests(status as any);
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/ab-tests/:id', async (req, res) => {
  try {
    const test = await abTestingFramework.getABTest(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'A/B test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/ab-tests/:id/requests', async (req, res) => {
  try {
    const response = await abTestingFramework.routeRequest(req.params.id, req.body);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request routing failed' });
  }
});

app.post('/api/ab-tests/:id/pause', async (req, res) => {
  try {
    await abTestingFramework.pauseABTest(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Test pause failed' });
  }
});

app.post('/api/ab-tests/:id/resume', async (req, res) => {
  try {
    await abTestingFramework.resumeABTest(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Test resume failed' });
  }
});

app.post('/api/ab-tests/:id/stop', async (req, res) => {
  try {
    const result = await abTestingFramework.stopABTest(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Test stop failed' });
  }
});

app.get('/api/ab-tests/:id/results', async (req, res) => {
  try {
    const result = await abTestingFramework.analyzeABTestResults(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Results analysis failed' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await trainingPipeline.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  await trainingPipeline.shutdown();
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`ML Pipeline Service running on port ${PORT}`);
    console.log(`MLflow Tracking URI: ${mlflowConfig.trackingUri}`);
    console.log(`Experiment: ${mlflowConfig.experimentName}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});