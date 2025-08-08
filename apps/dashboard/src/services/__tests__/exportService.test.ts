import { exportService } from '../exportService';
import { ExportOptions, ExportFormat } from '../../types/export';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  size: content[0].length,
  type: options?.type || 'text/plain',
})) as any;

// Mock canvas
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    font: '',
    fillText: jest.fn(),
  })),
  toBlob: jest.fn((callback) => {
    callback(new Blob(['mock-image-data'], { type: 'image/png' }));
  }),
};

global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return {
    href: '',
    download: '',
    click: jest.fn(),
  } as any;
});

global.document.body.appendChild = jest.fn();
global.document.body.removeChild = jest.fn();

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing jobs
    const jobs = exportService.getExportHistory();
    jobs.forEach(job => {
      exportService.deleteExport(job.id);
    });
  });

  describe('startExport', () => {
    it('should create a new export job', async () => {
      const options: ExportOptions = {
        format: 'csv',
        name: 'test-export',
        metadata: {
          dataType: 'dashboard',
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      
      const job = exportService.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.name).toBe('test-export');
      expect(job?.format).toBe('csv');
    });

    it('should generate default name if not provided', async () => {
      const options: ExportOptions = {
        format: 'json',
        metadata: {
          dataType: 'tasks',
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.name).toMatch(/^Export_\d+$/);
    });

    it('should handle async exports', async () => {
      const options: ExportOptions = {
        format: 'csv',
        name: 'async-export',
        metadata: {
          dataType: 'analytics',
        },
        async: true,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      // Job should start processing immediately for async exports
      expect(job?.status).toMatch(/pending|processing/);
      
      // Wait for processing to start if it hasn't already
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedJob = exportService.getJobStatus(jobId);
      expect(updatedJob?.status).toBe('processing');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for valid job ID', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        name: 'status-test',
        metadata: {
          dataType: 'chart',
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.name).toBe('status-test');
    });

    it('should return null for invalid job ID', () => {
      const job = exportService.getJobStatus('invalid-id');
      expect(job).toBeNull();
    });
  });

  describe('cancelExport', () => {
    it('should cancel a processing export', async () => {
      const options: ExportOptions = {
        format: 'csv',
        name: 'cancel-test',
        metadata: {
          dataType: 'dashboard',
        },
        async: true,
      };

      const jobId = await exportService.startExport(options);
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cancelled = await exportService.cancelExport(jobId);
      expect(cancelled).toBe(true);
      
      const job = exportService.getJobStatus(jobId);
      expect(job?.status).toBe('cancelled');
    });

    it('should not cancel completed exports', async () => {
      const options: ExportOptions = {
        format: 'json',
        name: 'completed-test',
        metadata: {
          dataType: 'tasks',
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      
      // Job should be completed immediately for sync exports
      const cancelled = await exportService.cancelExport(jobId);
      expect(cancelled).toBe(false);
    });

    it('should return false for invalid job ID', async () => {
      const cancelled = await exportService.cancelExport('invalid-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should track progress updates', async () => {
      const progressUpdates: any[] = [];
      
      const options: ExportOptions = {
        format: 'csv',
        name: 'progress-test',
        metadata: {
          dataType: 'analytics',
        },
        async: true,
      };

      const jobId = await exportService.startExport(options);
      
      exportService.onProgress(jobId, (progress) => {
        progressUpdates.push(progress);
      });

      // Wait for some progress updates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].jobId).toBe(jobId);
      
      exportService.offProgress(jobId);
    });
  });

  describe('export history', () => {
    it('should return export history sorted by creation date', async () => {
      const options1: ExportOptions = {
        format: 'csv',
        name: 'export-1',
        metadata: { dataType: 'dashboard' },
        async: false,
      };

      const options2: ExportOptions = {
        format: 'json',
        name: 'export-2',
        metadata: { dataType: 'tasks' },
        async: false,
      };

      const jobId1 = await exportService.startExport(options1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const jobId2 = await exportService.startExport(options2);

      const history = exportService.getExportHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe(jobId2); // Most recent first
      expect(history[1].id).toBe(jobId1);
    });
  });

  describe('deleteExport', () => {
    it('should delete export job', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        name: 'delete-test',
        metadata: { dataType: 'chart' },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      
      let job = exportService.getJobStatus(jobId);
      expect(job).toBeDefined();
      
      const deleted = await exportService.deleteExport(jobId);
      expect(deleted).toBe(true);
      
      job = exportService.getJobStatus(jobId);
      expect(job).toBeNull();
    });

    it('should return false for invalid job ID', async () => {
      const deleted = await exportService.deleteExport('invalid-id');
      expect(deleted).toBe(false);
    });
  });

  describe('format-specific exports', () => {
    it('should generate CSV export', async () => {
      const options: ExportOptions = {
        format: 'csv',
        name: 'csv-test',
        metadata: { dataType: 'dashboard' },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.downloadUrl).toBeDefined();
      expect(job?.format).toBe('csv');
    });

    it('should generate JSON export', async () => {
      const options: ExportOptions = {
        format: 'json',
        name: 'json-test',
        metadata: { dataType: 'tasks' },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.downloadUrl).toBeDefined();
      expect(job?.format).toBe('json');
    });

    it('should generate PDF export', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        name: 'pdf-test',
        metadata: { dataType: 'analytics' },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.downloadUrl).toBeDefined();
      expect(job?.format).toBe('pdf');
    });

    it('should generate PNG export', async () => {
      const options: ExportOptions = {
        format: 'png',
        name: 'png-test',
        metadata: { dataType: 'chart' },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.downloadUrl).toBeDefined();
      expect(job?.format).toBe('png');
    });

    it('should throw error for unsupported format', async () => {
      const options: ExportOptions = {
        format: 'unsupported' as ExportFormat,
        name: 'unsupported-test',
        metadata: { dataType: 'dashboard' },
        async: false,
      };

      await expect(exportService.startExport(options)).rejects.toThrow();
    });
  });

  describe('data filtering', () => {
    it('should apply date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const options: ExportOptions = {
        format: 'csv',
        name: 'filtered-test',
        metadata: {
          dataType: 'analytics',
          dateRange: {
            start: startDate,
            end: endDate,
          },
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.metadata.dateRange).toEqual({
        start: startDate,
        end: endDate,
      });
    });

    it('should apply custom field selection', async () => {
      const customFields = ['id', 'name', 'value'];
      
      const options: ExportOptions = {
        format: 'json',
        name: 'fields-test',
        metadata: {
          dataType: 'dashboard',
          customFields,
        },
        async: false,
      };

      const jobId = await exportService.startExport(options);
      const job = exportService.getJobStatus(jobId);
      
      expect(job?.status).toBe('completed');
      expect(job?.metadata.customFields).toEqual(customFields);
    });
  });
});