import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuthMiddleware, requireRoleMiddleware } from '../middleware/auth';
import { UserRole } from '@devflow/shared-types';
import { grafanaRoutes } from './grafana';
import { webhookRoutes } from './webhooks';
import { exportRoutes } from './export';
import { healthRoutes } from './health';

const router = Router();

// Rate limiting middleware
const createRateLimit = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

// General API rate limit: 1000 requests per 15 minutes
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000,
  'Too many requests from this IP, please try again later'
);

// Webhook rate limit: 100 requests per minute (for external systems)
const webhookRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  100,
  'Too many webhook requests, please slow down'
);

// Export rate limit: 10 requests per minute (resource intensive)
const exportRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10,
  'Too many export requests, please wait before trying again'
);

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// Health and status routes (no auth required)
router.use('/health', healthRoutes);

// API documentation route
router.get('/', (req, res) => {
  res.json({
    name: 'DevFlow Intelligence REST API',
    version: '1.0.0',
    description: 'REST API for external integrations and data export',
    endpoints: {
      health: '/api/health',
      grafana: '/api/grafana',
      webhooks: '/api/webhooks',
      export: '/api/export'
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    rateLimit: {
      general: '1000 requests per 15 minutes',
      webhooks: '100 requests per minute',
      exports: '10 requests per minute'
    }
  });
});

// Grafana integration routes (requires authentication)
router.use('/grafana', requireAuthMiddleware, grafanaRoutes);

// Webhook routes (special rate limiting)
router.use('/webhooks', webhookRateLimit, webhookRoutes);

// Export routes (requires authentication and special rate limiting)
router.use('/export', requireAuthMiddleware, exportRateLimit, exportRoutes);

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error('REST API Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.details
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }
  
  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions for this operation'
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId: req.id || 'unknown'
  });
});

export { router as restRoutes };