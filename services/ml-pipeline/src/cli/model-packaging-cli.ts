#!/usr/bin/env node

import { Command } from 'commander';
import { ModelRegistry, ModelRegistryConfig } from '../services/model-registry';
import path from 'path';
import fs from 'fs';

const program = new Command();

// Default configuration
const defaultConfig: ModelRegistryConfig = {
  trackingUri: process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000',
  experimentName: process.env.MLFLOW_EXPERIMENT_NAME || 'default',
  artifactRoot: process.env.MLFLOW_ARTIFACT_ROOT || '/tmp/mlflow-artifacts',
  defaultModelName: 'default-model',
  validationThresholds: {
    accuracy: 0.8,
    precision: 0.7,
    recall: 0.6
  },
  autoPromoteToStaging: false,
  autoPromoteToProduction: false,
  modelStoragePath: process.env.MODEL_STORAGE_PATH || '/tmp/model-packages'
};

program
  .name('model-packaging-cli')
  .description('CLI tool for ML model packaging and deployment')
  .version('1.0.0');

program
  .command('package')
  .description('Package a model from MLflow registry')
  .requiredOption('-n, --name <name>', 'Model name')
  .requiredOption('-v, --version <version>', 'Model version')
  .option('-o, --output <path>', 'Output directory for package')
  .action(async (options) => {
    try {
      console.log(`📦 Packaging model ${options.name}:${options.version}...`);
      
      const modelRegistry = new ModelRegistry(defaultConfig);
      const packageInfo = await modelRegistry.packageModel(
        options.name,
        options.version,
        options.output
      );

      console.log('✅ Model packaged successfully!');
      console.log(`📋 Package ID: ${packageInfo.id}`);
      console.log(`📁 Package Path: ${packageInfo.packagePath}`);
      console.log(`📏 Package Size: ${(packageInfo.packageSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🔒 Checksum: ${packageInfo.checksum}`);
      console.log(`🏗️  Framework: ${packageInfo.metadata.modelFramework}`);
      console.log(`📦 Dependencies: ${packageInfo.metadata.dependencies.length} packages`);
      
      if (packageInfo.metadata.dependencies.length > 0) {
        console.log('   Dependencies:');
        packageInfo.metadata.dependencies.forEach(dep => {
          console.log(`   - ${dep}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to package model:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('unpackage')
  .description('Unpackage a model to a directory')
  .requiredOption('-i, --id <id>', 'Package ID')
  .requiredOption('-o, --output <path>', 'Output directory')
  .action(async (options) => {
    try {
      console.log(`📂 Unpackaging model ${options.id}...`);
      
      const modelRegistry = new ModelRegistry(defaultConfig);
      await modelRegistry.unpackageModel(options.id, options.output);

      console.log('✅ Model unpackaged successfully!');
      console.log(`📁 Output Directory: ${options.output}`);

    } catch (error) {
      console.error('❌ Failed to unpackage model:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List packaged models')
  .option('-n, --name <name>', 'Filter by model name')
  .action(async (options) => {
    try {
      console.log('📋 Listing packaged models...');
      
      const modelRegistry = new ModelRegistry(defaultConfig);
      const packages = await modelRegistry.listPackages(options.name);

      if (packages.length === 0) {
        console.log('📭 No packages found');
        return;
      }

      console.log(`\n📦 Found ${packages.length} package(s):\n`);
      
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.modelName}:${pkg.modelVersion}`);
        console.log(`   ID: ${pkg.id}`);
        console.log(`   Size: ${(pkg.packageSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Created: ${pkg.createdAt.toISOString()}`);
        console.log(`   Framework: ${pkg.metadata.modelFramework}`);
        console.log(`   Path: ${pkg.packagePath}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list packages:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Deploy a packaged model')
  .requiredOption('-i, --id <id>', 'Package ID')
  .requiredOption('-e, --environment <env>', 'Deployment environment (staging, production)')
  .option('-c, --config <config>', 'Deployment configuration JSON file')
  .action(async (options) => {
    try {
      console.log(`🚀 Deploying package ${options.id} to ${options.environment}...`);
      
      let deploymentConfig = {};
      if (options.config) {
        if (fs.existsSync(options.config)) {
          deploymentConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));
        } else {
          console.warn(`⚠️  Config file not found: ${options.config}`);
        }
      }

      const modelRegistry = new ModelRegistry(defaultConfig);
      const deploymentId = await modelRegistry.deployPackage(
        options.id,
        options.environment,
        deploymentConfig
      );

      console.log('✅ Model deployed successfully!');
      console.log(`🆔 Deployment ID: ${deploymentId}`);
      
      // Wait a moment and check status
      setTimeout(async () => {
        try {
          const deployment = await modelRegistry.getPackageDeploymentStatus(deploymentId);
          console.log(`📊 Status: ${deployment.status}`);
          if (deployment.endpoint) {
            console.log(`🌐 Endpoint: ${deployment.endpoint}`);
          }
        } catch (error) {
          console.warn('⚠️  Could not retrieve deployment status');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to deploy package:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('undeploy')
  .description('Undeploy a model')
  .requiredOption('-d, --deployment <id>', 'Deployment ID')
  .action(async (options) => {
    try {
      console.log(`🛑 Undeploying ${options.deployment}...`);
      
      const modelRegistry = new ModelRegistry(defaultConfig);
      await modelRegistry.undeployPackage(options.deployment);

      console.log('✅ Model undeployed successfully!');

    } catch (error) {
      console.error('❌ Failed to undeploy model:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check deployment status')
  .option('-d, --deployment <id>', 'Deployment ID')
  .option('-e, --environment <env>', 'List deployments for environment')
  .action(async (options) => {
    try {
      const modelRegistry = new ModelRegistry(defaultConfig);

      if (options.deployment) {
        console.log(`📊 Checking status for deployment ${options.deployment}...`);
        
        const deployment = await modelRegistry.getPackageDeploymentStatus(options.deployment);
        
        console.log(`\n📋 Deployment Status:`);
        console.log(`   ID: ${deployment.id}`);
        console.log(`   Status: ${deployment.status}`);
        console.log(`   Model: ${deployment.modelName}:${deployment.modelVersion}`);
        console.log(`   Stage: ${deployment.stage}`);
        console.log(`   Deployed: ${deployment.deploymentTime.toISOString()}`);
        
        if (deployment.endpoint) {
          console.log(`   Endpoint: ${deployment.endpoint}`);
        }
        
        if (deployment.healthCheck) {
          console.log(`   Health: ${deployment.healthCheck.status}`);
          console.log(`   Last Check: ${deployment.healthCheck.lastCheck.toISOString()}`);
          if (deployment.healthCheck.latency) {
            console.log(`   Latency: ${deployment.healthCheck.latency}ms`);
          }
        }

      } else {
        console.log('📋 Listing all deployments...');
        
        const deployments = await modelRegistry.listPackageDeployments(options.environment);
        
        if (deployments.length === 0) {
          console.log('📭 No deployments found');
          return;
        }

        console.log(`\n🚀 Found ${deployments.length} deployment(s):\n`);
        
        deployments.forEach((deployment, index) => {
          console.log(`${index + 1}. ${deployment.modelName}:${deployment.modelVersion}`);
          console.log(`   ID: ${deployment.id}`);
          console.log(`   Status: ${deployment.status}`);
          console.log(`   Environment: ${deployment.endpoint?.split('.')[0]?.split('-')[1] || 'unknown'}`);
          console.log(`   Deployed: ${deployment.deploymentTime.toISOString()}`);
          console.log('');
        });
      }

    } catch (error) {
      console.error('❌ Failed to get status:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete a packaged model')
  .requiredOption('-i, --id <id>', 'Package ID')
  .option('-f, --force', 'Force deletion without confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        console.log(`⚠️  This will permanently delete package ${options.id}`);
        console.log('Use --force to confirm deletion');
        return;
      }

      console.log(`🗑️  Deleting package ${options.id}...`);
      
      const modelRegistry = new ModelRegistry(defaultConfig);
      await modelRegistry.deletePackage(options.id);

      console.log('✅ Package deleted successfully!');

    } catch (error) {
      console.error('❌ Failed to delete package:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}