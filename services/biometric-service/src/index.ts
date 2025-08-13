import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { BiometricServiceImpl } from './services/BiometricService';
import { createLogger } from './utils/logger';
import { BiometricServiceError, DeviceConnectionError, DataValidationError, PrivacyViolationError } from './types';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3007;
const logger = createLogger('BiometricServiceApp');

// Initialize biometric service
const biometricService = new BiometricServiceImpl();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3010',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'biometric-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ============================================================================
// DEVICE MANAGEMENT ENDPOINTS
// ============================================================================

app.post('/api/devices/connect', async (req, res) => {
  try {
    const { userId, deviceType, credentials } = req.body;
    
    if (!userId || !deviceType || !credentials) {
      return res.status(400).json({
        error: 'Missing required fields: userId, deviceType, credentials'
      });
    }

    const result = await biometricService.connectDevice(userId, deviceType, credentials);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Device connection failed', { error });
    
    if (error instanceof DeviceConnectionError) {
      res.status(400).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

app.delete('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required query parameter: userId'
      });
    }

    await biometricService.disconnectDevice(userId as string, deviceId);
    
    res.json({
      success: true,
      message: 'Device disconnected successfully'
    });
  } catch (error) {
    logger.error('Device disconnection failed', { error });
    
    if (error instanceof DeviceConnectionError) {
      res.status(400).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required query parameter: userId'
      });
    }

    const devices = await biometricService.getConnectedDevices(userId as string);
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    logger.error('Failed to get connected devices', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.post('/api/devices/:deviceId/sync', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    await biometricService.syncDeviceData(userId, deviceId);
    
    res.json({
      success: true,
      message: 'Device data synchronized successfully'
    });
  } catch (error) {
    logger.error('Device sync failed', { error });
    
    if (error instanceof DeviceConnectionError) {
      res.status(400).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

// ============================================================================
// DATA COLLECTION ENDPOINTS
// ============================================================================

app.get('/api/biometric-data', async (req, res) => {
  try {
    const { userId, startTime, endTime } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required query parameter: userId'
      });
    }

    const timeRange = {
      startTime: startTime ? new Date(startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime: endTime ? new Date(endTime as string) : new Date()
    };

    const data = await biometricService.collectBiometricData(userId as string, timeRange);
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    logger.error('Failed to collect biometric data', { error });
    
    if (error instanceof PrivacyViolationError) {
      res.status(403).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

app.get('/api/biometric-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await biometricService.getBiometricProfile(userId);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Failed to get biometric profile', { error });
    
    if (error instanceof BiometricServiceError && error.code === 'PROFILE_NOT_FOUND') {
      res.status(404).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

app.put('/api/biometric-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileUpdate = req.body;
    
    const updatedProfile = await biometricService.updateBiometricProfile(userId, profileUpdate);
    
    res.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    logger.error('Failed to update biometric profile', { error });
    
    if (error instanceof BiometricServiceError && error.code === 'PROFILE_NOT_FOUND') {
      res.status(404).json({
        error: error.message,
        code: error.code
      });
    } else if (error instanceof DataValidationError) {
      res.status(400).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

// ============================================================================
// HEALTH METRICS ENDPOINTS
// ============================================================================

app.get('/api/metrics/stress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stressMetrics = await biometricService.calculateStressLevel(userId);
    
    res.json({
      success: true,
      data: stressMetrics
    });
  } catch (error) {
    logger.error('Failed to calculate stress level', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/api/metrics/fatigue/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const fatigueIndicators = await biometricService.detectFatigue(userId);
    
    res.json({
      success: true,
      data: fatigueIndicators
    });
  } catch (error) {
    logger.error('Failed to detect fatigue', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/api/metrics/wellness/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const wellnessScore = await biometricService.assessWellnessScore(userId);
    
    res.json({
      success: true,
      data: wellnessScore
    });
  } catch (error) {
    logger.error('Failed to assess wellness score', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/api/metrics/hrv/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const hrvAnalysis = await biometricService.analyzeHeartRateVariability(userId);
    
    res.json({
      success: true,
      data: hrvAnalysis
    });
  } catch (error) {
    logger.error('Failed to analyze HRV', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// WEBSOCKET ENDPOINT FOR REAL-TIME DATA
// ============================================================================

app.get('/api/stream/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Subscribe to biometric data stream
    const subscription = biometricService.streamBiometricData(userId).subscribe({
      next: (reading) => {
        res.write(`data: ${JSON.stringify(reading)}\n\n`);
      },
      error: (error) => {
        logger.error('Stream error', { userId, error });
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      subscription.unsubscribe();
      logger.info('Client disconnected from stream', { userId });
    });

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date() })}\n\n`);
    
  } catch (error) {
    logger.error('Failed to create stream', { error });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error, url: req.url, method: req.method });
  
  if (error instanceof BiometricServiceError) {
    res.status(400).json({
      error: error.message,
      code: error.code
    });
  } else {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(port, () => {
  logger.info(`Biometric Service started on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    port
  });
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

export default app;