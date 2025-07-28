import { RedisConfig } from '../config/redis';
import { CacheManager } from '../services/cache-manager';
import { CacheWarmer } from '../services/cache-warmer';
import { mockLogger } from './setup';

describe('Redis Cache Performance Tests', () => {
  let redisConfig: RedisConfig;
  let cacheManager: CacheManager;
  let cacheWarmer: CacheWarmer;

  beforeEach(() => {
    redisConfig = new RedisConfig(mockLogger);
    cacheManager = new CacheManager(redisConfig, mockLogger);
    cacheWarmer = new CacheWarmer(cacheManager, mockLogger);
  });

  describe('Cache Manager Performance', () => {
    it('should handle high-volume cache operations efficiently', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.get as jest.Mock).mockResolvedValue(JSON.stringify({
        value: 'test-value',
        ttl: 3600,
        createdAt: Date.now(),
        compressed: false
      }));
      (mockClient.set as jest.Mock).mockResolvedValue('OK');
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');

      const operations = 1000;
      const startTime = Date.now();

      // Test concurrent get operations
      const getPromises = Array.from({ length: operations }, (_, i) =>
        cacheManager.get(`test-key-${i}`)
      );

      await Promise.all(getPromises);
      const getTime = Date.now() - startTime;

      expect(getTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockClient.get).toHaveBeenCalledTimes(operations);

      // Test concurrent set operations
      const setStartTime = Date.now();
      const setPromises = Array.from({ length: operations }, (_, i) =>
        cacheManager.set(`test-key-${i}`, `value-${i}`, { ttl: 300 })
      );

      await Promise.all(setPromises);
      const setTime = Date.now() - setStartTime;

      expect(setTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should efficiently handle batch operations', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.mget as jest.Mock).mockResolvedValue(
        Array.from({ length: 100 }, () => JSON.stringify({
          value: 'batch-value',
          ttl: 3600,
          createdAt: Date.now(),
          compressed: false
        }))
      );

      const mockPipeline = {
        set: jest.fn(),
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      (mockClient.pipeline as jest.Mock).mockReturnValue(mockPipeline);

      const keys = Array.from({ length: 100 }, (_, i) => `batch-key-${i}`);
      
      const startTime = Date.now();
      const results = await cacheManager.getMultiple(keys);
      const batchGetTime = Date.now() - startTime;

      expect(batchGetTime).toBeLessThan(100); // Should complete within 100ms
      expect(Object.keys(results)).toHaveLength(100);

      // Test batch set
      const entries = keys.reduce((acc, key, i) => ({
        ...acc,
        [key]: { value: `batch-value-${i}`, options: { ttl: 300 } }
      }), {});

      const setBatchStartTime = Date.now();
      await cacheManager.setMultiple(entries);
      const batchSetTime = Date.now() - setBatchStartTime;

      expect(batchSetTime).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle compression efficiently for large data', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');

      // Create large data object
      const largeData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          data: Array.from({ length: 100 }, (_, j) => `data-${j}`)
        }))
      };

      const startTime = Date.now();
      await cacheManager.set('large-data', largeData, { 
        ttl: 600, 
        compress: true 
      });
      const compressionTime = Date.now() - startTime;

      expect(compressionTime).toBeLessThan(500); // Should complete within 500ms
      expect(mockClient.setex).toHaveBeenCalled();
    });

    it('should maintain performance under concurrent access', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.get as jest.Mock).mockResolvedValue(JSON.stringify({
        value: 'concurrent-value',
        ttl: 3600,
        createdAt: Date.now(),
        compressed: false
      }));
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');
      (mockClient.del as jest.Mock).mockResolvedValue(1);

      const concurrentOperations = 50;
      const operations = [];

      // Mix of different operations
      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(cacheManager.get(`concurrent-key-${i}`));
        operations.push(cacheManager.set(`concurrent-key-${i}`, `value-${i}`));
        operations.push(cacheManager.exists(`concurrent-key-${i}`));
        if (i % 10 === 0) {
          operations.push(cacheManager.delete(`concurrent-key-${i}`));
        }
      }

      const startTime = Date.now();
      await Promise.allSettled(operations);
      const concurrentTime = Date.now() - startTime;

      expect(concurrentTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently invalidate cache by tags', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.smembers as jest.Mock).mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => `tagged-key-${i}`)
      );

      const mockPipeline = {
        del: jest.fn(),
        exec: jest.fn().mockResolvedValue(Array.from({ length: 101 }, () => [null, 1]))
      };
      (mockClient.pipeline as jest.Mock).mockReturnValue(mockPipeline);

      const startTime = Date.now();
      const deletedCount = await cacheManager.invalidateByTag('test-tag');
      const invalidationTime = Date.now() - startTime;

      expect(invalidationTime).toBeLessThan(100); // Should complete within 100ms
      expect(deletedCount).toBe(101); // 100 keys + 1 tag key
    });

    it('should provide accurate performance statistics', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ value: 'hit', ttl: 3600, createdAt: Date.now() }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ value: 'hit2', ttl: 3600, createdAt: Date.now() }));

      // Perform operations to generate stats
      await cacheManager.get('hit-key');
      await cacheManager.get('miss-key');
      await cacheManager.get('hit-key-2');

      const stats = await cacheManager.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.66666666666666); // 2/3 * 100
      expect(stats.memoryUsage).toBe(1024);
      expect(stats.keyCount).toBe(10);
    });
  });

  describe('Cache Warmer Performance', () => {
    it('should warm up cache patterns efficiently', async () => {
      const patterns = Array.from({ length: 20 }, (_, i) => ({
        pattern: `warmup-pattern-${i}`,
        ttl: 600,
        tags: [`tag-${i}`],
        warmup: async () => ({ data: `warmed-data-${i}` })
      }));

      const mockClient = redisConfig.getClient();
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');

      const startTime = Date.now();
      await cacheWarmer.warmupPatterns(patterns);
      const warmupTime = Date.now() - startTime;

      expect(warmupTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle warmup failures gracefully', async () => {
      const patterns = [
        {
          pattern: 'success-pattern',
          ttl: 600,
          warmup: async () => ({ data: 'success' })
        },
        {
          pattern: 'failure-pattern',
          ttl: 600,
          warmup: async () => {
            throw new Error('Warmup failed');
          }
        },
        {
          pattern: 'success-pattern-2',
          ttl: 600,
          warmup: async () => ({ data: 'success-2' })
        }
      ];

      const mockClient = redisConfig.getClient();
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');

      const startTime = Date.now();
      await cacheWarmer.warmupPatterns(patterns);
      const warmupTime = Date.now() - startTime;

      expect(warmupTime).toBeLessThan(1000); // Should complete within 1 second
      // Should not throw error despite one pattern failing
    });

    it('should efficiently preload user session data', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');

      const sessionData = {
        userId: 'user123',
        preferences: { theme: 'dark', language: 'en' },
        permissions: ['read', 'write'],
        teamIds: ['team1', 'team2']
      };

      const startTime = Date.now();
      await cacheWarmer.preloadUserSession('user123', sessionData);
      const preloadTime = Date.now() - startTime;

      expect(preloadTime).toBeLessThan(100); // Should complete within 100ms
      expect(mockClient.setex).toHaveBeenCalledTimes(2); // session + preferences
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory-intensive operations without degradation', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.setex as jest.Mock).mockResolvedValue('OK');
      (mockClient.get as jest.Mock).mockResolvedValue(JSON.stringify({
        value: 'memory-test',
        ttl: 3600,
        createdAt: Date.now(),
        compressed: false
      }));

      // Simulate memory-intensive operations
      const memoryIntensiveData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: Array.from({ length: 1000 }, (_, j) => `item-${i}-${j}`)
      }));

      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(cacheManager.set(`memory-key-${i}`, memoryIntensiveData));
        operations.push(cacheManager.get(`memory-key-${i}`));
      }

      const startTime = Date.now();
      await Promise.allSettled(operations);
      const memoryTestTime = Date.now() - startTime;

      expect(memoryTestTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should efficiently manage cache eviction', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.keys as jest.Mock).mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => `eviction-key-${i}`)
      );
      (mockClient.del as jest.Mock).mockResolvedValue(1000);

      const startTime = Date.now();
      const deletedCount = await cacheManager.invalidateByPattern('eviction-*');
      const evictionTime = Date.now() - startTime;

      expect(evictionTime).toBeLessThan(200); // Should complete within 200ms
      expect(deletedCount).toBe(1000);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const mockClient = redisConfig.getClient();
      (mockClient.get as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      (mockClient.set as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(cacheManager.get(`error-key-${i}`));
        operations.push(cacheManager.set(`error-key-${i}`, `value-${i}`));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const errorHandlingTime = Date.now() - startTime;

      expect(errorHandlingTime).toBeLessThan(1000); // Should complete within 1 second
      
      // All get operations should return null (graceful failure)
      const getResults = results.filter((_, i) => i % 2 === 0);
      getResults.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect((result as any).value).toBeNull();
      });

      // All set operations should return false (graceful failure)
      const setResults = results.filter((_, i) => i % 2 === 1);
      setResults.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect((result as any).value).toBe(false);
      });
    });
  });
});