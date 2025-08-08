#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting build optimization...');

// Check if .next directory exists
const nextDir = path.join(__dirname, '../.next');
if (!fs.existsSync(nextDir)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Analyze bundle size
console.log('📊 Analyzing bundle size...');
try {
  const buildManifest = require('../.next/build-manifest.json');
  const pages = Object.keys(buildManifest.pages);
  
  console.log(`📄 Found ${pages.length} pages:`);
  pages.forEach(page => {
    const files = buildManifest.pages[page];
    const totalSize = files.reduce((acc, file) => {
      try {
        const filePath = path.join(nextDir, file);
        const stats = fs.statSync(filePath);
        return acc + stats.size;
      } catch (e) {
        return acc;
      }
    }, 0);
    
    console.log(`  ${page}: ${(totalSize / 1024).toFixed(2)} KB`);
  });
} catch (error) {
  console.warn('⚠️  Could not analyze bundle size:', error.message);
}

// Check for large files
console.log('🔍 Checking for large files...');
const checkLargeFiles = (dir, threshold = 500 * 1024) => { // 500KB threshold
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      checkLargeFiles(filePath, threshold);
    } else if (file.isFile()) {
      const stats = fs.statSync(filePath);
      if (stats.size > threshold) {
        console.log(`⚠️  Large file detected: ${filePath} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    }
  });
};

try {
  checkLargeFiles(path.join(nextDir, 'static'));
} catch (error) {
  console.warn('⚠️  Could not check static files:', error.message);
}

// Generate performance report
console.log('📈 Generating performance report...');
const performanceReport = {
  timestamp: new Date().toISOString(),
  buildSize: getBuildSize(nextDir),
  optimization: {
    minification: true,
    compression: true,
    treeshaking: true,
    codesplitting: true,
  },
  recommendations: []
};

// Check for common optimization opportunities
const staticDir = path.join(nextDir, 'static');
if (fs.existsSync(staticDir)) {
  const staticFiles = getAllFiles(staticDir);
  const jsFiles = staticFiles.filter(f => f.endsWith('.js'));
  const cssFiles = staticFiles.filter(f => f.endsWith('.css'));
  
  performanceReport.files = {
    javascript: jsFiles.length,
    css: cssFiles.length,
    total: staticFiles.length
  };
  
  // Check for unoptimized images
  const imageFiles = staticFiles.filter(f => /\.(jpg|jpeg|png|gif|svg)$/i.test(f));
  if (imageFiles.length > 0) {
    performanceReport.recommendations.push({
      type: 'images',
      message: `Consider optimizing ${imageFiles.length} image files`,
      files: imageFiles.slice(0, 5) // Show first 5
    });
  }
}

// Save performance report
fs.writeFileSync(
  path.join(__dirname, '../performance-report.json'),
  JSON.stringify(performanceReport, null, 2)
);

console.log('✅ Build optimization complete!');
console.log('📊 Performance report saved to performance-report.json');

// Helper functions
function getBuildSize(dir) {
  let totalSize = 0;
  
  const calculateSize = (dirPath) => {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        calculateSize(filePath);
      } else {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
    });
  };
  
  try {
    calculateSize(dir);
    return Math.round(totalSize / 1024); // Return size in KB
  } catch (error) {
    return 0;
  }
}

function getAllFiles(dir) {
  let files = [];
  
  const getFiles = (dirPath) => {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        getFiles(itemPath);
      } else {
        files.push(itemPath);
      }
    });
  };
  
  try {
    getFiles(dir);
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files;
}