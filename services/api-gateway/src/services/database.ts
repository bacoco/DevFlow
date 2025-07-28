import { MongoClient, Db, Collection } from 'mongodb';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { createClient } from 'redis';
import winston from 'winston';
import {
  User,
  Team,
  ProductivityMetric,
  FlowState,
  GitEvent,
  IDETelemetry,
  MetricType,
  TimePeriod
} from '@devflow/shared-types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class DatabaseService {
  private mongoClient: MongoClient;
  private influxClient: InfluxDB;
  private redisClient: any;
  private db: Db;
  private isConnected = false;

  constructor() {
    // MongoDB connection
    this.mongoClient = new MongoClient(
      process.env.MONGODB_URL || 'mongodb://localhost:27017/devflow'
    );

    // InfluxDB connection
    this.influxClient = new InfluxDB({
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN || 'dev-token'
    });

    // Redis connection
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  }

  async connect(): Promise<void> {
    try {
      // Connect to MongoDB
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(process.env.MONGODB_DATABASE || 'devflow');
      
      // Connect to Redis
      await this.redisClient.connect();
      
      this.isConnected = true;
      logger.info('Database connections established');
    } catch (error) {
      logger.error('Failed to connect to databases', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.mongoClient.close();
      await this.redisClient.quit();
      this.isConnected = false;
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', error);
    }
  }

  // MongoDB collections
  get users(): Collection<User> {
    return this.db.collection<User>('users');
  }

  get teams(): Collection<Team> {
    return this.db.collection<Team>('teams');
  }

  get gitEvents(): Collection<GitEvent> {
    return this.db.collection<GitEvent>('gitEvents');
  }

  get ideTelemetry(): Collection<IDETelemetry> {
    return this.db.collection<IDETelemetry>('ideTelemetry');
  }

  get dashboards(): Collection<any> {
    return this.db.collection('dashboards');
  }

  get alerts(): Collection<any> {
    return this.db.collection('alerts');
  }

  // InfluxDB methods
  async writeMetric(metric: ProductivityMetric): Promise<void> {
    const writeApi = this.influxClient.getWriteApi(
      process.env.INFLUXDB_ORG || 'devflow',
      process.env.INFLUXDB_BUCKET || 'metrics'
    );

    const point = new Point('productivity_metric')
      .tag('userId', metric.userId)
      .tag('metricType', metric.metricType)
      .tag('aggregationPeriod', metric.aggregationPeriod)
      .floatField('value', metric.value)
      .timestamp(metric.timestamp);

    if (metric.context.teamId) {
      point.tag('teamId', metric.context.teamId);
    }
    if (metric.context.projectId) {
      point.tag('projectId', metric.context.projectId);
    }
    if (metric.confidence) {
      point.floatField('confidence', metric.confidence);
    }

    writeApi.writePoint(point);
    await writeApi.close();
  }

  async writeFlowState(flowState: FlowState): Promise<void> {
    const writeApi = this.influxClient.getWriteApi(
      process.env.INFLUXDB_ORG || 'devflow',
      process.env.INFLUXDB_BUCKET || 'metrics'
    );

    const point = new Point('flow_state')
      .tag('userId', flowState.userId)
      .tag('sessionId', flowState.sessionId)
      .intField('interruptionCount', flowState.interruptionCount)
      .floatField('focusScore', flowState.focusScore)
      .intField('totalFocusTimeMs', flowState.totalFocusTimeMs)
      .floatField('deepWorkPercentage', flowState.deepWorkPercentage)
      .timestamp(flowState.startTime);

    writeApi.writePoint(point);
    await writeApi.close();
  }

  async queryMetrics(filters: {
    userId?: string;
    teamId?: string;
    type?: MetricType;
    period?: TimePeriod;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ProductivityMetric[]> {
    const queryApi = this.influxClient.getQueryApi(process.env.INFLUXDB_ORG || 'devflow');
    
    let query = `from(bucket: "${process.env.INFLUXDB_BUCKET || 'metrics'}")
      |> range(start: ${filters.startDate?.toISOString() || '-30d'}, stop: ${filters.endDate?.toISOString() || 'now()'})
      |> filter(fn: (r) => r._measurement == "productivity_metric")`;

    if (filters.userId) {
      query += `\n  |> filter(fn: (r) => r.userId == "${filters.userId}")`;
    }
    if (filters.teamId) {
      query += `\n  |> filter(fn: (r) => r.teamId == "${filters.teamId}")`;
    }
    if (filters.type) {
      query += `\n  |> filter(fn: (r) => r.metricType == "${filters.type}")`;
    }
    if (filters.period) {
      query += `\n  |> filter(fn: (r) => r.aggregationPeriod == "${filters.period}")`;
    }

    query += `\n  |> sort(columns: ["_time"], desc: true)`;
    
    if (filters.limit) {
      query += `\n  |> limit(n: ${filters.limit})`;
    }

    const results: ProductivityMetric[] = [];
    
    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const record = tableMeta.toObject(row);
          results.push({
            id: `${record.userId}-${record._time}`,
            userId: record.userId,
            metricType: record.metricType as MetricType,
            value: record._value,
            timestamp: new Date(record._time),
            aggregationPeriod: record.aggregationPeriod as TimePeriod,
            context: {
              teamId: record.teamId,
              projectId: record.projectId
            },
            confidence: record.confidence
          });
        },
        error: (error) => {
          logger.error('InfluxDB query error', error);
          reject(error);
        },
        complete: () => {
          resolve(results);
        }
      });
    });
  }

  async queryFlowStates(filters: {
    userId?: string;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<FlowState[]> {
    const queryApi = this.influxClient.getQueryApi(process.env.INFLUXDB_ORG || 'devflow');
    
    let query = `from(bucket: "${process.env.INFLUXDB_BUCKET || 'metrics'}")
      |> range(start: ${filters.startDate?.toISOString() || '-30d'}, stop: ${filters.endDate?.toISOString() || 'now()'})
      |> filter(fn: (r) => r._measurement == "flow_state")`;

    if (filters.userId) {
      query += `\n  |> filter(fn: (r) => r.userId == "${filters.userId}")`;
    }

    query += `\n  |> sort(columns: ["_time"], desc: true)`;
    
    if (filters.limit) {
      query += `\n  |> limit(n: ${filters.limit})`;
    }

    const results: FlowState[] = [];
    
    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const record = tableMeta.toObject(row);
          results.push({
            userId: record.userId,
            sessionId: record.sessionId,
            startTime: new Date(record._time),
            endTime: undefined, // Would need additional logic to determine end time
            interruptionCount: record.interruptionCount,
            focusScore: record.focusScore,
            activities: [], // Would need to query separately or store differently
            totalFocusTimeMs: record.totalFocusTimeMs,
            deepWorkPercentage: record.deepWorkPercentage
          });
        },
        error: (error) => {
          logger.error('InfluxDB query error', error);
          reject(error);
        },
        complete: () => {
          resolve(results);
        }
      });
    });
  }

  // Redis caching methods
  async cacheGet(key: string): Promise<any> {
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  async cacheSet(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  async cacheDelete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error', { key, error });
    }
  }

  // Health check
  async healthCheck(): Promise<{ mongodb: boolean; influxdb: boolean; redis: boolean }> {
    const health = {
      mongodb: false,
      influxdb: false,
      redis: false
    };

    try {
      await this.db.admin().ping();
      health.mongodb = true;
    } catch (error) {
      logger.error('MongoDB health check failed', error);
    }

    try {
      const healthApi = this.influxClient.getHealthApi();
      await healthApi.getHealth();
      health.influxdb = true;
    } catch (error) {
      logger.error('InfluxDB health check failed', error);
    }

    try {
      await this.redisClient.ping();
      health.redis = true;
    } catch (error) {
      logger.error('Redis health check failed', error);
    }

    return health;
  }
}

// Singleton instance
export const databaseService = new DatabaseService();