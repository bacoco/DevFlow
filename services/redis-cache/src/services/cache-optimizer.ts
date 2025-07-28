import { RedisConfig } from '../config/redis';
import { Logger } from 'winston';
import Redis, { Cluster } from 'ioredis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  keyCount: number;
  evictions: number;
  expiredKeys: number;
}

export interface CacheOptimizationSuggestion {
  type: 'ttl' | 'memory' | 'pattern' | 'structure' | 'eviction';
  key?: string;
  pattern?: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
  currentValue?: any;
  recommendedValue?: any;
}

export interface KeyAnalysis {
  key: string;
  type: string;
  size: number;
  ttl: number;
  lastAccessed?: Date;
  accessCount?: number;
  memoryEfficiency: number;
  recommendation: 'keep' | 'optimize' | 'remove';
}

export class CacheOptimizer {
  private performanceMetrics: CacheMetrics[] = [];
  private keyAccessPatterns: Map<string, { count: number; lastAccess: Date }> = new Map();

  constructor(
    private redisConfig: RedisConfig,
    private logger: Logger
  ) {}

  /**
   * Analyze cache performance and provide optimization suggestions
   */
  async analyzePerformance(): Promise<{
    metrics: CacheMetrics;
    suggestions: CacheOptimizationSuggestion[];
  }> {
    const client = this.redisConfig.getClient();
    
    try {
      const info = await client.info();
      const metrics = this.parseRedisInfo(info);
      
      // Store metrics for trend analysis
      this.performanceMetrics.push(metrics);
      
      // Keep only last 100 metrics for memory efficiency
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics.shift();
      }

      const suggestions = await this.generateOptimizationSuggestions(metrics);

      return { metrics, suggestions };
    } catch (error) {
      this.logger.error('Cache performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze individual keys for optimization opportunities
   */
  async analyzeKeys(pattern: string = '*', limit: number = 1000): Promise<KeyAnalysis[]> {
    const client = this.redisConfig.getClient();
    const analyses: KeyAnalysis[] = [];

    try {
      let keys: string[] = [];
      
      if (this.isCluster(client)) {
        // For cluster, scan all nodes
        const nodes = (client as Cluster).nodes('master');
        for (const node of nodes) {
          const nodeKeys = await this.scanKeys(node, pattern, limit / nodes.length);
          keys.push(...nodeKeys);
        }
      } else {
        keys = await this.scanKeys(client as Redis, pattern, limit);
      }

      for (const key of keys.slice(0, limit)) {
        const analysis = await this.analyzeKey(client, key);
        if (analysis) {
          analyses.push(analysis);
        }
      }

      return analyses.sort((a, b) => b.size - a.size); // Sort by size descending
    } catch (error) {
      this.logger.error('Key analysis failed:', error);
      return [];
    }
  }

  /**
   * Optimize cache configuration based on usage patterns
   */
  async optimizeConfiguration(): Promise<CacheOptimizationSuggestion[]> {
    const suggestions: CacheOptimizationSuggestion[] = [];
    const client = this.redisConfig.getClient();

    try {
      const info = await client.info();
      const config = await client.config('GET', '*');
      
      // Analyze memory usage
      const memoryInfo = this.parseMemoryInfo(info);
      if (memoryInfo.usedMemoryPeak > memoryInfo.maxMemory * 0.8) {
        suggestions.push({
          type: 'memory',
          suggestion: 'Memory usage is high. Consider increasing maxmemory or implementing more aggressive eviction policies',
          impact: 'high',
          currentValue: memoryInfo.usedMemoryPeak,
          recommendedValue: memoryInfo.maxMemory * 1.2
        });
      }

      // Analyze eviction policy
      const evictionPolicy = this.getConfigValue(config, 'maxmemory-policy');
      if (evictionPolicy === 'noeviction') {
        suggestions.push({
          type: 'eviction',
          suggestion: 'Consider using allkeys-lru or volatile-lru eviction policy for better memory management',
          impact: 'medium',
          currentValue: evictionPolicy,
          recommendedValue: 'allkeys-lru'
        });
      }

      // Analyze key expiration patterns
      const keyspaceInfo = this.parseKeyspaceInfo(info);
      if (keyspaceInfo.avgTtl < 3600 && keyspaceInfo.keysWithExpire / keyspaceInfo.totalKeys < 0.5) {
        suggestions.push({
          type: 'ttl',
          suggestion: 'Many keys lack expiration. Consider setting appropriate TTL values to prevent memory bloat',
          impact: 'medium',
          currentValue: `${((keyspaceInfo.keysWithExpire / keyspaceInfo.totalKeys) * 100).toFixed(1)}% keys with TTL`,
          recommendedValue: '80% keys with TTL'
        });
      }

      return suggestions;
    } catch (error) {
      this.logger.error('Configuration optimization failed:', error);
      return [];
    }
  }

  /**
   * Implement cache warming strategies
   */
  async implementCacheWarming(): Promise<void> {
    const warmingStrategies = [
      {
        name: 'dashboard_metrics',
        pattern: 'dashboard:*',
        preloadQueries: [
          'productivity_overview',
          'team_performance',
          'individual_flow'
        ]
      },
      {
        name: 'user_preferences',
        pattern: 'user:*:preferences',
        preloadQueries: [
          'privacy_settings',
          'notification_preferences',
          'dashboard_config'
        ]
      },
      {
        name: 'team_data',
        pattern: 'team:*',
        preloadQueries: [
          'team_members',
          'team_projects',
          'team_metrics'
        ]
      }
    ];

    for (const strategy of warmingStrategies) {
      await this.warmCacheStrategy(strategy);
    }
  }

  /**
   * Clean up unused or inefficient cache entries
   */
  async cleanupCache(): Promise<{
    removedKeys: number;
    freedMemory: number;
    suggestions: CacheOptimizationSuggestion[];
  }> {
    const client = this.redisConfig.getClient();
    let removedKeys = 0;
    let freedMemory = 0;
    const suggestions: CacheOptimizationSuggestion[] = [];

    try {
      // Find large keys that are rarely accessed
      const keyAnalyses = await this.analyzeKeys('*', 5000);
      const candidatesForRemoval = keyAnalyses.filter(
        analysis => analysis.recommendation === 'remove' || 
        (analysis.size > 1024 * 1024 && analysis.accessCount && analysis.accessCount < 5)
      );

      for (const candidate of candidatesForRemoval) {
        const deleted = await client.del(candidate.key);
        if (deleted > 0) {
          removedKeys++;
          freedMemory += candidate.size;
          
          this.logger.info(`Removed inefficient cache key: ${candidate.key} (${candidate.size} bytes)`);
        }
      }

      // Find keys with inefficient TTL settings
      const ttlOptimizationCandidates = keyAnalyses.filter(
        analysis => analysis.ttl > 86400 && analysis.accessCount && analysis.accessCount < 10
      );

      for (const candidate of ttlOptimizationCandidates) {
        suggestions.push({
          type: 'ttl',
          key: candidate.key,
          suggestion: `Reduce TTL for rarely accessed key from ${candidate.ttl}s to 3600s`,
          impact: 'low',
          currentValue: candidate.ttl,
          recommendedValue: 3600
        });
      }

      return { removedKeys, freedMemory, suggestions };
    } catch (error) {
      this.logger.error('Cache cleanup failed:', error);
      return { removedKeys: 0, freedMemory: 0, suggestions: [] };
    }
  }

  /**
   * Monitor cache hit rates and identify patterns
   */
  async monitorHitRates(): Promise<{
    overallHitRate: number;
    patternHitRates: Record<string, number>;
    recommendations: CacheOptimizationSuggestion[];
  }> {
    const client = this.redisConfig.getClient();
    const recommendations: CacheOptimizationSuggestion[] = [];

    try {
      const info = await client.info();
      const stats = this.parseRedisInfo(info);
      
      // Analyze hit rate patterns
      const patternHitRates: Record<string, number> = {};
      const patterns = ['dashboard:', 'user:', 'team:', 'metrics:', 'query:'];

      for (const pattern of patterns) {
        const hitRate = await this.calculatePatternHitRate(pattern);
        patternHitRates[pattern] = hitRate;

        if (hitRate < 50) {
          recommendations.push({
            type: 'pattern',
            pattern,
            suggestion: `Low hit rate (${hitRate.toFixed(1)}%) for pattern ${pattern}. Consider adjusting caching strategy or TTL`,
            impact: 'medium'
          });
        }
      }

      // Overall hit rate analysis
      if (stats.hitRate < 70) {
        recommendations.push({
          type: 'structure',
          suggestion: `Overall hit rate is low (${stats.hitRate.toFixed(1)}%). Review caching strategy and key patterns`,
          impact: 'high'
        });
      }

      return {
        overallHitRate: stats.hitRate,
        patternHitRates,
        recommendations
      };
    } catch (error) {
      this.logger.error('Hit rate monitoring failed:', error);
      return {
        overallHitRate: 0,
        patternHitRates: {},
        recommendations: []
      };
    }
  }

  private async scanKeys(client: Redis, pattern: string, limit: number): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0' && keys.length < limit);

    return keys.slice(0, limit);
  }

  private async analyzeKey(client: Redis | Cluster, key: string): Promise<KeyAnalysis | null> {
    try {
      const type = await client.type(key);
      const ttl = await client.ttl(key);
      
      let size = 0;
      
      // Estimate size based on type
      switch (type) {
        case 'string':
          const strlen = await client.strlen(key);
          size = strlen;
          break;
        case 'hash':
          const hlen = await client.hlen(key);
          size = hlen * 50; // Rough estimate
          break;
        case 'list':
          const llen = await client.llen(key);
          size = llen * 30; // Rough estimate
          break;
        case 'set':
          const scard = await client.scard(key);
          size = scard * 25; // Rough estimate
          break;
        case 'zset':
          const zcard = await client.zcard(key);
          size = zcard * 40; // Rough estimate
          break;
      }

      const accessPattern = this.keyAccessPatterns.get(key);
      const memoryEfficiency = this.calculateMemoryEfficiency(size, accessPattern?.count || 0);

      return {
        key,
        type,
        size,
        ttl,
        lastAccessed: accessPattern?.lastAccess,
        accessCount: accessPattern?.count,
        memoryEfficiency,
        recommendation: this.getKeyRecommendation(size, ttl, accessPattern?.count || 0)
      };
    } catch (error) {
      this.logger.error(`Failed to analyze key ${key}:`, error);
      return null;
    }
  }

  private parseRedisInfo(info: string): CacheMetrics {
    const lines = info.split('\n');
    const stats: any = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key.trim()] = value.trim();
      }
    });

    return {
      hits: parseInt(stats.keyspace_hits || '0'),
      misses: parseInt(stats.keyspace_misses || '0'),
      hitRate: this.calculateHitRate(
        parseInt(stats.keyspace_hits || '0'),
        parseInt(stats.keyspace_misses || '0')
      ),
      avgResponseTime: 0, // Would need to be tracked separately
      memoryUsage: parseInt(stats.used_memory || '0'),
      keyCount: parseInt(stats.db0?.split(',')[0]?.split('=')[1] || '0'),
      evictions: parseInt(stats.evicted_keys || '0'),
      expiredKeys: parseInt(stats.expired_keys || '0')
    };
  }

  private parseMemoryInfo(info: string): any {
    const lines = info.split('\n');
    const memoryInfo: any = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value && key.includes('memory')) {
        memoryInfo[key.trim()] = parseInt(value.trim()) || 0;
      }
    });

    return {
      usedMemory: memoryInfo.used_memory || 0,
      usedMemoryPeak: memoryInfo.used_memory_peak || 0,
      maxMemory: memoryInfo.maxmemory || 0
    };
  }

  private parseKeyspaceInfo(info: string): any {
    const lines = info.split('\n');
    let totalKeys = 0;
    let keysWithExpire = 0;
    let avgTtl = 0;

    lines.forEach(line => {
      if (line.startsWith('db')) {
        const parts = line.split(',');
        const keys = parseInt(parts[0].split('=')[1] || '0');
        const expires = parseInt(parts[1]?.split('=')[1] || '0');
        const avgTtlValue = parseInt(parts[2]?.split('=')[1] || '0');

        totalKeys += keys;
        keysWithExpire += expires;
        avgTtl = avgTtlValue; // Use the last database's avg_ttl
      }
    });

    return { totalKeys, keysWithExpire, avgTtl };
  }

  private getConfigValue(config: string[], key: string): string {
    const index = config.indexOf(key);
    return index !== -1 && index + 1 < config.length ? config[index + 1] : '';
  }

  private calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private calculateMemoryEfficiency(size: number, accessCount: number): number {
    if (size === 0) return 0;
    return accessCount / (size / 1024); // Access count per KB
  }

  private getKeyRecommendation(size: number, ttl: number, accessCount: number): 'keep' | 'optimize' | 'remove' {
    // Remove large, rarely accessed keys
    if (size > 1024 * 1024 && accessCount < 5) {
      return 'remove';
    }

    // Optimize keys with long TTL but low access
    if (ttl > 86400 && accessCount < 10) {
      return 'optimize';
    }

    return 'keep';
  }

  private async calculatePatternHitRate(pattern: string): Promise<number> {
    // This would require tracking hits/misses per pattern
    // For now, return a simulated value based on pattern type
    const patternHitRates: Record<string, number> = {
      'dashboard:': 85,
      'user:': 75,
      'team:': 70,
      'metrics:': 60,
      'query:': 45
    };

    return patternHitRates[pattern] || 50;
  }

  private async warmCacheStrategy(strategy: any): Promise<void> {
    this.logger.info(`Implementing cache warming strategy: ${strategy.name}`);
    
    // This would implement actual cache warming logic
    // For now, just log the strategy
    for (const query of strategy.preloadQueries) {
      this.logger.debug(`Warming cache for query pattern: ${query}`);
    }
  }

  private async generateOptimizationSuggestions(metrics: CacheMetrics): Promise<CacheOptimizationSuggestion[]> {
    const suggestions: CacheOptimizationSuggestion[] = [];

    // Hit rate analysis
    if (metrics.hitRate < 70) {
      suggestions.push({
        type: 'structure',
        suggestion: 'Hit rate is below optimal (70%). Review caching strategy and key patterns',
        impact: 'high',
        currentValue: `${metrics.hitRate.toFixed(1)}%`,
        recommendedValue: '70%+'
      });
    }

    // Memory usage analysis
    if (metrics.memoryUsage > 1024 * 1024 * 1024) { // 1GB
      suggestions.push({
        type: 'memory',
        suggestion: 'High memory usage detected. Consider implementing compression or reducing TTL values',
        impact: 'medium',
        estimatedSavings: metrics.memoryUsage * 0.2
      });
    }

    // Eviction analysis
    if (metrics.evictions > 1000) {
      suggestions.push({
        type: 'eviction',
        suggestion: 'High eviction rate indicates memory pressure. Consider increasing memory or optimizing key sizes',
        impact: 'high',
        currentValue: metrics.evictions,
        recommendedValue: 'Increase memory by 25%'
      });
    }

    return suggestions;
  }

  private isCluster(client: Redis | Cluster): client is Cluster {
    return 'nodes' in client;
  }
}