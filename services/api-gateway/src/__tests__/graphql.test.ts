import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';
import { generateToken, createAuthContext } from '../middleware/auth';
import { User, UserRole, MetricType, TimePeriod, createDefaultPrivacySettings, createDefaultUserPreferences } from '@devflow/shared-types';

describe('GraphQL API Integration Tests', () => {
  let server: ApolloServer;
  let query: any;
  let mutate: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUser: User = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    teamIds: ['team-1'],
    privacySettings: createDefaultPrivacySettings(mockUserId),
    preferences: createDefaultUserPreferences(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  const mockContext = {
    user: mockUser,
    token: generateToken(mockUser)
  };

  beforeAll(() => {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });

    server = new ApolloServer({
      schema,
      context: () => mockContext
    });

    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;
  });

  describe('Schema Validation', () => {
    it('should have valid GraphQL schema', () => {
      expect(typeDefs).toBeDefined();
      expect(typeof typeDefs).toBe('object');
    });

    it('should have resolvers defined', () => {
      expect(resolvers).toBeDefined();
      expect(resolvers.Query).toBeDefined();
      expect(resolvers.Mutation).toBeDefined();
      expect(resolvers.Subscription).toBeDefined();
    });
  });

  describe('Resolver Functions', () => {
    it('should have me resolver', () => {
      expect(resolvers.Query.me).toBeDefined();
      expect(typeof resolvers.Query.me).toBe('function');
    });

    it('should have user resolver', () => {
      expect(resolvers.Query.user).toBeDefined();
      expect(typeof resolvers.Query.user).toBe('function');
    });

    it('should have users resolver', () => {
      expect(resolvers.Query.users).toBeDefined();
      expect(typeof resolvers.Query.users).toBe('function');
    });
  });

  describe('Authentication', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should create auth context', async () => {
      const mockReq = {
        headers: {
          authorization: `Bearer ${generateToken(mockUser)}`
        }
      };
      
      const context = await createAuthContext(mockReq);
      expect(context).toBeDefined();
      expect(context.user).toBeDefined();
      expect(context.token).toBeDefined();
    });
  });

  describe('Query Integration Tests', () => {
    it('should execute me query successfully', async () => {
      const ME_QUERY = `
        query Me {
          me {
            id
            email
            name
            role
            isActive
          }
        }
      `;

      const result = await query({ query: ME_QUERY });
      expect(result.errors).toBeUndefined();
      expect(result.data.me).toBeDefined();
      expect(result.data.me.id).toBe(mockUser.id);
      expect(result.data.me.email).toBe(mockUser.email);
    });

    it('should execute users query with filters', async () => {
      const USERS_QUERY = `
        query Users($role: UserRole, $limit: Int) {
          users(role: $role, limit: $limit) {
            id
            email
            name
            role
            isActive
          }
        }
      `;

      const result = await query({
        query: USERS_QUERY,
        variables: { role: 'DEVELOPER', limit: 10 }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.users).toBeDefined();
      expect(Array.isArray(result.data.users)).toBe(true);
    });

    it('should execute metrics query with time filters', async () => {
      const METRICS_QUERY = `
        query Metrics($userId: ID, $type: MetricType, $startDate: DateTime, $endDate: DateTime) {
          metrics(userId: $userId, type: $type, startDate: $startDate, endDate: $endDate) {
            id
            userId
            metricType
            value
            timestamp
            aggregationPeriod
          }
        }
      `;

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date();

      const result = await query({
        query: METRICS_QUERY,
        variables: {
          userId: mockUser.id,
          type: 'TIME_IN_FLOW',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.metrics).toBeDefined();
      expect(Array.isArray(result.data.metrics)).toBe(true);
    });

    it('should execute flowStates query', async () => {
      const FLOW_STATES_QUERY = `
        query FlowStates($userId: ID, $limit: Int) {
          flowStates(userId: $userId, limit: $limit) {
            userId
            sessionId
            startTime
            interruptionCount
            focusScore
            totalFocusTimeMs
            deepWorkPercentage
          }
        }
      `;

      const result = await query({
        query: FLOW_STATES_QUERY,
        variables: { userId: mockUser.id, limit: 5 }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.flowStates).toBeDefined();
      expect(Array.isArray(result.data.flowStates)).toBe(true);
    });

    it('should execute dashboards query', async () => {
      const DASHBOARDS_QUERY = `
        query Dashboards($userId: ID) {
          dashboards(userId: $userId) {
            id
            name
            isDefault
            createdAt
            updatedAt
          }
        }
      `;

      const result = await query({
        query: DASHBOARDS_QUERY,
        variables: { userId: mockUser.id }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.dashboards).toBeDefined();
      expect(Array.isArray(result.data.dashboards)).toBe(true);
    });
  });

  describe('Mutation Integration Tests', () => {
    it('should execute updateUserPreferences mutation', async () => {
      const UPDATE_PREFERENCES_MUTATION = `
        mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
          updateUserPreferences(input: $input) {
            theme
            timezone
            language
          }
        }
      `;

      const result = await mutate({
        mutation: UPDATE_PREFERENCES_MUTATION,
        variables: {
          input: {
            theme: 'light',
            timezone: 'America/New_York',
            language: 'en'
          }
        }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.updateUserPreferences).toBeDefined();
      expect(result.data.updateUserPreferences.theme).toBe('light');
    });

    it('should execute updatePrivacySettings mutation', async () => {
      const UPDATE_PRIVACY_MUTATION = `
        mutation UpdatePrivacySettings($input: UpdatePrivacySettingsInput!) {
          updatePrivacySettings(input: $input) {
            anonymization
            dataCollection {
              ideTelemtry
              gitActivity
              communicationData
            }
          }
        }
      `;

      const result = await mutate({
        mutation: UPDATE_PRIVACY_MUTATION,
        variables: {
          input: {
            anonymization: 'FULL',
            dataCollection: {
              ideTelemtry: false,
              gitActivity: true,
              communicationData: false
            }
          }
        }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.updatePrivacySettings).toBeDefined();
    });

    it('should execute createDashboard mutation', async () => {
      const CREATE_DASHBOARD_MUTATION = `
        mutation CreateDashboard($input: CreateDashboardInput!) {
          createDashboard(input: $input) {
            id
            name
            isDefault
            widgets {
              id
              type
              title
            }
          }
        }
      `;

      const result = await mutate({
        mutation: CREATE_DASHBOARD_MUTATION,
        variables: {
          input: {
            name: 'Test Dashboard',
            isDefault: false,
            widgets: [
              {
                type: 'metric-chart',
                title: 'Productivity Metrics',
                config: { metricType: 'TIME_IN_FLOW' }
              }
            ],
            layout: [
              { id: 'widget-1', x: 0, y: 0, width: 6, height: 4 }
            ]
          }
        }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.createDashboard).toBeDefined();
      expect(result.data.createDashboard.name).toBe('Test Dashboard');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle authentication errors', async () => {
      const unauthenticatedServer = new ApolloServer({
        schema: makeExecutableSchema({ typeDefs, resolvers }),
        context: () => ({}) // No user context
      });

      const { query: unauthQuery } = createTestClient(unauthenticatedServer);

      const ME_QUERY = `
        query Me {
          me {
            id
            email
          }
        }
      `;

      const result = await unauthQuery({ query: ME_QUERY });
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should handle validation errors', async () => {
      const INVALID_USER_MUTATION = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            name
          }
        }
      `;

      const adminContext = {
        user: { ...mockUser, role: UserRole.ADMIN },
        token: generateToken({ ...mockUser, role: UserRole.ADMIN })
      };

      const adminServer = new ApolloServer({
        schema: makeExecutableSchema({ typeDefs, resolvers }),
        context: () => adminContext
      });

      const { mutate: adminMutate } = createTestClient(adminServer);

      const result = await adminMutate({
        mutation: INVALID_USER_MUTATION,
        variables: {
          input: {
            email: 'invalid-email', // Invalid email format
            name: '',
            role: 'DEVELOPER',
            teamIds: []
          }
        }
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('should handle authorization errors', async () => {
      const DELETE_USER_MUTATION = `
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `;

      // Regular developer trying to delete a user (should fail)
      const result = await mutate({
        mutation: DELETE_USER_MUTATION,
        variables: { id: 'some-user-id' }
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Resolver Structure', () => {
    it('should have all required query resolvers', () => {
      const expectedQueries = [
        'me', 'user', 'users', 'team', 'teams', 'metrics', 'flowStates',
        'dashboard', 'dashboards', 'defaultDashboard', 'alerts', 'unreadAlertCount',
        'gitEvents', 'ideTelemetry'
      ];
      
      expectedQueries.forEach(queryName => {
        expect((resolvers.Query as any)[queryName]).toBeDefined();
        expect(typeof (resolvers.Query as any)[queryName]).toBe('function');
      });
    });

    it('should have all required mutation resolvers', () => {
      const expectedMutations = [
        'createUser', 'updateUser', 'deleteUser', 'updatePrivacySettings',
        'updateUserPreferences', 'createTeam', 'updateTeam', 'deleteTeam',
        'addTeamMember', 'removeTeamMember', 'createDashboard', 'updateDashboard',
        'deleteDashboard', 'setDefaultDashboard', 'markAlertAsRead',
        'markAllAlertsAsRead', 'dismissAlert'
      ];
      
      expectedMutations.forEach(mutationName => {
        expect(resolvers.Mutation[mutationName]).toBeDefined();
        expect(typeof resolvers.Mutation[mutationName]).toBe('function');
      });
    });

    it('should have all required subscription resolvers', () => {
      const expectedSubscriptions = [
        'metricUpdated', 'flowStateUpdated', 'alertCreated',
        'dashboardUpdated', 'teamUpdated', 'userStatusUpdated'
      ];
      
      expectedSubscriptions.forEach(subscriptionName => {
        expect(resolvers.Subscription[subscriptionName]).toBeDefined();
        expect(resolvers.Subscription[subscriptionName].subscribe).toBeDefined();
      });
    });

    it('should have custom scalar resolvers', () => {
      expect(resolvers.DateTime).toBeDefined();
      expect(resolvers.JSON).toBeDefined();
    });

    it('should have field resolvers for complex types', () => {
      expect(resolvers.User).toBeDefined();
      expect(resolvers.User.teams).toBeDefined();
      expect(resolvers.User.metrics).toBeDefined();
      expect(resolvers.User.flowStates).toBeDefined();

      expect(resolvers.Team).toBeDefined();
      expect(resolvers.Team.members).toBeDefined();
      expect(resolvers.Team.metrics).toBeDefined();
      expect(resolvers.Team.aggregatedFlowStates).toBeDefined();

      expect(resolvers.ProductivityMetric).toBeDefined();
      expect(resolvers.ProductivityMetric.user).toBeDefined();

      expect(resolvers.FlowState).toBeDefined();
      expect(resolvers.FlowState.user).toBeDefined();
    });
  });
});