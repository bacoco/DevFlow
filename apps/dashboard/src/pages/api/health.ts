// Health check endpoint for production monitoring

import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  services: {
    database: 'healthy' | 'unhealthy';
    websocket: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
  };
  performance: {
    responseTime: number;
    averageResponseTime: number;
  };
}

// Store for tracking metrics
let healthMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  totalResponseTime: 0,
  lastChecks: {
    database: Date.now(),
    websocket: Date.now(),
    cache: Date.now(),
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  const startTime = Date.now();
  
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        services: { database: 'unhealthy', websocket: 'unhealthy', cache: 'unhealthy' },
        performance: { responseTime: 0, averageResponseTime: 0 },
      });
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Calculate uptime
    const uptime = Date.now() - healthMetrics.startTime;

    // Check service health (simplified checks)
    const services = {
      database: await checkDatabaseHealth(),
      websocket: await checkWebSocketHealth(),
      cache: await checkCacheHealth(),
    };

    // Calculate response time
    const responseTime = Date.now() - startTime;
    healthMetrics.requestCount++;
    healthMetrics.totalResponseTime += responseTime;
    const averageResponseTime = healthMetrics.totalResponseTime / healthMetrics.requestCount;

    // Determine overall health status
    const isHealthy = Object.values(services).every(status => status === 'healthy') &&
                     memoryPercentage < 90 &&
                     responseTime < 1000;

    const healthResponse: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round(memoryPercentage * 100) / 100,
      },
      services,
      performance: {
        responseTime,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      },
    };

    // Set appropriate status code
    const statusCode = isHealthy ? 200 : 503;
    
    // Set cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(statusCode).json(healthResponse);

  } catch (error) {
    console.error('Health check failed:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - healthMetrics.startTime,
      memory: { used: 0, total: 0, percentage: 0 },
      services: { database: 'unhealthy', websocket: 'unhealthy', cache: 'unhealthy' },
      performance: { responseTime: Date.now() - startTime, averageResponseTime: 0 },
    });
  }
}

// Service health check functions
async function checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // In a real application, you would check your database connection
    // For now, we'll simulate a health check
    const now = Date.now();
    const lastCheck = healthMetrics.lastChecks.database;
    
    // Simulate occasional database issues
    if (now - lastCheck > 60000) { // Check every minute
      healthMetrics.lastChecks.database = now;
      // 95% success rate
      return Math.random() > 0.05 ? 'healthy' : 'unhealthy';
    }
    
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

async function checkWebSocketHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // In a real application, you would check your WebSocket server
    const now = Date.now();
    const lastCheck = healthMetrics.lastChecks.websocket;
    
    if (now - lastCheck > 30000) { // Check every 30 seconds
      healthMetrics.lastChecks.websocket = now;
      // 98% success rate
      return Math.random() > 0.02 ? 'healthy' : 'unhealthy';
    }
    
    return 'healthy';
  } catch (error) {
    console.error('WebSocket health check failed:', error);
    return 'unhealthy';
  }
}

async function checkCacheHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // In a real application, you would check your cache (Redis, etc.)
    const now = Date.now();
    const lastCheck = healthMetrics.lastChecks.cache;
    
    if (now - lastCheck > 45000) { // Check every 45 seconds
      healthMetrics.lastChecks.cache = now;
      // 97% success rate
      return Math.random() > 0.03 ? 'healthy' : 'unhealthy';
    }
    
    return 'healthy';
  } catch (error) {
    console.error('Cache health check failed:', error);
    return 'unhealthy';
  }
}