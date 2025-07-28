import { Router } from 'express';
import { requireRoleMiddleware } from '../middleware/auth';
import { UserRole, MetricType, TimePeriod } from '@devflow/shared-types';
import { databaseService } from '../services/database';
import winston from 'winston';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Grafana data source test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'DevFlow Intelligence data source is working',
    timestamp: new Date().toISOString()
  });
});

// Grafana search endpoint - returns available metrics
router.post('/search', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const { target } = req.body;
    
    const metrics = [
      'productivity.time_in_flow',
      'productivity.code_churn',
      'productivity.review_lag',
      'productivity.focus_time',
      'productivity.complexity_trend',
      'productivity.collaboration_score',
      'flow.interruption_count',
      'flow.focus_score',
      'flow.deep_work_percentage'
    ];

    // Filter metrics based on search target if provided
    const filteredMetrics = target 
      ? metrics.filter(metric => metric.toLowerCase().includes(target.toLowerCase()))
      : metrics;

    res.json(filteredMetrics);
  } catch (error) {
    logger.error('Grafana search error', error);
    res.status(500).json({ error: 'Failed to search metrics' });
  }
});

// Grafana query endpoint - returns time series data
router.post('/query', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const { targets, range, intervalMs, maxDataPoints } = req.body;
    const results = [];

    for (const target of targets) {
      const { target: metricName, refId } = target;
      
      // Parse metric name to extract type and filters
      const [category, metricType] = metricName.split('.');
      
      let data = [];
      
      if (category === 'productivity') {
        // Query productivity metrics
        const metrics = await databaseService.queryMetrics({
          type: metricType.toUpperCase() as MetricType,
          startDate: new Date(range.from),
          endDate: new Date(range.to),
          limit: maxDataPoints || 1000
        });

        data = metrics.map(metric => [
          metric.value,
          metric.timestamp.getTime()
        ]);
      } else if (category === 'flow') {
        // Query flow state metrics
        const flowStates = await databaseService.queryFlowStates({
          startDate: new Date(range.from),
          endDate: new Date(range.to),
          limit: maxDataPoints || 1000
        });

        data = flowStates.map(flow => {
          let value = 0;
          switch (metricType) {
            case 'interruption_count':
              value = flow.interruptionCount;
              break;
            case 'focus_score':
              value = flow.focusScore;
              break;
            case 'deep_work_percentage':
              value = flow.deepWorkPercentage;
              break;
          }
          return [value, flow.startTime.getTime()];
        });
      }

      results.push({
        target: metricName,
        refId,
        datapoints: data
      });
    }

    res.json(results);
  } catch (error) {
    logger.error('Grafana query error', error);
    res.status(500).json({ error: 'Failed to query metrics' });
  }
});

// Grafana annotations endpoint - returns events for timeline
router.post('/annotations', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const { range, annotation } = req.body;
    
    // Query git events for annotations
    const gitEvents = await databaseService.gitEvents.find({
      timestamp: {
        $gte: new Date(range.from),
        $lte: new Date(range.to)
      }
    }).limit(100).toArray();

    const annotations = gitEvents.map(event => ({
      annotation: annotation,
      time: event.timestamp.getTime(),
      title: `${event.type}: ${event.repository}`,
      text: `Author: ${event.author}<br/>Repository: ${event.repository}`,
      tags: [event.type, event.repository]
    }));

    res.json(annotations);
  } catch (error) {
    logger.error('Grafana annotations error', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Export Grafana dashboard configuration
router.get('/dashboard/:dashboardId', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const { dashboardId } = req.params;
    
    // Fetch dashboard from database
    const dashboard = await databaseService.dashboards.findOne({ id: dashboardId });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Convert DevFlow dashboard to Grafana format
    const grafanaDashboard = {
      dashboard: {
        id: null,
        title: dashboard.name,
        tags: ['devflow', 'productivity'],
        timezone: 'browser',
        panels: dashboard.widgets.map((widget: any, index: number) => ({
          id: index + 1,
          title: widget.title,
          type: mapWidgetTypeToGrafana(widget.type),
          targets: [{
            target: mapWidgetConfigToTarget(widget.config),
            refId: 'A'
          }],
          gridPos: {
            h: widget.config.height || 8,
            w: widget.config.width || 12,
            x: (index % 2) * 12,
            y: Math.floor(index / 2) * 8
          }
        })),
        time: {
          from: 'now-7d',
          to: 'now'
        },
        timepicker: {},
        templating: {
          list: []
        },
        annotations: {
          list: [{
            name: 'Git Events',
            datasource: 'DevFlow Intelligence',
            enable: true,
            iconColor: 'rgba(0, 211, 255, 1)'
          }]
        },
        refresh: '5m',
        schemaVersion: 16,
        version: 1
      },
      overwrite: false
    };

    res.json(grafanaDashboard);
  } catch (error) {
    logger.error('Grafana dashboard export error', error);
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
});

// Helper function to map widget types to Grafana panel types
function mapWidgetTypeToGrafana(widgetType: string): string {
  const mapping: Record<string, string> = {
    'metric-chart': 'graph',
    'stat-card': 'stat',
    'table': 'table',
    'heatmap': 'heatmap',
    'gauge': 'gauge'
  };
  return mapping[widgetType] || 'graph';
}

// Helper function to map widget config to Grafana target
function mapWidgetConfigToTarget(config: any): string {
  if (config.metricType) {
    return `productivity.${config.metricType.toLowerCase()}`;
  }
  if (config.flowMetric) {
    return `flow.${config.flowMetric.toLowerCase()}`;
  }
  return 'productivity.time_in_flow';
}

export { router as grafanaRoutes };