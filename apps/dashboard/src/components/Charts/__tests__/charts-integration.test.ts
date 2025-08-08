import { chartFactory } from '../ChartFactory';
import { ChartAccessibility } from '../ChartAccessibility';
import { ChartInteractions } from '../ChartInteractions';
import { ChartExport } from '../ChartExport';
import { ChartData } from '../types';

describe('Charts Integration', () => {
  const sampleData: ChartData = {
    id: 'integration-test',
    values: [
      { x: 1, y: 10 },
      { x: 2, y: 15 },
      { x: 3, y: 8 },
      { x: 4, y: 20 },
      { x: 5, y: 12 }
    ],
    dimensions: {
      x: { type: 'numeric', label: 'Time' },
      y: { type: 'numeric', label: 'Value' }
    },
    metadata: {
      title: 'Integration Test Chart',
      description: 'A chart for testing integration'
    }
  };

  describe('Chart Factory Integration', () => {
    it('should suggest appropriate chart types', () => {
      const suggestions = chartFactory.suggestChartType(sampleData);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('type');
      expect(suggestions[0]).toHaveProperty('confidence');
      expect(suggestions[0]).toHaveProperty('reasoning');
      expect(suggestions[0]).toHaveProperty('suitability');
    });

    it('should create chart instances', () => {
      const chart = chartFactory.createChart(sampleData, { type: 'line' });
      
      expect(chart).toBeDefined();
      expect(chart.type).toBe('line');
      expect(chart.data).toBe(sampleData);
      expect(chart.element).toBeInstanceOf(HTMLElement);
      expect(chart.interactions).toBeDefined();
      expect(chart.accessibility).toBeDefined();
      expect(typeof chart.export).toBe('function');
      expect(typeof chart.destroy).toBe('function');
      
      chart.destroy();
    });
  });

  describe('Accessibility Integration', () => {
    it('should generate comprehensive accessibility information', () => {
      const chart = chartFactory.createChart(sampleData, { type: 'line' });
      const accessibilityInfo = ChartAccessibility.createAccessibilityInfo(chart);
      
      expect(accessibilityInfo.altText).toBeTruthy();
      expect(accessibilityInfo.dataTable).toBeDefined();
      expect(accessibilityInfo.dataTable.headers).toEqual(['Time', 'Value']);
      expect(accessibilityInfo.dataTable.rows.length).toBe(5);
      expect(accessibilityInfo.summary).toBeTruthy();
      expect(accessibilityInfo.trends).toBeInstanceOf(Array);
      
      chart.destroy();
    });

    it('should add keyboard navigation', () => {
      const chart = chartFactory.createChart(sampleData, { 
        type: 'line',
        accessibility: { enabled: true, keyboardNavigation: true }
      });
      
      ChartAccessibility.addKeyboardNavigation(chart);
      
      expect(chart.element.getAttribute('tabindex')).toBe('0');
      expect(chart.element.getAttribute('role')).toBe('img');
      expect(chart.element.getAttribute('aria-label')).toBeTruthy();
      
      chart.destroy();
    });
  });

  describe('Export Integration', () => {
    it('should export charts in different formats', async () => {
      const chart = chartFactory.createChart(sampleData, { type: 'line' });
      
      // Mock SVG element for export
      const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chart.element.appendChild(mockSvg);
      
      // Test CSV export
      const csvResult = await ChartExport.exportAsCSV(chart);
      expect(typeof csvResult).toBe('string');
      expect(csvResult).toContain('Time,Value');
      
      // Test JSON export
      const jsonResult = await ChartExport.exportAsJSON(chart);
      expect(typeof jsonResult).toBe('string');
      const parsed = JSON.parse(jsonResult);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.data).toBeDefined();
      
      chart.destroy();
    });
  });

  describe('Mobile Optimization', () => {
    it('should optimize charts for mobile', () => {
      const originalChart = chartFactory.createChart(sampleData, { 
        type: 'line',
        width: 800,
        height: 600
      });
      
      const mobileChart = chartFactory.optimizeForMobile(originalChart);
      
      expect(mobileChart.config.width).toBeLessThanOrEqual(350);
      expect(mobileChart.config.height).toBeLessThanOrEqual(250);
      expect(mobileChart.config.interactions?.zoom).toBe(true);
      expect(mobileChart.config.interactions?.pan).toBe(true);
      
      originalChart.destroy();
      mobileChart.destroy();
    });
  });

  describe('Interactive Features', () => {
    it('should add interactive capabilities', () => {
      const originalChart = chartFactory.createChart(sampleData, { type: 'line' });
      const interactiveChart = chartFactory.addInteractivity(originalChart, ['zoom', 'brush']);
      
      expect(interactiveChart.config.interactions?.zoom).toBe(true);
      expect(interactiveChart.config.interactions?.brush).toBe(true);
      
      originalChart.destroy();
      interactiveChart.destroy();
    });

    it('should handle chart linking', () => {
      const chart1 = chartFactory.createChart(sampleData, { type: 'line' });
      const chart2 = chartFactory.createChart(sampleData, { type: 'bar' });
      
      // Test that linking doesn't throw errors
      expect(() => {
        ChartInteractions.linkCharts([chart1, chart2], 'brush');
      }).not.toThrow();
      
      chart1.destroy();
      chart2.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid chart types gracefully', () => {
      expect(() => {
        chartFactory.createChart(sampleData, { type: 'invalid' as any });
      }).toThrow('Chart type "invalid" is not supported');
    });

    it('should handle empty data gracefully', () => {
      const emptyData: ChartData = {
        ...sampleData,
        values: []
      };
      
      const suggestions = chartFactory.suggestChartType(emptyData);
      expect(suggestions).toBeInstanceOf(Array);
      
      const chart = chartFactory.createChart(emptyData, { type: 'line' });
      expect(chart).toBeDefined();
      
      chart.destroy();
    });
  });
});