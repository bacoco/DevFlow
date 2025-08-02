const express = require('express');
const app = express();
const PORT = 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'ml-pipeline',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow ML Pipeline Service - Running!',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ML Pipeline running on port ${PORT}`);
});