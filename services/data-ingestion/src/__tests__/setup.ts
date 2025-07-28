// Jest setup file for data-ingestion service
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.GITHUB_WEBHOOK_SECRET = 'test-github-secret';
process.env.GITLAB_WEBHOOK_SECRET = 'test-gitlab-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};