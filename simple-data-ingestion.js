const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'data-ingestion',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/events', (req, res) => {
  console.log('Received event:', req.body);
  res.json({ success: true, message: 'Event processed' });
});

app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Data Ingestion Service - Running!',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Data Ingestion running on port ${PORT}`);
});