import { ContextEngineService } from '../../services/ContextEngineService';
import { ActivityClassifier } from '../../services/ActivityClassifier';
import { ContextAggregator } from '../../services/ContextAggregator';
import { StatePredictorService } from '../../services/StatePredictorService';
import { Logger } from '../../utils/Logger';
import { WorkContext, ContextAggregatorInput } from '../../types';

// Mock external dependencies
jest.mock('mongodb');
jest.mock('kafkajs');
jest.mock('@tensorflow/tfjs-node');

describe('Context Pipeline Integration', () => {
  let contextEngine: ContextEngineService;
  let activityClassifier: ActivityClassifier;
  let contextAggregator: ContextAggregator;
  let statePredictor: StatePredictorService;
  let logger: Logger;

  beforeEach(async () => {
    logger = new Logger('test');
    
    // Create real instances (not mocked) for integration testing
    activityClassifier = new ActivityClassifier(logger);
    contextAggregator = new ContextAggregator(logger);
    statePredictor = new StatePredictorService(logger);
    
    // Initialize components
    await activityClassifier.initialize();
    await contextAggregator.initialize();
    await statePredictor.initialize();
  });

  describe('End-to-End Context Processing', () => {
    it('should process IDE activity through the complete pipeline', async () => {
      const userId = 'test-user';
      
      // Simulate IDE activity input
      const ideActivityData = {
        fileType: 'typescript',
        actionType: 'editing',
        keywordFrequency: { function: 0.3, class: 0.2 },
        timeSpentInFile: 1800, // 30 minutes
        numberOfEdits: 25,
        projectId: 'test-project',
        projectName: 'Test Project',
        activeFile: 'src/test.ts',
        continuousEditingTime: 1200, // 20 minutes
        interruptionCount: 2,
        keystrokePattern: 'steady' as const
      };

      // Step 1: Classify activity
      const classification = await activityClassifier.classifyActivity(ideActivityData);
      expect(classification.activityType).toBe('coding');
      expect(classification.confidence).toBeGreaterThan(0.7);

      // Step 2: Aggregate context
      const aggregatorInput: ContextAggregatorInput = {
        ideActivity: ideActivityData,
        environmentData: {
          timeOfDay: '10:00:00',
          dayOfWeek: 'Monday',
          workingHours: true,
          deviceType: 'desktop',
          networkQuality: 'good'
        }
      };

      const aggregatedContext = await contextAggregator.aggregateContext(
        userId,
        aggregatorInput
      );

      expect(aggregatedContext.activityType).toBe('coding');
      expect(aggregatedContext.focusLevel).toBeGreaterThan(50);
      expect(aggregatedContext.confidence).toBeGreaterThan(0.5);

      // Step 3: Predict next actions
      const predictions = await statePredictor.predictNextActions(aggregatedContext, userId);
      
      expect(predictions).toHaveLength(5);
      expect(predictions[0].confidence).toBeGreaterThan(0);
      expect(predictions.some(p => p.actionType === 'run_tests')).toBe(true);
    });

    it('should handle meeting context correctly', async () => {
      const userId = 'test-user';
      
      const aggregatorInput: ContextAggregatorInput = {
        calendarData: {
          inMeeting: true,
          meetingParticipants: ['colleague1', 'colleague2'],
          meetingType: 'standup'
        },
        environmentData: {
          timeOfDay: '09:00:00',
          dayOfWeek: 'Monday',
          workingHours: true,
          deviceType: 'desktop',
          networkQuality: 'good'
        }
      };

      const aggregatedContext = await contextAggregator.aggregateContext(
        userId,
        aggregatorInput
      );

      expect(aggregatedContext.activityType).toBe('meeting');
      expect(aggregatedContext.collaborationState.meetingStatus).toBe('in-meeting');

      const predictions = await statePredictor.predictNextActions(aggregatedContext, userId);
      expect(predictions.some(p => p.actionType === 'meeting_followup')).toBe(true);
    });

    it('should adapt to low focus scenarios', async () => {
      const userId = 'test-user';
      
      const aggregatorInput: ContextAggregatorInput = {
        ideActivity: {
          fileType: 'typescript',
          actionType: 'viewing',
          numberOfEdits: 2,
          timeSpentInFile: 300,
          interruptionCount: 8,
          keystrokePattern: 'irregular' as const
        },
        biometricData: {
          stressLevel: 80,
          concentration: 25,
          heartRateVariability: 20
        },
        environmentData: {
          timeOfDay: '15:00:00',
          dayOfWeek: 'Friday',
          workingHours: true,
          deviceType: 'desktop',
          networkQuality: 'poor'
        }
      };

      const aggregatedContext = await contextAggregator.aggregateContext(
        userId,
        aggregatorInput
      );

      expect(aggregatedContext.focusLevel).toBeLessThan(40);

      const predictions = await statePredictor.predictNextActions(aggregatedContext, userId);
      expect(predictions.some(p => p.actionType === 'take_break')).toBe(true);
      expect(predictions.some(p => p.actionType === 'switch_task')).toBe(true);
    });

    it('should handle Git activity integration', async () => {
      const userId = 'test-user';
      
      const gitEvents = [{
        hash: 'abc123',
        message: 'Fix critical bug in authentication',
        author: 'test-user',
        timestamp: new Date(),
        files: ['src/auth.ts', 'tests/auth.test.ts']
      }];

      const aggregatorInput: ContextAggregatorInput = {
        gitEvents,
        ideActivity: {
          fileType: 'typescript',
          actionType: 'editing',
          numberOfEdits: 15,
          keywordFrequency: { debug: 0.4, fix: 0.3 }
        }
      };

      const aggregatedContext = await contextAggregator.aggregateContext(
        userId,
        aggregatorInput
      );

      expect(aggregatedContext.activityType).toBe('debugging');
      expect(aggregatedContext.projectContext.recentCommits).toHaveLength(1);

      const predictions = await statePredictor.predictNextActions(aggregatedContext, userId);
      expect(predictions.some(p => p.actionType === 'run_tests')).toBe(true);
      expect(predictions.some(p => p.actionType === 'update_documentation')).toBe(true);
    });
  });

  describe('Context History and Learning', () => {
    it('should learn from historical patterns', async () => {
      const userId = 'test-user';
      
      // Create historical context events
      const historicalEvents = Array.from({ length: 50 }, (_, i) => ({
        id: `event-${i}`,
        userId,
        eventType: 'activity_change' as const,
        context: {
          activityType: i % 3 === 0 ? 'coding' : i % 3 === 1 ? 'reviewing' : 'planning',
          focusLevel: 60 + (i % 20),
          projectContext: {
            projectId: 'test-project',
            name: 'Test Project',
            activeFiles: [`file-${i}.ts`],
            recentCommits: []
          },
          collaborationState: {
            activeCollaborators: [],
            sharedArtifacts: [],
            communicationChannels: [],
            meetingStatus: 'available' as const
          },
          environmentFactors: {
            timeOfDay: `${9 + (i % 8)}:00:00`,
            dayOfWeek: 'Monday',
            workingHours: true,
            deviceType: 'desktop' as const,
            networkQuality: 'good' as const
          },
          timestamp: new Date(Date.now() - (50 - i) * 60000), // Spread over time
          confidence: 0.8
        } as WorkContext,
        timestamp: new Date(Date.now() - (50 - i) * 60000),
        source: 'test'
      }));

      // Train the state predictor with historical data
      await statePredictor.learnFromHistoricalData(userId, historicalEvents);

      // Test prediction with learned patterns
      const currentContext: WorkContext = {
        activityType: 'coding',
        focusLevel: 75,
        projectContext: {
          projectId: 'test-project',
          name: 'Test Project',
          activeFiles: ['current-file.ts'],
          recentCommits: []
        },
        collaborationState: {
          activeCollaborators: [],
          sharedArtifacts: [],
          communicationChannels: [],
          meetingStatus: 'available'
        },
        environmentFactors: {
          timeOfDay: '10:00:00',
          dayOfWeek: 'Monday',
          workingHours: true,
          deviceType: 'desktop',
          networkQuality: 'good'
        },
        timestamp: new Date(),
        confidence: 0.8
      };

      const predictions = await statePredictor.predictNextActions(currentContext, userId);
      
      expect(predictions).toHaveLength(5);
      expect(predictions[0].confidence).toBeGreaterThan(0);
    });

    it('should maintain context history in aggregator', async () => {
      const userId = 'test-user';
      
      // Process multiple contexts to build history
      for (let i = 0; i < 5; i++) {
        const aggregatorInput: ContextAggregatorInput = {
          ideActivity: {
            fileType: 'typescript',
            actionType: 'editing',
            numberOfEdits: 10 + i,
            timeSpentInFile: 600 + i * 300
          }
        };

        await contextAggregator.aggregateContext(userId, aggregatorInput);
      }

      // Verify that history affects subsequent aggregations
      const finalInput: ContextAggregatorInput = {
        ideActivity: {
          fileType: 'typescript',
          actionType: 'editing',
          numberOfEdits: 20,
          timeSpentInFile: 1800
        }
      };

      const finalContext = await contextAggregator.aggregateContext(userId, finalInput);
      
      // Context should have higher confidence due to consistent history
      expect(finalContext.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle missing input data gracefully', async () => {
      const userId = 'test-user';
      
      // Empty input
      const emptyInput: ContextAggregatorInput = {};
      
      const context = await contextAggregator.aggregateContext(userId, emptyInput);
      
      expect(context.activityType).toBe('coding'); // Default fallback
      expect(context.confidence).toBeGreaterThan(0);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should handle invalid activity data', async () => {
      const invalidData = {
        fileType: null,
        actionType: 'invalid_action',
        numberOfEdits: -1
      };

      const result = await activityClassifier.classifyActivity(invalidData);
      
      expect(result.activityType).toBe('coding'); // Safe fallback
      expect(result.confidence).toBe(0.5);
    });

    it('should provide predictions even without historical data', async () => {
      const context: WorkContext = {
        activityType: 'coding',
        focusLevel: 60,
        projectContext: {
          projectId: 'new-project',
          name: 'New Project',
          activeFiles: [],
          recentCommits: []
        },
        collaborationState: {
          activeCollaborators: [],
          sharedArtifacts: [],
          communicationChannels: [],
          meetingStatus: 'available'
        },
        environmentFactors: {
          timeOfDay: '10:00:00',
          dayOfWeek: 'Monday',
          workingHours: true,
          deviceType: 'desktop',
          networkQuality: 'good'
        },
        timestamp: new Date(),
        confidence: 0.7
      };

      const predictions = await statePredictor.predictNextActions(context);
      
      expect(predictions).toHaveLength(5);
      expect(predictions.every(p => p.confidence > 0)).toBe(true);
    });
  });
});