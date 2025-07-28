import { TestEnvironment } from '../setup/test-environment';
import axios from 'axios';

describe('API Contract Testing Between Microservices', () => {
  let testEnv: TestEnvironment;
  let services: Record<string, string>;

  beforeAll(async () => {
    testEnv = (global as any).testEnv;
    services = {
      apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
      dataIngestion: process.env.DATA_INGESTION_URL || 'http://localhost:3002',
      streamProcessing: process.env.STREAM_PROCESSING_URL || 'http://localhost:3003',
      mlPipeline: process.env.ML_PIPELINE_URL || 'http://localhost:3004',
      alertService: process.env.ALERT_SERVICE_URL || 'http://localhost:3005',
      privacyService: process.env.PRIVACY_SERVICE_URL || 'http://localhost:3006'
    };
  });

  describe('API Gateway to Data Ingestion Service', () => {
    it('should validate webhook event ingestion contract', async () => {
      const webhookPayload = {
        type: 'git_push',
        repository: 'test/repo',
        author: 'testuser',
        timestamp: new Date().toISOString(),
        commits: [
          {
            id: 'abc123',
            message: 'Test commit',
            files: ['src/test.ts'],
            additions: 10,
            deletions: 2
          }
        ]
      };

      // Test API Gateway webhook endpoint
      const gatewayResponse = await axios.post(
        `${services.apiGateway}/api/webhooks/git`,
        webhookPayload
      );

      expect(gatewayResponse.status).toBe(200);
      expect(gatewayResponse.data).toHaveProperty('eventId');

      // Verify event was forwarded to data ingestion service
      const eventId = gatewayResponse.data.eventId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const ingestionResponse = await axios.get(
        `${services.dataIngestion}/api/events/${eventId}/status`
      );

      expect(ingestionResponse.status).toBe(200);
      expect(ingestionResponse.data.status).toBe('processed');
    });

    it('should validate IDE telemetry ingestion contract', async () => {
      const telemetryPayload = {
        userId: 'user1',
        sessionId: 'session123',
        events: [
          {
            type: 'keystroke',
            timestamp: new Date().toISOString(),
            data: {
              file: 'src/component.tsx',
              keyCount: 50,
              focusTime: 300
            }
          },
          {
            type: 'file_change',
            timestamp: new Date().toISOString(),
            data: {
              file: 'src/component.tsx',
              changeType: 'modify',
              linesAdded: 5,
              linesDeleted: 2
            }
          }
        ]
      };

      const response = await axios.post(
        `${services.apiGateway}/api/telemetry/ide`,
        telemetryPayload,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('batchId');
      expect(response.data.processedEvents).toBe(2);
    });
  });

  describe('Data Ingestion to Stream Processing Service', () => {
    it('should validate event streaming contract', async () => {
      // Send event to data ingestion
      const event = {
        type: 'code_commit',
        userId: 'user1',
        timestamp: new Date().toISOString(),
        data: {
          repository: 'test/repo',
          files: ['src/service.ts'],
          complexity: 15,
          testCoverage: 0.85
        }
      };

      await axios.post(
        `${services.dataIngestion}/api/events/ingest`,
        event
      );

      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify metrics were calculated
      const metricsResponse = await axios.get(
        `${services.streamProcessing}/api/metrics/user1/latest`
      );

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.metrics).toBeDefined();
      expect(metricsResponse.data.metrics.length).toBeGreaterThan(0);

      const metric = metricsResponse.data.metrics.find(
        (m: any) => m.type === 'code_quality'
      );
      expect(metric).toBeDefined();
      expect(metric.value).toBeGreaterThan(0);
    });
  });

  describe('Stream Processing to ML Pipeline Service', () => {
    it('should validate feature extraction contract', async () => {
      // Create sample metrics data
      const metricsData = {
        userId: 'user1',
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: [
          {
            type: 'productivity_score',
            values: [0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.75],
            timestamps: Array.from({ length: 7 }, (_, i) => 
              new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString()
            )
          }
        ]
      };

      // Send to ML pipeline for feature extraction
      const featureResponse = await axios.post(
        `${services.mlPipeline}/api/features/extract`,
        metricsData
      );

      expect(featureResponse.status).toBe(200);
      expect(featureResponse.data).toHaveProperty('features');
      expect(featureResponse.data.features).toHaveProperty('productivity_trend');
      expect(featureResponse.data.features).toHaveProperty('variance');
      expect(featureResponse.data.features).toHaveProperty('moving_average');
    });

    it('should validate prediction request contract', async () => {
      const predictionRequest = {
        userId: 'user1',
        modelType: 'productivity_forecast',
        horizon: '7d',
        features: {
          productivity_trend: 0.05,
          variance: 0.02,
          moving_average: 0.75,
          day_of_week: 2,
          historical_patterns: [0.7, 0.8, 0.6, 0.9]
        }
      };

      const predictionResponse = await axios.post(
        `${services.mlPipeline}/api/predictions/generate`,
        predictionRequest
      );

      expect(predictionResponse.status).toBe(200);
      expect(predictionResponse.data).toHaveProperty('prediction');
      expect(predictionResponse.data).toHaveProperty('confidence');
      expect(predictionResponse.data.confidence).toBeGreaterThan(0);
      expect(predictionResponse.data.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('ML Pipeline to Alert Service', () => {
    it('should validate anomaly detection contract', async () => {
      const anomalyData = {
        userId: 'user1',
        anomalyType: 'productivity_drop',
        severity: 'high',
        confidence: 0.85,
        context: {
          currentValue: 0.3,
          expectedValue: 0.8,
          deviation: -0.5,
          timeframe: '24h'
        },
        recommendations: [
          {
            type: 'schedule_adjustment',
            message: 'Consider adjusting work schedule based on productivity patterns'
          }
        ]
      };

      const alertResponse = await axios.post(
        `${services.alertService}/api/anomalies/report`,
        anomalyData
      );

      expect(alertResponse.status).toBe(200);
      expect(alertResponse.data).toHaveProperty('alertId');

      // Verify alert was created
      const alertId = alertResponse.data.alertId;
      const alertDetailsResponse = await axios.get(
        `${services.alertService}/api/alerts/${alertId}`
      );

      expect(alertDetailsResponse.status).toBe(200);
      expect(alertDetailsResponse.data.alert.type).toBe('productivity_anomaly');
      expect(alertDetailsResponse.data.alert.severity).toBe('high');
    });
  });

  describe('Privacy Service Integration', () => {
    it('should validate privacy rule enforcement contract', async () => {
      // Set privacy rules
      const privacyRules = {
        userId: 'user1',
        rules: [
          {
            dataType: 'ide_telemetry',
            action: 'block',
            condition: 'always'
          },
          {
            dataType: 'git_activity',
            action: 'anonymize',
            condition: 'team_sharing'
          }
        ]
      };

      await axios.post(
        `${services.privacyService}/api/rules/set`,
        privacyRules
      );

      // Test data processing with privacy rules
      const dataRequest = {
        userId: 'user1',
        dataType: 'ide_telemetry',
        data: {
          keystrokes: 100,
          focusTime: 300,
          files: ['sensitive.ts']
        }
      };

      const privacyResponse = await axios.post(
        `${services.privacyService}/api/data/process`,
        dataRequest
      );

      expect(privacyResponse.status).toBe(403);
      expect(privacyResponse.data.reason).toBe('blocked_by_privacy_rules');

      // Test with allowed data type
      const allowedDataRequest = {
        userId: 'user1',
        dataType: 'git_activity',
        data: {
          commits: 5,
          repository: 'test/repo'
        }
      };

      const allowedResponse = await axios.post(
        `${services.privacyService}/api/data/process`,
        allowedDataRequest
      );

      expect(allowedResponse.status).toBe(200);
      expect(allowedResponse.data.processed).toBe(true);
      expect(allowedResponse.data.anonymized).toBe(true);
    });
  });

  describe('Cross-Service Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // Simulate service unavailability by using invalid URL
      const invalidServiceUrl = 'http://localhost:9999';

      // Test API Gateway resilience
      const response = await axios.post(
        `${services.apiGateway}/api/webhooks/git`,
        {
          type: 'push',
          repository: 'test/repo',
          author: 'testuser'
        }
      ).catch(error => error.response);

      // Should either succeed with fallback or return appropriate error
      expect([200, 202, 503]).toContain(response.status);

      if (response.status === 503) {
        expect(response.data).toHaveProperty('error');
        expect(response.data.error).toContain('service unavailable');
      }
    });

    it('should validate error response formats', async () => {
      // Test invalid data format
      const invalidPayload = {
        invalid: 'data'
      };

      const response = await axios.post(
        `${services.apiGateway}/api/webhooks/git`,
        invalidPayload
      ).catch(error => error.response);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data).toHaveProperty('details');
      expect(response.data.error).toContain('validation');
    });
  });

  describe('Authentication and Authorization Contracts', () => {
    it('should validate JWT token format across services', async () => {
      const testToken = 'Bearer invalid-token';

      // Test each service's auth validation
      const services_to_test = [
        { name: 'apiGateway', endpoint: '/api/users/profile' },
        { name: 'mlPipeline', endpoint: '/api/models/list' },
        { name: 'alertService', endpoint: '/api/alerts/user' }
      ];

      for (const service of services_to_test) {
        const response = await axios.get(
          `${services[service.name]}${service.endpoint}`,
          {
            headers: { Authorization: testToken }
          }
        ).catch(error => error.response);

        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty('error');
        expect(response.data.error).toContain('unauthorized');
      }
    });
  });
});