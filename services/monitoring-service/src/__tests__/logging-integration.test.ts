import fs from 'fs/promises';
import path from 'path';
import { LogAggregator } from '../logging/log-aggregator';

describe('Logging Integration', () => {
  let logAggregator: LogAggregator;
  const testLogDir = 'test-logs';

  beforeAll(async () => {
    // Create test log directory
    try {
      await fs.mkdir(testLogDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    logAggregator = new LogAggregator(testLogDir, 1); // 1 day retention for tests
  });

  afterAll(async () => {
    // Cleanup
    logAggregator.destroy();
    try {
      await fs.rmdir(testLogDir, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  beforeEach(async () => {
    // Create sample log file
    const sampleLogs = [
      {
        level: 'info',
        message: 'User login successful',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-123',
        service: 'api-gateway',
        userId: 'user-456',
        metadata: { event: 'user_login', ip: '192.168.1.1' }
      },
      {
        level: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-456',
        service: 'data-ingestion',
        error: {
          name: 'ConnectionError',
          message: 'Connection timeout',
          stack: 'Error stack trace...'
        }
      },
      {
        level: 'warn',
        message: 'High memory usage detected',
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation-789',
        service: 'ml-pipeline',
        metadata: { memoryUsage: '85%' }
      }
    ];

    const logContent = sampleLogs.map(log => JSON.stringify(log)).join('\n');
    await fs.writeFile(path.join(testLogDir, 'test.log'), logContent);
  });

  afterEach(async () => {
    // Clean up test log files
    try {
      const files = await fs.readdir(testLogDir);
      for (const file of files) {
        if (file.endsWith('.log')) {
          await fs.unlink(path.join(testLogDir, file));
        }
      }
    } catch (error) {
      // Files might not exist
    }
  });

  describe('Log Querying', () => {
    it('should query logs by service', async () => {
      const logs = await logAggregator.queryLogs({ services: ['api-gateway'] });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].service).toBe('api-gateway');
      expect(logs[0].message).toBe('User login successful');
    });

    it('should query logs by level', async () => {
      const errorLogs = await logAggregator.queryLogs({ levels: ['error'] });
      
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
      expect(errorLogs[0].service).toBe('data-ingestion');
    });

    it('should query logs by correlation ID', async () => {
      const logs = await logAggregator.getCorrelationTrace('test-correlation-123');
      
      expect(logs).toHaveLength(1);
      expect(logs[0].correlationId).toBe('test-correlation-123');
      expect(logs[0].userId).toBe('user-456');
    });

    it('should search logs by message content', async () => {
      const logs = await logAggregator.searchLogs('memory usage');
      
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('memory usage');
      expect(logs[0].service).toBe('ml-pipeline');
    });

    it('should limit query results', async () => {
      const logs = await logAggregator.queryLogs({ limit: 2 });
      
      expect(logs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Log Analysis', () => {
    it('should analyze logs and provide statistics', async () => {
      const analysis = await logAggregator.analyzeLogs();
      
      expect(analysis.totalLogs).toBe(3);
      expect(analysis.errorCount).toBe(1);
      expect(analysis.warningCount).toBe(1);
      expect(analysis.serviceBreakdown['api-gateway']).toBe(1);
      expect(analysis.serviceBreakdown['data-ingestion']).toBe(1);
      expect(analysis.serviceBreakdown['ml-pipeline']).toBe(1);
      expect(analysis.levelBreakdown['info']).toBe(1);
      expect(analysis.levelBreakdown['error']).toBe(1);
      expect(analysis.levelBreakdown['warn']).toBe(1);
    });

    it('should identify top errors', async () => {
      const analysis = await logAggregator.analyzeLogs();
      
      expect(analysis.topErrors).toHaveLength(1);
      expect(analysis.topErrors[0].message).toBe('Database connection failed');
      expect(analysis.topErrors[0].service).toBe('data-ingestion');
      expect(analysis.topErrors[0].count).toBe(1);
    });
  });

  describe('Log Export', () => {
    it('should export logs in JSON format', async () => {
      const exportData = await logAggregator.exportLogs({}, 'json');
      
      expect(() => JSON.parse(exportData)).not.toThrow();
      const parsedData = JSON.parse(exportData);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(3);
    });

    it('should export logs in CSV format', async () => {
      const exportData = await logAggregator.exportLogs({}, 'csv');
      
      const lines = exportData.split('\n');
      expect(lines[0]).toContain('timestamp,level,service,correlationId,message,userId');
      expect(lines).toHaveLength(4); // Header + 3 data rows
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed log entries gracefully', async () => {
      const malformedContent = 'invalid json line\n{"valid": "json"}\nanother invalid line';
      await fs.writeFile(path.join(testLogDir, 'malformed.log'), malformedContent);
      
      const logs = await logAggregator.queryLogs({});
      
      // Should only return valid entries (3 from beforeEach + 1 valid from malformed file)
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle missing log directory gracefully', async () => {
      const nonExistentAggregator = new LogAggregator('non-existent-dir');
      const logs = await nonExistentAggregator.queryLogs({});
      
      expect(logs).toEqual([]);
      nonExistentAggregator.destroy();
    });
  });
});