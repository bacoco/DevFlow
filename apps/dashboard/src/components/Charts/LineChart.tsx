import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltip } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { ChartZoom } from './ChartZoom';
import { BaseChartProps, RealTimeChartProps } from './types';

// Default color palette
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

interface LineChartProps extends BaseChartProps, Partial<RealTimeChartProps> {
  smooth?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showBrush?: boolean;
  showZoom?: boolean;
  strokeWidth?: number;
  dotSize?: number;
  activeDotSize?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  config,
  width = '100%',
  height = 400,
  className = '',
  loading = false,
  error,
  onDataPointClick,
  onLegendClick,
  onZoom,
  onPan,
  realTime = false,
  updateInterval = 1000,
  streamingData = false,
  bufferSize = 50,
  onDataUpdate,
  smooth = true,
  showDots = true,
  showGrid = true,
  showBrush = false,
  showZoom = false,
  strokeWidth = 2,
  dotSize = 4,
  activeDotSize = 6,
}) => {
  const [chartData, setChartData] = useState(data);
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(new Set());
  const [zoomDomain, setZoomDomain] = useState<{ x?: [number, number]; y?: [number, number] }>({});

  // Transform data for Recharts format
  const transformedData = useMemo(() => {
    if (!chartData.labels || !chartData.datasets) return [];

    return chartData.labels.map((label, index) => {
      const dataPoint: any = { name: label, index };
      
      chartData.datasets.forEach((dataset) => {
        if (!hiddenDatasets.has(dataset.id)) {
          dataPoint[dataset.id] = dataset.data[index] || 0;
        }
      });
      
      return dataPoint;
    });
  }, [chartData, hiddenDatasets]);

  // Real-time data updates
  useEffect(() => {
    if (!realTime && !streamingData) return;

    const interval = setInterval(() => {
      if (streamingData && onDataUpdate) {
        // Simulate new data point
        const newData = { ...chartData };
        const newLabel = `Point ${newData.labels.length + 1}`;
        
        newData.labels = [...newData.labels.slice(-(bufferSize - 1)), newLabel];
        newData.datasets = newData.datasets.map(dataset => ({
          ...dataset,
          data: [...dataset.data.slice(-(bufferSize - 1)), Math.random() * 100]
        }));
        
        setChartData(newData);
        onDataUpdate(newData);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [realTime, streamingData, updateInterval, bufferSize, chartData, onDataUpdate]);

  // Update chart data when prop changes
  useEffect(() => {
    setChartData(data);
  }, [data]);

  const handleLegendClick = useCallback((dataKey: string, entry: any) => {
    setHiddenDatasets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
    
    onLegendClick?.(chartData.datasets.findIndex(d => d.id === dataKey), entry);
  }, [chartData.datasets, onLegendClick]);

  const handleZoom = useCallback((domain: { x: [number, number]; y: [number, number] }) => {
    setZoomDomain(domain);
    onZoom?.(domain);
  }, [onZoom]);

  const handleZoomReset = useCallback(() => {
    setZoomDomain({});
    onZoom?.({ x: [0, transformedData.length - 1], y: [0, 100] });
  }, [onZoom, transformedData.length]);

  const handleDataPointClick = useCallback((data: any, index: number) => {
    if (onDataPointClick) {
      const datasetIndex = chartData.datasets.findIndex(d => d.id in data);
      onDataPointClick(data, datasetIndex, index);
    }
  }, [onDataPointClick, chartData.datasets]);

  if (error) {
    return <ChartContainer error={error} className={className} />;
  }

  return (
    <ChartContainer
      loading={loading}
      className={className}
      actions={
        showZoom ? (
          <ChartZoom
            onZoom={handleZoom}
            onReset={handleZoomReset}
            enabled={true}
          />
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width, height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={transformedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: showBrush ? 60 : 20,
            }}
            onClick={handleDataPointClick}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
              />
            )}
            
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              domain={zoomDomain.x}
            />
            
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              domain={zoomDomain.y}
            />
            
            <ChartTooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    chartData.datasets.find(d => d.id === name)?.label || name
                  ]}
                />
              )}
            />

            {chartData.datasets.map((dataset, index) => (
              <Line
                key={dataset.id}
                type={smooth ? "monotone" : "linear"}
                dataKey={dataset.id}
                stroke={dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={strokeWidth}
                dot={showDots ? { r: dotSize, strokeWidth: 0 } : false}
                activeDot={{ 
                  r: activeDotSize, 
                  strokeWidth: 0,
                  className: "drop-shadow-lg"
                }}
                animationDuration={800}
                animationEasing="ease-out"
                connectNulls={false}
                hide={hiddenDatasets.has(dataset.id)}
              />
            ))}

            {showBrush && (
              <Brush
                dataKey="name"
                height={30}
                stroke="currentColor"
                className="text-gray-400"
              />
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </motion.div>

      <ChartLegend
        payload={chartData.datasets.map((dataset, index) => ({
          value: dataset.label,
          type: 'line',
          color: dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          dataKey: dataset.id,
        }))}
        onLegendClick={handleLegendClick}
        iconType="line"
      />
    </ChartContainer>
  );
};