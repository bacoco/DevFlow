import { TestEnvironment } from '../setup/test-environment';
import { MongoClient } from 'mongodb';
import { createClient as createRedisClient } from 'redis';
import axios from 'axios';

describe('Data Consistency Validation Across Services', () => {
  let testEnv: TestEnvironment;
  let mongoClient: MongoClient;
  let redisClient: any;
  let apiBaseUrl: string;

  beforeAll(async () => {
    testEnv = (global as any).testEnv;
    mongoClient = testEnv.getService('mongodb').client;
    redisClient = testEnv.getService('redis').client;
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    await testEnv.createTestData();
  });

  afterEach(async () => {
    await testEnv.cleanTestData();
    await testEnv.createTestData();
  });

  describe('User Data Consistency', () => {
    it('should maintain user data consistency across MongoDB and cache', async () => {
      const userId = 'user1';
      
      // Update user data via API
      const updateData = {
        name: 'Updated User Name',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      await axios.put(
        `${apiBaseUrl}/api/users/${userId}`,
        updateData,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      // Wait for cache update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify MongoDB has updated data
      const mongoUser = await mongoClient
        .db('testdb')
        .collection('users')
        .findOne({ _id: userId });

      expect(mongoUser?.name).toBe(updateData.name);
      expect(mongoUser?.preferences).toEqual(updateData.preferences);

      // Verify Redis cache has updated data
      const cachedUser = await redisClient.get(`user:${userId}`);
      const parsedCachedUser = JSON.parse(cachedUser);

      expect(parsedCachedUser.name).toBe(updateData.name);
      expect(parsedCachedUser.preferences).toEqual(updateData.preferences);

      // Verify API returns consistent data
      const apiResponse = await axios.get(
        `${apiBaseUrl}/api/users/${userId}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(apiResponse.data.user.name).toBe(updateData.name);
      expect(apiResponse.data.user.preferences).toEqual(updateData.preferences);
    });

    it('should handle cache invalidation correctly', async () => {
      const userId = 'user1';
      
      // First, ensure user is cached
      await axios.get(
        `${apiBaseUrl}/api/users/${userId}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      // Verify user is in cache
      const cachedUser = await redisClient.get(`user:${userId}`);
      expect(cachedUser).toBeTruthy();

      // Update user directly in MongoDB (simulating external update)
      await mongoClient
        .db('testdb')
        .collection('users')
        .updateOne(
          { _id: userId },
          { $set: { name: 'Direct MongoDB Update' } }
        );

      // Trigger cache invalidation
      await axios.post(
        `${apiBaseUrl}/api/cache/invalidate`,
        { key: `user:${userId}` }
      );

      // Verify cache is cleared
      const clearedCache = await redisClient.get(`user:${userId}`);
      expect(clearedCache).toBeNull();

      // Next API call should fetch from MongoDB and re-cache
      const apiResponse = await axios.get(
        `${apiBaseUrl}/api/users/${userId}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(apiResponse.data.user.name).toBe('Direct MongoDB Update');

      // Verify data is re-cached
      const reCachedUser = await redisClient.get(`user:${userId}`);
      const parsedReCachedUser = JSON.parse(reCachedUser);
      expect(parsedReCachedUser.name).toBe('Direct MongoDB Update');
    });
  });

  describe('Metrics Data Consistency', () => {
    it('should maintain consistency between InfluxDB and aggregated metrics', async () => {
      const userId = 'user1';
      const timestamp = new Date().toISOString();
      
      // Insert raw metrics data
      const rawMetrics = [
        {
          userId,
          type: 'focus_time',
          value: 120,
          timestamp
        },
        {
          userId,
          type: 'code_commits',
          value: 5,
          timestamp
        },
        {
          userId,
          type: 'code_quality_score',
          value: 0.85,
          timestamp
        }
      ];

      for (const metric of rawMetrics) {
        await axios.post(
          `${apiBaseUrl}/api/metrics/ingest`,
          metric
        );
      }

      // Wait for processing and aggregation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify raw data in InfluxDB (via API)
      const rawDataResponse = await axios.get(
        `${apiBaseUrl}/api/metrics/${userId}/raw?start=${timestamp}&end=${new Date().toISOString()}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(rawDataResponse.data.metrics.length).toBe(3);

      // Verify aggregated data in MongoDB
      const aggregatedMetrics = await mongoClient
        .db('testdb')
        .collection('aggregated_metrics')
        .findOne({
          userId,
          date: timestamp.split('T')[0]
        });

      expect(aggregatedMetrics).toBeTruthy();
      expect(aggregatedMetrics?.metrics.focus_time).toBe(120);
      expect(aggregatedMetrics?.metrics.code_commits).toBe(5);
      expect(aggregatedMetrics?.metrics.code_quality_score).toBe(0.85);

      // Verify calculated productivity score
      expect(aggregatedMetrics?.calculated.productivity_score).toBeGreaterThan(0);
      expect(aggregatedMetrics?.calculated.productivity_score).toBeLessThanOrEqual(1);
    });

    it('should handle metric updates and recalculations', async () => {
      const userId = 'user1';
      const date = new Date().toISOString().split('T')[0];
      
      // Insert initial metrics
      await axios.post(
        `${apiBaseUrl}/api/metrics/ingest`,
        {
          userId,
          type: 'focus_time',
          value: 100,
          timestamp: new Date().toISOString()
        }
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get initial aggregated value
      const initialAggregated = await mongoClient
        .db('testdb')
        .collection('aggregated_metrics')
        .findOne({ userId, date });

      expect(initialAggregated?.metrics.focus_time).toBe(100);

      // Insert additional metric for same day
      await axios.post(
        `${apiBaseUrl}/api/metrics/ingest`,
        {
          userId,
          type: 'focus_time',
          value: 50,
          timestamp: new Date().toISOString()
        }
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify aggregated value is updated
      const updatedAggregated = await mongoClient
        .db('testdb')
        .collection('aggregated_metrics')
        .findOne({ userId, date });

      expect(updatedAggregated?.metrics.focus_time).toBe(150);
    });
  });

  describe('Team Data Consistency', () => {
    it('should maintain team membership consistency', async () => {
      const teamId = 'team1';
      const newUserId = 'user3';
      
      // Add user to team via API
      await axios.post(
        `${apiBaseUrl}/api/teams/${teamId}/members`,
        { userId: newUserId },
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify team document is updated
      const team = await mongoClient
        .db('testdb')
        .collection('teams')
        .findOne({ _id: teamId });

      expect(team?.memberIds).toContain(newUserId);

      // Verify user document is updated
      const user = await mongoClient
        .db('testdb')
        .collection('users')
        .findOne({ _id: newUserId });

      expect(user?.teamIds).toContain(teamId);

      // Verify cache is updated
      const cachedTeam = await redisClient.get(`team:${teamId}`);
      const parsedTeam = JSON.parse(cachedTeam);
      expect(parsedTeam.memberIds).toContain(newUserId);

      // Verify API returns consistent data
      const teamResponse = await axios.get(
        `${apiBaseUrl}/api/teams/${teamId}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(teamResponse.data.team.memberIds).toContain(newUserId);
    });
  });

  describe('Alert Data Consistency', () => {
    it('should maintain alert state consistency across services', async () => {
      const userId = 'user1';
      
      // Create alert via ML pipeline
      const alertData = {
        userId,
        type: 'productivity_anomaly',
        severity: 'medium',
        message: 'Productivity below expected threshold',
        context: {
          currentValue: 0.6,
          expectedValue: 0.8
        }
      };

      const alertResponse = await axios.post(
        `${apiBaseUrl}/api/alerts/create`,
        alertData,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      const alertId = alertResponse.data.alertId;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify alert in MongoDB
      const mongoAlert = await mongoClient
        .db('testdb')
        .collection('alerts')
        .findOne({ _id: alertId });

      expect(mongoAlert).toBeTruthy();
      expect(mongoAlert?.status).toBe('active');
      expect(mongoAlert?.type).toBe('productivity_anomaly');

      // Acknowledge alert
      await axios.put(
        `${apiBaseUrl}/api/alerts/${alertId}/acknowledge`,
        {},
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify status update in MongoDB
      const updatedAlert = await mongoClient
        .db('testdb')
        .collection('alerts')
        .findOne({ _id: alertId });

      expect(updatedAlert?.status).toBe('acknowledged');
      expect(updatedAlert?.acknowledgedAt).toBeTruthy();

      // Verify cache is updated
      const cachedAlert = await redisClient.get(`alert:${alertId}`);
      const parsedAlert = JSON.parse(cachedAlert);
      expect(parsedAlert.status).toBe('acknowledged');

      // Verify API returns consistent data
      const apiAlert = await axios.get(
        `${apiBaseUrl}/api/alerts/${alertId}`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(apiAlert.data.alert.status).toBe('acknowledged');
    });
  });

  describe('Privacy Settings Consistency', () => {
    it('should enforce privacy settings consistently across all services', async () => {
      const userId = 'user1';
      
      // Update privacy settings
      const privacySettings = {
        dataCollection: {
          ideTelemtry: false,
          gitActivity: true,
          communicationData: false
        },
        sharing: {
          teamMetrics: false,
          individualMetrics: true
        },
        retention: {
          months: 6
        }
      };

      await axios.put(
        `${apiBaseUrl}/api/users/${userId}/privacy`,
        privacySettings,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify settings in MongoDB
      const user = await mongoClient
        .db('testdb')
        .collection('users')
        .findOne({ _id: userId });

      expect(user?.privacySettings).toEqual(privacySettings);

      // Verify settings are cached
      const cachedSettings = await redisClient.get(`privacy:${userId}`);
      const parsedSettings = JSON.parse(cachedSettings);
      expect(parsedSettings).toEqual(privacySettings);

      // Test data collection enforcement
      const telemetryResponse = await axios.post(
        `${apiBaseUrl}/api/telemetry/ide`,
        {
          userId,
          events: [{ type: 'keystroke', data: {} }]
        }
      ).catch(error => error.response);

      expect(telemetryResponse.status).toBe(403);

      // Test allowed data collection
      const gitResponse = await axios.post(
        `${apiBaseUrl}/api/webhooks/git`,
        {
          type: 'commit',
          author: userId,
          repository: 'test/repo'
        }
      );

      expect(gitResponse.status).toBe(200);

      // Verify team metrics exclusion
      const teamMetricsResponse = await axios.get(
        `${apiBaseUrl}/api/metrics/team/team1/productivity`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      const userMetrics = teamMetricsResponse.data.metrics.filter(
        (m: any) => m.userId === userId
      );
      expect(userMetrics.length).toBe(0);
    });
  });

  describe('Transaction Consistency', () => {
    it('should handle distributed transactions correctly', async () => {
      const userId = 'user1';
      const teamId = 'team1';
      
      // Simulate a complex operation that affects multiple collections
      const operationData = {
        userId,
        teamId,
        action: 'promote_to_lead',
        changes: {
          userRole: 'team_lead',
          teamLeaderId: userId,
          permissions: ['manage_team', 'view_all_metrics']
        }
      };

      const response = await axios.post(
        `${apiBaseUrl}/api/teams/${teamId}/promote-member`,
        operationData,
        {
          headers: { Authorization: 'Bearer admin-token' }
        }
      );

      expect(response.status).toBe(200);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all related documents are updated consistently
      const user = await mongoClient
        .db('testdb')
        .collection('users')
        .findOne({ _id: userId });

      const team = await mongoClient
        .db('testdb')
        .collection('teams')
        .findOne({ _id: teamId });

      const auditLog = await mongoClient
        .db('testdb')
        .collection('audit_logs')
        .findOne({
          userId,
          action: 'role_change',
          'details.newRole': 'team_lead'
        });

      expect(user?.role).toBe('team_lead');
      expect(user?.permissions).toContain('manage_team');
      expect(team?.leaderId).toBe(userId);
      expect(auditLog).toBeTruthy();

      // Verify cache consistency
      const cachedUser = await redisClient.get(`user:${userId}`);
      const cachedTeam = await redisClient.get(`team:${teamId}`);
      
      expect(JSON.parse(cachedUser).role).toBe('team_lead');
      expect(JSON.parse(cachedTeam).leaderId).toBe(userId);
    });

    it('should handle rollback on transaction failure', async () => {
      const userId = 'user1';
      const teamId = 'nonexistent-team';
      
      // Attempt operation that should fail
      const response = await axios.post(
        `${apiBaseUrl}/api/teams/${teamId}/promote-member`,
        {
          userId,
          teamId,
          action: 'promote_to_lead'
        },
        {
          headers: { Authorization: 'Bearer admin-token' }
        }
      ).catch(error => error.response);

      expect(response.status).toBe(404);

      // Verify no partial changes were made
      const user = await mongoClient
        .db('testdb')
        .collection('users')
        .findOne({ _id: userId });

      expect(user?.role).not.toBe('team_lead');

      const auditLog = await mongoClient
        .db('testdb')
        .collection('audit_logs')
        .findOne({
          userId,
          action: 'role_change',
          'details.newRole': 'team_lead'
        });

      expect(auditLog).toBeNull();
    });
  });
});