import mongoose from 'mongoose';
import { Logger } from 'winston';

export interface QueryPerformanceMetrics {
  executionTimeMs: number;
  docsExamined: number;
  docsReturned: number;
  indexesUsed: string[];
  stage: string;
  isOptimal: boolean;
  suggestions: string[];
}

export interface IndexAnalysis {
  collection: string;
  indexName: string;
  usage: {
    ops: number;
    since: Date;
  };
  size: number;
  isUnused: boolean;
  recommendation: 'keep' | 'drop' | 'optimize';
}

export class MongoQueryOptimizer {
  private performanceMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private slowQueryThreshold: number = 100; // ms

  constructor(
    private logger: Logger,
    private connection: mongoose.Connection
  ) {}

  /**
   * Analyze query performance and provide optimization suggestions
   */
  async analyzeQuery(
    collection: string,
    query: any,
    options: any = {}
  ): Promise<QueryPerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      // Execute explain plan
      const explainResult = await this.connection.db
        .collection(collection)
        .find(query, options)
        .explain('executionStats');

      const executionStats = explainResult.executionStats;
      const executionTimeMs = Date.now() - startTime;

      const metrics: QueryPerformanceMetrics = {
        executionTimeMs,
        docsExamined: executionStats.totalDocsExamined,
        docsReturned: executionStats.totalDocsReturned,
        indexesUsed: this.extractIndexesUsed(explainResult),
        stage: executionStats.executionStages.stage,
        isOptimal: this.isQueryOptimal(executionStats),
        suggestions: this.generateOptimizationSuggestions(executionStats, query)
      };

      // Store metrics for analysis
      if (!this.performanceMetrics.has(collection)) {
        this.performanceMetrics.set(collection, []);
      }
      this.performanceMetrics.get(collection)!.push(metrics);

      // Log slow queries
      if (executionTimeMs > this.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          collection,
          query,
          executionTimeMs,
          docsExamined: metrics.docsExamined,
          docsReturned: metrics.docsReturned
        });
      }

      return metrics;
    } catch (error) {
      this.logger.error('Query analysis failed', { collection, query, error });
      throw error;
    }
  }

  /**
   * Create optimized indexes based on query patterns
   */
  async createOptimizedIndexes(): Promise<void> {
    const collections = [
      'users',
      'teams', 
      'projects',
      'dashboards',
      'alerts',
      'auditlogs',
      'privacysettings',
      'notifications'
    ];

    for (const collectionName of collections) {
      await this.createCollectionIndexes(collectionName);
    }
  }

  private async createCollectionIndexes(collectionName: string): Promise<void> {
    const collection = this.connection.db.collection(collectionName);

    try {
      switch (collectionName) {
        case 'users':
          await this.createUserIndexes(collection);
          break;
        case 'teams':
          await this.createTeamIndexes(collection);
          break;
        case 'projects':
          await this.createProjectIndexes(collection);
          break;
        case 'dashboards':
          await this.createDashboardIndexes(collection);
          break;
        case 'alerts':
          await this.createAlertIndexes(collection);
          break;
        case 'auditlogs':
          await this.createAuditLogIndexes(collection);
          break;
        case 'privacysettings':
          await this.createPrivacySettingsIndexes(collection);
          break;
        case 'notifications':
          await this.createNotificationIndexes(collection);
          break;
      }

      this.logger.info(`Optimized indexes created for ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to create indexes for ${collectionName}:`, error);
    }
  }

  private async createUserIndexes(collection: any): Promise<void> {
    // Primary lookup indexes
    await collection.createIndex({ email: 1 }, { unique: true, background: true });
    await collection.createIndex({ id: 1 }, { unique: true, background: true });
    
    // Team membership queries
    await collection.createIndex({ teamIds: 1 }, { background: true });
    await collection.createIndex({ 'teamIds': 1, 'role': 1 }, { background: true });
    
    // Status and filtering
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ role: 1, isActive: 1 }, { background: true });
    
    // Time-based queries
    await collection.createIndex({ createdAt: 1 }, { background: true });
    await collection.createIndex({ lastLoginAt: 1 }, { background: true });
    
    // Privacy and preferences
    await collection.createIndex({ 'privacySettings.dataCollection': 1 }, { background: true });
    
    // Compound indexes for common queries
    await collection.createIndex(
      { isActive: 1, role: 1, createdAt: -1 }, 
      { background: true }
    );
    
    // Text search index
    await collection.createIndex(
      { name: 'text', email: 'text' },
      { background: true, weights: { name: 10, email: 5 } }
    );
  }

  private async createTeamIndexes(collection: any): Promise<void> {
    // Primary lookups
    await collection.createIndex({ id: 1 }, { unique: true, background: true });
    await collection.createIndex({ name: 1 }, { unique: true, background: true });
    
    // Member queries
    await collection.createIndex({ memberIds: 1 }, { background: true });
    await collection.createIndex({ 'memberIds': 1, 'isActive': 1 }, { background: true });
    
    // Project associations
    await collection.createIndex({ projectIds: 1 }, { background: true });
    
    // Status filtering
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ isActive: 1, createdAt: -1 }, { background: true });
    
    // Text search
    await collection.createIndex(
      { name: 'text', description: 'text' },
      { background: true }
    );
  }

  private async createProjectIndexes(collection: any): Promise<void> {
    // Primary lookups
    await collection.createIndex({ id: 1 }, { unique: true, background: true });
    await collection.createIndex({ name: 1, teamId: 1 }, { unique: true, background: true });
    
    // Team associations
    await collection.createIndex({ teamId: 1 }, { background: true });
    await collection.createIndex({ teamId: 1, isActive: 1 }, { background: true });
    
    // Repository information
    await collection.createIndex({ 'repository.url': 1 }, { background: true });
    await collection.createIndex({ 'repository.provider': 1 }, { background: true });
    
    // Status and time-based
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ createdAt: 1 }, { background: true });
    await collection.createIndex({ updatedAt: 1 }, { background: true });
  }

  private async createDashboardIndexes(collection: any): Promise<void> {
    // User dashboards
    await collection.createIndex({ userId: 1 }, { background: true });
    await collection.createIndex({ userId: 1, isDefault: 1 }, { background: true });
    await collection.createIndex({ userId: 1, updatedAt: -1 }, { background: true });
    
    // Team dashboards
    await collection.createIndex({ teamId: 1 }, { background: true });
    await collection.createIndex({ teamId: 1, isShared: 1 }, { background: true });
    
    // Widget queries
    await collection.createIndex({ 'widgets.type': 1 }, { background: true });
    await collection.createIndex({ 'widgets.config.dataSource': 1 }, { background: true });
    
    // Access control
    await collection.createIndex({ isPublic: 1 }, { background: true });
    await collection.createIndex({ 'permissions.userId': 1 }, { background: true });
  }

  private async createAlertIndexes(collection: any): Promise<void> {
    // User alerts
    await collection.createIndex({ userId: 1 }, { background: true });
    await collection.createIndex({ userId: 1, status: 1 }, { background: true });
    await collection.createIndex({ userId: 1, status: 1, createdAt: -1 }, { background: true });
    
    // Team alerts
    await collection.createIndex({ teamId: 1 }, { background: true });
    await collection.createIndex({ teamId: 1, severity: 1 }, { background: true });
    
    // Alert processing
    await collection.createIndex({ status: 1 }, { background: true });
    await collection.createIndex({ type: 1, status: 1 }, { background: true });
    await collection.createIndex({ severity: 1, createdAt: -1 }, { background: true });
    
    // Time-based queries
    await collection.createIndex({ createdAt: 1 }, { background: true });
    await collection.createIndex({ updatedAt: 1 }, { background: true });
    await collection.createIndex({ resolvedAt: 1 }, { background: true });
    
    // Compound index for alert dashboard
    await collection.createIndex(
      { status: 1, severity: 1, createdAt: -1 },
      { background: true }
    );
  }

  private async createAuditLogIndexes(collection: any): Promise<void> {
    // User activity
    await collection.createIndex({ userId: 1 }, { background: true });
    await collection.createIndex({ userId: 1, timestamp: -1 }, { background: true });
    
    // Resource access
    await collection.createIndex({ resource: 1 }, { background: true });
    await collection.createIndex({ resource: 1, action: 1 }, { background: true });
    
    // Time-based queries (most common for audit logs)
    await collection.createIndex({ timestamp: -1 }, { background: true });
    await collection.createIndex({ timestamp: -1, action: 1 }, { background: true });
    
    // Security monitoring
    await collection.createIndex({ action: 1, timestamp: -1 }, { background: true });
    await collection.createIndex({ ipAddress: 1, timestamp: -1 }, { background: true });
    
    // TTL index for automatic cleanup (2 years retention)
    await collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 63072000, background: true }
    );
  }

  private async createPrivacySettingsIndexes(collection: any): Promise<void> {
    // User privacy settings
    await collection.createIndex({ userId: 1 }, { unique: true, background: true });
    
    // Data collection preferences
    await collection.createIndex({ 'dataCollection.ideTelemtry': 1 }, { background: true });
    await collection.createIndex({ 'dataCollection.gitActivity': 1 }, { background: true });
    
    // Sharing preferences
    await collection.createIndex({ 'sharing.allowTeamView': 1 }, { background: true });
    
    // Retention settings
    await collection.createIndex({ 'retention.personalData': 1 }, { background: true });
  }

  private async createNotificationIndexes(collection: any): Promise<void> {
    // User notifications
    await collection.createIndex({ userId: 1 }, { background: true });
    await collection.createIndex({ userId: 1, isRead: 1 }, { background: true });
    await collection.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    
    // Notification processing
    await collection.createIndex({ status: 1 }, { background: true });
    await collection.createIndex({ type: 1, status: 1 }, { background: true });
    
    // Time-based cleanup
    await collection.createIndex({ createdAt: 1 }, { background: true });
    
    // TTL index for automatic cleanup (90 days retention)
    await collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 7776000, background: true }
    );
  }

  /**
   * Analyze index usage and provide recommendations
   */
  async analyzeIndexUsage(): Promise<IndexAnalysis[]> {
    const analyses: IndexAnalysis[] = [];
    
    try {
      const collections = await this.connection.db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collection = this.connection.db.collection(collectionInfo.name);
        const indexStats = await collection.indexStats().toArray();
        
        for (const indexStat of indexStats) {
          const analysis: IndexAnalysis = {
            collection: collectionInfo.name,
            indexName: indexStat.name,
            usage: {
              ops: indexStat.accesses?.ops || 0,
              since: indexStat.accesses?.since || new Date()
            },
            size: indexStat.size || 0,
            isUnused: (indexStat.accesses?.ops || 0) === 0,
            recommendation: this.getIndexRecommendation(indexStat)
          };
          
          analyses.push(analysis);
        }
      }
      
      return analyses;
    } catch (error) {
      this.logger.error('Index usage analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport(): any {
    const report: any = {};
    
    for (const [collection, metrics] of this.performanceMetrics.entries()) {
      const slowQueries = metrics.filter(m => m.executionTimeMs > this.slowQueryThreshold);
      
      if (slowQueries.length > 0) {
        report[collection] = {
          totalQueries: metrics.length,
          slowQueries: slowQueries.length,
          averageExecutionTime: slowQueries.reduce((sum, m) => sum + m.executionTimeMs, 0) / slowQueries.length,
          commonSuggestions: this.getCommonSuggestions(slowQueries)
        };
      }
    }
    
    return report;
  }

  private extractIndexesUsed(explainResult: any): string[] {
    const indexes: string[] = [];
    
    const extractFromStage = (stage: any) => {
      if (stage.indexName) {
        indexes.push(stage.indexName);
      }
      
      if (stage.inputStage) {
        extractFromStage(stage.inputStage);
      }
      
      if (stage.inputStages) {
        stage.inputStages.forEach(extractFromStage);
      }
    };
    
    if (explainResult.executionStats?.executionStages) {
      extractFromStage(explainResult.executionStats.executionStages);
    }
    
    return [...new Set(indexes)];
  }

  private isQueryOptimal(executionStats: any): boolean {
    const efficiency = executionStats.totalDocsReturned / Math.max(executionStats.totalDocsExamined, 1);
    return efficiency > 0.1 && executionStats.totalKeysExamined <= executionStats.totalDocsReturned * 2;
  }

  private generateOptimizationSuggestions(executionStats: any, query: any): string[] {
    const suggestions: string[] = [];
    
    // High document examination ratio
    if (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 10) {
      suggestions.push('Consider adding an index to reduce document examination');
    }
    
    // Collection scan detected
    if (executionStats.executionStages.stage === 'COLLSCAN') {
      suggestions.push('Query is performing a collection scan - add appropriate indexes');
    }
    
    // Sort without index
    if (executionStats.executionStages.stage === 'SORT' && !executionStats.executionStages.inputStage?.indexName) {
      suggestions.push('Sort operation without index - consider adding compound index with sort fields');
    }
    
    // Large result set
    if (executionStats.totalDocsReturned > 1000) {
      suggestions.push('Consider adding pagination or limiting result set size');
    }
    
    return suggestions;
  }

  private getIndexRecommendation(indexStat: any): 'keep' | 'drop' | 'optimize' {
    const ops = indexStat.accesses?.ops || 0;
    const size = indexStat.size || 0;
    
    // Never drop _id index
    if (indexStat.name === '_id_') {
      return 'keep';
    }
    
    // Unused indexes
    if (ops === 0) {
      return 'drop';
    }
    
    // Large indexes with low usage
    if (size > 100 * 1024 * 1024 && ops < 100) { // 100MB with less than 100 operations
      return 'optimize';
    }
    
    return 'keep';
  }

  private getCommonSuggestions(slowQueries: QueryPerformanceMetrics[]): string[] {
    const suggestionCounts: Map<string, number> = new Map();
    
    slowQueries.forEach(query => {
      query.suggestions.forEach(suggestion => {
        suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
      });
    });
    
    return Array.from(suggestionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([suggestion]) => suggestion);
  }
}