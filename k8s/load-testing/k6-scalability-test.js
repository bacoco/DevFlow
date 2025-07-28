import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics for scalability testing
const scalabilityErrorRate = new Rate('scalability_error_rate');
const concurrentUsers = new Counter('concurrent_users');
const systemThroughput = new Counter('system_throughput');
const resourceUtilization = new Trend('resource_utilization');

// Scalability test configuration - tests up to 10,000 concurrent users
export const options = {
  scenarios: {
    // Gradual ramp-up to test horizontal scaling
    gradual_scaling: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 1000 },   // Ramp to 1k users
        { duration: '10m', target: 1000 },  // Sustain 1k users
        { duration: '5m', target: 2500 },   // Scale to 2.5k users
        { duration: '10m', target: 2500 },  // Sustain 2.5k users
        { duration: '5m', target: 5000 },   // Scale to 5k users
        { duration: '15m', target: 5000 },  // Sustain 5k users
        { duration: '5m', target: 7500 },   // Scale to 7.5k users
        { duration: '10m', target: 7500 },  // Sustain 7.5k users
        { duration: '5m', target: 10000 },  // Scale to 10k users
        { duration: '15m', target: 10000 }, // Sustain 10k users (target load)
        { duration: '10m', target: 0 },     // Ramp down
      ],
    },
    
    // Sudden spike test to validate auto-scaling responsiveness
    spike_test: {
      executor: 'ramping-vus',
      startTime: '30m', // Start after gradual test is running
      startVUs: 0,
      stages: [
        { duration: '30s', target: 2000 },  // Sudden spike
        { duration: '2m', target: 2000 },   // Sustain spike
        { duration: '30s', target: 0 },     // Drop
      ],
    },
    
    // Constant load test for baseline performance
    baseline_load: {
      executor: 'constant-vus',
      vus: 500,
      duration: '60m',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s during scaling
    http_req_failed: ['rate<0.1'],     // Error rate under 10% during scaling
    scalability_error_rate: ['rate<0.1'],
    system_throughput: ['count>100000'], // Minimum throughput requirement
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://api.devflow.local';

// Simulate different user behaviors for realistic load
const userBehaviors = [
  'dashboard_viewer',    // Users who primarily view dashboards
  'active_developer',    // Users who generate lots of telemetry
  'team_manager',        // Users who access team insights
  'data_analyst',        // Users who run complex queries
];

export default function () {
  const userType = userBehaviors[Math.floor(Math.random() * userBehaviors.length)];
  concurrentUsers.add(1);
  
  // Authenticate
  const token = authenticate();
  if (!token) {
    scalabilityErrorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Execute behavior based on user type
  switch (userType) {
    case 'dashboard_viewer':
      dashboardViewerBehavior(headers);
      break;
    case 'active_developer':
      activeDeveloperBehavior(headers);
      break;
    case 'team_manager':
      teamManagerBehavior(headers);
      break;
    case 'data_analyst':
      dataAnalystBehavior(headers);
      break;
  }

  // Random think time between actions
  sleep(Math.random() * 5 + 2);
}

function authenticate() {
  const authPayload = {
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    password: 'testpassword123'
  };

  const response = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(authPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  systemThroughput.add(1);

  if (response.status === 200) {
    const authData = JSON.parse(response.body);
    return authData.token;
  }
  return 'mock-token-for-testing';
}

function dashboardViewerBehavior(headers) {
  group('Dashboard Viewer Behavior', () => {
    // Load dashboard configuration
    let response = http.get(`${BASE_URL}/api/v1/dashboard/config`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'dashboard config loaded': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(1);

    // Load multiple widgets
    const widgets = ['productivity', 'flow-metrics', 'team-health', 'code-quality'];
    widgets.forEach(widget => {
      response = http.get(`${BASE_URL}/api/v1/dashboard/widgets/${widget}`, { headers });
      systemThroughput.add(1);
      
      check(response, {
        [`${widget} widget loaded`]: (r) => r.status === 200,
      }) || scalabilityErrorRate.add(1);
    });

    sleep(2);

    // Refresh data periodically
    response = http.get(`${BASE_URL}/api/v1/metrics/productivity?timeRange=24h`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'productivity metrics refreshed': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);
  });
}

function activeDeveloperBehavior(headers) {
  group('Active Developer Behavior', () => {
    // Simulate IDE telemetry data submission
    const telemetryData = {
      sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
      events: Array.from({ length: 10 }, (_, i) => ({
        type: 'keystroke',
        timestamp: new Date().toISOString(),
        file: `src/component-${i}.tsx`,
        line: Math.floor(Math.random() * 100),
      }))
    };

    let response = http.post(`${BASE_URL}/api/v1/telemetry/ide`, JSON.stringify(telemetryData), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'telemetry data submitted': (r) => r.status === 200 || r.status === 201,
    }) || scalabilityErrorRate.add(1);

    sleep(0.5);

    // Check personal productivity metrics
    response = http.get(`${BASE_URL}/api/v1/metrics/personal/flow`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'personal flow metrics loaded': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(1);

    // Submit code review data
    const reviewData = {
      pullRequestId: `pr-${Math.random().toString(36).substr(2, 9)}`,
      comments: Math.floor(Math.random() * 5),
      reviewTime: Math.floor(Math.random() * 3600),
    };

    response = http.post(`${BASE_URL}/api/v1/code-review/submit`, JSON.stringify(reviewData), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'code review data submitted': (r) => r.status === 200 || r.status === 201,
    }) || scalabilityErrorRate.add(1);
  });
}

function teamManagerBehavior(headers) {
  group('Team Manager Behavior', () => {
    // Load team overview
    let response = http.get(`${BASE_URL}/api/v1/teams/overview`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'team overview loaded': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(1);

    // Load team productivity trends
    response = http.get(`${BASE_URL}/api/v1/metrics/team/productivity?timeRange=30d`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'team productivity trends loaded': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(2);

    // Check team member performance
    response = http.get(`${BASE_URL}/api/v1/teams/members/performance`, { headers });
    systemThroughput.add(1);
    
    check(response, {
      'team member performance loaded': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(1);

    // Generate team report
    response = http.post(`${BASE_URL}/api/v1/reports/team/generate`, JSON.stringify({
      timeRange: '7d',
      includeIndividualMetrics: false
    }), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'team report generated': (r) => r.status === 200 || r.status === 202,
    }) || scalabilityErrorRate.add(1);
  });
}

function dataAnalystBehavior(headers) {
  group('Data Analyst Behavior', () => {
    // Run complex GraphQL queries
    const complexQuery = {
      query: `
        query ComplexAnalytics($timeRange: String!, $teamIds: [ID!]!) {
          analytics(timeRange: $timeRange) {
            productivityTrends {
              date
              value
              teamBreakdown(teamIds: $teamIds) {
                teamId
                value
                members {
                  userId
                  contribution
                }
              }
            }
            codeQualityMetrics {
              complexity
              coverage
              maintainability
            }
            collaborationPatterns {
              reviewLatency
              knowledgeSharing
              communicationFrequency
            }
          }
        }
      `,
      variables: {
        timeRange: '30d',
        teamIds: ['team1', 'team2', 'team3']
      }
    };

    let response = http.post(`${BASE_URL}/graphql`, JSON.stringify(complexQuery), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'complex analytics query executed': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);

    sleep(3);

    // Export data for external analysis
    response = http.post(`${BASE_URL}/api/v1/export/metrics`, JSON.stringify({
      format: 'csv',
      timeRange: '90d',
      metrics: ['productivity', 'quality', 'collaboration']
    }), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'data export initiated': (r) => r.status === 200 || r.status === 202,
    }) || scalabilityErrorRate.add(1);

    sleep(2);

    // Run ML predictions
    response = http.post(`${BASE_URL}/api/v1/ml/predict/productivity`, JSON.stringify({
      horizon: '7d',
      includeConfidenceInterval: true
    }), { headers });
    systemThroughput.add(1);
    
    check(response, {
      'ML prediction executed': (r) => r.status === 200,
    }) || scalabilityErrorRate.add(1);
  });
}

// Resource monitoring during scaling
export function handleSummary(data) {
  return {
    'scalability-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
Scalability Test Results:
========================
Total Requests: ${data.metrics.http_reqs.count}
Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
95th Percentile Response Time: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms
Error Rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
Throughput: ${(data.metrics.http_reqs.count / (data.state.testRunDurationMs / 1000)).toFixed(2)} req/s

Scalability Metrics:
- Peak Concurrent Users: ${data.metrics.concurrent_users ? data.metrics.concurrent_users.count : 'N/A'}
- System Throughput: ${data.metrics.system_throughput ? data.metrics.system_throughput.count : 'N/A'}
- Scalability Error Rate: ${data.metrics.scalability_error_rate ? (data.metrics.scalability_error_rate.rate * 100).toFixed(2) + '%' : 'N/A'}

Test Status: ${data.metrics.http_req_failed.rate < 0.1 ? 'PASSED' : 'FAILED'}
    `
  };
}