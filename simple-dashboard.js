const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3010;

app.use(express.json());
app.use(express.static('public'));

// Store metrics in memory (in production, use Redis or database)
let systemMetrics = {
  uptime: Date.now(),
  requests: 0,
  errors: 0,
  services: {},
  history: []
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'dashboard',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - systemMetrics.uptime
  });
});

// API endpoint to get system status
app.get('/api/status', async (req, res) => {
  try {
    const services = [
      { name: 'API Gateway', url: 'http://localhost:3000/health', port: 3000 },
      { name: 'Data Ingestion', url: 'http://localhost:3001/health', port: 3001 },
      { name: 'Stream Processing', url: 'http://localhost:3002/health', port: 3002 },
      { name: 'ML Pipeline', url: 'http://localhost:3003/health', port: 3003 }
    ];

    const serviceStatus = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const start = Date.now();
          const response = await axios.get(service.url, { timeout: 5000 });
          const responseTime = Date.now() - start;
          return {
            name: service.name,
            status: 'healthy',
            responseTime,
            port: service.port,
            lastCheck: new Date().toISOString()
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unhealthy',
            error: error.message,
            port: service.port,
            lastCheck: new Date().toISOString()
          };
        }
      })
    );

    const results = serviceStatus.map(result => result.value || result.reason);
    
    // Update metrics
    systemMetrics.services = results.reduce((acc, service) => {
      acc[service.name] = service;
      return acc;
    }, {});

    res.json({
      timestamp: new Date().toISOString(),
      uptime: Date.now() - systemMetrics.uptime,
      services: results,
      totalRequests: systemMetrics.requests,
      totalErrors: systemMetrics.errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get test results
app.get('/api/tests', (req, res) => {
  try {
    const testResultsPath = path.join(__dirname, 'tests', 'test-results.json');
    if (fs.existsSync(testResultsPath)) {
      const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      res.json(testResults);
    } else {
      res.json({ message: 'No test results available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to run tests
app.post('/api/run-tests', (req, res) => {
  const { spawn } = require('child_process');
  
  const testProcess = spawn('node', ['tests/final-application-test.js'], {
    cwd: __dirname
  });

  let output = '';
  testProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  testProcess.stderr.on('data', (data) => {
    output += data.toString();
  });

  testProcess.on('close', (code) => {
    res.json({
      success: code === 0,
      output: output,
      timestamp: new Date().toISOString()
    });
  });
});

// Main dashboard page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DevFlow Intelligence Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: #0f172a; 
                color: #e2e8f0; 
                line-height: 1.6; 
            }
            .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                background: linear-gradient(135deg, #1e293b, #334155);
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header h1 { color: #3b82f6; margin-bottom: 10px; font-size: 2.5rem; }
            .header p { color: #94a3b8; font-size: 1.1rem; }
            
            .metrics-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 20px; 
                margin-bottom: 30px; 
            }
            
            .metric-card { 
                background: linear-gradient(135deg, #1e293b, #334155); 
                border-radius: 12px; 
                padding: 25px; 
                border-left: 4px solid #3b82f6;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease;
            }
            .metric-card:hover { transform: translateY(-2px); }
            .metric-card.healthy { border-left-color: #10b981; }
            .metric-card.warning { border-left-color: #f59e0b; }
            .metric-card.error { border-left-color: #ef4444; }
            
            .metric-card h3 { margin-bottom: 15px; color: #f1f5f9; font-size: 1.2rem; }
            .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 10px; }
            .metric-value.healthy { color: #10b981; }
            .metric-value.warning { color: #f59e0b; }
            .metric-value.error { color: #ef4444; }
            .metric-label { color: #94a3b8; font-size: 0.9rem; }
            
            .services-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
                gap: 20px; 
                margin-bottom: 30px; 
            }
            
            .service-card { 
                background: linear-gradient(135deg, #1e293b, #334155); 
                border-radius: 12px; 
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .service-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 15px; 
            }
            .service-name { font-weight: bold; font-size: 1.1rem; }
            .status-indicator { 
                padding: 4px 12px; 
                border-radius: 20px; 
                font-size: 0.8rem; 
                font-weight: bold; 
            }
            .status-healthy { background: #10b981; color: white; }
            .status-unhealthy { background: #ef4444; color: white; }
            
            .service-details { color: #94a3b8; font-size: 0.9rem; }
            .service-details div { margin-bottom: 5px; }
            
            .controls { 
                background: linear-gradient(135deg, #1e293b, #334155); 
                border-radius: 12px; 
                padding: 25px; 
                margin-bottom: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .controls h3 { margin-bottom: 20px; color: #f1f5f9; }
            
            .btn { 
                background: #3b82f6; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                margin: 5px; 
                font-size: 0.9rem;
                transition: background 0.2s ease;
            }
            .btn:hover { background: #2563eb; }
            .btn.success { background: #10b981; }
            .btn.success:hover { background: #059669; }
            .btn.warning { background: #f59e0b; }
            .btn.warning:hover { background: #d97706; }
            
            .logs { 
                background: linear-gradient(135deg, #1e293b, #334155); 
                border-radius: 12px; 
                padding: 25px; 
                max-height: 400px; 
                overflow-y: auto;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .logs h3 { margin-bottom: 20px; color: #f1f5f9; }
            .log-entry { 
                font-family: 'Monaco', 'Menlo', monospace; 
                font-size: 0.85rem; 
                margin-bottom: 8px; 
                padding: 8px 12px; 
                background: #0f172a; 
                border-radius: 6px; 
                border-left: 3px solid #64748b;
            }
            .log-entry.success { border-left-color: #10b981; }
            .log-entry.error { border-left-color: #ef4444; }
            .log-entry.warning { border-left-color: #f59e0b; }
            
            .loading { 
                display: inline-block; 
                width: 20px; 
                height: 20px; 
                border: 3px solid #64748b; 
                border-radius: 50%; 
                border-top-color: #3b82f6; 
                animation: spin 1s ease-in-out infinite; 
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .timestamp { color: #64748b; font-size: 0.8rem; margin-top: 20px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 DevFlow Intelligence Dashboard</h1>
                <p>Real-time Developer Productivity Platform Monitoring</p>
                <div class="timestamp" id="lastUpdate">Loading...</div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card" id="systemHealth">
                    <h3>System Health</h3>
                    <div class="metric-value" id="healthScore">--</div>
                    <div class="metric-label">Overall Status</div>
                </div>
                <div class="metric-card">
                    <h3>Uptime</h3>
                    <div class="metric-value" id="uptime">--</div>
                    <div class="metric-label">System Running</div>
                </div>
                <div class="metric-card">
                    <h3>Active Services</h3>
                    <div class="metric-value" id="activeServices">--</div>
                    <div class="metric-label">Out of 4 Total</div>
                </div>
                <div class="metric-card">
                    <h3>Response Time</h3>
                    <div class="metric-value" id="avgResponseTime">--</div>
                    <div class="metric-label">Average (ms)</div>
                </div>
            </div>
            
            <div class="services-grid" id="servicesGrid">
                <!-- Services will be populated here -->
            </div>
            
            <div class="controls">
                <h3>🔧 System Controls</h3>
                <button class="btn success" onclick="refreshData()">🔄 Refresh Status</button>
                <button class="btn" onclick="runTests()">🧪 Run Tests</button>
                <button class="btn" onclick="window.open('http://localhost:3000/graphql', '_blank')">🎮 GraphQL Playground</button>
                <button class="btn warning" onclick="window.open('http://localhost:3000', '_blank')">🌐 API Gateway</button>
            </div>
            
            <div class="logs">
                <h3>📋 System Activity</h3>
                <div id="logEntries">
                    <div class="log-entry">Dashboard initialized - waiting for data...</div>
                </div>
            </div>
        </div>

        <script>
            let refreshInterval;
            
            async function refreshData() {
                try {
                    const response = await fetch('/api/status');
                    const data = await response.json();
                    updateDashboard(data);
                    addLogEntry('✅ Status refreshed successfully', 'success');
                } catch (error) {
                    addLogEntry('❌ Failed to refresh status: ' + error.message, 'error');
                }
            }
            
            function updateDashboard(data) {
                // Update metrics
                const healthyServices = data.services.filter(s => s.status === 'healthy').length;
                const totalServices = data.services.length;
                const healthPercentage = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;
                
                document.getElementById('healthScore').textContent = healthPercentage + '%';
                document.getElementById('healthScore').className = 'metric-value ' + getHealthClass(healthPercentage);
                document.getElementById('systemHealth').className = 'metric-card ' + getHealthClass(healthPercentage);
                
                document.getElementById('uptime').textContent = formatUptime(data.uptime);
                document.getElementById('activeServices').textContent = healthyServices + '/' + totalServices;
                
                const avgResponseTime = data.services
                    .filter(s => s.responseTime)
                    .reduce((sum, s) => sum + s.responseTime, 0) / healthyServices || 0;
                document.getElementById('avgResponseTime').textContent = Math.round(avgResponseTime) + 'ms';
                
                // Update services
                updateServices(data.services);
                
                document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
            }
            
            function updateServices(services) {
                const grid = document.getElementById('servicesGrid');
                grid.innerHTML = '';
                
                services.forEach(service => {
                    const card = document.createElement('div');
                    card.className = 'service-card';
                    card.innerHTML = \`
                        <div class="service-header">
                            <div class="service-name">\${service.name}</div>
                            <div class="status-indicator status-\${service.status}">\${service.status.toUpperCase()}</div>
                        </div>
                        <div class="service-details">
                            <div>Port: \${service.port}</div>
                            \${service.responseTime ? \`<div>Response Time: \${service.responseTime}ms</div>\` : ''}
                            <div>Last Check: \${new Date(service.lastCheck).toLocaleTimeString()}</div>
                            \${service.error ? \`<div style="color: #ef4444;">Error: \${service.error}</div>\` : ''}
                        </div>
                    \`;
                    grid.appendChild(card);
                });
            }
            
            async function runTests() {
                addLogEntry('🧪 Running comprehensive tests...', 'warning');
                try {
                    const response = await fetch('/api/run-tests', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        addLogEntry('✅ Tests completed successfully', 'success');
                    } else {
                        addLogEntry('❌ Tests failed - check console for details', 'error');
                    }
                    console.log('Test output:', result.output);
                } catch (error) {
                    addLogEntry('❌ Failed to run tests: ' + error.message, 'error');
                }
            }
            
            function addLogEntry(message, type = '') {
                const container = document.getElementById('logEntries');
                const entry = document.createElement('div');
                entry.className = 'log-entry ' + type;
                entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
                container.insertBefore(entry, container.firstChild);
                
                // Keep only last 20 entries
                while (container.children.length > 20) {
                    container.removeChild(container.lastChild);
                }
            }
            
            function getHealthClass(percentage) {
                if (percentage >= 90) return 'healthy';
                if (percentage >= 70) return 'warning';
                return 'error';
            }
            
            function formatUptime(ms) {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                if (days > 0) return days + 'd ' + (hours % 24) + 'h';
                if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
                if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
                return seconds + 's';
            }
            
            // Auto-refresh every 10 seconds
            refreshInterval = setInterval(refreshData, 10000);
            
            // Initial load
            refreshData();
            addLogEntry('🚀 Dashboard loaded successfully', 'success');
        </script>
    </body>
    </html>
  `);
});

// Middleware to count requests
app.use((req, res, next) => {
  systemMetrics.requests++;
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 DevFlow Intelligence Dashboard running on port ${PORT}`);
  console.log(`📊 Access dashboard at: http://localhost:${PORT}`);
});