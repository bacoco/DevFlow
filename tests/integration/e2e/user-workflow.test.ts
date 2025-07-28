import { TestEnvironment } from '../setup/test-environment';
import axios from 'axios';
import WebSocket from 'ws';

describe('End-to-End User Workflows', () => {
  let testEnv: TestEnvironment;
  let apiBaseUrl: string;
  let wsUrl: string;

  beforeAll(async () => {
    testEnv = (global as any).testEnv;
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    wsUrl = process.env.WS_URL || 'ws://localhost:3001';
    
    // Create test data
    await testEnv.createTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await testEnv.cleanTestData();
    await testEnv.createTestData();
  });

  describe('User Onboarding Workflow', () => {
    it('should complete full onboarding process', async () => {
      // Step 1: User registration
      const registerResponse = await axios.post(`${apiBaseUrl}/api/auth/register`, {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'securepassword'
      });
      
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.user.id).toBeDefined();
      
      const userId = registerResponse.data.user.id;
      const token = registerResponse.data.token;
      
      // Step 2: Privacy settings configuration
      const privacyResponse = await axios.put(
        `${apiBaseUrl}/api/users/${userId}/privacy`,
        {
          dataCollection: {
            ideTelemtry: true,
            gitActivity: true,
            communicationData: false
          },
          sharing: {
            teamMetrics: true,
            individualMetrics: false
          },
          retention: {
            months: 12
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      expect(privacyResponse.status).toBe(200);
      
      // Step 3: Role selection
      const roleResponse = await axios.put(
        `${apiBaseUrl}/api/users/${userId}/role`,
        { role: 'developer' },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      expect(roleResponse.status).toBe(200);
      
      // Step 4: Dashboard setup
      const dashboardResponse = await axios.post(
        `${apiBaseUrl}/api/dashboards`,
        {
          name: 'My Dashboard',
          layout: 'default',
          widgets: [
            { type: 'productivity-metrics', position: { x: 0, y: 0 } },
            { type: 'code-quality', position: { x: 1, y: 0 } }
          ]
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      expect(dashboardResponse.status).toBe(201);
      expect(dashboardResponse.data.dashboard.id).toBeDefined();
      
      // Step 5: Verify onboarding completion
      const userResponse = await axios.get(
        `${apiBaseUrl}/api/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      expect(userResponse.data.user.onboardingCompleted).toBe(true);
    });
  });

  describe('Data Ingestion to Dashboard Workflow', () => {
    it('should process Git events through to dashboard display', async () => {
      // Step 1: Simulate Git webhook event
      const gitEvent = {
        type: 'push',
        repository: 'test/repo',
        author: 'user1',
        commits: [
          {
            id: 'abc123',
            message: 'Fix bug in user service',
            timestamp: new Date().toISOString(),
            files: ['src/user.service.ts'],
            additions: 10,
            deletions: 5
          }
        ]
      };
      
      const webhookResponse = await axios.post(
        `${apiBaseUrl}/api/webhooks/git`,
        gitEvent
      );
      
      expect(webhookResponse.status).toBe(200);
      
      // Step 2: Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Verify metrics calculation
      const metricsResponse = await axios.get(
        `${apiBaseUrl}/api/metrics/user1/productivity?period=1d`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.metrics.length).toBeGreaterThan(0);
      
      // Step 4: Verify dashboard data update
      const dashboardResponse = await axios.get(
        `${apiBaseUrl}/api/dashboards/user1/default`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.data.widgets).toBeDefined();
      
      // Step 5: Verify real-time updates via WebSocket
      const ws = new WebSocket(`${wsUrl}/ws?token=test-token`);
      
      const wsMessage = await new Promise((resolve, reject) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        
        ws.on('error', reject);
        
        // Trigger another event to test real-time updates
        setTimeout(async () => {
          await axios.post(`${apiBaseUrl}/api/webhooks/git`, {
            ...gitEvent,
            commits: [{ ...gitEvent.commits[0], id: 'def456' }]
          });
        }, 500);
      });
      
      expect(wsMessage).toHaveProperty('type', 'metrics_update');
      
      ws.close();
    });
  });

  describe('Alert and Notification Workflow', () => {
    it('should detect anomaly and send notifications', async () => {
      // Step 1: Create alert rule
      const alertRuleResponse = await axios.post(
        `${apiBaseUrl}/api/alerts/rules`,
        {
          name: 'Low Productivity Alert',
          condition: {
            metric: 'productivity_score',
            operator: 'less_than',
            threshold: 0.5
          },
          notifications: [
            { type: 'email', target: 'user1@example.com' },
            { type: 'slack', target: '#dev-team' }
          ]
        },
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(alertRuleResponse.status).toBe(201);
      
      // Step 2: Simulate low productivity data
      await axios.post(
        `${apiBaseUrl}/api/metrics/ingest`,
        {
          userId: 'user1',
          metrics: [
            {
              type: 'productivity_score',
              value: 0.3,
              timestamp: new Date().toISOString()
            }
          ]
        }
      );
      
      // Step 3: Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 4: Verify alert was triggered
      const alertsResponse = await axios.get(
        `${apiBaseUrl}/api/alerts?userId=user1&status=active`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(alertsResponse.status).toBe(200);
      expect(alertsResponse.data.alerts.length).toBeGreaterThan(0);
      expect(alertsResponse.data.alerts[0].type).toBe('productivity_anomaly');
      
      // Step 5: Verify notification was sent
      const notificationsResponse = await axios.get(
        `${apiBaseUrl}/api/notifications?userId=user1&limit=10`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.data.notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy and Data Protection Workflow', () => {
    it('should enforce privacy settings throughout data pipeline', async () => {
      // Step 1: Set strict privacy settings
      await axios.put(
        `${apiBaseUrl}/api/users/user1/privacy`,
        {
          dataCollection: {
            ideTelemtry: false,
            gitActivity: true,
            communicationData: false
          },
          sharing: {
            teamMetrics: false,
            individualMetrics: false
          },
          anonymization: 'high'
        },
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      // Step 2: Attempt to collect IDE telemetry (should be blocked)
      const telemetryResponse = await axios.post(
        `${apiBaseUrl}/api/telemetry/ide`,
        {
          userId: 'user1',
          events: [
            {
              type: 'keystroke',
              timestamp: new Date().toISOString(),
              data: { file: 'test.ts', keyCount: 100 }
            }
          ]
        }
      );
      
      expect(telemetryResponse.status).toBe(403);
      
      // Step 3: Collect Git activity (should be allowed)
      const gitResponse = await axios.post(
        `${apiBaseUrl}/api/webhooks/git`,
        {
          type: 'commit',
          repository: 'test/repo',
          author: 'user1',
          timestamp: new Date().toISOString()
        }
      );
      
      expect(gitResponse.status).toBe(200);
      
      // Step 4: Verify team metrics don't include user1 data
      const teamMetricsResponse = await axios.get(
        `${apiBaseUrl}/api/metrics/team/team1/productivity`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(teamMetricsResponse.status).toBe(200);
      const userMetrics = teamMetricsResponse.data.metrics.filter(
        (m: any) => m.userId === 'user1'
      );
      expect(userMetrics.length).toBe(0);
      
      // Step 5: Verify audit trail
      const auditResponse = await axios.get(
        `${apiBaseUrl}/api/audit/user1?action=data_access`,
        {
          headers: { Authorization: 'Bearer admin-token' }
        }
      );
      
      expect(auditResponse.status).toBe(200);
      expect(auditResponse.data.events.length).toBeGreaterThan(0);
    });
  });

  describe('ML Pipeline and Recommendations Workflow', () => {
    it('should generate personalized recommendations', async () => {
      // Step 1: Ingest historical data
      const historicalData = Array.from({ length: 30 }, (_, i) => ({
        userId: 'user1',
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        metrics: {
          productivity_score: 0.7 + Math.random() * 0.3,
          focus_time: 4 + Math.random() * 2,
          code_quality: 0.8 + Math.random() * 0.2
        }
      }));
      
      for (const data of historicalData) {
        await axios.post(
          `${apiBaseUrl}/api/metrics/ingest`,
          data
        );
      }
      
      // Step 2: Trigger ML pipeline
      const mlResponse = await axios.post(
        `${apiBaseUrl}/api/ml/analyze`,
        {
          userId: 'user1',
          analysisType: 'productivity_patterns'
        },
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(mlResponse.status).toBe(200);
      
      // Step 3: Wait for analysis completion
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 4: Verify recommendations generated
      const recommendationsResponse = await axios.get(
        `${apiBaseUrl}/api/recommendations/user1`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.data.recommendations.length).toBeGreaterThan(0);
      
      const recommendation = recommendationsResponse.data.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('message');
      expect(recommendation).toHaveProperty('actionItems');
      
      // Step 5: Verify prediction accuracy
      const predictionResponse = await axios.get(
        `${apiBaseUrl}/api/predictions/user1/productivity?horizon=7d`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      
      expect(predictionResponse.status).toBe(200);
      expect(predictionResponse.data.prediction).toHaveProperty('confidence');
      expect(predictionResponse.data.prediction.confidence).toBeGreaterThan(0.5);
    });
  });
});