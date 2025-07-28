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

// Export productivity metrics as CSV
router.get('/metrics/csv', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const {
      userId,
      teamId,
      type,
      period,
      startDate,
      endDate,
      limit = '1000'
    } = req.query;

    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (teamId) filters.teamId = teamId as string;
    if (type) filters.type = type as MetricType;
    if (period) filters.period = period as TimePeriod;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const metrics = await databaseService.queryMetrics(filters);

    // Generate CSV content
    const csvHeader = 'ID,User ID,Metric Type,Value,Timestamp,Aggregation Period,Team ID,Project ID,Confidence\n';
    const csvRows = metrics.map(metric => [
      metric.id,
      metric.userId,
      metric.metricType,
      metric.value,
      metric.timestamp.toISOString(),
      metric.aggregationPeriod,
      metric.context.teamId || '',
      metric.context.projectId || '',
      metric.confidence || ''
    ].join(',')).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="productivity-metrics-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

    logger.info('Metrics exported as CSV', { 
      userId: req.user?.id, 
      recordCount: metrics.length,
      filters 
    });
  } catch (error) {
    logger.error('CSV export error', error);
    res.status(500).json({ error: 'Failed to export metrics as CSV' });
  }
});

// Export flow states as JSON
router.get('/flow-states/json', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const {
      userId,
      teamId,
      startDate,
      endDate,
      limit = '1000'
    } = req.query;

    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (teamId) filters.teamId = teamId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const flowStates = await databaseService.queryFlowStates(filters);

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.id,
        recordCount: flowStates.length,
        filters
      },
      data: flowStates
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="flow-states-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);

    logger.info('Flow states exported as JSON', { 
      userId: req.user?.id, 
      recordCount: flowStates.length,
      filters 
    });
  } catch (error) {
    logger.error('JSON export error', error);
    res.status(500).json({ error: 'Failed to export flow states as JSON' });
  }
});

// Export team productivity report
router.get('/team-report/:teamId', requireRoleMiddleware(UserRole.TEAM_LEAD), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Fetch team information
    const team = await databaseService.teams.findOne({ id: teamId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Fetch team metrics
    const metrics = await databaseService.queryMetrics({
      teamId,
      startDate: start,
      endDate: end
    });

    // Fetch team flow states
    const flowStates = await databaseService.queryFlowStates({
      teamId,
      startDate: start,
      endDate: end
    });

    // Calculate aggregated statistics
    const report = {
      team: {
        id: team.id,
        name: team.name,
        memberCount: team.memberIds.length
      },
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      metrics: {
        total: metrics.length,
        byType: groupMetricsByType(metrics),
        averages: calculateMetricAverages(metrics)
      },
      flowStates: {
        total: flowStates.length,
        averageFocusScore: calculateAverageFocusScore(flowStates),
        totalFocusTime: calculateTotalFocusTime(flowStates),
        averageInterruptions: calculateAverageInterruptions(flowStates)
      },
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.id
    };

    if (format === 'csv') {
      const csvContent = generateTeamReportCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="team-report-${teamId}-${start.toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="team-report-${teamId}-${start.toISOString().split('T')[0]}.json"`);
      res.json(report);
    }

    logger.info('Team report exported', { 
      teamId, 
      userId: req.user?.id, 
      format,
      period: { start, end }
    });
  } catch (error) {
    logger.error('Team report export error', error);
    res.status(500).json({ error: 'Failed to export team report' });
  }
});

// Export user privacy data (GDPR compliance)
router.get('/user-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Users can only export their own data, or admins can export any user's data
    if (requestingUser?.id !== userId && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Insufficient permissions to export this user data' });
    }

    // Fetch all user data
    const user = await databaseService.users.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const metrics = await databaseService.queryMetrics({ userId });
    const flowStates = await databaseService.queryFlowStates({ userId });
    const telemetry = await databaseService.ideTelemetry.find({ userId }).toArray();
    const dashboards = await databaseService.dashboards.find({ userId }).toArray();
    const alerts = await databaseService.alerts.find({ userId }).toArray();

    const userData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        privacySettings: user.privacySettings,
        preferences: user.preferences
      },
      metrics: metrics.length,
      flowStates: flowStates.length,
      telemetryEvents: telemetry.length,
      dashboards: dashboards.length,
      alerts: alerts.length,
      exportedAt: new Date().toISOString(),
      exportedBy: requestingUser?.id
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(userData);

    logger.info('User data exported', { 
      userId, 
      exportedBy: requestingUser?.id,
      dataTypes: Object.keys(userData).filter(key => typeof userData[key] === 'number')
    });
  } catch (error) {
    logger.error('User data export error', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Export available endpoints
router.get('/', (req, res) => {
  res.json({
    name: 'DevFlow Intelligence Export API',
    description: 'Export productivity data in various formats',
    endpoints: {
      'GET /metrics/csv': 'Export productivity metrics as CSV',
      'GET /flow-states/json': 'Export flow states as JSON',
      'GET /team-report/:teamId': 'Export comprehensive team productivity report',
      'GET /user-data/:userId': 'Export all user data (GDPR compliance)'
    },
    supportedFormats: ['json', 'csv'],
    authentication: 'Required (Bearer token)',
    rateLimit: '10 requests per minute'
  });
});

// Helper functions

function groupMetricsByType(metrics: any[]) {
  return metrics.reduce((acc, metric) => {
    acc[metric.metricType] = (acc[metric.metricType] || 0) + 1;
    return acc;
  }, {});
}

function calculateMetricAverages(metrics: any[]) {
  const byType = metrics.reduce((acc, metric) => {
    if (!acc[metric.metricType]) {
      acc[metric.metricType] = { sum: 0, count: 0 };
    }
    acc[metric.metricType].sum += metric.value;
    acc[metric.metricType].count += 1;
    return acc;
  }, {});

  return Object.keys(byType).reduce((acc, type) => {
    acc[type] = byType[type].sum / byType[type].count;
    return acc;
  }, {});
}

function calculateAverageFocusScore(flowStates: any[]) {
  if (flowStates.length === 0) return 0;
  return flowStates.reduce((sum, flow) => sum + flow.focusScore, 0) / flowStates.length;
}

function calculateTotalFocusTime(flowStates: any[]) {
  return flowStates.reduce((sum, flow) => sum + flow.totalFocusTimeMs, 0);
}

function calculateAverageInterruptions(flowStates: any[]) {
  if (flowStates.length === 0) return 0;
  return flowStates.reduce((sum, flow) => sum + flow.interruptionCount, 0) / flowStates.length;
}

function generateTeamReportCSV(report: any) {
  const header = 'Metric,Value\n';
  const rows = [
    `Team Name,${report.team.name}`,
    `Team ID,${report.team.id}`,
    `Member Count,${report.team.memberCount}`,
    `Period Start,${report.period.startDate}`,
    `Period End,${report.period.endDate}`,
    `Total Metrics,${report.metrics.total}`,
    `Average Focus Score,${report.flowStates.averageFocusScore}`,
    `Total Focus Time (ms),${report.flowStates.totalFocusTime}`,
    `Average Interruptions,${report.flowStates.averageInterruptions}`,
    `Generated At,${report.generatedAt}`
  ].join('\n');
  
  return header + rows;
}

export { router as exportRoutes };