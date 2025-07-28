export interface MLflowExperiment {
  experiment_id: string;
  name: string;
  artifact_location: string;
  lifecycle_stage: 'active' | 'deleted';
  creation_time: number;
  last_update_time: number;
  tags: Record<string, string>;
}

export interface MLflowRun {
  info: RunInfo;
  data: RunData;
  inputs?: RunInputs;
}

export interface RunInfo {
  run_id: string;
  run_uuid: string;
  experiment_id: string;
  user_id: string;
  status: 'RUNNING' | 'SCHEDULED' | 'FINISHED' | 'FAILED' | 'KILLED';
  start_time: number;
  end_time?: number;
  artifact_uri: string;
  lifecycle_stage: 'active' | 'deleted';
}

export interface RunData {
  metrics: Record<string, number>;
  params: Record<string, string>;
  tags: Record<string, string>;
}

export interface RunInputs {
  dataset_inputs: DatasetInput[];
}

export interface DatasetInput {
  dataset: Dataset;
  tags: DatasetTag[];
}

export interface Dataset {
  name: string;
  digest: string;
  source_type: string;
  source: string;
  schema?: string;
  profile?: string;
}

export interface DatasetTag {
  key: string;
  value: string;
}

export interface RegisteredModel {
  name: string;
  creation_timestamp: number;
  last_updated_timestamp: number;
  description?: string;
  latest_versions: ModelVersion[];
  tags: Record<string, string>;
}

export interface ModelVersion {
  name: string;
  version: string;
  creation_timestamp: number;
  last_updated_timestamp: number;
  description?: string;
  user_id: string;
  current_stage: ModelStage;
  source: string;
  run_id: string;
  status: ModelVersionStatus;
  status_message?: string;
  tags: Record<string, string>;
}

export type ModelStage = 'None' | 'Staging' | 'Production' | 'Archived';
export type ModelVersionStatus = 'PENDING_REGISTRATION' | 'FAILED_REGISTRATION' | 'READY';

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  mae?: number;
  mse?: number;
  rmse?: number;
  r2?: number;
  auc?: number;
  custom_metrics?: Record<string, number>;
}

export interface ModelArtifact {
  path: string;
  is_dir: boolean;
  file_size?: number;
}

export interface MLflowConfig {
  trackingUri: string;
  experimentName: string;
  artifactRoot: string;
  defaultModelName: string;
  registryUri?: string;
  s3EndpointUrl?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export interface TrainingJob {
  id: string;
  modelType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  runId?: string;
  experimentId: string;
  parameters: Record<string, any>;
  metrics?: ModelMetrics;
  artifacts?: string[];
  error?: string;
}

export interface ModelDeployment {
  id: string;
  modelName: string;
  modelVersion: string;
  stage: ModelStage;
  deploymentTime: Date;
  endpoint?: string;
  status: 'deploying' | 'active' | 'inactive' | 'failed';
  healthCheck?: {
    lastCheck: Date;
    status: 'healthy' | 'unhealthy';
    latency?: number;
    errorRate?: number;
  };
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  modelA: {
    name: string;
    version: string;
  };
  modelB: {
    name: string;
    version: string;
  };
  trafficSplit: {
    modelA: number; // percentage 0-100
    modelB: number; // percentage 0-100
  };
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed';
  metrics: ABTestMetrics;
}

export interface ABTestMetrics {
  totalRequests: number;
  modelARequests: number;
  modelBRequests: number;
  modelALatency: number;
  modelBLatency: number;
  modelAErrorRate: number;
  modelBErrorRate: number;
  modelAAccuracy?: number;
  modelBAccuracy?: number;
  statisticalSignificance?: number;
  winner?: 'A' | 'B' | 'inconclusive';
}

export interface ModelValidationResult {
  modelName: string;
  modelVersion: string;
  validationTime: Date;
  passed: boolean;
  metrics: ModelMetrics;
  thresholds: Record<string, number>;
  errors: string[];
  warnings: string[];
}

export interface ModelPipeline {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  schedule?: string; // cron expression
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'inactive' | 'running' | 'failed';
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'data_preparation' | 'feature_engineering' | 'training' | 'validation' | 'deployment';
  config: Record<string, any>;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}