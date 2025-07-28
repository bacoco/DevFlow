import { Logger } from '../utils/logger';
import { MongoClient } from 'mongodb';
import { InfluxDB, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { RedisClient } from 'redis';
import { EventEmitter } from 'events';

export interface ReplicationConfig {
  regions: RegionConfig[];
  syncInterval: number;
  conflictResolution: 'last-write-wins' | 'manual' | 'timestamp-based';
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export interface RegionConfig {
  name: string;
  primary: boolean;
  databases: {
    mongodb: {
      url: string;
      database: string;
    };
    influxdb: {
      url: string;
      token: string;
      org: string;
      bucket: string;
    };
    redis: {
      url: string;
    };
  };
  network: {
    latency: number;
    bandwidth: number;
  };
}

export interface ReplicationStatus {
  region: string;
  status: 'healthy' | 'degraded' | 'failed';
  lastSync: Date;
  lag: number;
  error?: string;
  metrics: {
    documentsReplicated: number;
    dataPointsReplicated: number;
    keysReplicated: number;
    bytesTransferred: number;
  };
}

export interface ConflictRecord {
  id: string;
  timestamp: Date;
  database: string;
  collection: string;
  documentId: string;
  sourceRegion: string;
  targetRegion: string;
  conflictType: 'update' | 'delete' | 'create';
  sourceData: any;
  targetData: any;
  resolution: 'pending' | 'resolved' | 'manual';
}

export class CrossRegionReplication extends EventEmitter {
  private config: ReplicationConfig;
  private logger: Logger;
  private replicationStatus: Map<string, ReplicationStatus>;
  private conflicts: ConflictRecord[];
  private syncIntervals: Map<string, NodeJS.Timeout>;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ReplicationConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.replicationStatus = new Map();
    this.conflicts = [];
    this.syncIntervals = new Map();

    this.initializeReplicationStatus();
    this.startHealthMonitoring();
  }

  async startReplication(): Promise<void> {
    this.logger.info('Starting cross-region replication');

    const primaryRegion = this.config.regions.find(r => r.primary);
    if (!primaryRegion) {
      throw new Error('No primary region configured');
    }

    // Start replication for each secondary region
    for (const region of this.config.regions) {
      if (!region.primary) {
        await this.startRegionReplication(primaryRegion, region);
      }
    }

    this.emit('replication-started');
  }

  async stopReplication(): Promise<void> {
    this.logger.info('Stopping cross-region replication');

    // Clear all sync intervals
    for (const [region, interval] of this.syncIntervals) {
      clearInterval(interval);
      this.syncIntervals.delete(region);
    }

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.emit('replication-stopped');
  }

  async switchPrimaryRegion(newPrimaryRegion: string): Promise<void> {
    this.logger.info(`Switching primary region to ${newPrimaryRegion}`);

    const currentPrimary = this.config.regions.find(r => r.primary);
    const newPrimary = this.config.regions.find(r => r.name === newPrimaryRegion);

    if (!newPrimary) {
      throw new Error(`Region ${newPrimaryRegion} not found`);
    }

    // Stop current replication
    await this.stopReplication();

    // Update region configurations
    if (currentPrimary) {
      currentPrimary.primary = false;
    }
    newPrimary.primary = true;

    // Restart replication with new primary
    await this.startReplication();

    this.emit('primary-region-switched', {
      from: currentPrimary?.name,
      to: newPrimaryRegion
    });
  }

  getReplicationStatus(): ReplicationStatus[] {
    return Array.from(this.replicationStatus.values());
  }

  getConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  async resolveConflict(conflictId: string, resolution: any): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    this.logger.info(`Resolving conflict ${conflictId}`, { resolution });

    try {
      await this.applyConflictResolution(conflict, resolution);
      conflict.resolution = 'resolved';
      
      this.emit('conflict-resolved', conflict);
    } catch (error) {
      this.logger.error(`Failed to resolve conflict ${conflictId}`, { error });
      throw error;
    }
  }

  private async startRegionReplication(primary: RegionConfig, secondary: RegionConfig): Promise<void> {
    this.logger.info(`Starting replication from ${primary.name} to ${secondary.name}`);

    const syncInterval = setInterval(async () => {
      try {
        await this.syncRegion(primary, secondary);
      } catch (error) {
        this.logger.error(`Replication sync failed for ${secondary.name}`, { error });
        this.updateReplicationStatus(secondary.name, 'failed', error.toString());
      }
    }, this.config.syncInterval);

    this.syncIntervals.set(secondary.name, syncInterval);

    // Perform initial sync
    await this.syncRegion(primary, secondary);
  }

  private async syncRegion(primary: RegionConfig, secondary: RegionConfig): Promise<void> {
    const startTime = Date.now();
    const status = this.replicationStatus.get(secondary.name)!;

    try {
      // Sync MongoDB
      const mongoMetrics = await this.syncMongoDB(primary, secondary, status.lastSync);
      
      // Sync InfluxDB
      const influxMetrics = await this.syncInfluxDB(primary, secondary, status.lastSync);
      
      // Sync Redis
      const redisMetrics = await this.syncRedis(primary, secondary, status.lastSync);

      // Update replication status
      const lag = Date.now() - startTime;
      this.updateReplicationStatus(secondary.name, 'healthy', undefined, {
        documentsReplicated: mongoMetrics.documentsReplicated,
        dataPointsReplicated: influxMetrics.dataPointsReplicated,
        keysReplicated: redisMetrics.keysReplicated,
        bytesTransferred: mongoMetrics.bytesTransferred + influxMetrics.bytesTransferred + redisMetrics.bytesTransferred
      }, lag);

      this.emit('region-synced', {
        region: secondary.name,
        duration: lag,
        metrics: {
          mongodb: mongoMetrics,
          influxdb: influxMetrics,
          redis: redisMetrics
        }
      });

    } catch (error) {
      this.updateReplicationStatus(secondary.name, 'failed', error.toString());
      throw error;
    }
  }

  private async syncMongoDB(primary: RegionConfig, secondary: RegionConfig, lastSync: Date): Promise<any> {
    const primaryClient = new MongoClient(primary.databases.mongodb.url);
    const secondaryClient = new MongoClient(secondary.databases.mongodb.url);

    try {
      await primaryClient.connect();
      await secondaryClient.connect();

      const primaryDb = primaryClient.db(primary.databases.mongodb.database);
      const secondaryDb = secondaryClient.db(secondary.databases.mongodb.database);

      let documentsReplicated = 0;
      let bytesTransferred = 0;

      // Get list of collections
      const collections = await primaryDb.listCollections().toArray();

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        const primaryCollection = primaryDb.collection(collectionName);
        const secondaryCollection = secondaryDb.collection(collectionName);

        // Find documents modified since last sync
        const modifiedDocs = await primaryCollection.find({
          $or: [
            { updatedAt: { $gt: lastSync } },
            { createdAt: { $gt: lastSync } }
          ]
        }).toArray();

        for (const doc of modifiedDocs) {
          try {
            // Check for conflicts
            const existingDoc = await secondaryCollection.findOne({ _id: doc._id });
            
            if (existingDoc && this.hasConflict(doc, existingDoc)) {
              await this.handleConflict('mongodb', collectionName, doc, existingDoc, primary.name, secondary.name);
            } else {
              // Upsert document
              await secondaryCollection.replaceOne(
                { _id: doc._id },
                doc,
                { upsert: true }
              );
              
              documentsReplicated++;
              bytesTransferred += JSON.stringify(doc).length;
            }
          } catch (error) {
            this.logger.error(`Failed to replicate document ${doc._id}`, { error });
          }
        }
      }

      return { documentsReplicated, bytesTransferred };

    } finally {
      await primaryClient.close();
      await secondaryClient.close();
    }
  }

  private async syncInfluxDB(primary: RegionConfig, secondary: RegionConfig, lastSync: Date): Promise<any> {
    const primaryInflux = new InfluxDB({
      url: primary.databases.influxdb.url,
      token: primary.databases.influxdb.token
    });

    const secondaryInflux = new InfluxDB({
      url: secondary.databases.influxdb.url,
      token: secondary.databases.influxdb.token
    });

    const primaryQuery = primaryInflux.getQueryApi(primary.databases.influxdb.org);
    const secondaryWrite = secondaryInflux.getWriteApi(
      secondary.databases.influxdb.org,
      secondary.databases.influxdb.bucket
    );

    try {
      let dataPointsReplicated = 0;
      let bytesTransferred = 0;

      // Query data since last sync
      const query = `
        from(bucket: "${primary.databases.influxdb.bucket}")
          |> range(start: ${lastSync.toISOString()})
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;

      const data = await primaryQuery.collectRows(query);

      // Write data to secondary region
      for (const row of data) {
        try {
          const point = {
            measurement: row._measurement,
            tags: Object.keys(row)
              .filter(key => !key.startsWith('_') && key !== 'result' && key !== 'table')
              .reduce((tags, key) => {
                tags[key] = row[key];
                return tags;
              }, {} as any),
            fields: Object.keys(row)
              .filter(key => key.startsWith('_value') || (!key.startsWith('_') && key !== 'result' && key !== 'table'))
              .reduce((fields, key) => {
                if (key.startsWith('_value')) {
                  fields[key.replace('_value_', '')] = row[key];
                }
                return fields;
              }, {} as any),
            timestamp: new Date(row._time)
          };

          secondaryWrite.writePoint(point);
          dataPointsReplicated++;
          bytesTransferred += JSON.stringify(point).length;
        } catch (error) {
          this.logger.error('Failed to replicate InfluxDB point', { error, row });
        }
      }

      await secondaryWrite.flush();

      return { dataPointsReplicated, bytesTransferred };

    } finally {
      secondaryWrite.close();
    }
  }

  private async syncRedis(primary: RegionConfig, secondary: RegionConfig, lastSync: Date): Promise<any> {
    const primaryClient = new RedisClient({ url: primary.databases.redis.url });
    const secondaryClient = new RedisClient({ url: secondary.databases.redis.url });

    try {
      await primaryClient.connect();
      await secondaryClient.connect();

      let keysReplicated = 0;
      let bytesTransferred = 0;

      // Get all keys (in production, this should be done more efficiently)
      const keys = await primaryClient.keys('*');

      for (const key of keys) {
        try {
          const type = await primaryClient.type(key);
          const ttl = await primaryClient.ttl(key);
          
          let value: any;
          let size = 0;

          switch (type) {
            case 'string':
              value = await primaryClient.get(key);
              size = value ? value.length : 0;
              if (value !== null) {
                await secondaryClient.set(key, value);
                if (ttl > 0) {
                  await secondaryClient.expire(key, ttl);
                }
              }
              break;

            case 'hash':
              value = await primaryClient.hGetAll(key);
              size = JSON.stringify(value).length;
              if (Object.keys(value).length > 0) {
                await secondaryClient.hSet(key, value);
                if (ttl > 0) {
                  await secondaryClient.expire(key, ttl);
                }
              }
              break;

            case 'list':
              value = await primaryClient.lRange(key, 0, -1);
              size = JSON.stringify(value).length;
              if (value.length > 0) {
                await secondaryClient.del(key);
                await secondaryClient.lPush(key, ...value.reverse());
                if (ttl > 0) {
                  await secondaryClient.expire(key, ttl);
                }
              }
              break;

            case 'set':
              value = await primaryClient.sMembers(key);
              size = JSON.stringify(value).length;
              if (value.length > 0) {
                await secondaryClient.del(key);
                await secondaryClient.sAdd(key, value);
                if (ttl > 0) {
                  await secondaryClient.expire(key, ttl);
                }
              }
              break;

            case 'zset':
              value = await primaryClient.zRangeWithScores(key, 0, -1);
              size = JSON.stringify(value).length;
              if (value.length > 0) {
                await secondaryClient.del(key);
                const members = value.map(item => ({ score: item.score, value: item.value }));
                await secondaryClient.zAdd(key, members);
                if (ttl > 0) {
                  await secondaryClient.expire(key, ttl);
                }
              }
              break;
          }

          keysReplicated++;
          bytesTransferred += size;

        } catch (error) {
          this.logger.error(`Failed to replicate Redis key ${key}`, { error });
        }
      }

      return { keysReplicated, bytesTransferred };

    } finally {
      await primaryClient.disconnect();
      await secondaryClient.disconnect();
    }
  }

  private hasConflict(primaryDoc: any, secondaryDoc: any): boolean {
    // Simple conflict detection based on timestamps
    if (primaryDoc.updatedAt && secondaryDoc.updatedAt) {
      return primaryDoc.updatedAt.getTime() !== secondaryDoc.updatedAt.getTime();
    }
    
    // If no timestamps, compare document content
    const primaryContent = JSON.stringify(primaryDoc);
    const secondaryContent = JSON.stringify(secondaryDoc);
    
    return primaryContent !== secondaryContent;
  }

  private async handleConflict(
    database: string,
    collection: string,
    primaryDoc: any,
    secondaryDoc: any,
    sourceRegion: string,
    targetRegion: string
  ): Promise<void> {
    const conflict: ConflictRecord = {
      id: this.generateConflictId(),
      timestamp: new Date(),
      database,
      collection,
      documentId: primaryDoc._id || primaryDoc.id,
      sourceRegion,
      targetRegion,
      conflictType: 'update',
      sourceData: primaryDoc,
      targetData: secondaryDoc,
      resolution: 'pending'
    };

    this.conflicts.push(conflict);

    // Apply automatic conflict resolution if configured
    if (this.config.conflictResolution !== 'manual') {
      await this.applyAutomaticConflictResolution(conflict);
    }

    this.emit('conflict-detected', conflict);
  }

  private async applyAutomaticConflictResolution(conflict: ConflictRecord): Promise<void> {
    switch (this.config.conflictResolution) {
      case 'last-write-wins':
        const primaryTime = conflict.sourceData.updatedAt || conflict.sourceData.createdAt;
        const secondaryTime = conflict.targetData.updatedAt || conflict.targetData.createdAt;
        
        if (primaryTime >= secondaryTime) {
          await this.applyConflictResolution(conflict, conflict.sourceData);
        }
        break;

      case 'timestamp-based':
        // Use the document with the latest timestamp
        const sourceTimestamp = this.extractTimestamp(conflict.sourceData);
        const targetTimestamp = this.extractTimestamp(conflict.targetData);
        
        if (sourceTimestamp > targetTimestamp) {
          await this.applyConflictResolution(conflict, conflict.sourceData);
        }
        break;
    }
  }

  private async applyConflictResolution(conflict: ConflictRecord, resolution: any): Promise<void> {
    // Apply the resolution to the target region
    const targetRegion = this.config.regions.find(r => r.name === conflict.targetRegion);
    if (!targetRegion) {
      throw new Error(`Target region ${conflict.targetRegion} not found`);
    }

    if (conflict.database === 'mongodb') {
      const client = new MongoClient(targetRegion.databases.mongodb.url);
      try {
        await client.connect();
        const db = client.db(targetRegion.databases.mongodb.database);
        const collection = db.collection(conflict.collection);
        
        await collection.replaceOne(
          { _id: conflict.documentId },
          resolution,
          { upsert: true }
        );
      } finally {
        await client.close();
      }
    }

    conflict.resolution = 'resolved';
  }

  private extractTimestamp(doc: any): number {
    return (doc.updatedAt || doc.createdAt || doc.timestamp || new Date(0)).getTime();
  }

  private initializeReplicationStatus(): void {
    for (const region of this.config.regions) {
      if (!region.primary) {
        this.replicationStatus.set(region.name, {
          region: region.name,
          status: 'healthy',
          lastSync: new Date(),
          lag: 0,
          metrics: {
            documentsReplicated: 0,
            dataPointsReplicated: 0,
            keysReplicated: 0,
            bytesTransferred: 0
          }
        });
      }
    }
  }

  private updateReplicationStatus(
    region: string,
    status: 'healthy' | 'degraded' | 'failed',
    error?: string,
    metrics?: any,
    lag?: number
  ): void {
    const replicationStatus = this.replicationStatus.get(region);
    if (replicationStatus) {
      replicationStatus.status = status;
      replicationStatus.lastSync = new Date();
      replicationStatus.error = error;
      
      if (metrics) {
        replicationStatus.metrics = metrics;
      }
      
      if (lag !== undefined) {
        replicationStatus.lag = lag;
      }
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    for (const region of this.config.regions) {
      if (!region.primary) {
        try {
          await this.checkRegionHealth(region);
        } catch (error) {
          this.logger.error(`Health check failed for region ${region.name}`, { error });
          this.updateReplicationStatus(region.name, 'failed', error.toString());
        }
      }
    }
  }

  private async checkRegionHealth(region: RegionConfig): Promise<void> {
    // Check MongoDB connectivity
    const mongoClient = new MongoClient(region.databases.mongodb.url);
    try {
      await mongoClient.connect();
      await mongoClient.db(region.databases.mongodb.database).admin().ping();
    } finally {
      await mongoClient.close();
    }

    // Check InfluxDB connectivity
    const influxClient = new InfluxDB({
      url: region.databases.influxdb.url,
      token: region.databases.influxdb.token
    });
    
    const queryApi = influxClient.getQueryApi(region.databases.influxdb.org);
    await queryApi.collectRows('buckets() |> limit(n:1)');

    // Check Redis connectivity
    const redisClient = new RedisClient({ url: region.databases.redis.url });
    try {
      await redisClient.connect();
      await redisClient.ping();
    } finally {
      await redisClient.disconnect();
    }
  }

  private generateConflictId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}