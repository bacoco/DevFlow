import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Lightweight performance tests for CI/CD pipeline
const ciErrorRate = new Rate('ci_error_rate');
const ciResponseTime = new Trend('ci_response_time');

// CI-optimized test configuration (shorter duration, focused tests)
export const options = {
  scenarios: {
    // Quick smoke test for basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      tags: { test_type: 'smoke' },
    },
    
    // Light load test for performance regression detection
    regression_test: {
      executor: 'ramping-vus',
      startTime: '2m',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'regression' },
    },
  },
  
  // Strict thresholds for CI/CD - must pass for deployment
  thresholds: {
    http_req_duration: [
      'p(95)<500',  // 95% under 500ms (RN-001)
      'p(99)<1000', // 99% under 1s
    ],
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    ci_error_rate: ['rate<0.01'],
    ci_response_time: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Essential endpoints for CI testing
const criticalEndpoints = [
  { path: '/health', name: 'health_check', timeout: 100 },
  { path: '/api/auth/login', name: 'authentication', method: 'POST', timeout: 300 },
  { path: '/api/users/profile', name: 'user_profile', auth: true, timeout: 200 },
  { path: '/api/metrics/productivity?period=24h', name: 'productivity_metrics', auth: true, timeout: 500 },
  { path: '/api/dashboard/widgets', name: 'dashboard_widgets', auth: true, timeout: 300 },
  { path: '/graphql', name: 'graphql_query', method: 'POST', auth: true, timeout: 800 },
];

let authToken = null;

export function setup() {
  console.log('CI Performance Test Setup - Authenticating...');
  
  // Get auth token for authenticated requests
  const authResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'ci-test@example.com',
    password: 'ci-test-password'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    authToken = authData.token;
    console.log('Authentication successful');
  } else {
    console.error('Authentication failed - using mock token');
    authToken = 'mock-ci-token';
  }
  
  return { authToken };
}

export default function (data) {
  const token = data.authToken || authToken;
  
  group('CI Critical Path Tests', () => {
    criticalEndpoints.forEach(endpoint => {
      testEndpoint(endpoint, token);
    });
  });
  
  group('CI Performance Regression Tests', () => {
    testPerformanceRegression(token);
  });
}

function testEndpoint(endpoint, token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (endpoint.auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response;
  const startTime = Date.now();
  
  try {
    if (endpoint.method === 'POST') {
      let payload = {};
      
      if (endpoint.path === '/api/auth/login') {
        payload = {
          email: 'ci-test@example.com',
          password: 'ci-test-password'
        };
      } else if (endpoint.path === '/graphql') {
        payload = {
          query: 'query { user { id email name } }'
        };
      }
      
      response = http.post(`${BASE_URL}${endpoint.path}`, JSON.stringify(payload), { headers });
    } else {
      response = http.get(`${BASE_URL}${endpoint.path}`, { headers });
    }
    
    const responseTime = Date.now() - startTime;
    ciResponseTime.add(responseTime);
    
    const success = check(response, {
      [`${endpoint.name} status is successful`]: (r) => r.status >= 200 && r.status < 300,
      [`${endpoint.name} response time under ${endpoint.timeout}ms`]: () => responseTime < endpoint.timeout,
      [`${endpoint.name} has response body`]: (r) => r.body && r.body.length > 0,
    });
    
    if (!success) {
      ciErrorRate.add(1);
      console.error(`CI Test Failed: ${endpoint.name} - Status: ${response.status}, Time: ${responseTime}ms`);
    }
    
  } catch (error) {
    ciErrorRate.add(1);
    console.error(`CI Test Error: ${endpoint.name} - ${error.message}`);
  }
}

function testPerformanceRegression(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Test scenarios that commonly cause performance regressions
  const regressionTests = [
    {
      name: 'dashboard_load_time',
      test: () => {
        const startTime = Date.now();
        const responses = [
          http.get(`${BASE_URL}/api/users/profile`, { headers }),
          http.get(`${BASE_URL}/api/dashboard/widgets`, { headers }),
          http.get(`${BASE_URL}/api/metrics/productivity?period=24h`, { headers }),
        ];
        const totalTime = Date.now() - startTime;
        
        const allSuccessful = responses.every(r => r.status === 200);
        
        return {
          success: allSuccessful && totalTime < 1000,
          time: totalTime,
          details: `Dashboard load: ${totalTime}ms, All requests successful: ${allSuccessful}`
        };
      }
    },
    
    {
      name: 'concurrent_user_simulation',
      test: () => {
        const startTime = Date.now();
        const promises = [];
        
        // Simulate 10 concurrent requests
        for (let i = 0; i < 10; i++) {
          promises.push(http.get(`${BASE_URL}/api/metrics/productivity?period=1h`, { headers }));
        }
        
        const responses = promises;
        const totalTime = Date.now() - startTime;
        const successfulRequests = responses.filter(r => r.status === 200).length;
        
        return {
          success: successfulRequests >= 9 && totalTime < 2000, // Allow 1 failure, under 2s
          time: totalTime,
          details: `Concurrent requests: ${successfulRequests}/10 successful in ${totalTime}ms`
        };
      }
    },
    
    {
      name: 'graphql_complex_query',
      test: () => {
        const complexQuery = {
          query: `
            query CIRegressionTest {
              user {
                id
                name
                teams {
                  id
                  name
                  metrics(timeRange: "7d") {
                    productivity
                    quality
                  }
                }
              }
              alerts(status: ACTIVE, limit: 5) {
                id
                type
                severity
              }
            }
          `
        };
        
        const startTime = Date.now();
        const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(complexQuery), { headers });
        const responseTime = Date.now() - startTime;
        
        const hasData = response.status === 200 && !JSON.parse(response.body).errors;
        
        return {
          success: hasData && responseTime < 800,
          time: responseTime,
          details: `GraphQL query: ${responseTime}ms, Has data: ${hasData}`
        };
      }
    }
  ];
  
  regressionTests.forEach(({ name, test }) => {
    const result = test();
    
    check(result, {
      [`${name} regression test passed`]: (r) => r.success,
    }) || ciErrorRate.add(1);
    
    if (!result.success) {
      console.error(`Regression Test Failed: ${name} - ${result.details}`);
    } else {
      console.log(`Regression Test Passed: ${name} - ${result.details}`);
    }
  });
}

// CI-specific summary with pass/fail status
export function handleSummary(data) {
  const passed = data.metrics.ci_error_rate?.rate < 0.01 && 
                 data.metrics.http_req_duration?.['p(95)'] < 500;
  
  const summary = {
    test_status: passed ? 'PASSED' : 'FAILED',
    timestamp: new Date().toISOString(),
    metrics: {
      total_requests: data.metrics.http_reqs?.count || 0,
      error_rate: (data.metrics.http_req_failed?.rate * 100).toFixed(2) + '%',
      avg_response_time: data.metrics.http_req_duration?.avg?.toFixed(2) + 'ms',
      p95_response_time: data.metrics.http_req_duration?.['p(95)']?.toFixed(2) + 'ms',
      p99_response_time: data.metrics.http_req_duration?.['p(99)']?.toFixed(2) + 'ms',
    },
    thresholds: {
      response_time_p95: {
        threshold: '< 500ms',
        actual: data.metrics.http_req_duration?.['p(95)']?.toFixed(2) + 'ms',
        passed: data.metrics.http_req_duration?.['p(95)'] < 500
      },
      error_rate: {
        threshold: '< 1%',
        actual: (data.metrics.http_req_failed?.rate * 100).toFixed(2) + '%',
        passed: data.metrics.http_req_failed?.rate < 0.01
      }
    }
  };
  
  const ciOutput = `
CI Performance Test Results
===========================
Status: ${summary.test_status}
Timestamp: ${summary.timestamp}

Metrics:
- Total Requests: ${summary.metrics.total_requests}
- Error Rate: ${summary.metrics.error_rate}
- Average Response Time: ${summary.metrics.avg_response_time}
- 95th Percentile: ${summary.metrics.p95_response_time}
- 99th Percentile: ${summary.metrics.p99_response_time}

Threshold Compliance:
- Response Time (P95 < 500ms): ${summary.thresholds.response_time_p95.passed ? '✅ PASS' : '❌ FAIL'} (${summary.thresholds.response_time_p95.actual})
- Error Rate (< 1%): ${summary.thresholds.error_rate.passed ? '✅ PASS' : '❌ FAIL'} (${summary.thresholds.error_rate.actual})

${passed ? 'All performance tests passed! ✅' : 'Performance tests failed! ❌'}
`;
  
  return {
    'ci-performance-results.json': JSON.stringify(summary, null, 2),
    'ci-performance-results.txt': ciOutput,
    stdout: ciOutput,
  };
}