import { InfluxDBConfig } from '../config/influxdb';
import { TimeSeriesWriter } from '../services/time-series-writer';
import { TimeSeriesReader } from '../services/time-series-reader';
import { FlowMetric, CodeQualityMetric, MetricData } from '../types';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'error',
  transports: []
});

describe('InfluxDB Time Series Integration', () => {
  let influxConfig: InfluxDBConfig;
  let writer: TimeSeriesWriter;
  let reader: TimeSeriesReader;

  beforeAll(async () => {
    influxConfig = new InfluxDBConfig();
    await influxConfig.setupRetentionPolicies();
    writer = new TimeSeriesWriter(influxConfig, logger);
    reader = new TimeSeriesReader(influxConfig, logger);
  });

  afterAll(async () => {
    await writer.close();
    await influxConfig.close();
  });

  describe('Flow Metrics', () => {
    it('should write and read flow metrics accurately', async () => {
      const flowMetric: FlowMetric = {
        userId: 'user123',
        teamId: 'team456',
        projectId: 'project789',
        sessionId: 'session001',
        metricType: 'flow_state',
        value: 85.5,
        focusScore: 0.85,
        interruptionCount: 3,
        flowDuration: 7200,
        timestamp: new Date()
      };

      await writer.writeFlowMetric(flowMetric);
      
      // Wait for write to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = await reader.getFlowMetrics(
        flowMetric.userId,
        new Date(Date.now() - 60000),
        new Date(Date.now() + 60000)
      );

      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.session_id === flowMetric.sessionId);
      expect(result).toBeDefined();
      expect(result.focus_score).toBe(flowMetric.focusScore);
      expect(result.interruption_count).toBe(flowMetric.interruptionCount);
    });

    it('should handle batch writes efficiently', async () => {
      const metrics: FlowMetric[] = Array.from({ length: 100 }, (_, i) => ({
        userId: 'user123',
        teamId: 'team456',
        projectId: 'project789',
        sessionId: `session${i}`,
        metricType: 'flow_state',
        value: Math.random() * 100,
        focusScore: Math.random(),
        interruptionCount: Math.floor(Math.random() * 10),
        flowDuration: Math.floor(Math.random() * 10000),
        timestamp: new Date(Date.now() - i * 1000)
      }));

      const startTime = Date.now();
      
      for (const metric of metrics) {
        await writer.writeFlowMetric(metric);
      }

      const writeTime = Date.now() - startTime;
      expect(writeTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Wait for writes to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const results = await reader.getFlowMetrics(
        'user123',
        new Date(Date.now() - 120000),
        new Date()
      );

      expect(results.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Code Quality Metrics', () => {
    it('should write and read code quality metrics accurately', async () => {
      const codeQualityMetric: CodeQualityMetric = {
        userId: 'user123',
        teamId: 'team456',
        projectId: 'project789',
        repository: 'devflow/main',
        branch: 'feature/metrics',
        metricType: 'code_quality',
        value: 75.0,
        churnRate: 0.15,
        complexity: 8.5,
        reviewLagTime: 3600,
        timestamp: new Date()
      };

      await writer.writeCodeQualityMetric(codeQualityMetric);
      
      // Wait for write to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = await reader.getCodeQualityMetrics(
        codeQualityMetric.projectId,
        new Date(Date.now() - 60000),
        new Date(Date.now() + 60000)
      );

      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.repository === codeQualityMetric.repository);
      expect(result).toBeDefined();
      expect(result.churn_rate).toBe(codeQualityMetric.churnRate);
      expect(result.complexity).toBe(codeQualityMetric.complexity);
    });
  });

  describe('Generic Metrics', () => {
    it('should handle generic metrics with metadata', async () => {
      const genericMetric: MetricData = {
        userId: 'user123',
        teamId: 'team456',
        projectId: 'project789',
        metricType: 'custom_metric',
        value: 42.0,
        timestamp: new Date(),
        metadata: {
          source: 'test',
          category: 'performance',
          tags: ['important', 'daily']
        }
      };

      await writer.writeGenericMetric(genericMetric);
      
      // Wait for write to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = await reader.queryMetrics({
        start: new Date(Date.now() - 60000),
        stop: new Date(Date.now() + 60000),
        measurement: 'generic_metrics',
        tags: { user_id: genericMetric.userId }
      });

      expect(results.length).toBeGreaterThan(0);
      const result = results.find(r => r.metric_type === genericMetric.metricType);
      expect(result).toBeDefined();
      expect(result._value).toBe(genericMetric.value);
    });
  });

  describe('Query Optimization', () => {
    it('should perform aggregated queries efficiently', async () => {
      // Write test data
      const metrics: MetricData[] = Array.from({ length: 50 }, (_, i) => ({
        userId: 'user123',
        teamId: 'team456',
        projectId: 'project789',
        metricType: 'performance',
        value: Math.random() * 100,
        timestamp: new Date(Date.now() - i * 60000) // 1 minute intervals
      }));

      for (const metric of metrics) {
        await writer.writeGenericMetric(metric);
      }

      // Wait for writes to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const startTime = Date.now();
      
      const results = await reader.getAggregatedMetrics(
        'generic_metrics',
        { every: '5m', fn: 'mean' },
        new Date(Date.now() - 3600000), // 1 hour ago
        new Date(),
        { user_id: 'user123' }
      );

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle time range queries with grouping', async () => {
      const startTime = Date.now();
      
      const results = await reader.getMetricsByTimeRange(
        'generic_metrics',
        new Date(Date.now() - 3600000),
        new Date(),
        ['user_id', 'team_id']
      );

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Data Retention', () => {
    it('should respect retention policies', async () => {
      // This test would typically run over time to verify retention
      // For now, we'll just verify the bucket configuration
      const bucketsAPI = influxConfig.getBucketsAPI();
      const buckets = await bucketsAPI.getBuckets({ org: 'devflow' });
      
      expect(buckets.buckets).toBeDefined();
      expect(buckets.buckets!.length).toBeGreaterThan(0);
      
      const productivityBucket = buckets.buckets!.find(b => b.name === 'productivity_metrics');
      expect(productivityBucket).toBeDefined();
      expect(productivityBucket!.retentionRules).toBeDefined();
      expect(productivityBucket!.retentionRules!.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle write failures gracefully', async () => {
      // Create a writer with invalid configuration
      const invalidConfig = new InfluxDBConfig('http://invalid-host:8086', 'invalid-token');
      const invalidWriter = new TimeSeriesWriter(invalidConfig, logger);

      const metric: MetricData = {
        userId: 'user123',
        metricType: 'test',
        value: 1.0,
        timestamp: new Date()
      };

      // This should not throw but should handle the error internally
      await expect(invalidWriter.writeGenericMetric(metric)).resolves.not.toThrow();
      
      await invalidWriter.close();
    });

    it('should handle query failures gracefully', async () => {
      const invalidConfig = new InfluxDBConfig('http://invalid-host:8086', 'invalid-token');
      const invalidReader = new TimeSeriesReader(invalidConfig, logger);

      await expect(invalidReader.queryMetrics({
        start: new Date(Date.now() - 60000),
        stop: new Date()
      })).rejects.toThrow();
    });
  });
});