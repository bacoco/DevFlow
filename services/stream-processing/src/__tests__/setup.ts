import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.KAFKA_BROKERS = 'localhost:9092';
  process.env.WINDOW_SIZE_MS = '60000';
  process.env.PARALLELISM = '2';
  process.env.CHECKPOINT_INTERVAL_MS = '5000';
});

// Global test cleanup
afterAll(() => {
  // Clean up any global resources
});