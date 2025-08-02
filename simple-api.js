const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GraphQL mock
app.post('/graphql', (req, res) => {
  res.json({
    data: {
      healthCheck: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: [{ name: 'api-gateway', status: 'healthy' }]
      }
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow API Gateway - Running!',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});