export interface AlertRule {
  name: string;
  query: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq' | 'ne';
  duration: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  runbook?: string;
}

export const alertingRules: AlertRule[] = [
  // System Health Alerts
  {
    name: 'SystemHealthLow',
    query: 'system_health_score',
    threshold: 80,
    comparison: 'lt',
    duration: '5m',
    severity: 'warning',
    description: 'System health score is below 80%',
    runbook: 'Check individual service health and investigate failing services'
  },
  {
    name: 'SystemHealthCritical',
    query: 'system_health_score',
    threshold: 50,
    comparison: 'lt',
    duration: '2m',
    severity: 'critical',
    description: 'System health score is critically low (below 50%)',
    runbook: 'Immediate investigation required - multiple services may be down'
  },

  // API Performance Alerts
  {
    name: 'HighAPILatency',
    query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
    threshold: 2.0,
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: '95th percentile API response time exceeds 2 seconds',
    runbook: 'Check API gateway performance and database query times'
  },
  {
    name: 'HighAPIErrorRate',
    query: 'rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])',
    threshold: 0.05,
    comparison: 'gt',
    duration: '3m',
    severity: 'critical',
    description: 'API error rate exceeds 5%',
    runbook: 'Check application logs and service dependencies'
  },

  // Database Alerts
  {
    name: 'HighDatabaseConnections',
    query: 'database_connections_active',
    threshold: 80,
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: 'Database connection count is high',
    runbook: 'Check for connection leaks and consider scaling database'
  },
  {
    name: 'DatabaseQuerySlow',
    query: 'histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))',
    threshold: 1.0,
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: '95th percentile database query time exceeds 1 second',
    runbook: 'Analyze slow queries and optimize database indexes'
  },

  // Queue Alerts
  {
    name: 'HighQueueSize',
    query: 'queue_size',
    threshold: 10000,
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: 'Message queue size is high',
    runbook: 'Check queue consumers and processing capacity'
  },
  {
    name: 'QueueProcessingStalled',
    query: 'queue_processing_rate',
    threshold: 1,
    comparison: 'lt',
    duration: '10m',
    severity: 'critical',
    description: 'Queue processing rate is very low',
    runbook: 'Check queue consumers and processing services'
  },

  // ML Pipeline Alerts
  {
    name: 'MLModelAccuracyLow',
    query: 'ml_model_accuracy',
    threshold: 0.7,
    comparison: 'lt',
    duration: '10m',
    severity: 'warning',
    description: 'ML model accuracy has dropped below 70%',
    runbook: 'Check model performance and consider retraining'
  },
  {
    name: 'MLTrainingFailed',
    query: 'increase(ml_training_duration_seconds[1h])',
    threshold: 0,
    comparison: 'eq',
    duration: '2h',
    severity: 'warning',
    description: 'No ML model training activity detected',
    runbook: 'Check ML pipeline and training scheduler'
  },

  // Privacy and Security Alerts
  {
    name: 'PrivacyViolationDetected',
    query: 'increase(privacy_violations_total[5m])',
    threshold: 0,
    comparison: 'gt',
    duration: '1m',
    severity: 'critical',
    description: 'Privacy violation detected',
    runbook: 'Immediate investigation required - check privacy service logs'
  },
  {
    name: 'HighEncryptionFailures',
    query: 'rate(encryption_operations_total{operation_type="failed"}[5m])',
    threshold: 0.01,
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: 'High rate of encryption failures',
    runbook: 'Check encryption service and key management system'
  },

  // Cache Performance Alerts
  {
    name: 'LowCacheHitRate',
    query: 'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))',
    threshold: 0.8,
    comparison: 'lt',
    duration: '10m',
    severity: 'warning',
    description: 'Cache hit rate is below 80%',
    runbook: 'Check cache configuration and warming strategies'
  },
  {
    name: 'CacheSizeHigh',
    query: 'cache_size_bytes',
    threshold: 1000000000, // 1GB
    comparison: 'gt',
    duration: '5m',
    severity: 'warning',
    description: 'Cache size exceeds 1GB',
    runbook: 'Check cache eviction policies and memory usage'
  }
];

export class AlertEvaluator {
  private alertStates: Map<string, { triggered: boolean; since?: Date }> = new Map();

  public evaluateRules(metrics: Map<string, number>): AlertRule[] {
    const triggeredAlerts: AlertRule[] = [];

    for (const rule of alertingRules) {
      const metricValue = metrics.get(rule.name);
      if (metricValue === undefined) {
        continue;
      }

      const shouldTrigger = this.evaluateCondition(metricValue, rule.threshold, rule.comparison);
      const currentState = this.alertStates.get(rule.name) || { triggered: false };

      if (shouldTrigger && !currentState.triggered) {
        // Alert is newly triggered
        this.alertStates.set(rule.name, { triggered: true, since: new Date() });
        triggeredAlerts.push(rule);
      } else if (!shouldTrigger && currentState.triggered) {
        // Alert is resolved
        this.alertStates.set(rule.name, { triggered: false });
      }
    }

    return triggeredAlerts;
  }

  private evaluateCondition(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  public getActiveAlerts(): AlertRule[] {
    return alertingRules.filter(rule => {
      const state = this.alertStates.get(rule.name);
      return state?.triggered === true;
    });
  }
}