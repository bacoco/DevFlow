const express = require('express');
const app = express();
const PORT = 3004;

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({
    service: 'dashboard',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DevFlow Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: #e2e8f0; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .status { background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .healthy { border-left: 4px solid #10b981; }
            .btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 DevFlow Intelligence Dashboard</h1>
                <p>Developer Productivity Platform</p>
            </div>
            
            <div class="status healthy">
                <h3>✅ System Status: Running</h3>
                <p>All services are operational</p>
                <button class="btn" onclick="window.open('/health', '_blank')">Health Check</button>
                <button class="btn" onclick="window.open('http://localhost:3000/graphql', '_blank')">GraphQL</button>
                <button class="btn" onclick="window.open('../tests/dashboard.html', '_blank')">Test Dashboard</button>
            </div>
            
            <div class="status">
                <h3>📊 Services</h3>
                <ul>
                    <li>API Gateway: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
                    <li>Data Ingestion: <a href="http://localhost:3001" target="_blank">http://localhost:3001</a></li>
                    <li>Stream Processing: <a href="http://localhost:3002" target="_blank">http://localhost:3002</a></li>
                    <li>ML Pipeline: <a href="http://localhost:3003" target="_blank">http://localhost:3003</a></li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Dashboard running on port ${PORT}`);
});