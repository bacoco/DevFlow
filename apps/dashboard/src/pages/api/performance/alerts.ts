/**
 * Performance Alerts API Endpoint
 * Handles performance alert notifications and storage
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PerformanceAlert } from '../../../services/performance/types';

// In-memory storage for demo purposes
// In production, this would be stored in a database and integrated with alerting systems
let alertsStore: PerformanceAlert[] = [];

// Cleanup old alerts (keep last 500)
const cleanupAlerts = () => {
  if (alertsStore.length > 500) {
    alertsStore = alertsStore.slice(-500);
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
        await handleAlertSubmission(req, res);
        break;
      case 'GET':
        await handleAlertsRetrieval(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Performance alerts API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleAlertSubmission(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const alert: PerformanceAlert = req.body;

  // Validate alert data
  if (!isValidAlert(alert)) {
    res.status(400).json({ error: 'Invalid alert data' });
    return;
  }

  // Ensure timestamp is a Date object
  alert.timestamp = new Date(alert.timestamp);

  // Store alert
  alertsStore.push(alert);

  // Cleanup old alerts
  cleanupAlerts();

  // Process alert for notifications
  await processAlert(alert);

  // Log alert for monitoring
  console.log(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.description}`);

  res.status(200).json({ 
    success: true,
    alertId: alert.id,
    processed: true
  });
}

async function handleAlertsRetrieval(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { 
    severity, 
    metric, 
    type,
    startTime, 
    endTime, 
    limit = 50 
  } = req.query;

  let filteredAlerts = [...alertsStore];

  // Apply filters
  if (severity && typeof severity === 'string') {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }

  if (metric && typeof metric === 'string') {
    filteredAlerts = filteredAlerts.filter(a => a.metric === metric);
  }

  if (type && typeof type === 'string') {
    filteredAlerts = filteredAlerts.filter(a => a.type === type);
  }

  if (startTime && typeof startTime === 'string') {
    const start = new Date(startTime);
    filteredAlerts = filteredAlerts.filter(a => 
      new Date(a.timestamp) >= start
    );
  }

  if (endTime && typeof endTime === 'string') {
    const end = new Date(endTime);
    filteredAlerts = filteredAlerts.filter(a => 
      new Date(a.timestamp) <= end
    );
  }

  // Sort by timestamp (newest first)
  filteredAlerts.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply limit
  const limitNum = parseInt(limit as string, 10);
  if (limitNum > 0) {
    filteredAlerts = filteredAlerts.slice(0, limitNum);
  }

  // Generate summary statistics
  const summary = generateAlertsSummary(alertsStore);

  res.status(200).json({
    success: true,
    alerts: filteredAlerts,
    total: filteredAlerts.length,
    summary
  });
}

function isValidAlert(alert: any): alert is PerformanceAlert {
  return (
    alert &&
    typeof alert.id === 'string' &&
    typeof alert.type === 'string' &&
    typeof alert.metric === 'string' &&
    typeof alert.currentValue === 'number' &&
    typeof alert.threshold === 'number' &&
    typeof alert.severity === 'string' &&
    alert.timestamp &&
    typeof alert.url === 'string' &&
    typeof alert.description === 'string' &&
    ['threshold_breach', 'regression', 'budget_exceeded'].includes(alert.type) &&
    ['low', 'medium', 'high', 'critical'].includes(alert.severity)
  );
}

async function processAlert(alert: PerformanceAlert) {
  // In a production environment, this would:
  // 1. Send notifications via email, Slack, PagerDuty, etc.
  // 2. Create tickets in issue tracking systems
  // 3. Trigger automated remediation actions
  // 4. Update monitoring dashboards

  try {
    // Simulate notification processing
    if (alert.severity === 'critical') {
      await sendCriticalAlert(alert);
    } else if (alert.severity === 'high') {
      await sendHighPriorityAlert(alert);
    }

    // Log to external monitoring systems
    await logToMonitoringSystem(alert);

    // Check for alert patterns
    await checkAlertPatterns(alert);

  } catch (error) {
    console.error('Failed to process alert:', error);
  }
}

async function sendCriticalAlert(alert: PerformanceAlert) {
  // Simulate critical alert notification
  console.log(`🚨 CRITICAL ALERT: ${alert.description}`);
  console.log(`Metric: ${alert.metric}, Value: ${alert.currentValue}, Threshold: ${alert.threshold}`);
  console.log(`URL: ${alert.url}`);
  
  // In production, this would send immediate notifications
  // Example integrations:
  // - PagerDuty API
  // - Slack webhook
  // - Email notification
  // - SMS alert
}

async function sendHighPriorityAlert(alert: PerformanceAlert) {
  // Simulate high priority alert notification
  console.log(`⚠️ HIGH PRIORITY ALERT: ${alert.description}`);
  console.log(`Metric: ${alert.metric}, Value: ${alert.currentValue}, Threshold: ${alert.threshold}`);
  
  // In production, this would send notifications during business hours
}

async function logToMonitoringSystem(alert: PerformanceAlert) {
  // Simulate logging to external monitoring systems
  // Examples: DataDog, New Relic, Grafana, etc.
  
  const logEntry = {
    timestamp: alert.timestamp.toISOString(),
    level: alert.severity,
    service: 'performance-monitoring',
    metric: alert.metric,
    value: alert.currentValue,
    threshold: alert.threshold,
    url: alert.url,
    type: alert.type,
    description: alert.description,
    tags: {
      severity: alert.severity,
      metric_type: alert.metric,
      alert_type: alert.type
    }
  };

  // In production, send to monitoring service
  console.log('Monitoring log:', JSON.stringify(logEntry, null, 2));
}

async function checkAlertPatterns(alert: PerformanceAlert) {
  // Check for alert patterns that might indicate systemic issues
  const recentAlerts = alertsStore.filter(a => 
    Date.now() - new Date(a.timestamp).getTime() < 60 * 60 * 1000 // Last hour
  );

  // Check for alert storms (many alerts in short time)
  if (recentAlerts.length > 10) {
    console.log('🌪️ Alert storm detected - consider investigating systemic issues');
  }

  // Check for repeated alerts on same metric
  const sameMetricAlerts = recentAlerts.filter(a => 
    a.metric === alert.metric && a.url === alert.url
  );

  if (sameMetricAlerts.length > 3) {
    console.log(`🔄 Repeated alerts for ${alert.metric} on ${alert.url} - consider automated remediation`);
  }

  // Check for cascading failures (multiple metrics failing)
  const uniqueMetrics = new Set(recentAlerts.map(a => a.metric));
  if (uniqueMetrics.size > 5) {
    console.log('📉 Multiple metrics failing - possible infrastructure issue');
  }
}

function generateAlertsSummary(alerts: PerformanceAlert[]) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  const oneWeek = 7 * oneDay;

  const summary = {
    total: alerts.length,
    lastHour: alerts.filter(a => now - new Date(a.timestamp).getTime() < oneHour).length,
    lastDay: alerts.filter(a => now - new Date(a.timestamp).getTime() < oneDay).length,
    lastWeek: alerts.filter(a => now - new Date(a.timestamp).getTime() < oneWeek).length,
    bySeverity: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    },
    byType: {
      threshold_breach: alerts.filter(a => a.type === 'threshold_breach').length,
      regression: alerts.filter(a => a.type === 'regression').length,
      budget_exceeded: alerts.filter(a => a.type === 'budget_exceeded').length
    },
    byMetric: alerts.reduce((acc, alert) => {
      acc[alert.metric] = (acc[alert.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    topUrls: getTopAlertUrls(alerts, 5)
  };

  return summary;
}

function getTopAlertUrls(alerts: PerformanceAlert[], limit: number) {
  const urlCounts = alerts.reduce((acc, alert) => {
    acc[alert.url] = (acc[alert.url] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(urlCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([url, count]) => ({ url, count }));
}