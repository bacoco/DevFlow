import * as tf from '@tensorflow/tfjs-node';
import { ActivityClassificationResult, WorkContext } from '../types';
import { Logger } from '../utils/Logger';
import { MLModelTrainer } from './MLModelTrainer';
import { IDEActivityCollector } from './IDEActivityCollector';
import { GitEventAnalyzer } from './GitEventAnalyzer';

export class ActivityClassifier {
  private model: tf.LayersModel | null = null;
  private logger: Logger;
  private isModelLoaded = false;
  private modelTrainer: MLModelTrainer;
  private ideActivityCollector: IDEActivityCollector;
  private gitEventAnalyzer: GitEventAnalyzer;
  private trainingData: any[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
    this.modelTrainer = new MLModelTrainer(logger);
    this.ideActivityCollector = new IDEActivityCollector(logger);
    this.gitEventAnalyzer = new GitEventAnalyzer(logger);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize sub-components
      await this.ideActivityCollector.initialize();
      await this.gitEventAnalyzer.initialize();
      
      // Try to load existing model
      try {
        await this.loadMLModel('models/activity-classifier.json');
        this.logger.info('ActivityClassifier initialized with ML model');
      } catch (error) {
        this.logger.warn('ML model not found, using rule-based classification:', error);
        this.isModelLoaded = true;
      }
      
      // Start collecting training data
      this.startTrainingDataCollection();
      
      this.logger.info('ActivityClassifier initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ActivityClassifier:', error);
      throw error;
    }
  }

  async classifyActivity(activityData: any): Promise<ActivityClassificationResult> {
    try {
      if (!this.isModelLoaded) {
        await this.initialize();
      }

      // Rule-based classification for now
      const classification = this.ruleBasedClassification(activityData);
      
      return {
        activityType: classification.activityType,
        confidence: classification.confidence,
        features: this.extractFeatures(activityData),
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to classify activity:', error);
      // Return default classification on error
      return {
        activityType: 'coding',
        confidence: 0.5,
        features: {},
        timestamp: new Date()
      };
    }
  }

  private ruleBasedClassification(activityData: any): { 
    activityType: WorkContext['activityType']; 
    confidence: number; 
  } {
    const {
      fileType,
      actionType,
      keywordFrequency,
      timeSpentInFile,
      numberOfEdits,
      gitActivity,
      calendarStatus
    } = activityData;

    // Meeting detection
    if (calendarStatus === 'in-meeting') {
      return { activityType: 'meeting', confidence: 0.9 };
    }

    // Code review detection
    if (actionType === 'viewing' && gitActivity?.type === 'pull_request') {
      return { activityType: 'reviewing', confidence: 0.8 };
    }

    // Planning detection
    if (fileType === 'markdown' && keywordFrequency?.planning > 0.3) {
      return { activityType: 'planning', confidence: 0.7 };
    }

    // Debugging detection
    if (keywordFrequency?.debugging > 0.4 || actionType === 'debugging') {
      return { activityType: 'debugging', confidence: 0.75 };
    }

    // Default to coding if actively editing code files
    if (numberOfEdits > 0 && this.isCodeFile(fileType)) {
      return { activityType: 'coding', confidence: 0.8 };
    }

    // Fallback to coding with lower confidence
    return { activityType: 'coding', confidence: 0.5 };
  }

  private extractFeatures(activityData: any): Record<string, number> {
    return {
      editsPerMinute: activityData.numberOfEdits / (activityData.timeSpentInFile / 60) || 0,
      fileTypeScore: this.getFileTypeScore(activityData.fileType),
      keywordDensity: this.calculateKeywordDensity(activityData.keywordFrequency),
      gitActivityScore: this.getGitActivityScore(activityData.gitActivity),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  private isCodeFile(fileType: string): boolean {
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 
      'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'hs', 'ml'
    ];
    return codeExtensions.includes(fileType?.toLowerCase() || '');
  }

  private getFileTypeScore(fileType: string): number {
    const scores: Record<string, number> = {
      'js': 1.0, 'ts': 1.0, 'jsx': 1.0, 'tsx': 1.0,
      'py': 0.9, 'java': 0.9, 'cpp': 0.9, 'c': 0.9,
      'md': 0.3, 'txt': 0.2, 'json': 0.5, 'yaml': 0.4
    };
    return scores[fileType?.toLowerCase()] || 0.5;
  }

  private calculateKeywordDensity(keywordFrequency: any): number {
    if (!keywordFrequency) return 0;
    
    const totalKeywords = Object.values(keywordFrequency).reduce((sum: number, freq: any) => sum + freq, 0);
    return totalKeywords / 100; // Normalize to 0-1 range
  }

  private getGitActivityScore(gitActivity: any): number {
    if (!gitActivity) return 0;
    
    const scores: Record<string, number> = {
      'commit': 0.8,
      'push': 0.7,
      'pull_request': 0.9,
      'merge': 0.6,
      'branch': 0.5
    };
    
    return scores[gitActivity.type] || 0.3;
  }

  // Enhanced ML model loading and training
  private async loadMLModel(modelPath: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`file://${modelPath}`);
      this.isModelLoaded = true;
      this.logger.info('ML model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load ML model:', error);
      throw error;
    }
  }

  // ML-based classification
  private async mlClassification(features: tf.Tensor): Promise<{ 
    activityType: WorkContext['activityType']; 
    confidence: number; 
  }> {
    if (!this.model) {
      throw new Error('ML model not loaded');
    }

    const prediction = this.model.predict(features) as tf.Tensor;
    const probabilities = await prediction.data();
    
    const activities: WorkContext['activityType'][] = ['coding', 'reviewing', 'planning', 'debugging', 'meeting'];
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    
    // Clean up tensors
    features.dispose();
    prediction.dispose();
    
    return {
      activityType: activities[maxIndex],
      confidence: probabilities[maxIndex]
    };
  }

  // Training data collection
  private startTrainingDataCollection(): void {
    // Collect IDE activity data
    this.ideActivityCollector.onActivityData((data) => {
      this.collectTrainingData(data, 'ide');
    });

    // Collect Git event data
    this.gitEventAnalyzer.onGitEvent((data) => {
      this.collectTrainingData(data, 'git');
    });
  }

  private collectTrainingData(data: any, source: string): void {
    const features = this.extractFeatures(data);
    const trainingPoint = {
      features,
      source,
      timestamp: new Date(),
      // Label will be added through user feedback or rule-based classification
      label: null
    };
    
    this.trainingData.push(trainingPoint);
    
    // Keep only recent training data (last 1000 points)
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }
  }

  // Train new model with collected data
  async trainModel(): Promise<void> {
    try {
      if (this.trainingData.length < 100) {
        this.logger.warn('Insufficient training data, need at least 100 samples');
        return;
      }

      this.logger.info(`Training model with ${this.trainingData.length} samples`);
      
      // Prepare training data
      const labeledData = this.trainingData.filter(d => d.label !== null);
      if (labeledData.length < 50) {
        this.logger.warn('Insufficient labeled data for training');
        return;
      }

      const model = await this.modelTrainer.trainActivityClassifier(labeledData);
      
      if (model) {
        // Replace current model
        if (this.model) {
          this.model.dispose();
        }
        this.model = model;
        this.isModelLoaded = true;
        
        // Save model
        await this.saveModel();
        
        this.logger.info('Model training completed successfully');
      }
    } catch (error) {
      this.logger.error('Failed to train model:', error);
    }
  }

  private async saveModel(): Promise<void> {
    if (!this.model) return;
    
    try {
      await this.model.save('file://models/activity-classifier');
      this.logger.info('Model saved successfully');
    } catch (error) {
      this.logger.error('Failed to save model:', error);
    }
  }

  // Add label to training data (for supervised learning)
  addTrainingLabel(timestamp: Date, label: WorkContext['activityType']): void {
    const dataPoint = this.trainingData.find(d => 
      Math.abs(d.timestamp.getTime() - timestamp.getTime()) < 30000 // Within 30 seconds
    );
    
    if (dataPoint) {
      dataPoint.label = label;
      this.logger.debug(`Added training label: ${label}`);
    }
  }

  // Get training statistics
  getTrainingStats(): any {
    const labeled = this.trainingData.filter(d => d.label !== null);
    const labelCounts = labeled.reduce((acc, d) => {
      acc[d.label] = (acc[d.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSamples: this.trainingData.length,
      labeledSamples: labeled.length,
      labelDistribution: labelCounts,
      modelLoaded: this.isModelLoaded
    };
  }

  // Enhanced classification with both ML and rule-based fallback
  async classifyActivityEnhanced(activityData: any): Promise<ActivityClassificationResult> {
    try {
      let classification;
      
      if (this.model && this.isModelLoaded) {
        // Use ML model
        const features = this.extractFeaturesForML(activityData);
        const featureTensor = tf.tensor2d([features]);
        classification = await this.mlClassification(featureTensor);
      } else {
        // Fallback to rule-based
        classification = this.ruleBasedClassification(activityData);
      }
      
      // Collect this data for future training
      this.collectTrainingData(activityData, 'classification');
      
      return {
        activityType: classification.activityType,
        confidence: classification.confidence,
        features: this.extractFeatures(activityData),
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to classify activity:', error);
      // Return safe default
      return {
        activityType: 'coding',
        confidence: 0.5,
        features: {},
        timestamp: new Date()
      };
    }
  }

  private extractFeaturesForML(activityData: any): number[] {
    const features = this.extractFeatures(activityData);
    
    // Convert features to numerical array for ML model
    return [
      features.editsPerMinute || 0,
      features.fileTypeScore || 0,
      features.keywordDensity || 0,
      features.gitActivityScore || 0,
      features.timeOfDay || 0,
      features.dayOfWeek || 0,
      activityData.timeSpentInFile || 0,
      activityData.numberOfEdits || 0,
      activityData.interruptionCount || 0,
      this.getActivityTypeScore(activityData.actionType) || 0
    ];
  }

  private getActivityTypeScore(actionType: string): number {
    const scores: Record<string, number> = {
      'editing': 1.0,
      'viewing': 0.3,
      'debugging': 0.8,
      'reviewing': 0.6,
      'planning': 0.4
    };
    return scores[actionType] || 0.5;
  }
}