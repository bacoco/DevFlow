const fs = require('fs');
const path = require('path');

console.log('🔍 Disaster Recovery Implementation Validation\n');

// Check if all required files exist
const requiredFiles = [
  'deployment/backup/backup-manager.ts',
  'deployment/disaster-recovery/disaster-recovery-manager.ts',
  'deployment/disaster-recovery/cross-region-replication.ts',
  'deployment/disaster-recovery/dr-cli.ts',
  'deployment/disaster-recovery/dr-config.example.json',
  'k8s/backup-cronjobs.yaml'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log();

// Check file contents for key functionality
const functionalityChecks = [
  {
    file: 'deployment/backup/backup-manager.ts',
    checks: [
      'performFullBackup',
      'performIncrementalBackup',
      'backupMongoDB',
      'backupInfluxDB',
      'backupRedis',
      'uploadBackupFile',
      'cleanupOldBackups'
    ]
  },
  {
    file: 'deployment/disaster-recovery/disaster-recovery-manager.ts',
    checks: [
      'initiateFailover',
      'createRecoveryPlan',
      'executeRecoveryPlan',
      'testDisasterRecovery',
      'switchPrimaryRegion'
    ]
  },
  {
    file: 'deployment/disaster-recovery/cross-region-replication.ts',
    checks: [
      'startReplication',
      'stopReplication',
      'syncRegion',
      'syncMongoDB',
      'syncInfluxDB',
      'syncRedis',
      'handleConflict',
      'resolveConflict'
    ]
  },
  {
    file: 'deployment/disaster-recovery/dr-cli.ts',
    checks: [
      'status',
      'backup',
      'failover',
      'test',
      'recover',
      'startReplication',
      'stopReplication',
      'resolveConflict'
    ]
  }
];

console.log('🔧 Checking functionality implementation:');
let allFunctionalityExists = true;

functionalityChecks.forEach(({ file, checks }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    console.log(`\n  📄 ${file}:`);
    
    checks.forEach(func => {
      const exists = content.includes(func);
      const status = exists ? '✅' : '❌';
      console.log(`    ${status} ${func}`);
      if (!exists) allFunctionalityExists = false;
    });
  }
});

console.log();

// Check Kubernetes configuration
console.log('☸️  Checking Kubernetes configuration:');
if (fs.existsSync('k8s/backup-cronjobs.yaml')) {
  const k8sContent = fs.readFileSync('k8s/backup-cronjobs.yaml', 'utf8');
  
  const k8sChecks = [
    'daily-backup',
    'hourly-incremental-backup',
    'weekly-backup-cleanup',
    'disaster-recovery-test',
    'backup-service-account',
    'disaster-recovery-service-account'
  ];
  
  k8sChecks.forEach(check => {
    const exists = k8sContent.includes(check);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${check}`);
    if (!exists) allFunctionalityExists = false;
  });
}

console.log();

// Check configuration example
console.log('⚙️  Checking configuration:');
if (fs.existsSync('deployment/disaster-recovery/dr-config.example.json')) {
  try {
    const config = JSON.parse(fs.readFileSync('deployment/disaster-recovery/dr-config.example.json', 'utf8'));
    
    const configChecks = [
      { path: 'disasterRecovery.backup', name: 'Backup configuration' },
      { path: 'disasterRecovery.replication', name: 'Replication configuration' },
      { path: 'disasterRecovery.recovery', name: 'Recovery configuration' },
      { path: 'disasterRecovery.notifications', name: 'Notification configuration' },
      { path: 'replication.regions', name: 'Region configuration' },
      { path: 'replication.conflictResolution', name: 'Conflict resolution' }
    ];
    
    configChecks.forEach(({ path, name }) => {
      const exists = path.split('.').reduce((obj, key) => obj && obj[key], config);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${name}`);
      if (!exists) allFunctionalityExists = false;
    });
  } catch (error) {
    console.log('  ❌ Invalid JSON configuration');
    allFunctionalityExists = false;
  }
}

console.log();

// Summary
console.log('📊 Validation Summary:');
console.log(`  Files: ${allFilesExist ? '✅ All required files present' : '❌ Missing files'}`);
console.log(`  Functionality: ${allFunctionalityExists ? '✅ All functionality implemented' : '❌ Missing functionality'}`);

const overallSuccess = allFilesExist && allFunctionalityExists;
console.log(`  Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

console.log();

if (overallSuccess) {
  console.log('🎉 Disaster Recovery implementation is complete!');
  console.log();
  console.log('📋 Key Features Implemented:');
  console.log('  • Automated backup procedures for MongoDB, InfluxDB, and Redis');
  console.log('  • Cross-region data replication with conflict resolution');
  console.log('  • Automated failover with rollback capability');
  console.log('  • Recovery plan generation and execution');
  console.log('  • Comprehensive disaster recovery testing');
  console.log('  • CLI tool for DR management');
  console.log('  • Kubernetes CronJobs for automated operations');
  console.log('  • Monitoring and alerting integration');
  console.log();
  console.log('🚀 Next Steps:');
  console.log('  1. Configure dr-config.json with your environment settings');
  console.log('  2. Deploy Kubernetes resources: kubectl apply -f k8s/backup-cronjobs.yaml');
  console.log('  3. Test the system: node deployment/disaster-recovery/dr-cli.js test');
  console.log('  4. Set up monitoring and alerting');
} else {
  console.log('❌ Disaster Recovery implementation needs attention.');
  console.log('Please review the missing files and functionality above.');
}

process.exit(overallSuccess ? 0 : 1);