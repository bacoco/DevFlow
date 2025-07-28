export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'resource';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  events: AuditEvent[];
  totalCount: number;
  summary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
  };
  generatedAt: Date;
  query: AuditQuery;
}

export class AuditService {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 100000; // Keep last 100k events in memory

  constructor() {
    // In production, this would connect to a persistent storage like MongoDB or Elasticsearch
  }

  logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.events.push(auditEvent);

    // Maintain memory limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In production, also persist to database
    this.persistEvent(auditEvent);
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistEvent(event: AuditEvent): void {
    // In production, this would save to database
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('AUDIT:', JSON.stringify(event, null, 2));
    }
  }

  queryEvents(query: AuditQuery): AuditEvent[] {
    let filteredEvents = [...this.events];

    // Apply filters
    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId);
    }

    if (query.action) {
      filteredEvents = filteredEvents.filter(event => 
        event.action.toLowerCase().includes(query.action!.toLowerCase())
      );
    }

    if (query.resource) {
      filteredEvents = filteredEvents.filter(event => 
        event.resource.toLowerCase().includes(query.resource!.toLowerCase())
      );
    }

    if (query.startDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp >= query.startDate!
      );
    }

    if (query.endDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp <= query.endDate!
      );
    }

    if (query.success !== undefined) {
      filteredEvents = filteredEvents.filter(event => event.success === query.success);
    }

    // Apply sorting
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    
    filteredEvents.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'timestamp') {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return filteredEvents.slice(offset, offset + limit);
  }

  generateReport(query: AuditQuery): AuditReport {
    const allFilteredEvents = this.queryEventsWithoutPagination(query);
    const events = this.queryEvents(query);

    const summary = this.generateSummary(allFilteredEvents);

    return {
      events,
      totalCount: allFilteredEvents.length,
      summary,
      generatedAt: new Date(),
      query
    };
  }

  private queryEventsWithoutPagination(query: AuditQuery): AuditEvent[] {
    const queryWithoutPagination = { ...query };
    delete queryWithoutPagination.limit;
    delete queryWithoutPagination.offset;
    
    // Use a large limit to get all results
    return this.queryEvents({ ...queryWithoutPagination, limit: this.maxEvents });
  }

  private generateSummary(events: AuditEvent[]) {
    const totalEvents = events.length;
    const successfulEvents = events.filter(e => e.success).length;
    const failedEvents = totalEvents - successfulEvents;
    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    // Count actions
    const actionCounts = new Map<string, number>();
    events.forEach(event => {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count resources
    const resourceCounts = new Map<string, number>();
    events.forEach(event => {
      resourceCounts.set(event.resource, (resourceCounts.get(event.resource) || 0) + 1);
    });

    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      uniqueUsers,
      topActions,
      topResources
    };
  }

  // Middleware for Express.js to automatically log requests
  createMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Capture original res.json to log response
      const originalJson = res.json;
      let responseData: any;
      
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Log after response is sent
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        this.logEvent({
          userId: req.user?.id || 'anonymous',
          userEmail: req.user?.email,
          action: `${req.method} ${req.route?.path || req.path}`,
          resource: this.extractResourceFromPath(req.path),
          resourceId: req.params?.id,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            requestBody: this.sanitizeRequestBody(req.body),
            queryParams: req.query,
            responseSize: res.get('content-length')
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID,
          success,
          errorMessage: success ? undefined : responseData?.error,
          metadata: {
            accessInfo: req.accessInfo,
            correlationId: req.headers['x-correlation-id']
          }
        });
      });

      next();
    };
  }

  private extractResourceFromPath(path: string): string {
    // Extract resource type from API path
    const pathParts = path.split('/').filter(part => part);
    
    if (pathParts.length === 0) return 'root';
    
    // Remove version prefix if present
    if (pathParts[0].startsWith('v')) {
      pathParts.shift();
    }

    // Return the first meaningful path segment
    return pathParts[0] || 'unknown';
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result: any = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
        
        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  // Get events for a specific user
  getUserEvents(userId: string, limit: number = 100): AuditEvent[] {
    return this.queryEvents({ userId, limit, sortBy: 'timestamp', sortOrder: 'desc' });
  }

  // Get failed events for monitoring
  getFailedEvents(hours: number = 24): AuditEvent[] {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.queryEvents({ 
      success: false, 
      startDate, 
      sortBy: 'timestamp', 
      sortOrder: 'desc' 
    });
  }

  // Get security-related events
  getSecurityEvents(hours: number = 24): AuditEvent[] {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const securityActions = ['login', 'logout', 'password_change', 'role_change', 'permission_denied'];
    
    return this.events.filter(event => 
      event.timestamp >= startDate &&
      securityActions.some(action => event.action.toLowerCase().includes(action))
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Export events to CSV
  exportToCSV(query: AuditQuery): string {
    const events = this.queryEventsWithoutPagination(query);
    
    const headers = [
      'ID', 'Timestamp', 'User ID', 'User Email', 'Action', 'Resource', 
      'Resource ID', 'Success', 'IP Address', 'User Agent', 'Error Message'
    ];

    const csvRows = [headers.join(',')];
    
    events.forEach(event => {
      const row = [
        event.id,
        event.timestamp.toISOString(),
        event.userId,
        event.userEmail || '',
        event.action,
        event.resource,
        event.resourceId || '',
        event.success.toString(),
        event.ipAddress || '',
        `"${event.userAgent || ''}"`, // Quoted to handle commas
        `"${event.errorMessage || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Get audit statistics
  getStatistics(days: number = 30): {
    totalEvents: number;
    dailyAverageEvents: number;
    successRate: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    eventTrends: Array<{ date: string; count: number }>;
  } {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = this.queryEvents({ startDate, limit: this.maxEvents });

    const totalEvents = events.length;
    const dailyAverageEvents = totalEvents / days;
    const successfulEvents = events.filter(e => e.success).length;
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;

    // Top users by event count
    const userCounts = new Map<string, number>();
    events.forEach(event => {
      userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
    });

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    // Event trends by day
    const dailyCounts = new Map<string, number>();
    events.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    const eventTrends = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents,
      dailyAverageEvents,
      successRate,
      topUsers,
      eventTrends
    };
  }

  // Clear old events (for maintenance)
  clearOldEvents(olderThanDays: number): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
    
    return initialCount - this.events.length;
  }
}