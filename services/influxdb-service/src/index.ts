import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';
import { InfluxDBConfig } from './config/influxdb';
import { TimeSeriesWriter } from './services/time-series-writer';
import { TimeSeriesReader } from './services/time-series-reader';
import { MetricData, FlowMetric, CodeQualityMetric, QueryOptions } from './types';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/influxdb-service.log' })
  ]
});

class InfluxDBService {
  private app: express.Application;
  private influxConfig: InfluxDBConfig;
  private writer: TimeSeriesWriter;
  private reader: TimeSeriesReader;

  constructor() {
    this.app = express();
    this.influxConfig = new InfluxDBConfig();
    this.writer = new TimeSeriesWriter(this.influxConfig, logger);
    this.reader = new TimeSeriesReader(this.influxConfig, logger);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Write endpoints
    this.app.post('/metrics/flow', async (req, res) => {
      try {
        const metric: FlowMetric = req.body;
        await this.writer.writeFlowMetric(metric);
        res.json({ success: true, message: 'Flow metric written successfully' });
      } catch (error) {
        logger.error('Failed to write flow metric:', error);
        res.status(500).json({ error: 'Failed to write flow metric' });
      }
    });

    this.app.post('/metrics/code-quality', async (req, res) => {
      try {
        const metric: CodeQualityMetric = req.body;
        await this.writer.writeCodeQualityMetric(metric);
        res.json({ success: true, message: 'Code quality metric written successfully' });
      } catch (error) {
        logger.error('Failed to write code quality metric:', error);
        res.status(500).json({ error: 'Failed to write code quality metric' });
      }
    });

    this.app.post('/metrics/generic', async (req, res) => {
      try {
        const metric: MetricData = req.body;
        await this.writer.writeGenericMetric(metric);
        res.json({ success: true, message: 'Generic metric written successfully' });
      } catch (error) {
        logger.error('Failed to write generic metric:', error);
        res.status(500).json({ error: 'Failed to write generic metric' });
      }
    });

    this.app.post('/metrics/batch', async (req, res) => {
      try {
        const metrics: MetricData[] = req.body;
        for (const metric of metrics) {
          await this.writer.writeGenericMetric(metric);
        }
        res.json({ success: true, message: `${metrics.length} metrics written successfully` });
      } catch (error) {
        logger.error('Failed to write batch metrics:', error);
        res.status(500).json({ error: 'Failed to write batch metrics' });
      }
    });

    // Query endpoints
    this.app.post('/query', async (req, res) => {
      try {
        const options: QueryOptions = req.body;
        const results = await this.reader.queryMetrics(options);
        res.json({ data: results });
      } catch (error) {
        logger.error('Failed to query metrics:', error);
        res.status(500).json({ error: 'Failed to query metrics' });
      }
    });

    this.app.get('/metrics/flow/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const start = new Date(req.query.start as string || Date.now() - 24 * 60 * 60 * 1000);
        const stop = new Date(req.query.stop as string || Date.now());
        
        const results = await this.reader.getFlowMetrics(userId, start, stop);
        res.json({ data: results });
      } catch (error) {
        logger.error('Failed to get flow metrics:', error);
        res.status(500).json({ error: 'Failed to get flow metrics' });
      }
    });

    this.app.get('/metrics/code-quality/:projectId', async (req, res) => {
      try {
        const { projectId } = req.params;
        const start = new Date(req.query.start as string || Date.now() - 24 * 60 * 60 * 1000);
        const stop = new Date(req.query.stop as string || Date.now());
        
        const results = await this.reader.getCodeQualityMetrics(projectId, start, stop);
        res.json({ data: results });
      } catch (error) {
        logger.error('Failed to get code quality metrics:', error);
        res.status(500).json({ error: 'Failed to get code quality metrics' });
      }
    });

    this.app.get('/metrics/team/:teamId', async (req, res) => {
      try {
        const { teamId } = req.params;
        const start = new Date(req.query.start as string || Date.now() - 24 * 60 * 60 * 1000);
        const stop = new Date(req.query.stop as string || Date.now());
        
        const results = await this.reader.getTeamMetrics(teamId, start, stop);
        res.json({ data: results });
      } catch (error) {
        logger.error('Failed to get team metrics:', error);
        res.status(500).json({ error: 'Failed to get team metrics' });
      }
    });
  }

  async start(port: number = 3003): Promise<void> {
    try {
      await this.influxConfig.setupRetentionPolicies();
      logger.info('InfluxDB retention policies configured');

      this.app.listen(port, () => {
        logger.info(`InfluxDB service listening on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start InfluxDB service:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.writer.close();
      await this.influxConfig.close();
      logger.info('InfluxDB service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new InfluxDBService();
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  service.start();
}

export { InfluxDBService, InfluxDBConfig, TimeSeriesWriter, TimeSeriesReader };