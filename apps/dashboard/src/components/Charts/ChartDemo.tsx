import React, { useState, useEffect } from 'react';
import Chart from './Chart';
import { ChartSuggestionPanel } from './ChartSuggestionPanel';
import { LinkedChartsManager } from './LinkedChartsManager';
import { ChartData, ChartType, ChartConfig } from './types';

const ChartDemo: React.FC = () => {
  const [selectedData, setSelectedData] = useState<ChartData | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [chartConfig, setChartConfig] = useState<Partial<ChartConfig>>({
    theme: 'light',
    interactions: {
      zoom: true,
      pan: true,
      brush: true,
      tooltip: true,
      drillDown: false
    },
    accessibility: {
      enabled: true,
      keyboardNavigation: true,
      dataTable: true
    },
    export: {
      enabled: true,
      formats: ['png', 'svg', 'csv', 'json']
    }
  });

  // Sample datasets
  const sampleDatasets: Record<string, ChartData> = {
    timeSeries: {
      id: 'time-series',
      values: Array.from({ length: 30 }, (_, i) => ({
        x: new Date(2023, 0, i + 1),
        y: Math.sin(i * 0.2) * 20 + 50 + Math.random() * 10
      })),
      dimensions: {
        x: { type: 'temporal', label: 'Date' },
        y: { type: 'numeric', label: 'Value' }
      },
      metadata: {
        title: 'Time Series Data',
        description: 'Sample time series showing trends over time'
      }
    },
    categorical: {
      id: 'categorical',
      values: [
        { x: 'Product A', y: 120 },
        { x: 'Product B', y: 95 },
        { x: 'Product C', y: 180 },
        { x: 'Product D', y: 75 },
        { x: 'Product E', y: 160 }
      ],
      dimensions: {
        x: { type: 'categorical', label: 'Product' },
        y: { type: 'numeric', label: 'Sales' }
      },
      metadata: {
        title: 'Product Sales',
        description: 'Sales data by product category'
      }
    },
    scatter: {
      id: 'scatter',
      values: Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        metadata: { size: Math.random() * 10 + 5 }
      })),
      dimensions: {
        x: { type: 'numeric', label: 'X Value' },
        y: { type: 'numeric', label: 'Y Value' }
      },
      metadata: {
        title: 'Scatter Plot Data',
        description: 'Multi-dimensional scatter plot with categories'
      }
    },
    multiSeries: {
      id: 'multi-series',
      values: Array.from({ length: 60 }, (_, i) => ({
        x: new Date(2023, 0, Math.floor(i / 3) + 1),
        y: Math.sin(i * 0.1) * 15 + 30 + Math.random() * 8,
        category: ['Series A', 'Series B', 'Series C'][i % 3]
      })),
      dimensions: {
        x: { type: 'temporal', label: 'Date' },
        y: { type: 'numeric', label: 'Value' }
      },
      metadata: {
        title: 'Multi-Series Data',
        description: 'Multiple data series over time'
      }
    },
    heatmapData: {
      id: 'heatmap',
      values: Array.from({ length: 100 }, (_, i) => ({
        x: `Item ${i % 10}`,
        y: Math.random() * 100,
        category: `Category ${Math.floor(i / 10)}`
      })),
      dimensions: {
        x: { type: 'categorical', label: 'Item' },
        y: { type: 'numeric', label: 'Intensity' }
      },
      metadata: {
        title: 'Heatmap Data',
        description: 'Intensity data across items and categories'
      }
    }
  };

  useEffect(() => {
    // Set initial dataset
    setSelectedData(sampleDatasets.timeSeries);
  }, []);

  const handleDatasetChange = (datasetKey: string) => {
    setSelectedData(sampleDatasets[datasetKey]);
  };

  const handleChartTypeSelect = (type: ChartType) => {
    setSelectedChartType(type);
  };

  const handleConfigChange = (key: string, value: any) => {
    setChartConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleInteractionChange = (interaction: string, enabled: boolean) => {
    setChartConfig(prev => ({
      ...prev,
      interactions: {
        ...prev.interactions,
        [interaction]: enabled
      }
    }));
  };

  const handleChartClick = (data: any) => {
    console.log('Chart clicked:', data);
    alert(`Clicked on data point: ${JSON.stringify(data, null, 2)}`);
  };

  const handleBrushSelection = (selection: any) => {
    console.log('Brush selection:', selection);
  };

  // Create linked charts for demonstration
  const linkedCharts = [
    {
      id: 'chart-1',
      data: sampleDatasets.timeSeries,
      config: { type: 'line' as ChartType, width: 400, height: 300 },
      position: { x: 0, y: 0 }
    },
    {
      id: 'chart-2',
      data: sampleDatasets.categorical,
      config: { type: 'bar' as ChartType, width: 400, height: 300 },
      position: { x: 100, y: 0 }
    }
  ];

  return (
    <div className="chart-demo">
      <div className="demo-header">
        <h1>Enhanced Data Visualization System Demo</h1>
        <p>
          Explore intelligent chart suggestions, interactive controls, accessibility features,
          and advanced export capabilities.
        </p>
      </div>

      <div className="demo-controls">
        <div className="control-section">
          <h3>Dataset Selection</h3>
          <select 
            onChange={(e) => handleDatasetChange(e.target.value)}
            value={Object.keys(sampleDatasets).find(key => 
              sampleDatasets[key] === selectedData
            ) || ''}
          >
            <option value="timeSeries">Time Series Data</option>
            <option value="categorical">Categorical Data</option>
            <option value="scatter">Scatter Plot Data</option>
            <option value="multiSeries">Multi-Series Data</option>
            <option value="heatmapData">Heatmap Data</option>
          </select>
        </div>

        <div className="control-section">
          <h3>Theme</h3>
          <label>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={chartConfig.theme === 'light'}
              onChange={(e) => handleConfigChange('theme', e.target.value)}
            />
            Light
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={chartConfig.theme === 'dark'}
              onChange={(e) => handleConfigChange('theme', e.target.value)}
            />
            Dark
          </label>
        </div>

        <div className="control-section">
          <h3>Interactions</h3>
          {Object.entries(chartConfig.interactions || {}).map(([key, value]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleInteractionChange(key, e.target.checked)}
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </div>

        <div className="control-section">
          <h3>Accessibility</h3>
          <label>
            <input
              type="checkbox"
              checked={chartConfig.accessibility?.enabled}
              onChange={(e) => handleConfigChange('accessibility', {
                ...chartConfig.accessibility,
                enabled: e.target.checked
              })}
            />
            Enable Accessibility Features
          </label>
          <label>
            <input
              type="checkbox"
              checked={chartConfig.accessibility?.keyboardNavigation}
              onChange={(e) => handleConfigChange('accessibility', {
                ...chartConfig.accessibility,
                keyboardNavigation: e.target.checked
              })}
            />
            Keyboard Navigation
          </label>
        </div>
      </div>

      {selectedData && (
        <div className="demo-content">
          <div className="chart-suggestions">
            <ChartSuggestionPanel
              data={selectedData}
              onChartTypeSelect={handleChartTypeSelect}
              selectedType={selectedChartType}
            />
          </div>

          <div className="main-chart">
            <h3>Interactive Chart</h3>
            <Chart
              data={selectedData}
              config={{
                ...chartConfig,
                type: selectedChartType,
                width: 800,
                height: 500
              }}
              onChartClick={handleChartClick}
              onBrushSelection={handleBrushSelection}
            />
          </div>

          <div className="chart-features">
            <div className="feature-section">
              <h4>Accessibility Features</h4>
              <ul>
                <li>Screen reader support with descriptive alt text</li>
                <li>Keyboard navigation (Tab, Arrow keys, Enter)</li>
                <li>High contrast mode support</li>
                <li>Data table representation available</li>
                <li>ARIA labels and live regions</li>
              </ul>
            </div>

            <div className="feature-section">
              <h4>Interactive Controls</h4>
              <ul>
                <li>Zoom: Mouse wheel or double-click</li>
                <li>Pan: Click and drag</li>
                <li>Brush: Shift + click and drag</li>
                <li>Tooltips: Hover over data points</li>
                <li>Export: Use buttons below chart</li>
              </ul>
            </div>

            <div className="feature-section">
              <h4>Export Options</h4>
              <ul>
                <li>PNG: High-quality raster image</li>
                <li>SVG: Scalable vector graphics</li>
                <li>CSV: Raw data export</li>
                <li>JSON: Structured data with metadata</li>
              </ul>
            </div>
          </div>

          <div className="linked-charts-demo">
            <h3>Linked Charts Demonstration</h3>
            <LinkedChartsManager
              charts={linkedCharts}
              linkType="brush"
            />
          </div>
        </div>
      )}

      <div className="demo-footer">
        <h3>Technical Implementation</h3>
        <div className="implementation-details">
          <div className="detail-section">
            <h4>Chart Factory</h4>
            <p>
              Intelligent chart type suggestions based on data characteristics,
              size, and visualization best practices.
            </p>
          </div>
          
          <div className="detail-section">
            <h4>Accessibility Layer</h4>
            <p>
              Comprehensive accessibility support including screen readers,
              keyboard navigation, and alternative data representations.
            </p>
          </div>
          
          <div className="detail-section">
            <h4>Interactive Controls</h4>
            <p>
              Advanced interaction patterns including zoom, pan, brush selection,
              and drill-down capabilities with touch support.
            </p>
          </div>
          
          <div className="detail-section">
            <h4>Export System</h4>
            <p>
              High-quality export in multiple formats with customizable options
              and batch export capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartDemo;