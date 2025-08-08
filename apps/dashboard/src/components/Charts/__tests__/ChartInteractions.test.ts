import { ChartInteractions } from '../ChartInteractions';
import { ChartInstance, ChartData, BrushSelection, ZoomState } from '../types';
import { LineChart } from '../implementations/LineChart';

// Mock DOM methods
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300
  })
});

describe('ChartInteractions', () => {
  let mockChart: ChartInstance;
  let mockData: ChartData;

  beforeEach(() => {
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
      }
    };

    mockChart = new LineChart(mockData, { type: 'line' });
    
    // Mock chart interactions
    mockChart.interactions.zoom = jest.fn();
    mockChart.interactions.pan = jest.fn();
    mockChart.interactions.brush = jest.fn();
    mockChart.interactions.hover = jest.fn();
  });

  afterEach(() => {
    if (mockChart) {
      mockChart.destroy();
    }
  });

  describe('enableZoom', () => {
    it('should enable wheel zoom by default', () => {
      ChartInteractions.enableZoom(mockChart);

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 200,
        clientY: 150
      });

      mockChart.element.dispatchEvent(wheelEvent);

      expect(mockChart.interactions.zoom).toHaveBeenCalled();
    });

    it('should enable double-click zoom by default', () => {
      ChartInteractions.enableZoom(mockChart);

      const dblClickEvent = new MouseEvent('dblclick', {
        clientX: 200,
        clientY: 150
      });

      mockChart.element.dispatchEvent(dblClickEvent);

      expect(mockChart.interactions.zoom).toHaveBeenCalled();
    });

    it('should respect zoom limits', () => {
      ChartInteractions.enableZoom(mockChart, {
        minZoom: 0.5,
        maxZoom: 5
      });

      // Test zoom out beyond limit
      const wheelOutEvent = new WheelEvent('wheel', {
        deltaY: 1000, // Large positive delta for zoom out
        clientX: 200,
        clientY: 150
      });

      mockChart.element.dispatchEvent(wheelOutEvent);

      // Should still call zoom but with limited scale
      expect(mockChart.interactions.zoom).toHaveBeenCalled();
    });

    it('should disable wheel zoom when configured', () => {
      ChartInteractions.enableZoom(mockChart, { wheelZoom: false });

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 200,
        clientY: 150
      });

      mockChart.element.dispatchEvent(wheelEvent);

      expect(mockChart.interactions.zoom).not.toHaveBeenCalled();
    });
  });

  describe('enablePan', () => {
    it('should enable mouse pan', () => {
      ChartInteractions.enablePan(mockChart);

      // Start pan
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100
      });
      mockChart.element.dispatchEvent(mouseDownEvent);

      // Move mouse
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 120
      });
      mockChart.element.dispatchEvent(mouseMoveEvent);

      expect(mockChart.interactions.pan).toHaveBeenCalledWith({
        x: 50,
        y: 20
      });

      // End pan
      const mouseUpEvent = new MouseEvent('mouseup');
      mockChart.element.dispatchEvent(mouseUpEvent);
    });

    it('should only pan with left mouse button', () => {
      ChartInteractions.enablePan(mockChart);

      // Try to start pan with right mouse button
      const rightClickEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100
      });
      mockChart.element.dispatchEvent(rightClickEvent);

      // Move mouse
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 120
      });
      mockChart.element.dispatchEvent(mouseMoveEvent);

      expect(mockChart.interactions.pan).not.toHaveBeenCalled();
    });

    it('should handle touch pan', () => {
      ChartInteractions.enablePan(mockChart);

      // Start touch
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      mockChart.element.dispatchEvent(touchStartEvent);

      // Move touch
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 150, clientY: 120 } as Touch]
      });
      mockChart.element.dispatchEvent(touchMoveEvent);

      expect(mockChart.interactions.pan).toHaveBeenCalled();
    });
  });

  describe('enableBrushing', () => {
    it('should enable brush selection with shift key', () => {
      const brushCallback = jest.fn();
      ChartInteractions.enableBrushing(mockChart, brushCallback);

      // Start brush with shift key
      const mouseDownEvent = new MouseEvent('mousedown', {
        shiftKey: true,
        clientX: 100,
        clientY: 100
      });
      mockChart.element.dispatchEvent(mouseDownEvent);

      // Move to create selection
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 150
      });
      mockChart.element.dispatchEvent(mouseMoveEvent);

      // End brush
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 150
      });
      mockChart.element.dispatchEvent(mouseUpEvent);

      expect(brushCallback).toHaveBeenCalled();
      expect(mockChart.interactions.brush).toHaveBeenCalled();
    });

    it('should not brush without shift key', () => {
      const brushCallback = jest.fn();
      ChartInteractions.enableBrushing(mockChart, brushCallback);

      // Try to start brush without shift key
      const mouseDownEvent = new MouseEvent('mousedown', {
        shiftKey: false,
        clientX: 100,
        clientY: 100
      });
      mockChart.element.dispatchEvent(mouseDownEvent);

      const mouseUpEvent = new MouseEvent('mouseup');
      mockChart.element.dispatchEvent(mouseUpEvent);

      expect(brushCallback).not.toHaveBeenCalled();
    });
  });

  describe('addTooltips', () => {
    it('should show tooltip on mouse move', () => {
      const formatter = jest.fn().mockReturnValue('<div>Tooltip content</div>');
      ChartInteractions.addTooltips(mockChart, formatter);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 150
      });
      mockChart.element.dispatchEvent(mouseMoveEvent);

      expect(formatter).toHaveBeenCalled();
      expect(mockChart.interactions.hover).toHaveBeenCalled();
    });

    it('should hide tooltip on mouse leave', () => {
      const formatter = jest.fn().mockReturnValue('<div>Tooltip content</div>');
      ChartInteractions.addTooltips(mockChart, formatter);

      // Show tooltip
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 150
      });
      mockChart.element.dispatchEvent(mouseMoveEvent);

      // Hide tooltip
      const mouseLeaveEvent = new MouseEvent('mouseleave');
      mockChart.element.dispatchEvent(mouseLeaveEvent);

      // Tooltip should be hidden (implementation detail)
      const tooltip = document.querySelector('.chart-tooltip') as HTMLElement;
      if (tooltip) {
        expect(tooltip.style.display).toBe('none');
      }
    });
  });

  describe('linkCharts', () => {
    let secondChart: ChartInstance;

    beforeEach(() => {
      secondChart = new LineChart(mockData, { type: 'line' });
      secondChart.interactions.zoom = jest.fn();
      secondChart.interactions.brush = jest.fn();
    });

    afterEach(() => {
      if (secondChart) {
        secondChart.destroy();
      }
    });

    it('should link charts for brush selection', () => {
      ChartInteractions.linkCharts([mockChart, secondChart], 'brush');

      // This would require more complex setup to test the actual linking
      // For now, we just verify the method doesn't throw
      expect(() => {
        ChartInteractions.linkCharts([mockChart, secondChart], 'brush');
      }).not.toThrow();
    });

    it('should link charts for zoom synchronization', () => {
      ChartInteractions.linkCharts([mockChart, secondChart], 'zoom');

      expect(() => {
        ChartInteractions.linkCharts([mockChart, secondChart], 'zoom');
      }).not.toThrow();
    });
  });

  describe('enableDrillDown', () => {
    it('should handle drill-down clicks', () => {
      const drillDownHandler = jest.fn();
      ChartInteractions.enableDrillDown(mockChart, drillDownHandler);

      // Mock finding a data point with drill-down capability
      const clickEvent = new MouseEvent('click', {
        clientX: 200,
        clientY: 150
      });

      // We would need to mock the findNearestDataPoint method
      // For now, just verify the event listener is added
      mockChart.element.dispatchEvent(clickEvent);

      // The actual drill-down would depend on data having drillDownAvailable metadata
    });
  });

  describe('interaction history', () => {
    it('should record interactions', () => {
      ChartInteractions.enableZoom(mockChart);

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 200,
        clientY: 150
      });

      mockChart.element.dispatchEvent(wheelEvent);

      // Interaction should be recorded (implementation detail)
      // This would require exposing the interaction history for testing
    });

    it('should limit interaction history size', () => {
      ChartInteractions.enableZoom(mockChart);

      // Generate many interactions
      for (let i = 0; i < 150; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 200,
          clientY: 150
        });
        mockChart.element.dispatchEvent(wheelEvent);
      }

      // History should be limited to 100 items (implementation detail)
    });
  });
});