import { createLogger } from 'winston';

// Mock Redis for testing
jest.mock('ioredis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    mget: jest.fn(),
    keys: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    incrby: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    info: jest.fn().mockResolvedValue('used_memory:1024\n'),
    dbsize: jest.fn().mockResolvedValue(10),
    pipeline: jest.fn(() => ({
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      exec: jest.fn().mockResolvedValue([])
    })),
    on: jest.fn()
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockRedis),
    Cluster: jest.fn(() => ({
      ...mockRedis,
      nodes: jest.fn(() => [mockRedis])
    }))
  };
});

export const mockLogger = createLogger({
  level: 'error',
  transports: []
});

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});