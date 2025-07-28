import { GraphQLScalarType, Kind } from 'graphql';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { AuthenticationError, ForbiddenError, UserInputError, ApolloError } from 'apollo-server-express';
import winston from 'winston';
import {
  User,
  Team,
  ProductivityMetric,
  FlowState,
  GitEvent,
  IDETelemetry,
  UserRole,
  MetricType,
  TimePeriod,
  PrivacyLevel,
  validateUser,
  validateTeam,
  safeValidateUser,
  safeValidateTeam
} from '@devflow/shared-types';
import { databaseService } from '../services/database';

// Initialize PubSub for subscriptions
const pubsub = new PubSub();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Custom DateTime scalar
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('Value is not an instance of Date: ' + value);
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    throw new Error('Value is not a valid date string: ' + value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('Can only parse strings to dates but got a: ' + ast.kind);
  },
});

// Custom JSON scalar
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
        return ast.fields.reduce((acc: any, field) => {
          acc[field.name.value] = field.value;
          return acc;
        }, {});
      case Kind.LIST:
        return ast.values.map((value) => value);
      default:
        return null;
    }
  },
});

// Enhanced error handling wrapper
const withErrorHandling = (fn: Function) => async (...args: any[]) => {
  try {
    return await fn(...args);
  } catch (error) {
    logger.error('Resolver error', { error: error.message, stack: error.stack });
    
    if (error instanceof AuthenticationError || 
        error instanceof ForbiddenError || 
        error instanceof UserInputError) {
      throw error;
    }
    
    throw new ApolloError('Internal server error', 'INTERNAL_ERROR');
  }
};

// Data services with proper database integration
class UserService {
  async findById(id: string): Promise<User | null> {
    try {
      const cacheKey = `user:${id}`;
      const cached = await databaseService.cacheGet(cacheKey);
      if (cached) return cached;

      const user = await databaseService.users.findOne({ id });
      if (user) {
        await databaseService.cacheSet(cacheKey, user, 300);
      }
      return user;
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await databaseService.users.findOne({ email });
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  async findAll(filters: {
    role?: UserRole;
    teamId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    try {
      const query: any = {};
      
      if (filters.role) query.role = filters.role;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.teamId) query.teamIds = { $in: [filters.teamId] };

      const cursor = databaseService.users.find(query);
      
      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);
      
      return await cursor.toArray();
    } catch (error) {
      logger.error('Error finding users', { filters, error });
      throw error;
    }
  }

  async create(input: any): Promise<User> {
    try {
      const validation = safeValidateUser({
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      if (!validation.success) {
        throw new UserInputError('Invalid user data', { validationErrors: validation.error.errors });
      }

      const user = validation.data;
      await databaseService.users.insertOne(user);
      
      // Invalidate cache
      await databaseService.cacheDelete(`user:${user.id}`);
      
      // Publish user creation event
      pubsub.publish('USER_CREATED', { userCreated: user });
      
      return user;
    } catch (error) {
      logger.error('Error creating user', { input, error });
      throw error;
    }
  }

  async update(id: string, input: any): Promise<User> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new UserInputError('User not found');
      }

      const updatedUser = {
        ...existingUser,
        ...input,
        updatedAt: new Date()
      };

      const validation = safeValidateUser(updatedUser);
      if (!validation.success) {
        throw new UserInputError('Invalid user data', { validationErrors: validation.error.errors });
      }

      await databaseService.users.updateOne(
        { id },
        { $set: validation.data }
      );

      // Invalidate cache
      await databaseService.cacheDelete(`user:${id}`);
      
      // Publish user update event
      pubsub.publish('USER_STATUS_UPDATED', { userStatusUpdated: validation.data });
      
      return validation.data;
    } catch (error) {
      logger.error('Error updating user', { id, input, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await databaseService.users.deleteOne({ id });
      
      if (result.deletedCount > 0) {
        await databaseService.cacheDelete(`user:${id}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deleting user', { id, error });
      throw error;
    }
  }
}

class TeamService {
  async findById(id: string): Promise<Team | null> {
    try {
      const cacheKey = `team:${id}`;
      const cached = await databaseService.cacheGet(cacheKey);
      if (cached) return cached;

      const team = await databaseService.teams.findOne({ id });
      if (team) {
        await databaseService.cacheSet(cacheKey, team, 300);
      }
      return team;
    } catch (error) {
      logger.error('Error finding team by ID', { id, error });
      throw error;
    }
  }

  async findAll(filters: {
    userId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Team[]> {
    try {
      const query: any = {};
      
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.userId) query.memberIds = { $in: [filters.userId] };

      const cursor = databaseService.teams.find(query);
      
      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);
      
      return await cursor.toArray();
    } catch (error) {
      logger.error('Error finding teams', { filters, error });
      throw error;
    }
  }

  async create(input: any): Promise<Team> {
    try {
      const validation = safeValidateTeam({
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      if (!validation.success) {
        throw new UserInputError('Invalid team data', { validationErrors: validation.error.errors });
      }

      const team = validation.data;
      await databaseService.teams.insertOne(team);
      
      // Invalidate cache
      await databaseService.cacheDelete(`team:${team.id}`);
      
      // Publish team creation event
      pubsub.publish('TEAM_CREATED', { teamCreated: team });
      
      return team;
    } catch (error) {
      logger.error('Error creating team', { input, error });
      throw error;
    }
  }

  async update(id: string, input: any): Promise<Team> {
    try {
      const existingTeam = await this.findById(id);
      if (!existingTeam) {
        throw new UserInputError('Team not found');
      }

      const updatedTeam = {
        ...existingTeam,
        ...input,
        updatedAt: new Date()
      };

      const validation = safeValidateTeam(updatedTeam);
      if (!validation.success) {
        throw new UserInputError('Invalid team data', { validationErrors: validation.error.errors });
      }

      await databaseService.teams.updateOne(
        { id },
        { $set: validation.data }
      );

      // Invalidate cache
      await databaseService.cacheDelete(`team:${id}`);
      
      // Publish team update event
      pubsub.publish('TEAM_UPDATED', { teamUpdated: validation.data });
      
      return validation.data;
    } catch (error) {
      logger.error('Error updating team', { id, input, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await databaseService.teams.deleteOne({ id });
      
      if (result.deletedCount > 0) {
        await databaseService.cacheDelete(`team:${id}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deleting team', { id, error });
      throw error;
    }
  }
}

class MetricsService {
  async findMetrics(filters: {
    userId?: string;
    teamId?: string;
    type?: MetricType;
    period?: TimePeriod;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ProductivityMetric[]> {
    try {
      return await databaseService.queryMetrics(filters);
    } catch (error) {
      logger.error('Error finding metrics', { filters, error });
      throw error;
    }
  }

  async findFlowStates(filters: {
    userId?: string;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<FlowState[]> {
    try {
      return await databaseService.queryFlowStates(filters);
    } catch (error) {
      logger.error('Error finding flow states', { filters, error });
      throw error;
    }
  }
}

class DashboardService {
  async findById(id: string): Promise<any> {
    try {
      const cacheKey = `dashboard:${id}`;
      const cached = await databaseService.cacheGet(cacheKey);
      if (cached) return cached;

      const dashboard = await databaseService.dashboards.findOne({ id });
      if (dashboard) {
        await databaseService.cacheSet(cacheKey, dashboard, 300);
      }
      return dashboard;
    } catch (error) {
      logger.error('Error finding dashboard by ID', { id, error });
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<any[]> {
    try {
      return await databaseService.dashboards.find({ userId }).toArray();
    } catch (error) {
      logger.error('Error finding dashboards by user ID', { userId, error });
      throw error;
    }
  }

  async create(input: any): Promise<any> {
    try {
      const dashboard = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await databaseService.dashboards.insertOne(dashboard);
      
      // Invalidate cache
      await databaseService.cacheDelete(`dashboard:${dashboard.id}`);
      
      // Publish dashboard creation event
      pubsub.publish('DASHBOARD_CREATED', { dashboardCreated: dashboard });
      
      return dashboard;
    } catch (error) {
      logger.error('Error creating dashboard', { input, error });
      throw error;
    }
  }

  async update(id: string, input: any): Promise<any> {
    try {
      const existingDashboard = await this.findById(id);
      if (!existingDashboard) {
        throw new UserInputError('Dashboard not found');
      }

      const updatedDashboard = {
        ...existingDashboard,
        ...input,
        updatedAt: new Date()
      };

      await databaseService.dashboards.updateOne(
        { id },
        { $set: updatedDashboard }
      );

      // Invalidate cache
      await databaseService.cacheDelete(`dashboard:${id}`);
      
      // Publish dashboard update event
      pubsub.publish('DASHBOARD_UPDATED', { dashboardUpdated: updatedDashboard });
      
      return updatedDashboard;
    } catch (error) {
      logger.error('Error updating dashboard', { id, input, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await databaseService.dashboards.deleteOne({ id });
      
      if (result.deletedCount > 0) {
        await databaseService.cacheDelete(`dashboard:${id}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error deleting dashboard', { id, error });
      throw error;
    }
  }
}

class AlertService {
  async findAlerts(filters: {
    userId?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const query: any = {};
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.isRead !== undefined) query.isRead = filters.isRead;

      const cursor = databaseService.alerts.find(query).sort({ createdAt: -1 });
      
      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);
      
      return await cursor.toArray();
    } catch (error) {
      logger.error('Error finding alerts', { filters, error });
      throw error;
    }
  }

  async markAsRead(id: string): Promise<any> {
    try {
      const result = await databaseService.alerts.updateOne(
        { id },
        { $set: { isRead: true, readAt: new Date() } }
      );

      if (result.modifiedCount === 0) {
        throw new UserInputError('Alert not found');
      }

      const alert = await databaseService.alerts.findOne({ id });
      return alert;
    } catch (error) {
      logger.error('Error marking alert as read', { id, error });
      throw error;
    }
  }

  async dismiss(id: string): Promise<boolean> {
    try {
      const result = await databaseService.alerts.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error dismissing alert', { id, error });
      throw error;
    }
  }
}

class GitEventService {
  async findEvents(filters: {
    repository?: string;
    author?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<GitEvent[]> {
    try {
      const query: any = {};
      
      if (filters.repository) query.repository = filters.repository;
      if (filters.author) query.author = filters.author;
      if (filters.type) query.type = filters.type;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const cursor = databaseService.gitEvents.find(query).sort({ timestamp: -1 });
      
      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);
      
      return await cursor.toArray();
    } catch (error) {
      logger.error('Error finding git events', { filters, error });
      throw error;
    }
  }
}

class TelemetryService {
  async findTelemetry(filters: {
    userId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<IDETelemetry[]> {
    try {
      const query: any = {};
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const cursor = databaseService.ideTelemetry.find(query).sort({ timestamp: -1 });
      
      if (filters.offset) cursor.skip(filters.offset);
      if (filters.limit) cursor.limit(filters.limit);
      
      return await cursor.toArray();
    } catch (error) {
      logger.error('Error finding IDE telemetry', { filters, error });
      throw error;
    }
  }
}

// Initialize services
const userService = new UserService();
const teamService = new TeamService();
const metricsService = new MetricsService();
const dashboardService = new DashboardService();
const alertService = new AlertService();
const gitEventService = new GitEventService();
const telemetryService = new TelemetryService();

// Authentication helper
const requireAuth = (context: any) => {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  return context.user;
};

// Authorization helper
const requireRole = (context: any, requiredRole: UserRole) => {
  const user = requireAuth(context);
  if (user.role !== requiredRole && user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Insufficient permissions');
  }
  return user;
};

// Privacy filter helper
const applyPrivacyFilter = (data: any, context: any, targetUserId?: string) => {
  const currentUser = context.user;
  if (!currentUser) return null;

  // Admin can see everything
  if (currentUser.role === UserRole.ADMIN) return data;

  // Users can see their own data
  if (targetUserId && currentUser.id === targetUserId) return data;

  // Apply team-level privacy filtering
  // This would be more sophisticated in production
  return data;
};

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // Query resolvers
  Query: {
    me: withErrorHandling(async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      return await userService.findById(user.id);
    }),

    user: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      const user = await userService.findById(id);
      return applyPrivacyFilter(user, context, id);
    }),

    users: withErrorHandling(async (_: any, filters: any, context: any) => {
      requireAuth(context);
      const users = await userService.findAll(filters);
      return users.map(user => applyPrivacyFilter(user, context, user.id)).filter(Boolean);
    }),

    team: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await teamService.findById(id);
    }),

    teams: withErrorHandling(async (_: any, filters: any, context: any) => {
      requireAuth(context);
      return await teamService.findAll(filters);
    }),

    metrics: withErrorHandling(async (_: any, filters: any, context: any) => {
      requireAuth(context);
      return await metricsService.findMetrics(filters);
    }),

    flowStates: withErrorHandling(async (_: any, filters: any, context: any) => {
      requireAuth(context);
      return await metricsService.findFlowStates(filters);
    }),

    dashboard: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await dashboardService.findById(id);
    }),

    dashboards: withErrorHandling(async (_: any, { userId }: { userId?: string }, context: any) => {
      const user = requireAuth(context);
      const targetUserId = userId || user.id;
      return await dashboardService.findByUserId(targetUserId);
    }),

    defaultDashboard: withErrorHandling(async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      const dashboards = await dashboardService.findByUserId(user.id);
      return dashboards.find(d => d.isDefault) || dashboards[0] || null;
    }),

    alerts: withErrorHandling(async (_: any, filters: any, context: any) => {
      const user = requireAuth(context);
      return await alertService.findAlerts({ ...filters, userId: user.id });
    }),

    unreadAlertCount: withErrorHandling(async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      const alerts = await alertService.findAlerts({ userId: user.id, isRead: false });
      return alerts.length;
    }),

    gitEvents: withErrorHandling(async (_: any, filters: any, context: any) => {
      requireAuth(context);
      return await gitEventService.findEvents(filters);
    }),

    ideTelemetry: withErrorHandling(async (_: any, filters: any, context: any) => {
      const user = requireAuth(context);
      // Only allow users to see their own telemetry data
      const targetUserId = filters.userId || user.id;
      if (targetUserId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Cannot access other users\' telemetry data');
      }
      return await telemetryService.findTelemetry({ ...filters, userId: targetUserId });
    }),
  },

  // Mutation resolvers
  Mutation: {
    createUser: withErrorHandling(async (_: any, { input }: { input: any }, context: any) => {
      requireRole(context, UserRole.ADMIN);
      return await userService.create(input);
    }),

    updateUser: withErrorHandling(async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      const user = requireAuth(context);
      if (id !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Cannot update other users');
      }
      return await userService.update(id, input);
    }),

    deleteUser: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireRole(context, UserRole.ADMIN);
      return await userService.delete(id);
    }),

    updatePrivacySettings: withErrorHandling(async (_: any, { input }: { input: any }, context: any) => {
      const user = requireAuth(context);
      // Privacy settings can only be updated by the user themselves
      return await userService.update(user.id, { privacySettings: input });
    }),

    updateUserPreferences: withErrorHandling(async (_: any, { input }: { input: any }, context: any) => {
      const user = requireAuth(context);
      return await userService.update(user.id, { preferences: input });
    }),

    createTeam: withErrorHandling(async (_: any, { input }: { input: any }, context: any) => {
      requireRole(context, UserRole.TEAM_LEAD);
      return await teamService.create(input);
    }),

    updateTeam: withErrorHandling(async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      requireRole(context, UserRole.TEAM_LEAD);
      return await teamService.update(id, input);
    }),

    deleteTeam: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireRole(context, UserRole.ADMIN);
      return await teamService.delete(id);
    }),

    addTeamMember: withErrorHandling(async (_: any, { teamId, userId }: { teamId: string; userId: string }, context: any) => {
      requireRole(context, UserRole.TEAM_LEAD);
      const team = await teamService.findById(teamId);
      if (!team) throw new UserInputError('Team not found');
      
      const updatedMemberIds = [...team.memberIds, userId];
      return await teamService.update(teamId, { memberIds: updatedMemberIds });
    }),

    removeTeamMember: withErrorHandling(async (_: any, { teamId, userId }: { teamId: string; userId: string }, context: any) => {
      requireRole(context, UserRole.TEAM_LEAD);
      const team = await teamService.findById(teamId);
      if (!team) throw new UserInputError('Team not found');
      
      const updatedMemberIds = team.memberIds.filter(id => id !== userId);
      return await teamService.update(teamId, { memberIds: updatedMemberIds });
    }),

    createDashboard: withErrorHandling(async (_: any, { input }: { input: any }, context: any) => {
      const user = requireAuth(context);
      return await dashboardService.create({ ...input, userId: user.id });
    }),

    updateDashboard: withErrorHandling(async (_: any, { id, input }: { id: string; input: any }, context: any) => {
      requireAuth(context);
      return await dashboardService.update(id, input);
    }),

    deleteDashboard: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await dashboardService.delete(id);
    }),

    setDefaultDashboard: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await dashboardService.update(id, { isDefault: true });
    }),

    markAlertAsRead: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await alertService.markAsRead(id);
    }),

    markAllAlertsAsRead: withErrorHandling(async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      const alerts = await alertService.findAlerts({ userId: user.id, isRead: false });
      await Promise.all(alerts.map(alert => alertService.markAsRead(alert.id)));
      return alerts.length;
    }),

    dismissAlert: withErrorHandling(async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await alertService.dismiss(id);
    }),
  },

  // Subscription resolvers
  Subscription: {
    metricUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['METRIC_UPDATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          
          // Filter based on user/team access
          if (variables.userId && payload.metricUpdated.userId !== variables.userId) {
            return false;
          }
          if (variables.teamId && payload.metricUpdated.context?.teamId !== variables.teamId) {
            return false;
          }
          if (variables.type && payload.metricUpdated.metricType !== variables.type) {
            return false;
          }
          
          return true;
        }
      ),
    },

    flowStateUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['FLOW_STATE_UPDATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          
          if (variables.userId && payload.flowStateUpdated.userId !== variables.userId) {
            return false;
          }
          
          return true;
        }
      ),
    },

    alertCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ALERT_CREATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          return payload.alertCreated.userId === variables.userId;
        }
      ),
    },

    dashboardUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['DASHBOARD_UPDATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          return payload.dashboardUpdated.id === variables.dashboardId;
        }
      ),
    },

    teamUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['TEAM_UPDATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          return payload.teamUpdated.id === variables.teamId;
        }
      ),
    },

    userStatusUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['USER_STATUS_UPDATED']),
        (payload, variables, context) => {
          if (!context.user) return false;
          return payload.userStatusUpdated.id === variables.userId;
        }
      ),
    },
  },

  // Field resolvers
  User: {
    teams: withErrorHandling(async (parent: User) => {
      const teams = await Promise.all(
        parent.teamIds.map(teamId => teamService.findById(teamId))
      );
      return teams.filter(Boolean);
    }),

    metrics: withErrorHandling(async (parent: User, args: any) => {
      return await metricsService.findMetrics({
        userId: parent.id,
        ...args
      });
    }),

    flowStates: withErrorHandling(async (parent: User, args: any) => {
      return await metricsService.findFlowStates({
        userId: parent.id,
        ...args
      });
    }),
  },

  Team: {
    members: withErrorHandling(async (parent: Team) => {
      const members = await Promise.all(
        parent.memberIds.map(memberId => userService.findById(memberId))
      );
      return members.filter(Boolean);
    }),

    metrics: withErrorHandling(async (parent: Team, args: any) => {
      return await metricsService.findMetrics({
        teamId: parent.id,
        ...args
      });
    }),

    aggregatedFlowStates: withErrorHandling(async (parent: Team, args: any) => {
      // This would aggregate flow states for all team members
      const flowStates = await metricsService.findFlowStates({
        teamId: parent.id,
        ...args
      });
      
      // Group by time period and aggregate
      // This is a simplified implementation
      return [];
    }),
  },

  ProductivityMetric: {
    user: withErrorHandling(async (parent: ProductivityMetric) => {
      return await userService.findById(parent.userId);
    }),
  },

  FlowState: {
    user: withErrorHandling(async (parent: FlowState) => {
      return await userService.findById(parent.userId);
    }),
  },
};

// Export pubsub for use in other parts of the application
export { pubsub };