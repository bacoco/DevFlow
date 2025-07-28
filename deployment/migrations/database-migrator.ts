import { MongoClient, Db } from 'mongodb';
import { InfluxDB } from '@influxdata/influxdb-client';
import { Logger } from '../utils/logger';
import { RedisClient } from 'redis';

export interface MigrationConfig {
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
}

export interface Migration {
  id: string;
  version: string;
  description: string;
  up: (context: MigrationContext) => Promise<void>;
  down: (context: MigrationContext) => Promise<void>;
  dependencies?: string[];
}

export interface MigrationContext {
  mongodb: Db;
  influxdb: InfluxDB;
  redis: RedisClient;
  logger: Logger;
}

export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
  duration: number;
}

export class DatabaseMigrator {
  private config: MigrationConfig;
  private logger: Logger;
  private migrations: Map<string, Migration> = new Map();

  constructor(config: MigrationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.loadMigrations();
  }

  async runMigrations(): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationsRun: string[] = [];
    const errors: string[] = [];

    this.logger.info('Starting database migrations');

    let mongoClient: MongoClient | null = null;
    let influxdb: InfluxDB | null = null;
    let redis: RedisClient | null = null;

    try {
      // Connect to databases
      mongoClient = new MongoClient(this.config.mongodb.url);
      await mongoClient.connect();
      const mongodb = mongoClient.db(this.config.mongodb.database);

      influxdb = new InfluxDB({
        url: this.config.influxdb.url,
        token: this.config.influxdb.token
      });

      redis = new RedisClient({ url: this.config.redis.url });
      await redis.connect();

      const context: MigrationContext = {
        mongodb,
        influxdb,
        redis,
        logger: this.logger
      };

      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations(mongodb);
      
      if (pendingMigrations.length === 0) {
        this.logger.info('No pending migrations found');
        return {
          success: true,
          migrationsRun: [],
          errors: [],
          duration: Date.now() - startTime
        };
      }

      // Sort migrations by dependencies
      const sortedMigrations = this.sortMigrationsByDependencies(pendingMigrations);

      // Run migrations in order
      for (const migration of sortedMigrations) {
        try {
          this.logger.info(`Running migration: ${migration.id} - ${migration.description}`);
          
          await this.runSingleMigration(migration, context, mongodb);
          migrationsRun.push(migration.id);
          
          this.logger.info(`Migration ${migration.id} completed successfully`);
        } catch (error) {
          const errorMsg = `Migration ${migration.id} failed: ${error}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
          
          // Attempt rollback
          try {
            await this.rollbackMigration(migration, context, mongodb);
            this.logger.info(`Rollback for migration ${migration.id} completed`);
          } catch (rollbackError) {
            const rollbackErrorMsg = `Rollback for migration ${migration.id} failed: ${rollbackError}`;
            this.logger.error(rollbackErrorMsg);
            errors.push(rollbackErrorMsg);
          }
          
          break; // Stop on first failure
        }
      }

      const success = errors.length === 0;
      this.logger.info(`Database migrations completed`, {
        success,
        migrationsRun: migrationsRun.length,
        errors: errors.length,
        duration: Date.now() - startTime
      });

      return {
        success,
        migrationsRun,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('Database migration failed', { error });
      return {
        success: false,
        migrationsRun,
        errors: [`Migration process failed: ${error}`],
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up connections
      if (mongoClient) await mongoClient.close();
      if (redis) await redis.disconnect();
    }
  }

  async rollbackLastMigration(): Promise<void> {
    let mongoClient: MongoClient | null = null;
    let influxdb: InfluxDB | null = null;
    let redis: RedisClient | null = null;

    try {
      // Connect to databases
      mongoClient = new MongoClient(this.config.mongodb.url);
      await mongoClient.connect();
      const mongodb = mongoClient.db(this.config.mongodb.database);

      influxdb = new InfluxDB({
        url: this.config.influxdb.url,
        token: this.config.influxdb.token
      });

      redis = new RedisClient({ url: this.config.redis.url });
      await redis.connect();

      const context: MigrationContext = {
        mongodb,
        influxdb,
        redis,
        logger: this.logger
      };

      // Get last migration
      const lastMigration = await this.getLastMigration(mongodb);
      
      if (!lastMigration) {
        this.logger.info('No migrations to rollback');
        return;
      }

      const migration = this.migrations.get(lastMigration.id);
      if (!migration) {
        throw new Error(`Migration ${lastMigration.id} not found`);
      }

      this.logger.info(`Rolling back migration: ${migration.id}`);
      await this.rollbackMigration(migration, context, mongodb);
      
      this.logger.info(`Migration ${migration.id} rolled back successfully`);

    } finally {
      if (mongoClient) await mongoClient.close();
      if (redis) await redis.disconnect();
    }
  }

  private async runSingleMigration(migration: Migration, context: MigrationContext, mongodb: Db): Promise<void> {
    const session = mongodb.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Run the migration
        await migration.up(context);
        
        // Record migration in database
        await mongodb.collection('migrations').insertOne({
          id: migration.id,
          version: migration.version,
          description: migration.description,
          appliedAt: new Date(),
          checksum: this.calculateMigrationChecksum(migration)
        });
      });
    } finally {
      await session.endSession();
    }
  }

  private async rollbackMigration(migration: Migration, context: MigrationContext, mongodb: Db): Promise<void> {
    const session = mongodb.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Run the rollback
        await migration.down(context);
        
        // Remove migration record from database
        await mongodb.collection('migrations').deleteOne({ id: migration.id });
      });
    } finally {
      await session.endSession();
    }
  }

  private async getPendingMigrations(mongodb: Db): Promise<Migration[]> {
    const appliedMigrations = await mongodb.collection('migrations')
      .find({})
      .project({ id: 1 })
      .toArray();
    
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    
    return Array.from(this.migrations.values())
      .filter(migration => !appliedIds.has(migration.id));
  }

  private async getLastMigration(mongodb: Db): Promise<any> {
    return await mongodb.collection('migrations')
      .findOne({}, { sort: { appliedAt: -1 } });
  }

  private sortMigrationsByDependencies(migrations: Migration[]): Migration[] {
    const sorted: Migration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (migration: Migration) => {
      if (visiting.has(migration.id)) {
        throw new Error(`Circular dependency detected in migration ${migration.id}`);
      }
      
      if (visited.has(migration.id)) {
        return;
      }

      visiting.add(migration.id);

      // Visit dependencies first
      if (migration.dependencies) {
        for (const depId of migration.dependencies) {
          const depMigration = this.migrations.get(depId);
          if (depMigration && migrations.includes(depMigration)) {
            visit(depMigration);
          }
        }
      }

      visiting.delete(migration.id);
      visited.add(migration.id);
      sorted.push(migration);
    };

    for (const migration of migrations) {
      visit(migration);
    }

    return sorted;
  }

  private calculateMigrationChecksum(migration: Migration): string {
    // Simple checksum based on migration content
    const content = migration.up.toString() + migration.down.toString();
    return Buffer.from(content).toString('base64').slice(0, 32);
  }

  private loadMigrations(): void {
    // Load migration files from the migrations directory
    // This would typically scan a directory and load migration files
    // For now, we'll register some example migrations
    
    this.registerMigration({
      id: '001_initial_schema',
      version: '1.0.0',
      description: 'Create initial database schema',
      up: async (context) => {
        // MongoDB collections
        await context.mongodb.createCollection('users');
        await context.mongodb.createCollection('teams');
        await context.mongodb.createCollection('projects');
        
        // Create indexes
        await context.mongodb.collection('users').createIndex({ email: 1 }, { unique: true });
        await context.mongodb.collection('teams').createIndex({ name: 1 });
        
        // InfluxDB buckets and measurements would be created here
        context.logger.info('Initial schema created');
      },
      down: async (context) => {
        await context.mongodb.collection('users').drop();
        await context.mongodb.collection('teams').drop();
        await context.mongodb.collection('projects').drop();
        context.logger.info('Initial schema dropped');
      }
    });

    this.registerMigration({
      id: '002_add_privacy_settings',
      version: '1.1.0',
      description: 'Add privacy settings collection',
      dependencies: ['001_initial_schema'],
      up: async (context) => {
        await context.mongodb.createCollection('privacy_settings');
        await context.mongodb.collection('privacy_settings').createIndex({ userId: 1 }, { unique: true });
        context.logger.info('Privacy settings collection created');
      },
      down: async (context) => {
        await context.mongodb.collection('privacy_settings').drop();
        context.logger.info('Privacy settings collection dropped');
      }
    });
  }

  private registerMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration);
  }
}