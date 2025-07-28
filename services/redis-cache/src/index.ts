import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';
import { RedisConfig } from './config/redis';
import { CacheManager } from './services/cache-manager';
import { CacheWarmer } from './services/cache-warmer';
import { CacheOptions, QueryCacheKey } from './types';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/redis-cache.log' })
  ]
});

class RedisCacheService {
  private app: express.Application;
  private redisConfig: RedisConfig;
  private cacheManager: CacheManager;
  private cacheWarmer: CacheWarmer;

  constructor() {
    this.app = express();
    this.redisConfig = new RedisConfig(logger);
    this.cacheManager = new CacheManager(this.redisConfig, logger);
    this.cacheWarmer = new CacheWarmer(this.cacheManager, logger);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      const isHealthy = await this.redisConfig.healthCheck();
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      });
    });

    // Cache stats
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.cacheManager.getStats();
        res.json(stats);
      } catch (error) {
        logger.error('Failed to get cache stats:', error);
        res.status(500).json({ error: 'Failed to get cache stats' });
      }
    });

    // Get cache entry
    this.app.get('/cache/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const value = await this.cacheManager.get(key);
        
        if (value === null) {
          return res.status(404).json({ error: 'Key not found' });
        }
        
        res.json({ key, value });
      } catch (error) {
        logger.error('Failed to get cache entry:', error);
        res.status(500).json({ error: 'Failed to get cache entry' });
      }
    });

    // Set cache entry
    this.app.post('/cache/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const { value, options = {} } = req.body;
        
        const success = await this.cacheManager.set(key, value, options);
        
        if (success) {
          res.json({ success: true, key });
        } else {
          res.status(500).json({ error: 'Failed to set cache entry' });
        }
      } catch (error) {
        logger.error('Failed to set cache entry:', error);
        res.status(500).json({ error: 'Failed to set cache entry' });
      }
    });

    // Delete cache entry
    this.app.delete('/cache/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const success = await this.cacheManager.delete(key);
        
        if (success) {
          res.json({ success: true, key });
        } else {
          res.status(404).json({ error: 'Key not found' });
        }
      } catch (error) {
        logger.error('Failed to delete cache entry:', error);
        res.status(500).json({ error: 'Failed to delete cache entry' });
      }
    });

    // Get multiple cache entries
    this.app.post('/cache/mget', async (req, res) => {
      try {
        const { keys } = req.body;
        
        if (!Array.isArray(keys)) {
          return res.status(400).json({ error: 'Keys must be an array' });
        }
        
        const results = await this.cacheManager.getMultiple(keys);
        res.json(results);
      } catch (error) {
        logger.error('Failed to get multiple cache entries:', error);
        res.status(500).json({ error: 'Failed to get multiple cache entries' });
      }
    });

    // Set multiple cache entries
    this.app.post('/cache/mset', async (req, res) => {
      try {
        const { entries } = req.body;
        
        if (typeof entries !== 'object') {
          return res.status(400).json({ error: 'Entries must be an object' });
        }
        
        const success = await this.cacheManager.setMultiple(entries);
        
        if (success) {
          res.json({ success: true, count: Object.keys(entries).length });
        } else {
          res.status(500).json({ error: 'Failed to set multiple cache entries' });
        }
      } catch (error) {
        logger.error('Failed to set multiple cache entries:', error);
        res.status(500).json({ error: 'Failed to set multiple cache entries' });
      }
    });

    // Invalidate by tag
    this.app.delete('/cache/tag/:tag', async (req, res) => {
      try {
        const { tag } = req.params;
        const deletedCount = await this.cacheManager.invalidateByTag(tag);
        res.json({ success: true, deletedCount, tag });
      } catch (error) {
        logger.error('Failed to invalidate by tag:', error);
        res.status(500).json({ error: 'Failed to invalidate by tag' });
      }
    });

    // Invalidate by pattern
    this.app.delete('/cache/pattern/:pattern', async (req, res) => {
      try {
        const { pattern } = req.params;
        const deletedCount = await this.cacheManager.invalidateByPattern(pattern);
        res.json({ success: true, deletedCount, pattern });
      } catch (error) {
        logger.error('Failed to invalidate by pattern:', error);
        res.status(500).json({ error: 'Failed to invalidate by pattern' });
      }
    });

    // Query cache with structured key
    this.app.post('/cache/query', async (req, res) => {
      try {
        const queryKey: QueryCacheKey = req.body;
        const key = this.cacheManager.buildQueryKey(queryKey);
        const value = await this.cacheManager.get(key);
        
        res.json({ key, value, found: value !== null });
      } catch (error) {
        logger.error('Failed to query cache:', error);
        res.status(500).json({ error: 'Failed to query cache' });
      }
    });

    // Cache dashboard data
    this.app.post('/cache/dashboard/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { dashboardData, ttl = 300 } = req.body;
        
        const key = `dashboard:${userId}`;
        const success = await this.cacheManager.set(key, dashboardData, {
          ttl,
          tags: ['dashboard', `user:${userId}`]
        });
        
        res.json({ success, key });
      } catch (error) {
        logger.error('Failed to cache dashboard data:', error);
        res.status(500).json({ error: 'Failed to cache dashboard data' });
      }
    });

    // Cache user session
    this.app.post('/cache/session/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { sessionData, ttl = 3600 } = req.body;
        
        await this.cacheWarmer.preloadUserSession(userId, sessionData);
        res.json({ success: true, userId });
      } catch (error) {
        logger.error('Failed to cache user session:', error);
        res.status(500).json({ error: 'Failed to cache user session' });
      }
    });

    // Warmup cache
    this.app.post('/warmup/user/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        await this.cacheWarmer.warmupDashboardData(userId);
        res.json({ success: true, userId });
      } catch (error) {
        logger.error('Failed to warmup user cache:', error);
        res.status(500).json({ error: 'Failed to warmup user cache' });
      }
    });

    this.app.post('/warmup/team/:teamId', async (req, res) => {
      try {
        const { teamId } = req.params;
        await this.cacheWarmer.warmupTeamData(teamId);
        res.json({ success: true, teamId });
      } catch (error) {
        logger.error('Failed to warmup team cache:', error);
        res.status(500).json({ error: 'Failed to warmup team cache' });
      }
    });

    this.app.post('/warmup/global', async (req, res) => {
      try {
        await this.cacheWarmer.warmupFrequentlyAccessedData();
        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to warmup global cache:', error);
        res.status(500).json({ error: 'Failed to warmup global cache' });
      }
    });

    // Clear cache
    this.app.delete('/cache', async (req, res) => {
      try {
        await this.cacheManager.clear();
        res.json({ success: true, message: 'Cache cleared' });
      } catch (error) {
        logger.error('Failed to clear cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
      }
    });

    // Warmup stats
    this.app.get('/warmup/stats', async (req, res) => {
      try {
        const stats = await this.cacheWarmer.getWarmupStats();
        res.json(stats);
      } catch (error) {
        logger.error('Failed to get warmup stats:', error);
        res.status(500).json({ error: 'Failed to get warmup stats' });
      }
    });
  }

  async start(port: number = 3005): Promise<void> {
    try {
      await this.redisConfig.connect();
      
      // Schedule cache warmup
      this.cacheWarmer.scheduleWarmup();
      
      this.app.listen(port, () => {
        logger.info(`Redis cache service listening on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start Redis cache service:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.cacheWarmer.stopAllScheduledWarmups();
      await this.redisConfig.disconnect();
      logger.info('Redis cache service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  getCacheWarmer(): CacheWarmer {
    return this.cacheWarmer;
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new RedisCacheService();
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  service.start();
}

export { RedisCacheService, RedisConfig, CacheManager, CacheWarmer };