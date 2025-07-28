import { MLflowClient } from './mlflow-client';
import { ModelRegistry } from './model-registry';
import { 
  MLflowConfig, 
  TrainingJob, 
  ModelPipeline, 
  PipelineStage,
  ModelMetrics,
  ModelValidationResult
} from '../types/mlflow-types';
import { FeatureVector } from '../types/ml-types';
import { ProductivityAnomalyDetector } from '../models/anomaly-detector';
import { CollaborativeFilteringEngine } from '../models/recommendation-engine';
import { DeliveryTimeForecaster } from '../models/time-series-forecaster';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';

export interface TrainingPipelineConfig extends MLflowConfig {
  retrainingSchedule: string; // cron expression
  validationSplitRatio: number;
  minTrainingDataSize: number;
  modelTypes: string[];
  autoDeployment: boolean;
  notificationWebhook?: string;
}

export class TrainingPipeline {
  private mlflowClient: MLflowClient;
  private modelRegistry: ModelRegistry;
  private config: TrainingPipelineConfig;
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private pipelines: Map<string, ModelPipeline> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(config: TrainingPipelineConfig, modelRegistry: ModelRegistry) {
    this.config = config;
    this.mlflowClient = new MLflowClient(config);
    this.modelRegistry = modelRegistry;
    
    this.initializePipelines();
  }

  // ============================================================================
  // TRAINING JOB MANAGEMENT
  // ============================================================================

  async createTrainingJob(
    modelType: string,
    parameters: Record<string, any>,
    trainingData: FeatureVector[],
    validationData?: FeatureVector[]
  ): Promise<TrainingJob> {
    try {
      if (trainingData.length < this.config.minTrainingDataSize) {
        throw new Error(`Insufficient training data. Need at least ${this.config.minTrainingDataSize} samples.`);
      }

      const jobId = uuidv4();
      const experimentId = await this.mlflowClient.ensureExperiment(this.config.experimentName);

      const trainingJob: TrainingJob = {
        id: jobId,
        modelType,
        status: 'pending',
        startTime: new Date(),
        experimentId,
        parameters
      };

      this.trainingJobs.set(jobId, trainingJob);

      // Start training asynchronously
      this.executeTrainingJob(trainingJob, trainingData, validationData)
        .catch(error => {
          trainingJob.status = 'failed';
          trainingJob.error = error.message;
          trainingJob.endTime = new Date();
        });

      return trainingJob;
    } catch (error) {
      throw new Error(`Failed to create training job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTrainingJob(jobId: string): Promise<TrainingJob | undefined> {
    return this.trainingJobs.get(jobId);
  }

  async listTrainingJobs(status?: TrainingJob['status']): Promise<TrainingJob[]> {
    const jobs = Array.from(this.trainingJobs.values());
    
    if (status) {
      return jobs.filter(job => job.status === status);
    }
    
    return jobs;
  }

  async cancelTrainingJob(jobId: string): Promise<void> {
    const job = this.trainingJobs.get(jobId);
    if (!job) {
      throw new Error(`Training job ${jobId} not found`);
    }

    if (job.status === 'running') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.endTime = new Date();

      // Update MLflow run if it exists
      if (job.runId) {
        await this.mlflowClient.updateRun(job.runId, 'KILLED');
      }
    }
  }

  // ============================================================================
  // AUTOMATED TRAINING EXECUTION
  // ============================================================================

  private async executeTrainingJob(
    job: TrainingJob,
    trainingData: FeatureVector[],
    validationData?: FeatureVector[]
  ): Promise<void> {
    try {
      job.status = 'running';

      // Create MLflow run
      const run = await this.mlflowClient.createRun(
        job.experimentId,
        'training-pipeline',
        {
          'job.id': job.id,
          'job.model_type': job.modelType,
          'job.start_time': job.startTime.toISOString()
        }
      );

      job.runId = run.info.run_id;

      // Log parameters
      await this.mlflowClient.logBatchParams(run.info.run_id, {
        model_type: job.modelType,
        training_data_size: trainingData.length.toString(),
        validation_data_size: validationData?.length.toString() || '0',
        ...Object.fromEntries(
          Object.entries(job.parameters).map(([k, v]) => [k, String(v)])
        )
      });

      // Split data if validation data not provided
      let trainData = trainingData;
      let valData = validationData;

      if (!valData) {
        const splitIndex = Math.floor(trainingData.length * (1 - this.config.validationSplitRatio));
        trainData = trainingData.slice(0, splitIndex);
        valData = trainingData.slice(splitIndex);
      }

      // Train model based on type
      const { model, metrics } = await this.trainModel(job.modelType, trainData, valData, job.parameters);

      // Log metrics
      await this.mlflowClient.logModelMetrics(run.info.run_id, metrics);

      // Save model artifacts (simplified - in real implementation would save actual model files)
      const modelPath = `models/${job.modelType}`;
      await this.mlflowClient.logParam(run.info.run_id, 'model_path', modelPath);

      // Register model if metrics meet thresholds
      const modelName = `${job.modelType}_model`;
      const validationResult = await this.validateTrainedModel(modelName, metrics);

      if (validationResult.passed) {
        const modelVersion = await this.modelRegistry.registerModel(
          modelName,
          run.info.run_id,
          modelPath,
          `Automatically trained ${job.modelType} model`,
          {
            'training.job_id': job.id,
            'training.automatic': 'true'
          }
        );

        job.artifacts = [modelPath];

        // Auto-promote to staging if configured
        if (this.config.autoDeployment) {
          await this.modelRegistry.promoteModel(modelName, modelVersion.version, 'Staging');
        }
      }

      // Update job status
      job.status = 'completed';
      job.endTime = new Date();
      job.metrics = metrics;

      // Update MLflow run
      await this.mlflowClient.updateRun(run.info.run_id, 'FINISHED', Date.now());

      // Send notification if configured
      if (this.config.notificationWebhook) {
        await this.sendTrainingNotification(job, validationResult);
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();

      if (job.runId) {
        await this.mlflowClient.updateRun(job.runId, 'FAILED', Date.now());
        await this.mlflowClient.setTag(job.runId, 'error', job.error);
      }

      throw error;
    }
  }

  private async trainModel(
    modelType: string,
    trainingData: FeatureVector[],
    validationData: FeatureVector[],
    parameters: Record<string, any>
  ): Promise<{ model: any; metrics: ModelMetrics }> {
    
    switch (modelType) {
      case 'anomaly_detector':
        return this.trainAnomalyDetector(trainingData, validationData, parameters);
      
      case 'recommendation_engine':
        return this.trainRecommendationEngine(trainingData, validationData, parameters);
      
      case 'time_series_forecaster':
        return this.trainTimeSeriesForecaster(trainingData, validationData, parameters);
      
      default:
        throw new Error(`Unsupported model type: ${modelType}`);
    }
  }

  private async trainAnomalyDetector(
    trainingData: FeatureVector[],
    validationData: FeatureVector[],
    parameters: Record<string, any>
  ): Promise<{ model: ProductivityAnomalyDetector; metrics: ModelMetrics }> {
    
    const detector = new ProductivityAnomalyDetector({
      numTrees: parameters.numTrees || 100,
      subsampleSize: parameters.subsampleSize || 256,
      contamination: parameters.contamination || 0.1
    });

    // Train the model
    await detector.train(trainingData);

    // Evaluate on validation data
    const anomalies = await detector.detectAnomalies(validationData);
    
    // Calculate metrics (simplified)
    const trueAnomalies = validationData.filter(f => f.features.is_anomaly === 1).length;
    const detectedAnomalies = anomalies.length;
    const truePositives = anomalies.filter(a => 
      validationData.find(f => f.userId === a.userId && f.features.is_anomaly === 1)
    ).length;

    const precision = detectedAnomalies > 0 ? truePositives / detectedAnomalies : 0;
    const recall = trueAnomalies > 0 ? truePositives / trueAnomalies : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    const metrics: ModelMetrics = {
      precision,
      recall,
      f1_score: f1Score,
      custom_metrics: {
        detected_anomalies: detectedAnomalies,
        true_anomalies: trueAnomalies,
        true_positives: truePositives
      }
    };

    return { model: detector, metrics };
  }

  private async trainRecommendationEngine(
    trainingData: FeatureVector[],
    validationData: FeatureVector[],
    parameters: Record<string, any>
  ): Promise<{ model: CollaborativeFilteringEngine; metrics: ModelMetrics }> {
    
    const engine = new CollaborativeFilteringEngine();

    // Build user profiles (simplified training)
    const userProfiles = new Map();
    for (const feature of trainingData) {
      if (!userProfiles.has(feature.userId)) {
        userProfiles.set(feature.userId, []);
      }
      userProfiles.get(feature.userId).push(feature);
    }

    // Train by building profiles for each user
    for (const [userId, features] of userProfiles.entries()) {
      await engine.buildUserProfile(userId, features, [], { id: userId } as any);
    }

    // Evaluate recommendation quality (simplified)
    let totalRecommendations = 0;
    let relevantRecommendations = 0;

    for (const feature of validationData.slice(0, 10)) { // Sample validation
      try {
        const recommendations = await engine.generateRecommendations(feature.userId);
        totalRecommendations += recommendations.length;
        relevantRecommendations += recommendations.filter(r => r.confidence > 0.7).length;
      } catch (error) {
        // User might not have enough data for recommendations
        continue;
      }
    }

    const precision = totalRecommendations > 0 ? relevantRecommendations / totalRecommendations : 0;

    const metrics: ModelMetrics = {
      precision,
      custom_metrics: {
        total_recommendations: totalRecommendations,
        relevant_recommendations: relevantRecommendations,
        user_profiles_created: userProfiles.size
      }
    };

    return { model: engine, metrics };
  }

  private async trainTimeSeriesForecaster(
    trainingData: FeatureVector[],
    validationData: FeatureVector[],
    parameters: Record<string, any>
  ): Promise<{ model: DeliveryTimeForecaster; metrics: ModelMetrics }> {
    
    const forecaster = new DeliveryTimeForecaster({
      horizonHours: parameters.horizonHours || 168,
      confidenceLevel: parameters.confidenceLevel || 0.95
    });

    // Convert features to productivity metrics for training
    const mockMetrics = trainingData.map(f => ({
      id: f.id,
      userId: f.userId,
      metricType: 'DELIVERY_TIME' as any,
      value: f.features.delivery_time || Math.random() * 100,
      timestamp: f.timestamp,
      aggregationPeriod: 'hour' as any,
      context: {}
    }));

    // Train the model
    await forecaster.trainModel(trainingData[0]?.userId || 'test_user', mockMetrics);

    // Evaluate forecasting accuracy
    const validationMetrics = validationData.map(f => ({
      id: f.id,
      userId: f.userId,
      metricType: 'DELIVERY_TIME' as any,
      value: f.features.delivery_time || Math.random() * 100,
      timestamp: f.timestamp,
      aggregationPeriod: 'hour' as any,
      context: {}
    }));

    try {
      const forecast = await forecaster.forecastDeliveryTime(
        validationData[0]?.userId || 'test_user',
        'DELIVERY_TIME'
      );

      const metrics: ModelMetrics = {
        mae: forecast.accuracy.mae,
        mse: forecast.accuracy.mse,
        r2: forecast.accuracy.r2,
        custom_metrics: {
          forecast_confidence: forecast.confidence,
          trend: forecast.trend === 'increasing' ? 1 : forecast.trend === 'decreasing' ? -1 : 0,
          seasonality_detected: forecast.seasonality.detected ? 1 : 0
        }
      };

      return { model: forecaster, metrics };
    } catch (error) {
      // Fallback metrics if forecasting fails
      const metrics: ModelMetrics = {
        mae: 0,
        mse: 0,
        r2: 0,
        custom_metrics: {
          training_error: 1
        }
      };

      return { model: forecaster, metrics };
    }
  }

  private async validateTrainedModel(modelName: string, metrics: ModelMetrics): Promise<ModelValidationResult> {
    const validationResult: ModelValidationResult = {
      modelName,
      modelVersion: 'latest',
      validationTime: new Date(),
      passed: true,
      metrics,
      thresholds: {
        precision: 0.7,
        recall: 0.6,
        f1_score: 0.65,
        mae: 10,
        mse: 100,
        r2: 0.5
      },
      errors: [],
      warnings: []
    };

    // Check thresholds
    if (metrics.precision !== undefined && metrics.precision < 0.7) {
      validationResult.errors.push(`Precision ${metrics.precision} below threshold 0.7`);
    }
    if (metrics.recall !== undefined && metrics.recall < 0.6) {
      validationResult.errors.push(`Recall ${metrics.recall} below threshold 0.6`);
    }
    if (metrics.f1_score !== undefined && metrics.f1_score < 0.65) {
      validationResult.errors.push(`F1 score ${metrics.f1_score} below threshold 0.65`);
    }
    if (metrics.mae !== undefined && metrics.mae > 10) {
      validationResult.errors.push(`MAE ${metrics.mae} above threshold 10`);
    }
    if (metrics.r2 !== undefined && metrics.r2 < 0.5) {
      validationResult.errors.push(`R² ${metrics.r2} below threshold 0.5`);
    }

    validationResult.passed = validationResult.errors.length === 0;

    return validationResult;
  }

  // ============================================================================
  // PIPELINE MANAGEMENT
  // ============================================================================

  private initializePipelines(): void {
    for (const modelType of this.config.modelTypes) {
      const pipeline: ModelPipeline = {
        id: uuidv4(),
        name: `${modelType}_training_pipeline`,
        description: `Automated training pipeline for ${modelType}`,
        stages: [
          {
            id: uuidv4(),
            name: 'data_preparation',
            type: 'data_preparation',
            config: { modelType },
            dependencies: [],
            status: 'pending'
          },
          {
            id: uuidv4(),
            name: 'feature_engineering',
            type: 'feature_engineering',
            config: { modelType },
            dependencies: ['data_preparation'],
            status: 'pending'
          },
          {
            id: uuidv4(),
            name: 'training',
            type: 'training',
            config: { modelType },
            dependencies: ['feature_engineering'],
            status: 'pending'
          },
          {
            id: uuidv4(),
            name: 'validation',
            type: 'validation',
            config: { modelType },
            dependencies: ['training'],
            status: 'pending'
          },
          {
            id: uuidv4(),
            name: 'deployment',
            type: 'deployment',
            config: { modelType },
            dependencies: ['validation'],
            status: 'pending'
          }
        ],
        schedule: this.config.retrainingSchedule,
        status: 'active'
      };

      this.pipelines.set(pipeline.id, pipeline);

      // Schedule pipeline execution
      if (pipeline.schedule) {
        const task = cron.schedule(pipeline.schedule, () => {
          this.executePipeline(pipeline.id).catch(console.error);
        }, { scheduled: false });

        this.scheduledTasks.set(pipeline.id, task);
        task.start();
      }
    }
  }

  async executePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    try {
      pipeline.status = 'running';
      pipeline.lastRun = new Date();

      // Execute stages in dependency order
      const executedStages = new Set<string>();
      
      while (executedStages.size < pipeline.stages.length) {
        const readyStages = pipeline.stages.filter(stage => 
          stage.status === 'pending' &&
          stage.dependencies.every(dep => executedStages.has(dep))
        );

        if (readyStages.length === 0) {
          throw new Error('Pipeline deadlock: no stages ready to execute');
        }

        // Execute ready stages in parallel
        await Promise.all(readyStages.map(async stage => {
          await this.executeStage(stage);
          executedStages.add(stage.name);
        }));
      }

      pipeline.status = 'active';
      pipeline.nextRun = this.calculateNextRun(pipeline.schedule);

    } catch (error) {
      pipeline.status = 'failed';
      throw error;
    }
  }

  private async executeStage(stage: PipelineStage): Promise<void> {
    try {
      stage.status = 'running';
      stage.startTime = new Date();

      // Simulate stage execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      switch (stage.type) {
        case 'data_preparation':
          // In real implementation: fetch and prepare training data
          break;
        case 'feature_engineering':
          // In real implementation: extract and normalize features
          break;
        case 'training':
          // In real implementation: trigger model training
          break;
        case 'validation':
          // In real implementation: validate trained model
          break;
        case 'deployment':
          // In real implementation: deploy validated model
          break;
      }

      stage.status = 'completed';
      stage.endTime = new Date();

    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      stage.endTime = new Date();
      throw error;
    }
  }

  private calculateNextRun(schedule?: string): Date | undefined {
    if (!schedule) return undefined;
    
    // Simple next run calculation (in real implementation, use proper cron parser)
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
  }

  // ============================================================================
  // NOTIFICATION SYSTEM
  // ============================================================================

  private async sendTrainingNotification(job: TrainingJob, validation: ModelValidationResult): Promise<void> {
    if (!this.config.notificationWebhook) return;

    const payload = {
      type: 'training_completed',
      job: {
        id: job.id,
        modelType: job.modelType,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        metrics: job.metrics
      },
      validation: {
        passed: validation.passed,
        errors: validation.errors,
        warnings: validation.warnings
      }
    };

    try {
      // In real implementation, send to webhook endpoint
      console.log('Training notification:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Failed to send training notification:', error);
    }
  }

  // ============================================================================
  // CLEANUP AND LIFECYCLE
  // ============================================================================

  async shutdown(): Promise<void> {
    // Stop all scheduled tasks
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();

    // Cancel running jobs
    const runningJobs = Array.from(this.trainingJobs.values())
      .filter(job => job.status === 'running');

    await Promise.all(runningJobs.map(job => this.cancelTrainingJob(job.id)));
  }
}