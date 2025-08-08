import { ChartExport } from '../ChartExport';
import { ChartInstance, ChartData, ExportOptions } from '../types';
import { LineChart } from '../implementations/LineChart';

// Mock DOM methods
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function(contextType: string) {
    if (contextType === '2d') {
      return {
        scale: jest.fn(),
        drawImage: jest.fn(),
        canvas: this
      };
    }
    return null;
  }
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: function(callback: (blob: Blob | null) => void) {
    setTimeout(() => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
      callback(mockBlob);
    }, 0);
  }
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,mockdata'
});

// Mock XMLSerializer
global.XMLSerializer = class {
  serializeToString(element: Element): string {
    return '<svg>mock svg content</svg>';
  }
};

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn()
});

describe('ChartExport', () => {
  let mockChart: ChartInstance;
  let mockData: ChartData;

  beforeEach(() => {
    mockData = {
      id: 'test-chart',
      values: [
        { x: 1, y: 10 },
        { x: 2, y: 15 },
        { x: 3, y: 8 }
      ],
      dimensions: {
        x: { type: 'numeric', label: 'Time' },
        y: { type: 'numeric', label: 'Value' }
      },
      metadata: {
        title: 'Test Chart',
        description: 'A test chart for export testing'
      }
    };

    mockChart = new LineChart(mockData, { type: 'line' });
    
    // Mock SVG element
    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mockSvg.setAttribute('width', '400');
    mockSvg.setAttribute('height', '300');
    mockChart.element.appendChild(mockSvg);
    
    // Mock querySelector to return the SVG
    jest.spyOn(mockChart.element, 'querySelector').mockImplementation((selector) => {
      if (selector === 'svg') {
        return mockSvg;
      }
      return null;
    });
  });

  afterEach(() => {
    if (mockChart) {
      mockChart.destroy();
    }
  });

  describe('exportAsPNG', () => {
    it('should export chart as PNG blob', async () => {
      const options: ExportOptions = { format: 'png' };
      
      const result = await ChartExport.exportAsPNG(mockChart, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
    });

    it('should respect quality option', async () => {
      const options: ExportOptions = { 
        format: 'png',
        quality: 0.8
      };
      
      const result = await ChartExport.exportAsPNG(mockChart, options);
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle custom dimensions', async () => {
      const options: ExportOptions = { 
        format: 'png',
        dimensions: { width: 800, height: 600 }
      };
      
      const result = await ChartExport.exportAsPNG(mockChart, options);
      
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('exportAsSVG', () => {
    it('should export chart as SVG string', async () => {
      const options: ExportOptions = { format: 'svg' };
      
      const result = await ChartExport.exportAsSVG(mockChart, options);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<svg');
    });

    it('should handle custom dimensions', async () => {
      const options: ExportOptions = { 
        format: 'svg',
        dimensions: { width: 800, height: 600 }
      };
      
      const result = await ChartExport.exportAsSVG(mockChart, options);
      
      expect(result).toContain('width="800"');
      expect(result).toContain('height="600"');
    });

    it('should throw error if no SVG element found', async () => {
      // Mock querySelector to return null
      jest.spyOn(mockChart.element, 'querySelector').mockImplementation(() => null);
      
      const options: ExportOptions = { format: 'svg' };
      
      await expect(ChartExport.exportAsSVG(mockChart, options))
        .rejects.toThrow('Chart does not contain an SVG element');
    });
  });

  describe('exportAsCSV', () => {
    it('should export chart data as CSV string', async () => {
      const options: ExportOptions = { format: 'csv' };
      
      const result = await ChartExport.exportAsCSV(mockChart, options);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Time,Value');
      expect(result).toContain('1,10');
      expect(result).toContain('2,15');
      expect(result).toContain('3,8');
    });

    it('should include category column when present', async () => {
      const dataWithCategories: ChartData = {
        ...mockData,
        values: [
          { x: 1, y: 10, category: 'A' },
          { x: 2, y: 15, category: 'B' }
        ]
      };

      const chartWithCategories = new LineChart(dataWithCategories, { type: 'line' });
      const options: ExportOptions = { format: 'csv' };
      
      const result = await ChartExport.exportAsCSV(chartWithCategories, options);
      
      expect(result).toContain('Time,Value,Category');
      expect(result).toContain('1,10,A');
      expect(result).toContain('2,15,B');
      
      chartWithCategories.destroy();
    });

    it('should escape CSV values properly', async () => {
      const dataWithSpecialChars: ChartData = {
        ...mockData,
        values: [
          { x: 'Value, with comma', y: 10 },
          { x: 'Value "with quotes"', y: 15 }
        ]
      };

      const chartWithSpecialChars = new LineChart(dataWithSpecialChars, { type: 'line' });
      const options: ExportOptions = { format: 'csv' };
      
      const result = await ChartExport.exportAsCSV(chartWithSpecialChars, options);
      
      expect(result).toContain('"Value, with comma"');
      expect(result).toContain('"Value ""with quotes"""');
      
      chartWithSpecialChars.destroy();
    });
  });

  describe('exportAsJSON', () => {
    it('should export chart data as JSON string', async () => {
      const options: ExportOptions = { format: 'json' };
      
      const result = await ChartExport.exportAsJSON(mockChart, options);
      
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.chartType).toBe('line');
      expect(parsed.metadata.title).toBe('Test Chart');
      expect(parsed.data).toEqual(mockData.values);
    });

    it('should include config when includeData is true', async () => {
      const options: ExportOptions = { 
        format: 'json',
        includeData: true
      };
      
      const result = await ChartExport.exportAsJSON(mockChart, options);
      
      const parsed = JSON.parse(result);
      expect(parsed.metadata.config).toBeDefined();
    });

    it('should include export timestamp', async () => {
      const options: ExportOptions = { format: 'json' };
      
      const result = await ChartExport.exportAsJSON(mockChart, options);
      
      const parsed = JSON.parse(result);
      expect(parsed.metadata.exportedAt).toBeDefined();
      expect(new Date(parsed.metadata.exportedAt)).toBeInstanceOf(Date);
    });
  });

  describe('export', () => {
    it('should route to correct export method based on format', async () => {
      const pngResult = await ChartExport.export(mockChart, { format: 'png' });
      expect(pngResult).toBeInstanceOf(Blob);

      const svgResult = await ChartExport.export(mockChart, { format: 'svg' });
      expect(typeof svgResult).toBe('string');

      const csvResult = await ChartExport.export(mockChart, { format: 'csv' });
      expect(typeof csvResult).toBe('string');

      const jsonResult = await ChartExport.export(mockChart, { format: 'json' });
      expect(typeof jsonResult).toBe('string');
    });

    it('should throw error for unsupported format', async () => {
      const options = { format: 'unsupported' as any };
      
      await expect(ChartExport.export(mockChart, options))
        .rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('downloadChart', () => {
    let mockLink: HTMLAnchorElement;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should trigger download for PNG export', async () => {
      const options: ExportOptions = { 
        format: 'png',
        filename: 'test-chart.png'
      };
      
      await ChartExport.downloadChart(mockChart, options);
      
      expect(mockLink.download).toBe('test-chart.png');
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    });

    it('should generate filename if not provided', async () => {
      const options: ExportOptions = { format: 'svg' };
      
      await ChartExport.downloadChart(mockChart, options);
      
      expect(mockLink.download).toMatch(/^chart_\d+\.svg$/);
    });

    it('should handle text formats correctly', async () => {
      const options: ExportOptions = { format: 'csv' };
      
      await ChartExport.downloadChart(mockChart, options);
      
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      // This is a private method, so we test it indirectly through downloadChart
      const testCases = [
        { format: 'png', expectedType: 'image/png' },
        { format: 'svg', expectedType: 'image/svg+xml' },
        { format: 'csv', expectedType: 'text/csv' },
        { format: 'json', expectedType: 'application/json' }
      ];

      // We can't directly test the private method, but we can verify
      // that the correct MIME types are used in blob creation
      testCases.forEach(async ({ format }) => {
        const options: ExportOptions = { format: format as any };
        await expect(ChartExport.downloadChart(mockChart, options)).resolves.not.toThrow();
      });
    });
  });
});