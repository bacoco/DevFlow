import { CacheManager } from './cache-manager';
import { CacheWarmupConfig, CachePattern } from '../types';
import { Logger } from 'winston';
import * as cron from 'node-cron';

export class CacheWarmer {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private cacheManager: CacheManager,
    private logger: Logger,
    private config: CacheWarmupConfig = {
      patterns: [],
      batchSize: 10,
      concurrency: 3
    }
  ) {}

  async warmupPattern(pattern: CachePattern): Promise<void> {
    try {
      this.logger.info(`Starting warmup for pattern: ${pattern.pattern}`);
      
      if (pattern.warmup) {
        const data = await pattern.warmup();
        await this.cacheManager.set(pattern.pattern, data, {
          ttl: pattern.ttl,
          tags: pattern.tags
        });
        
        this.logger.info(`Warmup completed for pattern: ${pattern.pattern}`);
      }
    } catch (error) {
      this.logger.error(`Warmup failed for pattern ${pattern.pattern}:`, error);
    }
  }

  async warmupPatterns(patterns: CachePattern[]): Promise<void> {
    const batches = this.createBatches(patterns, this.config.batchSize);
    
    for (const batch of batches) {
      const promises = batch.map(pattern => this.warmupPattern(pattern));
      await Promise.allSettled(promises);
    }
  }

  async warmupDashboardData(userId: string): Promise<void> {
    const patterns: CachePattern[] = [
      {
        pattern: `dashboard:${userId}:overview`,
        ttl: 300, // 5 minutes
        tags: ['dashboard', `user:${userId}`],
        warmup: async () => {
          // Simulate dashboard data loading
          return {
            widgets: [],
            layout: {},
            lastUpdated: Date.now()
          };
        }
      },
      {
        pattern: `metrics:${userId}:flow`,
        ttl: 600, // 10 minutes
        tags: ['metrics', `user:${userId}`],
        warmup: async () => {
          // Simulate flow metrics loading
          return {
            focusTime: 0,
            interruptions: 0,
            flowScore: 0
          };
        }
      }
    ];

    await this.warmupPatterns(patterns);
  }

  async warmupTeamData(teamId: string): Promise<void> {
    const patterns: CachePattern[] = [
      {
        pattern: `team:${teamId}:metrics`,
        ttl: 900, // 15 minutes
        tags: ['team', `team:${teamId}`],
        warmup: async () => {
          return {
            velocity: 0,
            quality: 0,
            collaboration: 0
          };
        }
      },
      {
        pattern: `team:${teamId}:members`,
        ttl: 1800, // 30 minutes
        tags: ['team', `team:${teamId}`],
        warmup: async () => {
          return {
            members: [],
            roles: {},
            activity: {}
          };
        }
      }
    ];

    await this.warmupPatterns(patterns);
  }

  async warmupFrequentlyAccessedData(): Promise<void> {
    const commonPatterns: CachePattern[] = [
      {
        pattern: 'global:metrics:summary',
        ttl: 1800, // 30 minutes
        tags: ['global', 'metrics'],
        warmup: async () => {
          return {
            totalUsers: 0,
            activeTeams: 0,
            totalProjects: 0
          };
        }
      },
      {
        pattern: 'system:health',
        ttl: 60, // 1 minute
        tags: ['system'],
        warmup: async () => {
          return {
            status: 'healthy',
            timestamp: Date.now()
          };
        }
      }
    ];

    await this.warmupPatterns(commonPatterns);
  }

  scheduleWarmup(schedule: string = '0 */6 * * *'): void { // Every 6 hours
    const taskId = 'cache_warmup';
    
    if (this.scheduledTasks.has(taskId)) {
      this.scheduledTasks.get(taskId)!.stop();
    }

    const task = cron.schedule(schedule, async () => {
      try {
        this.logger.info('Starting scheduled cache warmup');
        await this.warmupFrequentlyAccessedData();
        this.logger.info('Scheduled cache warmup completed');
      } catch (error) {
        this.logger.error('Scheduled cache warmup failed:', error);
      }
    }, {
      scheduled: false
    });

    this.scheduledTasks.set(taskId, task);
    task.start();

    this.logger.info(`Cache warmup scheduled with cron: ${schedule}`);
  }

  async preloadUserSession(userId: string, sessionData: any): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.cacheManager.set(sessionKey, sessionData, {
      ttl: 3600, // 1 hour
      tags: ['session', `user:${userId}`]
    });

    // Preload user preferences
    const preferencesKey = `preferences:${userId}`;
    await this.cacheManager.set(preferencesKey, sessionData.preferences || {}, {
      ttl: 7200, // 2 hours
      tags: ['preferences', `user:${userId}`]
    });
  }

  async preloadTeamContext(teamId: string, teamData: any): Promise<void> {
    const teamKey = `team:${teamId}:context`;
    await this.cacheManager.set(teamKey, teamData, {
      ttl: 1800, // 30 minutes
      tags: ['team', `team:${teamId}`]
    });
  }

  async warmupQueryResults(queries: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = queries.map(async ({ key, fetcher, ttl = 600 }) => {
      try {
        const data = await fetcher();
        await this.cacheManager.set(key, data, { ttl });
        this.logger.debug(`Warmed up query result: ${key}`);
      } catch (error) {
        this.logger.error(`Failed to warm up query result ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  stopAllScheduledWarmups(): void {
    for (const [taskId, task] of this.scheduledTasks) {
      task.stop();
      this.logger.info(`Stopped scheduled warmup: ${taskId}`);
    }
    this.scheduledTasks.clear();
  }

  updateConfig(newConfig: Partial<CacheWarmupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Cache warmup configuration updated');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async getWarmupStats(): Promise<{
    scheduledTasks: number;
    lastWarmup: number | null;
    patternsWarmed: number;
  }> {
    return {
      scheduledTasks: this.scheduledTasks.size,
      lastWarmup: null, // Could track this if needed
      patternsWarmed: this.config.patterns.length
    };
  }
}