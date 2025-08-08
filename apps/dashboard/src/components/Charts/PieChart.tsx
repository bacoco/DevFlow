import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltip } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
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

interface PieChartProps extends BaseChartProps, Partial<RealTimeChartProps> {
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  startAngle?: number;
  endAngle?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  showValues?: boolean;
  animationBegin?: number;
  animationDuration?: number;
  datasetIndex?: number; // Which dataset to use for pie chart
}

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value, name
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-medium">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey} 
        textAnchor={textAnchor} 
        fill="currentColor"
        className="text-sm font-medium text-gray-900 dark:text-white"
      >
        {`${name}: ${value.toLocaleString()}`}
      </text>
      <text 
        x={ex + (cos >= 0 ? 1 : -1) * 12} 
        y={ey} 
        dy={18} 
        textAnchor={textAnchor} 
        fill="currentColor"
        className="text-xs text-gray-600 dark:text-gray-400"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  config,
  width = '100%',
  height = 400,
  className = '',
  loading = false,
  error,
  onDataPointClick,
  onLegendClick,
  realTime = false,
  updateInterval = 1000,
  streamingData = false,
  bufferSize = 50,
  onDataUpdate,
  innerRadius = 0,
  outerRadius = 120,
  paddingAngle = 2,
  startAngle = 0,
  endAngle = 360,
  showLabels = false,
  showPercentages = true,
  showValues = true,
  animationBegin = 0,
  animationDuration = 800,
  datasetIndex = 0,
}) => {
  const [chartData, setChartData] = useState(data);
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Transform data for Recharts format (pie chart uses first dataset)
  const transformedData = useMemo(() => {
    if (!chartData.labels || !chartData.datasets || !chartData.datasets[datasetIndex]) return [];

    const dataset = chartData.datasets[datasetIndex];
    
    return chartData.labels.map((label, index) => ({
      name: label,
      value: dataset.data[index] || 0,
      index,
    })).filter(item => item.value > 0); // Filter out zero values
  }, [chartData, datasetIndex]);

  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return transformedData.reduce((sum, item) => sum + item.value, 0);
  }, [transformedData]);

  // Real-time data updates
  useEffect(() => {
    if (!realTime && !streamingData) return;

    const interval = setInterval(() => {
      if (streamingData && onDataUpdate) {
        // Simulate data updates for pie chart
        const newData = { ...chartData };
        newData.datasets = newData.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.map(() => Math.random() * 100)
        }));
        
        setChartData(newData);
        onDataUpdate(newData);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [realTime, streamingData, updateInterval, chartData, onDataUpdate]);

  // Update chart data when prop changes
  useEffect(() => {
    setChartData(data);
  }, [data]);

  const handleLegendClick = useCallback((dataKey: string, entry: any) => {
    const index = transformedData.findIndex(item => item.name === dataKey);
    if (index !== -1) {
      onLegendClick?.(datasetIndex, transformedData[index]);
    }
  }, [transformedData, datasetIndex, onLegendClick]);

  const handlePieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleDataPointClick = useCallback((data: any, index: number) => {
    if (onDataPointClick) {
      onDataPointClick(data, datasetIndex, index);
    }
  }, [onDataPointClick, datasetIndex]);

  if (error) {
    return <ChartContainer error={error} className={className} />;
  }

  if (!transformedData.length) {
    return (
      <ChartContainer loading={loading} className={className}>
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-2">Add some data to see the pie chart</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer loading={loading} className={className}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width, height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={transformedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showLabels ? ({ name, percent }) => 
                `${name} ${showPercentages ? `(${(percent * 100).toFixed(1)}%)` : ''}`
              : false}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              paddingAngle={paddingAngle}
              startAngle={startAngle}
              endAngle={endAngle}
              fill="#8884d8"
              dataKey="value"
              animationBegin={animationBegin}
              animationDuration={animationDuration}
              onMouseEnter={handlePieEnter}
              onMouseLeave={handlePieLeave}
              onClick={handleDataPointClick}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
            >
              {transformedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  stroke={activeIndex === index ? '#fff' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            
            <ChartTooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  formatter={(value, name) => [
                    `${typeof value === 'number' ? value.toLocaleString() : value} ${showPercentages ? `(${((value as number / total) * 100).toFixed(1)}%)` : ''}`,
                    name
                  ]}
                />
              )}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </motion.div>

      <ChartLegend
        payload={transformedData.map((item, index) => ({
          value: `${item.name}${showValues ? ` (${item.value.toLocaleString()})` : ''}${showPercentages ? ` - ${((item.value / total) * 100).toFixed(1)}%` : ''}`,
          type: 'rect',
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          dataKey: item.name,
        }))}
        onLegendClick={handleLegendClick}
        iconType="rect"
      />
    </ChartContainer>
  );
};