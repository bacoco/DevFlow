import React, { useState, useEffect } from 'react';
import { Widget } from './Widget';
import { Widget as WidgetType } from '../../types/dashboard';
import { Heart, Activity, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface WellnessScoreData {
  overallScore: number;
  dimensions: {
    physical: number;
    mental: number;
    emotional: number;
    productivity: number;
  };
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastUpdated: Date;
}

interface WellnessScoreWidgetProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'LOW': return 'text-green-600 bg-green-100';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
    case 'HIGH': return 'text-orange-600 bg-orange-100';
    case 'CRITICAL': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return <TrendingUp size={16} className="text-green-600" />;
    case 'down': return <TrendingDown size={16} className="text-red-600" />;
    default: return <Minus size={16} className="text-gray-600" />;
  }
};

export const WellnessScoreWidget: React.FC<WellnessScoreWidgetProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  loading = false,
  error
}) => {
  const [wellnessData, setWellnessData] = useState<WellnessScoreData>({
    overallScore: 75,
    dimensions: {
      physical: 72,
      mental: 78,
      emotional: 74,
      productivity: 76
    },
    trend: 'up',
    riskLevel: 'LOW',
    lastUpdated: new Date()
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWellnessData(prev => ({
        ...prev,
        overallScore: Math.max(0, Math.min(100, prev.overallScore + (Math.random() - 0.5) * 4)),
        dimensions: {
          physical: Math.max(0, Math.min(100, prev.dimensions.physical + (Math.random() - 0.5) * 3)),
          mental: Math.max(0, Math.min(100, prev.dimensions.mental + (Math.random() - 0.5) * 3)),
          emotional: Math.max(0, Math.min(100, prev.dimensions.emotional + (Math.random() - 0.5) * 3)),
          productivity: Math.max(0, Math.min(100, prev.dimensions.productivity + (Math.random() - 0.5) * 3))
        },
        lastUpdated: new Date()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
        {/* Overall Score */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative inline-block"
          >
            <div className="w-24 h-24 mx-auto mb-3 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={getScoreColor(wellnessData.overallScore)}
                  initial={{ strokeDasharray: "0 251.2" }}
                  animate={{ 
                    strokeDasharray: `${(wellnessData.overallScore / 100) * 251.2} 251.2` 
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${getScoreColor(wellnessData.overallScore)}`}>
                  {Math.round(wellnessData.overallScore)}
                </span>
              </div>
            </div>
          </motion.div>
          
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Overall Wellness</span>
            {getTrendIcon(wellnessData.trend)}
          </div>
          
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getRiskColor(wellnessData.riskLevel)}`}>
            {wellnessData.riskLevel} RISK
          </div>
        </div>

        {/* Wellness Dimensions */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-blue-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Heart size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Physical</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wellnessData.dimensions.physical}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
                <span className="text-sm font-semibold text-blue-900">
                  {Math.round(wellnessData.dimensions.physical)}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-green-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Brain size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Mental</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-green-200 rounded-full h-2">
                  <motion.div
                    className="bg-green-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wellnessData.dimensions.mental}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <span className="text-sm font-semibold text-green-900">
                  {Math.round(wellnessData.dimensions.mental)}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-purple-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Heart size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Emotional</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-purple-200 rounded-full h-2">
                  <motion.div
                    className="bg-purple-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wellnessData.dimensions.emotional}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                </div>
                <span className="text-sm font-semibold text-purple-900">
                  {Math.round(wellnessData.dimensions.emotional)}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-orange-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Activity size={16} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Productivity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-orange-200 rounded-full h-2">
                  <motion.div
                    className="bg-orange-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wellnessData.dimensions.productivity}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
                <span className="text-sm font-semibold text-orange-900">
                  {Math.round(wellnessData.dimensions.productivity)}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center mt-4">
          Updated {wellnessData.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </Widget>
  );
};

export default WellnessScoreWidget;