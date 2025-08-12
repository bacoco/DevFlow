import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { BottleneckDetector } from '../services/bottleneck-detector';
import { Logger } from '../utils/logger';

export function createBottleneckRoutes(
  bottleneckDetector: BottleneckDetector,
  logger: Logger
): Router {
  const router = Router();

  // Validation middleware
  const handleValidationErrors = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  // GET /api/ml/bottlenecks/analyze/:projectId - Analyze bottlenecks for a project
  router.get('/analyze/:projectId',
    param('projectId').isString().notEmpty(),
    query('teamId').optional().isString(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { teamId } = req.query;
        
        const analysis = await bottleneckDetector.getBottleneckAnalysis(
          projectId, 
          teamId as string
        );
        
        res.json({
          success: true,
          analysis
        });
      } catch (error) {
        logger.error('Failed to analyze bottlenecks:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to analyze bottlenecks'
        });
      }
    }
  );

  // GET /api/ml/bottlenecks/risk/:projectId - Get risk score for a project
  router.get('/risk/:projectId',
    param('projectId').isString().notEmpty(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const riskScore = await bottleneckDetector.getProjectRiskScore(projectId);
        
        res.json({
          success: true,
          riskScore,
          riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'
        });
      } catch (error) {
        logger.error('Failed to get risk score:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get risk score'
        });
      }
    }
  );

  // GET /api/ml/bottlenecks/recommendations/:projectId - Get recommendations for a project
  router.get('/recommendations/:projectId',
    param('projectId').isString().notEmpty(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const recommendations = await bottleneckDetector.getBottleneckRecommendations(projectId);
        
        res.json({
          success: true,
          recommendations
        });
      } catch (error) {
        logger.error('Failed to get recommendations:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get recommendations'
        });
      }
    }
  );

  // POST /api/ml/bottlenecks/schedule/:projectId - Schedule periodic bottleneck analysis
  router.post('/schedule/:projectId',
    param('projectId').isString().notEmpty(),
    query('intervalHours').optional().isInt({ min: 1, max: 168 }), // Max 1 week
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const intervalHours = parseInt(req.query.intervalHours as string) || 24;
        
        await bottleneckDetector.scheduleBottleneckAnalysis(projectId, intervalHours);
        
        res.json({
          success: true,
          message: `Scheduled bottleneck analysis for project ${projectId} every ${intervalHours} hours`
        });
      } catch (error) {
        logger.error('Failed to schedule bottleneck analysis:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to schedule analysis'
        });
      }
    }
  );

  // GET /api/ml/bottlenecks/dashboard/:projectId - Get bottleneck dashboard data
  router.get('/dashboard/:projectId',
    param('projectId').isString().notEmpty(),
    query('teamId').optional().isString(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { teamId } = req.query;
        
        const analysis = await bottleneckDetector.getBottleneckAnalysis(
          projectId, 
          teamId as string
        );
        
        // Transform data for dashboard consumption
        const dashboardData = {
          summary: {
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskScore > 70 ? 'high' : analysis.riskScore > 40 ? 'medium' : 'low',
            totalBottlenecks: analysis.bottlenecks.length,
            criticalBottlenecks: analysis.bottlenecks.filter(b => b.severity === 'critical').length,
            estimatedDelay: analysis.bottlenecks.reduce((sum, b) => sum + b.estimatedDelay, 0)
          },
          bottlenecksByType: analysis.bottlenecks.reduce((acc, b) => {
            acc[b.type] = (acc[b.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          bottlenecksBySeverity: analysis.bottlenecks.reduce((acc, b) => {
            acc[b.severity] = (acc[b.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          criticalPath: {
            length: analysis.criticalPath.length,
            tasks: analysis.criticalPath
          },
          resourceUtilization: analysis.metrics.resourceUtilization,
          topRecommendations: analysis.recommendations.slice(0, 3),
          riskFactors: analysis.metrics.riskFactors,
          lastAnalyzed: analysis.analysisDate
        };
        
        res.json({
          success: true,
          dashboard: dashboardData
        });
      } catch (error) {
        logger.error('Failed to get dashboard data:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get dashboard data'
        });
      }
    }
  );

  // GET /api/ml/bottlenecks/trends/:projectId - Get bottleneck trends over time
  router.get('/trends/:projectId',
    param('projectId').isString().notEmpty(),
    query('days').optional().isInt({ min: 7, max: 90 }),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const days = parseInt(req.query.days as string) || 30;
        
        // This would typically query historical analysis data
        // For now, we'll return mock trend data
        const trends = {
          riskScoreTrend: [
            { date: '2024-01-01', score: 45 },
            { date: '2024-01-02', score: 52 },
            { date: '2024-01-03', score: 48 },
            { date: '2024-01-04', score: 55 },
            { date: '2024-01-05', score: 42 }
          ],
          bottleneckCountTrend: [
            { date: '2024-01-01', count: 3 },
            { date: '2024-01-02', count: 5 },
            { date: '2024-01-03', count: 4 },
            { date: '2024-01-04', count: 6 },
            { date: '2024-01-05', count: 2 }
          ],
          bottleneckTypeDistribution: {
            resource: [2, 3, 2, 4, 1],
            dependency: [1, 1, 2, 1, 1],
            capacity: [0, 1, 0, 1, 0],
            skill: [0, 0, 0, 0, 0],
            external: [0, 0, 0, 0, 0]
          },
          averageResolutionTime: 24.5, // hours
          preventedDelays: 156 // hours saved through early detection
        };
        
        res.json({
          success: true,
          trends,
          period: `${days} days`
        });
      } catch (error) {
        logger.error('Failed to get bottleneck trends:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get trends'
        });
      }
    }
  );

  // GET /api/ml/bottlenecks/export/:projectId - Export bottleneck analysis
  router.get('/export/:projectId',
    param('projectId').isString().notEmpty(),
    query('format').optional().isIn(['json', 'csv']),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const format = req.query.format as string || 'json';
        
        const analysis = await bottleneckDetector.getBottleneckAnalysis(projectId);
        
        if (format === 'csv') {
          // Convert to CSV format
          const csvData = this.convertToCSV(analysis);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="bottlenecks-${projectId}.csv"`);
          res.send(csvData);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="bottlenecks-${projectId}.json"`);
          res.json(analysis);
        }
      } catch (error) {
        logger.error('Failed to export bottleneck analysis:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to export analysis'
        });
      }
    }
  );

  // Helper function to convert analysis to CSV
  function convertToCSV(analysis: any): string {
    const headers = [
      'Bottleneck ID',
      'Type',
      'Severity',
      'Description',
      'Affected Tasks',
      'Estimated Delay (hours)',
      'Confidence',
      'Detected At'
    ];
    
    const rows = analysis.bottlenecks.map((b: any) => [
      b.id,
      b.type,
      b.severity,
      `"${b.description}"`,
      b.affectedTasks.length,
      b.estimatedDelay,
      b.confidence,
      b.detectedAt
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  return router;
}