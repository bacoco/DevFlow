import { jest } from '@jest/globals';

// Mock winston logger to avoid console output during tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock fs operations for log files
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{}'),
  appendFileSync: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.MAX_RETRIES = '3';
process.env.INITIAL_RETRY_DELAY_MS = '100';
process.env.MAX_RETRY_DELAY_MS = '5000';
process.env.BACKOFF_MULTIPLIER = '2.0';
process.env.RETRY_JITTER_MS = '50';