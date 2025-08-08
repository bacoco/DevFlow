/**
 * Performance Monitoring Dashboard
 * Visual interface for performance metrics and monitoring
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitoringSystem } from '../../services/performance/PerformanceMonitoringSystem';
import { 
  CoreWebVitals, 
  PerformanceAlert, 
  PerformanceRecommendation,
  PerformanceBenchmark 
} from '../../services/performance/types';

interface PerformanceMonitoringDashboardProps {
  className?: string;
}

export const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  className = ''
}) => {
  const [vitals, setVitals] = useState<CoreWebVitals | null>(null);
  const [benchmarks, setBenchmarks] = useState<Map<string, PerformanceBenchmark>>(new Map());
  const [recommendations, setRecommendations] = useState<PerformanceRecommendation[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        await performanceMonitoringSystem.initialize();
        
        // Get initial data
        const currentVitals = await performanceMonitoringSystem.getCurrentVitals();
        const currentBenchmarks = performanceMonitoringSystem.getBenchmarks();
        const currentRecommendations = performanceMonitoringSystem.getRecommendations();

        setVitals(currentVitals);
        setBenchmarks(currentBenchmarks);
        setRecommendations(currentRecommendations);
        setIsLoading(false);

        // Set up alert listener
        const handleAlert = (alert: PerformanceAlert) => {
          setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
        };

        performanceMonitoringSystem.onAlert(handleAlert);

        // Set up periodic updates
        const interval = setInterval(async () => {
          const updatedVitals = await performanceMonitoringSystem.getCurrentVitals();
          const updatedBenchmarks = performanceMonitoringSystem.getBenchmarks();
          const updatedRecommendations = performanceMonitoringSystem.getRecommendations();

          setVitals(updatedVitals);
          setBenchmarks(updatedBenchmarks);
          setRecommendations(updatedRecommendations);
        }, 5000);

        return () => {
          clearInterval(interval);
          performanceMonitoringSystem.removeAlertCallback(handleAlert);
        };
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
        setIsLoading(false);
      }
    };

    initializeMonitoring();
  }, []);

  const getVitalScore = (metric: keyof CoreWebVitals, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
      inp: { good: 200, poor: 500 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'poor';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score: string): string => {
    switch (score) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (metric: string, value: number): string => {
    if (metric === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  if (isLoading) {
    return (
      <div className={`performance-monitoring-dashboard ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-monitoring-dashboard ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Monitoring</h2>
        <p className="text-gray-600">Real-time performance metrics and Core Web Vitals</p>
      </div>

      {/* Core Web Vitals */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vitals && Object.entries(vitals).map(([metric, value]) => {
            const score = getVitalScore(metric as keyof CoreWebVitals, value);
            const colorClass = getScoreColor(score);
            
            return (
              <div key={metric} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 uppercase">
                    {metric.toUpperCase()}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                    {score.replace('-', ' ')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(metric, value)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {metric === 'lcp' && 'Largest Contentful Paint'}
                  {metric === 'fid' && 'First Input Delay'}
                  {metric === 'cls' && 'Cumulative Layout Shift'}
                  {metric === 'fcp' && 'First Contentful Paint'}
                  {metric === 'ttfb' && 'Time to First Byte'}
                  {metric === 'inp' && 'Interaction to Next Paint'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Benchmarks */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Benchmarks</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(benchmarks.entries()).map(([metric, benchmark]) => (
                  <tr key={metric}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(metric, benchmark.current)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(metric, benchmark.target)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        benchmark.trend === 'improving' ? 'bg-green-100 text-green-800' :
                        benchmark.trend === 'degrading' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {benchmark.trend === 'improving' && '↗️'}
                        {benchmark.trend === 'degrading' && '↘️'}
                        {benchmark.trend === 'stable' && '→'}
                        {benchmark.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-400' :
                alert.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {alert.metric.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {rec.priority} priority
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {rec.effort} effort
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {rec.description}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Impact:</strong> {rec.impact}
                    </p>
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        Implementation details
                      </summary>
                      <p className="mt-1 text-sm text-gray-600 pl-4">
                        {rec.implementation}
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitoringDashboard;