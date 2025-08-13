import React, { useState, useEffect } from 'react';
import { Widget } from './Widget';
import { Widget as WidgetType } from '../../types/dashboard';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Heart, Activity, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BiometricData {
  timestamp: Date;
  heartRate: number;
  stressLevel: number;
  activityLevel: number;
  focusScore: number;
}

interface BiometricChartWidgetProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
}

const generateMockData = (hours: number = 24): BiometricData[] => {
  const data: BiometricData[] = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp,
      heartRate: 65 + Math.random() * 30 + Math.sin(i / 4) * 10,
      stressLevel: 30 + Math.random() * 40 + Math.sin(i / 6) * 15,
      activityLevel: 20 + Math.random() * 60 + Math.sin(i / 3) * 20,
      focusScore: 50 + Math.random() * 40 + Math.sin(i / 8) * 20
    });
  }
  
  return data;
};

export const BiometricChartWidget: React.FC<BiometricChartWidgetProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  loading = false,
  error
}) => {
  const [biometricData, setBiometricData] = useState<BiometricData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'heartRate' | 'stressLevel' | 'activityLevel' | 'focusScore'>('heartRate');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  useEffect(() => {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
    setBiometricData(generateMockData(hours));
  }, [timeRange]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setBiometricData(prev => {
        const newData = [...prev];
        const lastPoint = newData[newData.length - 1];
        
        // Add new data point
        newData.push({
          timestamp: new Date(),
          heartRate: Math.max(50, Math.min(120, lastPoint.heartRate + (Math.random() - 0.5) * 10)),
          stressLevel: Math.max(0, Math.min(100, lastPoint.stressLevel + (Math.random() - 0.5) * 15)),
          activityLevel: Math.max(0, Math.min(100, lastPoint.activityLevel + (Math.random() - 0.5) * 20)),
          focusScore: Math.max(0, Math.min(100, lastPoint.focusScore + (Math.random() - 0.5) * 12))
        });
        
        // Keep only recent data based on time range
        const cutoffTime = new Date();
        const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
        cutoffTime.setHours(cutoffTime.getHours() - hours);
        
        return newData.filter(point => point.timestamp >= cutoffTime);
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const getMetricConfig = (metric: string) => {
    switch (metric) {
      case 'heartRate':
        return {
          label: 'Heart Rate (BPM)',
          color: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          icon: Heart,
          unit: 'BPM'
        };
      case 'stressLevel':
        return {
          label: 'Stress Level (%)',
          color: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          icon: Zap,
          unit: '%'
        };
      case 'activityLevel':
        return {
          label: 'Activity Level (%)',
          color: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          icon: Activity,
          unit: '%'
        };
      case 'focusScore':
        return {
          label: 'Focus Score (%)',
          color: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          icon: Clock,
          unit: '%'
        };
      default:
        return {
          label: 'Unknown',
          color: 'rgb(107, 114, 128)',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          icon: Activity,
          unit: ''
        };
    }
  };

  const config = getMetricConfig(selectedMetric);
  const currentValue = biometricData.length > 0 ? biometricData[biometricData.length - 1][selectedMetric] : 0;

  const chartData = {
    labels: biometricData.map(point => 
      timeRange === '1h' || timeRange === '6h' 
        ? point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : timeRange === '24h'
        ? point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : point.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: config.label,
        data: biometricData.map(point => point[selectedMetric]),
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: config.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: config.color,
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${config.label}: ${Math.round(context.parsed.y)}${config.unit}`
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 6,
          color: '#6B7280',
          font: {
            size: 11,
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          callback: (value: any) => `${value}${config.unit}`
        }
      }
    },
    elements: {
      point: {
        radius: 0,
      }
    }
  };

  return (
    <Widget
      widget={widget}
      onRefresh={onRefresh}
      onConfigure={onConfigure}
      onRemove={onRemove}
      loading={loading}
      error={error}
    >
      <div className="h-full flex flex-col">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="heartRate">Heart Rate</option>
              <option value="stressLevel">Stress Level</option>
              <option value="activityLevel">Activity Level</option>
              <option value="focusScore">Focus Score</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs rounded ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Current Value Display */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg"
        >
          <div className="p-2 rounded-full" style={{ backgroundColor: config.backgroundColor }}>
            <config.icon size={20} style={{ color: config.color }} />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: config.color }}>
              {Math.round(currentValue)}{config.unit}
            </div>
            <div className="text-sm text-gray-600">{config.label}</div>
          </div>
          <div className="flex-1 text-right">
            <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></div>
            <span className="text-xs text-green-600 font-medium">LIVE</span>
          </div>
        </motion.div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-blue-50 rounded p-2">
            <div className="text-xs text-blue-600 font-medium">AVG</div>
            <div className="text-sm font-semibold text-blue-900">
              {Math.round(biometricData.reduce((sum, point) => sum + point[selectedMetric], 0) / biometricData.length || 0)}{config.unit}
            </div>
          </div>
          <div className="bg-green-50 rounded p-2">
            <div className="text-xs text-green-600 font-medium">MAX</div>
            <div className="text-sm font-semibold text-green-900">
              {Math.round(Math.max(...biometricData.map(point => point[selectedMetric])) || 0)}{config.unit}
            </div>
          </div>
          <div className="bg-orange-50 rounded p-2">
            <div className="text-xs text-orange-600 font-medium">MIN</div>
            <div className="text-sm font-semibold text-orange-900">
              {Math.round(Math.min(...biometricData.map(point => point[selectedMetric])) || 0)}{config.unit}
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
};

export default BiometricChartWidget;