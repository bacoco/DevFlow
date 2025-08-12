import { WorkContext, PredictedAction, ContextEvent } from '../types';
import { Logger } from '../utils/Logger';
import * as tf from '@tensorflow/tfjs-node';

export class StatePredictorService {
  private logger: Logger;
  private historicalPatterns: Map<string, any[]> = new Map();
  private timeSeriesModel: tf.LayersModel | null = null;
  private isModelLoaded = false;
  private predictionCache: Map<string, { predictions: PredictedAction[], timestamp: Date }> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    try {
      // Try to load existing time-series model
      await this.loadTimeSeriesModel();
      this.logger.info('StatePredictorService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StatePredictorService:', error);
      // Continue without model - will use rule-based predictions
    }
  }

  async predictNextActions(context: WorkContext, userId?: string): Promise<PredictedAction[]> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(context, userId);
      const cached = this.predictionCache.get(cacheKey);
      if (cached && this.isCacheFresh(cached.timestamp)) {
        return cached.predictions;
      }

      const predictions: PredictedAction[] = [];

      // ML-based predictions if model is available
      if (this.isModelLoaded && userId) {
        const mlPredictions = await this.predictWithTimeSeriesModel(context, userId);
        predictions.push(...mlPredictions);
      }

      // Rule-based predictions (always available as fallback)
      const rulePredictions = await this.predictWithRules(context);
      predictions.push(...rulePredictions);

      // Combine and deduplicate predictions
      const combinedPredictions = this.combinePredictions(predictions);

      // Cache the results
      this.predictionCache.set(cacheKey, {
        predictions: combinedPredictions,
        timestamp: new Date()
      });

      return combinedPredictions;
    } catch (error) {
      this.logger.error('Failed to predict next actions:', error);
      return [];
    }
  }

  private async predictWithRules(context: WorkContext): Promise<PredictedAction[]> {
    const predictions: PredictedAction[] = [];

    // Time-based predictions
    predictions.push(...this.predictTimeBasedActions(context));

    // Activity-based predictions
    predictions.push(...this.predictActivityBasedActions(context));

    // Focus-based predictions
    predictions.push(...this.predictFocusBasedActions(context));

    // Collaboration-based predictions
    predictions.push(...this.predictCollaborationBasedActions(context));

    return predictions;
  }

  private async predictWithTimeSeriesModel(context: WorkContext, userId: string): Promise<PredictedAction[]> {
    try {
      if (!this.timeSeriesModel) return [];

      // Get historical context for the user
      const historicalData = this.historicalPatterns.get(userId) || [];
      if (historicalData.length < 10) return []; // Need at least 10 data points

      // Prepare input sequence
      const inputSequence = this.prepareInputSequence(historicalData, context);
      const inputTensor = tf.tensor3d([inputSequence]);

      // Make prediction
      const prediction = this.timeSeriesModel.predict(inputTensor) as tf.Tensor;
      const probabilities = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Convert probabilities to predictions
      const mlPredictions = this.convertProbabilitiesToPredictions(probabilities, context);
      
      return mlPredictions;
    } catch (error) {
      this.logger.error('Failed to predict with time-series model:', error);
      return [];
    }
  }

  private prepareInputSequence(historicalData: any[], currentContext: WorkContext): number[][] {
    // Take the last 10 context states
    const recentData = historicalData.slice(-10);
    
    // Pad with current context if needed
    while (recentData.length < 10) {
      recentData.unshift(currentContext);
    }

    // Convert to feature vectors
    return recentData.map(context => [
      this.encodeActivityType(context.activityType),
      context.focusLevel / 100,
      context.collaborationState?.activeCollaborators?.length || 0,
      context.environmentFactors?.workingHours ? 1 : 0,
      new Date(context.timestamp).getHours() / 24,
      new Date(context.timestamp).getDay() / 7,
      context.confidence,
      context.projectContext?.activeFiles?.length || 0,
      context.projectContext?.recentCommits?.length || 0,
      this.calculateContextComplexity(context)
    ]);
  }

  private encodeActivityType(activityType: WorkContext['activityType']): number {
    const encoding = {
      'coding': 0.2,
      'reviewing': 0.4,
      'planning': 0.6,
      'debugging': 0.8,
      'meeting': 1.0
    };
    return encoding[activityType] || 0;
  }

  private calculateContextComplexity(context: WorkContext): number {
    let complexity = 0;
    
    // More active files = higher complexity
    complexity += (context.projectContext?.activeFiles?.length || 0) * 0.1;
    
    // More collaborators = higher complexity
    complexity += (context.collaborationState?.activeCollaborators?.length || 0) * 0.2;
    
    // Recent commits indicate active development
    complexity += (context.projectContext?.recentCommits?.length || 0) * 0.1;
    
    return Math.min(1, complexity);
  }

  private convertProbabilitiesToPredictions(probabilities: Float32Array, context: WorkContext): PredictedAction[] {
    const actionTypes = [
      'take_break', 'run_tests', 'git_commit', 'provide_feedback', 
      'update_documentation', 'create_tasks', 'meeting_followup',
      'sync_with_team', 'complex_task', 'switch_task'
    ];

    const predictions: PredictedAction[] = [];
    
    for (let i = 0; i < Math.min(probabilities.length, actionTypes.length); i++) {
      if (probabilities[i] > 0.3) { // Only include predictions with reasonable confidence
        predictions.push({
          actionType: actionTypes[i],
          description: this.getActionDescription(actionTypes[i]),
          confidence: probabilities[i],
          suggestedTiming: new Date(Date.now() + this.getActionDelay(actionTypes[i])),
          context
        });
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  private getActionDescription(actionType: string): string {
    const descriptions: Record<string, string> = {
      'take_break': 'Take a short break to restore focus',
      'run_tests': 'Run tests to verify recent code changes',
      'git_commit': 'Consider committing your changes',
      'provide_feedback': 'Provide feedback on the code review',
      'update_documentation': 'Document the recent changes',
      'create_tasks': 'Create tasks based on current work',
      'meeting_followup': 'Create follow-up tasks from meeting',
      'sync_with_team': 'Sync progress with team members',
      'complex_task': 'Good time to tackle complex tasks',
      'switch_task': 'Consider switching to a different task'
    };
    return descriptions[actionType] || 'Recommended action';
  }

  private getActionDelay(actionType: string): number {
    const delays: Record<string, number> = {
      'take_break': 2 * 60 * 1000, // 2 minutes
      'run_tests': 10 * 60 * 1000, // 10 minutes
      'git_commit': 20 * 60 * 1000, // 20 minutes
      'provide_feedback': 5 * 60 * 1000, // 5 minutes
      'update_documentation': 15 * 60 * 1000, // 15 minutes
      'create_tasks': 5 * 60 * 1000, // 5 minutes
      'meeting_followup': 30 * 60 * 1000, // 30 minutes
      'sync_with_team': 10 * 60 * 1000, // 10 minutes
      'complex_task': 1 * 60 * 1000, // 1 minute
      'switch_task': 5 * 60 * 1000 // 5 minutes
    };
    return delays[actionType] || 10 * 60 * 1000;
  }

  private combinePredictions(predictions: PredictedAction[]): PredictedAction[] {
    // Group by action type and combine confidence scores
    const grouped = predictions.reduce((acc, pred) => {
      if (!acc[pred.actionType]) {
        acc[pred.actionType] = [];
      }
      acc[pred.actionType].push(pred);
      return acc;
    }, {} as Record<string, PredictedAction[]>);

    // Combine predictions for each action type
    const combined = Object.entries(grouped).map(([actionType, preds]) => {
      const avgConfidence = preds.reduce((sum, p) => sum + p.confidence, 0) / preds.length;
      const earliestTiming = preds.reduce((earliest, p) => 
        p.suggestedTiming < earliest ? p.suggestedTiming : earliest, 
        preds[0].suggestedTiming
      );

      return {
        ...preds[0],
        confidence: Math.min(1, avgConfidence * 1.2), // Boost combined confidence slightly
        suggestedTiming: earliestTiming
      };
    });

    // Sort by confidence and return top 5
    return combined
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private generateCacheKey(context: WorkContext, userId?: string): string {
    return `${userId || 'anonymous'}-${context.activityType}-${context.focusLevel}-${Math.floor(Date.now() / 300000)}`; // 5-minute buckets
  }

  private isCacheFresh(timestamp: Date): boolean {
    return Date.now() - timestamp.getTime() < 300000; // 5 minutes
  }

  private async loadTimeSeriesModel(): Promise<void> {
    try {
      this.timeSeriesModel = await tf.loadLayersModel('file://models/time-series-predictor.json');
      this.isModelLoaded = true;
      this.logger.info('Time-series prediction model loaded successfully');
    } catch (error) {
      this.logger.warn('Time-series model not found, using rule-based predictions only');
    }
  }

  private predictTimeBasedActions(context: WorkContext): PredictedAction[] {
    const predictions: PredictedAction[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Morning standup prediction
    if (hour >= 8 && hour <= 10 && context.environmentFactors.workingHours) {
      predictions.push({
        actionType: 'standup_meeting',
        description: 'Daily standup meeting likely to start soon',
        confidence: 0.7,
        suggestedTiming: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
        context
      });
    }

    // Lunch break prediction
    if (hour >= 11 && hour <= 13) {
      predictions.push({
        actionType: 'break',
        description: 'Lunch break recommended',
        confidence: 0.6,
        suggestedTiming: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
        context
      });
    }

    // End of day wrap-up
    if (hour >= 16 && hour <= 17 && context.environmentFactors.workingHours) {
      predictions.push({
        actionType: 'day_wrapup',
        description: 'Consider wrapping up and planning for tomorrow',
        confidence: 0.8,
        suggestedTiming: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
        context
      });
    }

    return predictions;
  }

  private predictActivityBasedActions(context: WorkContext): PredictedAction[] {
    const predictions: PredictedAction[] = [];

    switch (context.activityType) {
      case 'coding':
        // Predict testing after coding
        predictions.push({
          actionType: 'run_tests',
          description: 'Run tests to verify recent code changes',
          confidence: 0.8,
          suggestedTiming: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          context
        });

        // Predict commit after significant coding
        if (context.projectContext.activeFiles.length > 0) {
          predictions.push({
            actionType: 'git_commit',
            description: 'Consider committing your changes',
            confidence: 0.7,
            suggestedTiming: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
            context
          });
        }
        break;

      case 'reviewing':
        // Predict providing feedback
        predictions.push({
          actionType: 'provide_feedback',
          description: 'Provide feedback on the code review',
          confidence: 0.9,
          suggestedTiming: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          context
        });
        break;

      case 'debugging':
        // Predict documentation update after debugging
        predictions.push({
          actionType: 'update_documentation',
          description: 'Document the debugging findings',
          confidence: 0.6,
          suggestedTiming: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          context
        });
        break;

      case 'planning':
        // Predict task creation
        predictions.push({
          actionType: 'create_tasks',
          description: 'Create tasks based on planning session',
          confidence: 0.8,
          suggestedTiming: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          context
        });
        break;

      case 'meeting':
        // Predict follow-up actions
        predictions.push({
          actionType: 'meeting_followup',
          description: 'Create follow-up tasks from meeting',
          confidence: 0.7,
          suggestedTiming: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes after meeting
          context
        });
        break;
    }

    return predictions;
  }

  private predictFocusBasedActions(context: WorkContext): PredictedAction[] {
    const predictions: PredictedAction[] = [];

    if (context.focusLevel < 30) {
      // Low focus - suggest break
      predictions.push({
        actionType: 'take_break',
        description: 'Take a short break to restore focus',
        confidence: 0.9,
        suggestedTiming: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
        context
      });

      // Suggest switching to lighter tasks
      predictions.push({
        actionType: 'switch_task',
        description: 'Switch to a lighter task or administrative work',
        confidence: 0.7,
        suggestedTiming: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        context
      });
    } else if (context.focusLevel > 80) {
      // High focus - suggest tackling complex tasks
      predictions.push({
        actionType: 'complex_task',
        description: 'Good time to tackle complex or challenging tasks',
        confidence: 0.8,
        suggestedTiming: new Date(Date.now() + 1 * 60 * 1000), // 1 minute
        context
      });
    }

    return predictions;
  }

  private predictCollaborationBasedActions(context: WorkContext): PredictedAction[] {
    const predictions: PredictedAction[] = [];

    if (context.collaborationState.activeCollaborators.length > 0) {
      // Active collaboration - suggest sync
      predictions.push({
        actionType: 'sync_with_team',
        description: 'Sync progress with active collaborators',
        confidence: 0.7,
        suggestedTiming: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        context
      });
    }

    if (context.collaborationState.meetingStatus === 'available' && 
        context.environmentFactors.workingHours) {
      // Available for collaboration
      predictions.push({
        actionType: 'offer_help',
        description: 'Consider offering help to team members',
        confidence: 0.5,
        suggestedTiming: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        context
      });
    }

    return predictions;
  }

  // Enhanced learning from historical patterns
  async learnFromHistoricalData(userId: string, historicalContexts: ContextEvent[]): Promise<void> {
    try {
      // Store raw historical data
      this.historicalPatterns.set(userId, historicalContexts);
      
      // Analyze patterns in historical data
      const patterns = this.analyzeAdvancedPatterns(historicalContexts);
      
      // Train time-series model if we have enough data
      if (historicalContexts.length > 100) {
        await this.trainTimeSeriesModel(userId, historicalContexts);
      }
      
      this.logger.info(`Learned patterns for user ${userId} from ${historicalContexts.length} historical contexts`);
    } catch (error) {
      this.logger.error('Failed to learn from historical data:', error);
    }
  }

  private async trainTimeSeriesModel(userId: string, historicalData: ContextEvent[]): Promise<void> {
    try {
      this.logger.info(`Training time-series model for user ${userId}`);
      
      // Prepare training sequences
      const sequences = this.prepareTrainingSequences(historicalData);
      
      if (sequences.length < 50) {
        this.logger.warn('Insufficient data for time-series training');
        return;
      }

      // Create and train LSTM model
      const model = await this.createTimeSeriesModel();
      
      // Convert sequences to tensors
      const { xs, ys } = this.sequencesToTensors(sequences);
      
      // Train the model
      await model.fit(xs, ys, {
        epochs: 20,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 5 === 0) {
              this.logger.debug(`Training epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Save the trained model
      await model.save('file://models/time-series-predictor');
      
      // Update current model
      if (this.timeSeriesModel) {
        this.timeSeriesModel.dispose();
      }
      this.timeSeriesModel = model;
      this.isModelLoaded = true;
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
      this.logger.info('Time-series model training completed');
    } catch (error) {
      this.logger.error('Failed to train time-series model:', error);
    }
  }

  private prepareTrainingSequences(historicalData: ContextEvent[]): any[] {
    const sequences = [];
    const sequenceLength = 10;
    
    // Sort by timestamp
    const sortedData = historicalData.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Create sequences with next action as target
    for (let i = 0; i <= sortedData.length - sequenceLength - 1; i++) {
      const sequence = sortedData.slice(i, i + sequenceLength);
      const nextContext = sortedData[i + sequenceLength];
      
      // Predict the next activity type
      const target = this.encodeActivityType(nextContext.context.activityType);
      
      sequences.push({
        sequence: sequence.map(event => this.contextToFeatureVector(event.context)),
        target
      });
    }
    
    return sequences;
  }

  private contextToFeatureVector(context: WorkContext): number[] {
    return [
      this.encodeActivityType(context.activityType),
      context.focusLevel / 100,
      context.collaborationState?.activeCollaborators?.length || 0,
      context.environmentFactors?.workingHours ? 1 : 0,
      new Date(context.timestamp).getHours() / 24,
      new Date(context.timestamp).getDay() / 7,
      context.confidence,
      context.projectContext?.activeFiles?.length || 0,
      context.projectContext?.recentCommits?.length || 0,
      this.calculateContextComplexity(context)
    ];
  }

  private async createTimeSeriesModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          inputShape: [10, 10], // 10 time steps, 10 features
          units: 32,
          returnSequences: true,
          dropout: 0.2,
          recurrentDropout: 0.2
        }),
        tf.layers.lstm({
          units: 16,
          dropout: 0.2,
          recurrentDropout: 0.2
        }),
        tf.layers.dense({
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 10, // Number of possible actions
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private sequencesToTensors(sequences: any[]): { xs: tf.Tensor3D, ys: tf.Tensor1D } {
    const xs = sequences.map(seq => seq.sequence);
    const ys = sequences.map(seq => seq.target);
    
    return {
      xs: tf.tensor3d(xs),
      ys: tf.tensor1d(ys)
    };
  }

  private analyzeAdvancedPatterns(historicalContexts: ContextEvent[]): any {
    const patterns = this.analyzePatterns(historicalContexts.map(e => e.context));
    
    // Add advanced pattern analysis
    const advancedPatterns = {
      ...patterns,
      contextTransitions: this.analyzeContextTransitions(historicalContexts),
      focusPatterns: this.analyzeFocusPatterns(historicalContexts),
      collaborationPatterns: this.analyzeCollaborationPatterns(historicalContexts),
      productivityCycles: this.analyzeProductivityCycles(historicalContexts),
      workflowEfficiency: this.analyzeWorkflowEfficiency(historicalContexts)
    };
    
    return advancedPatterns;
  }

  private analyzeContextTransitions(events: ContextEvent[]): any {
    const transitions: Record<string, Record<string, number>> = {};
    
    for (let i = 1; i < events.length; i++) {
      const fromActivity = events[i - 1].context.activityType;
      const toActivity = events[i].context.activityType;
      
      if (!transitions[fromActivity]) {
        transitions[fromActivity] = {};
      }
      
      transitions[fromActivity][toActivity] = (transitions[fromActivity][toActivity] || 0) + 1;
    }
    
    // Calculate transition probabilities
    const transitionProbabilities: Record<string, Record<string, number>> = {};
    
    Object.entries(transitions).forEach(([from, toActivities]) => {
      const total = Object.values(toActivities).reduce((sum, count) => sum + count, 0);
      transitionProbabilities[from] = {};
      
      Object.entries(toActivities).forEach(([to, count]) => {
        transitionProbabilities[from][to] = count / total;
      });
    });
    
    return {
      transitions,
      probabilities: transitionProbabilities,
      mostCommonTransitions: this.findMostCommonTransitions(transitionProbabilities)
    };
  }

  private findMostCommonTransitions(probabilities: Record<string, Record<string, number>>): any[] {
    const commonTransitions = [];
    
    Object.entries(probabilities).forEach(([from, toProbs]) => {
      const mostLikely = Object.entries(toProbs)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostLikely && mostLikely[1] > 0.3) {
        commonTransitions.push({
          from,
          to: mostLikely[0],
          probability: mostLikely[1]
        });
      }
    });
    
    return commonTransitions.sort((a, b) => b.probability - a.probability);
  }

  private analyzeFocusPatterns(events: ContextEvent[]): any {
    const focusLevels = events.map(e => ({
      level: e.context.focusLevel,
      hour: new Date(e.timestamp).getHours(),
      day: new Date(e.timestamp).getDay(),
      activity: e.context.activityType
    }));
    
    // Analyze focus by time of day
    const hourlyFocus = focusLevels.reduce((acc, f) => {
      if (!acc[f.hour]) acc[f.hour] = [];
      acc[f.hour].push(f.level);
      return acc;
    }, {} as Record<number, number[]>);
    
    const avgHourlyFocus = Object.entries(hourlyFocus).map(([hour, levels]) => ({
      hour: parseInt(hour),
      avgFocus: levels.reduce((sum, level) => sum + level, 0) / levels.length
    }));
    
    // Find peak focus hours
    const peakFocusHours = avgHourlyFocus
      .sort((a, b) => b.avgFocus - a.avgFocus)
      .slice(0, 3)
      .map(h => h.hour);
    
    return {
      avgHourlyFocus,
      peakFocusHours,
      overallAvgFocus: focusLevels.reduce((sum, f) => sum + f.level, 0) / focusLevels.length,
      focusByActivity: this.calculateFocusByActivity(focusLevels)
    };
  }

  private calculateFocusByActivity(focusData: any[]): Record<string, number> {
    const activityFocus = focusData.reduce((acc, f) => {
      if (!acc[f.activity]) acc[f.activity] = [];
      acc[f.activity].push(f.level);
      return acc;
    }, {} as Record<string, number[]>);
    
    return Object.entries(activityFocus).reduce((acc, [activity, levels]) => {
      acc[activity] = levels.reduce((sum, level) => sum + level, 0) / levels.length;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeCollaborationPatterns(events: ContextEvent[]): any {
    const collaborationEvents = events.filter(e => 
      e.context.collaborationState?.activeCollaborators?.length > 0
    );
    
    const collaborationRatio = collaborationEvents.length / events.length;
    
    // Analyze collaboration by time
    const collaborationByHour = collaborationEvents.reduce((acc, e) => {
      const hour = new Date(e.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return {
      collaborationRatio,
      collaborationByHour,
      avgCollaborators: collaborationEvents.reduce((sum, e) => 
        sum + (e.context.collaborationState?.activeCollaborators?.length || 0), 0
      ) / Math.max(1, collaborationEvents.length),
      peakCollaborationHours: Object.entries(collaborationByHour)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour))
    };
  }

  private analyzeProductivityCycles(events: ContextEvent[]): any {
    // Analyze productivity based on activity types and focus levels
    const productivityScores = events.map(e => ({
      score: this.calculateProductivityScore(e.context),
      hour: new Date(e.timestamp).getHours(),
      day: new Date(e.timestamp).getDay(),
      timestamp: e.timestamp
    }));
    
    // Find productivity cycles
    const hourlyProductivity = productivityScores.reduce((acc, p) => {
      if (!acc[p.hour]) acc[p.hour] = [];
      acc[p.hour].push(p.score);
      return acc;
    }, {} as Record<number, number[]>);
    
    const avgHourlyProductivity = Object.entries(hourlyProductivity).map(([hour, scores]) => ({
      hour: parseInt(hour),
      avgScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
    }));
    
    return {
      avgHourlyProductivity,
      peakProductivityHours: avgHourlyProductivity
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 3)
        .map(h => h.hour),
      overallProductivity: productivityScores.reduce((sum, p) => sum + p.score, 0) / productivityScores.length
    };
  }

  private calculateProductivityScore(context: WorkContext): number {
    let score = 0;
    
    // Activity type scoring
    const activityScores = {
      'coding': 0.9,
      'reviewing': 0.7,
      'planning': 0.6,
      'debugging': 0.8,
      'meeting': 0.4
    };
    score += activityScores[context.activityType] * 40;
    
    // Focus level contribution
    score += context.focusLevel * 0.4;
    
    // Active work indicators
    if (context.projectContext?.activeFiles?.length > 0) score += 10;
    if (context.projectContext?.recentCommits?.length > 0) score += 10;
    
    return Math.min(100, score);
  }

  private analyzeWorkflowEfficiency(events: ContextEvent[]): any {
    // Analyze context switches and their impact
    const contextSwitches = [];
    
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      
      if (prev.context.activityType !== curr.context.activityType) {
        const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        contextSwitches.push({
          from: prev.context.activityType,
          to: curr.context.activityType,
          duration: timeDiff,
          focusChange: curr.context.focusLevel - prev.context.focusLevel
        });
      }
    }
    
    const avgSwitchTime = contextSwitches.length > 0 ? 
      contextSwitches.reduce((sum, s) => sum + s.duration, 0) / contextSwitches.length : 0;
    
    const avgFocusImpact = contextSwitches.length > 0 ?
      contextSwitches.reduce((sum, s) => sum + Math.abs(s.focusChange), 0) / contextSwitches.length : 0;
    
    return {
      contextSwitchFrequency: contextSwitches.length / Math.max(1, events.length),
      avgSwitchTime,
      avgFocusImpact,
      mostDisruptiveSwitches: contextSwitches
        .filter(s => s.focusChange < -20)
        .sort((a, b) => a.focusChange - b.focusChange)
        .slice(0, 5)
    };
  }

  private analyzePatterns(contexts: WorkContext[]): any[] {
    // Simple pattern analysis - can be enhanced with ML
    const patterns = [];

    // Analyze time-based patterns
    const timePatterns = this.analyzeTimePatterns(contexts);
    patterns.push(...timePatterns);

    // Analyze activity transition patterns
    const transitionPatterns = this.analyzeTransitionPatterns(contexts);
    patterns.push(...transitionPatterns);

    return patterns;
  }

  private analyzeTimePatterns(contexts: WorkContext[]): any[] {
    const patterns = [];
    const hourlyActivity: Record<number, Record<string, number>> = {};

    // Group activities by hour
    contexts.forEach(context => {
      const hour = context.timestamp.getHours();
      if (!hourlyActivity[hour]) {
        hourlyActivity[hour] = {};
      }
      
      const activity = context.activityType;
      hourlyActivity[hour][activity] = (hourlyActivity[hour][activity] || 0) + 1;
    });

    // Find dominant activities for each hour
    Object.entries(hourlyActivity).forEach(([hour, activities]) => {
      const dominantActivity = Object.entries(activities)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (dominantActivity) {
        patterns.push({
          type: 'time_pattern',
          hour: parseInt(hour),
          activity: dominantActivity[0],
          frequency: dominantActivity[1]
        });
      }
    });

    return patterns;
  }

  private analyzeTransitionPatterns(contexts: WorkContext[]): any[] {
    const patterns = [];
    const transitions: Record<string, Record<string, number>> = {};

    // Analyze activity transitions
    for (let i = 1; i < contexts.length; i++) {
      const fromActivity = contexts[i - 1].activityType;
      const toActivity = contexts[i].activityType;
      
      if (!transitions[fromActivity]) {
        transitions[fromActivity] = {};
      }
      
      transitions[fromActivity][toActivity] = (transitions[fromActivity][toActivity] || 0) + 1;
    }

    // Find common transitions
    Object.entries(transitions).forEach(([fromActivity, toActivities]) => {
      const mostCommonTransition = Object.entries(toActivities)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostCommonTransition && mostCommonTransition[1] > 2) {
        patterns.push({
          type: 'transition_pattern',
          from: fromActivity,
          to: mostCommonTransition[0],
          frequency: mostCommonTransition[1]
        });
      }
    });

    return patterns;
  }
}