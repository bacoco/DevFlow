import { InfluxDB, QueryApi } from '@influxdata/influxdb-client';
import { Logger } from 'winston';

export interface InfluxQueryMetrics {
  query: string;
  executionTimeMs: number;
  bytesRead: number;
  seriesCount: number;
  pointsCount: number;
  isOptimal: boolean;
  suggestions: string[];
  timestamp: Date;
}

export interface ContinuousQuery {
  name: string;
  query: string;
  interval: string;
  destination: string;
  enabled: boolean;
}

export class InfluxQueryOptimizer {
  private queryMetrics: InfluxQueryMetrics[] = [];
  private slowQueryThreshold: number = 1000; // ms

  constructor(
    private logger: Logger,
    private client: InfluxDB,
    private org: string,
    private bucket: string
  ) {}

  /**
   * Optimize query by adding appropriate filters and aggregations
   */
  optimizeQuery(query: string, timeRange?: { start: string; stop: string }): string {
    let optimizedQuery = query;

    // Add time range if not present
    if (timeRange && !query.includes('|> range(')) {
      optimizedQuery = optimizedQuery.replace(
        /from\(bucket:\s*"[^"]+"\)/,
        `$&\n  |> range(start: ${timeRange.start}, stop: ${timeRange.stop})`
      );
    }

    // Add field selection early in pipeline
    if (!query.includes('|> filter(fn: (r) => r["_field"]')) {
      // Suggest adding field filters
      this.logger.info('Consider adding field filters to improve query performance');
    }

    // Add measurement filter early
    if (!query.includes('|> filter(fn: (r) => r["_measurement"]')) {
      this.logger.info('Consider adding measurement filters to improve query performance');
    }

    // Optimize aggregation windows
    optimizedQuery = this.optimizeAggregationWindows(optimizedQuery);

    // Add pushdown predicates
    optimizedQuery = this.addPushdownPredicates(optimizedQuery);

    return optimizedQuery;
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMetrics(query: string): Promise<{ result: any[]; metrics: InfluxQueryMetrics }> {
    const startTime = Date.now();
    const queryApi = this.client.getQueryApi(this.org);

    try {
      const result: any[] = [];
      
      await queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const tableObject = tableMeta.toObject(row);
          result.push(tableObject);
        },
        error: (error) => {
          this.logger.error('Query execution error:', error);
          throw error;
        },
        complete: () => {
          // Query completed
        }
      });

      const executionTimeMs = Date.now() - startTime;
      
      const metrics: InfluxQueryMetrics = {
        query,
        executionTimeMs,
        bytesRead: this.estimateBytesRead(result),
        seriesCount: this.countUniqueSeries(result),
        pointsCount: result.length,
        isOptimal: this.isQueryOptimal(executionTimeMs, result.length),
        suggestions: this.generateOptimizationSuggestions(query, executionTimeMs, result),
        timestamp: new Date()
      };

      // Store metrics
      this.queryMetrics.push(metrics);

      // Log slow queries
      if (executionTimeMs > this.slowQueryThreshold) {
        this.logger.warn('Slow InfluxDB query detected', {
          query: query.substring(0, 200) + '...',
          executionTimeMs,
          pointsCount: result.length,
          suggestions: metrics.suggestions
        });
      }

      return { result, metrics };
    } catch (error) {
      this.logger.error('Query execution failed:', { query, error });
      throw error;
    }
  }

  /**
   * Create continuous queries for common aggregations
   */
  async createContinuousQueries(): Promise<void> {
    const continuousQueries: ContinuousQuery[] = [
      {
        name: 'productivity_hourly',
        query: `
          from(bucket: "${this.bucket}")
            |> range(start: -1h)
            |> filter(fn: (r) => r["_measurement"] == "productivity_metrics")
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
            |> to(bucket: "aggregated_metrics", org: "${this.org}")
        `,
        interval: '1h',
        destination: 'aggregated_metrics',
        enabled: true
      },
      {
        name: 'flow_metrics_daily',
        query: `
          from(bucket: "${this.bucket}")
            |> range(start: -1d)
            |> filter(fn: (r) => r["_measurement"] == "flow_metrics")
            |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
            |> to(bucket: "aggregated_metrics", org: "${this.org}")
        `,
        interval: '1d',
        destination: 'aggregated_metrics',
        enabled: true
      },
      {
        name: 'code_quality_weekly',
        query: `
          from(bucket: "${this.bucket}")
            |> range(start: -7d)
            |> filter(fn: (r) => r["_measurement"] == "code_quality")
            |> aggregateWindow(every: 7d, fn: mean, createEmpty: false)
            |> to(bucket: "aggregated_metrics", org: "${this.org}")
        `,
        interval: '7d',
        destination: 'aggregated_metrics',
        enabled: true
      },
      {
        name: 'team_metrics_hourly',
        query: `
          from(bucket: "${this.bucket}")
            |> range(start: -1h)
            |> filter(fn: (r) => r["_measurement"] == "team_metrics")
            |> group(columns: ["team_id"])
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
            |> to(bucket: "aggregated_metrics", org: "${this.org}")
        `,
        interval: '1h',
        destination: 'aggregated_metrics',
        enabled: true
      }
    ];

    for (const cq of continuousQueries) {
      if (cq.enabled) {
        await this.createContinuousQuery(cq);
      }
    }
  }

  /**
   * Create optimized queries for common dashboard patterns
   */
  getOptimizedDashboardQueries(): Record<string, string> {
    return {
      // Productivity overview - last 24 hours
      productivityOverview: `
        from(bucket: "aggregated_metrics")
          |> range(start: -24h)
          |> filter(fn: (r) => r["_measurement"] == "productivity_metrics")
          |> filter(fn: (r) => r["_field"] == "focus_time" or r["_field"] == "interruptions" or r["_field"] == "flow_score")
          |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `,

      // Team performance comparison
      teamPerformance: `
        from(bucket: "aggregated_metrics")
          |> range(start: -7d)
          |> filter(fn: (r) => r["_measurement"] == "team_metrics")
          |> filter(fn: (r) => r["_field"] == "velocity" or r["_field"] == "quality_score")
          |> group(columns: ["team_id"])
          |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
          |> pivot(rowKey:["_time", "team_id"], columnKey: ["_field"], valueColumn: "_value")
      `,

      // Individual flow metrics
      individualFlow: `
        from(bucket: "${this.bucket}")
          |> range(start: -24h)
          |> filter(fn: (r) => r["_measurement"] == "flow_metrics")
          |> filter(fn: (r) => r["user_id"] == "{user_id}")
          |> filter(fn: (r) => r["_field"] == "flow_duration" or r["_field"] == "interruption_count")
          |> aggregateWindow(every: 30m, fn: sum, createEmpty: false)
      `,

      // Code quality trends
      codeQualityTrends: `
        from(bucket: "aggregated_metrics")
          |> range(start: -30d)
          |> filter(fn: (r) => r["_measurement"] == "code_quality")
          |> filter(fn: (r) => r["_field"] == "complexity" or r["_field"] == "coverage" or r["_field"] == "maintainability")
          |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `,

      // Real-time metrics (last 5 minutes)
      realTimeMetrics: `
        from(bucket: "${this.bucket}")
          |> range(start: -5m)
          |> filter(fn: (r) => r["_measurement"] == "productivity_metrics")
          |> filter(fn: (r) => r["_field"] == "active_time")
          |> aggregateWindow(every: 30s, fn: last, createEmpty: false)
      `,

      // Alert threshold monitoring
      alertThresholds: `
        from(bucket: "${this.bucket}")
          |> range(start: -1h)
          |> filter(fn: (r) => r["_measurement"] == "productivity_metrics")
          |> filter(fn: (r) => r["_field"] == "flow_score")
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> map(fn: (r) => ({ r with _value: if r._value < 0.7 then "low" else "normal" }))
      `
    };
  }

  /**
   * Get query performance report
   */
  getPerformanceReport(): any {
    const slowQueries = this.queryMetrics.filter(m => m.executionTimeMs > this.slowQueryThreshold);
    const totalQueries = this.queryMetrics.length;

    if (totalQueries === 0) {
      return { message: 'No query metrics available' };
    }

    const avgExecutionTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / totalQueries;
    const avgPointsCount = this.queryMetrics.reduce((sum, m) => sum + m.pointsCount, 0) / totalQueries;

    return {
      totalQueries,
      slowQueries: slowQueries.length,
      slowQueryPercentage: (slowQueries.length / totalQueries) * 100,
      avgExecutionTime,
      avgPointsCount,
      commonSuggestions: this.getCommonSuggestions(),
      topSlowQueries: slowQueries
        .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
        .slice(0, 5)
        .map(q => ({
          query: q.query.substring(0, 100) + '...',
          executionTimeMs: q.executionTimeMs,
          pointsCount: q.pointsCount,
          suggestions: q.suggestions
        }))
    };
  }

  private optimizeAggregationWindows(query: string): string {
    // Replace inefficient aggregation patterns
    let optimized = query;

    // Use appropriate window sizes based on time range
    if (query.includes('range(start: -1h)') && query.includes('aggregateWindow(every: 1s')) {
      optimized = optimized.replace(/aggregateWindow\(every: 1s/g, 'aggregateWindow(every: 30s');
      this.logger.info('Optimized aggregation window from 1s to 30s for 1-hour range');
    }

    if (query.includes('range(start: -24h)') && query.includes('aggregateWindow(every: 1m')) {
      optimized = optimized.replace(/aggregateWindow\(every: 1m/g, 'aggregateWindow(every: 5m');
      this.logger.info('Optimized aggregation window from 1m to 5m for 24-hour range');
    }

    return optimized;
  }

  private addPushdownPredicates(query: string): string {
    let optimized = query;

    // Move filters closer to the source
    const filterRegex = /\|\s*>\s*filter\([^)]+\)/g;
    const filters = query.match(filterRegex) || [];

    // Suggest moving measurement and field filters early
    const measurementFilters = filters.filter(f => f.includes('_measurement'));
    const fieldFilters = filters.filter(f => f.includes('_field'));

    if (measurementFilters.length > 0 || fieldFilters.length > 0) {
      this.logger.info('Consider moving measurement and field filters immediately after range() for better performance');
    }

    return optimized;
  }

  private async createContinuousQuery(cq: ContinuousQuery): Promise<void> {
    try {
      // Note: InfluxDB 2.x uses tasks instead of continuous queries
      // This would typically create a task using the Tasks API
      this.logger.info(`Continuous query pattern created: ${cq.name}`);
      
      // In a real implementation, you would use the Tasks API:
      // const tasksAPI = new TasksAPI(this.client);
      // await tasksAPI.postTasks({
      //   body: {
      //     orgID: orgId,
      //     name: cq.name,
      //     flux: cq.query,
      //     every: cq.interval,
      //     status: 'active'
      //   }
      // });
      
    } catch (error) {
      this.logger.error(`Failed to create continuous query ${cq.name}:`, error);
    }
  }

  private estimateBytesRead(result: any[]): number {
    // Rough estimation based on result size
    return JSON.stringify(result).length;
  }

  private countUniqueSeries(result: any[]): number {
    const series = new Set();
    result.forEach(row => {
      const seriesKey = `${row._measurement || ''}:${row._field || ''}:${JSON.stringify(row.tags || {})}`;
      series.add(seriesKey);
    });
    return series.size;
  }

  private isQueryOptimal(executionTimeMs: number, pointsCount: number): boolean {
    // Consider query optimal if:
    // - Execution time is reasonable
    // - Points per millisecond ratio is good
    const pointsPerMs = pointsCount / Math.max(executionTimeMs, 1);
    return executionTimeMs < this.slowQueryThreshold && pointsPerMs > 0.1;
  }

  private generateOptimizationSuggestions(query: string, executionTimeMs: number, result: any[]): string[] {
    const suggestions: string[] = [];

    // Time range suggestions
    if (!query.includes('|> range(')) {
      suggestions.push('Add time range filter to limit data scan');
    }

    // Field selection
    if (!query.includes('filter(fn: (r) => r["_field"]')) {
      suggestions.push('Add field filters to reduce data processing');
    }

    // Measurement filter
    if (!query.includes('filter(fn: (r) => r["_measurement"]')) {
      suggestions.push('Add measurement filter to improve query selectivity');
    }

    // Large result set
    if (result.length > 10000) {
      suggestions.push('Consider using aggregation or sampling to reduce result set size');
    }

    // Slow execution
    if (executionTimeMs > this.slowQueryThreshold) {
      suggestions.push('Query execution is slow - consider using pre-aggregated data');
    }

    // Aggregation optimization
    if (query.includes('aggregateWindow') && query.includes('every: 1s')) {
      suggestions.push('Consider using larger aggregation windows for better performance');
    }

    // Group by optimization
    if (query.includes('group()') && !query.includes('group(columns:')) {
      suggestions.push('Specify group columns explicitly for better performance');
    }

    return suggestions;
  }

  private getCommonSuggestions(): string[] {
    const suggestionCounts: Map<string, number> = new Map();

    this.queryMetrics.forEach(metric => {
      metric.suggestions.forEach(suggestion => {
        suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
      });
    });

    return Array.from(suggestionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([suggestion]) => suggestion);
  }
}