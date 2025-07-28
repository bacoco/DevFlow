import Redis, { Cluster } from 'ioredis';
import { Logger } from 'winston';
import { CacheConfig, CacheClusterConfig } from '../types';

export class RedisConfig {
  private client: Redis | Cluster;
  private isCluster: boolean;

  constructor(
    private logger: Logger,
    private config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'devflow:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'),
      maxRetries: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true
    },
    private clusterConfig?: CacheClusterConfig
  ) {
    this.isCluster = !!clusterConfig;
    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.isCluster && this.clusterConfig) {
      this.client = new Redis.Cluster(this.clusterConfig.nodes, this.clusterConfig.options);
      this.logger.info('Redis cluster client initialized');
    } else {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableOfflineQueue: this.config.enableOfflineQueue,
        lazyConnect: this.config.lazyConnect
      });
      this.logger.info('Redis client initialized');
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error:', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis reconnecting');
    });

    if (this.isCluster) {
      (this.client as Cluster).on('node error', (error, node) => {
        this.logger.error(`Redis cluster node error on ${node.options.host}:${node.options.port}:`, error);
      });
    }
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.logger.info('Redis connection closed');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
      throw error;
    }
  }

  getClient(): Redis | Cluster {
    return this.client;
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async flushAll(): Promise<void> {
    await this.client.flushall();
    this.logger.info('Redis cache flushed');
  }

  async getInfo(): Promise<string> {
    return await this.client.info();
  }

  async getMemoryUsage(): Promise<number> {
    const info = await this.getInfo();
    const memoryLine = info.split('\n').find(line => line.startsWith('used_memory:'));
    return memoryLine ? parseInt(memoryLine.split(':')[1]) : 0;
  }

  async getKeyCount(): Promise<number> {
    if (this.isCluster) {
      // For cluster, we need to count keys across all nodes
      const nodes = (this.client as Cluster).nodes('master');
      let totalKeys = 0;
      
      for (const node of nodes) {
        const dbsize = await node.dbsize();
        totalKeys += dbsize;
      }
      
      return totalKeys;
    } else {
      return await (this.client as Redis).dbsize();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  getConfig(): CacheConfig {
    return this.config;
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Redis configuration updated');
  }
}