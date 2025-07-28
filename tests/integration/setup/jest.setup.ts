import { TestEnvironment } from './test-environment';

// Global test timeout
jest.setTimeout(60000);

// Global test environment
let testEnv: TestEnvironment;

beforeAll(async () => {
  testEnv = new TestEnvironment();
  await testEnv.setup();
  
  // Make test environment available globally
  (global as any).testEnv = testEnv;
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.teardown();
  }
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});