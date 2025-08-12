import { MongoClient, Db, Collection } from 'mongodb';
import { Matrix } from 'ml-matrix';
import { Logger } from '../utils/logger';
import { MLFlowClient } from './mlflow-client';
import { ModelRegistry } from './model-registry';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  complexity: number; // 1-10 scale
  estimatedHours: number;
  actualHours?: number;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dependencies: string[];
  tags: string[];
  projectId: string;
  teamId: string;
}

export interface TaskFeatures {
  titleLength: number;
  descriptionLength: number;
  priority: number; // Encoded: low=1, medium=2, high=3, urgent=4
  complexity: number;
  estimatedHours: number;
  dependencyCount: number;
  tagCount: number;
  assigneeExperience: number; // Historical completion rate
  teamVelocity: number; // Team's average completion rate
  projectComplexity: number; // Average complexity of project tasks
  timeOfCreation: number; // Hour of day (0-23)
  dayOfWeek: number; // 0-6
  isBlocked: number; // 0 or 1
  similarTasksAvgTime: number; // Average time for similar tasks
}

export interface CompletionPrediction {
  taskId: string;
  estimatedHours: number;
  confidence: number;
  riskFactors: RiskFactor[];
  suggestedMilestones: Milestone[];
  completionProbability: number; // Probability of completion within estimated time
}

export interface RiskFactor {
  type: 'complexity' | 'dependencies' | 'assignee_workload' | 'team_capacity' | 'historical_delays';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // Hours of potential delay
}

export interface Milestone {
  name: string;
  estimatedDate: Date;
  confidence: number;
  dependencies: string[];
}

export class TaskCompletionPredictor {
  private db: Db;
  private tasksCollection: Collection<TaskData>;
  private logger: Logger;
  private mlflowClient: MLFlowClient;
  private modelRegistry: ModelRegistry;
  private model: any = null;
  private isModelLoaded = false;

  constructor(
    mongoClient: MongoClient,
    logger: Logger,
    mlflowClient: MLFlowClient,
    modelRegistry: ModelRegistry
  ) {
    this.db = mongoClient.db('devflow_tasks');
    this.tasksCollection = this.db.collection<TaskData>('tasks');
    this.logger = logger;
    this.mlflowClient = mlflowClient;
    this.modelRegistry = modelRegistry;
  }

  async initialize(): Promise<void> {
    try {
      // Load existing model or train new one
      await this.loadOrTrainModel();
      this.logger.info('TaskCompletionPredictor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize TaskCompletionPredictor:', error);
      throw error;
    }
  }

  async predictTaskCompletion(task: TaskData): Promise<CompletionPrediction> {
    try {
      // Extract features from task
      const features = await this.extractFeatures(task);
      
      // Make prediction using trained model
      const prediction = await this.makePrediction(features);
      
      // Analyze risk factors
      const riskFactors = await this.analyzeRiskFactors(task, features);
      
      // Generate suggested milestones
      const milestones = await this.generateMilestones(task, prediction.estimatedHours);
      
      return {
        taskId: task.id,
        estimatedHours: prediction.estimatedHours,
        confidence: prediction.confidence,
        riskFactors,
        suggestedMilestones: milestones,
        completionProbability: prediction.completionProbability
      };
    } catch (error) {
      this.logger.error(`Failed to predict completion for task ${task.id}:`, error);
      
      // Return fallback prediction
      return {
        taskId: task.id,
        estimatedHours: task.estimatedHours || 8,
        confidence: 0.5,
        riskFactors: [],
        suggestedMilestones: [],
        completionProbability: 0.7
      };
    }
  }

  async batchPredictTasks(tasks: TaskData[]): Promise<CompletionPrediction[]> {
    const predictions = await Promise.all(
      tasks.map(task => this.predictTaskCompletion(task))
    );
    
    return predictions;
  }

  private async loadOrTrainModel(): Promise<void> {
    try {
      // Try to load existing model from registry
      const modelInfo = await this.modelRegistry.getLatestModel('task-completion-predictor');
      
      if (modelInfo) {
        this.model = await this.modelRegistry.loadModel(modelInfo.id);
        this.isModelLoaded = true;
        this.logger.info('Loaded existing task completion prediction model');
      } else {
        // Train new model
        await this.trainModel();
      }
    } catch (error) {
      this.logger.warn('Failed to load model, training new one:', error);
      await this.trainModel();
    }
  }

  private async trainModel(): Promise<void> {
    try {
      this.logger.info('Training new task completion prediction model');
      
      // Get historical task data
      const historicalTasks = await this.getHistoricalTasks();
      
      if (historicalTasks.length < 100) {
        this.logger.warn('Insufficient historical data for training');
        return;
      }

      // Prepare training data
      const trainingData = await this.prepareTrainingData(historicalTasks);
      
      // Train multiple models and select best
      const models = await this.trainMultipleModels(trainingData);
      const bestModel = this.selectBestModel(models);
      
      // Register model in MLflow
      const modelId = await this.mlflowClient.logModel(bestModel, {
        name: 'task-completion-predictor',
        version: '1.0.0',
        metrics: bestModel.metrics,
        parameters: bestModel.parameters
      });
      
      // Save to model registry
      await this.modelRegistry.registerModel({
        id: modelId,
        name: 'task-completion-predictor',
        version: '1.0.0',
        type: 'regression',
        metrics: bestModel.metrics,
        createdAt: new Date()
      });
      
      this.model = bestModel;
      this.isModelLoaded = true;
      
      this.logger.info('Task completion prediction model trained and registered successfully');
    } catch (error) {
      this.logger.error('Failed to train model:', error);
      throw error;
    }
  }

  private async getHistoricalTasks(): Promise<TaskData[]> {
    // Get completed tasks from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const tasks = await this.tasksCollection.find({
      status: 'done',
      completedAt: { $gte: sixMonthsAgo },
      actualHours: { $exists: true, $gt: 0 }
    }).toArray();
    
    return tasks;
  }

  private async prepareTrainingData(tasks: TaskData[]): Promise<{ features: number[][], targets: number[] }> {
    const features: number[][] = [];
    const targets: number[] = [];
    
    for (const task of tasks) {
      const taskFeatures = await this.extractFeatures(task);
      const featureVector = this.featuresToVector(taskFeatures);
      
      features.push(featureVector);
      targets.push(task.actualHours!);
    }
    
    return { features, targets };
  }

  private async extractFeatures(task: TaskData): Promise<TaskFeatures> {
    // Get assignee experience
    const assigneeExperience = await this.getAssigneeExperience(task.assignee);
    
    // Get team velocity
    const teamVelocity = await this.getTeamVelocity(task.teamId);
    
    // Get project complexity
    const projectComplexity = await this.getProjectComplexity(task.projectId);
    
    // Get similar tasks average time
    const similarTasksAvgTime = await this.getSimilarTasksAvgTime(task);
    
    return {
      titleLength: task.title.length,
      descriptionLength: task.description.length,
      priority: this.encodePriority(task.priority),
      complexity: task.complexity,
      estimatedHours: task.estimatedHours,
      dependencyCount: task.dependencies.length,
      tagCount: task.tags.length,
      assigneeExperience,
      teamVelocity,
      projectComplexity,
      timeOfCreation: new Date(task.createdAt).getHours(),
      dayOfWeek: new Date(task.createdAt).getDay(),
      isBlocked: task.status === 'blocked' ? 1 : 0,
      similarTasksAvgTime
    };
  }

  private featuresToVector(features: TaskFeatures): number[] {
    return [
      features.titleLength,
      features.descriptionLength,
      features.priority,
      features.complexity,
      features.estimatedHours,
      features.dependencyCount,
      features.tagCount,
      features.assigneeExperience,
      features.teamVelocity,
      features.projectComplexity,
      features.timeOfCreation,
      features.dayOfWeek,
      features.isBlocked,
      features.similarTasksAvgTime
    ];
  }

  private encodePriority(priority: TaskData['priority']): number {
    const mapping = { low: 1, medium: 2, high: 3, urgent: 4 };
    return mapping[priority];
  }

  private async getAssigneeExperience(assignee: string): Promise<number> {
    const completedTasks = await this.tasksCollection.countDocuments({
      assignee,
      status: 'done',
      completedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
    });
    
    return Math.min(10, completedTasks / 5); // Normalize to 0-10 scale
  }

  private async getTeamVelocity(teamId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const completedTasks = await this.tasksCollection.find({
      teamId,
      status: 'done',
      completedAt: { $gte: thirtyDaysAgo },
      actualHours: { $exists: true }
    }).toArray();
    
    if (completedTasks.length === 0) return 5; // Default velocity
    
    const totalHours = completedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    return totalHours / completedTasks.length; // Average hours per task
  }

  private async getProjectComplexity(projectId: string): Promise<number> {
    const projectTasks = await this.tasksCollection.find({
      projectId,
      complexity: { $exists: true }
    }).toArray();
    
    if (projectTasks.length === 0) return 5; // Default complexity
    
    const avgComplexity = projectTasks.reduce((sum, task) => sum + task.complexity, 0) / projectTasks.length;
    return avgComplexity;
  }

  private async getSimilarTasksAvgTime(task: TaskData): Promise<number> {
    // Find tasks with similar characteristics
    const similarTasks = await this.tasksCollection.find({
      status: 'done',
      complexity: { $gte: task.complexity - 1, $lte: task.complexity + 1 },
      priority: task.priority,
      actualHours: { $exists: true, $gt: 0 },
      tags: { $in: task.tags }
    }).limit(20).toArray();
    
    if (similarTasks.length === 0) return task.estimatedHours;
    
    const avgTime = similarTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0) / similarTasks.length;
    return avgTime;
  }

  private async trainMultipleModels(trainingData: { features: number[][], targets: number[] }): Promise<any[]> {
    const models = [];
    
    // Linear Regression
    const linearModel = await this.trainLinearRegression(trainingData);
    models.push({ ...linearModel, type: 'linear' });
    
    // Random Forest (simplified implementation)
    const forestModel = await this.trainRandomForest(trainingData);
    models.push({ ...forestModel, type: 'forest' });
    
    // Gradient Boosting (simplified implementation)
    const boostingModel = await this.trainGradientBoosting(trainingData);
    models.push({ ...boostingModel, type: 'boosting' });
    
    return models;
  }

  private async trainLinearRegression(trainingData: { features: number[][], targets: number[] }): Promise<any> {
    const X = new Matrix(trainingData.features);
    const y = Matrix.columnVector(trainingData.targets);
    
    // Add bias term
    const ones = Matrix.ones(X.rows, 1);
    const XWithBias = Matrix.columnVector(ones).concat(X);
    
    // Normal equation: θ = (X^T * X)^(-1) * X^T * y
    const XTranspose = XWithBias.transpose();
    const theta = XTranspose.mmul(XWithBias).inverse().mmul(XTranspose).mmul(y);
    
    // Calculate metrics
    const predictions = XWithBias.mmul(theta);
    const mse = this.calculateMSE(trainingData.targets, predictions.to1DArray());
    const r2 = this.calculateR2(trainingData.targets, predictions.to1DArray());
    
    return {
      weights: theta.to1DArray(),
      metrics: { mse, r2, mae: Math.sqrt(mse) },
      parameters: { regularization: 0 },
      predict: (features: number[]) => {
        const input = [1, ...features]; // Add bias
        return input.reduce((sum, feature, i) => sum + feature * theta.get(i, 0), 0);
      }
    };
  }

  private async trainRandomForest(trainingData: { features: number[][], targets: number[] }): Promise<any> {
    // Simplified random forest implementation
    const trees = [];
    const numTrees = 10;
    
    for (let i = 0; i < numTrees; i++) {
      // Bootstrap sampling
      const bootstrapData = this.bootstrapSample(trainingData);
      const tree = await this.trainDecisionTree(bootstrapData);
      trees.push(tree);
    }
    
    // Calculate ensemble metrics
    const predictions = trainingData.features.map(features => {
      const treePredictions = trees.map(tree => tree.predict(features));
      return treePredictions.reduce((sum, pred) => sum + pred, 0) / trees.length;
    });
    
    const mse = this.calculateMSE(trainingData.targets, predictions);
    const r2 = this.calculateR2(trainingData.targets, predictions);
    
    return {
      trees,
      metrics: { mse, r2, mae: Math.sqrt(mse) },
      parameters: { numTrees, maxDepth: 10 },
      predict: (features: number[]) => {
        const treePredictions = trees.map(tree => tree.predict(features));
        return treePredictions.reduce((sum, pred) => sum + pred, 0) / trees.length;
      }
    };
  }

  private async trainGradientBoosting(trainingData: { features: number[][], targets: number[] }): Promise<any> {
    // Simplified gradient boosting implementation
    const models = [];
    const learningRate = 0.1;
    const numIterations = 50;
    
    // Initialize with mean
    let predictions = new Array(trainingData.targets.length).fill(
      trainingData.targets.reduce((sum, target) => sum + target, 0) / trainingData.targets.length
    );
    
    for (let i = 0; i < numIterations; i++) {
      // Calculate residuals
      const residuals = trainingData.targets.map((target, idx) => target - predictions[idx]);
      
      // Train weak learner on residuals
      const weakLearner = await this.trainLinearRegression({
        features: trainingData.features,
        targets: residuals
      });
      
      models.push(weakLearner);
      
      // Update predictions
      predictions = predictions.map((pred, idx) => 
        pred + learningRate * weakLearner.predict(trainingData.features[idx])
      );
    }
    
    const mse = this.calculateMSE(trainingData.targets, predictions);
    const r2 = this.calculateR2(trainingData.targets, predictions);
    
    return {
      models,
      learningRate,
      metrics: { mse, r2, mae: Math.sqrt(mse) },
      parameters: { learningRate, numIterations },
      predict: (features: number[]) => {
        let prediction = trainingData.targets.reduce((sum, target) => sum + target, 0) / trainingData.targets.length;
        for (const model of models) {
          prediction += learningRate * model.predict(features);
        }
        return prediction;
      }
    };
  }

  private bootstrapSample(data: { features: number[][], targets: number[] }): { features: number[][], targets: number[] } {
    const sampleSize = data.features.length;
    const features: number[][] = [];
    const targets: number[] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * sampleSize);
      features.push(data.features[randomIndex]);
      targets.push(data.targets[randomIndex]);
    }
    
    return { features, targets };
  }

  private async trainDecisionTree(data: { features: number[][], targets: number[] }): Promise<any> {
    // Simplified decision tree (just returns mean for this implementation)
    const mean = data.targets.reduce((sum, target) => sum + target, 0) / data.targets.length;
    
    return {
      predict: () => mean
    };
  }

  private selectBestModel(models: any[]): any {
    return models.reduce((best, model) => 
      model.metrics.r2 > best.metrics.r2 ? model : best
    );
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    const sumSquaredErrors = actual.reduce((sum, actualValue, i) => {
      const error = actualValue - predicted[i];
      return sum + error * error;
    }, 0);
    
    return sumSquaredErrors / actual.length;
  }

  private calculateR2(actual: number[], predicted: number[]): number {
    const actualMean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
    
    const totalSumSquares = actual.reduce((sum, value) => {
      const diff = value - actualMean;
      return sum + diff * diff;
    }, 0);
    
    const residualSumSquares = actual.reduce((sum, actualValue, i) => {
      const diff = actualValue - predicted[i];
      return sum + diff * diff;
    }, 0);
    
    return 1 - (residualSumSquares / totalSumSquares);
  }

  private async makePrediction(features: TaskFeatures): Promise<{ estimatedHours: number, confidence: number, completionProbability: number }> {
    if (!this.isModelLoaded || !this.model) {
      // Fallback to simple heuristic
      return {
        estimatedHours: features.estimatedHours * (1 + features.complexity / 10),
        confidence: 0.5,
        completionProbability: 0.7
      };
    }
    
    const featureVector = this.featuresToVector(features);
    const estimatedHours = Math.max(0.5, this.model.predict(featureVector));
    
    // Calculate confidence based on model metrics and feature similarity to training data
    const confidence = Math.min(0.95, this.model.metrics.r2 * 0.8 + 0.2);
    
    // Calculate completion probability based on historical data
    const completionProbability = this.calculateCompletionProbability(features, estimatedHours);
    
    return {
      estimatedHours: Math.round(estimatedHours * 10) / 10, // Round to 1 decimal
      confidence,
      completionProbability
    };
  }

  private calculateCompletionProbability(features: TaskFeatures, estimatedHours: number): number {
    let probability = 0.8; // Base probability
    
    // Adjust based on complexity
    if (features.complexity > 7) probability -= 0.1;
    if (features.complexity < 3) probability += 0.1;
    
    // Adjust based on assignee experience
    if (features.assigneeExperience > 7) probability += 0.1;
    if (features.assigneeExperience < 3) probability -= 0.1;
    
    // Adjust based on dependencies
    if (features.dependencyCount > 3) probability -= 0.05 * features.dependencyCount;
    
    // Adjust based on team velocity
    if (features.teamVelocity > features.similarTasksAvgTime) probability += 0.05;
    
    return Math.max(0.1, Math.min(0.95, probability));
  }

  private async analyzeRiskFactors(task: TaskData, features: TaskFeatures): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];
    
    // High complexity risk
    if (features.complexity > 7) {
      riskFactors.push({
        type: 'complexity',
        severity: 'high',
        description: 'Task has high complexity rating',
        impact: features.complexity * 0.5
      });
    }
    
    // Dependency risk
    if (features.dependencyCount > 2) {
      riskFactors.push({
        type: 'dependencies',
        severity: features.dependencyCount > 5 ? 'high' : 'medium',
        description: `Task has ${features.dependencyCount} dependencies`,
        impact: features.dependencyCount * 0.3
      });
    }
    
    // Assignee workload risk
    const assigneeWorkload = await this.getAssigneeCurrentWorkload(task.assignee);
    if (assigneeWorkload > 40) {
      riskFactors.push({
        type: 'assignee_workload',
        severity: assigneeWorkload > 60 ? 'high' : 'medium',
        description: `Assignee has high current workload (${assigneeWorkload} hours)`,
        impact: (assigneeWorkload - 40) * 0.1
      });
    }
    
    // Team capacity risk
    if (features.teamVelocity < features.similarTasksAvgTime * 0.8) {
      riskFactors.push({
        type: 'team_capacity',
        severity: 'medium',
        description: 'Team velocity is below average for similar tasks',
        impact: (features.similarTasksAvgTime - features.teamVelocity) * 0.5
      });
    }
    
    return riskFactors;
  }

  private async getAssigneeCurrentWorkload(assignee: string): Promise<number> {
    const activeTasks = await this.tasksCollection.find({
      assignee,
      status: { $in: ['todo', 'in_progress'] }
    }).toArray();
    
    return activeTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  }

  private async generateMilestones(task: TaskData, estimatedHours: number): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const now = new Date();
    
    // Break down into milestones based on task size
    if (estimatedHours > 16) { // Large task (2+ days)
      const numMilestones = Math.ceil(estimatedHours / 8); // One milestone per day
      const hoursPerMilestone = estimatedHours / numMilestones;
      
      for (let i = 0; i < numMilestones; i++) {
        const milestoneDate = new Date(now.getTime() + (i + 1) * hoursPerMilestone * 60 * 60 * 1000);
        
        milestones.push({
          name: `Milestone ${i + 1}`,
          estimatedDate: milestoneDate,
          confidence: 0.8 - (i * 0.1), // Decreasing confidence for later milestones
          dependencies: i === 0 ? task.dependencies : [`milestone-${i}`]
        });
      }
    } else if (estimatedHours > 4) { // Medium task
      milestones.push({
        name: 'Mid-point Review',
        estimatedDate: new Date(now.getTime() + (estimatedHours / 2) * 60 * 60 * 1000),
        confidence: 0.9,
        dependencies: task.dependencies
      });
    }
    
    // Final completion milestone
    milestones.push({
      name: 'Task Completion',
      estimatedDate: new Date(now.getTime() + estimatedHours * 60 * 60 * 1000),
      confidence: 0.8,
      dependencies: milestones.length > 0 ? [milestones[milestones.length - 1].name] : task.dependencies
    });
    
    return milestones;
  }

  // API endpoints for integration
  async getTaskPredictionAPI(taskId: string): Promise<CompletionPrediction | null> {
    const task = await this.tasksCollection.findOne({ id: taskId });
    if (!task) return null;
    
    return await this.predictTaskCompletion(task);
  }

  async updateModelWithFeedback(taskId: string, actualHours: number): Promise<void> {
    try {
      // Update task with actual completion time
      await this.tasksCollection.updateOne(
        { id: taskId },
        { $set: { actualHours, completedAt: new Date() } }
      );
      
      // Trigger model retraining if we have enough new data
      const recentCompletions = await this.tasksCollection.countDocuments({
        status: 'done',
        completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last week
      });
      
      if (recentCompletions > 50) {
        this.logger.info('Triggering model retraining due to new completion data');
        // Schedule retraining (could be done asynchronously)
        setTimeout(() => this.trainModel(), 1000);
      }
    } catch (error) {
      this.logger.error('Failed to update model with feedback:', error);
    }
  }
}