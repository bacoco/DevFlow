import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics({ register });

// API Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

// Data Processing Metrics
export const eventsProcessedTotal = new Counter({
  name: 'events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['event_type', 'service', 'status'],
  registers: [register]
});

export const eventProcessingDuration = new Histogram({
  name: 'event_processing_duration_seconds',
  help: 'Duration of event processing in seconds',
  labelNames: ['event_type', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Queue Metrics
export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current size of message queues',
  labelNames: ['queue_name', 'service'],
  registers: [register]
});

export const queueProcessingRate = new Gauge({
  name: 'queue_processing_rate',
  help: 'Rate of queue processing (messages per second)',
  labelNames: ['queue_name', 'service'],
  registers: [register]
});

// Database Metrics
export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database_type', 'service'],
  registers: [register]
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'database_type', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register]
});

export const databaseErrorsTotal = new Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'database_type', 'service', 'error_type'],
  registers: [register]
});

// ML Pipeline Metrics
export const mlModelInferences = new Counter({
  name: 'ml_model_inferences_total',
  help: 'Total number of ML model inferences',
  labelNames: ['model_name', 'model_version', 'service'],
  registers: [register]
});

export const mlModelAccuracy = new Gauge({
  name: 'ml_model_accuracy',
  help: 'Current accuracy of ML models',
  labelNames: ['model_name', 'model_version', 'service'],
  registers: [register]
});

export const mlTrainingDuration = new Histogram({
  name: 'ml_training_duration_seconds',
  help: 'Duration of ML model training in seconds',
  labelNames: ['model_name', 'service'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
  registers: [register]
});

// Cache Metrics
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'service'],
  registers: [register]
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'service'],
  registers: [register]
});

export const cacheSize = new Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_type', 'service'],
  registers: [register]
});

// Privacy and Security Metrics
export const privacyViolationsTotal = new Counter({
  name: 'privacy_violations_total',
  help: 'Total number of privacy violations detected',
  labelNames: ['violation_type', 'service'],
  registers: [register]
});

export const dataAnonymizationRate = new Gauge({
  name: 'data_anonymization_rate',
  help: 'Rate of data anonymization operations per second',
  labelNames: ['service'],
  registers: [register]
});

export const encryptionOperationsTotal = new Counter({
  name: 'encryption_operations_total',
  help: 'Total number of encryption/decryption operations',
  labelNames: ['operation_type', 'service'],
  registers: [register]
});

// System Health Metrics
export const systemHealthScore = new Gauge({
  name: 'system_health_score',
  help: 'Overall system health score (0-100)',
  labelNames: ['service'],
  registers: [register]
});

export const alertsTriggeredTotal = new Counter({
  name: 'alerts_triggered_total',
  help: 'Total number of alerts triggered',
  labelNames: ['alert_type', 'severity', 'service'],
  registers: [register]
});

export const uptimeSeconds = new Gauge({
  name: 'uptime_seconds',
  help: 'Service uptime in seconds',
  labelNames: ['service'],
  registers: [register]
});

export { register };