/**
 * Migration Runner Utility
 * Provides a simple interface to run database migrations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MigrationConfig {
  mongodb?: {
    url: string;
    database: string;
  };
  influxdb?: {
    url: string;
    token: string;
    org: string;
  };
}

export interface Migration {
  version: string;
  description: string;
  up(config: any): Promise<any>;
  down(config: any): Promise<any>;
}

export class MigrationRunner {
  private migrationsPath: string;
  private config: MigrationConfig;

  constructor(migrationsPath: string, config: MigrationConfig) {
    this.migrationsPath = migrationsPath;
    this.config = config;
  }

  /**
   * Get all available migrations in a directory
   */
  private async getMigrations(type: 'mongodb' | 'influxdb'): Promise<Migration[]> {
    const migrationDir = path.join(this.migrationsPath, type);
    
    if (!fs.existsSync(migrationDir)) {
      console.warn(`Migration directory not found: ${migrationDir}`);
      return [];
    }

    const files = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    const migrations: Migration[] = [];
    
    for (const file of files) {
      const migrationPath = path.join(migrationDir, file);
      try {
        const migration = require(migrationPath);
        migrations.push(migration);
      } catch (error) {
        console.error(`Failed to load migration ${file}:`, error);
      }
    }

    return migrations;
  }

  /**
   * Run MongoDB migrations
   */
  async runMongoMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
    if (!this.config.mongodb) {
      throw new Error('MongoDB configuration not provided');
    }

    console.log(`Running MongoDB migrations (${direction})...`);
    
    // Dynamic import to handle optional dependency
    let MongoClient;
    try {
      ({ MongoClient } = require('mongodb'));
    } catch (error) {
      throw new Error('MongoDB client not installed. Run: npm install mongodb');
    }

    const client = new MongoClient(this.config.mongodb.url);
    
    try {
      await client.connect();
      const db = client.db(this.config.mongodb.database);
      
      const migrations = await this.getMigrations('mongodb');
      
      if (direction === 'up') {
        for (const migration of migrations) {
          console.log(`Running migration ${migration.version}: ${migration.description}`);
          await migration.up(db);
        }
      } else {
        for (const migration of migrations.reverse()) {
          console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
          await migration.down(db);
        }
      }
      
      console.log('MongoDB migrations completed successfully');
    } finally {
      await client.close();
    }
  }

  /**
   * Run InfluxDB migrations
   */
  async runInfluxMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
    if (!this.config.influxdb) {
      throw new Error('InfluxDB configuration not provided');
    }

    console.log(`Running InfluxDB migrations (${direction})...`);
    
    const migrations = await this.getMigrations('influxdb');
    
    if (direction === 'up') {
      for (const migration of migrations) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        await migration.up(this.config.influxdb);
      }
    } else {
      for (const migration of migrations.reverse()) {
        console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
        await migration.down(this.config.influxdb);
      }
    }
    
    console.log('InfluxDB migrations completed successfully');
  }

  /**
   * Run all migrations
   */
  async runAllMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
    if (this.config.mongodb) {
      await this.runMongoMigrations(direction);
    }
    
    if (this.config.influxdb) {
      await this.runInfluxMigrations(direction);
    }
  }
}

/**
 * Example usage function
 */
export async function runMigrations(config: MigrationConfig): Promise<void> {
  const migrationsPath = path.join(__dirname);
  const runner = new MigrationRunner(migrationsPath, config);
  
  try {
    await runner.runAllMigrations('up');
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// CLI interface if run directly
if (require.main === module) {
  const config: MigrationConfig = {
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'devflow'
    },
    influxdb: {
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN || '',
      org: process.env.INFLUXDB_ORG || 'devflow'
    }
  };

  const direction = process.argv[2] as 'up' | 'down' || 'up';
  
  runMigrations(config)
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}