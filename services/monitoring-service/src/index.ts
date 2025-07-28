import express from 'express';
import cors from 'cors';
import { register } from './metrics/prometheus-metrics';
import { MetricsCollector } from './collectors/metrics-collector';
import { LogAggregator } from './logging/log-aggregator';
import { createLogger, correlationMiddleware } from './logging/correlation-logger';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('monitoring-service'));

// Initialize metrics collector and log aggregator
const metricsCollector = new MetricsCollector();
const logAggregator = new LogAggregator();
const correlationLogger = createLogger('monitoring-service');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'monitoring-service'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Health summary endpoint
app.get('/health/summary', async (req, res) => {
  try {
    const summary = await metricsCollector.getHealthSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error getting health summary:', error);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});

// Grafana health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Log query endpoints
app.get('/logs/query', async (req, res) => {
  try {
    const query = {
      services: req.query.services ? (req.query.services as string).split(',') : undefined,
      levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
      correlationId: req.query.correlationId as string,
      userId: req.query.userId as string,
      traceId: req.query.traceId as string,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      search: req.query.search as string
    };

    const logs = await logAggregator.queryLogs(query);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { resultCount: logs.length });
    res.json({ logs, count: logs.length });
  } catch (error) {
    correlationLogger.error('Error querying logs', error as Error);
    res.status(500).json({ error: 'Failed to query logs' });
  }
});

app.get('/logs/correlation/:correlationId', async (req, res) => {
  try {
    const logs = await logAggregator.getCorrelationTrace(req.params.correlationId);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      correlationId: req.params.correlationId,
      resultCount: logs.length 
    });
    res.json({ logs, correlationId: req.params.correlationId });
  } catch (error) {
    correlationLogger.error('Error getting correlation trace', error as Error);
    res.status(500).json({ error: 'Failed to get correlation trace' });
  }
});

app.get('/logs/user/:userId', async (req, res) => {
  try {
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
    
    const logs = await logAggregator.getUserActivity(req.params.userId, startTime, endTime);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      userId: req.params.userId,
      resultCount: logs.length 
    });
    res.json({ logs, userId: req.params.userId });
  } catch (error) {
    correlationLogger.error('Error getting user activity', error as Error);
    res.status(500).json({ error: 'Failed to get user activity' });
  }
});

app.get('/logs/service/:service', async (req, res) => {
  try {
    const level = req.query.level as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const logs = await logAggregator.getServiceLogs(req.params.service, level, limit);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      service: req.params.service,
      level,
      resultCount: logs.length 
    });
    res.json({ logs, service: req.params.service });
  } catch (error) {
    correlationLogger.error('Error getting service logs', error as Error);
    res.status(500).json({ error: 'Failed to get service logs' });
  }
});

app.get('/logs/analysis', async (req, res) => {
  try {
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
    
    const analysis = await logAggregator.analyzeLogs(startTime, endTime);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      analysisType: 'full',
      totalLogs: analysis.totalLogs 
    });
    res.json(analysis);
  } catch (error) {
    correlationLogger.error('Error analyzing logs', error as Error);
    res.status(500).json({ error: 'Failed to analyze logs' });
  }
});

app.get('/logs/search', async (req, res) => {
  try {
    const searchTerm = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term (q) is required' });
    }
    
    const logs = await logAggregator.searchLogs(searchTerm, limit);
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      searchTerm,
      resultCount: logs.length 
    });
    res.json({ logs, searchTerm, count: logs.length });
  } catch (error) {
    correlationLogger.error('Error searching logs', error as Error);
    res.status(500).json({ error: 'Failed to search logs' });
  }
});

app.get('/logs/export', async (req, res) => {
  try {
    const query = {
      services: req.query.services ? (req.query.services as string).split(',') : undefined,
      levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
      correlationId: req.query.correlationId as string,
      userId: req.query.userId as string,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const exportData = await logAggregator.exportLogs(query, format);
    
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `logs-export-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    correlationLogger.logApiRequest(req.method, req.path, 200, Date.now(), { 
      format,
      exportSize: exportData.length 
    });
    res.send(exportData);
  } catch (error) {
    correlationLogger.error('Error exporting logs', error as Error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Monitoring service started on port ${port}`);
  logger.info('Metrics available at /metrics');
  logger.info('Health check available at /health');
  logger.info('Health summary available at /health/summary');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;