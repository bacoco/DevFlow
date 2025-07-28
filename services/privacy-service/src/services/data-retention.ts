import { EventEmitter } from 'events';
import { GDPRComplianceService, DataRetentionPolicy } from './gdpr-compliance';

export interface RetentionJob {
  id: string;
  policyId: string;
  scheduledAt: Date;
  executedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  recordsProcessed?: number;
  recordsDeleted?: number;
  error?: string;
}

export interface DataRecord {
  id: string;
  userId: string;
  dataType: string;
  createdAt: Date;
  lastAccessedAt?: Date;
  metadata?: any;
}

export interface RetentionMetrics {
  totalRecords: number;
  recordsByDataType: Record<string, number>;
  recordsByAge: {
    last30Days: number;
    last90Days: number;
    last365Days: number;
    older: number;
  };
  upcomingDeletions: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
}

export class DataRetentionService extends EventEmitter {
  private retentionJobs: Map<string, RetentionJob> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private dataRecords: Map<string, DataRecord> = new Map();
  private isRunning = false;

  constructor(private gdprService: GDPRComplianceService) {
    super();
    this.initializeService();
  }

  private initializeService(): void {
    // Schedule initial retention check
    setTimeout(() => this.scheduleRetentionJobs(), 1000);
    
    // Schedule daily retention job scheduling
    setInterval(() => this.scheduleRetentionJobs(), 24 * 60 * 60 * 1000);
    
    this.isRunning = true;
    this.emit('serviceStarted');
  }

  // Job Scheduling
  public scheduleRetentionJobs(): void {
    if (!this.isRunning) return;

    const policies = this.gdprService.getAllRetentionPolicies()
      .filter(policy => policy.autoDelete);

    for (const policy of policies) {
      this.scheduleRetentionJob(policy);
    }

    this.emit('jobsScheduled', { count: policies.length });
  }

  private scheduleRetentionJob(policy: DataRetentionPolicy): void {
    const jobId = `retention_${policy.id}_${Date.now()}`;
    
    // Calculate next execution time (daily at 2 AM)
    const now = new Date();
    const nextExecution = new Date(now);
    nextExecution.setHours(2, 0, 0, 0);
    
    if (nextExecution <= now) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }

    const job: RetentionJob = {
      id: jobId,
      policyId: policy.id,
      scheduledAt: nextExecution,
      status: 'scheduled'
    };

    this.retentionJobs.set(jobId, job);

    // Schedule the job execution
    const timeout = setTimeout(() => {
      this.executeRetentionJob(jobId);
    }, nextExecution.getTime() - now.getTime());

    this.scheduledJobs.set(jobId, timeout);
    this.emit('jobScheduled', job);
  }

  // Job Execution
  public async executeRetentionJob(jobId: string): Promise<RetentionJob | null> {
    const job = this.retentionJobs.get(jobId);
    if (!job || job.status !== 'scheduled') return null;

    const policy = this.gdprService.getRetentionPolicy(job.policyId);
    if (!policy) {
      job.status = 'failed';
      job.error = 'Retention policy not found';
      this.emit('jobFailed', job);
      return job;
    }

    job.status = 'running';
    job.executedAt = new Date();
    this.emit('jobStarted', job);

    try {
      const cutoffDate = new Date(Date.now() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
      const result = await this.deleteExpiredData(policy.dataType, cutoffDate);

      job.recordsProcessed = result.processed;
      job.recordsDeleted = result.deleted;
      job.status = 'completed';

      this.emit('jobCompleted', job);
      this.emit('dataRetained', {
        policyId: policy.id,
        dataType: policy.dataType,
        cutoffDate,
        recordsDeleted: result.deleted
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('jobFailed', job);
    }

    // Clean up scheduled timeout
    const timeout = this.scheduledJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(jobId);
    }

    return job;
  }

  private async deleteExpiredData(
    dataType: string,
    cutoffDate: Date
  ): Promise<{ processed: number; deleted: number }> {
    const expiredRecords = Array.from(this.dataRecords.values())
      .filter(record => 
        record.dataType === dataType && 
        record.createdAt < cutoffDate
      );

    let deleted = 0;
    
    for (const record of expiredRecords) {
      try {
        await this.deleteDataRecord(record);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete record ${record.id}:`, error);
      }
    }

    return {
      processed: expiredRecords.length,
      deleted
    };
  }

  private async deleteDataRecord(record: DataRecord): Promise<void> {
    // Simulate data deletion from various storage systems
    switch (record.dataType) {
      case 'user_profile':
        await this.deleteFromUserDatabase(record);
        break;
      case 'activity_logs':
        await this.deleteFromActivityDatabase(record);
        break;
      case 'telemetry_data':
        await this.deleteFromTelemetryDatabase(record);
        break;
      case 'communication_data':
        await this.deleteFromCommunicationDatabase(record);
        break;
      default:
        await this.deleteFromGenericStorage(record);
    }

    // Remove from local tracking
    this.dataRecords.delete(record.id);
    
    this.emit('recordDeleted', record);
  }

  // Database-specific deletion methods (simulated)
  private async deleteFromUserDatabase(record: DataRecord): Promise<void> {
    console.log(`Deleting user profile record ${record.id} for user ${record.userId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async deleteFromActivityDatabase(record: DataRecord): Promise<void> {
    console.log(`Deleting activity log record ${record.id} for user ${record.userId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async deleteFromTelemetryDatabase(record: DataRecord): Promise<void> {
    console.log(`Deleting telemetry record ${record.id} for user ${record.userId}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  private async deleteFromCommunicationDatabase(record: DataRecord): Promise<void> {
    console.log(`Deleting communication record ${record.id} for user ${record.userId}`);
    await new Promise(resolve => setTimeout(resolve, 75));
  }

  private async deleteFromGenericStorage(record: DataRecord): Promise<void> {
    console.log(`Deleting generic record ${record.id} for user ${record.userId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Data Record Management
  public addDataRecord(record: Omit<DataRecord, 'id'>): DataRecord {
    const id = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataRecord: DataRecord = { id, ...record };
    
    this.dataRecords.set(id, dataRecord);
    this.emit('recordAdded', dataRecord);
    
    return dataRecord;
  }

  public updateDataRecord(recordId: string, updates: Partial<DataRecord>): DataRecord | null {
    const record = this.dataRecords.get(recordId);
    if (!record) return null;

    const updatedRecord = { ...record, ...updates };
    this.dataRecords.set(recordId, updatedRecord);
    this.emit('recordUpdated', updatedRecord);
    
    return updatedRecord;
  }

  public getDataRecord(recordId: string): DataRecord | null {
    return this.dataRecords.get(recordId) || null;
  }

  public getDataRecordsByUser(userId: string): DataRecord[] {
    return Array.from(this.dataRecords.values())
      .filter(record => record.userId === userId);
  }

  public getDataRecordsByType(dataType: string): DataRecord[] {
    return Array.from(this.dataRecords.values())
      .filter(record => record.dataType === dataType);
  }

  // Manual Retention Operations
  public async executeImmediateRetention(policyId: string): Promise<RetentionJob> {
    const policy = this.gdprService.getRetentionPolicy(policyId);
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyId}`);
    }

    const jobId = `immediate_${policyId}_${Date.now()}`;
    const job: RetentionJob = {
      id: jobId,
      policyId,
      scheduledAt: new Date(),
      status: 'scheduled'
    };

    this.retentionJobs.set(jobId, job);
    return await this.executeRetentionJob(jobId) || job;
  }

  public async deleteUserDataImmediately(userId: string): Promise<number> {
    const userRecords = this.getDataRecordsByUser(userId);
    let deletedCount = 0;

    for (const record of userRecords) {
      try {
        await this.deleteDataRecord(record);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete record ${record.id}:`, error);
      }
    }

    this.emit('userDataDeleted', { userId, recordsDeleted: deletedCount });
    return deletedCount;
  }

  // Metrics and Reporting
  public getRetentionMetrics(): RetentionMetrics {
    const now = new Date();
    const records = Array.from(this.dataRecords.values());

    const recordsByDataType: Record<string, number> = {};
    const recordsByAge = {
      last30Days: 0,
      last90Days: 0,
      last365Days: 0,
      older: 0
    };

    const upcomingDeletions = {
      next7Days: 0,
      next30Days: 0,
      next90Days: 0
    };

    for (const record of records) {
      // Count by data type
      recordsByDataType[record.dataType] = (recordsByDataType[record.dataType] || 0) + 1;

      // Count by age
      const ageInDays = (now.getTime() - record.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (ageInDays <= 30) {
        recordsByAge.last30Days++;
      } else if (ageInDays <= 90) {
        recordsByAge.last90Days++;
      } else if (ageInDays <= 365) {
        recordsByAge.last365Days++;
      } else {
        recordsByAge.older++;
      }

      // Calculate upcoming deletions
      const policy = this.gdprService.getRetentionPoliciesByDataType(record.dataType)[0];
      if (policy && policy.autoDelete) {
        const deletionDate = new Date(record.createdAt.getTime() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
        const daysUntilDeletion = (deletionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

        if (daysUntilDeletion <= 7 && daysUntilDeletion > 0) {
          upcomingDeletions.next7Days++;
        } else if (daysUntilDeletion <= 30 && daysUntilDeletion > 0) {
          upcomingDeletions.next30Days++;
        } else if (daysUntilDeletion <= 90 && daysUntilDeletion > 0) {
          upcomingDeletions.next90Days++;
        }
      }
    }

    return {
      totalRecords: records.length,
      recordsByDataType,
      recordsByAge,
      upcomingDeletions
    };
  }

  public getRetentionJobs(status?: RetentionJob['status']): RetentionJob[] {
    const jobs = Array.from(this.retentionJobs.values());
    return status ? jobs.filter(job => job.status === status) : jobs;
  }

  public getRetentionJob(jobId: string): RetentionJob | null {
    return this.retentionJobs.get(jobId) || null;
  }

  // Policy Compliance Check
  public checkPolicyCompliance(): {
    compliant: boolean;
    violations: Array<{
      policyId: string;
      dataType: string;
      violationType: 'overdue_deletion' | 'missing_policy';
      recordCount: number;
      details: string;
    }>;
  } {
    const violations: any[] = [];
    const now = new Date();
    const records = Array.from(this.dataRecords.values());

    // Group records by data type
    const recordsByType = records.reduce((acc, record) => {
      if (!acc[record.dataType]) acc[record.dataType] = [];
      acc[record.dataType].push(record);
      return acc;
    }, {} as Record<string, DataRecord[]>);

    for (const [dataType, typeRecords] of Object.entries(recordsByType)) {
      const policies = this.gdprService.getRetentionPoliciesByDataType(dataType);
      
      if (policies.length === 0) {
        violations.push({
          policyId: 'none',
          dataType,
          violationType: 'missing_policy',
          recordCount: typeRecords.length,
          details: `No retention policy defined for data type: ${dataType}`
        });
        continue;
      }

      const policy = policies[0]; // Use first policy if multiple exist
      if (!policy.autoDelete) continue;

      const overdueRecords = typeRecords.filter(record => {
        const ageInDays = (now.getTime() - record.createdAt.getTime()) / (24 * 60 * 60 * 1000);
        return ageInDays > policy.retentionPeriodDays;
      });

      if (overdueRecords.length > 0) {
        violations.push({
          policyId: policy.id,
          dataType,
          violationType: 'overdue_deletion',
          recordCount: overdueRecords.length,
          details: `${overdueRecords.length} records exceed retention period of ${policy.retentionPeriodDays} days`
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  // Service Management
  public pauseService(): void {
    this.isRunning = false;
    
    // Clear all scheduled jobs
    for (const [jobId, timeout] of this.scheduledJobs.entries()) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(jobId);
      
      const job = this.retentionJobs.get(jobId);
      if (job && job.status === 'scheduled') {
        job.status = 'failed';
        job.error = 'Service paused';
      }
    }
    
    this.emit('servicePaused');
  }

  public resumeService(): void {
    this.isRunning = true;
    this.scheduleRetentionJobs();
    this.emit('serviceResumed');
  }

  public getServiceStatus(): {
    isRunning: boolean;
    scheduledJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalRecords: number;
  } {
    const jobs = Array.from(this.retentionJobs.values());
    
    return {
      isRunning: this.isRunning,
      scheduledJobs: jobs.filter(j => j.status === 'scheduled').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalRecords: this.dataRecords.size
    };
  }

  public shutdown(): void {
    this.pauseService();
    this.removeAllListeners();
    this.emit('serviceShutdown');
  }

  // Utility Methods
  public simulateDataCreation(count: number = 100): void {
    const dataTypes = ['user_profile', 'activity_logs', 'telemetry_data', 'communication_data'];
    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

    for (let i = 0; i < count; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 1000); // 0-1000 days ago
      const createdAt = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
      
      this.addDataRecord({
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        dataType: dataTypes[Math.floor(Math.random() * dataTypes.length)],
        createdAt,
        lastAccessedAt: Math.random() > 0.5 ? new Date() : undefined,
        metadata: { simulated: true, index: i }
      });
    }
  }
}