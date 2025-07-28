import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as cron from 'node-cron';
import { Logger } from 'winston';
import { BackupConfig } from '../types';

const execAsync = promisify(exec);

export class BackupService {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private logger: Logger,
    private config: BackupConfig = {
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: 30, // 30 days
      destination: process.env.BACKUP_DESTINATION || './backups',
      compression: true,
      encryption: false
    }
  ) {}

  async createBackup(databaseName: string = 'devflow'): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${databaseName}_backup_${timestamp}`;
      const backupPath = path.join(this.config.destination, backupName);

      // Ensure backup directory exists
      await fs.mkdir(this.config.destination, { recursive: true });

      // Create MongoDB dump
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dumpCommand = `mongodump --uri="${mongoUri}" --db=${databaseName} --out=${backupPath}`;

      this.logger.info(`Starting backup: ${backupName}`);
      await execAsync(dumpCommand);

      let finalPath = backupPath;

      // Compress if enabled
      if (this.config.compression) {
        const compressedPath = `${backupPath}.tar.gz`;
        const compressCommand = `tar -czf ${compressedPath} -C ${this.config.destination} ${backupName}`;
        await execAsync(compressCommand);
        
        // Remove uncompressed backup
        await fs.rm(backupPath, { recursive: true });
        finalPath = compressedPath;
      }

      // Encrypt if enabled
      if (this.config.encryption) {
        const encryptedPath = `${finalPath}.enc`;
        const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
        
        if (!encryptionKey) {
          throw new Error('Backup encryption key not provided');
        }

        const encryptCommand = `openssl enc -aes-256-cbc -salt -in ${finalPath} -out ${encryptedPath} -k ${encryptionKey}`;
        await execAsync(encryptCommand);
        
        // Remove unencrypted backup
        await fs.unlink(finalPath);
        finalPath = encryptedPath;
      }

      this.logger.info(`Backup completed: ${finalPath}`);
      return finalPath;
    } catch (error) {
      this.logger.error('Backup failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string, databaseName: string = 'devflow'): Promise<void> {
    try {
      this.logger.info(`Starting restore from: ${backupPath}`);
      
      let restorePath = backupPath;

      // Decrypt if needed
      if (backupPath.endsWith('.enc')) {
        const decryptedPath = backupPath.replace('.enc', '');
        const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
        
        if (!encryptionKey) {
          throw new Error('Backup encryption key not provided');
        }

        const decryptCommand = `openssl enc -aes-256-cbc -d -in ${backupPath} -out ${decryptedPath} -k ${encryptionKey}`;
        await execAsync(decryptCommand);
        restorePath = decryptedPath;
      }

      // Decompress if needed
      if (restorePath.endsWith('.tar.gz')) {
        const extractDir = path.dirname(restorePath);
        const extractCommand = `tar -xzf ${restorePath} -C ${extractDir}`;
        await execAsync(extractCommand);
        
        // Find the extracted directory
        const extractedName = path.basename(restorePath, '.tar.gz');
        restorePath = path.join(extractDir, extractedName);
      }

      // Restore MongoDB dump
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const restoreCommand = `mongorestore --uri="${mongoUri}" --db=${databaseName} --drop ${path.join(restorePath, databaseName)}`;
      
      await execAsync(restoreCommand);

      this.logger.info(`Restore completed for database: ${databaseName}`);
    } catch (error) {
      this.logger.error('Restore failed:', error);
      throw error;
    }
  }

  async scheduleBackup(databaseName: string = 'devflow'): Promise<void> {
    const taskId = `backup_${databaseName}`;
    
    // Cancel existing task if any
    if (this.scheduledTasks.has(taskId)) {
      this.scheduledTasks.get(taskId)!.stop();
    }

    const task = cron.schedule(this.config.schedule, async () => {
      try {
        await this.createBackup(databaseName);
        await this.cleanupOldBackups();
      } catch (error) {
        this.logger.error('Scheduled backup failed:', error);
      }
    }, {
      scheduled: false
    });

    this.scheduledTasks.set(taskId, task);
    task.start();

    this.logger.info(`Backup scheduled for database ${databaseName} with cron: ${this.config.schedule}`);
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.destination);
      const backupFiles = files.filter(file => file.includes('_backup_'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

      for (const file of backupFiles) {
        const filePath = path.join(this.config.destination, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          this.logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
    }
  }

  async listBackups(): Promise<Array<{ name: string; size: number; created: Date }>> {
    try {
      const files = await fs.readdir(this.config.destination);
      const backupFiles = files.filter(file => file.includes('_backup_'));
      
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.config.destination, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            size: stats.size,
            created: stats.mtime
          };
        })
      );

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      throw error;
    }
  }

  async validateBackup(backupPath: string): Promise<boolean> {
    try {
      // Check if file exists
      await fs.access(backupPath);
      
      // For compressed backups, test the archive
      if (backupPath.endsWith('.tar.gz')) {
        const testCommand = `tar -tzf ${backupPath} > /dev/null`;
        await execAsync(testCommand);
      }

      // For encrypted backups, try to decrypt a small portion
      if (backupPath.endsWith('.enc')) {
        const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
        if (!encryptionKey) {
          return false;
        }

        const testCommand = `openssl enc -aes-256-cbc -d -in ${backupPath} -k ${encryptionKey} | head -c 100 > /dev/null`;
        await execAsync(testCommand);
      }

      return true;
    } catch (error) {
      this.logger.error(`Backup validation failed for ${backupPath}:`, error);
      return false;
    }
  }

  async getBackupSize(backupPath: string): Promise<number> {
    try {
      const stats = await fs.stat(backupPath);
      return stats.size;
    } catch (error) {
      this.logger.error(`Failed to get backup size for ${backupPath}:`, error);
      throw error;
    }
  }

  stopAllScheduledBackups(): void {
    for (const [taskId, task] of this.scheduledTasks) {
      task.stop();
      this.logger.info(`Stopped scheduled backup: ${taskId}`);
    }
    this.scheduledTasks.clear();
  }

  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Backup configuration updated');
  }
}