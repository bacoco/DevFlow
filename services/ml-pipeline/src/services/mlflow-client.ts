import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { 
  MLflowConfig, 
  MLflowExperiment, 
  MLflowRun, 
  RegisteredModel, 
  ModelVersion, 
  ModelStage,
  ModelMetrics,
  ModelArtifact
} from '../types/mlflow-types';

export class MLflowClient {
  private client: AxiosInstance;
  private config: MLflowConfig;

  constructor(config: MLflowConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.trackingUri,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up AWS credentials if provided
    if (config.awsAccessKeyId && config.awsSecretAccessKey) {
      process.env.AWS_ACCESS_KEY_ID = config.awsAccessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = config.awsSecretAccessKey;
    }

    if (config.s3EndpointUrl) {
      process.env.MLFLOW_S3_ENDPOINT_URL = config.s3EndpointUrl;
    }
  }

  // ============================================================================
  // EXPERIMENT MANAGEMENT
  // ============================================================================

  async createExperiment(name: string, artifactLocation?: string): Promise<string> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/experiments/create', {
        name,
        artifact_location: artifactLocation || this.config.artifactRoot
      });
      return response.data.experiment_id;
    } catch (error) {
      throw new Error(`Failed to create experiment: ${this.getErrorMessage(error)}`);
    }
  }

  async getExperiment(experimentId: string): Promise<MLflowExperiment> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/experiments/get', {
        params: { experiment_id: experimentId }
      });
      return response.data.experiment;
    } catch (error) {
      throw new Error(`Failed to get experiment: ${this.getErrorMessage(error)}`);
    }
  }

  async getExperimentByName(name: string): Promise<MLflowExperiment | null> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/experiments/get-by-name', {
        params: { experiment_name: name }
      });
      return response.data.experiment;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to get experiment by name: ${this.getErrorMessage(error)}`);
    }
  }

  async listExperiments(): Promise<MLflowExperiment[]> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/experiments/list');
      return response.data.experiments || [];
    } catch (error) {
      throw new Error(`Failed to list experiments: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // RUN MANAGEMENT
  // ============================================================================

  async createRun(experimentId: string, userId?: string, tags?: Record<string, string>): Promise<MLflowRun> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/runs/create', {
        experiment_id: experimentId,
        user_id: userId,
        tags: tags ? Object.entries(tags).map(([key, value]) => ({ key, value })) : undefined
      });
      return response.data.run;
    } catch (error) {
      throw new Error(`Failed to create run: ${this.getErrorMessage(error)}`);
    }
  }

  async getRun(runId: string): Promise<MLflowRun> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/runs/get', {
        params: { run_id: runId }
      });
      return response.data.run;
    } catch (error) {
      throw new Error(`Failed to get run: ${this.getErrorMessage(error)}`);
    }
  }

  async updateRun(runId: string, status?: string, endTime?: number): Promise<void> {
    try {
      await this.client.post('/api/2.0/mlflow/runs/update', {
        run_id: runId,
        status,
        end_time: endTime
      });
    } catch (error) {
      throw new Error(`Failed to update run: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteRun(runId: string): Promise<void> {
    try {
      await this.client.post('/api/2.0/mlflow/runs/delete', {
        run_id: runId
      });
    } catch (error) {
      throw new Error(`Failed to delete run: ${this.getErrorMessage(error)}`);
    }
  }

  async searchRuns(experimentIds: string[], filter?: string, maxResults?: number): Promise<MLflowRun[]> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/runs/search', {
        experiment_ids: experimentIds,
        filter,
        max_results: maxResults || 1000
      });
      return response.data.runs || [];
    } catch (error) {
      throw new Error(`Failed to search runs: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // METRICS AND PARAMETERS
  // ============================================================================

  async logMetric(runId: string, key: string, value: number, timestamp?: number, step?: number): Promise<void> {
    try {
      await this.client.post('/api/2.0/mlflow/runs/log-metric', {
        run_id: runId,
        key,
        value,
        timestamp: timestamp || Date.now(),
        step: step || 0
      });
    } catch (error) {
      throw new Error(`Failed to log metric: ${this.getErrorMessage(error)}`);
    }
  }

  async logBatchMetrics(runId: string, metrics: Array<{ key: string; value: number; timestamp?: number; step?: number }>): Promise<void> {
    try {
      const formattedMetrics = metrics.map(metric => ({
        key: metric.key,
        value: metric.value,
        timestamp: metric.timestamp || Date.now(),
        step: metric.step || 0
      }));

      await this.client.post('/api/2.0/mlflow/runs/log-batch', {
        run_id: runId,
        metrics: formattedMetrics
      });
    } catch (error) {
      throw new Error(`Failed to log batch metrics: ${this.getErrorMessage(error)}`);
    }
  }

  async logParam(runId: string, key: string, value: string): Promise<void> {
    try {
      await this.client.post('/api/2.0/mlflow/runs/log-parameter', {
        run_id: runId,
        key,
        value
      });
    } catch (error) {
      throw new Error(`Failed to log parameter: ${this.getErrorMessage(error)}`);
    }
  }

  async logBatchParams(runId: string, params: Record<string, string>): Promise<void> {
    try {
      const formattedParams = Object.entries(params).map(([key, value]) => ({ key, value }));

      await this.client.post('/api/2.0/mlflow/runs/log-batch', {
        run_id: runId,
        params: formattedParams
      });
    } catch (error) {
      throw new Error(`Failed to log batch parameters: ${this.getErrorMessage(error)}`);
    }
  }

  async setTag(runId: string, key: string, value: string): Promise<void> {
    try {
      await this.client.post('/api/2.0/mlflow/runs/set-tag', {
        run_id: runId,
        key,
        value
      });
    } catch (error) {
      throw new Error(`Failed to set tag: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // ARTIFACT MANAGEMENT
  // ============================================================================

  async logArtifact(runId: string, localPath: string, artifactPath?: string): Promise<void> {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(localPath));
      
      const url = `/api/2.0/mlflow/artifacts/upload`;
      const params = new URLSearchParams({
        run_id: runId,
        path: artifactPath || path.basename(localPath)
      });

      await this.client.post(`${url}?${params}`, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw new Error(`Failed to log artifact: ${this.getErrorMessage(error)}`);
    }
  }

  async listArtifacts(runId: string, path?: string): Promise<ModelArtifact[]> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/artifacts/list', {
        params: {
          run_id: runId,
          path
        }
      });
      return response.data.files || [];
    } catch (error) {
      throw new Error(`Failed to list artifacts: ${this.getErrorMessage(error)}`);
    }
  }

  async downloadArtifact(runId: string, path: string): Promise<Buffer> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/artifacts/get', {
        params: {
          run_id: runId,
          path
        },
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download artifact: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // MODEL REGISTRY
  // ============================================================================

  async createRegisteredModel(name: string, description?: string, tags?: Record<string, string>): Promise<RegisteredModel> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/registered-models/create', {
        name,
        description,
        tags: tags ? Object.entries(tags).map(([key, value]) => ({ key, value })) : undefined
      });
      return response.data.registered_model;
    } catch (error) {
      throw new Error(`Failed to create registered model: ${this.getErrorMessage(error)}`);
    }
  }

  async getRegisteredModel(name: string): Promise<RegisteredModel> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/registered-models/get', {
        params: { name }
      });
      return response.data.registered_model;
    } catch (error) {
      throw new Error(`Failed to get registered model: ${this.getErrorMessage(error)}`);
    }
  }

  async listRegisteredModels(): Promise<RegisteredModel[]> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/registered-models/list');
      return response.data.registered_models || [];
    } catch (error) {
      throw new Error(`Failed to list registered models: ${this.getErrorMessage(error)}`);
    }
  }

  async updateRegisteredModel(name: string, description?: string): Promise<RegisteredModel> {
    try {
      const response = await this.client.patch('/api/2.0/mlflow/registered-models/update', {
        name,
        description
      });
      return response.data.registered_model;
    } catch (error) {
      throw new Error(`Failed to update registered model: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteRegisteredModel(name: string): Promise<void> {
    try {
      await this.client.delete('/api/2.0/mlflow/registered-models/delete', {
        data: { name }
      });
    } catch (error) {
      throw new Error(`Failed to delete registered model: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // MODEL VERSIONS
  // ============================================================================

  async createModelVersion(name: string, source: string, runId?: string, description?: string): Promise<ModelVersion> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/model-versions/create', {
        name,
        source,
        run_id: runId,
        description
      });
      return response.data.model_version;
    } catch (error) {
      throw new Error(`Failed to create model version: ${this.getErrorMessage(error)}`);
    }
  }

  async getModelVersion(name: string, version: string): Promise<ModelVersion> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/model-versions/get', {
        params: { name, version }
      });
      return response.data.model_version;
    } catch (error) {
      throw new Error(`Failed to get model version: ${this.getErrorMessage(error)}`);
    }
  }

  async updateModelVersion(name: string, version: string, description?: string): Promise<ModelVersion> {
    try {
      const response = await this.client.patch('/api/2.0/mlflow/model-versions/update', {
        name,
        version,
        description
      });
      return response.data.model_version;
    } catch (error) {
      throw new Error(`Failed to update model version: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteModelVersion(name: string, version: string): Promise<void> {
    try {
      await this.client.delete('/api/2.0/mlflow/model-versions/delete', {
        data: { name, version }
      });
    } catch (error) {
      throw new Error(`Failed to delete model version: ${this.getErrorMessage(error)}`);
    }
  }

  async transitionModelVersionStage(name: string, version: string, stage: ModelStage, archiveExistingVersions?: boolean): Promise<ModelVersion> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/model-versions/transition-stage', {
        name,
        version,
        stage,
        archive_existing_versions: archiveExistingVersions || false
      });
      return response.data.model_version;
    } catch (error) {
      throw new Error(`Failed to transition model version stage: ${this.getErrorMessage(error)}`);
    }
  }

  async getLatestModelVersions(name: string, stages?: ModelStage[]): Promise<ModelVersion[]> {
    try {
      const response = await this.client.post('/api/2.0/mlflow/registered-models/get-latest-versions', {
        name,
        stages
      });
      return response.data.model_versions || [];
    } catch (error) {
      throw new Error(`Failed to get latest model versions: ${this.getErrorMessage(error)}`);
    }
  }

  async searchModelVersions(filter?: string, maxResults?: number): Promise<ModelVersion[]> {
    try {
      const response = await this.client.get('/api/2.0/mlflow/model-versions/search', {
        params: {
          filter,
          max_results: maxResults || 1000
        }
      });
      return response.data.model_versions || [];
    } catch (error) {
      throw new Error(`Failed to search model versions: ${this.getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async ensureExperiment(name: string): Promise<string> {
    let experiment = await this.getExperimentByName(name);
    
    if (!experiment) {
      const experimentId = await this.createExperiment(name);
      experiment = await this.getExperiment(experimentId);
    }
    
    return experiment.experiment_id;
  }

  async ensureRegisteredModel(name: string, description?: string): Promise<RegisteredModel> {
    try {
      return await this.getRegisteredModel(name);
    } catch (error) {
      // Model doesn't exist, create it
      return await this.createRegisteredModel(name, description);
    }
  }

  async logModelMetrics(runId: string, metrics: ModelMetrics): Promise<void> {
    const metricEntries: Array<{ key: string; value: number }> = [];

    if (metrics.accuracy !== undefined) metricEntries.push({ key: 'accuracy', value: metrics.accuracy });
    if (metrics.precision !== undefined) metricEntries.push({ key: 'precision', value: metrics.precision });
    if (metrics.recall !== undefined) metricEntries.push({ key: 'recall', value: metrics.recall });
    if (metrics.f1_score !== undefined) metricEntries.push({ key: 'f1_score', value: metrics.f1_score });
    if (metrics.mae !== undefined) metricEntries.push({ key: 'mae', value: metrics.mae });
    if (metrics.mse !== undefined) metricEntries.push({ key: 'mse', value: metrics.mse });
    if (metrics.rmse !== undefined) metricEntries.push({ key: 'rmse', value: metrics.rmse });
    if (metrics.r2 !== undefined) metricEntries.push({ key: 'r2', value: metrics.r2 });
    if (metrics.auc !== undefined) metricEntries.push({ key: 'auc', value: metrics.auc });

    if (metrics.custom_metrics) {
      for (const [key, value] of Object.entries(metrics.custom_metrics)) {
        metricEntries.push({ key: `custom_${key}`, value });
      }
    }

    if (metricEntries.length > 0) {
      await this.logBatchMetrics(runId, metricEntries);
    }
  }

  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }
}