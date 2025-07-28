import mongoose from 'mongoose';
import { Logger } from 'winston';
import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  operation: string;
  collection: string;
  executionTimeMs: number;
  documentsProcessed: number;
  throughputPerSecond: number;
  memoryUsage: number;
  indexesUsed: string[];
  isOptimal: boolean;
  timestamp: Date;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  results: BenchmarkResult[];
  averageExecutionTime: number;
  totalThroughput: number;
  overallScore: number;
}

export class PerformanceBenchmarks {
  private benchmarkResults: BenchmarkResult[] = [];

  constructor(
    private logger: Logger,
    private connection: mongoose.Connection
  ) {}

  /**
   * Run comprehensive database performance benchmarks
   */
  async runFullBenchmarkSuite(): Promise<BenchmarkSuite[]> {
    const suites: BenchmarkSuite[] = [];

    // CRUD Operations Benchmark
    const crudSuite = await this.runCRUDBenchmarks();
    suites.push(crudSuite);

    // Query Performance Benchmark
    const querySuite = await this.runQueryBenchmarks();
    suites.push(querySuite);

    // Aggregation Pipeline Benchmark
    const aggregationSuite = await this.runAggregationBenchmarks();
    suites.push(aggregationSuite);

    // Index Performance Benchmark
    const indexSuite = await this.runIndexBenchmarks();
    suites.push(indexSuite);

    // Concurrent Operations Benchmark
    const concurrencySuite = await this.runConcurrencyBenchmarks();
    suites.push(concurrencySuite);

    return suites;
  }

  /**
   * Benchmark CRUD operations
   */
  private async runCRUDBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    const collection = this.connection.db.collection('benchmark_test');

    // Cleanup
    await collection.deleteMany({});

    // Insert benchmark
    const insertResult = await this.benchmarkOperation(
      'bulk_insert',
      'benchmark_test',
      async () => {
        const docs = Array.from({ length: 10000 }, (_, i) => ({
          _id: new mongoose.Types.ObjectId(),
          name: `Test Document ${i}`,
          value: Math.random() * 1000,
          category: `category_${i % 10}`,
          tags: [`tag_${i % 5}`, `tag_${(i + 1) % 5}`],
          metadata: {
            created: new Date(),
            version: 1,
            active: i % 2 === 0
          }
        }));
        
        await collection.insertMany(docs);
        return docs.length;
      }
    );
    results.push(insertResult);

    // Find by ID benchmark
    const findByIdResult = await this.benchmarkOperation(
      'find_by_id',
      'benchmark_test',
      async () => {
        const docs = await collection.find({}).limit(1000).toArray();
        let count = 0;
        
        for (const doc of docs) {
          await collection.findOne({ _id: doc._id });
          count++;
        }
        
        return count;
      }
    );
    results.push(findByIdResult);

    // Find with filter benchmark
    const findWithFilterResult = await this.benchmarkOperation(
      'find_with_filter',
      'benchmark_test',
      async () => {
        const docs = await collection.find({ 
          category: 'category_1',
          'metadata.active': true 
        }).toArray();
        return docs.length;
      }
    );
    results.push(findWithFilterResult);

    // Update benchmark
    const updateResult = await this.benchmarkOperation(
      'bulk_update',
      'benchmark_test',
      async () => {
        const result = await collection.updateMany(
          { category: 'category_1' },
          { $set: { 'metadata.updated': new Date() } }
        );
        return result.modifiedCount;
      }
    );
    results.push(updateResult);

    // Delete benchmark
    const deleteResult = await this.benchmarkOperation(
      'bulk_delete',
      'benchmark_test',
      async () => {
        const result = await collection.deleteMany({ category: 'category_9' });
        return result.deletedCount;
      }
    );
    results.push(deleteResult);

    // Cleanup
    await collection.drop();

    return this.createBenchmarkSuite('CRUD Operations', 'Basic CRUD operation performance', results);
  }

  /**
   * Benchmark query performance
   */
  private async runQueryBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    
    // Use existing collections for realistic benchmarks
    const collections = ['users', 'teams', 'projects', 'alerts'];

    for (const collectionName of collections) {
      const collection = this.connection.db.collection(collectionName);
      
      // Count documents
      const countResult = await this.benchmarkOperation(
        'count_documents',
        collectionName,
        async () => {
          const count = await collection.countDocuments({});
          return count;
        }
      );
      results.push(countResult);

      // Find with limit
      const findLimitResult = await this.benchmarkOperation(
        'find_with_limit',
        collectionName,
        async () => {
          const docs = await collection.find({}).limit(100).toArray();
          return docs.length;
        }
      );
      results.push(findLimitResult);

      // Find with sort
      const findSortResult = await this.benchmarkOperation(
        'find_with_sort',
        collectionName,
        async () => {
          const docs = await collection.find({}).sort({ createdAt: -1 }).limit(50).toArray();
          return docs.length;
        }
      );
      results.push(findSortResult);
    }

    return this.createBenchmarkSuite('Query Performance', 'Various query pattern performance', results);
  }

  /**
   * Benchmark aggregation pipelines
   */
  private async runAggregationBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];

    // User aggregation benchmark
    const userAggResult = await this.benchmarkOperation(
      'user_team_aggregation',
      'users',
      async () => {
        const pipeline = [
          { $match: { isActive: true } },
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ];
        
        const docs = await this.connection.db.collection('users').aggregate(pipeline).toArray();
        return docs.length;
      }
    );
    results.push(userAggResult);

    // Alert aggregation benchmark
    const alertAggResult = await this.benchmarkOperation(
      'alert_status_aggregation',
      'alerts',
      async () => {
        const pipeline = [
          { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
          { $group: { 
            _id: { status: '$status', severity: '$severity' },
            count: { $sum: 1 },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }},
          { $sort: { count: -1 } }
        ];
        
        const docs = await this.connection.db.collection('alerts').aggregate(pipeline).toArray();
        return docs.length;
      }
    );
    results.push(alertAggResult);

    // Complex join-like aggregation
    const complexAggResult = await this.benchmarkOperation(
      'complex_lookup_aggregation',
      'users',
      async () => {
        const pipeline = [
          { $match: { isActive: true } },
          { $lookup: {
            from: 'teams',
            localField: 'teamIds',
            foreignField: '_id',
            as: 'teams'
          }},
          { $unwind: '$teams' },
          { $group: {
            _id: '$teams.name',
            userCount: { $sum: 1 },
            roles: { $addToSet: '$role' }
          }},
          { $sort: { userCount: -1 } }
        ];
        
        const docs = await this.connection.db.collection('users').aggregate(pipeline).toArray();
        return docs.length;
      }
    );
    results.push(complexAggResult);

    return this.createBenchmarkSuite('Aggregation Pipelines', 'Complex aggregation performance', results);
  }

  /**
   * Benchmark index performance
   */
  private async runIndexBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    const collection = this.connection.db.collection('index_benchmark');

    // Cleanup and setup
    await collection.deleteMany({});
    
    // Insert test data
    const testData = Array.from({ length: 50000 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      userId: `user_${i % 1000}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      value: Math.random() * 1000,
      category: `cat_${i % 20}`,
      tags: [`tag_${i % 10}`, `tag_${(i + 1) % 10}`]
    }));
    
    await collection.insertMany(testData);

    // Benchmark without index
    const noIndexResult = await this.benchmarkOperation(
      'query_without_index',
      'index_benchmark',
      async () => {
        const docs = await collection.find({ 
          userId: 'user_500',
          category: 'cat_5'
        }).toArray();
        return docs.length;
      }
    );
    results.push(noIndexResult);

    // Create indexes
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ userId: 1, category: 1 });
    await collection.createIndex({ timestamp: -1 });

    // Benchmark with single field index
    const singleIndexResult = await this.benchmarkOperation(
      'query_with_single_index',
      'index_benchmark',
      async () => {
        const docs = await collection.find({ userId: 'user_500' }).toArray();
        return docs.length;
      }
    );
    results.push(singleIndexResult);

    // Benchmark with compound index
    const compoundIndexResult = await this.benchmarkOperation(
      'query_with_compound_index',
      'index_benchmark',
      async () => {
        const docs = await collection.find({ 
          userId: 'user_500',
          category: 'cat_5'
        }).toArray();
        return docs.length;
      }
    );
    results.push(compoundIndexResult);

    // Benchmark range query with index
    const rangeIndexResult = await this.benchmarkOperation(
      'range_query_with_index',
      'index_benchmark',
      async () => {
        const docs = await collection.find({
          timestamp: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            $lte: new Date()
          }
        }).toArray();
        return docs.length;
      }
    );
    results.push(rangeIndexResult);

    // Cleanup
    await collection.drop();

    return this.createBenchmarkSuite('Index Performance', 'Index usage and performance impact', results);
  }

  /**
   * Benchmark concurrent operations
   */
  private async runConcurrencyBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    const collection = this.connection.db.collection('concurrency_benchmark');

    // Cleanup
    await collection.deleteMany({});

    // Concurrent inserts benchmark
    const concurrentInsertsResult = await this.benchmarkOperation(
      'concurrent_inserts',
      'concurrency_benchmark',
      async () => {
        const promises = Array.from({ length: 10 }, async (_, i) => {
          const docs = Array.from({ length: 1000 }, (_, j) => ({
            _id: new mongoose.Types.ObjectId(),
            threadId: i,
            docId: j,
            value: Math.random() * 1000,
            timestamp: new Date()
          }));
          
          await collection.insertMany(docs);
          return docs.length;
        });

        const results = await Promise.all(promises);
        return results.reduce((sum, count) => sum + count, 0);
      }
    );
    results.push(concurrentInsertsResult);

    // Concurrent reads benchmark
    const concurrentReadsResult = await this.benchmarkOperation(
      'concurrent_reads',
      'concurrency_benchmark',
      async () => {
        const promises = Array.from({ length: 20 }, async (_, i) => {
          const docs = await collection.find({ threadId: i % 10 }).toArray();
          return docs.length;
        });

        const results = await Promise.all(promises);
        return results.reduce((sum, count) => sum + count, 0);
      }
    );
    results.push(concurrentReadsResult);

    // Mixed operations benchmark
    const mixedOpsResult = await this.benchmarkOperation(
      'mixed_concurrent_operations',
      'concurrency_benchmark',
      async () => {
        const promises = Array.from({ length: 15 }, async (_, i) => {
          if (i % 3 === 0) {
            // Insert
            await collection.insertOne({
              _id: new mongoose.Types.ObjectId(),
              type: 'concurrent_insert',
              value: Math.random() * 1000
            });
            return 1;
          } else if (i % 3 === 1) {
            // Update
            const result = await collection.updateMany(
              { threadId: i % 10 },
              { $set: { updated: new Date() } }
            );
            return result.modifiedCount;
          } else {
            // Read
            const docs = await collection.find({ threadId: i % 10 }).limit(100).toArray();
            return docs.length;
          }
        });

        const results = await Promise.all(promises);
        return results.reduce((sum, count) => sum + count, 0);
      }
    );
    results.push(mixedOpsResult);

    // Cleanup
    await collection.drop();

    return this.createBenchmarkSuite('Concurrency', 'Concurrent operation performance', results);
  }

  /**
   * Execute a benchmark operation and collect metrics
   */
  private async benchmarkOperation(
    operation: string,
    collection: string,
    operationFn: () => Promise<number>
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const documentsProcessed = await operationFn();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const executionTimeMs = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      const throughputPerSecond = documentsProcessed / (executionTimeMs / 1000);

      const result: BenchmarkResult = {
        operation,
        collection,
        executionTimeMs,
        documentsProcessed,
        throughputPerSecond,
        memoryUsage,
        indexesUsed: [], // Would need to be extracted from explain plan
        isOptimal: this.isPerformanceOptimal(operation, executionTimeMs, throughputPerSecond),
        timestamp: new Date()
      };

      this.benchmarkResults.push(result);
      
      this.logger.info(`Benchmark completed: ${operation}`, {
        collection,
        executionTimeMs: executionTimeMs.toFixed(2),
        documentsProcessed,
        throughputPerSecond: throughputPerSecond.toFixed(2)
      });

      return result;
    } catch (error) {
      this.logger.error(`Benchmark failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * Create a benchmark suite summary
   */
  private createBenchmarkSuite(name: string, description: string, results: BenchmarkResult[]): BenchmarkSuite {
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;
    const totalThroughput = results.reduce((sum, r) => sum + r.throughputPerSecond, 0);
    
    // Calculate overall score (higher is better)
    const overallScore = this.calculateOverallScore(results);

    return {
      name,
      description,
      results,
      averageExecutionTime,
      totalThroughput,
      overallScore
    };
  }

  /**
   * Determine if performance is optimal based on operation type
   */
  private isPerformanceOptimal(operation: string, executionTimeMs: number, throughputPerSecond: number): boolean {
    const thresholds: Record<string, { maxTime: number; minThroughput: number }> = {
      'bulk_insert': { maxTime: 5000, minThroughput: 1000 },
      'find_by_id': { maxTime: 100, minThroughput: 100 },
      'find_with_filter': { maxTime: 500, minThroughput: 50 },
      'bulk_update': { maxTime: 2000, minThroughput: 500 },
      'bulk_delete': { maxTime: 1000, minThroughput: 200 },
      'count_documents': { maxTime: 200, minThroughput: 10 },
      'find_with_limit': { maxTime: 100, minThroughput: 100 },
      'find_with_sort': { maxTime: 300, minThroughput: 50 },
      'user_team_aggregation': { maxTime: 1000, minThroughput: 10 },
      'alert_status_aggregation': { maxTime: 1500, minThroughput: 5 },
      'complex_lookup_aggregation': { maxTime: 3000, minThroughput: 5 }
    };

    const threshold = thresholds[operation] || { maxTime: 1000, minThroughput: 10 };
    return executionTimeMs <= threshold.maxTime && throughputPerSecond >= threshold.minThroughput;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(results: BenchmarkResult[]): number {
    if (results.length === 0) return 0;

    const optimalCount = results.filter(r => r.isOptimal).length;
    const optimalRatio = optimalCount / results.length;
    
    const avgThroughput = results.reduce((sum, r) => sum + r.throughputPerSecond, 0) / results.length;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;
    
    // Score based on optimal ratio (40%), throughput (30%), and execution time (30%)
    const throughputScore = Math.min(avgThroughput / 100, 1); // Normalize to 0-1
    const timeScore = Math.max(0, 1 - (avgExecutionTime / 5000)); // Normalize to 0-1 (5s max)
    
    return (optimalRatio * 0.4 + throughputScore * 0.3 + timeScore * 0.3) * 100;
  }

  /**
   * Get benchmark history and trends
   */
  getBenchmarkHistory(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): any {
    const totalBenchmarks = this.benchmarkResults.length;
    const optimalBenchmarks = this.benchmarkResults.filter(r => r.isOptimal).length;
    
    const avgExecutionTime = this.benchmarkResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / totalBenchmarks;
    const avgThroughput = this.benchmarkResults.reduce((sum, r) => sum + r.throughputPerSecond, 0) / totalBenchmarks;

    const slowestOperations = this.benchmarkResults
      .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
      .slice(0, 5);

    const fastestOperations = this.benchmarkResults
      .sort((a, b) => b.throughputPerSecond - a.throughputPerSecond)
      .slice(0, 5);

    return {
      summary: {
        totalBenchmarks,
        optimalBenchmarks,
        optimizationRate: (optimalBenchmarks / totalBenchmarks) * 100,
        avgExecutionTime,
        avgThroughput
      },
      slowestOperations: slowestOperations.map(op => ({
        operation: op.operation,
        collection: op.collection,
        executionTimeMs: op.executionTimeMs,
        throughputPerSecond: op.throughputPerSecond
      })),
      fastestOperations: fastestOperations.map(op => ({
        operation: op.operation,
        collection: op.collection,
        executionTimeMs: op.executionTimeMs,
        throughputPerSecond: op.throughputPerSecond
      })),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const slowOperations = this.benchmarkResults.filter(r => !r.isOptimal);
    
    if (slowOperations.length > 0) {
      recommendations.push(`${slowOperations.length} operations are performing below optimal thresholds`);
    }

    const avgThroughput = this.benchmarkResults.reduce((sum, r) => sum + r.throughputPerSecond, 0) / this.benchmarkResults.length;
    if (avgThroughput < 50) {
      recommendations.push('Overall throughput is low - consider adding indexes or optimizing queries');
    }

    const highMemoryOps = this.benchmarkResults.filter(r => r.memoryUsage > 50 * 1024 * 1024); // 50MB
    if (highMemoryOps.length > 0) {
      recommendations.push('Some operations use excessive memory - consider pagination or streaming');
    }

    return recommendations;
  }
}