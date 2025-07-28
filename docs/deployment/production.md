# Production Deployment Guide

This guide covers deploying DevFlow Intelligence Platform to production environments with high availability, security, and scalability.

## 🎯 Prerequisites

### Infrastructure Requirements

**Minimum Requirements:**
- **Kubernetes cluster**: 1.24+
- **Nodes**: 3+ nodes (for HA)
- **CPU**: 8 cores per node
- **Memory**: 16GB per node
- **Storage**: 100GB+ SSD per node
- **Network**: 1Gbps+ bandwidth

**Recommended Production Setup:**
- **Nodes**: 6+ nodes across 3 AZs
- **CPU**: 16 cores per node
- **Memory**: 32GB per node
- **Storage**: 500GB+ NVMe SSD per node
- **Network**: 10Gbps+ bandwidth

### External Dependencies

- **Domain name** with SSL certificate
- **Cloud storage** (AWS S3, GCS, or Azure Blob)
- **Email service** (SendGrid, SES, or SMTP)
- **Monitoring** (Prometheus, Grafana)
- **DNS provider** with API access

### Required Tools

```bash
# Install required tools
kubectl version --client
helm version
terraform version
docker version
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
│                     (AWS ALB / GCP LB)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                           │
├─────────────────────────────────────────────────────────────────┤
│  Ingress Controller  │  API Gateway  │  Dashboard  │  Services  │
│  (NGINX/Traefik)     │  (GraphQL)    │  (React)    │  (Node.js) │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│   MongoDB Cluster   │   InfluxDB    │   Redis     │   Kafka     │
│   (3 replicas)      │   (HA setup)  │  (Cluster)  │  (Cluster)  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Steps

### 1. Infrastructure Setup

#### Option A: Terraform (Recommended)

```bash
# Clone infrastructure templates
git clone https://github.com/bacoco/DevFlow.git
cd DevFlow/terraform

# Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy infrastructure
terraform init
terraform plan
terraform apply
```

#### Option B: Manual Setup

**Create Kubernetes Cluster:**
```bash
# AWS EKS
eksctl create cluster --name devflow-prod --region us-east-1 --nodes 6

# GCP GKE
gcloud container clusters create devflow-prod --num-nodes=6 --zone=us-central1-a

# Azure AKS
az aks create --resource-group devflow-rg --name devflow-prod --node-count 6
```

### 2. Namespace and RBAC Setup

```bash
# Create namespace
kubectl create namespace devflow-production

# Apply RBAC configuration
kubectl apply -f k8s/rbac/
```

### 3. Secrets Configuration

```bash
# Create database secrets
kubectl create secret generic database-secrets \
  --from-literal=mongodb-url="mongodb://mongodb:27017/devflow" \
  --from-literal=influxdb-url="http://influxdb:8086" \
  --from-literal=influxdb-token="your-token" \
  --from-literal=redis-url="redis://redis:6379" \
  -n devflow-production

# Create backup secrets
kubectl create secret generic backup-secrets \
  --from-literal=aws-access-key-id="your-key" \
  --from-literal=aws-secret-access-key="your-secret" \
  --from-literal=s3-bucket="devflow-backups" \
  -n devflow-production

# Create notification secrets
kubectl create secret generic notification-secrets \
  --from-literal=slack-webhook-url="your-webhook" \
  --from-literal=email-smtp-password="your-password" \
  -n devflow-production
```

### 4. Storage Configuration

```bash
# Create storage classes
kubectl apply -f k8s/storage/

# Create persistent volumes
kubectl apply -f k8s/volumes/
```

### 5. Database Deployment

```bash
# Deploy MongoDB cluster
kubectl apply -f k8s/databases/mongodb/

# Deploy InfluxDB
kubectl apply -f k8s/databases/influxdb/

# Deploy Redis cluster
kubectl apply -f k8s/databases/redis/

# Deploy Kafka cluster
kubectl apply -f k8s/databases/kafka/

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n devflow-production --timeout=300s
```

### 6. Application Services

```bash
# Deploy API Gateway
kubectl apply -f k8s/services/api-gateway/

# Deploy microservices
kubectl apply -f k8s/services/data-ingestion/
kubectl apply -f k8s/services/stream-processing/
kubectl apply -f k8s/services/ml-pipeline/
kubectl apply -f k8s/services/alert-service/
kubectl apply -f k8s/services/privacy-service/
kubectl apply -f k8s/services/monitoring-service/

# Deploy dashboard
kubectl apply -f k8s/apps/dashboard/
```

### 7. Ingress and Load Balancer

```bash
# Deploy ingress controller
kubectl apply -f k8s/ingress/nginx-controller.yaml

# Configure ingress rules
kubectl apply -f k8s/ingress/devflow-ingress.yaml
```

### 8. Monitoring and Observability

```bash
# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus/

# Deploy Grafana
kubectl apply -f k8s/monitoring/grafana/

# Deploy Jaeger
kubectl apply -f k8s/monitoring/jaeger/

# Deploy log aggregation
kubectl apply -f k8s/monitoring/elasticsearch/
kubectl apply -f k8s/monitoring/logstash/
kubectl apply -f k8s/monitoring/kibana/
```

### 9. Disaster Recovery Setup

```bash
# Deploy backup CronJobs
kubectl apply -f k8s/backup-cronjobs.yaml

# Configure disaster recovery
cp deployment/disaster-recovery/dr-config.example.json deployment/disaster-recovery/dr-config.json
# Edit dr-config.json with production settings

# Test disaster recovery
node deployment/disaster-recovery/dr-cli.js test
```

## ⚙️ Configuration

### Environment Configuration

Create production environment file:
```bash
# Production environment variables
NODE_ENV=production
PORT=4000

# Database URLs
MONGODB_URL=mongodb://mongodb-primary:27017,mongodb-secondary:27017/devflow?replicaSet=rs0
INFLUXDB_URL=http://influxdb:8086
REDIS_URL=redis://redis-cluster:6379

# Security
JWT_SECRET=your-production-jwt-secret
SESSION_SECRET=your-production-session-secret

# External services
AWS_REGION=us-east-1
S3_BUCKET=devflow-production-storage
SMTP_HOST=smtp.sendgrid.net

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
```

### Scaling Configuration

```yaml
# k8s/services/api-gateway/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api-gateway
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔒 Security Configuration

### TLS/SSL Setup

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress with TLS
kubectl apply -f k8s/ingress/devflow-ingress-tls.yaml
```

### Network Policies

```bash
# Apply network policies
kubectl apply -f k8s/security/network-policies/
```

### Pod Security Standards

```bash
# Apply pod security policies
kubectl apply -f k8s/security/pod-security/
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# k8s/monitoring/prometheus/config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true

- job_name: 'devflow-api'
  static_configs:
  - targets: ['api-gateway:9464']

- job_name: 'devflow-services'
  kubernetes_sd_configs:
  - role: endpoints
    namespaces:
      names:
      - devflow-production
```

### Grafana Dashboards

```bash
# Import DevFlow dashboards
kubectl create configmap grafana-dashboards \
  --from-file=k8s/monitoring/grafana/dashboards/ \
  -n devflow-production

# Configure dashboard provisioning
kubectl apply -f k8s/monitoring/grafana/dashboard-config.yaml
```

### Alerting Rules

```yaml
# k8s/monitoring/prometheus/alerts.yaml
groups:
- name: devflow.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected

  - alert: DatabaseDown
    expr: up{job="mongodb"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: Database is down
```

## 🚀 Performance Optimization

### Resource Allocation

```yaml
# Recommended resource allocation
services:
  api-gateway:
    requests: { cpu: 500m, memory: 1Gi }
    limits: { cpu: 2000m, memory: 4Gi }
    replicas: 3-10

  data-ingestion:
    requests: { cpu: 200m, memory: 512Mi }
    limits: { cpu: 1000m, memory: 2Gi }
    replicas: 2-5

  stream-processing:
    requests: { cpu: 1000m, memory: 2Gi }
    limits: { cpu: 4000m, memory: 8Gi }
    replicas: 2-8

  dashboard:
    requests: { cpu: 100m, memory: 256Mi }
    limits: { cpu: 500m, memory: 1Gi }
    replicas: 2-5
```

### Database Optimization

**MongoDB:**
```javascript
// Create indexes for performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.metrics.createIndex({ "timestamp": 1, "userId": 1 })
db.events.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 })
```

**InfluxDB:**
```sql
-- Create retention policies
CREATE RETENTION POLICY "30_days" ON "devflow" DURATION 30d REPLICATION 1 DEFAULT
CREATE RETENTION POLICY "1_year" ON "devflow" DURATION 365d REPLICATION 1

-- Create continuous queries for downsampling
CREATE CONTINUOUS QUERY "downsample_metrics" ON "devflow"
BEGIN
  SELECT mean(*) INTO "devflow"."1_year"."metrics_hourly"
  FROM "devflow"."30_days"."metrics"
  GROUP BY time(1h), *
END
```

### Caching Strategy

```yaml
# Redis cluster configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    save 60 10000
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: docker/build-push-action@v5
      with:
        push: true
        tags: ghcr.io/bacoco/devflow:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    - uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
    - run: |
        sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/services/*/deployment.yaml
        kubectl apply -f k8s/
        kubectl rollout status deployment/api-gateway -n devflow-production
```

### Blue-Green Deployment

```bash
# Deploy to blue environment
kubectl apply -f k8s/blue-green/blue/

# Test blue environment
curl -f https://blue.api.devflow.com/health

# Switch traffic to blue
kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"blue"}}}'

# Clean up green environment
kubectl delete -f k8s/blue-green/green/
```

## 📋 Health Checks

### Application Health Checks

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      cache: await checkRedis(),
      queue: await checkKafka(),
      storage: await checkS3()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Kubernetes Health Checks

```yaml
# Liveness and readiness probes
containers:
- name: api-gateway
  livenessProbe:
    httpGet:
      path: /health
      port: 4000
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
  
  readinessProbe:
    httpGet:
      path: /ready
      port: 4000
    initialDelaySeconds: 5
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 3
```

## 🚨 Troubleshooting

### Common Issues

**Pod Startup Issues:**
```bash
# Check pod status
kubectl get pods -n devflow-production

# Check pod logs
kubectl logs -f deployment/api-gateway -n devflow-production

# Describe pod for events
kubectl describe pod <pod-name> -n devflow-production
```

**Database Connection Issues:**
```bash
# Test database connectivity
kubectl exec -it deployment/api-gateway -n devflow-production -- \
  curl -f mongodb://mongodb:27017/admin

# Check database logs
kubectl logs -f statefulset/mongodb -n devflow-production
```

**Performance Issues:**
```bash
# Check resource usage
kubectl top pods -n devflow-production
kubectl top nodes

# Check HPA status
kubectl get hpa -n devflow-production
```

### Debugging Commands

```bash
# Port forward for local debugging
kubectl port-forward service/api-gateway 4000:4000 -n devflow-production

# Execute commands in pod
kubectl exec -it deployment/api-gateway -n devflow-production -- /bin/bash

# Check service endpoints
kubectl get endpoints -n devflow-production

# View recent events
kubectl get events --sort-by=.metadata.creationTimestamp -n devflow-production
```

## 📈 Scaling Guidelines

### Horizontal Scaling

```bash
# Scale deployment manually
kubectl scale deployment api-gateway --replicas=5 -n devflow-production

# Configure auto-scaling
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=3 --max=10 -n devflow-production
```

### Vertical Scaling

```bash
# Update resource limits
kubectl patch deployment api-gateway -n devflow-production -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api-gateway",
          "resources": {
            "limits": {"cpu": "4000m", "memory": "8Gi"},
            "requests": {"cpu": "1000m", "memory": "2Gi"}
          }
        }]
      }
    }
  }
}'
```

### Database Scaling

**MongoDB Scaling:**
```bash
# Add replica set member
kubectl scale statefulset mongodb --replicas=5 -n devflow-production

# Configure sharding (for large datasets)
kubectl apply -f k8s/databases/mongodb/sharding/
```

## 🔄 Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review monitoring dashboards
- Check backup success rates
- Update security patches
- Review resource usage

**Monthly:**
- Update dependencies
- Review and rotate secrets
- Conduct disaster recovery tests
- Performance optimization review

**Quarterly:**
- Security audit
- Capacity planning review
- Update documentation
- Team training updates

### Backup and Recovery

```bash
# Manual backup
node deployment/disaster-recovery/dr-cli.js backup --type full

# Test recovery
node deployment/disaster-recovery/dr-cli.js test --type backup

# Full disaster recovery test
node deployment/disaster-recovery/dr-cli.js test
```

## 📞 Support

### Production Support

- **24/7 On-call**: Critical issues
- **Business Hours**: General support
- **Email**: production-support@devflow.com
- **Slack**: #production-alerts

### Escalation Process

1. **L1**: Initial response (15 minutes)
2. **L2**: Technical investigation (1 hour)
3. **L3**: Engineering escalation (4 hours)
4. **L4**: Management escalation (24 hours)

---

For more information, see the [DevFlow Intelligence Documentation](../README.md).