import { InfluxDBConfig } from '../config/influxdb';
import { QueryOptions } from '../types';
import { Logger } from 'winston';

export class TimeSeriesReader {
  constructor(
    private influxConfig: InfluxDBConfig,
    private logger: Logger
  ) {}

  async queryMetrics(options: QueryOptions): Promise<any[]> {
    const query = this.buildFluxQuery(options);
    
    try {
      const queryApi = this.influxConfig.getQueryApi();
      const results: any[] = [];
      
      await queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const record = tableMeta.toObject(row);
          results.push(record);
        },
        error: (error) => {
          this.logger.error('Query error:', error);
          throw error;
        },
        complete: () => {
          this.logger.info(`Query completed, returned ${results.length} records`);
        }
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to query metrics:', error);
      throw error;
    }
  }

  async getFlowMetrics(userId: string, start: Date, stop: Date): Promise<any[]> {
    const options: QueryOptions = {
      start,
      stop,
      bucket: 'productivity_metrics',
      measurement: 'flow_metrics',
      tags: { user_id: userId },
      fields: ['focus_score', 'interruption_count', 'flow_duration', 'value']
    };

    return this.queryMetrics(options);
  }

  async getCodeQualityMetrics(projectId: string, start: Date, stop: Date): Promise<any[]> {
    const options: QueryOptions = {
      start,
      stop,
      bucket: 'productivity_metrics',
      measurement: 'code_quality_metrics',
      tags: { project_id: projectId },
      fields: ['churn_rate', 'complexity', 'review_lag_time', 'value']
    };

    return this.queryMetrics(options);
  }

  async getAggregatedMetrics(
    measurement: string,
    aggregateWindow: { every: string; fn: 'mean' | 'sum' | 'count' | 'max' | 'min' },
    start: Date,
    stop: Date,
    tags?: Record<string, string>
  ): Promise<any[]> {
    const options: QueryOptions = {
      start,
      stop,
      bucket: 'productivity_metrics',
      measurement,
      tags,
      aggregateWindow
    };

    return this.queryMetrics(options);
  }

  async getTeamMetrics(teamId: string, start: Date, stop: Date): Promise<any[]> {
    const options: QueryOptions = {
      start,
      stop,
      bucket: 'productivity_metrics',
      tags: { team_id: teamId },
      aggregateWindow: {
        every: '1h',
        fn: 'mean'
      }
    };

    return this.queryMetrics(options);
  }

  private buildFluxQuery(options: QueryOptions): string {
    const bucket = options.bucket || 'productivity_metrics';
    const start = this.formatTime(options.start || new Date(Date.now() - 24 * 60 * 60 * 1000));
    const stop = this.formatTime(options.stop || new Date());

    let query = `from(bucket: "${bucket}")
  |> range(start: ${start}, stop: ${stop})`;

    if (options.measurement) {
      query += `\n  |> filter(fn: (r) => r._measurement == "${options.measurement}")`;
    }

    if (options.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        query += `\n  |> filter(fn: (r) => r.${key} == "${value}")`;
      });
    }

    if (options.fields && options.fields.length > 0) {
      const fieldFilter = options.fields.map(field => `r._field == "${field}"`).join(' or ');
      query += `\n  |> filter(fn: (r) => ${fieldFilter})`;
    }

    if (options.aggregateWindow) {
      query += `\n  |> aggregateWindow(every: ${options.aggregateWindow.every}, fn: ${options.aggregateWindow.fn}, createEmpty: false)`;
    }

    if (options.limit) {
      query += `\n  |> limit(n: ${options.limit})`;
    }

    query += '\n  |> yield(name: "result")';

    this.logger.debug('Generated Flux query:', query);
    return query;
  }

  private formatTime(time: string | Date): string {
    if (typeof time === 'string') {
      return time;
    }
    return time.toISOString();
  }

  async getMetricsByTimeRange(
    measurement: string,
    start: Date,
    stop: Date,
    groupBy?: string[]
  ): Promise<any[]> {
    let query = `from(bucket: "productivity_metrics")
  |> range(start: ${this.formatTime(start)}, stop: ${this.formatTime(stop)})
  |> filter(fn: (r) => r._measurement == "${measurement}")`;

    if (groupBy && groupBy.length > 0) {
      query += `\n  |> group(columns: [${groupBy.map(col => `"${col}"`).join(', ')}])`;
    }

    query += '\n  |> yield(name: "result")';

    try {
      const queryApi = this.influxConfig.getQueryApi();
      const results: any[] = [];
      
      await queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const record = tableMeta.toObject(row);
          results.push(record);
        },
        error: (error) => {
          this.logger.error('Query error:', error);
          throw error;
        }
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to query metrics by time range:', error);
      throw error;
    }
  }
}