// Jest setup file for biometric service tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock console methods to reduce test output noise
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Global test timeout
jest.setTimeout(10000);

// Mock timers for tests that use setTimeout/setInterval
beforeEach(() => {
  jest.clearAllTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

// Dummy test to prevent Jest from complaining about no tests
describe('Setup', () => {
  it('should configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});