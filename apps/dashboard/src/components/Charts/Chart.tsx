import React, { useEffect, useRef, useState } from 'react';
import { ChartData, ChartConfig, ChartType, ChartInstance, ExportOptions } from './types';
import { chartFactory } from './ChartFactory';
import { ChartInteractions } from './ChartInteractions';
import { ChartExport } from './ChartExport';

interface ChartProps {
  data: ChartData;
  config?: Partial<ChartConfig>;
  onChartClick?: (data: any) => void;
  onChartHover?: (data: any) => void;
  onBrushSelection?: (selection: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Chart: React.FC<ChartProps> = ({
  data,
  config = {},
  onChartClick,
  onChartHover,
  onBrushSelection,
  className,
  style
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ChartInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default configuration
  const defaultConfig: ChartConfig = {
    type: 'line',
    width: 400,
    height: 300,
    responsive: true,
    theme: 'light',
    accessibility: {
      enabled: true,
      dataTable: true,
      keyboardNavigation: true
    },
    interactions: {
      zoom: false,
      pan: false,
      brush: false,
      tooltip: true,
      drillDown: false
    },
    export: {
      enabled: true,
      formats: ['png', 'svg', 'csv']
    }
  };

  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const createChart = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Suggest chart type if not specified
        if (!config.type) {
          const suggestions = chartFactory.suggestChartType(data);
          if (suggestions.length > 0) {
            finalConfig.type = suggestions[0].type;
          }
        }

        // Create chart instance
        const chartInstance = chartFactory.createChart(data, finalConfig);
        
        // Mount chart to container
        containerRef.current.appendChild(chartInstance.element);
        
        // Set up interactions
        if (finalConfig.interactions?.zoom) {
          ChartInteractions.enableZoom(chartInstance);
        }
        
        if (finalConfig.interactions?.pan) {
          ChartInteractions.enablePan(chartInstance);
        }
        
        if (finalConfig.interactions?.brush && onBrushSelection) {
          ChartInteractions.enableBrushing(chartInstance, onBrushSelection);
        }
        
        if (finalConfig.interactions?.tooltip) {
          ChartInteractions.addTooltips(chartInstance, (data) => {
            return `<strong>${data.x}</strong><br/>${data.y}`;
          });
        }
        
        if (finalConfig.interactions?.drillDown && onChartClick) {
          ChartInteractions.enableDrillDown(chartInstance, onChartClick);
        }

        // Set up event listeners
        chartInstance.element.addEventListener('chartClick', (event: any) => {
          if (onChartClick) {
            onChartClick(event.detail.data);
          }
        });

        chartInstanceRef.current = chartInstance;
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create chart');
        setIsLoading(false);
      }
    };

    createChart();

    // Cleanup
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, config]);

  // Handle responsive resize
  useEffect(() => {
    if (!finalConfig.responsive || !chartInstanceRef.current) return;

    const handleResize = () => {
      if (containerRef.current && chartInstanceRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Recreate chart with new dimensions
        const newConfig = {
          ...finalConfig,
          width: rect.width,
          height: rect.height
        };
        
        // This is a simplified approach - in practice, you might want to
        // implement a more efficient resize method on the chart instance
        const newChart = chartFactory.createChart(data, newConfig);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(newChart.element);
        chartInstanceRef.current = newChart;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [finalConfig.responsive]);

  const exportChart = async (options: ExportOptions) => {
    if (!chartInstanceRef.current) return;
    
    try {
      await ChartExport.downloadChart(chartInstanceRef.current, options);
    } catch (err) {
      console.error('Failed to export chart:', err);
    }
  };

  if (error) {
    return (
      <div 
        className={`chart-error ${className || ''}`}
        style={style}
        role="alert"
      >
        <div className="error-message">
          <h3>Chart Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`chart-wrapper ${className || ''}`}
      style={style}
    >
      {isLoading && (
        <div className="chart-loading" role="status" aria-label="Loading chart">
          <div className="loading-spinner"></div>
          <span>Loading chart...</span>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="chart-container"
        style={{
          width: finalConfig.responsive ? '100%' : finalConfig.width,
          height: finalConfig.responsive ? '100%' : finalConfig.height,
          minHeight: '200px'
        }}
      />
      
      {finalConfig.export?.enabled && !isLoading && (
        <div className="chart-export-controls">
          {finalConfig.export.formats.map(format => (
            <button
              key={format}
              onClick={() => exportChart({ format: format as any })}
              className="export-button"
              title={`Export as ${format.toUpperCase()}`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chart;