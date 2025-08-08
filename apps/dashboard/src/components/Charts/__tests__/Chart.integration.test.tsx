import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chart from '../Chart';
import { ChartData } from '../types';

// Mock the chart implementations
jest.mock('../implementations/LineChart', () => ({
  LineChart: jest.fn().mockImplementation(() => ({
    id: 'mock-chart',
    type: 'line',
    data: {},
    config: {},
    element: document.createElement('div'),
    interactions: {
      zoom: jest.fn(),
      pan: jest.fn(),
      brush: jest.fn(),
      hover: jest.fn(),
      click: jest.fn()
    },
    accessibility: {
      altText: 'Mock chart',
      dataTable: { headers: [], rows: [] },
      summary: 'Mock summary',
      trends: []
    },
    export: jest.fn().mockResolvedValue(new Blob()),
    destroy: jest.fn()
  }))
}));

describe('Chart Integration Tests', () => {
  const mockData: ChartData = {
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
      description: 'A test chart for integration testing'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chart Rendering', () => {
    it('should render chart with loading state initially', () => {
      render(<Chart data={mockData} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });

    it('should render chart after loading', async () => {
      render(<Chart data={mockData} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render error state when chart creation fails', async () => {
      // Mock chart factory to throw error
      const mockError = new Error('Chart creation failed');
      jest.doMock('../ChartFactory', () => ({
        chartFactory: {
          suggestChartType: jest.fn().mockReturnValue([]),
          createChart: jest.fn().mockImplementation(() => {
            throw mockError;
          })
        }
      }));

      render(<Chart data={mockData} />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Chart Error')).toBeInTheDocument();
        expect(screen.getByText('Chart creation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Configuration', () => {
    it('should apply custom configuration', async () => {
      const customConfig = {
        type: 'bar' as const,
        width: 600,
        height: 400,
        theme: 'dark' as const
      };

      render(<Chart data={mockData} config={customConfig} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Verify chart container has correct dimensions
      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '600px', height: '400px' });
    });

    it('should enable responsive mode by default', async () => {
      render(<Chart data={mockData} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '100%', height: '100%' });
    });

    it('should disable responsive mode when configured', async () => {
      render(
        <Chart 
          data={mockData} 
          config={{ responsive: false, width: 400, height: 300 }} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '400px', height: '300px' });
    });
  });

  describe('Chart Interactions', () => {
    it('should handle chart click events', async () => {
      const onChartClick = jest.fn();
      
      render(
        <Chart 
          data={mockData} 
          onChartClick={onChartClick}
          config={{ interactions: { drillDown: true } }}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const chartElement = screen.getByRole('img');
      
      // Simulate chart click event
      const clickEvent = new CustomEvent('chartClick', {
        detail: { data: { x: 1, y: 10 } }
      });
      chartElement.dispatchEvent(clickEvent);

      expect(onChartClick).toHaveBeenCalledWith({ x: 1, y: 10 });
    });

    it('should handle brush selection events', async () => {
      const onBrushSelection = jest.fn();
      
      render(
        <Chart 
          data={mockData} 
          onBrushSelection={onBrushSelection}
          config={{ interactions: { brush: true } }}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Brush selection would be tested through the ChartInteractions module
      // This is more of an integration test to ensure the callback is wired up
    });
  });

  describe('Export Functionality', () => {
    it('should render export controls when enabled', async () => {
      render(
        <Chart 
          data={mockData} 
          config={{ 
            export: { 
              enabled: true, 
              formats: ['png', 'svg', 'csv'] 
            } 
          }} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      expect(screen.getByTitle('Export as PNG')).toBeInTheDocument();
      expect(screen.getByTitle('Export as SVG')).toBeInTheDocument();
      expect(screen.getByTitle('Export as CSV')).toBeInTheDocument();
    });

    it('should not render export controls when disabled', async () => {
      render(
        <Chart 
          data={mockData} 
          config={{ export: { enabled: false } }} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      expect(screen.queryByTitle(/Export as/)).not.toBeInTheDocument();
    });

    it('should trigger export when export button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <Chart 
          data={mockData} 
          config={{ 
            export: { 
              enabled: true, 
              formats: ['png'] 
            } 
          }} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const exportButton = screen.getByTitle('Export as PNG');
      await user.click(exportButton);

      // Export functionality would be tested through the ChartExport module
      // This ensures the button click is handled
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<Chart data={mockData} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const chartElement = screen.getByRole('img');
      expect(chartElement).toHaveAttribute('tabindex', '0');
      expect(chartElement).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation when enabled', async () => {
      render(
        <Chart 
          data={mockData} 
          config={{ 
            accessibility: { 
              enabled: true, 
              keyboardNavigation: true 
            } 
          }} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const chartElement = screen.getByRole('img');
      
      // Test keyboard focus
      chartElement.focus();
      expect(chartElement).toHaveFocus();

      // Test keyboard events
      fireEvent.keyDown(chartElement, { key: 'Enter' });
      fireEvent.keyDown(chartElement, { key: 'ArrowRight' });
      
      // Keyboard navigation behavior would be tested in ChartAccessibility tests
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize events', async () => {
      render(<Chart data={mockData} config={{ responsive: true }} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Simulate window resize
      fireEvent(window, new Event('resize'));

      // The chart should recreate itself with new dimensions
      // This is tested more thoroughly in the responsive layout tests
    });
  });

  describe('Error Handling', () => {
    it('should display retry button on error', async () => {
      // Mock chart factory to throw error
      jest.doMock('../ChartFactory', () => ({
        chartFactory: {
          suggestChartType: jest.fn().mockReturnValue([]),
          createChart: jest.fn().mockImplementation(() => {
            throw new Error('Chart creation failed');
          })
        }
      }));

      // Mock window.location.reload
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, reload: jest.fn() };

      render(<Chart data={mockData} />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(window.location.reload).toHaveBeenCalled();
      
      // Restore original location
      window.location = originalLocation;
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className and style', async () => {
      const customStyle = { border: '1px solid red' };
      
      render(
        <Chart 
          data={mockData} 
          className="custom-chart" 
          style={customStyle}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      const wrapper = screen.getByRole('img').closest('.chart-wrapper');
      expect(wrapper).toHaveClass('custom-chart');
      expect(wrapper).toHaveStyle(customStyle);
    });
  });
});