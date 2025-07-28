#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up integration test environment...');

// Create necessary directories
const dirs = [
  'tests/integration/logs',
  'tests/integration/temp',
  'tests/integration/fixtures'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create test configuration files
const testConfig = {
  mongodb: {
    url: process.env.TEST_MONGODB_URL || 'mongodb://testuser:testpass@localhost:27017/testdb?authSource=admin',
    database: 'testdb'
  },
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379'
  },
  kafka: {
    brokers: process.env.TEST_KAFKA_BROKERS ? process.env.TEST_KAFKA_BROKERS.split(',') : ['localhost:9092']
  },
  influxdb: {
    url: process.env.TEST_INFLUXDB_URL || 'http://localhost:8086',
    token: process.env.TEST_INFLUXDB_TOKEN || 'test-token',
    org: 'test-org',
    bucket: 'test-bucket'
  },
  services: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    dataIngestion: process.env.DATA_INGESTION_URL || 'http://localhost:3002',
    streamProcessing: process.env.STREAM_PROCESSING_URL || 'http://localhost:3003',
    mlPipeline: process.env.ML_PIPELINE_URL || 'http://localhost:3004',
    alertService: process.env.ALERT_SERVICE_URL || 'http://localhost:3005',
    privacyService: process.env.PRIVACY_SERVICE_URL || 'http://localhost:3006'
  }
};

fs.writeFileSync(
  'tests/integration/config/test-config.json',
  JSON.stringify(testConfig, null, 2)
);

// Create test fixtures
const fixtures = {
  users: [
    {
      _id: 'user1',
      email: 'test1@example.com',
      name: 'Test User 1',
      role: 'developer',
      teamIds: ['team1'],
      privacySettings: {
        dataCollection: { ideTelemtry: true, gitActivity: true },
        sharing: { teamMetrics: true },
        retention: { months: 12 }
      }
    },
    {
      _id: 'user2',
      email: 'test2@example.com',
      name: 'Test User 2',
      role: 'team_lead',
      teamIds: ['team1'],
      privacySettings: {
        dataCollection: { ideTelemtry: true, gitActivity: true },
        sharing: { teamMetrics: true },
        retention: { months: 24 }
      }
    }
  ],
  teams: [
    {
      _id: 'team1',
      name: 'Test Team',
      memberIds: ['user1', 'user2'],
      projectIds: ['project1'],
      settings: {
        dashboardLayout: 'default',
        alertThresholds: { productivity: 0.7 }
      }
    }
  ],
  projects: [
    {
      _id: 'project1',
      name: 'Test Project',
      repository: 'https://github.com/test/repo',
      teamId: 'team1',
      settings: {
        trackingEnabled: true,
        privacyLevel: 'team'
      }
    }
  ]
};

fs.writeFileSync(
  'tests/integration/fixtures/test-data.json',
  JSON.stringify(fixtures, null, 2)
);

// Create environment file for tests
const envContent = `
# Test Environment Configuration
NODE_ENV=test
LOG_LEVEL=error

# Database URLs (will be overridden by testcontainers)
TEST_MONGODB_URL=${testConfig.mongodb.url}
TEST_REDIS_URL=${testConfig.redis.url}
TEST_KAFKA_BROKERS=${testConfig.kafka.brokers.join(',')}
TEST_INFLUXDB_URL=${testConfig.influxdb.url}

# Service URLs
API_GATEWAY_URL=${testConfig.services.apiGateway}
DATA_INGESTION_URL=${testConfig.services.dataIngestion}
STREAM_PROCESSING_URL=${testConfig.services.streamProcessing}
ML_PIPELINE_URL=${testConfig.services.mlPipeline}
ALERT_SERVICE_URL=${testConfig.services.alertService}
PRIVACY_SERVICE_URL=${testConfig.services.privacyService}

# Test tokens
TEST_JWT_SECRET=test-jwt-secret-key
TEST_API_TOKEN=test-api-token
`;

fs.writeFileSync('tests/integration/.env.test', envContent);

// Install additional test dependencies if needed
try {
  console.log('Installing test dependencies...');
  execSync('npm install --save-dev @testcontainers/mongodb @testcontainers/redis @testcontainers/kafka', {
    cwd: 'tests/integration',
    stdio: 'inherit'
  });
} catch (error) {
  console.warn('Warning: Could not install additional test dependencies');
}

console.log('Integration test environment setup complete!');
console.log('');
console.log('Next steps:');
console.log('1. Start your services or use docker-compose');
console.log('2. Run tests with: npm run test');
console.log('3. For specific test suites:');
console.log('   - npm run test:e2e');
console.log('   - npm run test:api');
console.log('   - npm run test:data');