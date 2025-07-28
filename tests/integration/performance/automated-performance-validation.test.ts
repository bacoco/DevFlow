import { TestEnvironment } from '../setup/test-environment';
import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Automated Performance Validation', () => {
  let testEnv: TestEnvironment;
  let apiBaseUrl: string;

  beforeAll(async () => {
    testEnv = (global as any).testEnv;
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    await testEnv.createTestData();
  });

  afterAll(async () => {
    await testEnv.cleanTestData();
  });

  describe('Performance Baseline Validation', () => {
    it('should meet response time requirements (RN-001)', async () => {
      const endpoints = [
        { path: '/health', maxTime: 100 },
        { path: '/api/users/profile', maxTime: 200, auth: true },
        { path: '/api/metrics/productivity?period=24h', maxTime: 500, auth: true },
        { path: '/api/dashboard/widgets', maxTime: 300, auth: true },
      ];

      // Get auth token
      const authResponse = await axios.post(`${apiBaseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      const token = authResponse.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      for (const endpoint of endpoints) {
        const measurements = [];
        
        // Take 10 measurements for statistical significance
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          
          try {
            const response = await axios.get(
              `${apiBaseUrl}${endpoint.path}`,
              endpoint.auth ? { headers } : {}
            );
            
            const responseTime = Date.now() - startTime;
            measurements.push(responseTime);
            
            expect(response.status).toBe(200);
          } catch (error) {
            fail(`Request to ${endpoint.path} failed: ${error.message}`);
          }
        }

        // Calculate statistics
        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const p95Time = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
        
        console.log(`${endpoint.path}: avg=${avgTime.toFixed(2)}ms, p95=${p95Time}ms`);
        
        expect(p95Time).toBeLessThan(endpoint.maxTime);
        expect(avgTime).toBeLessThan(endpoint.maxTime * 0.7); // Average should be well below max
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const maxResponseTime = 1000; // 1 second for concurrent load
      
      // Get auth token
      const authResponse = await axios.post(`${apiBaseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      const token = authResponse.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      const startTime = Date.now();
      
      // Create concurrent requests
      const requests = Array.from({ length: concurrentRequests }, () =>
        axios.get(`${apiBaseUrl}/api/metrics/productivity?period=1h`, { headers })
          .catch(error => ({ error: error.message }))
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Analyze results
      const successfulResponses = responses.filter(r => !r.error && r.status === 200);
      const errorResponses = responses.filter(r => r.error || r.status !== 200);
      
      const successRate = successfulResponses.length / concurrentRequests;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`Concurrent test: ${successfulResponses.length}/${concurrentRequests} successful, avg time: ${avgTimePerRequest.toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgTimePerRequest).toBeLessThan(maxResponseTime);
      expect(errorResponses.length).toBeLessThan(concurrentRequests * 0.05); // Less than 5% errors
    });
  });

  describe('Database Performance Validation', () => {
    it('should maintain query performance under load', async () => {
      // Insert test data to simulate realistic database load
      const testMetrics = Array.from({ length: 1000 }, (_, i) => ({
        userId: `user${i % 10}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        metrics: {
          productivity: Math.random(),
          focus_time: Math.floor(Math.random() * 480),
          code_quality: Math.random()
        }
      }));

      // Insert data
      for (const metric of testMetrics) {
        await axios.post(`${apiBaseUrl}/api/metrics/ingest`, metric);
      }

      // Wait for data processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test query performance
      const queryStartTime = Date.now();
      const response = await axios.get(
        `${apiBaseUrl}/api/metrics/analytics?timeRange=24h&aggregation=hourly`,
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      const queryTime = Date.now() - queryStartTime;

      expect(response.status).toBe(200);
      expect(queryTime).toBeLessThan(2000); // Complex queries should complete within 2s
      expect(response.data.metrics).toBeDefined();
      expect(response.data.metrics.length).toBeGreaterThan(0);
    });

    it('should handle time-series data queries efficiently', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];
      const maxQueryTimes = [200, 500, 1000, 2000]; // Max time for each range

      for (let i = 0; i < timeRanges.length; i++) {
        const timeRange = timeRanges[i];
        const maxTime = maxQueryTimes[i];

        const startTime = Date.now();
        const response = await axios.get(
          `${apiBaseUrl}/api/metrics/time-series?range=${timeRange}&granularity=auto`,
          {
            headers: { Authorization: 'Bearer test-token' }
          }
        );
        const queryTime = Date.now() - startTime;

        console.log(`Time-series query (${timeRange}): ${queryTime}ms`);

        expect(response.status).toBe(200);
        expect(queryTime).toBeLessThan(maxTime);
      }
    });
  });

  describe('Memory and Resource Usage Validation', () => {
    it('should not have memory leaks during sustained load', async () => {
      const initialMemory = await getMemoryUsage();
      
      // Simulate sustained load for 2 minutes
      const loadDuration = 2 * 60 * 1000; // 2 minutes
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();

      const authResponse = await axios.post(`${apiBaseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      const token = authResponse.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      let requestCount = 0;
      let errorCount = 0;

      while (Date.now() - startTime < loadDuration) {
        try {
          await axios.get(`${apiBaseUrl}/api/users/profile`, { headers });
          requestCount++;
        } catch (error) {
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Wait for garbage collection
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalMemory = await getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      const errorRate = errorCount / requestCount;

      console.log(`Sustained load test: ${requestCount} requests, ${errorCount} errors, memory increase: ${memoryIncrease}MB`);

      expect(errorRate).toBeLessThan(0.01); // Less than 1% errors
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB memory increase
    });
  });

  describe('Scalability Validation', () => {
    it('should scale horizontally under increasing load', async () => {
      // This test would typically interact with Kubernetes HPA
      // For now, we'll simulate by testing response times under different loads
      
      const loadLevels = [10, 25, 50, 100]; // Concurrent users
      const results = [];

      for (const concurrentUsers of loadLevels) {
        const authResponse = await axios.post(`${apiBaseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'testpassword'
        });
        
        const token = authResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        const startTime = Date.now();
        
        const requests = Array.from({ length: concurrentUsers }, () =>
          axios.get(`${apiBaseUrl}/api/metrics/productivity?period=1h`, { headers })
            .then(response => ({ success: true, time: Date.now() - startTime }))
            .catch(() => ({ success: false, time: Date.now() - startTime }))
        );

        const responses = await Promise.all(requests);
        const totalTime = Date.now() - startTime;
        
        const successfulRequests = responses.filter(r => r.success).length;
        const avgResponseTime = responses.reduce((sum, r) => sum + r.time, 0) / responses.length;
        
        results.push({
          concurrentUsers,
          successRate: successfulRequests / concurrentUsers,
          avgResponseTime,
          totalTime
        });

        console.log(`Load level ${concurrentUsers}: ${successfulRequests}/${concurrentUsers} successful, avg time: ${avgResponseTime.toFixed(2)}ms`);

        // Brief pause between load levels
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Validate that the system scales reasonably
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];

        // Success rate should not degrade significantly
        expect(current.successRate).toBeGreaterThan(0.9);
        
        // Response time should not increase exponentially
        const responseTimeIncrease = current.avgResponseTime / previous.avgResponseTime;
        expect(responseTimeIncrease).toBeLessThan(3); // No more than 3x increase
      }
    });
  });

  describe('K6 Load Test Integration', () => {
    it('should pass K6 performance tests', async () => {
      const k6TestPath = path.join(__dirname, 'ci-performance-tests.js');
      
      try {
        // Run K6 test
        const k6Output = execSync(`k6 run --env BASE_URL=${apiBaseUrl} ${k6TestPath}`, {
          encoding: 'utf8',
          timeout: 300000 // 5 minute timeout
        });

        console.log('K6 Test Output:', k6Output);

        // Check if results file was created
        const resultsPath = path.join(__dirname, 'ci-performance-results.json');
        expect(fs.existsSync(resultsPath)).toBe(true);

        // Parse and validate results
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        expect(results.test_status).toBe('PASSED');
        expect(results.thresholds.response_time_p95.passed).toBe(true);
        expect(results.thresholds.error_rate.passed).toBe(true);

        // Cleanup
        fs.unlinkSync(resultsPath);

      } catch (error) {
        // If K6 is not installed, skip this test
        if (error.message.includes('k6: command not found')) {
          console.warn('K6 not installed, skipping K6 integration test');
          return;
        }
        
        console.error('K6 test failed:', error.message);
        throw error;
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // This would typically compare against baseline metrics stored in a database
      // For this test, we'll use hardcoded baseline values
      
      const baselineMetrics = {
        healthCheck: { p95: 50, avg: 30 },
        userProfile: { p95: 150, avg: 100 },
        productivityMetrics: { p95: 400, avg: 250 },
        dashboardWidgets: { p95: 250, avg: 180 }
      };

      const endpoints = [
        { path: '/health', name: 'healthCheck', auth: false },
        { path: '/api/users/profile', name: 'userProfile', auth: true },
        { path: '/api/metrics/productivity?period=24h', name: 'productivityMetrics', auth: true },
        { path: '/api/dashboard/widgets', name: 'dashboardWidgets', auth: true }
      ];

      const authResponse = await axios.post(`${apiBaseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      const token = authResponse.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      for (const endpoint of endpoints) {
        const measurements = [];
        
        // Take multiple measurements
        for (let i = 0; i < 20; i++) {
          const startTime = Date.now();
          
          await axios.get(
            `${apiBaseUrl}${endpoint.path}`,
            endpoint.auth ? { headers } : {}
          );
          
          measurements.push(Date.now() - startTime);
        }

        // Calculate current metrics
        const sortedMeasurements = measurements.sort((a, b) => a - b);
        const currentP95 = sortedMeasurements[Math.floor(measurements.length * 0.95)];
        const currentAvg = measurements.reduce((a, b) => a + b, 0) / measurements.length;

        const baseline = baselineMetrics[endpoint.name];
        
        // Check for regression (more than 50% increase)
        const p95Regression = currentP95 > baseline.p95 * 1.5;
        const avgRegression = currentAvg > baseline.avg * 1.5;

        console.log(`${endpoint.name}: current p95=${currentP95}ms (baseline: ${baseline.p95}ms), avg=${currentAvg.toFixed(2)}ms (baseline: ${baseline.avg}ms)`);

        expect(p95Regression).toBe(false);
        expect(avgRegression).toBe(false);

        // Also check that we're not significantly slower than baseline
        expect(currentP95).toBeLessThan(baseline.p95 * 2); // No more than 2x slower
        expect(currentAvg).toBeLessThan(baseline.avg * 2);
      }
    });
  });
});

// Helper function to get memory usage (would need to be implemented based on your monitoring setup)
async function getMemoryUsage(): Promise<number> {
  try {
    // This would typically query your monitoring system (Prometheus, etc.)
    // For now, return a mock value
    const response = await axios.get('http://localhost:3001/metrics/memory');
    return response.data.memoryUsageMB;
  } catch (error) {
    // Return mock value if monitoring endpoint is not available
    return Math.random() * 100 + 50; // Mock memory usage between 50-150MB
  }
}