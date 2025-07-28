import { Logger } from 'winston';
import { MongoQueryOptimizer } from './query-optimizer';
import { PerformanceBenchmarks } from './performance-benchmarks';
import mongoose from 'mongoose';

export interface PerformanceAlert {
  type: 'slow_query' | 'high_memory' | 'index_missing' | 'connection_pool';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceMetrics {
  queryPerformance: {
    averageExecutionTime: number;
    slowQueryCount: number;
    totalQueries: number;
    hitRate: number;
  };
  connectionPool: {
    activeConnections: number;
    availableConnections: number;
    totalConnections: number;
    waitQueueSize: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  indexUsage: {
    totalIndexes: number;
    unusedIndexes: number;
    indexHitRate: number;
  };
}

export class DatabasePerformanceMonitor {
  private alerts: PerformanceAlert[] = [];
  private metricsHistory: PerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    private logger: Logger,
    private connection: mongoose.Connection,
    private queryOptimizer: MongoQueryOptimizer,
    private benchmarks: PerformanceBenchmarks
  ) {}

  /**
   * Start continuous performance monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.logger.info('Starting database performance monitoring');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkPerformanceThresholds();
      } catch (error) {
        this.logger.error('Performance monitoring error:', error);
      }
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Database performance monitoring stopped');
    }
  }

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const metrics: PerformanceMetrics = {
        queryPerformance: await this.getQueryPerformanceMetrics(),
        connectionPool: await this.getConnectionPoolMetrics(),
        memoryUsage: this.getMemoryUsageMetrics(),
        indexUsage: await this.getIndexUsageMetrics()
      };

      // Store metrics history (keep last 1000 entries)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect performance metrics:', error);
      throw error;
    }
  }

  /**
   * Run automated performance optimization
   */
  async runAutomatedOptimization(): Promise<{
    indexesCreated: number;
    queriesOptimized: number;
    alertsResolved: number;
    recommendations: string[];
  }> {
    const results = {
      indexesCreated: 0,
      queriesOptimized: 0,
      alertsResolved: 0,
      recommendations: [] as string[]
    };

    try {
      // Create optimized indexes
      await this.queryOptimizer.createOptimizedIndexes();
      results.indexesCreated = 1; // Simplified count

      // Analyze and optimize slow queries
      const slowQueryReport = this.queryOptimizer.getSlowQueryReport();
      results.queriesOptimized = Object.keys(slowQueryReport).length;

      // Resolve alerts that can be automatically fixed
      const resolvedAlerts = await this.resolveAutomaticAlerts();
      results.alertsResolved = resolvedAlerts;

      // Generate recommendations
      results.recommendations = await this.generateOptimizationRecommendations();

      this.logger.info('Automated optimization completed', results);
      return results;
    } catch (error) {
      this.logger.error('Automated optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(): Promise<any> {
    const currentMetrics = await this.collectMetrics();
    const recentAlerts = this.alerts.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const slowQueryReport = this.queryOptimizer.getSlowQueryReport();
    const benchmarkReport = this.benchmarks.generatePerformanceReport();

    return {
      currentMetrics,
      alerts: {
        total: recentAlerts.length,
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        high: recentAlerts.filter(a => a.severity === 'high').length,
        unresolved: recentAlerts.filter(a => !a.resolved).length,
        recent: recentAlerts.slice(0, 10)
      },
      queryPerformance: slowQueryReport,
      benchmarks: benchmarkReport,
      trends: this.calculatePerformanceTrends(),
      recommendations: await this.generateOptimizationRecommendations()
    };
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve a performance alert
   */
  resolveAlert(alertId: number): boolean {
    if (alertId >= 0 && alertId < this.alerts.length) {
      this.alerts[alertId].resolved = true;
      return true;
    }
    return false;
  }

  private async getQueryPerformanceMetrics(): Promise<PerformanceMetrics['queryPerformance']> {
    const slowQueryReport = this.queryOptimizer.getSlowQueryReport();
    
    let totalQueries = 0;
    let slowQueryCount = 0;
    let totalExecutionTime = 0;

    Object.values(slowQueryReport).forEach((report: any) => {
      totalQueries += report.totalQueries || 0;
      slowQueryCount += report.slowQueries || 0;
      totalExecutionTime += report.averageExecutionTime || 0;
    });

    return {
      averageExecutionTime: totalQueries > 0 ? totalExecutionTime / Object.keys(slowQueryReport).length : 0,
      slowQueryCount,
      totalQueries,
      hitRate: totalQueries > 0 ? ((totalQueries - slowQueryCount) / totalQueries) * 100 : 100
    };
  }

  private async getConnectionPoolMetrics(): Promise<PerformanceMetrics['connectionPool']> {
    try {
      // Get connection pool stats from MongoDB
      const adminDb = this.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      
      const connections = serverStatus.connections || {};
      
      return {
        activeConnections: connections.current || 0,
        availableConnections: connections.available || 0,
        totalConnections: connections.totalCreated || 0,
        waitQueueSize: 0 // Would need to be tracked separately
      };
    } catch (error) {
      this.logger.error('Failed to get connection pool metrics:', error);
      return {
        activeConnections: 0,
        availableConnections: 0,
        totalConnections: 0,
        waitQueueSize: 0
      };
    }
  }

  private getMemoryUsageMetrics(): PerformanceMetrics['memoryUsage'] {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  private async getIndexUsageMetrics(): Promise<PerformanceMetrics['indexUsage']> {
    try {
      const indexAnalysis = await this.queryOptimizer.analyzeIndexUsage();
      
      const totalIndexes = indexAnalysis.length;
      const unusedIndexes = indexAnalysis.filter(idx => idx.isUnused).length;
      const usedIndexes = totalIndexes - unusedIndexes;
      
      return {
        totalIndexes,
        unusedIndexes,
        indexHitRate: totalIndexes > 0 ? (usedIndexes / totalIndexes) * 100 : 0
      };
    } catch (error) {
      this.logger.error('Failed to get index usage metrics:', error);
      return {
        totalIndexes: 0,
        unusedIndexes: 0,
        indexHitRate: 0
      };
    }
  }

  private async checkPerformanceThresholds(): Promise<void> {
    const metrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!metrics) return;

    // Check query performance
    if (metrics.queryPerformance.averageExecutionTime > 1000) {
      this.createAlert({
        type: 'slow_query',
        severity: 'high',
        message: `Average query execution time is ${metrics.queryPerformance.averageExecutionTime.toFixed(2)}ms`,
        details: { averageExecutionTime: metrics.queryPerformance.averageExecutionTime }
      });
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 85) {
      this.createAlert({
        type: 'high_memory',
        severity: 'critical',
        message: `Memory usage is ${memoryUsagePercent.toFixed(1)}%`,
        details: { memoryUsagePercent, memoryUsage: metrics.memoryUsage }
      });
    }

    // Check connection pool
    if (metrics.connectionPool.waitQueueSize > 10) {
      this.createAlert({
        type: 'connection_pool',
        severity: 'medium',
        message: `Connection pool wait queue size is ${metrics.connectionPool.waitQueueSize}`,
        details: { connectionPool: metrics.connectionPool }
      });
    }

    // Check index usage
    if (metrics.indexUsage.indexHitRate < 70) {
      this.createAlert({
        type: 'index_missing',
        severity: 'medium',
        message: `Index hit rate is low: ${metrics.indexUsage.indexHitRate.toFixed(1)}%`,
        details: { indexUsage: metrics.indexUsage }
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'timestamp' | 'resolved'>): void {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(alert => 
      alert.type === alertData.type && 
      !alert.resolved &&
      Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000 // Within last 5 minutes
    );

    if (!existingAlert) {
      const alert: PerformanceAlert = {
        ...alertData,
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.push(alert);
      
      // Keep only last 1000 alerts
      if (this.alerts.length > 1000) {
        this.alerts.shift();
      }

      this.logger.warn('Performance alert created', alert);
    }
  }

  private async resolveAutomaticAlerts(): Promise<number> {
    let resolvedCount = 0;
    
    const unresolvedAlerts = this.alerts.filter(alert => !alert.resolved);
    
    for (const alert of unresolvedAlerts) {
      switch (alert.type) {
        case 'index_missing':
          // Automatically create missing indexes
          try {
            await this.queryOptimizer.createOptimizedIndexes();
            alert.resolved = true;
            resolvedCount++;
            this.logger.info(`Auto-resolved index missing alert`);
          } catch (error) {
            this.logger.error('Failed to auto-resolve index alert:', error);
          }
          break;
          
        case 'slow_query':
          // Mark as resolved if performance improved
          const currentMetrics = await this.collectMetrics();
          if (currentMetrics.queryPerformance.averageExecutionTime < 500) {
            alert.resolved = true;
            resolvedCount++;
            this.logger.info(`Auto-resolved slow query alert`);
          }
          break;
      }
    }
    
    return resolvedCount;
  }

  private calculatePerformanceTrends(): any {
    if (this.metricsHistory.length < 2) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const recent = this.metricsHistory.slice(-10); // Last 10 metrics
    const older = this.metricsHistory.slice(-20, -10); // Previous 10 metrics

    const recentAvg = {
      queryTime: recent.reduce((sum, m) => sum + m.queryPerformance.averageExecutionTime, 0) / recent.length,
      memoryUsage: recent.reduce((sum, m) => sum + (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal), 0) / recent.length,
      indexHitRate: recent.reduce((sum, m) => sum + m.indexUsage.indexHitRate, 0) / recent.length
    };

    const olderAvg = {
      queryTime: older.reduce((sum, m) => sum + m.queryPerformance.averageExecutionTime, 0) / older.length,
      memoryUsage: older.reduce((sum, m) => sum + (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal), 0) / older.length,
      indexHitRate: older.reduce((sum, m) => sum + m.indexUsage.indexHitRate, 0) / older.length
    };

    return {
      queryPerformance: {
        trend: recentAvg.queryTime > olderAvg.queryTime ? 'degrading' : 'improving',
        change: ((recentAvg.queryTime - olderAvg.queryTime) / olderAvg.queryTime) * 100
      },
      memoryUsage: {
        trend: recentAvg.memoryUsage > olderAvg.memoryUsage ? 'increasing' : 'decreasing',
        change: ((recentAvg.memoryUsage - olderAvg.memoryUsage) / olderAvg.memoryUsage) * 100
      },
      indexEfficiency: {
        trend: recentAvg.indexHitRate > olderAvg.indexHitRate ? 'improving' : 'degrading',
        change: ((recentAvg.indexHitRate - olderAvg.indexHitRate) / olderAvg.indexHitRate) * 100
      }
    };
  }

  private async generateOptimizationRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    if (!currentMetrics) {
      return ['Insufficient metrics data for recommendations'];
    }

    // Query performance recommendations
    if (currentMetrics.queryPerformance.averageExecutionTime > 500) {
      recommendations.push('Consider adding indexes for frequently queried fields');
      recommendations.push('Review and optimize slow queries using aggregation pipelines');
    }

    // Memory usage recommendations
    const memoryUsagePercent = (currentMetrics.memoryUsage.heapUsed / currentMetrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 70) {
      recommendations.push('Memory usage is high - consider implementing pagination for large result sets');
      recommendations.push('Review data models for potential normalization opportunities');
    }

    // Index recommendations
    if (currentMetrics.indexUsage.indexHitRate < 80) {
      recommendations.push('Index hit rate is low - analyze query patterns and create appropriate indexes');
    }

    if (currentMetrics.indexUsage.unusedIndexes > 5) {
      recommendations.push('Remove unused indexes to improve write performance and reduce storage');
    }

    // Connection pool recommendations
    if (currentMetrics.connectionPool.waitQueueSize > 5) {
      recommendations.push('Increase connection pool size or optimize query execution time');
    }

    return recommendations;
  }
}