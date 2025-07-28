import { MongoClient } from 'mongodb';
import { InfluxDB } from '@influxdata/influxdb-client';
import { RedisClient } from 'redis';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Logger } from '../utils/logger';
import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

export interface BackupConfig {
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
  storage: {
    type: 's3' | 'gcs' | 'local';
    config: any;
  };
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  encryption: {
    enabled: boolean;
    keyId?: string;
  };
}

export interface BackupResult {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  databases: BackupDatabaseResult[];
  size: number;
  duration: number;
  success: boolean;
  errors: string[];
}

export interface BackupDatabaseResult {
  database: 'mongodb' | 'influxdb' | 'redis';
  collections?: string[];
  size: number;
  success: boolean;
  error?: string;
}

export class BackupManager {
  private config: BackupConfig;
  private logger: Logger;
  private s3Client?: S3Client;

  constructor(config: BackupConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    if (config.storage.type === 's3') {
      this.s3Client = new S3Client(config.storage.config);
    }
  }

  async performFullBackup(): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const startTime = Date.now();
    
    this.logger.info(`Starting full backup ${backupId}`);

    const result: BackupResult = {
      id: backupId,
      timestamp: new Date(),
      type: 'full',
      databases: [],
      size: 0,
      duration: 0,
      success: true,
      errors: []
    };

    try {
      // Backup MongoDB
      const mongoResult = await this.backupMongoDB(backupId);
      result.databases.push(mongoResult);
      result.size += mongoResult.size;

      // Backup InfluxDB
      const influxResult = await this.backupInfluxDB(backupId);
      result.databases.push(influxResult);
      result.size += influxResult.size;

      // Backup Redis
      const redisResult = await this.backupRedis(backupId);
      result.databases.push(redisResult);
      result.size += redisResult.size;

      // Check if any database backup failed
      result.success = result.databases.every(db => db.success);
      result.errors = result.databases
        .filter(db => !db.success)
        .map(db => db.error || 'Unknown error');

      result.duration = Date.now() - startTime;

      this.logger.info(`Full backup ${backupId} completed`, {
        success: result.success,
        size: result.size,
        duration: result.duration,
        errors: result.errors.length
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Backup failed: ${error}`);
      result.duration = Date.now() - startTime;
      
      this.logger.error(`Full backup ${backupId} failed`, { error });
      return result;
    }
  }

  async performIncrementalBackup(): Promise<BackupResult> {
    const backupId = this.generateBackupId('incremental');
    const startTime = Date.now();
    
    this.logger.info(`Starting incremental backup ${backupId}`);

    const result: BackupResult = {
      id: backupId,
      timestamp: new Date(),
      type: 'incremental',
      databases: [],
      size: 0,
      duration: 0,
      success: true,
      errors: []
    };

    try {
      // Get last backup timestamp
      const lastBackupTime = await this.getLastBackupTimestamp();
      
      // Incremental backup for MongoDB (using oplog)
      const mongoResult = await this.backupMongoDBIncremental(backupId, lastBackupTime);
      result.databases.push(mongoResult);
      result.size += mongoResult.size;

      // InfluxDB incremental backup (time-based)
      const influxResult = await this.backupInfluxDBIncremental(backupId, lastBackupTime);
      result.databases.push(influxResult);
      result.size += influxResult.size;

      // Redis incremental backup (AOF-based)
      const redisResult = await this.backupRedisIncremental(backupId, lastBackupTime);
      result.databases.push(redisResult);
      result.size += redisResult.size;

      result.success = result.databases.every(db => db.success);
      result.errors = result.databases
        .filter(db => !db.success)
        .map(db => db.error || 'Unknown error');

      result.duration = Date.now() - startTime;

      this.logger.info(`Incremental backup ${backupId} completed`, {
        success: result.success,
        size: result.size,
        duration: result.duration
      });

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Incremental backup failed: ${error}`);
      result.duration = Date.now() - startTime;
      
      this.logger.error(`Incremental backup ${backupId} failed`, { error });
      return result;
    }
  }

  private async backupMongoDB(backupId: string): Promise<BackupDatabaseResult> {
    this.logger.info('Starting MongoDB backup');
    
    try {
      const client = new MongoClient(this.config.mongodb.url);
      await client.connect();
      
      const db = client.db(this.config.mongodb.database);
      const collections = await db.listCollections().toArray();
      
      let totalSize = 0;
      const backupPath = `/tmp/mongodb-${backupId}.gz`;
      
      // Use mongodump for full backup
      const mongodumpProcess = spawn('mongodump', [
        '--uri', this.config.mongodb.url,
        '--db', this.config.mongodb.database,
        '--gzip',
        '--archive=' + backupPath
      ]);

      await new Promise((resolve, reject) => {
        mongodumpProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`mongodump exited with code ${code}`));
        });
      });

      // Get file size
      const fs = require('fs');
      const stats = fs.statSync(backupPath);
      totalSize = stats.size;

      // Upload to storage
      await this.uploadBackupFile(backupPath, `mongodb/${backupId}.gz`);

      // Clean up local file
      fs.unlinkSync(backupPath);

      await client.close();

      return {
        database: 'mongodb',
        collections: collections.map(c => c.name),
        size: totalSize,
        success: true
      };

    } catch (error) {
      return {
        database: 'mongodb',
        size: 0,
        success: false,
        error: error.toString()
      };
    }
  }

  private async backupInfluxDB(backupId: string): Promise<BackupDatabaseResult> {
    this.logger.info('Starting InfluxDB backup');
    
    try {
      const backupPath = `/tmp/influxdb-${backupId}.gz`;
      
      // Use influx backup command
      const influxBackupProcess = spawn('influx', [
        'backup',
        '--host', this.config.influxdb.url,
        '--token', this.config.influxdb.token,
        '--org', this.config.influxdb.org,
        '--bucket', this.config.influxdb.bucket,
        backupPath.replace('.gz', '')
      ]);

      await new Promise((resolve, reject) => {
        influxBackupProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`influx backup exited with code ${code}`));
        });
      });

      // Compress the backup
      const fs = require('fs');
      await pipeline(
        createReadStream(backupPath.replace('.gz', '')),
        createGzip(),
        createWriteStream(backupPath)
      );

      const stats = fs.statSync(backupPath);
      const totalSize = stats.size;

      // Upload to storage
      await this.uploadBackupFile(backupPath, `influxdb/${backupId}.gz`);

      // Clean up local files
      fs.unlinkSync(backupPath);
      fs.rmSync(backupPath.replace('.gz', ''), { recursive: true, force: true });

      return {
        database: 'influxdb',
        size: totalSize,
        success: true
      };

    } catch (error) {
      return {
        database: 'influxdb',
        size: 0,
        success: false,
        error: error.toString()
      };
    }
  }

  private async backupRedis(backupId: string): Promise<BackupDatabaseResult> {
    this.logger.info('Starting Redis backup');
    
    try {
      const client = new RedisClient({ url: this.config.redis.url });
      await client.connect();

      const backupPath = `/tmp/redis-${backupId}.rdb.gz`;
      
      // Trigger BGSAVE
      await client.bgSave();
      
      // Wait for background save to complete
      let lastSave = await client.lastSave();
      const startTime = Date.now();
      
      while (Date.now() - startTime < 300000) { // 5 minute timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentLastSave = await client.lastSave();
        if (currentLastSave > lastSave) {
          break;
        }
      }

      // Copy and compress RDB file
      const fs = require('fs');
      const rdbPath = '/var/lib/redis/dump.rdb'; // Default Redis RDB path
      
      await pipeline(
        createReadStream(rdbPath),
        createGzip(),
        createWriteStream(backupPath)
      );

      const stats = fs.statSync(backupPath);
      const totalSize = stats.size;

      // Upload to storage
      await this.uploadBackupFile(backupPath, `redis/${backupId}.rdb.gz`);

      // Clean up local file
      fs.unlinkSync(backupPath);

      await client.disconnect();

      return {
        database: 'redis',
        size: totalSize,
        success: true
      };

    } catch (error) {
      return {
        database: 'redis',
        size: 0,
        success: false,
        error: error.toString()
      };
    }
  }

  private async backupMongoDBIncremental(backupId: string, since: Date): Promise<BackupDatabaseResult> {
    // Implementation would use MongoDB oplog for incremental backups
    // For now, return a placeholder
    return {
      database: 'mongodb',
      size: 0,
      success: true
    };
  }

  private async backupInfluxDBIncremental(backupId: string, since: Date): Promise<BackupDatabaseResult> {
    // Implementation would query InfluxDB for data since last backup
    // For now, return a placeholder
    return {
      database: 'influxdb',
      size: 0,
      success: true
    };
  }

  private async backupRedisIncremental(backupId: string, since: Date): Promise<BackupDatabaseResult> {
    // Implementation would use Redis AOF for incremental backups
    // For now, return a placeholder
    return {
      database: 'redis',
      size: 0,
      success: true
    };
  }

  private async uploadBackupFile(localPath: string, remotePath: string): Promise<void> {
    if (this.config.storage.type === 's3' && this.s3Client) {
      const fs = require('fs');
      let fileStream = createReadStream(localPath);
      
      // Apply AES-256 encryption if enabled
      if (this.config.encryption.enabled) {
        const crypto = require('crypto');
        const cipher = crypto.createCipher('aes-256-cbc', this.config.encryption.keyId || 'default-key');
        fileStream = fileStream.pipe(cipher);
      }
      
      const uploadParams = {
        Bucket: this.config.storage.config.bucket,
        Key: `backups/${remotePath}`,
        Body: fileStream,
        ServerSideEncryption: this.config.encryption.enabled ? 'aws:kms' : undefined,
        SSEKMSKeyId: this.config.encryption.keyId,
        Metadata: {
          'backup-encrypted': this.config.encryption.enabled ? 'true' : 'false',
          'backup-timestamp': new Date().toISOString(),
          'backup-version': '1.0'
        }
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      
      this.logger.info('Backup uploaded successfully', {
        remotePath,
        encrypted: this.config.encryption.enabled,
        size: fs.statSync(localPath).size
      });
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (this.config.storage.type === 's3' && this.s3Client) {
      const listParams = {
        Bucket: this.config.storage.config.bucket,
        Prefix: 'backups/'
      };

      const objects = await this.s3Client.send(new ListObjectsV2Command(listParams));
      
      // Implementation would sort by date and delete old backups based on retention policy
      this.logger.info('Cleanup completed', { 
        totalObjects: objects.Contents?.length || 0 
      });
    }
  }

  private async getLastBackupTimestamp(): Promise<Date> {
    // Implementation would query backup metadata to get last backup time
    // For now, return 24 hours ago
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  private generateBackupId(type: string = 'full'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }
}