const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'devflow-app', status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>DevFlow - Developer Platform</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #fff; }
        .header { background: #2a2a2a; padding: 20px; border-bottom: 1px solid #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .title { font-size: 2rem; margin-bottom: 10px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #2a2a2a; padding: 20px; border-radius: 8px; border: 1px solid #333; }
        .card h3 { margin-bottom: 15px; color: #4a9eff; }
        .btn { background: #4a9eff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #357abd; }
        .status { padding: 10px; background: #1a4d1a; border-radius: 5px; margin: 10px 0; }
        .projects { list-style: none; }
        .projects li { padding: 10px; background: #333; margin: 5px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1 class="title">🚀 DevFlow Platform</h1>
            <p class="subtitle">Developer Productivity & Analytics</p>
        </div>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="card">
                <h3>📊 Quick Stats</h3>
                <div class="status">System Status: Online</div>
                <div>Active Projects: <strong>3</strong></div>
                <div>Team Members: <strong>5</strong></div>
                <div>Code Quality: <strong>92%</strong></div>
            </div>
            
            <div class="card">
                <h3>🏗️ Recent Projects</h3>
                <ul class="projects">
                    <li>DevFlow Core - Active</li>
                    <li>Analytics Engine - In Progress</li>
                    <li>API Gateway - Completed</li>
                </ul>
                <a href="/projects" class="btn">View All Projects</a>
            </div>
            
            <div class="card">
                <h3>⚡ Quick Actions</h3>
                <a href="/create-project" class="btn">New Project</a>
                <a href="/analytics" class="btn">View Analytics</a>
                <a href="http://localhost:3010" class="btn">System Dashboard</a>
                <a href="/graphql" class="btn">GraphQL API</a>
            </div>
            
            <div class="card">
                <h3>📈 Performance</h3>
                <div>Deployment Success: <strong>98.5%</strong></div>
                <div>Average Build Time: <strong>2.3 min</strong></div>
                <div>Test Coverage: <strong>87%</strong></div>
                <div>Bug Resolution: <strong>1.2 days</strong></div>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

app.get('/projects', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Projects - DevFlow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #fff; }
        .header { background: #2a2a2a; padding: 20px; border-bottom: 1px solid #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .btn { background: #4a9eff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .project { background: #2a2a2a; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #333; }
        .project h3 { color: #4a9eff; margin-bottom: 10px; }
        .status { padding: 5px 10px; border-radius: 15px; font-size: 0.8rem; }
        .active { background: #1a4d1a; }
        .progress { background: #4d4d1a; }
        .completed { background: #1a1a4d; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📁 Projects</h1>
            <a href="/" class="btn">← Back to Dashboard</a>
        </div>
    </div>
    
    <div class="container">
        <div class="project">
            <h3>DevFlow Core Platform</h3>
            <span class="status active">Active</span>
            <p>Main development platform with real-time analytics and AI insights.</p>
            <p><strong>Team:</strong> Alice, Bob, Charlie | <strong>Progress:</strong> 75%</p>
        </div>
        
        <div class="project">
            <h3>Analytics Engine</h3>
            <span class="status progress">In Progress</span>
            <p>Real-time data processing and visualization engine.</p>
            <p><strong>Team:</strong> David, Eve | <strong>Progress:</strong> 45%</p>
        </div>
        
        <div class="project">
            <h3>API Gateway</h3>
            <span class="status completed">Completed</span>
            <p>Centralized API management and routing system.</p>
            <p><strong>Team:</strong> Frank, Grace | <strong>Progress:</strong> 100%</p>
        </div>
    </div>
</body>
</html>
  `);
});

app.get('/analytics', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Analytics - DevFlow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #fff; }
        .header { background: #2a2a2a; padding: 20px; border-bottom: 1px solid #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .btn { background: #4a9eff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric { background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; color: #4a9eff; }
        .chart { background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0; height: 200px; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📈 Analytics Dashboard</h1>
            <a href="/" class="btn">← Back to Dashboard</a>
        </div>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="metric">
                <div class="metric-value">1,247</div>
                <div>Total Commits</div>
            </div>
            <div class="metric">
                <div class="metric-value">92%</div>
                <div>Code Quality</div>
            </div>
            <div class="metric">
                <div class="metric-value">87%</div>
                <div>Test Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">2.3/day</div>
                <div>Deployments</div>
            </div>
        </div>
        
        <div class="chart">
            📊 Performance trends chart would go here
        </div>
        
        <div class="chart">
            📈 Code quality metrics over time
        </div>
    </div>
</body>
</html>
  `);
});

app.get('/graphql', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>GraphQL - DevFlow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #fff; }
        .header { background: #2a2a2a; padding: 20px; border-bottom: 1px solid #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .btn { background: #4a9eff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .query-box { background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0; }
        textarea { width: 100%; height: 200px; background: #1a1a1a; color: #fff; border: 1px solid #333; padding: 10px; border-radius: 5px; }
        .result { background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🎮 GraphQL Playground</h1>
            <a href="/" class="btn">← Back to Dashboard</a>
        </div>
    </div>
    
    <div class="container">
        <div class="query-box">
            <h3>Try a Query:</h3>
            <textarea id="query">query {
  healthCheck {
    status
    timestamp
    services {
      name
      status
    }
  }
}</textarea>
            <button class="btn" onclick="runQuery()">Run Query</button>
        </div>
        
        <div class="result">
            <h3>Result:</h3>
            <pre id="result">Click "Run Query" to see results</pre>
        </div>
    </div>
    
    <script>
        async function runQuery() {
            const query = document.getElementById('query').value;
            try {
                const response = await fetch('/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const result = await response.json();
                document.getElementById('result').textContent = JSON.stringify(result, null, 2);
            } catch (error) {
                document.getElementById('result').textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
  `);
});

app.post('/graphql', (req, res) => {
  const { query } = req.body;
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
    res.json({ errors: [{ message: 'Query not supported' }] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DevFlow App running on port ${PORT}`);
});