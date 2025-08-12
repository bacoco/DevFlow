import { ContextEngineService } from '../services/ContextEngineService';
import { ActivityClassifier } from '../services/ActivityClassifier';
import { ContextAggregator } from '../services/ContextAggregator';
import { StatePredictorService } from '../services/StatePredictorService';
import { MLModelTrainer } from '../services/MLModelTrainer';
import { IDEActivityCollector } from '../services/IDEActivityCollector';
import { GitEventAnalyzer } from '../services/GitEventAnalyzer';
import { Logger } from '../utils/Logger';
import { WorkContext } from '../types';

// Mock dependencies
jest.mock('mongodb');
jest.mock('kafkajs');
jest.mock('../services/ActivityClassifier');
jest.mock('../services/ContextAggregator');
jest.mock('../services/StatePredictorService');
jest.mock('../services/MLModelTrainer');
jest.mock('../services/IDEActivityCollector');
jest.mock('../services/GitEventAnalyzer');
jest.mock('../utils/Logger');

describe('ContextEngineService', () => {
  let contextService: ContextEngineService;
  let mockMongoClient: any;
  let mockKafka: any;
  let mockLogger: Logger;

  beforeEach(() => {
    mockMongoClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn(),
          insertOne: jest.fn(),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              toArray: jest.fn()
            })
          }),
          createIndex: jest.fn()
        })
      })
    };

    mockKafka = {
      producer: jest.fn().mockReturnValue({
        connect: jest.fn(),
        send: jest.fn(),
        disconnect: jest.fn()
      }),
      consumer: jest.fn().mockReturnValue({
        connect: jest.fn(),
        subscribe: jest.fn(),
        run: jest.fn(),
        disconnect: jest.fn()
      })
    };

    mockLogger = new Logger('test');
    
    contextService = new ContextEngineService(mockMongoClient, mockKafka, mockLogger);
  });

  describe('getCurrentContext', () => {
    it('should return cached context if fresh', async () => {
      const userId = 'test-user';
      const cachedContext: WorkContext = {
        activityType: 'coding',
        projectContext: {
          projectId: 'test-project',
          name: 'Test Project',
          activeFiles: [],
          recentCommits: []
        },
        focusLevel: 80,
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

      // Set up cache
      (contextService as any).userContextCache.set(userId, cachedContext);

      const result = await contextService.getCurrentContext(userId);
      expect(result).toEqual(cachedContext);
    });

    it('should return default context if none found', async () => {
      const userId = 'new-user';
      
      // Mock database to return null
      const mockCollection = mockMongoClient.db().collection();
      mockCollection.findOne.mockResolvedValue(null);

      const result = await contextService.getCurrentContext(userId);
      
      expect(result.activityType).toBe('coding');
      expect(result.projectContext.projectId).toBe('unknown');
      expect(result.focusLevel).toBe(50);
    });
  });

  describe('updateContext', () => {
    it('should update context and emit change event', async () => {
      const userId = 'test-user';
      const contextUpdate = { focusLevel: 90 };
      
      // Mock current context
      const currentContext: WorkContext = {
        activityType: 'coding',
        projectContext: {
          projectId: 'test-project',
          name: 'Test Project',
          activeFiles: [],
          recentCommits: []
        },
        focusLevel: 70,
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

      (contextService as any).userContextCache.set(userId, currentContext);

      const emitSpy = jest.spyOn(contextService, 'emit');
      
      await contextService.updateContext(userId, contextUpdate);
      
      expect(emitSpy).toHaveBeenCalledWith(
        `context-change-${userId}`,
        expect.objectContaining({ focusLevel: 90 })
      );
    });
  });

  describe('predictNextActions', () => {
    it('should return predictions from state predictor', async () => {
      const context: WorkContext = {
        activityType: 'coding',
        projectContext: {
          projectId: 'test-project',
          name: 'Test Project',
          activeFiles: ['test.ts'],
          recentCommits: []
        },
        focusLevel: 80,
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

      const mockPredictions = [
        {
          actionType: 'run_tests',
          description: 'Run tests to verify recent code changes',
          confidence: 0.8,
          suggestedTiming: new Date(),
          context
        }
      ];

      const mockStatePredictor = (contextService as any).statePredictor;
      mockStatePredictor.predictNextActions.mockResolvedValue(mockPredictions);

      const result = await contextService.predictNextActions(context);
      
      expect(result).toEqual(mockPredictions);
      expect(mockStatePredictor.predictNextActions).toHaveBeenCalledWith(context);
    });
  });
});