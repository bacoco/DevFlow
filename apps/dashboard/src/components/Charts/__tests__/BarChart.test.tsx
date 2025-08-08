import { BarChart } from '../implementations/BarChart';
import { ChartData } from '../types';

describe('BarChart', () => {
  let mockData: ChartData;

  beforeEach(() => {
    mockData = {
      id: 'test-chart',
      values: [
        { x: 'A', y: 10 },
        { x: 'B', y: 15 },
        { x: 'C', y: 8 }
      ],
      dimensions: {
        x: { type: 'categorical', label: 'Category' },
        y: { type: 'numeric', label: 'Value' }
      }
    };
  });

  it('should create a bar chart instance', () => {
    const chart = new BarChart(mockData, { type: 'bar' });
    
    expect(chart.type).toBe('bar');
    expect(chart.data).toBe(mockData);
    expect(chart.element).toBeInstanceOf(HTMLElement);
    
    chart.destroy();
  });

  it('should handle empty data', () => {
    const emptyData: ChartData = {
      ...mockData,
      values: []
    };
    
    const chart = new BarChart(emptyData, { type: 'bar' });
    
    expect(chart.element).toBeInstanceOf(HTMLElement);
    
    chart.destroy();
  });
});