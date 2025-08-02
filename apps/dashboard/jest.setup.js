// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock CSS imports
jest.mock('react-grid-layout/css/styles.css', () => ({}));
jest.mock('react-grid-layout/css/resizable.css', () => ({}));

// Mock Three.js and React Three Fiber for testing
// These mocks will be overridden in individual test files as needed