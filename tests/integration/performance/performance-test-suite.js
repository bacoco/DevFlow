import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics for comprehensive performance testing
const performanceMetrics = {
  errorRate: new Rate('performance_error_rate'),
  apiResponseTime: new Trend('api_response_time'),
  graphqlResponseTime: new Trend('graphql_response_time'),
  websocketLatency: new Trend('websocket_latency'),
  databaseQueryTime: new Trend('database_query_time'),
  cacheHitRate: new Rate('cache_hit_rate'),
  throughput: new Counter('requests_per_second'),
  concurrentConnections: new Gauge('concurrent_connections'),
  memoryUsage: new Trend('memory_usage_mb'),
  cpuUtilization: new Trend('cpu_utilization_percent')
};

// Test scenarios configuration
export const options = {
  scenarios: {
    // Baseline performance test
    baseline_performance: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      tags: { test_type: 'baseline' },
    },
    
    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startTime: '10m',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },
        { duration: '20m', target: 200 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    
    // Stress test - beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startTime: '40m',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startTime: '75m',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '30s', target: 2000 }, // Sudden spike
        { duration: '2m', target: 2000 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
    
    // Volume test - large amounts of data
    volume_test: {
      executor: 'constant-vus',
      startTime: '85m',
      vus: 100,
      duration: '15m',
      tags: { test_type: 'volume' },
    },
    
    // Endurance test - extended duration
    endurance_test: {
      executor: 'constant-vus',
      startTime: '100m',
      vus: 150,
      duration: '60m',
      tags: { test_type: 'endurance' },
    },
  },
  
  thresholds: {
    // Performance requirements based on RN-001 and RN-006
    http_req_duration: [
      'p(95)<500',  // 95% of requests under 500ms (RN-001)
      'p(99)<1000', // 99% of requests under 1s
    ],
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    performance_error_rate: ['rate<0.01'],
    api_response_time: ['p(95)<500'],
    graphql_response_time: ['p(95)<1000'],
    websocket_latency: ['p(95)<100'],
    cache_hit_rate: ['rate>0.8'], // 80% cache hit rate
    requests_per_second: ['count>1000'], // Minimum throughput
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const GRAPHQL_URL = `${BASE_URL}/graphql`;

// Test data generators
const testDataGenerators = {
  generateUser: () => ({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    email: `test_${Math.random().toString(36).substr(2, 9)}@example.com`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    role: ['developer', 'team_lead', 'manager'][Math.floor(Math.random() * 3)],
  }),
  
  generateTelemetryData: () => ({
    sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
    events: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
      type: ['keystroke', 'file_change', 'debug', 'focus'][Math.floor(Math.random() * 4)],
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      file: `src/component_${i}.tsx`,
      data: {
        duration: Math.floor(Math.random() * 1000),
        lines: Math.floor(Math.random() * 100),
      }
    }))
  }),
  
  generateMetricsData: () => ({
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    metrics: {
      productivity_score: Math.random(),
      focus_time: Math.floor(Math.random() * 480), // 0-8 hours in minutes
      code_quality: Math.random(),
      collaboration_score: Math.random(),
    },
    timestamp: new Date().toISOString(),
  }),
};

// Authentication helper with caching
let authTokenCache = new Map();

function getAuthToken() {
  const cacheKey = 'auth_token';
  const cachedToken = authTokenCache.get(cacheKey);
  
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }
  
  const authPayload = {
    email: 'loadtest@example.com',
    password: 'testpassword123'
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(authPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  performanceMetrics.apiResponseTime.add(Date.now() - startTime);
  performanceMetrics.throughput.add(1);

  if (response.status === 200) {
    const authData = JSON.parse(response.body);
    const token = authData.token;
    
    // Cache token for 30 minutes
    authTokenCache.set(cacheKey, {
      token,
      expires: Date.now() + (30 * 60 * 1000)
    });
    
    return token;
  }
  
  performanceMetrics.errorRate.add(1);
  return null;
}

// Main test function
export default function () {
  const testType = __ENV.TEST_TYPE || 'mixed';
  const token = getAuthToken();
  
  if (!token) {
    performanceMetrics.errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Execute different test patterns based on scenario
  switch (testType) {
    case 'api_heavy':
      runAPIHeavyTest(headers);
      break;
    case 'graphql_heavy':
      runGraphQLHeavyTest(headers);
      break;
    case 'websocket_heavy':
      runWebSocketHeavyTest(token);
      break;
    case 'data_heavy':
      runDataHeavyTest(headers);
      break;
    default:
      runMixedWorkload(headers, token);
  }

  // Random think time to simulate real user behavior
  sleep(Math.random() * 3 + 1);
}

function runAPIHeavyTest(headers) {
  group('API Heavy Test', () => {
    // Rapid API calls simulating dashboard refresh
    const endpoints = [
      '/api/users/profile',
      '/api/metrics/productivity?period=24h',
      '/api/dashboard/widgets',
      '/api/teams/overview',
      '/api/alerts/active',
    ];

    endpoints.forEach(endpoint => {
      const startTime = Date.now();
      const response = http.get(`${BASE_URL}${endpoint}`, { headers });
      const responseTime = Date.now() - startTime;
      
      performanceMetrics.apiResponseTime.add(responseTime);
      performanceMetrics.throughput.add(1);
      
      const success = check(response, {
        [`${endpoint} status is 200`]: (r) => r.status === 200,
        [`${endpoint} response time < 500ms`]: () => responseTime < 500,
      });
      
      if (!success) performanceMetrics.errorRate.add(1);
      
      // Check for cache headers
      if (response.headers['X-Cache-Status']) {
        performanceMetrics.cacheHitRate.add(response.headers['X-Cache-Status'] === 'HIT' ? 1 : 0);
      }
    });
  });
}

function runGraphQLHeavyTest(headers) {
  group('GraphQL Heavy Test', () => {
    const queries = [
      {
        name: 'complex_dashboard_query',
        query: `
          query ComplexDashboard($timeRange: String!) {
            user {
              id
              name
              teams {
                id
                name
                metrics(timeRange: $timeRange) {
                  productivity
                  quality
                  collaboration
                }
              }
            }
            alerts(status: ACTIVE) {
              id
              type
              severity
              message
            }
            insights(limit: 10) {
              type
              message
              confidence
            }
          }
        `,
        variables: { timeRange: '7d' }
      },
      {
        name: 'analytics_query',
        query: `
          query Analytics($filters: AnalyticsFilters!) {
            analytics(filters: $filters) {
              productivityTrends {
                date
                value
                breakdown {
                  category
                  value
                }
              }
              codeQualityMetrics {
                complexity
                coverage
                maintainability
                trends {
                  date
                  value
                }
              }
            }
          }
        `,
        variables: {
          filters: {
            timeRange: '30d',
            teamIds: ['team1', 'team2'],
            includeIndividual: false
          }
        }
      }
    ];

    queries.forEach(({ name, query, variables }) => {
      const startTime = Date.now();
      const response = http.post(GRAPHQL_URL, JSON.stringify({
        query,
        variables
      }), { headers });
      const responseTime = Date.now() - startTime;
      
      performanceMetrics.graphqlResponseTime.add(responseTime);
      performanceMetrics.throughput.add(1);
      
      const success = check(response, {
        [`${name} status is 200`]: (r) => r.status === 200,
        [`${name} response time < 1000ms`]: () => responseTime < 1000,
        [`${name} no GraphQL errors`]: (r) => {
          const body = JSON.parse(r.body);
          return !body.errors || body.errors.length === 0;
        },
      });
      
      if (!success) performanceMetrics.errorRate.add(1);
    });
  });
}

function runWebSocketHeavyTest(token) {
  group('WebSocket Heavy Test', () => {
    const wsUrl = `${WS_URL}/ws?token=${token}`;
    
    const response = ws.connect(wsUrl, {}, function (socket) {
      performanceMetrics.concurrentConnections.add(1);
      
      let messageCount = 0;
      const startTime = Date.now();
      
      socket.on('open', () => {
        // Subscribe to multiple channels
        const channels = [
          'productivity-updates',
          'team-insights',
          'alerts',
          'system-status'
        ];
        
        channels.forEach(channel => {
          socket.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
        });
        
        // Send periodic ping messages
        const pingInterval = setInterval(() => {
          socket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        }, 5000);
        
        setTimeout(() => {
          clearInterval(pingInterval);
          socket.close();
        }, 30000); // Keep connection for 30 seconds
      });

      socket.on('message', (data) => {
        const receiveTime = Date.now();
        const message = JSON.parse(data);
        
        if (message.type === 'pong' && message.timestamp) {
          const latency = receiveTime - message.timestamp;
          performanceMetrics.websocketLatency.add(latency);
        }
        
        messageCount++;
        
        check(message, {
          'websocket message has type': (msg) => msg.type !== undefined,
          'websocket message is valid JSON': () => true,
        });
      });

      socket.on('close', () => {
        performanceMetrics.concurrentConnections.add(-1);
        const totalTime = Date.now() - startTime;
        
        check(null, {
          'websocket connection duration > 25s': () => totalTime > 25000,
          'websocket received messages': () => messageCount > 0,
        });
      });
    });

    check(response, {
      'websocket connection established': (r) => r && r.status === 101,
    });
  });
}

function runDataHeavyTest(headers) {
  group('Data Heavy Test', () => {
    // Submit large telemetry data
    const telemetryData = testDataGenerators.generateTelemetryData();
    telemetryData.events = Array.from({ length: 100 }, (_, i) => ({
      type: 'keystroke',
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      file: `src/large_file_${i}.tsx`,
      data: {
        content: 'x'.repeat(1000), // 1KB of data per event
        lineCount: Math.floor(Math.random() * 1000),
      }
    }));

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/telemetry/ide`, JSON.stringify(telemetryData), { headers });
    const responseTime = Date.now() - startTime;
    
    performanceMetrics.apiResponseTime.add(responseTime);
    performanceMetrics.throughput.add(1);
    
    check(response, {
      'large telemetry data accepted': (r) => r.status === 200 || r.status === 201,
      'large data response time < 2000ms': () => responseTime < 2000,
    }) || performanceMetrics.errorRate.add(1);

    // Query large datasets
    const analyticsQuery = {
      query: `
        query LargeDatasetQuery($timeRange: String!, $limit: Int!) {
          metrics(timeRange: $timeRange, limit: $limit) {
            userId
            timestamp
            productivity
            quality
            flow {
              sessions {
                start
                end
                interruptions
                focusScore
              }
            }
          }
        }
      `,
      variables: { timeRange: '90d', limit: 10000 }
    };

    const queryStartTime = Date.now();
    const queryResponse = http.post(GRAPHQL_URL, JSON.stringify(analyticsQuery), { headers });
    const queryResponseTime = Date.now() - queryStartTime;
    
    performanceMetrics.graphqlResponseTime.add(queryResponseTime);
    performanceMetrics.databaseQueryTime.add(queryResponseTime);
    performanceMetrics.throughput.add(1);
    
    check(queryResponse, {
      'large dataset query successful': (r) => r.status === 200,
      'large dataset query time < 5000ms': () => queryResponseTime < 5000,
    }) || performanceMetrics.errorRate.add(1);
  });
}

function runMixedWorkload(headers, token) {
  group('Mixed Workload Test', () => {
    // Simulate realistic user behavior with mixed operations
    const operations = [
      () => runAPIHeavyTest(headers),
      () => runGraphQLHeavyTest(headers),
      () => runWebSocketHeavyTest(token),
    ];

    // Execute 2-3 random operations
    const numOperations = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numOperations; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      operation();
      sleep(Math.random() * 2); // Brief pause between operations
    }
  });
}

// Performance monitoring functions
export function setup() {
  // Warm up the system
  console.log('Warming up system...');
  
  const warmupRequests = 10;
  for (let i = 0; i < warmupRequests; i++) {
    http.get(`${BASE_URL}/health`);
  }
  
  console.log('System warmed up, starting performance tests...');
}

export function teardown(data) {
  // Cleanup and final checks
  console.log('Performance test completed');
  
  // Check if system is still responsive after test
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('System health check failed after performance test');
  }
}

// Custom summary with performance analysis
export function handleSummary(data) {
  const performanceAnalysis = analyzePerformanceResults(data);
  
  return {
    'performance-test-results.html': htmlReport(data),
    'performance-test-results.json': JSON.stringify(data, null, 2),
    'performance-analysis.json': JSON.stringify(performanceAnalysis, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }) + '\n' + formatPerformanceAnalysis(performanceAnalysis),
  };
}

function analyzePerformanceResults(data) {
  const analysis = {
    overall_performance: 'UNKNOWN',
    bottlenecks: [],
    recommendations: [],
    sla_compliance: {},
    resource_utilization: {},
  };

  // Analyze response times
  const avgResponseTime = data.metrics.http_req_duration?.avg || 0;
  const p95ResponseTime = data.metrics.http_req_duration?.['p(95)'] || 0;
  
  if (p95ResponseTime > 500) {
    analysis.bottlenecks.push('High response times detected');
    analysis.recommendations.push('Optimize API endpoints and database queries');
  }

  // Analyze error rates
  const errorRate = data.metrics.http_req_failed?.rate || 0;
  if (errorRate > 0.01) {
    analysis.bottlenecks.push('High error rate detected');
    analysis.recommendations.push('Investigate and fix error sources');
  }

  // SLA compliance check (RN-001: 95% of requests under 500ms)
  analysis.sla_compliance.response_time = p95ResponseTime <= 500;
  analysis.sla_compliance.error_rate = errorRate <= 0.01;

  // Overall performance assessment
  if (analysis.sla_compliance.response_time && analysis.sla_compliance.error_rate) {
    analysis.overall_performance = 'EXCELLENT';
  } else if (p95ResponseTime <= 1000 && errorRate <= 0.05) {
    analysis.overall_performance = 'GOOD';
  } else if (p95ResponseTime <= 2000 && errorRate <= 0.1) {
    analysis.overall_performance = 'ACCEPTABLE';
  } else {
    analysis.overall_performance = 'POOR';
  }

  return analysis;
}

function formatPerformanceAnalysis(analysis) {
  return `
Performance Analysis Summary:
============================
Overall Performance: ${analysis.overall_performance}

SLA Compliance:
- Response Time (95% < 500ms): ${analysis.sla_compliance.response_time ? '✅ PASS' : '❌ FAIL'}
- Error Rate (< 1%): ${analysis.sla_compliance.error_rate ? '✅ PASS' : '❌ FAIL'}

Bottlenecks Detected:
${analysis.bottlenecks.map(b => `- ${b}`).join('\n') || '- None detected'}

Recommendations:
${analysis.recommendations.map(r => `- ${r}`).join('\n') || '- System performing well'}
`;
}