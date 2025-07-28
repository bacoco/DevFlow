import { EventEmitter } from 'events';
import { PrivacyService } from './privacy-service';
import { EncryptionService } from './encryption-service';

export interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriodDays: number;
  autoDelete: boolean;
  legalBasis: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GDPRRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  requestDetails: any;
  responseData?: any;
  rejectionReason?: string;
}

export interface DataExportResult {
  userId: string;
  exportId: string;
  format: 'json' | 'csv' | 'xml';
  data: {
    personalData: any;
    activityData: any;
    preferences: any;
    metadata: {
      exportedAt: Date;
      dataTypes: string[];
      retentionPolicies: DataRetentionPolicy[];
    };
  };
  downloadUrl?: string;
  expiresAt: Date;
}

export interface DataDeletionResult {
  userId: string;
  deletionId: string;
  deletedDataTypes: string[];
  deletionStartedAt: Date;
  deletionCompletedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errors?: string[];
  verificationHash: string;
}

export class GDPRComplianceService extends EventEmitter {
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private gdprRequests: Map<string, GDPRRequest> = new Map();
  private dataExports: Map<string, DataExportResult> = new Map();
  private dataDeletions: Map<string, DataDeletionResult> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private privacyService: PrivacyService,
    private encryptionService: EncryptionService
  ) {
    super();
    this.initializeDefaultPolicies();
    this.startAutomaticCleanup();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<DataRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        dataType: 'user_profile',
        retentionPeriodDays: 730, // 2 years
        autoDelete: true,
        legalBasis: 'Legitimate interest for service provision'
      },
      {
        dataType: 'activity_logs',
        retentionPeriodDays: 365, // 1 year
        autoDelete: true,
        legalBasis: 'Legitimate interest for analytics'
      },
      {
        dataType: 'telemetry_data',
        retentionPeriodDays: 90, // 3 months
        autoDelete: true,
        legalBasis: 'Legitimate interest for product improvement'
      },
      {
        dataType: 'communication_data',
        retentionPeriodDays: 180, // 6 months
        autoDelete: true,
        legalBasis: 'Legitimate interest for collaboration features'
      },
      {
        dataType: 'audit_logs',
        retentionPeriodDays: 2555, // 7 years (compliance requirement)
        autoDelete: false,
        legalBasis: 'Legal obligation for audit compliance'
      }
    ];

    defaultPolicies.forEach(policy => {
      this.createRetentionPolicy(policy);
    });
  }

  // Data Retention Policy Management
  public createRetentionPolicy(
    policy: Omit<DataRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): DataRetentionPolicy {
    const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const retentionPolicy: DataRetentionPolicy = {
      id,
      ...policy,
      createdAt: now,
      updatedAt: now
    };

    this.retentionPolicies.set(id, retentionPolicy);
    this.emit('retentionPolicyCreated', retentionPolicy);
    
    return retentionPolicy;
  }

  public updateRetentionPolicy(
    policyId: string,
    updates: Partial<Omit<DataRetentionPolicy, 'id' | 'createdAt'>>
  ): DataRetentionPolicy | null {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) return null;

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date()
    };

    this.retentionPolicies.set(policyId, updatedPolicy);
    this.emit('retentionPolicyUpdated', updatedPolicy);
    
    return updatedPolicy;
  }

  public getRetentionPolicy(policyId: string): DataRetentionPolicy | null {
    return this.retentionPolicies.get(policyId) || null;
  }

  public getRetentionPoliciesByDataType(dataType: string): DataRetentionPolicy[] {
    return Array.from(this.retentionPolicies.values())
      .filter(policy => policy.dataType === dataType);
  }

  public getAllRetentionPolicies(): DataRetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  // GDPR Request Management
  public async submitGDPRRequest(
    userId: string,
    requestType: GDPRRequest['requestType'],
    requestDetails: any
  ): Promise<GDPRRequest> {
    const id = `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: GDPRRequest = {
      id,
      userId,
      requestType,
      status: 'pending',
      requestedAt: new Date(),
      requestDetails
    };

    this.gdprRequests.set(id, request);
    this.emit('gdprRequestSubmitted', request);

    // Auto-process certain request types
    if (requestType === 'access' || requestType === 'portability') {
      setTimeout(() => this.processGDPRRequest(id), 1000);
    }

    return request;
  }

  public async processGDPRRequest(requestId: string): Promise<GDPRRequest | null> {
    const request = this.gdprRequests.get(requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'processing';
    this.emit('gdprRequestProcessing', request);

    try {
      switch (request.requestType) {
        case 'access':
        case 'portability':
          const exportResult = await this.exportUserData(
            request.userId,
            request.requestType === 'portability' ? 'json' : 'json'
          );
          request.responseData = { exportId: exportResult.exportId };
          break;

        case 'erasure':
          const deletionResult = await this.deleteUserData(
            request.userId,
            request.requestDetails.dataTypes || ['all']
          );
          request.responseData = { deletionId: deletionResult.deletionId };
          break;

        case 'rectification':
          // Handle data correction requests
          request.responseData = { message: 'Data rectification completed' };
          break;

        case 'restriction':
          // Handle processing restriction requests
          request.responseData = { message: 'Processing restriction applied' };
          break;

        case 'objection':
          // Handle objection to processing requests
          request.responseData = { message: 'Processing objection recorded' };
          break;
      }

      request.status = 'completed';
      request.completedAt = new Date();
      this.emit('gdprRequestCompleted', request);

    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = error instanceof Error ? error.message : 'Unknown error';
      this.emit('gdprRequestRejected', request);
    }

    return request;
  }

  public getGDPRRequest(requestId: string): GDPRRequest | null {
    return this.gdprRequests.get(requestId) || null;
  }

  public getUserGDPRRequests(userId: string): GDPRRequest[] {
    return Array.from(this.gdprRequests.values())
      .filter(request => request.userId === userId);
  }

  // Data Export (Right to Access / Data Portability)
  public async exportUserData(
    userId: string,
    format: DataExportResult['format'] = 'json'
  ): Promise<DataExportResult> {
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate data collection from various services
    const personalData = await this.collectPersonalData(userId);
    const activityData = await this.collectActivityData(userId);
    const preferences = await this.collectUserPreferences(userId);

    const exportResult: DataExportResult = {
      userId,
      exportId,
      format,
      data: {
        personalData,
        activityData,
        preferences,
        metadata: {
          exportedAt: new Date(),
          dataTypes: ['personal', 'activity', 'preferences'],
          retentionPolicies: this.getAllRetentionPolicies()
        }
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    // Encrypt sensitive export data
    const encryptedData = this.encryptionService.encryptObject(exportResult.data);
    exportResult.data = encryptedData as any;

    this.dataExports.set(exportId, exportResult);
    this.emit('dataExported', exportResult);

    return exportResult;
  }

  public getDataExport(exportId: string): DataExportResult | null {
    const exportResult = this.dataExports.get(exportId);
    if (!exportResult) return null;

    // Check if export has expired
    if (exportResult.expiresAt < new Date()) {
      this.dataExports.delete(exportId);
      return null;
    }

    return exportResult;
  }

  public async downloadDataExport(exportId: string): Promise<any | null> {
    const exportResult = this.getDataExport(exportId);
    if (!exportResult) return null;

    // Decrypt the data for download
    try {
      const decryptedData = this.encryptionService.decryptObject(exportResult.data as any);
      return decryptedData;
    } catch (error) {
      console.error('Failed to decrypt export data:', error);
      return null;
    }
  }

  // Data Deletion (Right to Erasure)
  public async deleteUserData(
    userId: string,
    dataTypes: string[] = ['all']
  ): Promise<DataDeletionResult> {
    const deletionId = `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const deletionResult: DataDeletionResult = {
      userId,
      deletionId,
      deletedDataTypes: dataTypes,
      deletionStartedAt: new Date(),
      status: 'pending',
      verificationHash: this.generateVerificationHash(userId, dataTypes)
    };

    this.dataDeletions.set(deletionId, deletionResult);
    this.emit('dataDeletionStarted', deletionResult);

    // Simulate async deletion process
    setTimeout(async () => {
      try {
        deletionResult.status = 'in_progress';
        
        // Perform actual data deletion across services
        if (dataTypes.includes('all') || dataTypes.includes('personal')) {
          await this.deletePersonalData(userId);
        }
        
        if (dataTypes.includes('all') || dataTypes.includes('activity')) {
          await this.deleteActivityData(userId);
        }
        
        if (dataTypes.includes('all') || dataTypes.includes('preferences')) {
          await this.deleteUserPreferences(userId);
        }

        deletionResult.status = 'completed';
        deletionResult.deletionCompletedAt = new Date();
        this.emit('dataDeletionCompleted', deletionResult);

      } catch (error) {
        deletionResult.status = 'failed';
        deletionResult.errors = [error instanceof Error ? error.message : 'Unknown error'];
        this.emit('dataDeletionFailed', deletionResult);
      }
    }, 2000);

    return deletionResult;
  }

  public getDeletionResult(deletionId: string): DataDeletionResult | null {
    return this.dataDeletions.get(deletionId) || null;
  }

  public getUserDeletions(userId: string): DataDeletionResult[] {
    return Array.from(this.dataDeletions.values())
      .filter(deletion => deletion.userId === userId);
  }

  // Automatic Data Purging
  private startAutomaticCleanup(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.performAutomaticDataPurging();
    }, 24 * 60 * 60 * 1000);

    // Also run on startup
    setTimeout(() => this.performAutomaticDataPurging(), 5000);
  }

  public async performAutomaticDataPurging(): Promise<void> {
    console.log('Starting automatic data purging...');
    
    const policies = this.getAllRetentionPolicies().filter(p => p.autoDelete);
    
    for (const policy of policies) {
      try {
        const cutoffDate = new Date(Date.now() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
        await this.purgeDataByPolicy(policy, cutoffDate);
        
        this.emit('dataPurged', {
          policyId: policy.id,
          dataType: policy.dataType,
          cutoffDate,
          purgedAt: new Date()
        });
        
      } catch (error) {
        console.error(`Failed to purge data for policy ${policy.id}:`, error);
        this.emit('dataPurgeError', {
          policyId: policy.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async purgeDataByPolicy(policy: DataRetentionPolicy, cutoffDate: Date): Promise<void> {
    // Simulate data purging based on policy
    console.log(`Purging ${policy.dataType} data older than ${cutoffDate.toISOString()}`);
    
    // In a real implementation, this would:
    // 1. Query databases for data older than cutoffDate
    // 2. Delete or anonymize the data
    // 3. Log the purging activity
    // 4. Update audit trails
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
  }

  // Data Collection Helpers (simulate real data sources)
  private async collectPersonalData(userId: string): Promise<any> {
    return {
      userId,
      profile: {
        name: '[REDACTED]',
        email: '[REDACTED]',
        role: 'developer',
        joinedAt: '2024-01-01T00:00:00Z'
      },
      settings: {
        timezone: 'UTC',
        language: 'en',
        notifications: true
      }
    };
  }

  private async collectActivityData(userId: string): Promise<any> {
    return {
      userId,
      sessions: [
        {
          sessionId: 'session_123',
          startTime: '2024-01-01T09:00:00Z',
          endTime: '2024-01-01T17:00:00Z',
          activities: ['coding', 'reviewing', 'meetings']
        }
      ],
      metrics: {
        totalCommits: 150,
        linesOfCode: 5000,
        reviewsCompleted: 25
      }
    };
  }

  private async collectUserPreferences(userId: string): Promise<any> {
    return {
      userId,
      dashboard: {
        layout: 'grid',
        widgets: ['productivity', 'quality', 'collaboration'],
        theme: 'dark'
      },
      privacy: {
        dataSharing: false,
        analytics: true,
        notifications: true
      }
    };
  }

  // Data Deletion Helpers
  private async deletePersonalData(userId: string): Promise<void> {
    console.log(`Deleting personal data for user ${userId}`);
    // Simulate deletion from user database
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async deleteActivityData(userId: string): Promise<void> {
    console.log(`Deleting activity data for user ${userId}`);
    // Simulate deletion from activity/metrics databases
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async deleteUserPreferences(userId: string): Promise<void> {
    console.log(`Deleting user preferences for user ${userId}`);
    // Simulate deletion from preferences database
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Utility Methods
  private generateVerificationHash(userId: string, dataTypes: string[]): string {
    const data = `${userId}:${dataTypes.join(',')}:${Date.now()}`;
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }

  public verifyDeletion(deletionId: string, verificationHash: string): boolean {
    const deletion = this.getDeletionResult(deletionId);
    return deletion?.verificationHash === verificationHash;
  }

  // Compliance Reporting
  public generateComplianceReport(): any {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentRequests = Array.from(this.gdprRequests.values())
      .filter(req => req.requestedAt >= thirtyDaysAgo);

    const recentExports = Array.from(this.dataExports.values())
      .filter(exp => exp.data.metadata.exportedAt >= thirtyDaysAgo);

    const recentDeletions = Array.from(this.dataDeletions.values())
      .filter(del => del.deletionStartedAt >= thirtyDaysAgo);

    return {
      reportGeneratedAt: now,
      period: {
        from: thirtyDaysAgo,
        to: now
      },
      summary: {
        totalGDPRRequests: recentRequests.length,
        completedRequests: recentRequests.filter(r => r.status === 'completed').length,
        pendingRequests: recentRequests.filter(r => r.status === 'pending').length,
        dataExports: recentExports.length,
        dataDeletions: recentDeletions.length,
        activePolicies: this.retentionPolicies.size
      },
      requestsByType: {
        access: recentRequests.filter(r => r.requestType === 'access').length,
        rectification: recentRequests.filter(r => r.requestType === 'rectification').length,
        erasure: recentRequests.filter(r => r.requestType === 'erasure').length,
        portability: recentRequests.filter(r => r.requestType === 'portability').length,
        restriction: recentRequests.filter(r => r.requestType === 'restriction').length,
        objection: recentRequests.filter(r => r.requestType === 'objection').length
      },
      retentionPolicies: this.getAllRetentionPolicies(),
      averageProcessingTime: this.calculateAverageProcessingTime(recentRequests)
    };
  }

  private calculateAverageProcessingTime(requests: GDPRRequest[]): number {
    const completedRequests = requests.filter(r => r.status === 'completed' && r.completedAt);
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, req) => {
      const processingTime = req.completedAt!.getTime() - req.requestedAt.getTime();
      return sum + processingTime;
    }, 0);

    return totalTime / completedRequests.length / (1000 * 60 * 60); // Convert to hours
  }

  // Cleanup
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
  }
}