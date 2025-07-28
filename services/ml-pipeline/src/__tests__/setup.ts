// Global test setup for ML Pipeline service

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn()
};

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2024-01-01T00:00:00Z');
const OriginalDate = Date;
global.Date = jest.fn(() => mockDate) as any;
global.Date.now = jest.fn(() => mockDate.getTime());
Object.setPrototypeOf(global.Date, OriginalDate);
Object.getOwnPropertyNames(OriginalDate).forEach(name => {
  if (name !== 'length' && name !== 'name' && name !== 'prototype') {
    (global.Date as any)[name] = (OriginalDate as any)[name];
  }
});

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/devflow_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
export {}; // Make this file a module

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matcher for number ranges
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});