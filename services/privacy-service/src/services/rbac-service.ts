export enum Role {
  ADMIN = 'admin',
  TEAM_LEAD = 'team_lead',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
  PRIVACY_OFFICER = 'privacy_officer'
}

export enum Permission {
  // User data permissions
  READ_OWN_DATA = 'read_own_data',
  WRITE_OWN_DATA = 'write_own_data',
  DELETE_OWN_DATA = 'delete_own_data',
  
  // Team data permissions
  READ_TEAM_DATA = 'read_team_data',
  WRITE_TEAM_DATA = 'write_team_data',
  DELETE_TEAM_DATA = 'delete_team_data',
  
  // System permissions
  READ_ALL_DATA = 'read_all_data',
  WRITE_ALL_DATA = 'write_all_data',
  DELETE_ALL_DATA = 'delete_all_data',
  
  // Privacy permissions
  MANAGE_PRIVACY_SETTINGS = 'manage_privacy_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_DATA = 'export_data',
  
  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  SYSTEM_CONFIG = 'system_config'
}

export interface User {
  id: string;
  email: string;
  roles: Role[];
  teamIds: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AccessRequest {
  userId: string;
  resource: string;
  action: string;
  context?: {
    teamId?: string;
    targetUserId?: string;
    resourceId?: string;
  };
}

export interface AccessResult {
  granted: boolean;
  reason: string;
  appliedRoles: Role[];
  requiredPermissions: Permission[];
}

export class RBACService {
  private rolePermissions: Map<Role, Permission[]> = new Map();
  private users: Map<string, User> = new Map();

  constructor() {
    this.initializeRolePermissions();
  }

  private initializeRolePermissions(): void {
    // Admin has all permissions
    this.rolePermissions.set(Role.ADMIN, [
      Permission.READ_ALL_DATA,
      Permission.WRITE_ALL_DATA,
      Permission.DELETE_ALL_DATA,
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES,
      Permission.SYSTEM_CONFIG,
      Permission.VIEW_AUDIT_LOGS,
      Permission.EXPORT_DATA,
      Permission.MANAGE_PRIVACY_SETTINGS
    ]);

    // Privacy Officer has privacy-related permissions
    this.rolePermissions.set(Role.PRIVACY_OFFICER, [
      Permission.READ_ALL_DATA,
      Permission.MANAGE_PRIVACY_SETTINGS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.EXPORT_DATA,
      Permission.DELETE_ALL_DATA // For GDPR compliance
    ]);

    // Team Lead can manage their team's data
    this.rolePermissions.set(Role.TEAM_LEAD, [
      Permission.READ_OWN_DATA,
      Permission.WRITE_OWN_DATA,
      Permission.DELETE_OWN_DATA,
      Permission.READ_TEAM_DATA,
      Permission.WRITE_TEAM_DATA,
      Permission.EXPORT_DATA
    ]);

    // Developer can manage their own data and read team data
    this.rolePermissions.set(Role.DEVELOPER, [
      Permission.READ_OWN_DATA,
      Permission.WRITE_OWN_DATA,
      Permission.DELETE_OWN_DATA,
      Permission.READ_TEAM_DATA
    ]);

    // Viewer can only read data
    this.rolePermissions.set(Role.VIEWER, [
      Permission.READ_OWN_DATA,
      Permission.READ_TEAM_DATA
    ]);
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUserRoles(userId: string, roles: Role[]): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.roles = roles;
    return true;
  }

  getUserPermissions(userId: string): Permission[] {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return [];

    const permissions = new Set<Permission>();
    
    user.roles.forEach(role => {
      const rolePermissions = this.rolePermissions.get(role) || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    });

    return Array.from(permissions);
  }

  hasPermission(userId: string, permission: Permission): boolean {
    const userPermissions = this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  checkAccess(request: AccessRequest): AccessResult {
    const user = this.users.get(request.userId);
    
    if (!user || !user.isActive) {
      return {
        granted: false,
        reason: 'User not found or inactive',
        appliedRoles: [],
        requiredPermissions: []
      };
    }

    const requiredPermissions = this.getRequiredPermissions(request);
    const userPermissions = this.getUserPermissions(request.userId);
    const appliedRoles = user.roles;

    // Check if user has required permissions
    const hasRequiredPermissions = this.hasAnyRequiredPermission(userPermissions, requiredPermissions);

    if (!hasRequiredPermissions) {
      return {
        granted: false,
        reason: 'Insufficient permissions',
        appliedRoles,
        requiredPermissions
      };
    }

    // Additional context-based checks
    if (!this.checkContextualAccess(request, user)) {
      return {
        granted: false,
        reason: 'Access denied by contextual rules',
        appliedRoles,
        requiredPermissions
      };
    }

    return {
      granted: true,
      reason: 'Access granted',
      appliedRoles,
      requiredPermissions
    };
  }

  private getRequiredPermissions(request: AccessRequest): Permission[] {
    const { resource, action } = request;

    // Map resource/action combinations to required permissions
    const permissionMap: Record<string, Permission[]> = {
      'user_data:read': [Permission.READ_OWN_DATA],
      'user_data:write': [Permission.WRITE_OWN_DATA],
      'user_data:delete': [Permission.DELETE_OWN_DATA],
      
      'team_data:read': [Permission.READ_TEAM_DATA],
      'team_data:write': [Permission.WRITE_TEAM_DATA],
      'team_data:delete': [Permission.DELETE_TEAM_DATA],
      
      'all_data:read': [Permission.READ_ALL_DATA],
      'all_data:write': [Permission.WRITE_ALL_DATA],
      'all_data:delete': [Permission.DELETE_ALL_DATA],
      
      'privacy_settings:manage': [Permission.MANAGE_PRIVACY_SETTINGS],
      'audit_logs:view': [Permission.VIEW_AUDIT_LOGS],
      'data:export': [Permission.EXPORT_DATA],
      
      'users:manage': [Permission.MANAGE_USERS],
      'roles:manage': [Permission.MANAGE_ROLES],
      'system:config': [Permission.SYSTEM_CONFIG]
    };

    const key = `${resource}:${action}`;
    return permissionMap[key] || [];
  }

  private hasAnyRequiredPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    if (requiredPermissions.length === 0) return false;
    
    // For team_data:read, allow if user has either READ_TEAM_DATA or READ_ALL_DATA
    if (requiredPermissions.includes(Permission.READ_TEAM_DATA)) {
      return userPermissions.includes(Permission.READ_TEAM_DATA) || 
             userPermissions.includes(Permission.READ_ALL_DATA);
    }
    
    // For team_data:write, allow if user has either WRITE_TEAM_DATA or WRITE_ALL_DATA
    if (requiredPermissions.includes(Permission.WRITE_TEAM_DATA)) {
      return userPermissions.includes(Permission.WRITE_TEAM_DATA) || 
             userPermissions.includes(Permission.WRITE_ALL_DATA);
    }
    
    // For team_data:delete, allow if user has either DELETE_TEAM_DATA or DELETE_ALL_DATA
    if (requiredPermissions.includes(Permission.DELETE_TEAM_DATA)) {
      return userPermissions.includes(Permission.DELETE_TEAM_DATA) || 
             userPermissions.includes(Permission.DELETE_ALL_DATA);
    }
    
    // Default: user must have all required permissions
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  private checkContextualAccess(request: AccessRequest, user: User): boolean {
    const { resource, context } = request;
    const userPermissions = this.getUserPermissions(user.id);

    // Check team-based access
    if (resource === 'team_data' && context?.teamId) {
      // Users with READ_ALL_DATA, WRITE_ALL_DATA, or DELETE_ALL_DATA can access any team
      const hasGlobalAccess = userPermissions.includes(Permission.READ_ALL_DATA) ||
                             userPermissions.includes(Permission.WRITE_ALL_DATA) ||
                             userPermissions.includes(Permission.DELETE_ALL_DATA);
      
      if (!hasGlobalAccess) {
        // User must be member of the team they're trying to access
        if (!user.teamIds.includes(context.teamId)) {
          return false;
        }
      }
    }

    // Check user-specific access
    if (resource === 'user_data' && context?.targetUserId) {
      // Users can only access their own data unless they have elevated permissions
      if (context.targetUserId !== user.id) {
        if (!userPermissions.includes(Permission.READ_ALL_DATA)) {
          return false;
        }
      }
    }

    return true;
  }

  // Middleware factory for Express.js
  createMiddleware() {
    return (resource: string, action: string) => {
      return (req: any, res: any, next: any) => {
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const accessRequest: AccessRequest = {
          userId,
          resource,
          action,
          context: {
            teamId: req.params.teamId || req.body.teamId,
            targetUserId: req.params.userId || req.body.userId,
            resourceId: req.params.id || req.body.id
          }
        };

        const result = this.checkAccess(accessRequest);
        
        if (!result.granted) {
          return res.status(403).json({ 
            error: 'Access denied',
            reason: result.reason,
            requiredPermissions: result.requiredPermissions
          });
        }

        // Add access info to request for audit logging
        req.accessInfo = {
          granted: true,
          appliedRoles: result.appliedRoles,
          requiredPermissions: result.requiredPermissions
        };

        next();
      };
    };
  }

  // Role hierarchy check
  isRoleHigherThan(role1: Role, role2: Role): boolean {
    const hierarchy = {
      [Role.ADMIN]: 5,
      [Role.PRIVACY_OFFICER]: 4,
      [Role.TEAM_LEAD]: 3,
      [Role.DEVELOPER]: 2,
      [Role.VIEWER]: 1
    };

    return hierarchy[role1] > hierarchy[role2];
  }

  // Get users by role
  getUsersByRole(role: Role): User[] {
    return Array.from(this.users.values()).filter(user => 
      user.roles.includes(role) && user.isActive
    );
  }

  // Bulk permission check
  checkMultiplePermissions(userId: string, permissions: Permission[]): Record<Permission, boolean> {
    const userPermissions = this.getUserPermissions(userId);
    const result: Record<Permission, boolean> = {} as any;
    
    permissions.forEach(permission => {
      result[permission] = userPermissions.includes(permission);
    });

    return result;
  }

  // Deactivate user
  deactivateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.isActive = false;
    return true;
  }

  // Get effective permissions for a resource
  getEffectivePermissions(userId: string, resource: string): Permission[] {
    const allPermissions = this.getUserPermissions(userId);
    
    // Filter permissions relevant to the resource
    return allPermissions.filter(permission => {
      const permissionString = permission.toString();
      return permissionString.includes(resource) || 
             permissionString.includes('all') ||
             permissionString.includes('manage');
    });
  }
}