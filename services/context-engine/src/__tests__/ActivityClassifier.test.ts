import { ActivityClassifier } from '../services/ActivityClassifier';
import { MLModelTrainer } from '../services/MLModelTrainer';
import { IDEActivityCollector } from '../services/IDEActivityCollector';
import { GitEventAnalyzer } from '../services/GitEventAnalyzer';
import { Logger } from '../utils/Logger';
import { ActivityClassificationResult } from '../types';

// Mock dependencies
jest.mock('../services/MLModelTrainer');
jest.mock('../services/IDEActivityCollector');
jest.mock('../services/GitEventAnalyzer');
jest.mock('../utils/Logger');
jest.mock('@tensorflow/tfjs-node');

describe('ActivityClassifier', () => {
  let activityClassifier: ActivityClassifier;
  let mockLogger: Logger;
  let mockModelTrainer: jest.Mocked<MLModelTrainer>;
  let mockIDECollector: jest.Mocked<IDEActivityCollector>;
  let mockGitAnalyzer: jest.Mocked<GitEventAnalyzer>;

  beforeEach(() => {
    mockLogger = new Logger('test');
    mockModelTrainer = new MLModelTrainer(mockLogger) as jest.Mocked<MLModelTrainer>;
    mockIDECollector = new IDEActivityCollector(mockLogger) as jest.Mocked<IDEActivityCollector>;
    mockGitAnalyzer = new GitEventAnalyzer(mockLogger) as jest.Mocked<GitEventAnalyzer>;
    
    activityClassifier = new ActivityClassifier(mockLogger);
    
    // Mock the sub-components
    (activityClassifier as any).modelTrainer = mockModelTrainer;
    (activityClassifier as any).ideActivityCollector = mockIDECollector;
    (activityClassifier as any).gitEventAnalyzer = mockGitAnalyzer;
  });

  describe('initialize', () => {
    it('should initialize all sub-components', async () => {
      mockIDECollector.initialize = jest.fn().mockResolvedValue(undefined);
      mockGitAnalyzer.initialize = jest.fn().mockResolvedValue(undefined);

      await activityClassifier.initialize();

      expect(mockIDECollector.initialize).toHaveBeenCalled();
      expect(mockGitAnalyzer.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockIDECollector.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));

      await expect(activityClassifier.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('classifyActivity', () => {
    beforeEach(async () => {
      mockIDECollector.initialize = jest.fn().mockResolvedValue(undefined);
      mockGitAnalyzer.initialize = jest.fn().mockResolvedValue(undefined);
      await activityClassifier.initialize();
    });

    it('should classify coding activity correctly', async () => {
      const activityData = {
        fileType: 'typescript',
        actionType: 'editing',
        numberOfEdits: 25,
        timeSpentInFile: 1800,
        keywordFrequency: { function: 0.3, class: 0.2 }
      };

      const result = await activityClassifier.classifyActivity(activityData);

      expect(result.activityType).toBe('coding');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should classify reviewing activity correctly', async () => {
      const activityData = {
        fileType: 'diff',
        actionType: 'viewing',
        numberOfEdits: 0,
        gitActivity: { type: 'pull_request' }
      };

      const result = await activityClassifier.classifyActivity(activityData);

      expect(result.activityType).toBe('reviewing');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify meeting activity correctly', async () => {
      const activityData = {
        calendarStatus: 'in-meeting',
        actionType: 'idle'
      };

      const result = await activityClassifier.classifyActivity(activityData);

      expect(result.activityType).toBe('meeting');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle classification errors gracefully', async () => {
      const invalidData = null;

      const result = await activityClassifier.classifyActivity(invalidData);

      expect(result.activityType).toBe('coding');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('trainModel', () => {
    beforeEach(async () => {
      mockIDECollector.initialize = jest.fn().mockResolvedValue(undefined);
      mockGitAnalyzer.initialize = jest.fn().mockResolvedValue(undefined);
      await activityClassifier.initialize();
    });

    it('should not train with insufficient data', async () => {
      // Set up insufficient training data
      (activityClassifier as any).trainingData = Array(50).fill({
        features: {},
        label: null,
        timestamp: new Date()
      });

      await activityClassifier.trainModel();

      expect(mockModelTrainer.trainActivityClassifier).not.toHaveBeenCalled();
    });

    it('should train model with sufficient labeled data', async () => {
      // Set up sufficient training data
      (activityClassifier as any).trainingData = Array(100).fill({
        features: { editsPerMinute: 10 },
        label: 'coding',
        timestamp: new Date()
      });

      const mockModel = { predict: jest.fn(), dispose: jest.fn(), save: jest.fn() };
      mockModelTrainer.trainActivityClassifier = jest.fn().mockResolvedValue(mockModel);

      await activityClassifier.trainModel();

      expect(mockModelTrainer.trainActivityClassifier).toHaveBeenCalled();
    });
  });

  describe('addTrainingLabel', () => {
    it('should add label to matching training data', () => {
      const timestamp = new Date();
      (activityClassifier as any).trainingData = [
        {
          features: {},
          label: null,
          timestamp: new Date(timestamp.getTime() - 10000) // 10 seconds ago
        }
      ];

      activityClassifier.addTrainingLabel(timestamp, 'coding');

      expect((activityClassifier as any).trainingData[0].label).toBe('coding');
    });

    it('should not add label if no matching timestamp found', () => {
      const timestamp = new Date();
      (activityClassifier as any).trainingData = [
        {
          features: {},
          label: null,
          timestamp: new Date(timestamp.getTime() - 60000) // 1 minute ago
        }
      ];

      activityClassifier.addTrainingLabel(timestamp, 'coding');

      expect((activityClassifier as any).trainingData[0].label).toBeNull();
    });
  });

  describe('getTrainingStats', () => {
    it('should return correct training statistics', () => {
      (activityClassifier as any).trainingData = [
        { label: 'coding', timestamp: new Date() },
        { label: 'reviewing', timestamp: new Date() },
        { label: null, timestamp: new Date() }
      ];

      const stats = activityClassifier.getTrainingStats();

      expect(stats.totalSamples).toBe(3);
      expect(stats.labeledSamples).toBe(2);
      expect(stats.labelDistribution).toEqual({
        coding: 1,
        reviewing: 1
      });
    });
  });

  describe('feature extraction', () => {
    it('should extract features correctly', () => {
      const activityData = {
        fileType: 'typescript',
        numberOfEdits: 20,
        timeSpentInFile: 1800,
        keywordFrequency: { function: 0.3 },
        gitActivity: { type: 'commit' }
      };

      const result = (activityClassifier as any).extractFeatures(activityData);

      expect(result.editsPerMinute).toBeCloseTo(20 / 30); // 1800 seconds = 30 minutes
      expect(result.fileTypeScore).toBe(1.0); // TypeScript score
      expect(result.gitActivityScore).toBe(0.8); // Commit score
      expect(result.timeOfDay).toBeDefined();
      expect(result.dayOfWeek).toBeDefined();
    });

    it('should handle missing data gracefully', () => {
      const activityData = {};

      const result = (activityClassifier as any).extractFeatures(activityData);

      expect(result.editsPerMinute).toBe(0);
      expect(result.fileTypeScore).toBe(0.5);
      expect(result.keywordDensity).toBe(0);
    });
  });
});