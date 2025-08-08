/**
 * Productivity Insights Component
 * Displays AI-generated insights and recommendations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TaskInsight, InsightAction } from '../../types/analytics';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ChartBarIcon,
  WrenchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ProductivityInsightsProps {
  insights: TaskInsight[];
  loading?: boolean;
  className?: string;
}

export const ProductivityInsights: React.FC<ProductivityInsightsProps> = ({
  insights,
  loading = false,
  className = '',
}) => {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  const toggleInsight = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const getInsightIcon = (type: TaskInsight['type']) => {
    switch (type) {
      case 'achievement':
        return TrophyIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'bottleneck':
        return WrenchIcon;
      case 'pattern':
        return ChartBarIcon;
      case 'recommendation':
      default:
        return LightBulbIcon;
    }
  };

  const getInsightColor = (type: TaskInsight['type']) => {
    switch (type) {
      case 'achievement':
        return {
          icon: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
        };
      case 'warning':
        return {
          icon: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
        };
      case 'bottleneck':
        return {
          icon: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
        };
      case 'pattern':
        return {
          icon: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
        };
      case 'recommendation':
      default:
        return {
          icon: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
        };
    }
  };

  const getImpactBadge = (impact: TaskInsight['impact']) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (impact) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
    }
  };

  const getActionIcon = (type: InsightAction['type']) => {
    switch (type) {
      case 'tool':
        return WrenchIcon;
      case 'training':
        return SparklesIcon;
      case 'resource':
        return ChartBarIcon;
      case 'process':
      default:
        return LightBulbIcon;
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Insights Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We'll generate insights as more data becomes available.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Productivity Insights
          </h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          const colors = getInsightColor(insight.type);
          const isExpanded = expandedInsights.has(insight.id);

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`border rounded-lg p-4 ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${colors.border} border`}>
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <span className={getImpactBadge(insight.impact)}>
                        {insight.impact} impact
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {insight.confidence}% confidence
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {insight.description}
                    </p>

                    {insight.actionable && insight.actions && insight.actions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleInsight(insight.id)}
                        icon={isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                        className="text-xs"
                      >
                        {isExpanded ? 'Hide' : 'Show'} Actions ({insight.actions.length})
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && insight.actions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Recommended Actions:
                    </h5>
                    <div className="space-y-3">
                      {insight.actions.map((action, actionIndex) => {
                        const ActionIcon = getActionIcon(action.type);
                        
                        return (
                          <div
                            key={action.id}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <ActionIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {action.title}
                                </h6>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                  {action.type}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {action.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Effort: <span className="capitalize font-medium">{action.effort}</span>
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  Impact: <span className="capitalize font-medium">{action.impact}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {insights.filter(i => i.type === 'achievement').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Achievements</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {insights.filter(i => i.type === 'recommendation').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Recommendations</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
              {insights.filter(i => i.type === 'warning').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              {insights.filter(i => i.type === 'bottleneck').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Bottlenecks</div>
          </div>
        </div>
      </div>
    </Card>
  );
};