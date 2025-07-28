import express from 'express';
import { config } from 'dotenv';
import { FlinkStyleStreamJob } from './jobs/stream-job';
import { StreamJobConfig } from './types/stream-processing';
import winston from 'winston';

config();

const app = express();
const PORT = process.env.PORT || 3002;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'stream-processing' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/stream-processing.log' })
  ]
});

// Middleware
app.use(express.json());

// Stream job configuration
const streamJobConfig: StreamJobConfig = {
  name: 'devflow-metrics-processor',
  inputTopics: ['git-events', 'ide-events', 'communication-events'],
  outputTopics: ['processed-metrics', 'real-time-metrics'],
  windowConfig: {
    type: 'tumbling',
    size: parseInt(process.env.WINDOW_SIZE_MS || '300000') // 5 minutes default
  },
  parallelism: parseInt(process.env.PARALLELISM || '4'),
  checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL_MS || '10000') // 10 seconds
};

const kafkaConfig = {
  clientId: 'stream-processing-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
};

// Initialize stream job
const streamJob = new FlinkStyleStreamJob(streamJobConfig, kafkaConfig);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const jobStatus = streamJob.getStatus();
    const metrics = await streamJob.getJobMetrics();
    
    res.status(200).json({
      service: 'stream-processing',
      status: jobStatus === 'running' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      job: {
        status: jobStatus,
        metrics
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      service: 'stream-processing',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Job status endpoint
app.get('/status', async (req, res) => {
  try {
    const status = streamJob.getStatus();
    const metrics = await streamJob.getJobMetrics();
    
    res.json({
      job: {
        name: streamJobConfig.name,
        status,
        config: streamJobConfig,
        metrics
      }
    });
  } catch (error) {
    logger.error('Status check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await streamJob.getJobMetrics();
    res.json({ metrics });
  } catch (error) {
    logger.error('Metrics retrieval failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Job control endpoints
app.post('/job/start', async (req, res) => {
  try {
    if (streamJob.getStatus() === 'running') {
      return res.status(400).json({ error: 'Job is already running' });
    }
    
    await streamJob.start();
    logger.info('Stream job started via API');
    
    res.json({ 
      message: 'Stream job started successfully',
      status: streamJob.getStatus()
    });
  } catch (error) {
    logger.error('Failed to start stream job', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/job/stop', async (req, res) => {
  try {
    if (streamJob.getStatus() === 'stopped') {
      return res.status(400).json({ error: 'Job is already stopped' });
    }
    
    await streamJob.stop();
    logger.info('Stream job stopped via API');
    
    res.json({ 
      message: 'Stream job stopped successfully',
      status: streamJob.getStatus()
    });
  } catch (error) {
    logger.error('Failed to stop stream job', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Intelligence Stream Processing Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      status: '/status',
      'job-control': {
        start: 'POST /job/start',
        stop: 'POST /job/stop'
      }
    },
    job: {
      name: streamJobConfig.name,
      status: streamJob.getStatus()
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  try {
    if (streamJob.getStatus() === 'running') {
      await streamJob.stop();
    }
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  
  try {
    if (streamJob.getStatus() === 'running') {
      await streamJob.stop();
    }
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
});

// Start the HTTP server
const server = app.listen(PORT, () => {
  logger.info(`Stream Processing Service running on port ${PORT}`);
});

// Auto-start the stream job if configured
if (process.env.AUTO_START_JOB === 'true') {
  streamJob.start()
    .then(() => {
      logger.info('Stream job auto-started successfully');
    })
    .catch((error) => {
      logger.error('Failed to auto-start stream job', { error: error instanceof Error ? error.message : String(error) });
    });
}

export { app, streamJob, server };