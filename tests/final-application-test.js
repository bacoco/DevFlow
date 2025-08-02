#!/usr/bin/env node

/**
 * DevFlow Intelligence Platform - Global Test Runner with Auto-Fix
 * Comprehensive integration test with continuous monitoring and bug fixing
 */

const http = require('http');
const https = require('https');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class DevFlowTester extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      autoFix: options.autoFix !== false,
      continuous: options.continuous || false,
      interval: options.interval || 30000,
      quiet: options.quiet || false,
      retryCount: options.retryCount || 3,
      ...options
    };
    
    this.services = [
      { name: 'API Gateway', url: 'http://localhost:3000/health', port: 3000, critical: true },
      { name: 'Data Ingestion', url: 'http://localhost:3001/health', port: 3001, critical: true },
      { name: 'Stream Processing', url: 'http://localhost:3002/health', port: 3002, critical: false },
      { name: 'ML Pipeline', url: 'http://localhost:3003/health', port: 3003, critical: false },
      { name: 'Dashboard', url: 'http://localhost:3004', port: 3004, critical: true }
    ];
    
    this.infrastructure = [
      { name: 'MongoDB', port: 27017, critical: true },
      { name: 'InfluxDB', port: 8086, critical: false },
      { name: 'Redis', port: 6379, critical: true },
      { name: 'Kafka', port: 9092, critical: true },
      { name: 'Zookeeper', port: 2181, critical: true }
    ];
    
    this.results = {
      infrastructure: {},
      services: {},
      integration: {},
      errors: [],
      fixes: [],
      timestamp: new Date().toISOString(),
      runCount: 0
    };
    
    this.isRunning = false;
    this.fixAttempts = new Map();
  }

  async runTests() {
    if (!this.options.quiet) {
      console.log('🚀 DevFlow Intelligence Platform - Global Test Runner');
      console.log('=' .repeat(60));
    }
    
    this.results.runCount++;
    this.results.timestamp = new Date().toISOString();
    
    try {
      await this.testInfrastructure();
      await this.testServices();
      await this.testIntegration();
      
      const success = await this.generateReport();
      
      if (this.options.continuous && !this.isRunning) {
        this.startContinuousMonitoring();
      }
      
      return success;
    } catch (error) {
      if (!this.options.quiet) {
        console.error('❌ Test execution failed:', error.message);
      }
      this.results.errors.push(error.message);
      
      if (this.options.autoFix) {
        await this.attemptAutoFix(error);
      }
      
      return false;
    }
  }

  startContinuousMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`🔄 Starting continuous monitoring (interval: ${this.options.interval}ms)`);
    
    this.monitorInterval = setInterval(async () => {
      if (!this.options.quiet) {
        console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running scheduled health check...`);
      }
      
      const success = await this.runTests();
      this.emit('healthCheck', { success, results: this.results });
      
      if (!success && this.options.autoFix) {
        await this.attemptSystemRecovery();
      }
    }, this.options.interval);
  }

  stopContinuousMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.isRunning = false;
      console.log('🛑 Continuous monitoring stopped');
    }
  }

  async testInfrastructure() {
    console.log('\n📊 Testing Infrastructure Services...');
    
    for (const service of this.infrastructure) {
      try {
        const isRunning = await this.checkPort(service.port);
        this.results.infrastructure[service.name] = {
          status: isRunning ? 'RUNNING' : 'DOWN',
          port: service.port
        };
        
        console.log(`  ${isRunning ? '✅' : '❌'} ${service.name} (port ${service.port})`);
      } catch (error) {
        this.results.infrastructure[service.name] = {
          status: 'ERROR',
          error: error.message
        };
        console.log(`  ❌ ${service.name} - ${error.message}`);
      }
    }
  }

  async testServices() {
    console.log('\n🔧 Testing Application Services...');
    
    for (const service of this.services) {
      try {
        const response = await this.makeRequest(service.url);
        this.results.services[service.name] = {
          status: response.status < 400 ? 'HEALTHY' : 'UNHEALTHY',
          statusCode: response.status,
          responseTime: response.responseTime
        };
        
        console.log(`  ${response.status < 400 ? '✅' : '❌'} ${service.name} (${response.status}) - ${response.responseTime}ms`);
      } catch (error) {
        this.results.services[service.name] = {
          status: 'DOWN',
          error: error.message
        };
        console.log(`  ❌ ${service.name} - ${error.message}`);
      }
    }
  }

  async testIntegration() {
    console.log('\n🔗 Testing Service Integration...');
    
    // Test API Gateway GraphQL endpoint
    try {
      const graphqlQuery = {
        query: `
          query {
            healthCheck {
              status
              timestamp
              services {
                name
                status
              }
            }
          }
        `
      };
      
      const response = await this.makeRequest('http://localhost:3000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlQuery)
      });
      
      this.results.integration.graphql = {
        status: response.status < 400 ? 'WORKING' : 'FAILED',
        statusCode: response.status
      };
      
      console.log(`  ${response.status < 400 ? '✅' : '❌'} GraphQL API Integration`);
    } catch (error) {
      this.results.integration.graphql = { status: 'FAILED', error: error.message };
      console.log(`  ❌ GraphQL API Integration - ${error.message}`);
    }

    // Test WebSocket connection
    try {
      const wsTest = await this.testWebSocket('ws://localhost:3000/graphql');
      this.results.integration.websocket = wsTest;
      console.log(`  ${wsTest.status === 'WORKING' ? '✅' : '❌'} WebSocket Integration`);
    } catch (error) {
      this.results.integration.websocket = { status: 'FAILED', error: error.message };
      console.log(`  ❌ WebSocket Integration - ${error.message}`);
    }

    // Test data flow
    try {
      await this.testDataFlow();
      console.log(`  ✅ Data Flow Integration`);
    } catch (error) {
      this.results.integration.dataFlow = { status: 'FAILED', error: error.message };
      console.log(`  ❌ Data Flow Integration - ${error.message}`);
    }
  }

  async testDataFlow() {
    // Simulate a data ingestion event
    const testEvent = {
      type: 'git_commit',
      repository: 'test/repo',
      author: 'test-user',
      timestamp: new Date().toISOString(),
      metadata: {
        commitHash: 'abc123',
        message: 'Test commit for integration test'
      }
    };

    const response = await this.makeRequest('http://localhost:3001/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });

    if (response.status >= 400) {
      throw new Error(`Data ingestion failed with status ${response.status}`);
    }

    this.results.integration.dataFlow = { status: 'WORKING' };
  }

  async testWebSocket(url) {
    return new Promise((resolve) => {
      try {
        // Simple WebSocket test - just check if connection can be established
        const WebSocket = require('ws');
        const ws = new WebSocket(url, 'graphql-ws');
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ status: 'TIMEOUT' });
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ status: 'WORKING' });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          resolve({ status: 'FAILED', error: error.message });
        });
      } catch (error) {
        resolve({ status: 'FAILED', error: error.message });
      }
    });
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      
      server.on('error', () => resolve(true));
    });
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data,
            responseTime: Date.now() - startTime
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  async attemptAutoFix(error) {
    const fixKey = error.message;
    const attempts = this.fixAttempts.get(fixKey) || 0;
    
    if (attempts >= this.options.retryCount) {
      console.log(`⚠️  Max fix attempts reached for: ${fixKey}`);
      return false;
    }
    
    this.fixAttempts.set(fixKey, attempts + 1);
    console.log(`🔧 Attempting auto-fix (${attempts + 1}/${this.options.retryCount}): ${fixKey}`);
    
    try {
      // Port conflict fixes
      if (error.message.includes('EADDRINUSE') || error.message.includes('port')) {
        await this.fixPortConflicts();
        this.results.fixes.push(`Fixed port conflicts at ${new Date().toISOString()}`);
        return true;
      }
      
      // Service down fixes
      if (error.message.includes('ECONNREFUSED') || error.message.includes('DOWN')) {
        await this.restartServices();
        this.results.fixes.push(`Restarted services at ${new Date().toISOString()}`);
        return true;
      }
      
      // Docker issues
      if (error.message.includes('docker') || error.message.includes('container')) {
        await this.fixDockerIssues();
        this.results.fixes.push(`Fixed Docker issues at ${new Date().toISOString()}`);
        return true;
      }
      
      // Generic infrastructure fix
      await this.fixInfrastructure();
      this.results.fixes.push(`Applied generic infrastructure fix at ${new Date().toISOString()}`);
      return true;
      
    } catch (fixError) {
      console.log(`❌ Auto-fix failed: ${fixError.message}`);
      this.results.errors.push(`Auto-fix failed: ${fixError.message}`);
      return false;
    }
  }

  async fixPortConflicts() {
    console.log('🔧 Fixing port conflicts...');
    
    const ports = [3000, 3001, 3002, 3003, 3004, 27017, 6379, 8086, 9092, 2181];
    
    for (const port of ports) {
      try {
        await this.execCommand(`lsof -ti:${port} | xargs kill -9`);
        await this.sleep(1000);
      } catch (error) {
        // Port might not be in use, continue
      }
    }
  }

  async restartServices() {
    console.log('🔧 Restarting services...');
    
    try {
      // Stop services
      await this.execCommand('pkill -f "npm run dev" || true');
      await this.execCommand('docker-compose down || true');
      await this.sleep(5000);
      
      // Start infrastructure
      await this.execCommand('docker-compose up -d');
      await this.sleep(30000);
      
      // Start application services
      this.execCommand('npm run dev &');
      await this.sleep(20000);
      
    } catch (error) {
      throw new Error(`Service restart failed: ${error.message}`);
    }
  }

  async fixDockerIssues() {
    console.log('🔧 Fixing Docker issues...');
    
    try {
      await this.execCommand('docker-compose down -v');
      await this.execCommand('docker system prune -f');
      await this.sleep(5000);
      await this.execCommand('docker-compose up -d --build');
      await this.sleep(30000);
    } catch (error) {
      throw new Error(`Docker fix failed: ${error.message}`);
    }
  }

  async fixInfrastructure() {
    console.log('🔧 Applying infrastructure fixes...');
    
    try {
      // Ensure .env exists
      if (!fs.existsSync('.env')) {
        fs.copyFileSync('.env.example', '.env');
      }
      
      // Fix permissions
      await this.execCommand('chmod +x launch-devflow.sh');
      await this.execCommand('chmod +x tests/final-application-test.js');
      
      // Clean and reinstall if needed
      const nodeModulesExists = fs.existsSync('node_modules');
      const packageLockExists = fs.existsSync('package-lock.json');
      
      if (!nodeModulesExists || !packageLockExists) {
        await this.execCommand('rm -rf node_modules package-lock.json');
        await this.execCommand('npm install');
      }
      
    } catch (error) {
      throw new Error(`Infrastructure fix failed: ${error.message}`);
    }
  }

  async attemptSystemRecovery() {
    console.log('🚨 Attempting system recovery...');
    
    try {
      await this.fixPortConflicts();
      await this.sleep(2000);
      await this.restartServices();
      await this.sleep(30000);
      
      // Re-run tests to verify recovery
      const success = await this.runTests();
      if (success) {
        console.log('✅ System recovery successful!');
        this.emit('recovery', { success: true });
      } else {
        console.log('❌ System recovery failed');
        this.emit('recovery', { success: false });
      }
      
      return success;
    } catch (error) {
      console.log(`❌ System recovery failed: ${error.message}`);
      this.emit('recovery', { success: false, error: error.message });
      return false;
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateReport() {
    if (!this.options.quiet) {
      console.log('\n📋 Test Results Summary');
      console.log('=' .repeat(60));
    }

    // Infrastructure Summary
    const infraUp = Object.values(this.results.infrastructure).filter(s => s.status === 'RUNNING').length;
    const infraTotal = Object.keys(this.results.infrastructure).length;
    const infraCriticalUp = this.infrastructure.filter(i => i.critical && this.results.infrastructure[i.name]?.status === 'RUNNING').length;
    const infraCriticalTotal = this.infrastructure.filter(i => i.critical).length;

    // Services Summary
    const servicesHealthy = Object.values(this.results.services).filter(s => s.status === 'HEALTHY').length;
    const servicesTotal = Object.keys(this.results.services).length;
    const servicesCriticalHealthy = this.services.filter(s => s.critical && this.results.services[s.name]?.status === 'HEALTHY').length;
    const servicesCriticalTotal = this.services.filter(s => s.critical).length;

    // Integration Summary
    const integrationWorking = Object.values(this.results.integration).filter(s => s.status === 'WORKING').length;
    const integrationTotal = Object.keys(this.results.integration).length;

    if (!this.options.quiet) {
      console.log(`\n📊 Infrastructure: ${infraUp}/${infraTotal} services running (${infraCriticalUp}/${infraCriticalTotal} critical)`);
      console.log(`🔧 Application Services: ${servicesHealthy}/${servicesTotal} services healthy (${servicesCriticalHealthy}/${servicesCriticalTotal} critical)`);
      console.log(`🔗 Integration Tests: ${integrationWorking}/${integrationTotal} tests passing`);
    }

    // Calculate health based on critical services
    const criticalHealth = (infraCriticalUp + servicesCriticalHealthy) / (infraCriticalTotal + servicesCriticalTotal);
    const overallHealth = (infraUp + servicesHealthy + integrationWorking) / (infraTotal + servicesTotal + integrationTotal);
    const healthPercentage = Math.round(overallHealth * 100);
    const criticalHealthPercentage = Math.round(criticalHealth * 100);
    
    if (!this.options.quiet) {
      console.log(`\n🎯 Overall System Health: ${healthPercentage}% (Critical: ${criticalHealthPercentage}%)`);
      console.log(`📈 Test Run: #${this.results.runCount} at ${this.results.timestamp}`);
      
      if (criticalHealthPercentage >= 90) {
        console.log('✅ System is READY for production!');
      } else if (criticalHealthPercentage >= 70) {
        console.log('⚠️  System has some issues but critical services are functional');
      } else {
        console.log('❌ System has critical issues that need immediate attention');
      }

      // Fix Summary
      if (this.results.fixes.length > 0) {
        console.log('\n🔧 Auto-fixes applied:');
        this.results.fixes.slice(-5).forEach(fix => console.log(`  - ${fix}`));
      }

      // Error Summary
      if (this.results.errors.length > 0) {
        console.log('\n❌ Recent errors:');
        this.results.errors.slice(-3).forEach(error => console.log(`  - ${error}`));
      }
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'test-results.json');
    const globalReportPath = path.join(__dirname, 'global-test-history.json');
    
    // Save current results
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Append to global history
    let history = [];
    if (fs.existsSync(globalReportPath)) {
      try {
        history = JSON.parse(fs.readFileSync(globalReportPath, 'utf8'));
      } catch (e) {
        history = [];
      }
    }
    
    history.push({
      timestamp: this.results.timestamp,
      runCount: this.results.runCount,
      healthPercentage,
      criticalHealthPercentage,
      infraUp,
      servicesHealthy,
      integrationWorking,
      errorCount: this.results.errors.length,
      fixCount: this.results.fixes.length
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    fs.writeFileSync(globalReportPath, JSON.stringify(history, null, 2));
    
    if (!this.options.quiet) {
      console.log(`\n📄 Results saved to: ${reportPath}`);
      console.log(`📊 History saved to: ${globalReportPath}`);
    }

    return criticalHealthPercentage >= 70;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    autoFix: true,
    continuous: false,
    quiet: false,
    interval: 30000,
    retryCount: 3
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--no-auto-fix':
        options.autoFix = false;
        break;
      case '--continuous':
        options.continuous = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--interval':
        options.interval = parseInt(args[++i]) * 1000;
        break;
      case '--retry-count':
        options.retryCount = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
DevFlow Global Test Runner

Usage: node tests/final-application-test.js [options]

Options:
  --continuous         Run continuous monitoring
  --no-auto-fix        Disable automatic bug fixing
  --quiet              Suppress detailed output
  --interval <seconds> Monitoring interval (default: 30)
  --retry-count <n>    Max auto-fix attempts (default: 3)
  --help               Show this help message

Examples:
  node tests/final-application-test.js                    # Single test run with auto-fix
  node tests/final-application-test.js --continuous       # Continuous monitoring
  node tests/final-application-test.js --quiet            # Quiet mode for scripts
  node tests/final-application-test.js --interval 60      # Monitor every 60 seconds
        `);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// Run the test if called directly
if (require.main === module) {
  const options = parseArgs();
  const tester = new DevFlowTester(options);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test runner...');
    tester.stopContinuousMonitoring();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down test runner...');
    tester.stopContinuousMonitoring();
    process.exit(0);
  });
  
  // Event listeners for monitoring
  tester.on('healthCheck', (data) => {
    if (!options.quiet && !data.success) {
      console.log('⚠️  Health check failed, auto-fix in progress...');
    }
  });
  
  tester.on('recovery', (data) => {
    if (data.success) {
      console.log('✅ System recovery completed successfully');
    } else {
      console.log('❌ System recovery failed, manual intervention required');
    }
  });
  
  // Start the test runner
  tester.runTests().then(success => {
    if (!options.continuous) {
      process.exit(success ? 0 : 1);
    }
    // If continuous, keep running
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = DevFlowTester;