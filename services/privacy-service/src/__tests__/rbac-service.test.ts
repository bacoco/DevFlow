import { RBACService, Role, Permission, User, AccessRequest } from '../services/rbac-service';

describe('RBACService', () => {
  let rbacService: RBACService;
  let testUsers: User[];

  beforeEach(() => {
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
        id: 'developer-2',
        email: 'dev2@company.com',
        roles: [Role.DEVELOPER],
        teamIds: ['team-2'],
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
      },
      {
        id: 'inactive-user',
        email: 'inactive@company.com',
        roles: [Role.DEVELOPER],
        teamIds: ['team-1'],
        isActive: false,
        createdAt: new Date()
      }
    ];

    testUsers.forEach(user => rbacService.addUser(user));
  });

  describe('User Management', () => {
    it('should add and retrieve users', () => {
      const user = rbacService.getUser('admin-1');
      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@company.com');
      expect(user?.roles).toContain(Role.ADMIN);
    });

    it('should update user roles', () => {
      const success = rbacService.updateUserRoles('developer-1', [Role.DEVELOPER, Role.TEAM_LEAD]);
      expect(success).toBe(true);

      const user = rbacService.getUser('developer-1');
      expect(user?.roles).toContain(Role.DEVELOPER);
      expect(user?.roles).toContain(Role.TEAM_LEAD);
    });

    it('should not update roles for non-existent user', () => {
      const success = rbacService.updateUserRoles('non-existent', [Role.VIEWER]);
      expect(success).toBe(false);
    });

    it('should deactivate users', () => {
      const success = rbacService.deactivateUser('developer-1');
      expect(success).toBe(true);

      const user = rbacService.getUser('developer-1');
      expect(user?.isActive).toBe(false);
    });
  });

  describe('Permission System', () => {
    it('should return correct permissions for admin', () => {
      const permissions = rbacService.getUserPermissions('admin-1');
      
      expect(permissions).toContain(Permission.READ_ALL_DATA);
      expect(permissions).toContain(Permission.WRITE_ALL_DATA);
      expect(permissions).toContain(Permission.DELETE_ALL_DATA);
      expect(permissions).toContain(Permission.MANAGE_USERS);
      expect(permissions).toContain(Permission.SYSTEM_CONFIG);
    });

    it('should return correct permissions for privacy officer', () => {
      const permissions = rbacService.getUserPermissions('privacy-officer-1');
      
      expect(permissions).toContain(Permission.READ_ALL_DATA);
      expect(permissions).toContain(Permission.MANAGE_PRIVACY_SETTINGS);
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS);
      expect(permissions).toContain(Permission.EXPORT_DATA);
      expect(permissions).not.toContain(Permission.MANAGE_USERS);
    });

    it('should return correct permissions for team lead', () => {
      const permissions = rbacService.getUserPermissions('team-lead-1');
      
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.WRITE_OWN_DATA);
      expect(permissions).toContain(Permission.READ_TEAM_DATA);
      expect(permissions).toContain(Permission.WRITE_TEAM_DATA);
      expect(permissions).not.toContain(Permission.READ_ALL_DATA);
    });

    it('should return correct permissions for developer', () => {
      const permissions = rbacService.getUserPermissions('developer-1');
      
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.WRITE_OWN_DATA);
      expect(permissions).toContain(Permission.READ_TEAM_DATA);
      expect(permissions).not.toContain(Permission.WRITE_TEAM_DATA);
      expect(permissions).not.toContain(Permission.READ_ALL_DATA);
    });

    it('should return correct permissions for viewer', () => {
      const permissions = rbacService.getUserPermissions('viewer-1');
      
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.READ_TEAM_DATA);
      expect(permissions).not.toContain(Permission.WRITE_OWN_DATA);
      expect(permissions).not.toContain(Permission.DELETE_OWN_DATA);
    });

    it('should return empty permissions for inactive user', () => {
      const permissions = rbacService.getUserPermissions('inactive-user');
      expect(permissions).toHaveLength(0);
    });

    it('should check individual permissions correctly', () => {
      expect(rbacService.hasPermission('admin-1', Permission.MANAGE_USERS)).toBe(true);
      expect(rbacService.hasPermission('developer-1', Permission.MANAGE_USERS)).toBe(false);
      expect(rbacService.hasPermission('viewer-1', Permission.WRITE_OWN_DATA)).toBe(false);
    });
  });

  describe('Access Control', () => {
    it('should grant access to admin for all resources', () => {
      const request: AccessRequest = {
        userId: 'admin-1',
        resource: 'all_data',
        action: 'read'
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
      expect(result.appliedRoles).toContain(Role.ADMIN);
    });

    it('should grant access to user for their own data', () => {
      const request: AccessRequest = {
        userId: 'developer-1',
        resource: 'user_data',
        action: 'read',
        context: { targetUserId: 'developer-1' }
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(true);
      expect(result.appliedRoles).toContain(Role.DEVELOPER);
    });

    it('should deny access to user for other users data', () => {
      const request: AccessRequest = {
        userId: 'developer-1',
        resource: 'user_data',
        action: 'read',
        context: { targetUserId: 'developer-2' }
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Access denied by contextual rules');
    });

    it('should grant team lead access to team data', () => {
      const request: AccessRequest = {
        userId: 'team-lead-1',
        resource: 'team_data',
        action: 'read',
        context: { teamId: 'team-1' }
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(true);
    });

    it('should deny team lead access to other team data', () => {
      const request: AccessRequest = {
        userId: 'team-lead-1',
        resource: 'team_data',
        action: 'read',
        context: { teamId: 'team-3' }
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Access denied by contextual rules');
    });

    it('should deny access to inactive user', () => {
      const request: AccessRequest = {
        userId: 'inactive-user',
        resource: 'user_data',
        action: 'read'
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('User not found or inactive');
    });

    it('should deny access for insufficient permissions', () => {
      const request: AccessRequest = {
        userId: 'viewer-1',
        resource: 'user_data',
        action: 'write'
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
      expect(result.requiredPermissions).toContain(Permission.WRITE_OWN_DATA);
    });

    it('should handle privacy officer permissions correctly', () => {
      const request: AccessRequest = {
        userId: 'privacy-officer-1',
        resource: 'privacy_settings',
        action: 'manage'
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(true);
      expect(result.appliedRoles).toContain(Role.PRIVACY_OFFICER);
    });
  });

  describe('Role Hierarchy', () => {
    it('should correctly determine role hierarchy', () => {
      expect(rbacService.isRoleHigherThan(Role.ADMIN, Role.TEAM_LEAD)).toBe(true);
      expect(rbacService.isRoleHigherThan(Role.PRIVACY_OFFICER, Role.DEVELOPER)).toBe(true);
      expect(rbacService.isRoleHigherThan(Role.TEAM_LEAD, Role.VIEWER)).toBe(true);
      expect(rbacService.isRoleHigherThan(Role.DEVELOPER, Role.ADMIN)).toBe(false);
      expect(rbacService.isRoleHigherThan(Role.VIEWER, Role.DEVELOPER)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should get users by role', () => {
      const developers = rbacService.getUsersByRole(Role.DEVELOPER);
      
      expect(developers).toHaveLength(2);
      expect(developers.map(u => u.id)).toContain('developer-1');
      expect(developers.map(u => u.id)).toContain('developer-2');
      expect(developers.map(u => u.id)).not.toContain('inactive-user');
    });

    it('should check multiple permissions at once', () => {
      const permissions = [Permission.READ_OWN_DATA, Permission.WRITE_OWN_DATA, Permission.MANAGE_USERS];
      const result = rbacService.checkMultiplePermissions('developer-1', permissions);
      
      expect(result[Permission.READ_OWN_DATA]).toBe(true);
      expect(result[Permission.WRITE_OWN_DATA]).toBe(true);
      expect(result[Permission.MANAGE_USERS]).toBe(false);
    });

    it('should get effective permissions for resource', () => {
      const permissions = rbacService.getEffectivePermissions('team-lead-1', 'team');
      
      expect(permissions).toContain(Permission.READ_TEAM_DATA);
      expect(permissions).toContain(Permission.WRITE_TEAM_DATA);
      expect(permissions).not.toContain(Permission.READ_OWN_DATA);
    });
  });

  describe('Middleware Integration', () => {
    it('should create middleware that checks access', () => {
      const middleware = rbacService.createMiddleware();
      const checkAccess = middleware('user_data', 'read');
      
      const mockReq = {
        user: { id: 'developer-1' },
        params: {},
        body: {}
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      checkAccess(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq).toHaveProperty('accessInfo');
    });

    it('should deny access in middleware for insufficient permissions', () => {
      const middleware = rbacService.createMiddleware();
      const checkAccess = middleware('all_data', 'write');
      
      const mockReq = {
        user: { id: 'viewer-1' },
        params: {},
        body: {}
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      checkAccess(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
          reason: 'Insufficient permissions'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authentication in middleware', () => {
      const middleware = rbacService.createMiddleware();
      const checkAccess = middleware('user_data', 'read');
      
      const mockReq = {
        params: {},
        body: {}
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      checkAccess(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Complex Access Scenarios', () => {
    it('should handle multi-role users correctly', () => {
      // Add a user with multiple roles
      const multiRoleUser: User = {
        id: 'multi-role-1',
        email: 'multi@company.com',
        roles: [Role.DEVELOPER, Role.TEAM_LEAD],
        teamIds: ['team-1'],
        isActive: true,
        createdAt: new Date()
      };
      
      rbacService.addUser(multiRoleUser);
      
      const permissions = rbacService.getUserPermissions('multi-role-1');
      
      // Should have permissions from both roles
      expect(permissions).toContain(Permission.READ_OWN_DATA); // From DEVELOPER
      expect(permissions).toContain(Permission.WRITE_TEAM_DATA); // From TEAM_LEAD
    });

    it('should handle cross-team access correctly', () => {
      const request: AccessRequest = {
        userId: 'developer-1', // In team-1
        resource: 'team_data',
        action: 'read',
        context: { teamId: 'team-2' } // Trying to access team-2
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Access denied by contextual rules');
    });

    it('should allow admin to access any team data', () => {
      const request: AccessRequest = {
        userId: 'admin-1',
        resource: 'team_data',
        action: 'read',
        context: { teamId: 'team-999' } // Non-existent team
      };

      const result = rbacService.checkAccess(request);
      
      expect(result.granted).toBe(true); // Admin has READ_ALL_DATA permission
    });
  });
});