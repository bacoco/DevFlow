import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic GraphQL endpoint (mock)
app.post('/graphql', (req, res) => {
  res.json({
    data: {
      healthCheck: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: [
          { name: 'api-gateway', status: 'healthy' }
        ]
      }
    }
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Intelligence API Gateway (Simple Mode)',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      graphql: '/graphql'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway (Simple) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 GraphQL: http://localhost:${PORT}/graphql`);
});

export default app;