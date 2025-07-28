export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: number;
  tags?: string[];
  compressed?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  uptime: number;
}

export interface CachePattern {
  pattern: string;
  ttl: number;
  tags?: string[];
  warmup?: () => Promise<any>;
}

export interface CacheWarmupConfig {
  patterns: CachePattern[];
  batchSize: number;
  concurrency: number;
  schedule?: string; // cron expression
}

export interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  cascade?: boolean;
}

export interface CacheClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
  }>;
  options: {
    enableReadyCheck: boolean;
    redisOptions: {
      password?: string;
      db: number;
    };
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
  };
}

export interface DashboardCacheData {
  userId: string;
  dashboardId: string;
  widgets: WidgetCacheData[];
  layout: any;
  lastUpdated: number;
}

export interface WidgetCacheData {
  widgetId: string;
  type: string;
  data: any;
  metadata: {
    queryTime: number;
    dataPoints: number;
    lastRefresh: number;
  };
}

export interface MetricsCacheData {
  metricType: string;
  timeRange: {
    start: number;
    end: number;
  };
  aggregation: string;
  filters: Record<string, any>;
  data: any[];
  computedAt: number;
}

export interface UserSessionCache {
  userId: string;
  sessionId: string;
  preferences: any;
  permissions: string[];
  lastActivity: number;
  teamIds: string[];
}

export interface QueryCacheKey {
  service: string;
  operation: string;
  parameters: Record<string, any>;
  userId?: string;
  teamId?: string;
}

export enum CacheStrategy {
  CACHE_ASIDE = 'cache_aside',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  REFRESH_AHEAD = 'refresh_ahead'
}

export enum CacheEvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  TTL = 'ttl',
  FIFO = 'fifo'
}