import { MLModelTrainer } from '../services/MLModelTrainer';
import { Logger } from '../utils/Logger';
import * as tf from '@tensorflow/tfjs-node';

// Mock TensorFlow
jest.mock('@tensorflow/tfjs-node');
jest.mock('../utils/Logger');

describe('MLModelTrainer', () => {
  let modelTrainer: MLModelTrainer;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger('test');
    modelTrainer = new MLModelTrainer(mockLogger);
    
    // Reset TensorFlow mocks
    jest.clearAllMocks();
  });

  describe('trainActivityClassifier', () => {
    it('should train model with valid training data', async () => {
      const trainingData = [
        {
          features: {
            editsPerMinute: 10,
            fileTypeScore: 1.0,
            keywordDensity: 0.3,
            gitActivityScore: 0.8,
            timeOfDay: 10,
            dayOfWeek: 1
          },
          label: 'coding'
        },
        {
          features: {
            editsPerMinute: 0,
            fileTypeScore: 0.3,
            keywordDensity: 0.1,
            gitActivityScore: 0.9,
            timeOfDay: 14,
            dayOfWeek: 2
          },
          label: 'reviewing'
        }
      ];

      // Mock TensorFlow operations
      const mockTensor = {
        slice: jest.fn().mockReturnThis(),
        dispose: jest.fn()
      };
      
      const mockModel = {
        fit: jest.fn().mockResolvedValue({
          history: {
            loss: [0.5, 0.3, 0.2],
            acc: [0.6, 0.8, 0.9]
          }
        }),
        compile: jest.fn()
      };

      (tf.tensor2d as jest.Mock).mockReturnValue(mockTensor);
      (tf.sequential as jest.Mock).mockReturnValue(mockModel);
      (tf.layers.dense as jest.Mock).mockReturnValue({});
      (tf.layers.dropout as jest.Mock).mockReturnValue({});

      const result = await modelTrainer.trainActivityClassifier(trainingData);

      expect(result).toBe(mockModel);
      expect(mockModel.fit).toHaveBeenCalled();
      expect(mockTensor.dispose).toHaveBeenCalled();
    });

    it('should return null with empty training data', async () => {
      const result = await modelTrainer.trainActivityClassifier([]);

      expect(result).toBeNull();
    });

    it('should handle training errors gracefully', async () => {
      const trainingData = [
        { features: { editsPerMinute: 10 }, label: 'coding' }
      ];

      (tf.tensor2d as jest.Mock).mockImplementation(() => {
        throw new Error('TensorFlow error');
      });

      const result = await modelTrainer.trainActivityClassifier(trainingData);

      expect(result).toBeNull();
    });
  });

  describe('trainTimeSeriesClassifier', () => {
    it('should train LSTM model for time series data', async () => {
      const timeSeriesData = Array(50).fill({
        userId: 'user1',
        features: {
          editsPerMinute: 10,
          fileTypeScore: 1.0
        },
        label: 'coding',
        timestamp: new Date()
      });

      const mockTensor = {
        dispose: jest.fn()
      };
      
      const mockModel = {
        fit: jest.fn().mockResolvedValue({}),
        compile: jest.fn()
      };

      (tf.tensor3d as jest.Mock).mockReturnValue(mockTensor);
      (tf.tensor2d as jest.Mock).mockReturnValue(mockTensor);
      (tf.sequential as jest.Mock).mockReturnValue(mockModel);
      (tf.layers.lstm as jest.Mock).mockReturnValue({});
      (tf.layers.dense as jest.Mock).mockReturnValue({});
      (tf.layers.dropout as jest.Mock).mockReturnValue({});

      const result = await modelTrainer.trainTimeSeriesClassifier(timeSeriesData);

      expect(result).toBe(mockModel);
      expect(mockModel.fit).toHaveBeenCalled();
    });

    it('should return null with insufficient time series data', async () => {
      const result = await modelTrainer.trainTimeSeriesClassifier([]);

      expect(result).toBeNull();
    });
  });

  describe('evaluateModel', () => {
    it('should evaluate model performance', async () => {
      const testData = [
        {
          features: {
            editsPerMinute: 10,
            fileTypeScore: 1.0,
            keywordDensity: 0.3
          },
          label: 'coding'
        }
      ];

      const mockModel = {
        evaluate: jest.fn().mockReturnValue([
          { data: jest.fn().mockResolvedValue([0.2]) }, // loss
          { data: jest.fn().mockResolvedValue([0.9]) }  // accuracy
        ])
      };

      const mockTensor = {
        dispose: jest.fn()
      };

      (tf.tensor2d as jest.Mock).mockReturnValue(mockTensor);

      const result = await modelTrainer.evaluateModel(mockModel as any, testData);

      expect(result.loss).toBe(0.2);
      expect(result.accuracy).toBe(0.9);
      expect(mockTensor.dispose).toHaveBeenCalled();
    });

    it('should handle evaluation errors', async () => {
      const mockModel = {
        evaluate: jest.fn().mockImplementation(() => {
          throw new Error('Evaluation error');
        })
      };

      const result = await modelTrainer.evaluateModel(mockModel as any, []);

      expect(result.accuracy).toBe(0);
      expect(result.loss).toBe(0);
    });
  });

  describe('data preparation', () => {
    it('should prepare training data correctly', () => {
      const trainingData = [
        {
          features: {
            editsPerMinute: 10,
            fileTypeScore: 1.0,
            keywordDensity: 0.3,
            gitActivityScore: 0.8,
            timeOfDay: 10,
            dayOfWeek: 1,
            timeSpentInFile: 1800,
            numberOfEdits: 20,
            interruptionCount: 2,
            activityTypeScore: 0.9
          },
          label: 'coding'
        },
        {
          features: {
            editsPerMinute: 0,
            fileTypeScore: 0.3,
            keywordDensity: 0.1,
            gitActivityScore: 0.9,
            timeOfDay: 14,
            dayOfWeek: 2,
            timeSpentInFile: 600,
            numberOfEdits: 0,
            interruptionCount: 0,
            activityTypeScore: 0.6
          },
          label: 'reviewing'
        }
      ];

      const result = (modelTrainer as any).prepareTrainingData(trainingData);

      expect(result.features).toHaveLength(2);
      expect(result.labels).toHaveLength(2);
      expect(result.features[0]).toHaveLength(10); // 10 features
      expect(result.labels[0]).toHaveLength(5); // 5 activity types
      
      // Check one-hot encoding
      expect(result.labels[0]).toEqual([1, 0, 0, 0, 0]); // coding
      expect(result.labels[1]).toEqual([0, 1, 0, 0, 0]); // reviewing
    });

    it('should filter out invalid training data', () => {
      const trainingData = [
        { features: { editsPerMinute: 10 }, label: 'coding' },
        { features: { editsPerMinute: 5 }, label: null }, // Invalid - no label
        { features: null, label: 'reviewing' }, // Invalid - no features
        { features: { editsPerMinute: 15 }, label: 'invalid_activity' } // Invalid - unknown activity
      ];

      const result = (modelTrainer as any).prepareTrainingData(trainingData);

      expect(result.features).toHaveLength(1); // Only one valid sample
      expect(result.labels).toHaveLength(1);
    });
  });

  describe('model architecture', () => {
    it('should create proper model architecture', () => {
      const mockLayers = {
        dense: jest.fn().mockReturnValue({}),
        dropout: jest.fn().mockReturnValue({})
      };
      
      const mockModel = {
        compile: jest.fn()
      };

      (tf.layers as any) = mockLayers;
      (tf.sequential as jest.Mock).mockReturnValue(mockModel);
      (tf.regularizers.l2 as jest.Mock).mockReturnValue({});
      (tf.train.adam as jest.Mock).mockReturnValue({});

      const result = (modelTrainer as any).createModelArchitecture();

      expect(tf.sequential).toHaveBeenCalled();
      expect(mockModel.compile).toHaveBeenCalled();
      expect(mockLayers.dense).toHaveBeenCalledTimes(4); // 3 hidden + 1 output
      expect(mockLayers.dropout).toHaveBeenCalledTimes(2);
    });
  });
});