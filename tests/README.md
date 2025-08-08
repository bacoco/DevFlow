# DevFlow Global Test Runner & Auto-Fix System

A comprehensive testing and monitoring system that automatically detects, reports, and fixes issues in the DevFlow Intelligence Platform.

## 🚀 Quick Start

### Single Test Run
```bash
npm run test:global
```

### Continuous Monitoring with Auto-Fix
```bash
npm run test:monitor
```

### Launch Everything with Monitoring
```bash
npm run launch
```

## 📋 Features

### ✅ Comprehensive Testing
- **Infrastructure Testing**: MongoDB, Redis, InfluxDB, Kafka, Zookeeper
- **Service Testing**: API Gateway, Data Ingestion, Stream Processing, ML Pipeline, Dashboard
- **Integration Testing**: GraphQL, WebSocket, Data Flow validation
- **Health Scoring**: Critical vs non-critical service differentiation

### 🔧 Auto-Fix Capabilities
- **Port Conflict Resolution**: Automatically kills conflicting processes
- **Service Recovery**: Restarts failed services automatically
- **Docker Issues**: Cleans and rebuilds containers
- **Infrastructure Repair**: Fixes permissions, dependencies, configuration

### 📊 Continuous Monitoring
- **Real-time Health Checks**: Configurable interval monitoring
- **Automatic Recovery**: Self-healing system with retry logic
- **Historical Tracking**: Maintains test history and trends
- **Event Notifications**: Emits events for external monitoring integration

## 🛠️ Usage

### Command Line Options

```bash
node tests/final-application-test.js [options]

Options:
  --continuous         Run continuous monitoring
  --no-auto-fix        Disable automatic bug fixing
  --quiet              Suppress detailed output
  --interval <seconds> Monitoring interval (default: 30)
  --retry-count <n>    Max auto-fix attempts (default: 3)
  --help               Show help message
```

### Examples

```bash
# Basic test run with auto-fix
node tests/final-application-test.js

# Continuous monitoring every 60 seconds
node tests/final-application-test.js --continuous --interval 60

# Quiet mode for CI/CD integration
node tests/final-application-test.js --quiet

# Disable auto-fix for debugging
node tests/final-application-test.js --no-auto-fix

# Custom retry count
node tests/final-application-test.js --retry-count 5
```

### NPM Scripts

```bash
# Single test run
npm run test:global

# Continuous monitoring
npm run test:monitor

# Quiet mode
npm run test:quiet

# Launch with monitoring
npm run launch

# Launch with custom health check interval
npm run launch:monitor
```

## 📊 Output & Reporting

### Console Output
```
🚀 DevFlow Intelligence Platform - Global Test Runner
============================================================

📊 Testing Infrastructure Services...
  ✅ MongoDB (port 27017)
  ✅ Redis (port 6379)
  ✅ InfluxDB (port 8086)
  ✅ Kafka (port 9092)
  ✅ Zookeeper (port 2181)

🔧 Testing Application Services...
  ✅ API Gateway (200) - 45ms
  ✅ Data Ingestion (200) - 32ms
  ✅ Stream Processing (200) - 28ms
  ✅ ML Pipeline (200) - 67ms
  ✅ Dashboard (200) - 123ms

🔗 Testing Service Integration...
  ✅ GraphQL API Integration
  ✅ WebSocket Integration
  ✅ Data Flow Integration

📋 Test Results Summary
============================================================

📊 Infrastructure: 5/5 services running (4/4 critical)
🔧 Application Services: 5/5 services healthy (3/3 critical)
🔗 Integration Tests: 3/3 tests passing

🎯 Overall System Health: 100% (Critical: 100%)
📈 Test Run: #1 at 2024-01-15T10:30:00.000Z

✅ System is READY for production!

📄 Results saved to: tests/test-results.json
📊 History saved to: tests/global-test-history.json
```

### JSON Reports

#### Current Results (`test-results.json`)
```json
{
  "infrastructure": {
    "MongoDB": { "status": "RUNNING", "port": 27017 },
    "Redis": { "status": "RUNNING", "port": 6379 }
  },
  "services": {
    "API Gateway": { "status": "HEALTHY", "statusCode": 200, "responseTime": 45 }
  },
  "integration": {
    "graphql": { "status": "WORKING", "statusCode": 200 }
  },
  "errors": [],
  "fixes": [],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "runCount": 1
}
```

#### Historical Data (`global-test-history.json`)
```json
[
  {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "runCount": 1,
    "healthPercentage": 100,
    "criticalHealthPercentage": 100,
    "infraUp": 5,
    "servicesHealthy": 5,
    "integrationWorking": 3,
    "errorCount": 0,
    "fixCount": 0
  }
]
```

## 🔧 Auto-Fix Scenarios

### Port Conflicts
- **Detection**: `EADDRINUSE` errors or port-related failures
- **Fix**: Kills processes using required ports (3000-3010, 27017, 6379, 8086, 9092, 2181)
- **Recovery**: Waits and retries service startup

### Service Failures
- **Detection**: `ECONNREFUSED` errors or service DOWN status
- **Fix**: Restarts Docker containers and application services
- **Recovery**: Validates service health after restart

### Docker Issues
- **Detection**: Docker-related errors or container failures
- **Fix**: Cleans Docker system, rebuilds containers
- **Recovery**: Starts fresh container stack

### Infrastructure Problems
- **Detection**: Missing files, permission issues, dependency problems
- **Fix**: Creates missing `.env`, fixes permissions, reinstalls dependencies
- **Recovery**: Validates infrastructure setup

## 🔄 Continuous Monitoring

### Event System
The test runner emits events for integration with external monitoring:

```javascript
const tester = new DevFlowTester({ continuous: true });

tester.on('healthCheck', (data) => {
  console.log(`Health check: ${data.success ? 'PASS' : 'FAIL'}`);
});

tester.on('recovery', (data) => {
  if (data.success) {
    console.log('System recovered successfully');
  } else {
    console.log('Recovery failed:', data.error);
  }
});
```

### Integration with External Systems
- **Prometheus**: Export metrics via HTTP endpoint
- **Slack/Teams**: Send notifications on failures
- **PagerDuty**: Create incidents for critical failures
- **Grafana**: Visualize health trends over time

## 🎯 Health Scoring

### Critical Services
Services marked as `critical: true` are weighted higher in health calculations:
- **Infrastructure**: MongoDB, Redis, Kafka, Zookeeper
- **Services**: API Gateway, Data Ingestion, Dashboard

### Health Thresholds
- **90%+**: Production ready ✅
- **70-89%**: Functional with issues ⚠️
- **<70%**: Critical issues requiring attention ❌

## 🚨 Troubleshooting

### Common Issues

#### Tests Fail Immediately
```bash
# Check if services are running
docker-compose ps

# Restart everything
./launch-devflow.sh
```

#### Auto-Fix Not Working
```bash
# Run with manual fixes disabled to see raw errors
node tests/final-application-test.js --no-auto-fix
```

#### Continuous Monitoring Stops
```bash
# Check for memory issues or process limits
ps aux | grep node
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* node tests/final-application-test.js

# Check specific service
curl http://localhost:3000/health
```

## 📈 Performance Metrics

### Typical Response Times
- **Infrastructure checks**: <100ms per service
- **Service health checks**: <200ms per service
- **Integration tests**: <500ms per test
- **Full test suite**: <10 seconds

### Resource Usage
- **Memory**: ~50MB during testing
- **CPU**: <5% during normal operation
- **Disk**: <1MB for logs and reports

## 🔒 Security Considerations

- **No sensitive data**: Test runner doesn't log credentials
- **Safe auto-fixes**: Only performs non-destructive operations
- **Isolated testing**: Uses separate test endpoints where possible
- **Audit trail**: All fixes and errors are logged with timestamps

## 🚀 CI/CD Integration

### GitHub Actions
```yaml
- name: Run DevFlow Tests
  run: |
    npm run test:quiet
    if [ $? -ne 0 ]; then
      echo "Tests failed, attempting auto-fix"
      npm run test:global
    fi
```

### Docker Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node tests/final-application-test.js --quiet || exit 1
```

## 📚 API Reference

### DevFlowTester Class

```javascript
const DevFlowTester = require('./tests/final-application-test.js');

const tester = new DevFlowTester({
  autoFix: true,        // Enable auto-fix
  continuous: false,    // Single run vs continuous
  quiet: false,         // Suppress output
  interval: 30000,      // Monitoring interval (ms)
  retryCount: 3         // Max fix attempts
});

// Run tests
const success = await tester.runTests();

// Start continuous monitoring
tester.startContinuousMonitoring();

// Stop monitoring
tester.stopContinuousMonitoring();
```

### Events
- `healthCheck`: Emitted after each health check
- `recovery`: Emitted after auto-recovery attempts

---

**Need help?** Check the [main README](../README.md) or create an issue on GitHub.