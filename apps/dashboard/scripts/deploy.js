#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environment = process.argv[2];

if (!environment || !['staging', 'production'].includes(environment)) {
  console.error('❌ Please specify environment: staging or production');
  process.exit(1);
}

console.log(`🚀 Starting deployment to ${environment}...`);

// Pre-deployment checks
console.log('🔍 Running pre-deployment checks...');

// Check if build exists
if (!fs.existsSync(path.join(__dirname, '../.next'))) {
  console.log('📦 Building application...');
  try {
    execSync('npm run build:production', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }
}

// Run tests
console.log('🧪 Running tests...');
try {
  execSync('npm run test:ci', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Tests failed');
  process.exit(1);
}

// Run accessibility tests
console.log('♿ Running accessibility tests...');
try {
  execSync('npm run test:accessibility', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Accessibility tests failed, but continuing deployment');
}

// Environment-specific configurations
const config = {
  staging: {
    url: process.env.STAGING_URL || 'https://staging.devflow.com',
    branch: 'develop',
    healthCheck: '/api/health',
  },
  production: {
    url: process.env.PRODUCTION_URL || 'https://devflow.com',
    branch: 'main',
    healthCheck: '/api/health',
  }
};

const deployConfig = config[environment];

// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WS_URL',
];

if (environment === 'production') {
  requiredEnvVars.push(
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_ANALYTICS_ID'
  );
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Create deployment manifest
const deploymentManifest = {
  environment,
  timestamp: new Date().toISOString(),
  version: require('../package.json').version,
  commit: getGitCommit(),
  branch: getGitBranch(),
  buildSize: getBuildSize(),
  config: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    sentryEnabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    analyticsEnabled: !!process.env.NEXT_PUBLIC_ANALYTICS_ID,
  }
};

fs.writeFileSync(
  path.join(__dirname, '../deployment-manifest.json'),
  JSON.stringify(deploymentManifest, null, 2)
);

console.log('📋 Deployment manifest created');

// Deployment steps based on environment
if (environment === 'staging') {
  deployToStaging();
} else {
  deployToProduction();
}

function deployToStaging() {
  console.log('🚀 Deploying to staging...');
  
  // Example deployment commands (adjust based on your deployment platform)
  try {
    // Docker deployment example
    if (process.env.DEPLOY_METHOD === 'docker') {
      execSync('docker build -t devflow-dashboard:staging .', { stdio: 'inherit' });
      execSync('docker tag devflow-dashboard:staging registry.example.com/devflow-dashboard:staging', { stdio: 'inherit' });
      execSync('docker push registry.example.com/devflow-dashboard:staging', { stdio: 'inherit' });
    }
    
    // Vercel deployment example
    if (process.env.DEPLOY_METHOD === 'vercel') {
      execSync('vercel --prod --confirm', { stdio: 'inherit' });
    }
    
    // Custom deployment script
    if (fs.existsSync(path.join(__dirname, 'deploy-staging.sh'))) {
      execSync('bash scripts/deploy-staging.sh', { stdio: 'inherit' });
    }
    
    console.log('✅ Staging deployment complete');
    
    // Health check
    setTimeout(() => {
      performHealthCheck(deployConfig.url + deployConfig.healthCheck);
    }, 30000); // Wait 30 seconds for deployment to stabilize
    
  } catch (error) {
    console.error('❌ Staging deployment failed:', error.message);
    process.exit(1);
  }
}

function deployToProduction() {
  console.log('🚀 Deploying to production...');
  
  // Additional production checks
  console.log('🔒 Running production-specific checks...');
  
  // Check if on correct branch
  const currentBranch = getGitBranch();
  if (currentBranch !== deployConfig.branch) {
    console.error(`❌ Must be on ${deployConfig.branch} branch for production deployment. Currently on ${currentBranch}`);
    process.exit(1);
  }
  
  // Check for uncommitted changes
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Uncommitted changes detected. Please commit all changes before production deployment.');
    process.exit(1);
  }
  
  // Run performance tests
  console.log('⚡ Running performance tests...');
  try {
    execSync('npm run test:performance', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Performance tests failed, but continuing deployment');
  }
  
  try {
    // Production deployment commands
    if (process.env.DEPLOY_METHOD === 'docker') {
      execSync('docker build -t devflow-dashboard:production .', { stdio: 'inherit' });
      execSync('docker tag devflow-dashboard:production registry.example.com/devflow-dashboard:production', { stdio: 'inherit' });
      execSync('docker push registry.example.com/devflow-dashboard:production', { stdio: 'inherit' });
    }
    
    if (process.env.DEPLOY_METHOD === 'vercel') {
      execSync('vercel --prod --confirm', { stdio: 'inherit' });
    }
    
    // Custom production deployment script
    if (fs.existsSync(path.join(__dirname, 'deploy-production.sh'))) {
      execSync('bash scripts/deploy-production.sh', { stdio: 'inherit' });
    }
    
    console.log('✅ Production deployment complete');
    
    // Health check
    setTimeout(() => {
      performHealthCheck(deployConfig.url + deployConfig.healthCheck);
    }, 60000); // Wait 1 minute for production deployment to stabilize
    
    // Create deployment tag
    const tag = `deploy-${environment}-${Date.now()}`;
    try {
      execSync(`git tag ${tag}`, { stdio: 'pipe' });
      execSync(`git push origin ${tag}`, { stdio: 'pipe' });
      console.log(`🏷️  Created deployment tag: ${tag}`);
    } catch (error) {
      console.warn('⚠️  Could not create deployment tag:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Production deployment failed:', error.message);
    process.exit(1);
  }
}

function performHealthCheck(url) {
  console.log(`🏥 Performing health check: ${url}`);
  
  // Simple health check implementation
  // In a real scenario, you might use a more sophisticated health check
  const https = require('https');
  const http = require('http');
  
  const client = url.startsWith('https') ? https : http;
  
  const req = client.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Health check passed');
    } else {
      console.error(`❌ Health check failed with status: ${res.statusCode}`);
    }
  });
  
  req.on('error', (error) => {
    console.error('❌ Health check failed:', error.message);
  });
  
  req.setTimeout(10000, () => {
    console.error('❌ Health check timed out');
    req.destroy();
  });
}

// Helper functions
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function getBuildSize() {
  try {
    const buildDir = path.join(__dirname, '../.next');
    const { execSync } = require('child_process');
    const output = execSync(`du -sh ${buildDir}`, { encoding: 'utf8' });
    return output.split('\t')[0];
  } catch (error) {
    return 'unknown';
  }
}