import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { TaskCompletionPredictor, TaskData } from '../services/task-completion-predictor';
import { Logger } from '../utils/logger';

export function createTaskPredictionRoutes(
  predictor: TaskCompletionPredictor,
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

  // POST /api/ml/tasks/predict - Predict completion time for a single task
  router.post('/predict',
    body('task').isObject(),
    body('task.id').isString().notEmpty(),
    body('task.title').isString().notEmpty(),
    body('task.description').isString(),
    body('task.assignee').isString().notEmpty(),
    body('task.priority').isIn(['low', 'medium', 'high', 'urgent']),
    body('task.complexity').isInt({ min: 1, max: 10 }),
    body('task.estimatedHours').isFloat({ min: 0.1 }),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const task: TaskData = req.body.task;
        const prediction = await predictor.predictTaskCompletion(task);
        
        res.json({
          success: true,
          prediction
        });
      } catch (error) {
        logger.error('Failed to predict task completion:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate prediction'
        });
      }
    }
  );

  // POST /api/ml/tasks/batch-predict - Predict completion times for multiple tasks
  router.post('/batch-predict',
    body('tasks').isArray({ min: 1, max: 50 }),
    body('tasks.*.id').isString().notEmpty(),
    body('tasks.*.title').isString().notEmpty(),
    body('tasks.*.assignee').isString().notEmpty(),
    body('tasks.*.priority').isIn(['low', 'medium', 'high', 'urgent']),
    body('tasks.*.complexity').isInt({ min: 1, max: 10 }),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const tasks: TaskData[] = req.body.tasks;
        const predictions = await predictor.batchPredictTasks(tasks);
        
        res.json({
          success: true,
          predictions
        });
      } catch (error) {
        logger.error('Failed to batch predict tasks:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate batch predictions'
        });
      }
    }
  );

  // GET /api/ml/tasks/:taskId/prediction - Get prediction for existing task
  router.get('/:taskId/prediction',
    param('taskId').isString().notEmpty(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { taskId } = req.params;
        const prediction = await predictor.getTaskPredictionAPI(taskId);
        
        if (!prediction) {
          return res.status(404).json({
            success: false,
            error: 'Task not found'
          });
        }
        
        res.json({
          success: true,
          prediction
        });
      } catch (error) {
        logger.error('Failed to get task prediction:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve prediction'
        });
      }
    }
  );

  // POST /api/ml/tasks/:taskId/feedback - Update model with actual completion time
  router.post('/:taskId/feedback',
    param('taskId').isString().notEmpty(),
    body('actualHours').isFloat({ min: 0.1 }),
    body('completedAt').optional().isISO8601(),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { taskId } = req.params;
        const { actualHours } = req.body;
        
        await predictor.updateModelWithFeedback(taskId, actualHours);
        
        res.json({
          success: true,
          message: 'Feedback recorded successfully'
        });
      } catch (error) {
        logger.error('Failed to record feedback:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to record feedback'
        });
      }
    }
  );

  // GET /api/ml/tasks/model/status - Get model status and metrics
  router.get('/model/status',
    async (req: Request, res: Response) => {
      try {
        // This would typically come from the predictor's model registry
        const status = {
          modelLoaded: (predictor as any).isModelLoaded,
          modelType: 'ensemble',
          lastTrained: new Date().toISOString(),
          metrics: {
            r2Score: 0.85,
            meanAbsoluteError: 2.3,
            meanSquaredError: 8.7
          },
          trainingDataSize: 1250,
          version: '1.0.0'
        };
        
        res.json({
          success: true,
          status
        });
      } catch (error) {
        logger.error('Failed to get model status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve model status'
        });
      }
    }
  );

  // POST /api/ml/tasks/model/retrain - Trigger model retraining
  router.post('/model/retrain',
    async (req: Request, res: Response) => {
      try {
        // Trigger asynchronous retraining
        setTimeout(async () => {
          try {
            await (predictor as any).trainModel();
            logger.info('Model retraining completed successfully');
          } catch (error) {
            logger.error('Model retraining failed:', error);
          }
        }, 1000);
        
        res.json({
          success: true,
          message: 'Model retraining initiated'
        });
      } catch (error) {
        logger.error('Failed to initiate model retraining:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to initiate retraining'
        });
      }
    }
  );

  // GET /api/ml/tasks/analytics/insights - Get task completion insights
  router.get('/analytics/insights',
    query('teamId').optional().isString(),
    query('projectId').optional().isString(),
    query('days').optional().isInt({ min: 1, max: 365 }),
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { teamId, projectId, days = 30 } = req.query;
        
        // This would typically query the database for insights
        const insights = {
          averageAccuracy: 87.5,
          totalPredictions: 342,
          accuracyTrend: 'improving',
          commonRiskFactors: [
            { factor: 'High complexity', frequency: 45 },
            { factor: 'Multiple dependencies', frequency: 32 },
            { factor: 'Assignee workload', frequency: 28 }
          ],
          teamPerformance: {
            averageVelocity: 6.2,
            onTimeCompletion: 78,
            averageDelay: 1.8
          },
          recommendations: [
            'Consider breaking down high-complexity tasks',
            'Review dependency management processes',
            'Balance workload distribution across team members'
          ]
        };
        
        res.json({
          success: true,
          insights
        });
      } catch (error) {
        logger.error('Failed to get analytics insights:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve insights'
        });
      }
    }
  );

  return router;
}