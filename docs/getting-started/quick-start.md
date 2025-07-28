# Quick Start Guide

Get DevFlow Intelligence Platform up and running in minutes with this quick start guide.

## 🎯 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **Docker** and **Docker Compose** installed
- **Git** for version control
- At least **8GB RAM** and **20GB disk space**

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/bacoco/DevFlow.git
cd DevFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration (optional for development)
```

### 4. Start Development Environment

```bash
# Start all services with Docker Compose
docker-compose up -d

# Start the development server
npm run dev
```

### 5. Access the Platform

- **Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **Grafana**: http://localhost:3001 (admin/admin)
- **MongoDB Express**: http://localhost:8081

## 🎉 You're Ready!

The platform is now running with:
- ✅ Developer productivity dashboard
- ✅ Real-time metrics collection
- ✅ API gateway with GraphQL playground
- ✅ Monitoring and alerting
- ✅ Sample data for exploration

## 🔍 What's Next?

### Explore the Dashboard
1. Open http://localhost:3000
2. Create your first user account
3. Explore the sample metrics and visualizations
4. Configure your team settings

### Test the API
1. Visit http://localhost:4000/graphql
2. Try sample queries in the GraphQL playground
3. Check the REST API at http://localhost:4000/api/v1

### Set Up VS Code Extension
1. Open VS Code
2. Install the DevFlow extension (coming soon)
3. Connect to your local instance
4. Start collecting real-time metrics

## 🛠️ Development Workflow

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Building for Production
```bash
# Build all services
npm run build

# Start production server
npm start
```

## 🐳 Docker Commands

### Useful Docker Commands
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

### Individual Service Management
```bash
# Start only database services
docker-compose up -d mongodb influxdb redis kafka

# View specific service logs
docker-compose logs -f api-gateway
```

## 📊 Sample Data

The development environment includes sample data:
- **Users**: 10 sample developers
- **Teams**: 3 sample teams
- **Projects**: 5 sample projects
- **Metrics**: 30 days of sample productivity data

## 🔧 Configuration

### Essential Environment Variables
```bash
# Database URLs (auto-configured for development)
MONGODB_URL=mongodb://localhost:27017/devflow
INFLUXDB_URL=http://localhost:8086
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=4000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Feature Flags
```bash
# Enable/disable features
FEATURE_ML_RECOMMENDATIONS=true
FEATURE_REAL_TIME_UPDATES=true
FEATURE_ADVANCED_ANALYTICS=true
```

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :4000

# Kill the process
kill -9 <PID>
```

**Docker Issues**
```bash
# Clean up Docker
docker-compose down -v
docker system prune -f

# Rebuild everything
docker-compose up -d --build
```

**Database Connection Issues**
```bash
# Check if databases are running
docker-compose ps

# Restart database services
docker-compose restart mongodb influxdb redis
```

**Node.js Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

If you encounter issues:
1. Check the [troubleshooting guide](../operations/troubleshooting.md)
2. Look at existing [GitHub issues](https://github.com/bacoco/DevFlow/issues)
3. Create a new issue with detailed information
4. Join our community discussions

## 📚 Next Steps

Now that you have DevFlow running:

1. **[Configuration Guide](configuration.md)** - Customize your setup
2. **[Development Guide](../development/setup.md)** - Start contributing
3. **[API Documentation](../api/README.md)** - Integrate with APIs
4. **[User Guide](../user-guides/dashboard.md)** - Learn to use the dashboard

## 🎯 Production Deployment

Ready for production? Check out:
- [Production Deployment Guide](../deployment/production.md)
- [Kubernetes Guide](../deployment/kubernetes.md)
- [Security Configuration](../security/overview.md)
- [Monitoring Setup](../operations/monitoring.md)

---

**Need help?** Join our [community discussions](https://github.com/bacoco/DevFlow/discussions) or check the [FAQ](../faq.md).