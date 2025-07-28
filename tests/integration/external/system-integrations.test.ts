import { TestEnvironment } from '../setup/test-environment';
import axios from 'axios';
import { Kafka } from 'kafkajs';

describe('External System Integration Tests', () => {
  let testEnv: TestEnvironment;
  let apiBaseUrl: string;
  let kafka: Kafka;

  beforeAll(async () => {
    testEnv = (global as any).testEnv;
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    kafka = testEnv.getService('kafka').client;
    
    await testEnv.createTestData();
  });

  afterEach(async () => {
    await testEnv.cleanTestData();
    await testEnv.createTestData();
  });

  describe('Git Platform Integrations', () => {
    describe('GitHub Integration', () => {
      it('should process GitHub webhook events correctly', async () => {
        const githubWebhookPayload = {
          action: 'opened',
          pull_request: {
            id: 123456,
            number: 42,
            title: 'Add new feature',
            user: {
              login: 'testuser',
              id: 12345
            },
            head: {
              sha: 'abc123def456',
              ref: 'feature/new-feature'
            },
            base: {
              sha: 'def456ghi789',
              ref: 'main'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          repository: {
            id: 789012,
            name: 'test-repo',
            full_name: 'testorg/test-repo',
            private: false
          }
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/github`,
          githubWebhookPayload,
          {
            headers: {
              'X-GitHub-Event': 'pull_request',
              'X-GitHub-Delivery': 'test-delivery-id',
              'X-Hub-Signature-256': 'sha256=test-signature'
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('processed', true);

        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify event was processed and stored
        const eventsResponse = await axios.get(
          `${apiBaseUrl}/api/events/git?repository=testorg/test-repo&type=pull_request`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(eventsResponse.status).toBe(200);
        expect(eventsResponse.data.events.length).toBeGreaterThan(0);
        
        const event = eventsResponse.data.events[0];
        expect(event.type).toBe('pull_request_opened');
        expect(event.author).toBe('testuser');
        expect(event.metadata.prNumber).toBe(42);
      });

      it('should handle GitHub push events', async () => {
        const githubPushPayload = {
          ref: 'refs/heads/main',
          before: 'def456ghi789',
          after: 'abc123def456',
          commits: [
            {
              id: 'abc123def456',
              message: 'Fix critical bug in authentication',
              author: {
                name: 'Test User',
                email: 'test@example.com',
                username: 'testuser'
              },
              timestamp: new Date().toISOString(),
              added: ['src/auth/new-feature.ts'],
              removed: [],
              modified: ['src/auth/login.ts', 'src/auth/middleware.ts']
            }
          ],
          repository: {
            id: 789012,
            name: 'test-repo',
            full_name: 'testorg/test-repo'
          },
          pusher: {
            name: 'testuser',
            email: 'test@example.com'
          }
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/github`,
          githubPushPayload,
          {
            headers: {
              'X-GitHub-Event': 'push',
              'X-GitHub-Delivery': 'test-delivery-id-2'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify commit metrics were calculated
        const metricsResponse = await axios.get(
          `${apiBaseUrl}/api/metrics/testuser/code-activity?period=1d`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(metricsResponse.status).toBe(200);
        expect(metricsResponse.data.metrics.commits).toBeGreaterThan(0);
        expect(metricsResponse.data.metrics.filesModified).toBe(2);
        expect(metricsResponse.data.metrics.filesAdded).toBe(1);
      });
    });

    describe('GitLab Integration', () => {
      it('should process GitLab merge request events', async () => {
        const gitlabMRPayload = {
          object_kind: 'merge_request',
          event_type: 'merge_request',
          user: {
            id: 123,
            username: 'testuser',
            email: 'test@example.com'
          },
          object_attributes: {
            id: 456,
            iid: 42,
            title: 'Implement new dashboard feature',
            description: 'This MR adds a new dashboard widget',
            state: 'opened',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source_branch: 'feature/dashboard-widget',
            target_branch: 'main',
            source: {
              name: 'test-project',
              namespace: 'testorg'
            },
            target: {
              name: 'test-project',
              namespace: 'testorg'
            }
          },
          project: {
            id: 789,
            name: 'test-project',
            path_with_namespace: 'testorg/test-project'
          }
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/gitlab`,
          gitlabMRPayload,
          {
            headers: {
              'X-Gitlab-Event': 'Merge Request Hook',
              'X-Gitlab-Token': 'test-token'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify merge request was processed
        const eventsResponse = await axios.get(
          `${apiBaseUrl}/api/events/git?repository=testorg/test-project&type=merge_request`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(eventsResponse.status).toBe(200);
        const event = eventsResponse.data.events[0];
        expect(event.type).toBe('merge_request_opened');
        expect(event.author).toBe('testuser');
      });
    });
  });

  describe('Communication Platform Integrations', () => {
    describe('Slack Integration', () => {
      it('should process Slack message events for code discussions', async () => {
        const slackEventPayload = {
          token: 'test-verification-token',
          team_id: 'T123456',
          api_app_id: 'A123456',
          event: {
            type: 'message',
            channel: 'C123456',
            user: 'U123456',
            text: 'Hey team, I just pushed a fix for the authentication bug. Can someone review PR #42?',
            ts: '1234567890.123456',
            thread_ts: '1234567890.123456'
          },
          type: 'event_callback',
          event_id: 'Ev123456',
          event_time: Math.floor(Date.now() / 1000)
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/slack`,
          slackEventPayload,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify communication event was processed
        const communicationResponse = await axios.get(
          `${apiBaseUrl}/api/communication/events?channel=C123456&type=code_discussion`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(communicationResponse.status).toBe(200);
        expect(communicationResponse.data.events.length).toBeGreaterThan(0);
        
        const event = communicationResponse.data.events[0];
        expect(event.type).toBe('code_discussion');
        expect(event.platform).toBe('slack');
        expect(event.metadata.mentions_pr).toBe(true);
      });

      it('should handle Slack slash commands', async () => {
        const slackSlashCommandPayload = {
          token: 'test-verification-token',
          team_id: 'T123456',
          team_domain: 'testteam',
          channel_id: 'C123456',
          channel_name: 'dev-team',
          user_id: 'U123456',
          user_name: 'testuser',
          command: '/devflow',
          text: 'productivity summary',
          response_url: 'https://hooks.slack.com/commands/1234/5678',
          trigger_id: '123456.789012.abcdef'
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/slack/commands`,
          slackSlashCommandPayload,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('response_type', 'ephemeral');
        expect(response.data).toHaveProperty('text');
        expect(response.data.text).toContain('productivity');
      });
    });

    describe('Microsoft Teams Integration', () => {
      it('should process Teams message events', async () => {
        const teamsWebhookPayload = {
          type: 'message',
          id: 'message-id-123',
          timestamp: new Date().toISOString(),
          serviceUrl: 'https://smba.trafficmanager.net/teams/',
          channelId: 'msteams',
          from: {
            id: 'user-id-123',
            name: 'Test User',
            aadObjectId: 'aad-object-id-123'
          },
          conversation: {
            id: 'conversation-id-123',
            name: 'Dev Team',
            conversationType: 'channel'
          },
          text: 'Just finished the code review for the new feature. Looks good to merge!',
          attachments: [],
          entities: [
            {
              type: 'mention',
              text: '@devflow',
              mentioned: {
                id: 'bot-id-123',
                name: 'DevFlow Bot'
              }
            }
          ]
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/teams`,
          teamsWebhookPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer teams-bot-token'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify Teams communication was processed
        const communicationResponse = await axios.get(
          `${apiBaseUrl}/api/communication/events?platform=teams&type=code_review`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(communicationResponse.status).toBe(200);
        const event = communicationResponse.data.events[0];
        expect(event.platform).toBe('teams');
        expect(event.type).toBe('code_review');
      });
    });
  });

  describe('CI/CD Platform Integrations', () => {
    describe('Jenkins Integration', () => {
      it('should process Jenkins build notifications', async () => {
        const jenkinsBuildPayload = {
          name: 'test-project-build',
          url: 'http://jenkins.example.com/job/test-project-build/123/',
          build: {
            full_url: 'http://jenkins.example.com/job/test-project-build/123/',
            number: 123,
            queue_id: 456,
            timestamp: Date.now(),
            duration: 120000,
            result: 'SUCCESS',
            artifacts: {},
            log: '',
            scm: {
              url: 'https://github.com/testorg/test-repo.git',
              branch: 'main',
              commit: 'abc123def456'
            }
          }
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/jenkins`,
          jenkinsBuildPayload,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify build metrics were recorded
        const buildMetricsResponse = await axios.get(
          `${apiBaseUrl}/api/metrics/builds?project=test-project&period=1d`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(buildMetricsResponse.status).toBe(200);
        expect(buildMetricsResponse.data.metrics.totalBuilds).toBeGreaterThan(0);
        expect(buildMetricsResponse.data.metrics.successRate).toBeGreaterThan(0);
        expect(buildMetricsResponse.data.metrics.averageDuration).toBe(120);
      });
    });

    describe('GitHub Actions Integration', () => {
      it('should process GitHub Actions workflow events', async () => {
        const githubActionsPayload = {
          action: 'completed',
          workflow_run: {
            id: 123456789,
            name: 'CI/CD Pipeline',
            head_branch: 'main',
            head_sha: 'abc123def456',
            status: 'completed',
            conclusion: 'success',
            workflow_id: 987654,
            url: 'https://api.github.com/repos/testorg/test-repo/actions/runs/123456789',
            html_url: 'https://github.com/testorg/test-repo/actions/runs/123456789',
            created_at: new Date(Date.now() - 300000).toISOString(),
            updated_at: new Date().toISOString(),
            run_started_at: new Date(Date.now() - 300000).toISOString(),
            jobs_url: 'https://api.github.com/repos/testorg/test-repo/actions/runs/123456789/jobs'
          },
          repository: {
            id: 789012,
            name: 'test-repo',
            full_name: 'testorg/test-repo'
          }
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/webhooks/github`,
          githubActionsPayload,
          {
            headers: {
              'X-GitHub-Event': 'workflow_run',
              'X-GitHub-Delivery': 'test-delivery-id-3'
            }
          }
        );

        expect(response.status).toBe(200);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify workflow metrics were recorded
        const workflowMetricsResponse = await axios.get(
          `${apiBaseUrl}/api/metrics/workflows?repository=testorg/test-repo&period=1d`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(workflowMetricsResponse.status).toBe(200);
        expect(workflowMetricsResponse.data.metrics.totalRuns).toBeGreaterThan(0);
        expect(workflowMetricsResponse.data.metrics.successRate).toBe(1);
        expect(workflowMetricsResponse.data.metrics.averageDuration).toBe(300);
      });
    });
  });

  describe('Monitoring and Observability Integrations', () => {
    describe('Grafana Integration', () => {
      it('should export dashboard configuration to Grafana', async () => {
        const exportRequest = {
          dashboardId: 'user1-productivity',
          format: 'grafana',
          timeRange: '7d',
          panels: [
            'productivity-metrics',
            'code-quality',
            'team-collaboration'
          ]
        };

        const response = await axios.post(
          `${apiBaseUrl}/api/export/grafana`,
          exportRequest,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('dashboard');
        expect(response.data.dashboard).toHaveProperty('title');
        expect(response.data.dashboard).toHaveProperty('panels');
        expect(response.data.dashboard.panels.length).toBe(3);

        // Verify Grafana-compatible format
        const dashboard = response.data.dashboard;
        expect(dashboard).toHaveProperty('schemaVersion');
        expect(dashboard).toHaveProperty('version');
        expect(dashboard.panels[0]).toHaveProperty('type');
        expect(dashboard.panels[0]).toHaveProperty('targets');
      });
    });

    describe('Prometheus Integration', () => {
      it('should expose metrics in Prometheus format', async () => {
        const response = await axios.get(
          `${apiBaseUrl}/metrics`,
          {
            headers: {
              'Accept': 'text/plain'
            }
          }
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');

        const metrics = response.data;
        expect(metrics).toContain('# HELP');
        expect(metrics).toContain('# TYPE');
        expect(metrics).toContain('devflow_');

        // Verify specific metrics are present
        expect(metrics).toContain('devflow_active_users_total');
        expect(metrics).toContain('devflow_api_requests_total');
        expect(metrics).toContain('devflow_processing_duration_seconds');
      });
    });
  });

  describe('Message Queue Integration', () => {
    it('should handle Kafka message production and consumption', async () => {
      const producer = kafka.producer();
      const consumer = kafka.consumer({ groupId: 'test-group' });

      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'productivity-events' });

      const receivedMessages: any[] = [];
      
      consumer.run({
        eachMessage: async ({ message }) => {
          receivedMessages.push(JSON.parse(message.value?.toString() || '{}'));
        }
      });

      // Send test message
      const testEvent = {
        type: 'productivity_calculated',
        userId: 'user1',
        timestamp: new Date().toISOString(),
        data: {
          score: 0.85,
          factors: ['focus_time', 'code_quality']
        }
      };

      await producer.send({
        topic: 'productivity-events',
        messages: [{
          value: JSON.stringify(testEvent)
        }]
      });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages[0]).toEqual(testEvent);

      await producer.disconnect();
      await consumer.disconnect();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle external service timeouts gracefully', async () => {
      // Simulate slow external service
      const slowWebhookPayload = {
        type: 'test_timeout',
        delay: 10000 // 10 seconds
      };

      const response = await axios.post(
        `${apiBaseUrl}/api/webhooks/test-timeout`,
        slowWebhookPayload,
        {
          timeout: 5000 // 5 second timeout
        }
      ).catch(error => error.response || { status: 408 });

      expect([202, 408, 504]).toContain(response.status);

      if (response.status === 202) {
        // Async processing accepted
        expect(response.data).toHaveProperty('jobId');
      }
    });

    it('should implement circuit breaker for failing external services', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const failingRequests = Array.from({ length: 5 }, (_, i) => 
        axios.post(
          `${apiBaseUrl}/api/webhooks/failing-service`,
          { attempt: i + 1 }
        ).catch(error => error.response)
      );

      const responses = await Promise.all(failingRequests);

      // First few requests should fail normally
      expect(responses[0].status).toBe(500);
      expect(responses[1].status).toBe(500);

      // Later requests should be circuit-broken
      const lastResponse = responses[responses.length - 1];
      expect([503, 429]).toContain(lastResponse.status);
      expect(lastResponse.data.error).toContain('circuit breaker');
    });
  });
});