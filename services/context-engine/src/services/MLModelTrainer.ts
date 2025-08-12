import * as tf from '@tensorflow/tfjs-node';
import { Logger } from '../utils/Logger';
import { WorkContext } from '../types';

export class MLModelTrainer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async trainActivityClassifier(trainingData: any[]): Promise<tf.LayersModel | null> {
    try {
      this.logger.info(`Starting model training with ${trainingData.length} samples`);

      // Prepare training data
      const { features, labels } = this.prepareTrainingData(trainingData);
      
      if (features.length === 0) {
        this.logger.error('No valid training data available');
        return null;
      }

      // Create model architecture
      const model = this.createModelArchitecture();

      // Convert data to tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      // Split data into training and validation sets
      const splitIndex = Math.floor(features.length * 0.8);
      const xTrain = xs.slice([0, 0], [splitIndex, -1]);
      const yTrain = ys.slice([0, 0], [splitIndex, -1]);
      const xVal = xs.slice([splitIndex, 0], [-1, -1]);
      const yVal = ys.slice([splitIndex, 0], [-1, -1]);

      // Train the model
      const history = await model.fit(xTrain, yTrain, {
        epochs: 50,
        batchSize: 32,
        validationData: [xVal, yVal],
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              this.logger.info(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
            }
          }
        }
      });

      // Clean up tensors
      xs.dispose();
      ys.dispose();
      xTrain.dispose();
      yTrain.dispose();
      xVal.dispose();
      yVal.dispose();

      // Evaluate model performance
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      
      this.logger.info(`Model training completed - Final loss: ${finalLoss}, Final accuracy: ${finalAccuracy}`);

      return model;
    } catch (error) {
      this.logger.error('Failed to train activity classifier:', error);
      return null;
    }
  }

  private prepareTrainingData(trainingData: any[]): { features: number[][], labels: number[][] } {
    const features: number[][] = [];
    const labels: number[][] = [];
    
    const activityTypes: WorkContext['activityType'][] = ['coding', 'reviewing', 'planning', 'debugging', 'meeting'];

    trainingData.forEach(sample => {
      if (!sample.label || !sample.features) return;

      // Extract numerical features
      const featureVector = [
        sample.features.editsPerMinute || 0,
        sample.features.fileTypeScore || 0,
        sample.features.keywordDensity || 0,
        sample.features.gitActivityScore || 0,
        sample.features.timeOfDay || 0,
        sample.features.dayOfWeek || 0,
        sample.features.timeSpentInFile || 0,
        sample.features.numberOfEdits || 0,
        sample.features.interruptionCount || 0,
        sample.features.activityTypeScore || 0
      ];

      // Create one-hot encoded label
      const labelIndex = activityTypes.indexOf(sample.label);
      if (labelIndex === -1) return;

      const labelVector = new Array(activityTypes.length).fill(0);
      labelVector[labelIndex] = 1;

      features.push(featureVector);
      labels.push(labelVector);
    });

    return { features, labels };
  }

  private createModelArchitecture(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.dense({
          inputShape: [10], // 10 features
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        
        // Dropout for regularization
        tf.layers.dropout({ rate: 0.3 }),
        
        // Hidden layer
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        
        // Dropout for regularization
        tf.layers.dropout({ rate: 0.2 }),
        
        // Hidden layer
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        
        // Output layer (5 activity types)
        tf.layers.dense({
          units: 5,
          activation: 'softmax'
        })
      ]
    });

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  // Create a more sophisticated model for time-series data
  async trainTimeSeriesClassifier(timeSeriesData: any[]): Promise<tf.LayersModel | null> {
    try {
      this.logger.info('Training time-series activity classifier');

      const { sequences, labels } = this.prepareTimeSeriesData(timeSeriesData);
      
      if (sequences.length === 0) {
        this.logger.error('No valid time-series data available');
        return null;
      }

      // Create LSTM model for time-series classification
      const model = tf.sequential({
        layers: [
          tf.layers.lstm({
            inputShape: [10, 10], // 10 time steps, 10 features
            units: 50,
            returnSequences: true,
            dropout: 0.2,
            recurrentDropout: 0.2
          }),
          tf.layers.lstm({
            units: 25,
            dropout: 0.2,
            recurrentDropout: 0.2
          }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 5,
            activation: 'softmax'
          })
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Convert to tensors
      const xs = tf.tensor3d(sequences);
      const ys = tf.tensor2d(labels);

      // Train the model
      await model.fit(xs, ys, {
        epochs: 30,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true
      });

      // Clean up
      xs.dispose();
      ys.dispose();

      this.logger.info('Time-series model training completed');
      return model;
    } catch (error) {
      this.logger.error('Failed to train time-series classifier:', error);
      return null;
    }
  }

  private prepareTimeSeriesData(timeSeriesData: any[]): { sequences: number[][][], labels: number[][] } {
    const sequences: number[][][] = [];
    const labels: number[][] = [];
    const sequenceLength = 10;
    
    // Group data by user and create sequences
    const userGroups = this.groupByUser(timeSeriesData);
    
    Object.values(userGroups).forEach((userData: any[]) => {
      // Sort by timestamp
      userData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Create sliding window sequences
      for (let i = 0; i <= userData.length - sequenceLength; i++) {
        const sequence = userData.slice(i, i + sequenceLength);
        const target = userData[i + sequenceLength - 1]; // Predict the last item in sequence
        
        if (!target.label) continue;
        
        const sequenceFeatures = sequence.map(item => [
          item.features?.editsPerMinute || 0,
          item.features?.fileTypeScore || 0,
          item.features?.keywordDensity || 0,
          item.features?.gitActivityScore || 0,
          item.features?.timeOfDay || 0,
          item.features?.dayOfWeek || 0,
          item.features?.timeSpentInFile || 0,
          item.features?.numberOfEdits || 0,
          item.features?.interruptionCount || 0,
          item.features?.activityTypeScore || 0
        ]);
        
        // Create one-hot label
        const activityTypes: WorkContext['activityType'][] = ['coding', 'reviewing', 'planning', 'debugging', 'meeting'];
        const labelIndex = activityTypes.indexOf(target.label);
        if (labelIndex === -1) continue;
        
        const labelVector = new Array(activityTypes.length).fill(0);
        labelVector[labelIndex] = 1;
        
        sequences.push(sequenceFeatures);
        labels.push(labelVector);
      }
    });
    
    return { sequences, labels };
  }

  private groupByUser(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const userId = item.userId || 'default';
      if (!groups[userId]) {
        groups[userId] = [];
      }
      groups[userId].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }

  // Evaluate model performance
  async evaluateModel(model: tf.LayersModel, testData: any[]): Promise<any> {
    try {
      const { features, labels } = this.prepareTrainingData(testData);
      
      if (features.length === 0) {
        return { accuracy: 0, loss: 0 };
      }

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      const evaluation = model.evaluate(xs, ys) as tf.Tensor[];
      const loss = await evaluation[0].data();
      const accuracy = await evaluation[1].data();

      xs.dispose();
      ys.dispose();
      evaluation.forEach(tensor => tensor.dispose());

      return {
        loss: loss[0],
        accuracy: accuracy[0]
      };
    } catch (error) {
      this.logger.error('Failed to evaluate model:', error);
      return { accuracy: 0, loss: 0 };
    }
  }
}