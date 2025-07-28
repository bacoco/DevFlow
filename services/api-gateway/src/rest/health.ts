import { Router } from 'express';
import { databaseService } from '../services/database';

const router = Router();

// Application state tracking
let isReady = false;
let isStarted = false;
let shutdownInProgress = false;

// Set ready state (called after initialization)
export const setReady = () => { isReady = true; };
export const setStarted = () => { isStarted = true; };
export const setShuttingDown = () => { shutdownInProgress = true; };

// Basic health check (liveness probe)
router.get('/', async (req, res) => {
  const healthType = req.headers['x-health-check'] as string;
  
  if (shutdownInProgress) {
    return res.status(503).json({
      service: 'api-gateway',
      status: 'shutting-down',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const dbHealth = await databaseService.healthCheck();
    const isHealthy = dbHealth.mongodb && dbHealth.influxdb && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      service: 'api-gateway',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: dbHealth,
      checkType: healthType || 'basic'
    });
  } catch (error) {
    res.status(503).json({
      service: 'api-gateway',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checkType: healthType || 'basic'
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  if (shutdownInProgress) {
    return res.status(503).json({
      service: 'api-gateway',
      status: 'not-ready',
      reason: 'shutdown-in-progress',
      timestamp: new Date().toISOString()
    });
  }

  if (!isReady) {
    return res.status(503).json({
      service: 'api-gateway',
      status: 'not-ready',
      reason: 'initialization-incomplete',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const dbHealth = await databaseService.healthCheck();
    const isHealthy = dbHealth.mongodb && dbHealth.influxdb && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      service: 'api-gateway',
      status: isHealthy ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      dependencies: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      service: 'api-gateway',
      status: 'not-ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

// Startup probe
router.get('/startup', async (req, res) => {
  if (!isStarted) {
    return res.status(503).json({
      service: 'api-gateway',
      status: 'starting',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    service: 'api-gateway',
    status: 'started',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    
    // Check additional service health
    const serviceHealth = {
      database: dbHealth,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      state: {
        ready: isReady,
        started: isStarted,
        shuttingDown: shutdownInProgress
      }
    };

    const isHealthy = dbHealth.mongodb && dbHealth.influxdb && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      service: 'api-gateway',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      health: serviceHealth
    });
  } catch (error) {
    res.status(503).json({
      service: 'api-gateway',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

export { router as healthRoutes };