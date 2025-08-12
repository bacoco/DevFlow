import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { ContextEngineService } from './services/ContextEngineService';
import { Logger } from './utils/Logger';
import { contextRoutes } from './routes/contextRoutes';
import { websocketHandler } from './websocket/websocketHandler';
import { setupContextDatabase } from './database/schema';
import { setupKafkaTopics } from './kafka/topics';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const logger = new Logger('context-engine');

const PORT = process.env.PORT || 3004;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Global variables for services
let contextEngineService: ContextEngineService;
let mongoClient: MongoClient;
let kafka: Kafka;

async function initializeServices(): Promise<void> {
  try {
    // Initialize MongoDB
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    logger.info('Connected to MongoDB');

    // Setup database schema
    await setupContextDatabase(mongoClient, logger);

    // Initialize Kafka
    kafka = new Kafka({
      clientId: 'context-engine',
      brokers: KAFKA_BROKERS
    });
    logger.info('Kafka client initialized');

    // Setup Kafka topics
    await setupKafkaTopics(kafka, logger);

    // Initialize Context Engine Service
    contextEngineService = new ContextEngineService(mongoClient, kafka, logger);
    await contextEngineService.initialize();
    logger.info('Context Engine Service initialized');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/context', contextRoutes(contextEngineService, logger));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'context-engine'
  });
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  websocketHandler(ws, req, contextEngineService, logger);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (contextEngineService) {
    await contextEngineService.shutdown();
  }
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (contextEngineService) {
    await contextEngineService.shutdown();
  }
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
async function startServer(): Promise<void> {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`Context Engine Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();