/**
 * MetricCard Component Tests
 * 
 * This test file validates the enhanced MetricCard component functionality
 * including real-time updates, trend indicators, animations, and error handling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';
import { Widget as WidgetType } from '../../../types/dashboard';

// Mock all external dependencies to focus on component logic
jest.mock('../../../hooks/useRealTimeSync', () => ({
  useRealTimeSync: () => ({
    data: null,
    isConnected: true,
    error: null,
  }),
}));

jest.mock('../../../stores/dataStore', () => ({
  useDataStore: () => ({
    updateWidgetData: jest.fn(),
  }),
}));

jest.mock('../../../contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    settings: { reducedMotion: false },
    announceToScreenReader: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => {},
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    path: ({ children, ...props }: any) => <path {...props}>{children}</path>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MetricCard Enhanced Component', () => {
  const createMockWidget = (overrides: Partial<WidgetType> = {}): WidgetType => ({
    id: 'test-widget-1',
    type: 'metric_card',
    title: 'Test Metric',
    config: {
      title: 'Test Metric',
      timeRange: 'week',
      metrics: ['productivity_score'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    data: {
      metrics: [],
      chartData: { labels: [], datasets: [] },
      summary: {
        current: 85,
        previous: 80,
        change: 5,
        changePercent: 6.25,
        trend: 'up',
      },
      lastUpdated: new Date('2024-01-15T10:00:00Z'),
    },
    permissions: [],
    position: { x: 0, y: 0, w: 2, h: 2 },
    ...overrides,
  });

  describe('Enhanced Features', () => {
    it('renders metric card with enhanced visual design', () => {
      const widget = createMockWidget();
      
      render(<MetricCard widget={widget} />);
      
      // Test basic rendering
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Productivity Score')).toBeInTheDocument();
      expect(screen.getByText('+6.3%')).toBeInTheDocument();
      expect(screen.getByText('vs week')).toBeInTheDocument();
    });

    it('formats different metric types correctly', () => {
      const testCases = [
        {
          metricType: 'time_in_flow',
          value: 6.5,
          expected: '6.5h',
          label: 'Time in Flow',
        },
        {
          metricType: 'commit_frequency',
          value: 3.2,
          expected: '3.2/day',
          label: 'Commit Frequency',
        },
        {
          metricType: 'bug_rate',
          value: 2.45,
          expected: '2.45%',
          label: 'Bug Rate',
        },
      ];

      testCases.forEach(({ metricType, value, expected, label }) => {
        const widget = createMockWidget({
          config: {
            title: 'Test Metric',
            timeRange: 'week',
            metrics: [metricType as any],
            filters: {},
            chartOptions: { responsive: true, maintainAspectRatio: true },
          },
          data: {
            metrics: [],
            chartData: { labels: [], datasets: [] },
            summary: {
              current: value,
              previous: value - 1,
              change: 1,
              changePercent: 10,
              trend: 'up',
            },
            lastUpdated: new Date(),
          },
        });

        const { unmount } = render(<MetricCard widget={widget} />);
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
        
        unmount();
      });
    });

    it('shows real-time connection status', () => {
      const widget = createMockWidget();
      
      render(<MetricCard widget={widget} />);
      
      // Should show live status by default (mocked as connected)
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('handles no data state gracefully', () => {
      const widget = createMockWidget({
        data: {
          metrics: [],
          chartData: { labels: [], datasets: [] },
          summary: undefined as any,
          lastUpdated: new Date(),
        },
      });
      
      render(<MetricCard widget={widget} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('displays comparison data in footer', () => {
      const widget = createMockWidget();
      
      render(<MetricCard widget={widget} />);
      
      expect(screen.getByText(/Previous:/)).toBeInTheDocument();
      expect(screen.getAllByText(/Change:/).length).toBeGreaterThan(0);
      expect(screen.getByText('80%')).toBeInTheDocument(); // Previous value
    });
  });

  describe('Component Integration', () => {
    it('integrates with Widget wrapper correctly', () => {
      const widget = createMockWidget();
      
      render(<MetricCard widget={widget} />);
      
      // Test that the Widget wrapper is rendered with correct props
      expect(screen.getByRole('region', { name: 'Test Metric widget' })).toBeInTheDocument();
    });

    it('validates enhanced metric card implementation', () => {
      const widget = createMockWidget();
      
      render(<MetricCard widget={widget} />);
      
      // Verify all required elements are present
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Productivity Score')).toBeInTheDocument();
      expect(screen.getByText('+6.3%')).toBeInTheDocument();
      expect(screen.getByText('vs week')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText(/Previous:/)).toBeInTheDocument();
      expect(screen.getAllByText(/Change:/).length).toBeGreaterThan(0);
    });
  });
});