#!/usr/bin/env node

import { Command } from 'commander';
import { DisasterRecoveryManager, DisasterRecoveryConfig } from './disaster-recovery-manager';
import { CrossRegionReplication, ReplicationConfig } from './cross-region-replication';
import { BackupManager, BackupConfig } from '../backup/backup-manager';
import { Logger } from '../utils/logger';
import { KubernetesApi } from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';

interface CLIConfig {
  disasterRecovery: DisasterRecoveryConfig;
  replication: ReplicationConfig;
}

class DisasterRecoveryCLI {
  private config: CLIConfig;
  private logger: Logger;
  private drManager: DisasterRecoveryManager;
  private replicationManager: CrossRegionReplication;
  private backupManager: BackupManager;

  constructor(configPath: string) {
    this.logger = new Logger('dr-cli');
    this.config = this.loadConfig(configPath);
    
    // Initialize Kubernetes API
    const k8sApi = new KubernetesApi();
    
    this.drManager = new DisasterRecoveryManager(this.config.disasterRecovery, this.logger, k8sApi);
    this.replicationManager = new CrossRegionReplication(this.config.replication, this.logger);
    this.backupManager = new BackupManager(this.config.disasterRecovery.backup, this.logger);
  }

  private loadConfig(configPath: string): CLIConfig {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configFile);
    } catch (error) {
      this.logger.error(`Failed to load config from ${configPath}`, { error });
      process.exit(1);
    }
  }

  async status(): Promise<void> {
    console.log('🔍 Disaster Recovery Status\n');

    try {
      // Get DR status
      const drStatus = this.drManager.getStatus();
      console.log('📊 System Status:');
      console.log(`  Primary Region: ${drStatus.primaryRegion}`);
      console.log(`  Active Region: ${drStatus.activeRegion}`);
      console.log(`  Health Status: ${drStatus.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`  Last Health Check: ${drStatus.lastHealthCheck.toISOString()}`);
      console.log(`  Last Backup: ${drStatus.lastBackup.toISOString()}\n`);

      // Get replication status
      const replicationStatus = this.replicationManager.getReplicationStatus();
      console.log('🔄 Replication Status:');
      
      if (replicationStatus.length === 0) {
        console.log('  No replication configured\n');
      } else {
        replicationStatus.forEach(status => {
          const statusIcon = status.status === 'healthy' ? '✅' : 
                           status.status === 'degraded' ? '⚠️' : '❌';
          console.log(`  ${statusIcon} ${status.region}:`);
          console.log(`    Status: ${status.status}`);
          console.log(`    Last Sync: ${status.lastSync.toISOString()}`);
          console.log(`    Lag: ${status.lag}ms`);
          console.log(`    Documents: ${status.metrics.documentsReplicated}`);
          console.log(`    Data Points: ${status.metrics.dataPointsReplicated}`);
          console.log(`    Keys: ${status.metrics.keysReplicated}`);
          console.log(`    Bytes: ${this.formatBytes(status.metrics.bytesTransferred)}`);
          if (status.error) {
            console.log(`    Error: ${status.error}`);
          }
          console.log();
        });
      }

      // Get conflicts
      const conflicts = this.replicationManager.getConflicts();
      console.log('⚡ Conflicts:');
      if (conflicts.length === 0) {
        console.log('  No conflicts detected\n');
      } else {
        conflicts.forEach(conflict => {
          const statusIcon = conflict.resolution === 'resolved' ? '✅' : 
                           conflict.resolution === 'pending' ? '⏳' : '🔧';
          console.log(`  ${statusIcon} ${conflict.id}:`);
          console.log(`    Database: ${conflict.database}`);
          console.log(`    Collection: ${conflict.collection}`);
          console.log(`    Document ID: ${conflict.documentId}`);
          console.log(`    Type: ${conflict.conflictType}`);
          console.log(`    Source: ${conflict.sourceRegion} → ${conflict.targetRegion}`);
          console.log(`    Resolution: ${conflict.resolution}`);
          console.log(`    Timestamp: ${conflict.timestamp.toISOString()}`);
          console.log();
        });
      }

      // Get failover history
      console.log('📈 Recent Failovers:');
      if (drStatus.failoverHistory.length === 0) {
        console.log('  No recent failovers\n');
      } else {
        drStatus.failoverHistory.slice(-5).forEach(failover => {
          const statusIcon = failover.success ? '✅' : '❌';
          console.log(`  ${statusIcon} ${failover.id}:`);
          console.log(`    ${failover.fromRegion} → ${failover.toRegion}`);
          console.log(`    Reason: ${failover.reason}`);
          console.log(`    Duration: ${this.formatDuration(failover.duration)}`);
          console.log(`    Timestamp: ${failover.timestamp.toISOString()}`);
          if (failover.rollback) {
            console.log(`    Rollback: Yes`);
          }
          console.log();
        });
      }

    } catch (error) {
      console.error('❌ Failed to get status:', error.message);
      process.exit(1);
    }
  }

  async backup(type: 'full' | 'incremental' = 'full'): Promise<void> {
    console.log(`🔄 Starting ${type} backup...\n`);

    try {
      const result = type === 'full' 
        ? await this.backupManager.performFullBackup()
        : await this.backupManager.performIncrementalBackup();

      if (result.success) {
        console.log('✅ Backup completed successfully!');
        console.log(`  Backup ID: ${result.id}`);
        console.log(`  Type: ${result.type}`);
        console.log(`  Size: ${this.formatBytes(result.size)}`);
        console.log(`  Duration: ${this.formatDuration(result.duration)}`);
        console.log(`  Databases: ${result.databases.length}`);
        
        result.databases.forEach(db => {
          const statusIcon = db.success ? '✅' : '❌';
          console.log(`    ${statusIcon} ${db.database}: ${this.formatBytes(db.size)}`);
          if (db.collections) {
            console.log(`      Collections: ${db.collections.join(', ')}`);
          }
          if (db.error) {
            console.log(`      Error: ${db.error}`);
          }
        });
      } else {
        console.log('❌ Backup failed!');
        result.errors.forEach(error => {
          console.log(`  Error: ${error}`);
        });
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  }

  async failover(targetRegion: string, reason: string = 'Manual failover'): Promise<void> {
    console.log(`🔄 Initiating failover to ${targetRegion}...\n`);

    try {
      const failoverEvent = await this.drManager.initiateFailover(targetRegion, reason);

      if (failoverEvent.success) {
        console.log('✅ Failover completed successfully!');
        console.log(`  Failover ID: ${failoverEvent.id}`);
        console.log(`  From: ${failoverEvent.fromRegion}`);
        console.log(`  To: ${failoverEvent.toRegion}`);
        console.log(`  Duration: ${this.formatDuration(failoverEvent.duration)}`);
        console.log(`  Reason: ${failoverEvent.reason}`);
      } else {
        console.log('❌ Failover failed!');
        if (failoverEvent.rollback) {
          console.log('🔄 Rollback was performed');
        }
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Failover failed:', error.message);
      process.exit(1);
    }
  }

  async test(testType: 'full' | 'backup' | 'replication' | 'failover' = 'full'): Promise<void> {
    console.log(`🧪 Running ${testType} disaster recovery test...\n`);

    try {
      let testResults: any;

      switch (testType) {
        case 'full':
          testResults = await this.drManager.testDisasterRecovery();
          break;
        case 'backup':
          testResults = await this.testBackupOnly();
          break;
        case 'replication':
          testResults = await this.testReplicationOnly();
          break;
        case 'failover':
          testResults = await this.testFailoverOnly();
          break;
      }

      console.log('📊 Test Results:');
      console.log(`  Overall Success: ${testResults.overallSuccess ? '✅' : '❌'}`);
      console.log(`  Duration: ${this.formatDuration(testResults.duration)}`);
      console.log(`  Tests Run: ${testResults.tests.length}\n`);

      testResults.tests.forEach((test: any) => {
        const statusIcon = test.success ? '✅' : '❌';
        console.log(`  ${statusIcon} ${test.name}:`);
        console.log(`    Duration: ${this.formatDuration(test.duration)}`);
        if (test.details) {
          Object.entries(test.details).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
        }
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
        console.log();
      });

      if (!testResults.overallSuccess) {
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  async recover(planType: 'full' | 'partial' | 'point-in-time', options: any = {}): Promise<void> {
    console.log(`🔄 Creating ${planType} recovery plan...\n`);

    try {
      const plan = await this.drManager.createRecoveryPlan(planType, options);

      console.log('📋 Recovery Plan Created:');
      console.log(`  Plan ID: ${plan.id}`);
      console.log(`  Type: ${plan.type}`);
      console.log(`  Target Region: ${plan.targetRegion}`);
      console.log(`  Estimated Duration: ${this.formatDuration(plan.estimatedDuration)}`);
      console.log(`  Steps: ${plan.steps.length}\n`);

      plan.steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.name}:`);
        console.log(`     Description: ${step.description}`);
        console.log(`     Type: ${step.type}`);
        console.log(`     Duration: ${this.formatDuration(step.estimatedDuration)}`);
        console.log(`     Dependencies: ${step.dependencies.join(', ') || 'None'}`);
        console.log();
      });

      // Ask for confirmation
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Do you want to execute this recovery plan? (yes/no): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('\n🔄 Executing recovery plan...\n');
        
        await this.drManager.executeRecoveryPlan(plan);

        console.log('✅ Recovery plan executed successfully!');
        
        plan.steps.forEach((step, index) => {
          const statusIcon = step.status === 'completed' ? '✅' : 
                           step.status === 'failed' ? '❌' : '⏳';
          console.log(`  ${statusIcon} ${step.name}: ${step.status}`);
          if (step.error) {
            console.log(`    Error: ${step.error}`);
          }
        });
      } else {
        console.log('Recovery plan execution cancelled.');
      }

    } catch (error) {
      console.error('❌ Recovery failed:', error.message);
      process.exit(1);
    }
  }

  async startReplication(): Promise<void> {
    console.log('🔄 Starting cross-region replication...\n');

    try {
      await this.replicationManager.startReplication();
      console.log('✅ Cross-region replication started successfully!');
      
      const status = this.replicationManager.getReplicationStatus();
      console.log(`  Replicating to ${status.length} regions:`);
      status.forEach(regionStatus => {
        console.log(`    - ${regionStatus.region}: ${regionStatus.status}`);
      });

    } catch (error) {
      console.error('❌ Failed to start replication:', error.message);
      process.exit(1);
    }
  }

  async stopReplication(): Promise<void> {
    console.log('🛑 Stopping cross-region replication...\n');

    try {
      await this.replicationManager.stopReplication();
      console.log('✅ Cross-region replication stopped successfully!');

    } catch (error) {
      console.error('❌ Failed to stop replication:', error.message);
      process.exit(1);
    }
  }

  async resolveConflict(conflictId: string, resolution: string): Promise<void> {
    console.log(`🔧 Resolving conflict ${conflictId}...\n`);

    try {
      const conflicts = this.replicationManager.getConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);
      
      if (!conflict) {
        console.error(`❌ Conflict ${conflictId} not found`);
        process.exit(1);
      }

      console.log('📋 Conflict Details:');
      console.log(`  Database: ${conflict.database}`);
      console.log(`  Collection: ${conflict.collection}`);
      console.log(`  Document ID: ${conflict.documentId}`);
      console.log(`  Type: ${conflict.conflictType}`);
      console.log(`  Source Region: ${conflict.sourceRegion}`);
      console.log(`  Target Region: ${conflict.targetRegion}\n`);

      let resolutionData: any;
      
      if (resolution === 'source') {
        resolutionData = conflict.sourceData;
      } else if (resolution === 'target') {
        resolutionData = conflict.targetData;
      } else {
        try {
          resolutionData = JSON.parse(resolution);
        } catch {
          console.error('❌ Invalid resolution format. Use "source", "target", or valid JSON');
          process.exit(1);
        }
      }

      await this.replicationManager.resolveConflict(conflictId, resolutionData);
      console.log('✅ Conflict resolved successfully!');

    } catch (error) {
      console.error('❌ Failed to resolve conflict:', error.message);
      process.exit(1);
    }
  }

  private async testBackupOnly(): Promise<any> {
    const startTime = Date.now();
    const tests = [];

    try {
      const backupResult = await this.backupManager.performFullBackup();
      tests.push({
        name: 'Full Backup Test',
        success: backupResult.success,
        duration: backupResult.duration,
        details: {
          backupId: backupResult.id,
          size: this.formatBytes(backupResult.size),
          databases: backupResult.databases.length
        }
      });
    } catch (error) {
      tests.push({
        name: 'Full Backup Test',
        success: false,
        duration: 0,
        error: error.message
      });
    }

    return {
      timestamp: new Date(),
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };
  }

  private async testReplicationOnly(): Promise<any> {
    const startTime = Date.now();
    const tests = [];

    try {
      await this.replicationManager.startReplication();
      
      // Wait for initial sync
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = this.replicationManager.getReplicationStatus();
      const healthyRegions = status.filter(s => s.status === 'healthy').length;
      
      tests.push({
        name: 'Replication Health Test',
        success: healthyRegions > 0,
        duration: 5000,
        details: {
          totalRegions: status.length,
          healthyRegions,
          avgLag: status.reduce((sum, s) => sum + s.lag, 0) / status.length
        }
      });

      await this.replicationManager.stopReplication();
      
    } catch (error) {
      tests.push({
        name: 'Replication Health Test',
        success: false,
        duration: 0,
        error: error.message
      });
    }

    return {
      timestamp: new Date(),
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };
  }

  private async testFailoverOnly(): Promise<any> {
    const startTime = Date.now();
    const tests = [];

    try {
      const targetRegion = this.config.replication.regions.find(r => !r.primary)?.name;
      if (!targetRegion) {
        throw new Error('No secondary region available for failover test');
      }

      const failoverEvent = await this.drManager.initiateFailover(targetRegion, 'Failover test');
      
      tests.push({
        name: 'Failover Simulation Test',
        success: failoverEvent.success,
        duration: failoverEvent.duration,
        details: {
          failoverId: failoverEvent.id,
          fromRegion: failoverEvent.fromRegion,
          toRegion: failoverEvent.toRegion,
          rtoCompliance: failoverEvent.duration <= (this.config.disasterRecovery.recovery.rto * 60 * 1000)
        }
      });

      // Failback to original region
      const originalRegion = failoverEvent.fromRegion;
      await this.drManager.initiateFailover(originalRegion, 'Failback after test');
      
    } catch (error) {
      tests.push({
        name: 'Failover Simulation Test',
        success: false,
        duration: 0,
        error: error.message
      });
    }

    return {
      timestamp: new Date(),
      tests,
      overallSuccess: tests.every(t => t.success),
      duration: Date.now() - startTime
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// CLI Setup
const program = new Command();

program
  .name('dr-cli')
  .description('Disaster Recovery Management CLI')
  .version('1.0.0')
  .option('-c, --config <path>', 'Configuration file path', './dr-config.json');

program
  .command('status')
  .description('Show disaster recovery status')
  .action(async () => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.status();
  });

program
  .command('backup')
  .description('Perform backup')
  .option('-t, --type <type>', 'Backup type (full|incremental)', 'full')
  .action(async (options) => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.backup(options.type);
  });

program
  .command('failover')
  .description('Initiate failover to target region')
  .argument('<region>', 'Target region name')
  .option('-r, --reason <reason>', 'Failover reason', 'Manual failover')
  .action(async (region, options) => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.failover(region, options.reason);
  });

program
  .command('test')
  .description('Run disaster recovery tests')
  .option('-t, --type <type>', 'Test type (full|backup|replication|failover)', 'full')
  .action(async (options) => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.test(options.type);
  });

program
  .command('recover')
  .description('Create and execute recovery plan')
  .argument('<type>', 'Recovery type (full|partial|point-in-time)')
  .option('--target-region <region>', 'Target region for recovery')
  .option('--backup-id <id>', 'Backup ID for recovery')
  .option('--point-in-time <timestamp>', 'Point in time for recovery (ISO string)')
  .action(async (type, options) => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.recover(type, options);
  });

program
  .command('replication')
  .description('Manage cross-region replication')
  .command('start')
  .description('Start replication')
  .action(async () => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.startReplication();
  });

program
  .command('replication')
  .command('stop')
  .description('Stop replication')
  .action(async () => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.stopReplication();
  });

program
  .command('resolve-conflict')
  .description('Resolve replication conflict')
  .argument('<conflict-id>', 'Conflict ID')
  .argument('<resolution>', 'Resolution (source|target|JSON)')
  .action(async (conflictId, resolution) => {
    const cli = new DisasterRecoveryCLI(program.opts().config);
    await cli.resolveConflict(conflictId, resolution);
  });

if (require.main === module) {
  program.parse();
}

export { DisasterRecoveryCLI };