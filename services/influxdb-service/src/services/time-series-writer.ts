import { Point } from '@influxdata/influxdb-client';
import { InfluxDBConfig } from '../config/influxdb';
import { TimeSeriesPoint, BatchWriteOptions, MetricData, FlowMetric, CodeQualityMetric } from '../types';
import { Logger } from 'winston';

export class TimeSeriesWriter {
  private batchBuffer: Point[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isWriting = false;

  constructor(
    private influxConfig: InfluxDBConfig,
    private logger: Logger,
    private options: BatchWriteOptions = {
      batchSize: 1000,
      flushInterval: 5000,
      maxRetries: 3,
      retryInterval: 1000
    }
  ) {
    this.startBatchTimer();
  }

  async writePoint(point: TimeSeriesPoint): Promise<void> {
    const influxPoint = this.createInfluxPoint(point);
    this.batchBuffer.push(influxPoint);

    if (this.batchBuffer.length >= this.options.batchSize) {
      await this.flushBatch();
    }
  }

  async writePoints(points: TimeSeriesPoint[]): Promise<void> {
    const influxPoints = points.map(point => this.createInfluxPoint(point));
    this.batchBuffer.push(...influxPoints);

    if (this.batchBuffer.length >= this.options.batchSize) {
      await this.flushBatch();
    }
  }

  async writeFlowMetric(metric: FlowMetric): Promise<void> {
    const point: TimeSeriesPoint = {
      measurement: 'flow_metrics',
      tags: {
        user_id: metric.userId || 'unknown',
        team_id: metric.teamId || 'unknown',
        project_id: metric.projectId || 'unknown',
        session_id: metric.sessionId,
        metric_type: metric.metricType
      },
      fields: {
        focus_score: metric.focusScore,
        interruption_count: metric.interruptionCount,
        flow_duration: metric.flowDuration,
        value: metric.value
      },
      timestamp: metric.timestamp
    };

    await this.writePoint(point);
  }

  async writeCodeQualityMetric(metric: CodeQualityMetric): Promise<void> {
    const point: TimeSeriesPoint = {
      measurement: 'code_quality_metrics',
      tags: {
        user_id: metric.userId || 'unknown',
        team_id: metric.teamId || 'unknown',
        project_id: metric.projectId || 'unknown',
        repository: metric.repository,
        branch: metric.branch,
        metric_type: metric.metricType
      },
      fields: {
        churn_rate: metric.churnRate,
        complexity: metric.complexity,
        review_lag_time: metric.reviewLagTime || 0,
        value: metric.value
      },
      timestamp: metric.timestamp
    };

    await this.writePoint(point);
  }

  async writeGenericMetric(metric: MetricData): Promise<void> {
    const point: TimeSeriesPoint = {
      measurement: 'generic_metrics',
      tags: {
        user_id: metric.userId || 'unknown',
        team_id: metric.teamId || 'unknown',
        project_id: metric.projectId || 'unknown',
        metric_type: metric.metricType
      },
      fields: {
        value: metric.value,
        ...this.flattenMetadata(metric.metadata)
      },
      timestamp: metric.timestamp
    };

    await this.writePoint(point);
  }

  private createInfluxPoint(point: TimeSeriesPoint): Point {
    const influxPoint = new Point(point.measurement);

    // Add tags
    Object.entries(point.tags).forEach(([key, value]) => {
      influxPoint.tag(key, value);
    });

    // Add fields
    Object.entries(point.fields).forEach(([key, value]) => {
      if (typeof value === 'number') {
        influxPoint.floatField(key, value);
      } else if (typeof value === 'boolean') {
        influxPoint.booleanField(key, value);
      } else {
        influxPoint.stringField(key, String(value));
      }
    });

    // Set timestamp
    if (point.timestamp) {
      influxPoint.timestamp(point.timestamp);
    }

    return influxPoint;
  }

  private flattenMetadata(metadata?: Record<string, any>): Record<string, number | string | boolean> {
    if (!metadata) return {};

    const flattened: Record<string, number | string | boolean> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        flattened[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        flattened[key] = JSON.stringify(value);
      }
    });

    return flattened;
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(async () => {
      if (this.batchBuffer.length > 0) {
        await this.flushBatch();
      }
    }, this.options.flushInterval);
  }

  private async flushBatch(): Promise<void> {
    if (this.isWriting || this.batchBuffer.length === 0) {
      return;
    }

    this.isWriting = true;
    const pointsToWrite = [...this.batchBuffer];
    this.batchBuffer = [];

    let retries = 0;
    while (retries < this.options.maxRetries) {
      try {
        const writeApi = this.influxConfig.getWriteApi();
        writeApi.writePoints(pointsToWrite);
        await writeApi.flush();
        
        this.logger.info(`Successfully wrote ${pointsToWrite.length} points to InfluxDB`);
        break;
      } catch (error) {
        retries++;
        this.logger.error(`Failed to write batch (attempt ${retries}/${this.options.maxRetries}):`, error);
        
        if (retries >= this.options.maxRetries) {
          this.logger.error('Max retries exceeded, dropping batch');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.options.retryInterval * retries));
      }
    }

    this.isWriting = false;
  }

  async close(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
  }
}