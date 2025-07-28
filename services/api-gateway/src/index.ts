import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { config } from 'dotenv';
import winston from 'winston';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createAuthContext } from './middleware/auth';
import { databaseService } from './services/database';
import { restRoutes } from './rest/routes';
import { setReady, setStarted, setShuttingDown } from './rest/health';
import { completeSpecs } from './docs/openapi';
import swaggerUi from 'swagger-ui-express';
import { WebSocketGateway } from './websocket/gateway';
import { owaspProtection } from './security/owasp-protection';

config();

// Initialize Prometheus metrics
collectDefaultMetrics({ register });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const graphqlOperationsTotal = new Counter({
  name: 'graphql_operations_total',
  help: 'Total number of GraphQL operations',
  labelNames: ['operation_name', 'operation_type', 'service'],
  registers: [register]
});

const websocketConnectionsActive = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['service'],
  registers: [register]
});

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize database connections
  try {
    await databaseService.connect();
    logger.info('Database connections established');
    setStarted();
  } catch (error) {
    logger.error('Failed to connect to databases', error);
    process.exit(1);
  }

  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: async ({ req, connection }) => {
      // For subscriptions (WebSocket connections)
      if (connection) {
        return connection.context;
      }
      
      // For queries and mutations (HTTP requests)
      return await createAuthContext(req);
    },
    plugins: [
      {
        requestDidStart() {
          return {
            didResolveOperation(requestContext) {
              const operationName = requestContext.request.operationName || 'anonymous';
              const operationType = requestContext.operation?.operation || 'unknown';
              
              graphqlOperationsTotal.inc({
                operation_name: operationName,
                operation_type: operationType,
                service: 'api-gateway'
              });
              
              logger.info('GraphQL Operation', {
                operationName: requestContext.request.operationName,
                query: requestContext.request.query,
                variables: requestContext.request.variables
              });
            },
            didEncounterErrors(requestContext) {
              logger.error('GraphQL Errors', {
                errors: requestContext.errors,
                operationName: requestContext.request.operationName
              });
            }
          };
        }
      }
    ],
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production'
  });

  // Apply OWASP security protections first
  app.use(owaspProtection.createCryptographicProtection());
  app.use(owaspProtection.createSecureDesignMiddleware());
  app.use(owaspProtection.createSecurityConfigMiddleware());
  app.use(owaspProtection.createComponentSecurityCheck());
  app.use(owaspProtection.createSecurityLoggingMiddleware());

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Apply additional security middleware
  app.use(owaspProtection.createInputValidationMiddleware());
  app.use(owaspProtection.createAuthenticationSecurityMiddleware());
  app.use(owaspProtection.createIntegrityProtection());
  app.use(owaspProtection.createSSRFProtection());

  // Prometheus metrics middleware
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path || 'unknown';
      
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
        service: 'api-gateway'
      });
      
      httpRequestDuration.observe({
        method: req.method,
        route,
        service: 'api-gateway'
      }, duration);
    });
    
    next();
  });

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(completeSpecs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DevFlow Intelligence API Documentation'
  }));

  // Apply CSRF protection to state-changing operations
  app.use(['/api'], owaspProtection.createCSRFProtection());

  // Apply access control after authentication
  app.use(owaspProtection.createAccessControlMiddleware());

  // REST API routes
  app.use('/api', restRoutes);

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

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbHealth = await databaseService.healthCheck();
      const isHealthy = dbHealth.mongodb && dbHealth.influxdb && dbHealth.redis;
      
      res.status(isHealthy ? 200 : 503).json({
        service: 'api-gateway',
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        dependencies: dbHealth
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        service: 'api-gateway',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Basic route
  app.get('/', (req, res) => {
    res.json({
      message: 'DevFlow Intelligence API Gateway',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        graphql: '/graphql',
        rest: '/api',
        documentation: '/api-docs',
        playground: process.env.NODE_ENV !== 'production' ? '/graphql' : null
      }
    });
  });

  // Start Apollo Server
  await server.start();
  
  // Apply Apollo GraphQL middleware
  server.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: false // We handle CORS above
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for GraphQL subscriptions
  const graphqlWsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  });

  // Setup GraphQL WebSocket server
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        // Extract token from connection params for WebSocket authentication
        const token = ctx.connectionParams?.authorization;
        if (token) {
          return await createAuthContext({ headers: { authorization: token } });
        }
        return {};
      },
      onConnect: async (ctx) => {
        websocketConnectionsActive.inc({ service: 'api-gateway' });
        logger.info('GraphQL WebSocket client connected', {
          connectionParams: ctx.connectionParams
        });
      },
      onDisconnect: (ctx, code, reason) => {
        websocketConnectionsActive.dec({ service: 'api-gateway' });
        logger.info('GraphQL WebSocket client disconnected', {
          code,
          reason
        });
      }
    },
    graphqlWsServer
  );

  // Create WebSocket server for real-time updates
  const realtimeWsServer = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  // Initialize WebSocket gateway
  const wsGateway = new WebSocketGateway(realtimeWsServer);

  // Start session cleanup interval
  setInterval(() => {
    owaspProtection.cleanupExpiredSessions();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Graceful shutdown implementation
  let isShuttingDown = false;
  const gracefulShutdownTimeout = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '25000');

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`${signal} received again, forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    setShuttingDown();
    logger.info(`${signal} received, starting graceful shutdown`);

    // Set a timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, gracefulShutdownTimeout);

    try {
      // Stop accepting new connections
      logger.info('Stopping server from accepting new connections');
      httpServer.close();

      // Close WebSocket connections
      logger.info('Closing WebSocket connections');
      serverCleanup.dispose();
      wsGateway.shutdown();

      // Stop Apollo Server
      logger.info('Stopping Apollo Server');
      await server.stop();

      // Close database connections
      logger.info('Closing database connections');
      await databaseService.disconnect();

      clearTimeout(forceShutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  // Start server
  httpServer.listen(PORT, () => {
    setReady();
    logger.info(`🚀 API Gateway running on port ${PORT}`);
    logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    logger.info(`🔌 GraphQL WebSocket: ws://localhost:${PORT}${server.graphqlPath}`);
    logger.info(`⚡ Real-time WebSocket: ws://localhost:${PORT}/ws`);
    logger.info(`🌐 REST API: http://localhost:${PORT}/api`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`🔒 OWASP security protections enabled`);
    
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`🎮 GraphQL Playground: http://localhost:${PORT}${server.graphqlPath}`);
    }
  });

  return { app, server, httpServer };
}

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

export { startServer };