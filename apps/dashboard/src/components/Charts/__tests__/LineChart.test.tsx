import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineChart } from '../LineChart';
import { ChartData } from '../types';

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, onClick }: any) => (
    <div data-testid="line-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Line: ({ dataKey, hide }: any) => (
    <div data-testid={`line-${dataKey}`} data-hidden={hide} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Brush: () => <div data-testid="brush" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

const mockData: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      id: 'dataset1',
      label: 'Sales',
      data: [10, 20, 30, 40, 50],
      color: '#3b82f6',
    },
    {
      id: 'dataset2',
      label: 'Revenue',
      data: [15, 25, 35, 45, 55],
      color: '#10b981',
    },
  ],
};

describe('LineChart', () => {
  const defaultProps = {
    data: mockData,
    width: '100%',
    height: 400,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<LineChart {...defaultProps} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders all chart elements when showGrid is true', () => {
    render(<LineChart {...defaultProps} showGrid={true} />);
    
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('does not render grid when showGrid is false', () => {
    render(<LineChart {...defaultProps} showGrid={false} />);
    
    expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
  });

  it('renders all datasets as lines', () => {
    render(<LineChart {...defaultProps} />);
    
    expect(screen.getByTestId('line-dataset1')).toBeInTheDocument();
    expect(screen.getByTestId('line-dataset2')).toBeInTheDocument();
  });

  it('renders brush when showBrush is true', () => {
    render(<LineChart {...defaultProps} showBrush={true} />);
    
    expect(screen.getByTestId('brush')).toBeInTheDocument();
  });

  it('renders zoom controls when showZoom is true', () => {
    render(<LineChart {...defaultProps} showZoom={true} />);
    
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
  });

  it('renders legend with correct dataset labels', () => {
    render(<LineChart {...defaultProps} />);
    
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('handles legend click to toggle dataset visibility', async () => {
    const user = userEvent.setup();
    render(<LineChart {...defaultProps} />);
    
    const salesLegendItem = screen.getByText('Sales');
    await user.click(salesLegendItem);
    
    // Check if the line is hidden
    await waitFor(() => {
      expect(screen.getByTestId('line-dataset1')).toHaveAttribute('data-hidden', 'true');
    });
  });

  it('calls onDataPointClick when chart is clicked', async () => {
    const onDataPointClick = jest.fn();
    const user = userEvent.setup();
    
    render(<LineChart {...defaultProps} onDataPointClick={onDataPointClick} />);
    
    const chart = screen.getByTestId('line-chart');
    await user.click(chart);
    
    expect(onDataPointClick).toHaveBeenCalled();
  });

  it('calls onLegendClick when legend item is clicked', async () => {
    const onLegendClick = jest.fn();
    const user = userEvent.setup();
    
    render(<LineChart {...defaultProps} onLegendClick={onLegendClick} />);
    
    const salesLegendItem = screen.getByText('Sales');
    await user.click(salesLegendItem);
    
    expect(onLegendClick).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('handles zoom functionality', async () => {
    const onZoom = jest.fn();
    const user = userEvent.setup();
    
    render(<LineChart {...defaultProps} showZoom={true} onZoom={onZoom} />);
    
    const zoomInButton = screen.getByTitle('Zoom In');
    await user.click(zoomInButton);
    
    expect(onZoom).toHaveBeenCalledWith({
      x: [0, expect.any(Number)],
      y: [0, expect.any(Number)],
    });
  });

  it('shows loading state', () => {
    render(<LineChart {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load chart data';
    render(<LineChart {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText('Chart Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyData: ChartData = {
      labels: [],
      datasets: [],
    };
    
    render(<LineChart {...defaultProps} data={emptyData} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('updates data when streaming is enabled', async () => {
    const onDataUpdate = jest.fn();
    
    render(
      <LineChart
        {...defaultProps}
        streamingData={true}
        updateInterval={100}
        onDataUpdate={onDataUpdate}
      />
    );
    
    // Wait for streaming update
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('applies custom styling props', () => {
    render(
      <LineChart
        {...defaultProps}
        className="custom-chart"
        strokeWidth={3}
        smooth={false}
        showDots={false}
      />
    );
    
    expect(screen.getByTestId('responsive-container').closest('.custom-chart')).toBeInTheDocument();
  });

  it('handles real-time updates', async () => {
    const onDataUpdate = jest.fn();
    
    render(
      <LineChart
        {...defaultProps}
        realTime={true}
        updateInterval={100}
        onDataUpdate={onDataUpdate}
      />
    );
    
    // Wait for real-time update
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('maintains buffer size for streaming data', async () => {
    const onDataUpdate = jest.fn();
    const bufferSize = 10;
    
    render(
      <LineChart
        {...defaultProps}
        streamingData={true}
        bufferSize={bufferSize}
        updateInterval={50}
        onDataUpdate={onDataUpdate}
      />
    );
    
    // Wait for multiple updates
    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalled();
    }, { timeout: 200 });
    
    // Check that buffer size is respected
    const lastCall = onDataUpdate.mock.calls[onDataUpdate.mock.calls.length - 1];
    const updatedData = lastCall[0];
    expect(updatedData.labels.length).toBeLessThanOrEqual(bufferSize);
  });
});