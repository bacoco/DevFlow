import { ChartFactory } from '../ChartFactory';
import { ChartData, ChartType } from '../types';

describe('ChartFactory', () => {
  let factory: ChartFactory;
  
  beforeEach(() => {
    factory = ChartFactory.getInstance();
  });

  describe('suggestChartType', () => {
    it('should suggest line chart for temporal data', () => {
      const data: ChartData = {
        id: 'test-1',
        values: [
          { x: new Date('2023-01-01'), y: 10 },
          { x: new Date('2023-01-02'), y: 15 },
          { x: new Date('2023-01-03'), y: 12 }
        ],
        dimensions: {
          x: { type: 'temporal', label: 'Date' },
          y: { type: 'numeric', label: 'Value' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('line');
      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
      expect(suggestions[0].reasoning).toContain('temporal');
    });

    it('should suggest bar chart for categorical data', () => {
      const data: ChartData = {
        id: 'test-2',
        values: [
          { x: 'Category A', y: 10 },
          { x: 'Category B', y: 15 },
          { x: 'Category C', y: 12 }
        ],
        dimensions: {
          x: { type: 'categorical', label: 'Category' },
          y: { type: 'numeric', label: 'Value' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('bar');
      expect(suggestions[0].confidence).toBeGreaterThan(0.7);
    });

    it('should suggest scatter plot for numeric data with high variance', () => {
      const data: ChartData = {
        id: 'test-3',
        values: [
          { x: 1, y: 10 },
          { x: 2, y: 50 },
          { x: 3, y: 5 },
          { x: 4, y: 80 },
          { x: 5, y: 15 }
        ],
        dimensions: {
          x: { type: 'numeric', label: 'X Value' },
          y: { type: 'numeric', label: 'Y Value' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      const scatterSuggestion = suggestions.find(s => s.type === 'scatter');
      expect(scatterSuggestion).toBeDefined();
      expect(scatterSuggestion!.reasoning).toContain('variance');
    });

    it('should suggest area chart for temporal data with categories', () => {
      const data: ChartData = {
        id: 'test-4',
        values: [
          { x: new Date('2023-01-01'), y: 10, category: 'Series A' },
          { x: new Date('2023-01-02'), y: 15, category: 'Series A' },
          { x: new Date('2023-01-01'), y: 8, category: 'Series B' },
          { x: new Date('2023-01-02'), y: 12, category: 'Series B' }
        ],
        dimensions: {
          x: { type: 'temporal', label: 'Date' },
          y: { type: 'numeric', label: 'Value' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      const areaSuggestion = suggestions.find(s => s.type === 'area');
      expect(areaSuggestion).toBeDefined();
      expect(areaSuggestion!.reasoning).toContain('composition over time');
    });

    it('should suggest heatmap for categorical data with multiple dimensions', () => {
      const data: ChartData = {
        id: 'test-5',
        values: Array.from({ length: 20 }, (_, i) => ({
          x: `Item ${i % 10}`,
          y: Math.random() * 100,
          category: `Category ${Math.floor(i / 5)}`
        })),
        dimensions: {
          x: { type: 'categorical', label: 'Item' },
          y: { type: 'numeric', label: 'Value' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      const heatmapSuggestion = suggestions.find(s => s.type === 'heatmap');
      expect(heatmapSuggestion).toBeDefined();
    });

    it('should return suggestions sorted by confidence', () => {
      const data: ChartData = {
        id: 'test-6',
        values: [
          { x: 1, y: 10 },
          { x: 2, y: 15 },
          { x: 3, y: 12 }
        ],
        dimensions: {
          x: { type: 'numeric', label: 'X' },
          y: { type: 'numeric', label: 'Y' }
        }
      };

      const suggestions = factory.suggestChartType(data);
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('createChart', () => {
    it('should create a line chart instance', () => {
      const data: ChartData = {
        id: 'test-chart',
        values: [
          { x: 1, y: 10 },
          { x: 2, y: 15 },
          { x: 3, y: 12 }
        ],
        dimensions: {
          x: { type: 'numeric', label: 'X' },
          y: { type: 'numeric', label: 'Y' }
        }
      };

      const config = { type: 'line' as ChartType };
      const chart = factory.createChart(data, config);

      expect(chart).toBeDefined();
      expect(chart.type).toBe('line');
      expect(chart.data).toBe(data);
      expect(chart.element).toBeInstanceOf(HTMLElement);
    });

    it('should create a bar chart instance', () => {
      const data: ChartData = {
        id: 'test-chart',
        values: [
          { x: 'A', y: 10 },
          { x: 'B', y: 15 },
          { x: 'C', y: 12 }
        ],
        dimensions: {
          x: { type: 'categorical', label: 'Category' },
          y: { type: 'numeric', label: 'Value' }
        }
      };

      const config = { type: 'bar' as ChartType };
      const chart = factory.createChart(data, config);

      expect(chart).toBeDefined();
      expect(chart.type).toBe('bar');
      expect(chart.data).toBe(data);
    });

    it('should throw error for unsupported chart type', () => {
      const data: ChartData = {
        id: 'test-chart',
        values: [{ x: 1, y: 10 }],
        dimensions: {
          x: { type: 'numeric', label: 'X' },
          y: { type: 'numeric', label: 'Y' }
        }
      };

      const config = { type: 'unsupported' as ChartType };
      
      expect(() => factory.createChart(data, config)).toThrow();
    });
  });

  describe('optimizeForMobile', () => {
    it('should create mobile-optimized chart', () => {
      const data: ChartData = {
        id: 'test-chart',
        values: [{ x: 1, y: 10 }],
        dimensions: {
          x: { type: 'numeric', label: 'X' },
          y: { type: 'numeric', label: 'Y' }
        }
      };

      const originalChart = factory.createChart(data, { 
        type: 'line',
        width: 800,
        height: 600
      });

      const mobileChart = factory.optimizeForMobile(originalChart);

      expect(mobileChart.config.width).toBeLessThanOrEqual(350);
      expect(mobileChart.config.height).toBeLessThanOrEqual(250);
      expect(mobileChart.config.interactions?.zoom).toBe(true);
      expect(mobileChart.config.interactions?.pan).toBe(true);
    });
  });

  describe('addInteractivity', () => {
    it('should add specified interactions to chart', () => {
      const data: ChartData = {
        id: 'test-chart',
        values: [{ x: 1, y: 10 }],
        dimensions: {
          x: { type: 'numeric', label: 'X' },
          y: { type: 'numeric', label: 'Y' }
        }
      };

      const originalChart = factory.createChart(data, { type: 'line' });
      const interactiveChart = factory.addInteractivity(originalChart, ['zoom', 'brush']);

      expect(interactiveChart.config.interactions?.zoom).toBe(true);
      expect(interactiveChart.config.interactions?.brush).toBe(true);
      expect(interactiveChart.config.interactions?.pan).toBe(false);
    });
  });
});