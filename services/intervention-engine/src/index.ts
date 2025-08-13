import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import winston from 'winston';
import { InterventionEngine } from './services/InterventionEngine';
import { InterventionScheduler } from './services/InterventionScheduler';
import { EmergencyHandler } from './services/EmergencyHandler';
import { DeliveryManager } from './services/DeliveryManager';
import { EffectivenessTracker } from './services/EffectivenessTracker';
import {
  InterventionPlan,
  InterventionOutcome,
  InterventionTiming,
  EmergencySeverity
} from '@devflow/shared-types';
import {
  TimeRange,
  InterventionEngineError,
  SchedulingError,
  EmergencyError
} from './types';

// Load environment variables
config();

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
    }),
    new winston.transports.File({ 
      filename: 'logs/intervention-engine.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const interventionEngine = new InterventionEngine(logger);
const interventionScheduler = new InterventionScheduler(logger);
const emergencyHandler = new EmergencyHandler(logger);
const deliveryManager = new DeliveryManager(logger);
const effectivenessTracker = new EffectivenessTracker(logger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'intervention-engine',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Intervention management endpoints
app.post('/api/interventions/schedule', async (req, res) => {
  try {
    const { userId, intervention }: { userId: string; intervention: InterventionPlan } = req.body;
    
    if (!userId || !intervention) {
      return res.status(400).json({ error: 'userId and intervention are required' });
    }

    const result = await interventionEngine.scheduleIntervention(userId, intervention);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error scheduling intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof SchedulingError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/api/interventions/:interventionId/deliver', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await interventionEngine.deliverIntervention(userId, interventionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error delivering intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof InterventionEngineError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/api/interventions/:interventionId', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await interventionEngine.cancelIntervention(userId, interventionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error cancelling intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof InterventionEngineError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/interventions/:interventionId/reschedule', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { userId, newTiming }: { userId: string; newTiming: InterventionTiming } = req.body;
    
    if (!userId || !newTiming) {
      return res.status(400).json({ error: 'userId and newTiming are required' });
    }

    const result = await interventionEngine.rescheduleIntervention(userId, interventionId, newTiming);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error rescheduling intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof InterventionEngineError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Effectiveness tracking endpoints
app.post('/api/interventions/:interventionId/effectiveness', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { userId, outcome }: { userId: string; outcome: InterventionOutcome } = req.body;
    
    if (!userId || !outcome) {
      return res.status(400).json({ error: 'userId and outcome are required' });
    }

    await interventionEngine.trackInterventionEffectiveness(userId, interventionId, outcome);
    
    res.json({
      success: true,
      message: 'Effectiveness tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking intervention effectiveness', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/interventions/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startTime, endTime } = req.query;
    
    let timeRange: TimeRange | undefined;
    if (startTime && endTime) {
      timeRange = {
        startTime: new Date(startTime as string),
        endTime: new Date(endTime as string)
      };
    }

    const history = await interventionEngine.getInterventionHistory(userId, timeRange);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting intervention history', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/interventions/patterns', async (req, res) => {
  try {
    const { userId } = req.params;

    const patterns = await interventionEngine.analyzeInterventionPatterns(userId);
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    logger.error('Error analyzing intervention patterns', { error: error.message, stack: error.stack });
    
    if (error instanceof InterventionEngineError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Emergency intervention endpoints
app.post('/api/emergency/trigger', async (req, res) => {
  try {
    const { userId, severity }: { userId: string; severity: EmergencySeverity } = req.body;
    
    if (!userId || !severity) {
      return res.status(400).json({ error: 'userId and severity are required' });
    }

    const response = await interventionEngine.triggerEmergencyIntervention(userId, severity);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Error triggering emergency intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof EmergencyError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/api/interventions/:interventionId/escalate', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { reason }: { reason: string } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'reason is required' });
    }

    const result = await interventionEngine.escalateIntervention(interventionId, reason);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error escalating intervention', { error: error.message, stack: error.stack });
    
    if (error instanceof InterventionEngineError) {
      res.status(400).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delivery management endpoints
app.post('/api/delivery/visual', async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const result = await deliveryManager.deliverVisualIntervention(userId, content);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error delivering visual intervention', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/delivery/audio', async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const result = await deliveryManager.deliverAudioIntervention(userId, content);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error delivering audio intervention', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/delivery/haptic', async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const result = await deliveryManager.deliverHapticIntervention(userId, content);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error delivering haptic intervention', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/delivery/multi-modal', async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'userId and content are required' });
    }

    const result = await deliveryManager.deliverMultiModalIntervention(userId, content);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error delivering multi-modal intervention', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/optimal-delivery-method', async (req, res) => {
  try {
    const { userId } = req.params;
    const { context } = req.body;
    
    if (!context) {
      return res.status(400).json({ error: 'delivery context is required' });
    }

    const optimalMethod = await deliveryManager.selectOptimalDeliveryMethod(userId, context);
    
    res.json({
      success: true,
      data: { optimalMethod }
    });
  } catch (error) {
    logger.error('Error selecting optimal delivery method', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Effectiveness tracking endpoints
app.get('/api/users/:userId/effectiveness-ranking', async (req, res) => {
  try {
    const { userId } = req.params;

    const ranking = await effectivenessTracker.identifyMostEffectiveInterventions(userId);
    
    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    logger.error('Error getting effectiveness ranking', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/interventions/:interventionId/improvement-recommendations', async (req, res) => {
  try {
    const { interventionId } = req.params;

    const recommendations = await effectivenessTracker.recommendInterventionImprovements(interventionId);
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting improvement recommendations', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/interventions/:interventionId/measure-impact', async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { preState, postState } = req.body;
    
    if (!preState || !postState) {
      return res.status(400).json({ error: 'preState and postState are required' });
    }

    const impact = await effectivenessTracker.measureInterventionImpact(interventionId, preState, postState);
    
    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    logger.error('Error measuring intervention impact', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/biometric-impact/:interventionId', async (req, res) => {
  try {
    const { userId, interventionId } = req.params;

    const analysis = await effectivenessTracker.trackBiometricChanges(userId, interventionId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error tracking biometric changes', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/satisfaction/:interventionId', async (req, res) => {
  try {
    const { userId, interventionId } = req.params;

    const assessment = await effectivenessTracker.assessUserSatisfaction(userId, interventionId);
    
    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error('Error assessing user satisfaction', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scheduling optimization endpoints
app.get('/api/users/:userId/optimal-timing', async (req, res) => {
  try {
    const { userId } = req.params;
    const { intervention } = req.body;
    
    if (!intervention) {
      return res.status(400).json({ error: 'intervention plan is required' });
    }

    const optimalTiming = await interventionScheduler.findOptimalInterventionTime(userId, intervention);
    
    res.json({
      success: true,
      data: optimalTiming
    });
  } catch (error) {
    logger.error('Error finding optimal timing', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/availability', async (req, res) => {
  try {
    const { userId } = req.params;

    const availability = await interventionScheduler.analyzeUserAvailability(userId);
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Error analyzing user availability', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/receptivity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { time } = req.query;
    
    if (!time) {
      return res.status(400).json({ error: 'time parameter is required' });
    }

    const targetTime = new Date(time as string);
    const receptivity = await interventionScheduler.predictInterventionReceptivity(userId, targetTime);
    
    res.json({
      success: true,
      data: receptivity
    });
  } catch (error) {
    logger.error('Error predicting intervention receptivity', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/frequency-optimization', async (req, res) => {
  try {
    const { userId } = req.params;

    const optimization = await interventionScheduler.optimizeInterventionFrequency(userId);
    
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    logger.error('Error optimizing intervention frequency', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack, url: req.url });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Intervention Engine service started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export { interventionEngine, interventionScheduler, emergencyHandler, deliveryManager, effectivenessTracker };