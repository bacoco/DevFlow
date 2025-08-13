// Jest setup file for intervention-engine tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set timezone for consistent date testing
process.env.TZ = 'UTC';

// Mock timers if needed
// jest.useFakeTimers();

// Global test timeout
jest.setTimeout(10000);