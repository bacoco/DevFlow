# DevFlow Intelligence Platform - Launch Guide

## Quick Start

The DevFlow Intelligence Platform is now ready to launch! Here are the available options:

### Basic Launch (Recommended)
```bash
./launch-devflow.sh
```
This will:
- Start all infrastructure services (MongoDB, Redis, InfluxDB, Kafka, Zookeeper)
- Start all application services (API Gateway, Data Ingestion, Stream Processing, ML Pipeline, Dashboard)
- Run initial health tests
- Keep services running until you press Ctrl+C

### Launch with Continuous Monitoring
```bash
./launch-devflow.sh --monitor
```
This enables continuous health checks every 30 seconds with auto-healing capabilities.

### Launch without Auto-Fix
```bash
./launch-devflow.sh --no-auto-fix
```
Skips the automatic port cleanup and dependency installation.

### Custom Health Check Interval
```bash
./launch-devflow.sh --monitor --health-interval 60
```
Sets custom monitoring interval (in seconds).

## Access Points

Once launched, you can access:

- **Dashboard**: http://localhost:3010
- **API Gateway**: http://localhost:3000
- **GraphQL Playground**: http://localhost:3000/graphql
- **Test Results**: Run `node tests/final-application-test.js` for health checks

## Service Endpoints

- **Data Ingestion**: http://localhost:3001
- **Stream Processing**: http://localhost:3002
- **ML Pipeline**: http://localhost:3003

## Infrastructure Services

- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **InfluxDB**: localhost:8086
- **Kafka**: localhost:9092
- **Zookeeper**: localhost:2181

## Manual Health Check

To manually check system health:
```bash
node tests/final-application-test.js
```

## Stopping Services

- **Graceful shutdown**: Press Ctrl+C in the terminal running the launch script
- **Manual cleanup**: `docker-compose -f docker-compose.simple.yml down`
- **Kill all processes**: `./stop-app.sh` (if available)

## Troubleshooting

### Docker Issues
- Make sure Docker Desktop is running
- The script will automatically start Docker if needed

### Port Conflicts
- The script automatically cleans up conflicting processes on ports 3000-3010
- Infrastructure ports (27017, 6379, etc.) are managed by Docker

### Test Failures
- Individual test failures don't prevent the system from running
- Check service health manually with curl commands or the test script

## Alternative Launch Script

For a simpler approach without monitoring, you can also use:
```bash
./launch-app.sh
```

This script uses the same infrastructure but with a different approach to service management.