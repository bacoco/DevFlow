import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
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

interface BarChartProps extends BaseChartProps, Partial<RealTimeChartProps> {
  orientation?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLabels?: boolean;
  showZoom?: boolean;
  barRadius?: number;
  barGap?: number;
  barCategoryGap?: number;
  stackId?: string;
  maxBarSize?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
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
  realTime = false,
  updateInterval = 1000,
  streamingData = false,
  bufferSize = 50,
  onDataUpdate,
  orientation = 'vertical',
  showGrid = true,
  showLabels = false,
  showZoom = false,
  barRadius = 4,
  barGap = 4,
  barCategoryGap = 8,
  stackId,
  maxBarSize = 60,
}) => {
  const [chartData, setChartData] = useState(data);
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(new Set());
  const [zoomDomain, setZoomDomain] = useState<{ x?: [number, number]; y?: [number, number] }>({});
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

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

  const handleBarHover = useCallback((data: any, index: number) => {
    setHoveredBar(index);
  }, []);

  const handleBarLeave = useCallback(() => {
    setHoveredBar(null);
  }, []);

  if (error) {
    return <ChartContainer error={error} className={className} />;
  }

  const ChartComponent = orientation === 'horizontal' ? RechartsBarChart : RechartsBarChart;

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
          <ChartComponent
            data={transformedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
            onClick={handleDataPointClick}
            barGap={barGap}
            barCategoryGap={barCategoryGap}
            maxBarSize={maxBarSize}
            layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
              />
            )}
            
            <XAxis
              type={orientation === 'horizontal' ? 'number' : 'category'}
              dataKey={orientation === 'horizontal' ? undefined : 'name'}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              domain={orientation === 'horizontal' ? zoomDomain.x : undefined}
            />
            
            <YAxis
              type={orientation === 'horizontal' ? 'category' : 'number'}
              dataKey={orientation === 'horizontal' ? 'name' : undefined}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              domain={orientation === 'horizontal' ? undefined : zoomDomain.y}
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
              <Bar
                key={dataset.id}
                dataKey={dataset.id}
                fill={dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                radius={[barRadius, barRadius, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
                stackId={stackId}
                hide={hiddenDatasets.has(dataset.id)}
                onMouseEnter={handleBarHover}
                onMouseLeave={handleBarLeave}
              >
                {transformedData.map((entry, entryIndex) => (
                  <Cell
                    key={`cell-${entryIndex}`}
                    fill={
                      hoveredBar === entryIndex
                        ? dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                        : `${dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}CC`
                    }
                  />
                ))}
                
                {showLabels && (
                  <LabelList
                    dataKey={dataset.id}
                    position="top"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                    formatter={(value: number) => value.toLocaleString()}
                  />
                )}
              </Bar>
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </motion.div>

      <ChartLegend
        payload={chartData.datasets.map((dataset, index) => ({
          value: dataset.label,
          type: 'rect',
          color: dataset.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          dataKey: dataset.id,
        }))}
        onLegendClick={handleLegendClick}
        iconType="rect"
      />
    </ChartContainer>
  );
};