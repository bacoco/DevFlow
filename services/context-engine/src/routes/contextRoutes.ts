import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ContextEngineService } from '../services/ContextEngineService';
import { Logger } from '../utils/Logger';
import { TimeRange } from '../types';

export function contextRoutes(contextService: ContextEngineService, logger: Logger): Router {
  const router = Router();

  // Validation middleware
  const handleValidationErrors = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

  // GET /api/context/:userId - Get current context for user
  router.get('/:userId',
    param('userId').isString().notEmpty(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const context = await contextService.getCurrentContext(userId);
        res.json({ context });
      } catch (error) {
        logger.error('Failed to get current context:', error);
        res.status(500).json({ error: 'Failed to get current context' });
      }
    }
  );

  // PUT /api/context/:userId - Update context for user
  router.put('/:userId',
    param('userId').isString().notEmpty(),
    body('activityType').optional().isIn(['coding', 'reviewing', 'planning', 'debugging', 'meeting']),
    body('focusLevel').optional().isInt({ min: 0, max: 100 }),
    body('projectContext').optional().isObject(),
    body('collaborationState').optional().isObject(),
    body('environmentFactors').optional().isObject(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const contextUpdate = req.body;
        
        await contextService.updateContext(userId, contextUpdate);
        const updatedContext = await contextService.getCurrentContext(userId);
        
        res.json({ context: updatedContext });
      } catch (error) {
        logger.error('Failed to update context:', error);
        res.status(500).json({ error: 'Failed to update context' });
      }
    }
  );

  // GET /api/context/:userId/history - Get context history
  router.get('/:userId/history',
    param('userId').isString().notEmpty(),
    query('startDate').isISO8601().toDate(),
    query('endDate').isISO8601().toDate(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        
        const timeRange: TimeRange = {
          start: startDate as Date,
          end: endDate as Date
        };
        
        const history = await contextService.getContextHistory(userId, timeRange);
        res.json({ history });
      } catch (error) {
        logger.error('Failed to get context history:', error);
        res.status(500).json({ error: 'Failed to get context history' });
      }
    }
  );

  // POST /api/context/:userId/predictions - Get predicted next actions
  router.post('/:userId/predictions',
    param('userId').isString().notEmpty(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const context = await contextService.getCurrentContext(userId);
        const predictions = await contextService.predictNextActions(context);
        
        res.json({ predictions });
      } catch (error) {
        logger.error('Failed to get predictions:', error);
        res.status(500).json({ error: 'Failed to get predictions' });
      }
    }
  );

  // POST /api/context/:userId/activity - Report IDE activity
  router.post('/:userId/activity',
    param('userId').isString().notEmpty(),
    body('activityData').isObject(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { activityData } = req.body;
        
        // This would typically be handled by Kafka, but we provide a direct endpoint too
        const currentContext = await contextService.getCurrentContext(userId);
        
        // Update context based on activity
        const contextUpdate: any = {};
        
        if (activityData.fileType && activityData.actionType === 'editing') {
          contextUpdate.activityType = 'coding';
        }
        
        if (activityData.projectId) {
          contextUpdate.projectContext = {
            ...currentContext.projectContext,
            projectId: activityData.projectId,
            name: activityData.projectName || currentContext.projectContext.name
          };
        }
        
        await contextService.updateContext(userId, contextUpdate);
        const updatedContext = await contextService.getCurrentContext(userId);
        
        res.json({ context: updatedContext });
      } catch (error) {
        logger.error('Failed to process activity data:', error);
        res.status(500).json({ error: 'Failed to process activity data' });
      }
    }
  );

  // GET /api/context/:userId/insights - Get context insights
  router.get('/:userId/insights',
    param('userId').isString().notEmpty(),
    query('days').optional().isInt({ min: 1, max: 30 }),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const days = parseInt(req.query.days as string) || 7;
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        
        const history = await contextService.getContextHistory(userId, { start: startDate, end: endDate });
        
        // Generate insights from history
        const insights = generateContextInsights(history);
        
        res.json({ insights });
      } catch (error) {
        logger.error('Failed to get context insights:', error);
        res.status(500).json({ error: 'Failed to get context insights' });
      }
    }
  );

  return router;
}

function generateContextInsights(history: any[]): any {
  const insights = {
    totalEvents: history.length,
    activityDistribution: {} as Record<string, number>,
    averageFocusLevel: 0,
    mostProductiveHours: [] as number[],
    collaborationFrequency: 0,
    patterns: [] as any[]
  };

  if (history.length === 0) {
    return insights;
  }

  // Calculate activity distribution
  const activityCounts: Record<string, number> = {};
  let totalFocusLevel = 0;
  const hourlyActivity: Record<number, number> = {};
  let collaborationEvents = 0;

  history.forEach(event => {
    const activity = event.context.activityType;
    activityCounts[activity] = (activityCounts[activity] || 0) + 1;
    
    totalFocusLevel += event.context.focusLevel || 0;
    
    const hour = new Date(event.timestamp).getHours();
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    
    if (event.context.collaborationState?.activeCollaborators?.length > 0) {
      collaborationEvents++;
    }
  });

  // Calculate percentages for activity distribution
  Object.entries(activityCounts).forEach(([activity, count]) => {
    insights.activityDistribution[activity] = Math.round((count / history.length) * 100);
  });

  // Calculate average focus level
  insights.averageFocusLevel = Math.round(totalFocusLevel / history.length);

  // Find most productive hours (top 3)
  insights.mostProductiveHours = Object.entries(hourlyActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Calculate collaboration frequency
  insights.collaborationFrequency = Math.round((collaborationEvents / history.length) * 100);

  // Generate patterns
  insights.patterns = [
    {
      type: 'peak_activity',
      description: `Most active during hours: ${insights.mostProductiveHours.join(', ')}`,
      confidence: 0.8
    },
    {
      type: 'focus_trend',
      description: insights.averageFocusLevel > 70 ? 'High focus levels maintained' : 'Focus levels could be improved',
      confidence: 0.7
    }
  ];

  return insights;
}