const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'stream-processing',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Stream Processing Service - Running!',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Stream Processing running on port ${PORT}`);
});