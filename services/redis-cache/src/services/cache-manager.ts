import { RedisConfig } from '../config/redis';
import { CacheOptions, CacheEntry, CacheStats, QueryCacheKey, CacheStrategy } from '../types';
import { Logger } from 'winston';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class CacheManager {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    memoryUsage: 0,
    keyCount: 0,
    uptime: Date.now()
  };

  constructor(
    private redisConfig: RedisConfig,
    private logger: Logger,
    private strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
  ) {}

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      
      const cached = await client.get(fullKey);
      
      if (cached === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if entry has expired (additional TTL check)
      if (entry.ttl > 0 && Date.now() - entry.createdAt > entry.ttl * 1000) {
        await this.delete(key);
        return null;
      }

      let value = entry.value;

      // Decompress if needed
      if (entry.compressed && typeof value === 'string') {
        const buffer = Buffer.from(value, 'base64');
        const decompressed = await gunzip(buffer);
        value = JSON.parse(decompressed.toString());
      }

      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      const ttl = options.ttl || this.redisConfig.getConfig().defaultTTL;

      let processedValue = value;

      // Compress if enabled and value is large
      if (options.compress && this.shouldCompress(value)) {
        const serialized = JSON.stringify(value);
        const compressed = await gzip(Buffer.from(serialized));
        processedValue = compressed.toString('base64') as any;
      }

      const entry: CacheEntry<T> = {
        value: processedValue,
        ttl,
        createdAt: Date.now(),
        tags: options.tags,
        compressed: options.compress && this.shouldCompress(value)
      };

      const serialized = JSON.stringify(entry);
      
      if (ttl > 0) {
        await client.setex(fullKey, ttl, serialized);
      } else {
        await client.set(fullKey, serialized);
      }

      // Set tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.setTags(fullKey, options.tags);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      
      const result = await client.del(fullKey);
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      
      const result = await client.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      
      return await client.incrby(fullKey, amount);
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const client = this.redisConfig.getClient();
      const fullKey = this.buildKey(key);
      
      const result = await client.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const client = this.redisConfig.getClient();
      const fullKeys = keys.map(key => this.buildKey(key));
      
      const results = await client.mget(...fullKeys);
      const response: Record<string, T | null> = {};

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const cached = results[i];
        
        if (cached === null) {
          response[key] = null;
          this.stats.misses++;
        } else {
          try {
            const entry: CacheEntry<T> = JSON.parse(cached);
            
            let value = entry.value;
            if (entry.compressed && typeof value === 'string') {
              const buffer = Buffer.from(value, 'base64');
              const decompressed = await gunzip(buffer);
              value = JSON.parse(decompressed.toString());
            }
            
            response[key] = value;
            this.stats.hits++;
          } catch (parseError) {
            response[key] = null;
            this.stats.misses++;
          }
        }
      }

      this.updateHitRate();
      return response;
    } catch (error) {
      this.logger.error('Cache getMultiple error:', error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  async setMultiple<T>(entries: Record<string, { value: T; options?: CacheOptions }>): Promise<boolean> {
    try {
      const client = this.redisConfig.getClient();
      const pipeline = client.pipeline();

      for (const [key, { value, options = {} }] of Object.entries(entries)) {
        const fullKey = this.buildKey(key);
        const ttl = options.ttl || this.redisConfig.getConfig().defaultTTL;

        let processedValue = value;
        if (options.compress && this.shouldCompress(value)) {
          const serialized = JSON.stringify(value);
          const compressed = await gzip(Buffer.from(serialized));
          processedValue = compressed.toString('base64') as any;
        }

        const entry: CacheEntry<T> = {
          value: processedValue,
          ttl,
          createdAt: Date.now(),
          tags: options.tags,
          compressed: options.compress && this.shouldCompress(value)
        };

        const serialized = JSON.stringify(entry);
        
        if (ttl > 0) {
          pipeline.setex(fullKey, ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }

        if (options.tags && options.tags.length > 0) {
          await this.setTags(fullKey, options.tags);
        }
      }

      await pipeline.exec();
      this.stats.sets += Object.keys(entries).length;
      return true;
    } catch (error) {
      this.logger.error('Cache setMultiple error:', error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const client = this.redisConfig.getClient();
      const tagKey = `tag:${tag}`;
      
      const keys = await client.smembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = client.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(tagKey);
      
      const results = await pipeline.exec();
      const deletedCount = results?.filter(([err, result]) => !err && result === 1).length || 0;
      
      this.stats.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache invalidateByTag error for tag ${tag}:`, error);
      return 0;
    }
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const client = this.redisConfig.getClient();
      const fullPattern = this.buildKey(pattern);
      
      const keys = await client.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      this.logger.error(`Cache invalidateByPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const memoryUsage = await this.redisConfig.getMemoryUsage();
      const keyCount = await this.redisConfig.getKeyCount();
      
      return {
        ...this.stats,
        memoryUsage,
        keyCount,
        uptime: Date.now() - this.stats.uptime
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return this.stats;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redisConfig.getClient().flushall();
      this.resetStats();
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      throw error;
    }
  }

  buildQueryKey(queryKey: QueryCacheKey): string {
    const parts = [
      queryKey.service,
      queryKey.operation,
      JSON.stringify(queryKey.parameters)
    ];

    if (queryKey.userId) parts.push(`user:${queryKey.userId}`);
    if (queryKey.teamId) parts.push(`team:${queryKey.teamId}`);

    return parts.join(':');
  }

  private buildKey(key: string): string {
    const prefix = this.redisConfig.getConfig().keyPrefix;
    return `${prefix}${key}`;
  }

  private async setTags(key: string, tags: string[]): Promise<void> {
    const client = this.redisConfig.getClient();
    const pipeline = client.pipeline();
    
    tags.forEach(tag => {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
    });
    
    await pipeline.exec();
  }

  private shouldCompress(value: any): boolean {
    const serialized = JSON.stringify(value);
    return serialized.length > 1024; // Compress if larger than 1KB
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      keyCount: 0,
      uptime: Date.now()
    };
  }
}