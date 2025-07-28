import mongoose from 'mongoose';
import { Logger } from 'winston';

export class DatabaseConfig {
  private connection: mongoose.Connection | null = null;

  constructor(
    private logger: Logger,
    private connectionString: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/devflow',
    private options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    }
  ) {}

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.connectionString, this.options);
      this.connection = mongoose.connection;
      
      this.connection.on('connected', () => {
        this.logger.info('MongoDB connected successfully');
      });

      this.connection.on('error', (error) => {
        this.logger.error('MongoDB connection error:', error);
      });

      this.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.logger.info('MongoDB connection closed');
    }
  }

  getConnection(): mongoose.Connection | null {
    return this.connection;
  }

  async createIndexes(): Promise<void> {
    try {
      // User indexes
      await mongoose.model('User').collection.createIndex({ email: 1 }, { unique: true });
      await mongoose.model('User').collection.createIndex({ teamIds: 1 });
      await mongoose.model('User').collection.createIndex({ role: 1 });
      await mongoose.model('User').collection.createIndex({ isActive: 1 });
      await mongoose.model('User').collection.createIndex({ createdAt: 1 });

      // Team indexes
      await mongoose.model('Team').collection.createIndex({ name: 1 }, { unique: true });
      await mongoose.model('Team').collection.createIndex({ memberIds: 1 });
      await mongoose.model('Team').collection.createIndex({ isActive: 1 });

      // Project indexes
      await mongoose.model('Project').collection.createIndex({ teamId: 1 });
      await mongoose.model('Project').collection.createIndex({ name: 1, teamId: 1 }, { unique: true });
      await mongoose.model('Project').collection.createIndex({ isActive: 1 });

      // Dashboard indexes
      await mongoose.model('Dashboard').collection.createIndex({ userId: 1 });
      await mongoose.model('Dashboard').collection.createIndex({ userId: 1, isDefault: 1 });

      // Alert indexes
      await mongoose.model('Alert').collection.createIndex({ userId: 1 });
      await mongoose.model('Alert').collection.createIndex({ teamId: 1 });
      await mongoose.model('Alert').collection.createIndex({ status: 1 });
      await mongoose.model('Alert').collection.createIndex({ severity: 1 });
      await mongoose.model('Alert').collection.createIndex({ createdAt: 1 });
      await mongoose.model('Alert').collection.createIndex({ type: 1, status: 1 });

      // Audit log indexes
      await mongoose.model('AuditLog').collection.createIndex({ userId: 1 });
      await mongoose.model('AuditLog').collection.createIndex({ resource: 1 });
      await mongoose.model('AuditLog').collection.createIndex({ timestamp: 1 });
      await mongoose.model('AuditLog').collection.createIndex({ action: 1, timestamp: 1 });

      // Compound indexes for common queries
      await mongoose.model('Alert').collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
      await mongoose.model('Dashboard').collection.createIndex({ userId: 1, updatedAt: -1 });

      this.logger.info('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection) {
        return false;
      }
      
      const state = this.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  async getStats(): Promise<any> {
    try {
      if (!this.connection) {
        throw new Error('No database connection');
      }

      const db = this.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }
}