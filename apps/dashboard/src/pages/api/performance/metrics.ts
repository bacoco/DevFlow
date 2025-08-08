/**
 * Performance Metrics API Endpoint
 * Handles collection and storage of performance metrics from RUM
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PerformanceMetric, PerformanceSession } from '../../../services/performance/types';

// In-memory storage for demo purposes
// In production, this would be stored in a database
let metricsStore: PerformanceMetric[] = [];
let sessionsStore: PerformanceSession[] = [];

// Cleanup old metrics (keep last 1000)
const cleanupMetrics = () => {
  if (metricsStore.length > 1000) {
    metricsStore = metricsStore.slice(-1000);
  }
  if (sessionsStore.length > 100) {
    sessionsStore = sessionsStore.slice(-100);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'POST':
        await handleMetricsSubmission(req, res);
        break;
      case 'GET':
        await handleMetricsRetrieval(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Performance metrics API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleMetricsSubmission(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { metrics, session } = req.body;

  if (!metrics || !Array.isArray(metrics)) {
    res.status(400).json({ error: 'Invalid metrics data' });
    return;
  }

  // Validate metrics
  const validMetrics = metrics.filter(metric => 
    metric.id &&
    metric.name &&
    typeof metric.value === 'number' &&
    metric.timestamp &&
    metric.url &&
    metric.sessionId
  );

  if (validMetrics.length === 0) {
    res.status(400).json({ error: 'No valid metrics provided' });
    return;
  }

  // Store metrics
  metricsStore.push(...validMetrics);

  // Store session if provided
  if (session && session.id) {
    const existingSessionIndex = sessionsStore.findIndex(s => s.id === session.id);
    if (existingSessionIndex >= 0) {
      // Update existing session
      sessionsStore[existingSessionIndex] = {
        ...sessionsStore[existingSessionIndex],
        ...session,
        endTime: new Date()
      };
    } else {
      // Add new session
      sessionsStore.push({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined
      });
    }
  }

  // Cleanup old data
  cleanupMetrics();

  // Process metrics for insights
  const insights = await processMetricsForInsights(validMetrics);

  res.status(200).json({ 
    success: true,
    received: validMetrics.length,
    insights
  });
}

async function handleMetricsRetrieval(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { 
    metric, 
    startTime, 
    endTime, 
    sessionId, 
    limit = 100,
    aggregation 
  } = req.query;

  let filteredMetrics = [...metricsStore];

  // Apply filters
  if (metric && typeof metric === 'string') {
    filteredMetrics = filteredMetrics.filter(m => m.name === metric);
  }

  if (sessionId && typeof sessionId === 'string') {
    filteredMetrics = filteredMetrics.filter(m => m.sessionId === sessionId);
  }

  if (startTime && typeof startTime === 'string') {
    const start = new Date(startTime);
    filteredMetrics = filteredMetrics.filter(m => 
      new Date(m.timestamp) >= start
    );
  }

  if (endTime && typeof endTime === 'string') {
    const end = new Date(endTime);
    filteredMetrics = filteredMetrics.filter(m => 
      new Date(m.timestamp) <= end
    );
  }

  // Apply limit
  const limitNum = parseInt(limit as string, 10);
  if (limitNum > 0) {
    filteredMetrics = filteredMetrics.slice(-limitNum);
  }

  // Apply aggregation if requested
  let result: any = filteredMetrics;
  
  if (aggregation === 'summary') {
    result = generateMetricsSummary(filteredMetrics);
  } else if (aggregation === 'timeseries') {
    result = generateTimeSeriesData(filteredMetrics);
  }

  res.status(200).json({
    success: true,
    data: result,
    total: filteredMetrics.length,
    sessions: sessionsStore.length
  });
}

async function processMetricsForInsights(metrics: PerformanceMetric[]) {
  const insights = {
    coreWebVitals: {},
    deviceBreakdown: {},
    networkBreakdown: {},
    performanceScore: 0,
    recommendations: []
  };

  // Calculate Core Web Vitals averages
  const vitalMetrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'inp'];
  
  vitalMetrics.forEach(vital => {
    const vitalData = metrics.filter(m => m.name === vital);
    if (vitalData.length > 0) {
      const average = vitalData.reduce((sum, m) => sum + m.value, 0) / vitalData.length;
      const p95 = calculatePercentile(vitalData.map(m => m.value), 95);
      
      insights.coreWebVitals[vital] = {
        average: Math.round(average),
        p95: Math.round(p95),
        count: vitalData.length
      };
    }
  });

  // Device type breakdown
  const deviceTypes = metrics.reduce((acc, m) => {
    const type = m.deviceInfo?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  insights.deviceBreakdown = deviceTypes;

  // Network type breakdown
  const networkTypes = metrics.reduce((acc, m) => {
    const type = m.networkInfo?.effectiveType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  insights.networkBreakdown = networkTypes;

  // Calculate overall performance score
  insights.performanceScore = calculatePerformanceScore(insights.coreWebVitals);

  // Generate recommendations
  insights.recommendations = generateRecommendations(insights);

  return insights;
}

function generateMetricsSummary(metrics: PerformanceMetric[]) {
  const summary = {
    totalMetrics: metrics.length,
    uniqueSessions: new Set(metrics.map(m => m.sessionId)).size,
    timeRange: {
      start: metrics.length > 0 ? Math.min(...metrics.map(m => new Date(m.timestamp).getTime())) : null,
      end: metrics.length > 0 ? Math.max(...metrics.map(m => new Date(m.timestamp).getTime())) : null
    },
    metricTypes: {},
    averages: {}
  };

  // Count metric types
  metrics.forEach(metric => {
    summary.metricTypes[metric.name] = (summary.metricTypes[metric.name] || 0) + 1;
  });

  // Calculate averages for each metric type
  Object.keys(summary.metricTypes).forEach(metricName => {
    const metricValues = metrics
      .filter(m => m.name === metricName)
      .map(m => m.value);
    
    if (metricValues.length > 0) {
      summary.averages[metricName] = {
        mean: metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length,
        median: calculatePercentile(metricValues, 50),
        p95: calculatePercentile(metricValues, 95),
        min: Math.min(...metricValues),
        max: Math.max(...metricValues)
      };
    }
  });

  return summary;
}

function generateTimeSeriesData(metrics: PerformanceMetric[]) {
  // Group metrics by time buckets (5-minute intervals)
  const bucketSize = 5 * 60 * 1000; // 5 minutes in milliseconds
  const buckets = {};

  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp).getTime();
    const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;
    
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = {};
    }
    
    if (!buckets[bucketKey][metric.name]) {
      buckets[bucketKey][metric.name] = [];
    }
    
    buckets[bucketKey][metric.name].push(metric.value);
  });

  // Convert to time series format
  const timeSeries = Object.entries(buckets).map(([timestamp, metricData]) => {
    const dataPoint = {
      timestamp: parseInt(timestamp, 10),
      metrics: {}
    };

    Object.entries(metricData).forEach(([metricName, values]) => {
      const valuesArray = values as number[];
      dataPoint.metrics[metricName] = {
        count: valuesArray.length,
        average: valuesArray.reduce((sum, val) => sum + val, 0) / valuesArray.length,
        min: Math.min(...valuesArray),
        max: Math.max(...valuesArray)
      };
    });

    return dataPoint;
  }).sort((a, b) => a.timestamp - b.timestamp);

  return timeSeries;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (Math.floor(index) === index) {
    return sorted[index];
  } else {
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
  }
}

function calculatePerformanceScore(coreWebVitals: any): number {
  const weights = {
    lcp: 0.25,
    fid: 0.25,
    cls: 0.25,
    fcp: 0.15,
    ttfb: 0.1
  };

  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 }
  };

  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(weights).forEach(([metric, weight]) => {
    const vitalData = coreWebVitals[metric];
    if (vitalData) {
      const value = vitalData.average;
      const threshold = thresholds[metric];
      
      let score = 100;
      if (value > threshold.poor) {
        score = 0;
      } else if (value > threshold.good) {
        score = 50;
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

function generateRecommendations(insights: any): string[] {
  const recommendations = [];
  const vitals = insights.coreWebVitals;

  if (vitals.lcp && vitals.lcp.average > 2500) {
    recommendations.push('Optimize Largest Contentful Paint by reducing server response times and optimizing images');
  }

  if (vitals.fid && vitals.fid.average > 100) {
    recommendations.push('Improve First Input Delay by reducing JavaScript execution time and using web workers');
  }

  if (vitals.cls && vitals.cls.average > 0.1) {
    recommendations.push('Reduce Cumulative Layout Shift by setting dimensions for images and avoiding dynamic content insertion');
  }

  if (vitals.ttfb && vitals.ttfb.average > 800) {
    recommendations.push('Improve Time to First Byte by optimizing server performance and using CDN');
  }

  // Device-specific recommendations
  const mobilePercentage = (insights.deviceBreakdown.mobile || 0) / 
    Object.values(insights.deviceBreakdown).reduce((sum: number, count: number) => sum + count, 0);
  
  if (mobilePercentage > 0.5) {
    recommendations.push('Optimize for mobile devices with responsive images and touch-friendly interfaces');
  }

  // Network-specific recommendations
  const slowNetworkPercentage = ((insights.networkBreakdown['2g'] || 0) + (insights.networkBreakdown['slow-2g'] || 0)) /
    Object.values(insights.networkBreakdown).reduce((sum: number, count: number) => sum + count, 0);
  
  if (slowNetworkPercentage > 0.2) {
    recommendations.push('Optimize for slow networks with compression, caching, and progressive loading');
  }

  return recommendations;
}