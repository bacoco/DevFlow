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

// GraphQL playground
app.get('/graphql', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>GraphQL Playground</title>
        <link href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" rel="stylesheet" />
    </head>
    <body>
        <div id="root">
            <style>
                body { margin: 0; background: #1a202c; color: white; font-family: Arial, sans-serif; }
                .container { padding: 40px; text-align: center; }
                .title { font-size: 2rem; margin-bottom: 20px; color: #4299e1; }
                .subtitle { margin-bottom: 30px; color: #a0aec0; }
                .endpoint { background: #2d3748; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .code { font-family: monospace; background: #1a202c; padding: 10px; border-radius: 4px; }
            </style>
            <div class="container">
                <h1 class="title">🎮 GraphQL Playground</h1>
                <p class="subtitle">Interactive GraphQL API Explorer</p>
                
                <div class="endpoint">
                    <h3>Available Queries</h3>
                    <div class="code">
                        query HealthCheck {<br>
                        &nbsp;&nbsp;healthCheck {<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;status<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;timestamp<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;services { name status }<br>
                        &nbsp;&nbsp;}<br>
                        }
                    </div>
                </div>
                
                <div class="endpoint">
                    <h3>Try it out</h3>
                    <p>Send POST requests to <code>/graphql</code> with your queries</p>
                    <button onclick="testQuery()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Test Health Query</button>
                </div>
                
                <div id="result"></div>
            </div>
        </div>
        
        <script>
            async function testQuery() {
                try {
                    const response = await fetch('/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: \`query { healthCheck { status timestamp services { name status } } }\`
                        })
                    });
                    const result = await response.json();
                    document.getElementById('result').innerHTML = 
                        '<div class="endpoint"><h3>Result:</h3><pre>' + 
                        JSON.stringify(result, null, 2) + '</pre></div>';
                } catch (error) {
                    document.getElementById('result').innerHTML = 
                        '<div class="endpoint" style="border-left: 4px solid #e53e3e;"><h3>Error:</h3><p>' + 
                        error.message + '</p></div>';
                }
            }
        </script>
    </body>
    </html>
  `);
});

// GraphQL API endpoint
app.post('/graphql', (req, res) => {
  const { query } = req.body;
  
  // Simple GraphQL resolver
  if (query.includes('healthCheck')) {
    res.json({
      data: {
        healthCheck: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: [
            { name: 'api-gateway', status: 'healthy' },
            { name: 'data-ingestion', status: 'healthy' },
            { name: 'stream-processing', status: 'healthy' },
            { name: 'ml-pipeline', status: 'healthy' }
          ]
        }
      }
    });
  } else {
    res.json({
      errors: [{ message: 'Query not supported yet' }]
    });
  }
});

// API endpoints for the application
app.get('/api/workspace', (req, res) => {
  res.json({
    message: 'Welcome to your DevFlow workspace!',
    projects: [
      { id: 1, name: 'My First Project', status: 'active', lastModified: new Date().toISOString() },
      { id: 2, name: 'Analytics Dashboard', status: 'in-progress', lastModified: new Date().toISOString() }
    ],
    recentActivity: [
      { action: 'Project created', timestamp: new Date().toISOString() },
      { action: 'Code analysis completed', timestamp: new Date().toISOString() }
    ]
  });
});

app.get('/api/projects', (req, res) => {
  res.json({
    projects: [
      { 
        id: 1, 
        name: 'DevFlow Core', 
        description: 'Main platform development',
        status: 'active',
        progress: 75,
        team: ['Alice', 'Bob', 'Charlie'],
        lastCommit: '2 hours ago'
      },
      { 
        id: 2, 
        name: 'Analytics Engine', 
        description: 'Real-time analytics processing',
        status: 'in-progress',
        progress: 45,
        team: ['David', 'Eve'],
        lastCommit: '1 day ago'
      }
    ]
  });
});

app.get('/api/analytics', (req, res) => {
  res.json({
    metrics: {
      totalCommits: 1247,
      activeProjects: 8,
      teamMembers: 12,
      codeQuality: 92,
      testCoverage: 87,
      deploymentFrequency: '2.3/day'
    },
    trends: {
      productivity: '+15%',
      bugReduction: '+23%',
      deploymentSuccess: '98.5%'
    }
  });
});

app.get('/api/insights', (req, res) => {
  res.json({
    insights: [
      {
        type: 'performance',
        title: 'Code Review Efficiency',
        description: 'Your team\'s code review time has improved by 30% this week',
        impact: 'high',
        recommendation: 'Consider implementing automated code quality checks'
      },
      {
        type: 'quality',
        title: 'Test Coverage Opportunity',
        description: 'Project "Analytics Engine" could benefit from additional unit tests',
        impact: 'medium',
        recommendation: 'Focus on testing the data processing modules'
      }
    ]
  });
});

app.get('/api/settings', (req, res) => {
  res.json({
    user: {
      name: 'Developer',
      email: 'dev@devflow.com',
      preferences: {
        theme: 'dark',
        notifications: true,
        autoSave: true
      }
    },
    system: {
      version: '1.0.0',
      environment: 'development',
      features: ['analytics', 'insights', 'collaboration']
    }
  });
});

app.get('/api/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DevFlow API Documentation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f8f9fa; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
            .method { background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8rem; }
            code { background: #f1f3f4; padding: 2px 6px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📚 DevFlow API Documentation</h1>
            <p>Welcome to the DevFlow Intelligence Platform API documentation.</p>
            
            <h2>Available Endpoints</h2>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> /api/workspace</h3>
                <p>Get your workspace overview with projects and recent activity</p>
            </div>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> /api/projects</h3>
                <p>List all projects with details, progress, and team information</p>
            </div>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> /api/analytics</h3>
                <p>Get development metrics, trends, and performance data</p>
            </div>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> /api/insights</h3>
                <p>AI-powered insights and recommendations for your development process</p>
            </div>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> /api/settings</h3>
                <p>User preferences and system configuration</p>
            </div>
            
            <div class="endpoint">
                <h3><span class="method">POST</span> /graphql</h3>
                <p>GraphQL endpoint for flexible data queries</p>
                <p>Example query: <code>{ healthCheck { status timestamp } }</code></p>
            </div>
            
            <h2>Authentication</h2>
            <p>Currently in development mode - no authentication required.</p>
            
            <h2>Rate Limiting</h2>
            <p>No rate limiting in development mode.</p>
        </div>
    </body>
    </html>
  `);
});

// Main application page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>DevFlow Intelligence Platform</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .app-container { 
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                max-width: 800px;
                width: 90%;
                text-align: center;
            }
            .logo { 
                font-size: 4rem; 
                margin-bottom: 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .title { 
                font-size: 2.5rem; 
                color: #2d3748; 
                margin-bottom: 10px;
                font-weight: 700;
            }
            .subtitle { 
                font-size: 1.2rem; 
                color: #718096; 
                margin-bottom: 40px;
            }
            .features-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 20px; 
                margin-bottom: 40px; 
            }
            .feature-card { 
                background: linear-gradient(135deg, #f7fafc, #edf2f7);
                border-radius: 15px; 
                padding: 25px; 
                border: 1px solid #e2e8f0;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .feature-card:hover { 
                transform: translateY(-5px); 
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .feature-icon { font-size: 2.5rem; margin-bottom: 15px; }
            .feature-title { font-size: 1.1rem; font-weight: 600; color: #2d3748; margin-bottom: 10px; }
            .feature-desc { font-size: 0.9rem; color: #718096; }
            
            .actions { margin-top: 40px; }
            .btn { 
                display: inline-block;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white; 
                padding: 15px 30px; 
                border: none; 
                border-radius: 50px; 
                cursor: pointer; 
                margin: 10px; 
                font-size: 1rem;
                font-weight: 600;
                text-decoration: none;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .btn:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
            }
            .btn.secondary { 
                background: linear-gradient(135deg, #48bb78, #38a169);
                box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
            }
            .btn.secondary:hover { 
                box-shadow: 0 8px 25px rgba(72, 187, 120, 0.6);
            }
            .btn.outline { 
                background: transparent;
                border: 2px solid #667eea;
                color: #667eea;
                box-shadow: none;
            }
            .btn.outline:hover { 
                background: #667eea;
                color: white;
            }
            
            .stats { 
                display: flex; 
                justify-content: space-around; 
                margin: 30px 0;
                padding: 20px;
                background: linear-gradient(135deg, #f7fafc, #edf2f7);
                border-radius: 15px;
            }
            .stat { text-align: center; }
            .stat-number { font-size: 2rem; font-weight: bold; color: #667eea; }
            .stat-label { font-size: 0.9rem; color: #718096; }
            
            .quick-links { 
                margin-top: 30px; 
                padding-top: 30px; 
                border-top: 1px solid #e2e8f0;
            }
            .quick-links h3 { color: #2d3748; margin-bottom: 15px; }
            .link-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
                gap: 10px; 
            }
            .quick-link { 
                padding: 10px 15px; 
                background: #f7fafc; 
                border-radius: 8px; 
                text-decoration: none; 
                color: #4a5568; 
                transition: background 0.3s ease;
                font-size: 0.9rem;
            }
            .quick-link:hover { background: #edf2f7; }
        </style>
    </head>
    <body>
        <div class="app-container">
            <div class="logo">🚀</div>
            <h1 class="title">DevFlow Intelligence Platform</h1>
            <p class="subtitle">Accelerate your development workflow with AI-powered insights</p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number" id="activeServices">4</div>
                    <div class="stat-label">Active Services</div>
                </div>
                <div class="stat">
                    <div class="stat-number" id="systemHealth">100%</div>
                    <div class="stat-label">System Health</div>
                </div>
                <div class="stat">
                    <div class="stat-number" id="uptime">--</div>
                    <div class="stat-label">Uptime</div>
                </div>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <div class="feature-title">Real-time Analytics</div>
                    <div class="feature-desc">Monitor your development metrics and performance in real-time</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-title">AI-Powered Insights</div>
                    <div class="feature-desc">Get intelligent recommendations to optimize your workflow</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔄</div>
                    <div class="feature-title">Stream Processing</div>
                    <div class="feature-desc">Process and analyze development data streams efficiently</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📈</div>
                    <div class="feature-title">Performance Tracking</div>
                    <div class="feature-desc">Track and improve your development team's productivity</div>
                </div>
            </div>
            
            <div class="actions">
                <a href="/api/workspace" class="btn">🏗️ Start Building</a>
                <a href="http://localhost:3010" class="btn secondary">📊 View Dashboard</a>
                <a href="/graphql" class="btn outline">🎮 GraphQL Playground</a>
            </div>
            
            <div class="quick-links">
                <h3>Quick Access</h3>
                <div class="link-grid">
                    <a href="/api/projects" class="quick-link">📁 Projects</a>
                    <a href="/api/analytics" class="quick-link">📈 Analytics</a>
                    <a href="/api/insights" class="quick-link">💡 Insights</a>
                    <a href="/api/settings" class="quick-link">⚙️ Settings</a>
                    <a href="/health" class="quick-link">🏥 Health Check</a>
                    <a href="/api/docs" class="quick-link">📚 API Docs</a>
                </div>
            </div>
        </div>

        <script>
            // Load system stats
            async function loadStats() {
                try {
                    const response = await fetch('http://localhost:3010/api/status');
                    const data = await response.json();
                    
                    const healthyServices = data.services.filter(s => s.status === 'healthy').length;
                    const totalServices = data.services.length;
                    const healthPercentage = Math.round((healthyServices / totalServices) * 100);
                    
                    document.getElementById('activeServices').textContent = healthyServices + '/' + totalServices;
                    document.getElementById('systemHealth').textContent = healthPercentage + '%';
                    document.getElementById('uptime').textContent = formatUptime(data.uptime);
                } catch (error) {
                    console.log('Could not load stats from dashboard');
                }
            }
            
            function formatUptime(ms) {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                if (days > 0) return days + 'd';
                if (hours > 0) return hours + 'h';
                if (minutes > 0) return minutes + 'm';
                return seconds + 's';
            }
            
            // Load stats on page load
            loadStats();
            
            // Refresh stats every 30 seconds
            setInterval(loadStats, 30000);
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});