#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Tearing down integration test environment...');

// Clean up temporary files and directories
const cleanupPaths = [
  'tests/integration/logs',
  'tests/integration/temp',
  'tests/integration/.env.test',
  'tests/integration/config/test-config.json'
];

cleanupPaths.forEach(cleanupPath => {
  if (fs.existsSync(cleanupPath)) {
    if (fs.statSync(cleanupPath).isDirectory()) {
      fs.rmSync(cleanupPath, { recursive: true, force: true });
      console.log(`Removed directory: ${cleanupPath}`);
    } else {
      fs.unlinkSync(cleanupPath);
      console.log(`Removed file: ${cleanupPath}`);
    }
  }
});

console.log('Integration test environment teardown complete!');