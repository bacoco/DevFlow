import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiResponseTime = new Trend('api_response_time');
const graphqlResponseTime = new Trend('graphql_response_time');
const websocketConnections = new Gauge('websocket_connections');
const throughputCounter = new Counter('throughput_counter');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 100 },   // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },   // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 },   // Ramp up to 200 users over 2 minutes
    { duration: '5m', target: 200 },   // Stay at 200 users for 5 minutes
    { duration: '2m', target: 500 },   // Ramp up to 500 users over 2 minutes
    { duration: '10m', target: 500 },  // Stay at 500 users for 10 minutes
    { duration: '3m', target: 1000 },  // Ramp up to 1000 users over 3 minutes
    { duration: '10m', target: 1000 }, // Stay at 1000 users for 10 minutes
    { duration: '5m', target: 0 },     // Ramp down to 0 users over 5 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    error_rate: ['rate<0.05'],
    api_response_time: ['p(95)<500'],
    graphql_response_time: ['p(95)<1000'],
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://api.devflow.local';
const WS_URL = __ENV.WS_URL || 'ws://api.devflow.local';

// Test data
const testUsers = [
  { id: 'user1', email: 'test1@example.com', role: 'developer' },
  { id: 'user2', email: 'test2@example.com', role: 'team_lead' },
  { id: 'user3', email: 'test3@example.com', role: 'manager' },
];

const testProjects = [
  { id: 'proj1', name: 'Frontend App' },
  { id: 'proj2', name: 'Backend API' },
  { id: 'proj3', name: 'ML Pipeline' },
];

// Authentication helper
function authenticate() {
  const authPayload = {
    email: testUsers[Math.floor(Math.random() * testUsers.length)].email,
    password: 'testpassword123'
  };

  const authResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(authPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    return authData.token;
  }
  return null;
}

// Main test function
export default function () {
  const token = authenticate();
  
  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test different API endpoints
  group('REST API Tests', () => {
    testHealthEndpoint();
    testUserEndpoints(headers);
    testMetricsEndpoints(headers);
    testDashboardEndpoints(headers);
  });

  group('GraphQL API Tests', () => {
    testGraphQLQueries(headers);
    testGraphQLMutations(headers);
  });

  group('WebSocket Tests', () => {
    testWebSocketConnections(token);
  });

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

function testHealthEndpoint() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/health`);
  const responseTime = Date.now() - startTime;
  
  apiResponseTime.add(responseTime);
  throughputCounter.add(1);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': () => responseTime < 100,
    'health check has correct structure': (r) => {
      const body = JSON.parse(r.body);
      return body.service && body.status && body.timestamp;
    },
  });
  
  if (!success) errorRate.add(1);
}

function testUserEndpoints(headers) {
  // Test user profile endpoint
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/v1/users/profile`, { headers });
  const responseTime = Date.now() - startTime;
  
  apiResponseTime.add(responseTime);
  throughputCounter.add(1);
  
  const success = check(response, {
    'user profile status is 200': (r) => r.status === 200,
    'user profile response time < 300ms': () => responseTime < 300,
  });
  
  if (!success) errorRate.add(1);

  // Test user teams endpoint
  const teamsResponse = http.get(`${BASE_URL}/api/v1/users/teams`, { headers });
  throughputCounter.add(1);
  
  check(teamsResponse, {
    'user teams status is 200': (r) => r.status === 200,
  });
}

function testMetricsEndpoints(headers) {
  const projectId = testProjects[Math.floor(Math.random() * testProjects.length)].id;
  
  // Test productivity metrics
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/v1/metrics/productivity?projectId=${projectId}&timeRange=7d`, { headers });
  const responseTime = Date.now() - startTime;
  
  apiResponseTime.add(responseTime);
  throughputCounter.add(1);
  
  const success = check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 500ms': () => responseTime < 500,
  });
  
  if (!success) errorRate.add(1);

  // Test flow metrics
  const flowResponse = http.get(`${BASE_URL}/api/v1/metrics/flow?userId=${testUsers[0].id}&timeRange=24h`, { headers });
  throughputCounter.add(1);
  
  check(flowResponse, {
    'flow metrics status is 200': (r) => r.status === 200,
  });
}

function testDashboardEndpoints(headers) {
  // Test dashboard configuration
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/v1/dashboard/config`, { headers });
  const responseTime = Date.now() - startTime;
  
  apiResponseTime.add(responseTime);
  throughputCounter.add(1);
  
  const success = check(response, {
    'dashboard config status is 200': (r) => r.status === 200,
    'dashboard config response time < 200ms': () => responseTime < 200,
  });
  
  if (!success) errorRate.add(1);

  // Test dashboard widgets
  const widgetsResponse = http.get(`${BASE_URL}/api/v1/dashboard/widgets`, { headers });
  throughputCounter.add(1);
  
  check(widgetsResponse, {
    'dashboard widgets status is 200': (r) => r.status === 200,
  });
}

function testGraphQLQueries(headers) {
  const queries = [
    {
      name: 'getUserProfile',
      query: `
        query GetUserProfile {
          user {
            id
            email
            name
            role
            teams {
              id
              name
            }
          }
        }
      `
    },
    {
      name: 'getProductivityMetrics',
      query: `
        query GetProductivityMetrics($timeRange: String!) {
          productivityMetrics(timeRange: $timeRange) {
            timeInFlow
            codeQuality
            collaborationScore
            timestamp
          }
        }
      `,
      variables: { timeRange: '7d' }
    },
    {
      name: 'getTeamInsights',
      query: `
        query GetTeamInsights($teamId: ID!) {
          team(id: $teamId) {
            id
            name
            insights {
              velocity
              qualityTrend
              collaborationHealth
            }
          }
        }
      `,
      variables: { teamId: 'team1' }
    }
  ];

  queries.forEach(({ name, query, variables }) => {
    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query,
      variables: variables || {}
    }), { headers });
    const responseTime = Date.now() - startTime;
    
    graphqlResponseTime.add(responseTime);
    throughputCounter.add(1);
    
    const success = check(response, {
      [`${name} status is 200`]: (r) => r.status === 200,
      [`${name} response time < 1000ms`]: () => responseTime < 1000,
      [`${name} has no errors`]: (r) => {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      },
    });
    
    if (!success) errorRate.add(1);
  });
}

function testGraphQLMutations(headers) {
  const mutations = [
    {
      name: 'updateUserPreferences',
      mutation: `
        mutation UpdateUserPreferences($preferences: UserPreferencesInput!) {
          updateUserPreferences(preferences: $preferences) {
            id
            preferences {
              theme
              notifications
            }
          }
        }
      `,
      variables: {
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }
    },
    {
      name: 'createAlert',
      mutation: `
        mutation CreateAlert($alert: AlertInput!) {
          createAlert(alert: $alert) {
            id
            type
            threshold
            enabled
          }
        }
      `,
      variables: {
        alert: {
          type: 'PRODUCTIVITY_DROP',
          threshold: 0.8,
          enabled: true
        }
      }
    }
  ];

  mutations.forEach(({ name, mutation, variables }) => {
    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: mutation,
      variables
    }), { headers });
    const responseTime = Date.now() - startTime;
    
    graphqlResponseTime.add(responseTime);
    throughputCounter.add(1);
    
    const success = check(response, {
      [`${name} status is 200`]: (r) => r.status === 200,
      [`${name} response time < 1500ms`]: () => responseTime < 1500,
      [`${name} has no errors`]: (r) => {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      },
    });
    
    if (!success) errorRate.add(1);
  });
}

function testWebSocketConnections(token) {
  const wsUrl = `${WS_URL}/ws?token=${token}`;
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    websocketConnections.add(1);
    
    socket.on('open', () => {
      // Subscribe to real-time updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'productivity-updates'
      }));
      
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'team-insights'
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'websocket message has type': (msg) => msg.type !== undefined,
        'websocket message has data': (msg) => msg.data !== undefined,
      });
    });

    socket.on('close', () => {
      websocketConnections.add(-1);
    });

    // Keep connection open for a random duration
    sleep(Math.random() * 10 + 5); // 5-15 seconds
  });

  check(response, {
    'websocket connection successful': (r) => r && r.status === 101,
  });
}

// Stress test scenario
export function stressTest() {
  const token = authenticate();
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Rapid fire requests
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/health`);
    http.get(`${BASE_URL}/api/v1/users/profile`, { headers });
    
    if (i % 3 === 0) {
      http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: 'query { user { id email } }'
      }), { headers });
    }
  }
}

// Spike test scenario
export function spikeTest() {
  const token = authenticate();
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Simulate sudden spike in traffic
  const requests = [];
  for (let i = 0; i < 50; i++) {
    requests.push(http.get(`${BASE_URL}/api/v1/metrics/productivity?projectId=proj1&timeRange=1h`, { headers }));
  }

  // Check if system handles spike gracefully
  requests.forEach((response, index) => {
    check(response, {
      [`spike request ${index} status < 500`]: (r) => r.status < 500,
    });
  });
}