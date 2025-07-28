import { ModelRegistry } from './model-registry';
import { MLflowClient } from './mlflow-client';
import { 
  ABTestConfig, 
  ABTestMetrics, 
  ModelVersion,
  MLflowConfig
} from '../types/mlflow-types';
import { v4 as uuidv4 } from 'uuid';

export interface ABTestRequest {
  userId: string;
  modelName: string;
  inputData: any;
  timestamp: Date;
}

export interface ABTestResponse {
  testId: string;
  modelUsed: 'A' | 'B';
  modelVersion: string;
  prediction: any;
  latency: number;
  timestamp: Date;
}

export interface ABTestResult {
  testConfig: ABTestConfig;
  metrics: ABTestMetrics;
  recommendation: 'promote_A' | 'promote_B' | 'continue_test' | 'inconclusive';
  confidence: number;
  significanceLevel: number;
}

export class ABTestingFramework {
  private modelRegistry: ModelRegistry;
  private mlflowClient: MLflowClient;
  private activeTests: Map<string, ABTestConfig> = new Map();
  private testMetrics: Map<string, ABTestMetrics> = new Map();
  private testResponses: Map<string, ABTestResponse[]> = new Map();

  constructor(config: MLflowConfig, modelRegistry: ModelRegistry) {
    this.mlflowClient = new MLflowClient(config);
    this.modelRegistry = modelRegistry;
  }

  // ============================================================================
  // A/B TEST MANAGEMENT
  // ============================================================================

  async createABTest(
    name: string,
    description: string,
    modelName: string,
    versionA: string,
    versionB: string,
    trafficSplitA: number = 50,
    durationHours?: number
  ): Promise<ABTestConfig> {
    try {
      // Validate model versions exist
      const [modelA, modelB] = await Promise.all([
        this.modelRegistry.getModelVersion(modelName, versionA),
        this.modelRegistry.getModelVersion(modelName, versionB)
      ]);

      if (trafficSplitA < 0 || trafficSplitA > 100) {
        throw new Error('Traffic split must be between 0 and 100');
      }

      const testId = uuidv4();
      const startTime = new Date();
      const endTime = durationHours ? 
        new Date(startTime.getTime() + durationHours * 60 * 60 * 1000) : 
        undefined;

      const testConfig: ABTestConfig = {
        id: testId,
        name,
        description,
        modelA: {
          name: modelName,
          version: versionA
        },
        modelB: {
          name: modelName,
          version: versionB
        },
        trafficSplit: {
          modelA: trafficSplitA,
          modelB: 100 - trafficSplitA
        },
        startTime,
        endTime,
        status: 'active',
        metrics: {
          totalRequests: 0,
          modelARequests: 0,
          modelBRequests: 0,
          modelALatency: 0,
          modelBLatency: 0,
          modelAErrorRate: 0,
          modelBErrorRate: 0
        }
      };

      this.activeTests.set(testId, testConfig);
      this.testMetrics.set(testId, testConfig.metrics);
      this.testResponses.set(testId, []);

      // Log A/B test creation in MLflow
      await this.logABTestEvent(testConfig, 'test_created', {
        model_a_version: versionA,
        model_b_version: versionB,
        traffic_split_a: trafficSplitA.toString(),
        duration_hours: durationHours?.toString() || 'unlimited'
      });

      return testConfig;
    } catch (error) {
      throw new Error(`Failed to create A/B test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getABTest(testId: string): Promise<ABTestConfig | undefined> {
    return this.activeTests.get(testId);
  }

  async listABTests(status?: ABTestConfig['status']): Promise<ABTestConfig[]> {
    const tests = Array.from(this.activeTests.values());
    
    if (status) {
      return tests.filter(test => test.status === status);
    }
    
    return tests;
  }

  async pauseABTest(testId: string): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    test.status = 'paused';
    
    await this.logABTestEvent(test, 'test_paused');
  }

  async resumeABTest(testId: string): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    test.status = 'active';
    
    await this.logABTestEvent(test, 'test_resumed');
  }

  async stopABTest(testId: string): Promise<ABTestResult> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    test.status = 'completed';
    test.endTime = new Date();

    const result = await this.analyzeABTestResults(testId);
    
    await this.logABTestEvent(test, 'test_completed', {
      recommendation: result.recommendation,
      confidence: result.confidence.toString(),
      significance_level: result.significanceLevel.toString()
    });

    return result;
  }

  // ============================================================================
  // REQUEST ROUTING
  // ============================================================================

  async routeRequest(testId: string, request: ABTestRequest): Promise<ABTestResponse> {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'active') {
      throw new Error(`A/B test ${testId} is not active`);
    }

    // Check if test has expired
    if (test.endTime && new Date() > test.endTime) {
      test.status = 'completed';
      throw new Error(`A/B test ${testId} has expired`);
    }

    const startTime = Date.now();
    
    // Determine which model to use based on traffic split and user hash
    const modelToUse = this.selectModel(request.userId, test.trafficSplit);
    const modelVersion = modelToUse === 'A' ? test.modelA.version : test.modelB.version;

    try {
      // Simulate model prediction (in real implementation, call actual model)
      const prediction = await this.simulateModelPrediction(
        test.modelA.name,
        modelVersion,
        request.inputData
      );

      const latency = Date.now() - startTime;

      const response: ABTestResponse = {
        testId,
        modelUsed: modelToUse,
        modelVersion,
        prediction,
        latency,
        timestamp: new Date()
      };

      // Update metrics
      await this.updateTestMetrics(testId, response, false);

      // Store response for analysis
      const responses = this.testResponses.get(testId) || [];
      responses.push(response);
      this.testResponses.set(testId, responses);

      return response;

    } catch (error) {
      const latency = Date.now() - startTime;

      const response: ABTestResponse = {
        testId,
        modelUsed: modelToUse,
        modelVersion,
        prediction: null,
        latency,
        timestamp: new Date()
      };

      // Update metrics with error
      await this.updateTestMetrics(testId, response, true);

      throw error;
    }
  }

  private selectModel(userId: string, trafficSplit: { modelA: number; modelB: number }): 'A' | 'B' {
    // Use consistent hashing to ensure same user always gets same model
    const hash = this.hashUserId(userId);
    const threshold = trafficSplit.modelA / 100;
    
    return hash < threshold ? 'A' : 'B';
  }

  private hashUserId(userId: string): number {
    // Simple hash function for consistent user assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private async simulateModelPrediction(modelName: string, version: string, inputData: any): Promise<any> {
    // Simulate model prediction latency and response
    const baseLatency = Math.random() * 50 + 10; // 10-60ms
    await new Promise(resolve => setTimeout(resolve, baseLatency));

    // Simulate different model performance
    const isModelA = version.includes('A') || Math.random() > 0.5;
    
    if (modelName.includes('anomaly')) {
      return {
        isAnomaly: Math.random() > (isModelA ? 0.8 : 0.85),
        confidence: Math.random() * 0.3 + (isModelA ? 0.7 : 0.75),
        anomalyType: 'productivity_drop'
      };
    } else if (modelName.includes('recommendation')) {
      return {
        recommendations: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
          id: `rec_${i}`,
          type: 'productivity_improvement',
          confidence: Math.random() * 0.3 + (isModelA ? 0.6 : 0.65)
        }))
      };
    } else if (modelName.includes('forecaster')) {
      return {
        prediction: Math.random() * 100 + (isModelA ? 50 : 45),
        confidence: Math.random() * 0.2 + (isModelA ? 0.7 : 0.75),
        trend: Math.random() > 0.5 ? 'increasing' : 'stable'
      };
    }

    return { value: Math.random() };
  }

  // ============================================================================
  // METRICS AND ANALYSIS
  // ============================================================================

  private async updateTestMetrics(testId: string, response: ABTestResponse, isError: boolean): Promise<void> {
    const metrics = this.testMetrics.get(testId);
    if (!metrics) return;

    metrics.totalRequests++;

    if (response.modelUsed === 'A') {
      metrics.modelARequests++;
      metrics.modelALatency = this.updateRunningAverage(
        metrics.modelALatency,
        response.latency,
        metrics.modelARequests
      );
      
      if (isError) {
        metrics.modelAErrorRate = this.updateErrorRate(metrics.modelAErrorRate, metrics.modelARequests, true);
      }
    } else {
      metrics.modelBRequests++;
      metrics.modelBLatency = this.updateRunningAverage(
        metrics.modelBLatency,
        response.latency,
        metrics.modelBRequests
      );
      
      if (isError) {
        metrics.modelBErrorRate = this.updateErrorRate(metrics.modelBErrorRate, metrics.modelBRequests, true);
      }
    }
  }

  private updateRunningAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  private updateErrorRate(currentRate: number, totalRequests: number, isError: boolean): number {
    const currentErrors = currentRate * (totalRequests - 1);
    const newErrors = currentErrors + (isError ? 1 : 0);
    return newErrors / totalRequests;
  }

  async analyzeABTestResults(testId: string): Promise<ABTestResult> {
    const test = this.activeTests.get(testId);
    const metrics = this.testMetrics.get(testId);
    const responses = this.testResponses.get(testId) || [];

    if (!test || !metrics) {
      throw new Error(`A/B test ${testId} not found`);
    }

    // Calculate statistical significance
    const significanceResult = this.calculateStatisticalSignificance(responses);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(metrics, significanceResult);

    const result: ABTestResult = {
      testConfig: test,
      metrics: {
        ...metrics,
        statisticalSignificance: significanceResult.pValue,
        winner: significanceResult.winner
      },
      recommendation,
      confidence: significanceResult.confidence,
      significanceLevel: significanceResult.pValue
    };

    return result;
  }

  private calculateStatisticalSignificance(responses: ABTestResponse[]): {
    pValue: number;
    confidence: number;
    winner: 'A' | 'B' | 'inconclusive';
  } {
    const modelAResponses = responses.filter(r => r.modelUsed === 'A');
    const modelBResponses = responses.filter(r => r.modelUsed === 'B');

    if (modelAResponses.length < 30 || modelBResponses.length < 30) {
      return { pValue: 1, confidence: 0, winner: 'inconclusive' };
    }

    // Calculate success rates (simplified - in real implementation use proper metrics)
    const modelASuccessRate = modelAResponses.filter(r => r.prediction !== null).length / modelAResponses.length;
    const modelBSuccessRate = modelBResponses.filter(r => r.prediction !== null).length / modelBResponses.length;

    // Simplified statistical test (in real implementation, use proper statistical tests)
    const difference = Math.abs(modelASuccessRate - modelBSuccessRate);
    const pooledRate = (modelASuccessRate + modelBSuccessRate) / 2;
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/modelAResponses.length + 1/modelBResponses.length));
    
    const zScore = difference / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore))); // Two-tailed test

    const confidence = 1 - pValue;
    const winner = pValue < 0.05 ? 
      (modelASuccessRate > modelBSuccessRate ? 'A' : 'B') : 
      'inconclusive';

    return { pValue, confidence, winner };
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private determineRecommendation(
    metrics: ABTestMetrics,
    significance: { pValue: number; winner: 'A' | 'B' | 'inconclusive' }
  ): ABTestResult['recommendation'] {
    
    // Need sufficient sample size
    if (metrics.totalRequests < 1000) {
      return 'continue_test';
    }

    // Check statistical significance
    if (significance.pValue > 0.05) {
      return 'inconclusive';
    }

    // Consider multiple metrics for recommendation
    const modelABetter = (
      metrics.modelALatency < metrics.modelBLatency &&
      metrics.modelAErrorRate < metrics.modelBErrorRate
    );

    const modelBBetter = (
      metrics.modelBLatency < metrics.modelALatency &&
      metrics.modelBErrorRate < metrics.modelAErrorRate
    );

    if (significance.winner === 'A' && modelABetter) {
      return 'promote_A';
    } else if (significance.winner === 'B' && modelBBetter) {
      return 'promote_B';
    } else {
      return 'continue_test';
    }
  }

  // ============================================================================
  // LOGGING AND MONITORING
  // ============================================================================

  private async logABTestEvent(
    test: ABTestConfig,
    eventType: string,
    additionalTags?: Record<string, string>
  ): Promise<void> {
    try {
      const experimentId = await this.mlflowClient.ensureExperiment('ab_testing');
      const run = await this.mlflowClient.createRun(experimentId, 'ab-testing-framework', {
        'ab_test.id': test.id,
        'ab_test.name': test.name,
        'ab_test.event_type': eventType,
        'ab_test.model_name': test.modelA.name,
        'ab_test.model_a_version': test.modelA.version,
        'ab_test.model_b_version': test.modelB.version,
        ...additionalTags
      });

      // Log current metrics
      const metrics = this.testMetrics.get(test.id);
      if (metrics) {
        await this.mlflowClient.logBatchMetrics(run.info.run_id, [
          { key: 'total_requests', value: metrics.totalRequests },
          { key: 'model_a_requests', value: metrics.modelARequests },
          { key: 'model_b_requests', value: metrics.modelBRequests },
          { key: 'model_a_latency', value: metrics.modelALatency },
          { key: 'model_b_latency', value: metrics.modelBLatency },
          { key: 'model_a_error_rate', value: metrics.modelAErrorRate },
          { key: 'model_b_error_rate', value: metrics.modelBErrorRate }
        ]);
      }

      await this.mlflowClient.updateRun(run.info.run_id, 'FINISHED');

    } catch (error) {
      console.error('Failed to log A/B test event:', error);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanupCompletedTests(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const testsToCleanup = Array.from(this.activeTests.entries())
      .filter(([_, test]) => 
        test.status === 'completed' && 
        test.endTime && 
        test.endTime < cutoffDate
      );

    for (const [testId, _] of testsToCleanup) {
      this.activeTests.delete(testId);
      this.testMetrics.delete(testId);
      this.testResponses.delete(testId);
    }

    console.log(`Cleaned up ${testsToCleanup.length} completed A/B tests`);
  }
}