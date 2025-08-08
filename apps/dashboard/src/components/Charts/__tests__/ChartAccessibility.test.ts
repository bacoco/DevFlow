import { ChartAccessibility } from '../ChartAccessibility';
import { ChartInstance, ChartData } from '../types';
import { LineChart } from '../implementations/LineChart';

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    length: 0,
    [Symbol.iterator]: function* () {}
  })
});

describe('ChartAccessibility', () => {
  let mockChart: ChartInstance;
  let mockData: ChartData;

  beforeEach(() => {
    // Create mock data
    mockData = {
      id: 'test-chart',
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
        title: 'Test Chart',
        description: 'A test chart for accessibility testing'
      }
    };

    // Create mock chart instance
    mockChart = new LineChart(mockData, { type: 'line' });
  });

  afterEach(() => {
    if (mockChart) {
      mockChart.destroy();
    }
  });

  describe('generateAltText', () => {
    it('should generate comprehensive alt text', () => {
      const altText = ChartAccessibility.generateAltText(mockChart);

      expect(altText).toContain('line chart');
      expect(altText).toContain('Value by Time');
      expect(altText).toContain('5 data points');
      expect(altText).toContain('ranges from');
      expect(altText).toContain('average of');
    });

    it('should include trend information', () => {
      const altText = ChartAccessibility.generateAltText(mockChart);

      expect(altText).toMatch(/trend is (increasing|decreasing|stable)/);
    });

    it('should identify patterns when present', () => {
      // Create data with outliers
      const dataWithOutliers: ChartData = {
        ...mockData,
        values: [
          { x: 1, y: 10 },
          { x: 2, y: 12 },
          { x: 3, y: 100 }, // Outlier
          { x: 4, y: 11 },
          { x: 5, y: 13 }
        ]
      };

      const chartWithOutliers = new LineChart(dataWithOutliers, { type: 'line' });
      const altText = ChartAccessibility.generateAltText(chartWithOutliers);

      expect(altText).toContain('outlier');
      
      chartWithOutliers.destroy();
    });
  });

  describe('createDataTable', () => {
    it('should create accessible data table', () => {
      const dataTable = ChartAccessibility.createDataTable(mockChart);

      expect(dataTable.headers).toEqual(['Time', 'Value']);
      expect(dataTable.rows).toHaveLength(5);
      expect(dataTable.rows[0]).toEqual(['1', '10']);
      expect(dataTable.rows[4]).toEqual(['5', '12']);
    });

    it('should include category column when present', () => {
      const dataWithCategories: ChartData = {
        ...mockData,
        values: [
          { x: 1, y: 10, category: 'A' },
          { x: 2, y: 15, category: 'B' }
        ]
      };

      const chartWithCategories = new LineChart(dataWithCategories, { type: 'line' });
      const dataTable = ChartAccessibility.createDataTable(chartWithCategories);

      expect(dataTable.headers).toEqual(['Time', 'Value', 'Category']);
      expect(dataTable.rows[0]).toEqual(['1', '10', 'A']);
      
      chartWithCategories.destroy();
    });
  });

  describe('addKeyboardNavigation', () => {
    it('should make chart focusable', () => {
      ChartAccessibility.addKeyboardNavigation(mockChart);

      expect(mockChart.element.getAttribute('tabindex')).toBe('0');
      expect(mockChart.element.getAttribute('role')).toBe('img');
      expect(mockChart.element.getAttribute('aria-label')).toBeTruthy();
    });

    it('should handle keyboard events', () => {
      ChartAccessibility.addKeyboardNavigation(mockChart);

      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      mockChart.element.dispatchEvent(enterEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();

      // Test Arrow keys
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const arrowPreventDefaultSpy = jest.spyOn(arrowEvent, 'preventDefault');
      
      mockChart.element.dispatchEvent(arrowEvent);
      expect(arrowPreventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('announceDataChanges', () => {
    it('should create and update live region', () => {
      const changes = [{ description: 'Data updated' }];
      
      ChartAccessibility.announceDataChanges(mockChart, changes);

      const liveRegion = document.getElementById('chart-live-region');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.textContent).toContain('Chart updated');
    });

    it('should handle multiple changes', () => {
      const changes = [
        { description: 'Change 1' },
        { description: 'Change 2' },
        { description: 'Change 3' }
      ];
      
      ChartAccessibility.announceDataChanges(mockChart, changes);

      const liveRegion = document.getElementById('chart-live-region');
      expect(liveRegion?.textContent).toContain('3 changes');
    });
  });

  describe('createAccessibilityInfo', () => {
    it('should create comprehensive accessibility information', () => {
      const accessibilityInfo = ChartAccessibility.createAccessibilityInfo(mockChart);

      expect(accessibilityInfo.altText).toBeTruthy();
      expect(accessibilityInfo.dataTable).toBeTruthy();
      expect(accessibilityInfo.summary).toBeTruthy();
      expect(accessibilityInfo.trends).toBeInstanceOf(Array);
      expect(accessibilityInfo.trends.length).toBeGreaterThan(0);
    });

    it('should include trend analysis', () => {
      const accessibilityInfo = ChartAccessibility.createAccessibilityInfo(mockChart);

      expect(accessibilityInfo.trends[0]).toContain('Overall trend:');
    });

    it('should detect significant changes in data', () => {
      // Create data with significant change in second half
      const dataWithChange: ChartData = {
        ...mockData,
        values: [
          { x: 1, y: 5 },
          { x: 2, y: 6 },
          { x: 3, y: 50 }, // Significant increase
          { x: 4, y: 55 },
          { x: 5, y: 60 }
        ]
      };

      const chartWithChange = new LineChart(dataWithChange, { type: 'line' });
      const accessibilityInfo = ChartAccessibility.createAccessibilityInfo(chartWithChange);

      expect(accessibilityInfo.trends.some(trend => 
        trend.includes('increase') || trend.includes('decrease')
      )).toBe(true);
      
      chartWithChange.destroy();
    });
  });

  describe('live region management', () => {
    it('should reuse existing live region', () => {
      // Create first live region
      ChartAccessibility.announceDataChanges(mockChart, [{ description: 'First' }]);
      const firstRegion = document.getElementById('chart-live-region');

      // Create second announcement
      ChartAccessibility.announceDataChanges(mockChart, [{ description: 'Second' }]);
      const secondRegion = document.getElementById('chart-live-region');

      expect(firstRegion).toBe(secondRegion);
    });

    it('should clear live region after announcement', (done) => {
      ChartAccessibility.announceDataChanges(mockChart, [{ description: 'Test' }]);
      const liveRegion = document.getElementById('chart-live-region');
      
      expect(liveRegion?.textContent).toBeTruthy();
      
      // Check that it clears after timeout
      setTimeout(() => {
        expect(liveRegion?.textContent).toBe('');
        done();
      }, 1100);
    });
  });
});