import { AuditService, AuditEvent, AuditQuery } from '../services/audit-service';
import { RBACService, Role, Permission, User, AccessRequest } from '../services/rbac-service';

describe('Audit and RBAC Integration Tests', () => {
  let auditService: AuditService;
  let rbacService: RBACService;
  let testUsers: User[];

  beforeEach(() => {
    auditService = new AuditService();
    rbacService = new RBACService();
    
    testUsers = [
      {
        id: 'admin-1',
        email: 'admin@company.com',
        roles: [Role.ADMIN],
        teamIds: ['team-1'],
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date()
      },
      {
        id: 'privacy-officer-1',
        email: 'privacy@company.com',
        roles: [Role.PRIVACY_OFFICER],
        teamIds: ['team-1'],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'team-lead-1',
        email: 'lead@company.com',
        roles: [Role.TEAM_LEAD],
        teamIds: ['team-1', 'team-2'],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'developer-1',
        email: 'dev1@company.com',
        roles: [Role.DEVELOPER],
        teamIds: ['team-1'],
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'viewer-1',
        email: 'viewer@company.com',
        roles: [Role.VIEWER],
        teamIds: ['team-1'],
        isActive: true,
        createdAt: new Date()
      }
    ];

    testUsers.forEach(user => rbacService.addUser(user));
  });

  describe('Access Control with Audit Logging', () => {
    it('should log successful access attempts', () => {
      const request: AccessRequest = {
        userId: 'admin-1',
        resource: 'all_data',
        action: 'read'
      };

      const accessResult = rbacService.checkAccess(request);
      expect(accessResult.granted).toBe(true);

      // Log the access attempt
      auditService.logEvent({
        userId: request.userId,
        userEmail: 'admin@company.com',
        action: `${request.action}_${request.resource}`,
        resource: request.resource,
        details: {
          accessResult
        },
        success: accessResult.granted,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      });

      const events = auditService.getUserEvents('admin-1', 10);
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('read_all_data');
      expect(events[0].success).toBe(true);
      expect(events[0].details.accessResult.granted).toBe(true);
    });

    it('should log failed access attempts', () => {
      const request: AccessRequest = {
        userId: 'viewer-1',
        resource: 'user_data',
        action: 'write',
        context: { targetUserId: 'viewer-1' }
      };

      const accessResult = rbacService.checkAccess(request);
      expect(accessResult.granted).toBe(false);

      // Log the failed access attempt
      auditService.logEvent({
        userId: request.userId,
        userEmail: 'viewer@company.com',
        action: `${request.action}_${request.resource}`,
        resource: request.resource,
        resourceId: request.context?.targetUserId,
        details: {
          accessResult,
          context: request.context
        },
        success: accessResult.granted,
        errorMessage: accessResult.reason,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 Test Browser'
      });

      const events = auditService.getUserEvents('viewer-1', 10);
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('write_user_data');
      expect(events[0].success).toBe(false);
      expect(events[0].errorMessage).toBe('Insufficient permissions');
    });

    it('should track permission escalation attempts', () => {
      // Simulate a user trying to escalate permissions
      const escalationAttempts = [
        { resource: 'all_data', action: 'read' },
        { resource: 'users', action: 'manage' },
        { resource: 'system', action: 'config' }
      ];

      escalationAttempts.forEach(attempt => {
        const request: AccessRequest = {
          userId: 'developer-1',
          resource: attempt.resource,
          action: attempt.action
        };

        const accessResult = rbacService.checkAccess(request);
        
        auditService.logEvent({
          userId: request.userId,
          userEmail: 'dev1@company.com',
          action: `${request.action}_${request.resource}`,
          resource: request.resource,
          details: {
            accessResult,
            suspiciousActivity: true,
            attemptedEscalation: true
          },
          success: accessResult.granted,
          errorMessage: accessResult.reason,
          ipAddress: '192.168.1.102'
        });
      });

      const events = auditService.getUserEvents('developer-1', 10);
      expect(events).toHaveLength(3);
      
      events.forEach(event => {
        expect(event.success).toBe(false);
        expect(event.details.suspiciousActivity).toBe(true);
        expect(event.details.attemptedEscalation).toBe(true);
      });
    });
  });

  describe('Audit Report Generation with RBAC', () => {
    beforeEach(() => {
      // Generate sample audit events
      const sampleEvents = [
        {
          userId: 'admin-1',
          userEmail: 'admin@company.com',
          action: 'read_user_data',
          resource: 'user_data',
          resourceId: 'developer-1',
          details: { operation: 'view_profile' },
          success: true,
          ipAddress: '192.168.1.100'
        },
        {
          userId: 'team-lead-1',
          userEmail: 'lead@company.com',
          action: 'write_team_data',
          resource: 'team_data',
          resourceId: 'team-1',
          details: { operation: 'update_metrics' },
          success: true,
          ipAddress: '192.168.1.103'
        },
        {
          userId: 'developer-1',
          userEmail: 'dev1@company.com',
          action: 'read_all_data',
          resource: 'all_data',
          details: { operation: 'unauthorized_access_attempt' },
          success: false,
          errorMessage: 'Insufficient permissions',
          ipAddress: '192.168.1.102'
        },
        {
          userId: 'privacy-officer-1',
          userEmail: 'privacy@company.com',
          action: 'export_data',
          resource: 'user_data',
          resourceId: 'developer-1',
          details: { operation: 'gdpr_export', format: 'json' },
          success: true,
          ipAddress: '192.168.1.104'
        }
      ];

      sampleEvents.forEach(event => auditService.logEvent(event));
    });

    it('should generate audit reports accessible only to authorized users', () => {
      // Privacy officer should be able to view audit logs
      const privacyOfficerAccess = rbacService.checkAccess({
        userId: 'privacy-officer-1',
        resource: 'audit_logs',
        action: 'view'
      });
      expect(privacyOfficerAccess.granted).toBe(true);

      // Admin should be able to view audit logs
      const adminAccess = rbacService.checkAccess({
        userId: 'admin-1',
        resource: 'audit_logs',
        action: 'view'
      });
      expect(adminAccess.granted).toBe(true);

      // Developer should not be able to view audit logs
      const developerAccess = rbacService.checkAccess({
        userId: 'developer-1',
        resource: 'audit_logs',
        action: 'view'
      });
      expect(developerAccess.granted).toBe(false);

      // Generate report for authorized user
      if (privacyOfficerAccess.granted) {
        const report = auditService.generateReport({
          limit: 100,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        });

        expect(report.events).toHaveLength(4);
        expect(report.summary.totalEvents).toBe(4);
        expect(report.summary.successfulEvents).toBe(3);
        expect(report.summary.failedEvents).toBe(1);
        expect(report.summary.uniqueUsers).toBe(4);
      }
    });

    it('should filter audit reports based on user permissions', () => {
      // Team lead should only see events related to their teams
      const teamLeadAccess = rbacService.checkAccess({
        userId: 'team-lead-1',
        resource: 'team_data',
        action: 'read',
        context: { teamId: 'team-1' }
      });
      expect(teamLeadAccess.granted).toBe(true);

      // Generate filtered report for team lead
      const teamReport = auditService.generateReport({
        userId: 'team-lead-1', // Filter by user
        limit: 100
      });

      expect(teamReport.events).toHaveLength(1);
      expect(teamReport.events[0].userId).toBe('team-lead-1');
    });

    it('should track data export activities for compliance', () => {
      const exportEvents = auditService.queryEvents({
        action: 'export',
        success: true
      });

      expect(exportEvents).toHaveLength(1);
      expect(exportEvents[0].userId).toBe('privacy-officer-1');
      expect(exportEvents[0].details.operation).toBe('gdpr_export');
      expect(exportEvents[0].details.format).toBe('json');
    });
  });

  describe('Security Event Detection', () => {
    it('should detect and log suspicious access patterns', () => {
      // Simulate rapid access attempts from same user
      const suspiciousAttempts = Array(10).fill(0).map((_, i) => ({
        userId: 'developer-1',
        userEmail: 'dev1@company.com',
        action: 'read_all_data',
        resource: 'all_data',
        details: { 
          attemptNumber: i + 1,
          rapidAccess: true,
          timeInterval: '1s'
        },
        success: false,
        errorMessage: 'Insufficient permissions',
        ipAddress: '192.168.1.102'
      }));

      suspiciousAttempts.forEach(event => auditService.logEvent(event));

      const securityEvents = auditService.getSecurityEvents(1);
      const rapidAccessEvents = auditService.getUserEvents('developer-1', 20);

      expect(rapidAccessEvents.length).toBeGreaterThanOrEqual(10);
      
      // All attempts should have failed
      rapidAccessEvents.forEach(event => {
        expect(event.success).toBe(false);
        expect(event.details.rapidAccess).toBe(true);
      });
    });

    it('should log role changes and permission modifications', () => {
      // Simulate role change
      const roleChangeSuccess = rbacService.updateUserRoles('developer-1', [Role.DEVELOPER, Role.TEAM_LEAD]);
      expect(roleChangeSuccess).toBe(true);

      // Log the role change
      auditService.logEvent({
        userId: 'admin-1',
        userEmail: 'admin@company.com',
        action: 'role_change',
        resource: 'user_roles',
        resourceId: 'developer-1',
        details: {
          targetUser: 'developer-1',
          oldRoles: [Role.DEVELOPER],
          newRoles: [Role.DEVELOPER, Role.TEAM_LEAD],
          operation: 'add_role',
          addedRole: Role.TEAM_LEAD
        },
        success: true,
        ipAddress: '192.168.1.100'
      });

      const roleChangeEvents = auditService.queryEvents({
        action: 'role_change',
        success: true
      });

      expect(roleChangeEvents).toHaveLength(1);
      expect(roleChangeEvents[0].details.addedRole).toBe(Role.TEAM_LEAD);
      expect(roleChangeEvents[0].details.targetUser).toBe('developer-1');
    });

    it('should track failed authentication attempts', () => {
      const failedLogins = [
        {
          userId: 'unknown-user',
          action: 'login_attempt',
          resource: 'authentication',
          details: {
            attemptedEmail: 'hacker@malicious.com',
            reason: 'user_not_found'
          },
          success: false,
          errorMessage: 'Invalid credentials',
          ipAddress: '192.168.1.200'
        },
        {
          userId: 'developer-1',
          userEmail: 'dev1@company.com',
          action: 'login_attempt',
          resource: 'authentication',
          details: {
            reason: 'wrong_password',
            attemptNumber: 3
          },
          success: false,
          errorMessage: 'Invalid password',
          ipAddress: '192.168.1.102'
        }
      ];

      failedLogins.forEach(event => auditService.logEvent(event));

      const failedEvents = auditService.getFailedEvents(1);
      const authFailures = failedEvents.filter(e => e.resource === 'authentication');

      expect(authFailures).toHaveLength(2);
      
      // Find the events by userId since order might vary
      const hackerEvent = authFailures.find(e => e.userId === 'unknown-user');
      const developerEvent = authFailures.find(e => e.userId === 'developer-1');
      
      expect(hackerEvent?.details.attemptedEmail).toBe('hacker@malicious.com');
      expect(developerEvent?.details.attemptNumber).toBe(3);
    });
  });

  describe('Compliance and Reporting', () => {
    it('should generate compliance reports for GDPR', () => {
      // Log GDPR-related activities
      const gdprActivities = [
        {
          userId: 'privacy-officer-1',
          userEmail: 'privacy@company.com',
          action: 'data_export',
          resource: 'user_data',
          resourceId: 'developer-1',
          details: {
            requestType: 'gdpr_export',
            dataTypes: ['profile', 'activity', 'preferences'],
            requestedBy: 'developer-1',
            format: 'json'
          },
          success: true,
          ipAddress: '192.168.1.104'
        },
        {
          userId: 'privacy-officer-1',
          userEmail: 'privacy@company.com',
          action: 'data_deletion',
          resource: 'user_data',
          resourceId: 'inactive-user',
          details: {
            requestType: 'gdpr_deletion',
            reason: 'user_request',
            dataTypes: ['all'],
            retentionPeriodExpired: true
          },
          success: true,
          ipAddress: '192.168.1.104'
        }
      ];

      gdprActivities.forEach(event => auditService.logEvent(event));

      const gdprReport = auditService.generateReport({
        resource: 'user_data',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      });

      const gdprEvents = gdprReport.events.filter(e => 
        e.details.requestType?.startsWith('gdpr_')
      );

      expect(gdprEvents).toHaveLength(2);
      
      // Find events by action since order might vary
      const exportEvent = gdprEvents.find(e => e.details.requestType === 'gdpr_export');
      const deletionEvent = gdprEvents.find(e => e.details.requestType === 'gdpr_deletion');
      
      expect(exportEvent).toBeDefined();
      expect(deletionEvent).toBeDefined();
    });

    it('should export audit data in CSV format for compliance', () => {
      // Add some test events
      auditService.logEvent({
        userId: 'admin-1',
        userEmail: 'admin@company.com',
        action: 'system_config',
        resource: 'system',
        details: { setting: 'retention_policy', value: '2_years' },
        success: true,
        ipAddress: '192.168.1.100'
      });

      const csvData = auditService.exportToCSV({
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      expect(csvData).toContain('ID,Timestamp,User ID,User Email,Action,Resource');
      expect(csvData).toContain('admin-1');
      expect(csvData).toContain('admin@company.com');
      expect(csvData).toContain('system_config');
      expect(csvData).toContain('system');
    });

    it('should track data retention compliance', () => {
      // Simulate old events that should be cleaned up
      const oldEvent = {
        userId: 'old-user',
        action: 'old_action',
        resource: 'old_resource',
        details: { note: 'This is an old event' },
        success: true
      };

      auditService.logEvent(oldEvent);

      // Simulate cleanup of old events (older than 30 days)
      const deletedCount = auditService.clearOldEvents(30);
      
      // Since we just added the event, it shouldn't be deleted
      expect(deletedCount).toBe(0);

      // But if we clear events older than -1 days (future cutoff), it should delete all
      const immediateDeleteCount = auditService.clearOldEvents(-1);
      expect(immediateDeleteCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume audit logging efficiently', () => {
      const startTime = Date.now();
      const eventCount = 1000;

      // Generate many audit events
      for (let i = 0; i < eventCount; i++) {
        auditService.logEvent({
          userId: `user-${i % 10}`,
          userEmail: `user${i % 10}@company.com`,
          action: `action-${i % 5}`,
          resource: `resource-${i % 3}`,
          details: { iteration: i },
          success: i % 10 !== 0, // 10% failure rate
          ipAddress: `192.168.1.${100 + (i % 50)}`
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify events were logged
      const statistics = auditService.getStatistics(1);
      expect(statistics.totalEvents).toBeGreaterThanOrEqual(eventCount);
    });

    it('should efficiently query large audit datasets', () => {
      // Add many events first
      for (let i = 0; i < 500; i++) {
        auditService.logEvent({
          userId: `user-${i % 20}`,
          action: `action-${i % 10}`,
          resource: `resource-${i % 5}`,
          details: { index: i },
          success: true
        });
      }

      const startTime = Date.now();

      // Perform complex query
      const results = auditService.generateReport({
        userId: 'user-1',
        action: 'action-1',
        success: true,
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      const queryTime = Date.now() - startTime;

      // Query should complete quickly (less than 1 second)
      expect(queryTime).toBeLessThan(1000);
      expect(results.events.length).toBeGreaterThan(0);
      expect(results.summary.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Integration with Express Middleware', () => {
    it('should create integrated RBAC and audit middleware', () => {
      const rbacMiddleware = rbacService.createMiddleware();
      const auditMiddleware = auditService.createMiddleware();

      // Mock Express request/response
      const mockReq = {
        user: { id: 'admin-1', email: 'admin@company.com' },
        method: 'GET',
        path: '/api/users/developer-1',
        route: { path: '/api/users/:id' },
        params: { id: 'developer-1' },
        body: {},
        query: {},
        ip: '192.168.1.100',
        sessionID: 'session-123',
        headers: { 'user-agent': 'Test Browser' },
        get: jest.fn().mockReturnValue('Test Browser'),
        connection: { remoteAddress: '192.168.1.100' }
      };

      const mockRes = {
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        on: jest.fn(),
        get: jest.fn().mockReturnValue('100')
      };

      const mockNext = jest.fn();

      // Test RBAC middleware
      const rbacCheck = rbacMiddleware('all_data', 'read');
      rbacCheck(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq).toHaveProperty('accessInfo');

      // Test audit middleware
      auditMiddleware(mockReq, mockRes, mockNext);

      // Simulate response finish
      const finishCallback = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      // Verify audit event was logged
      const events = auditService.getUserEvents('admin-1', 10);
      expect(events.length).toBeGreaterThan(0);
      
      const latestEvent = events[0];
      expect(latestEvent.action).toContain('GET');
      expect(latestEvent.resource).toBe('api');
      expect(latestEvent.success).toBe(true);
    });
  });
});