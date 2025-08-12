import { MongoClient, Db, Collection } from 'mongodb';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  ContextEngine, 
  WorkContext, 
  ContextEvent, 
  PredictedAction, 
  TimeRange,
  ActivityClassificationResult,
  ContextAggregatorInput
} from '../types';
import { ActivityClassifier } from './ActivityClassifier';
import { ContextAggregator } from './ContextAggregator';
import { StatePredictorService } from './StatePredictorService';
import { Logger } from '../utils/Logger';

export class ContextEngineService extends EventEmitter implements ContextEngine {
  private db: Db;
  private contextCollection: Collection<ContextEvent>;
  private kafkaProducer: Producer;
  private kafkaConsumer: Consumer;
  private activityClassifier: ActivityClassifier;
  private contextAggregator: ContextAggregator;
  private statePredictor: StatePredictorService;
  private logger: Logger;
  private userContextCache: Map<string, WorkContext> = new Map();

  constructor(
    mongoClient: MongoClient,
    kafka: Kafka,
    logger: Logger
  ) {
    super();
    this.db = mongoClient.db('devflow_context');
    this.contextCollection = this.db.collection<ContextEvent>('context_events');
    this.kafkaProducer = kafka.producer();
    this.kafkaConsumer = kafka.consumer({ groupId: 'context-engine' });
    this.logger = logger;
    
    this.activityClassifier = new ActivityClassifier(logger);
    this.contextAggregator = new ContextAggregator(logger);
    this.statePredictor = new StatePredictorService(logger);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Kafka
      await this.kafkaProducer.connect();
      await this.kafkaConsumer.connect();
      
      // Subscribe to relevant Kafka topics
      await this.kafkaConsumer.subscribe({ 
        topics: ['ide-activity', 'git-events', 'calendar-events', 'biometric-data'] 
      });
      
      // Start consuming context data
      await this.kafkaConsumer.run({
        eachMessage: async ({ topic, message }) => {
          await this.handleContextMessage(topic, message);
        }
      });

      // Create database indexes
      await this.createIndexes();
      
      this.logger.info('ContextEngineService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ContextEngineService:', error);
      throw error;
    }
  }

  async getCurrentContext(userId: string): Promise<WorkContext> {
    try {
      // Check cache first
      const cachedContext = this.userContextCache.get(userId);
      if (cachedContext && this.isContextFresh(cachedContext)) {
        return cachedContext;
      }

      // Get latest context from database
      const latestEvent = await this.contextCollection
        .findOne(
          { userId },
          { sort: { timestamp: -1 } }
        );

      if (latestEvent) {
        this.userContextCache.set(userId, latestEvent.context);
        return latestEvent.context;
      }

      // Return default context if none found
      const defaultContext = this.createDefaultContext();
      this.userContextCache.set(userId, defaultContext);
      return defaultContext;
    } catch (error) {
      this.logger.error(`Failed to get current context for user ${userId}:`, error);
      throw error;
    }
  }

  subscribeToContextChanges(userId: string, callback: (context: WorkContext) => void): void {
    this.on(`context-change-${userId}`, callback);
  }

  async predictNextActions(context: WorkContext): Promise<PredictedAction[]> {
    try {
      return await this.statePredictor.predictNextActions(context);
    } catch (error) {
      this.logger.error('Failed to predict next actions:', error);
      return [];
    }
  }

  async getContextHistory(userId: string, timeRange: TimeRange): Promise<ContextEvent[]> {
    try {
      const events = await this.contextCollection
        .find({
          userId,
          timestamp: {
            $gte: timeRange.start,
            $lte: timeRange.end
          }
        })
        .sort({ timestamp: 1 })
        .toArray();

      return events;
    } catch (error) {
      this.logger.error(`Failed to get context history for user ${userId}:`, error);
      throw error;
    }
  }

  async updateContext(userId: string, contextUpdate: Partial<WorkContext>): Promise<void> {
    try {
      const currentContext = await this.getCurrentContext(userId);
      const updatedContext: WorkContext = {
        ...currentContext,
        ...contextUpdate,
        timestamp: new Date()
      };

      await this.storeContextEvent(userId, 'activity_change', updatedContext, currentContext);
      this.userContextCache.set(userId, updatedContext);
      
      // Emit context change event
      this.emit(`context-change-${userId}`, updatedContext);
      
      // Publish to Kafka for other services
      await this.publishContextChange(userId, updatedContext);
    } catch (error) {
      this.logger.error(`Failed to update context for user ${userId}:`, error);
      throw error;
    }
  }

  private async handleContextMessage(topic: string, message: any): Promise<void> {
    try {
      const data = JSON.parse(message.value?.toString() || '{}');
      
      switch (topic) {
        case 'ide-activity':
          await this.processIdeActivity(data);
          break;
        case 'git-events':
          await this.processGitEvents(data);
          break;
        case 'calendar-events':
          await this.processCalendarEvents(data);
          break;
        case 'biometric-data':
          await this.processBiometricData(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle context message from topic ${topic}:`, error);
    }
  }

  private async processIdeActivity(data: any): Promise<void> {
    const { userId, activity } = data;
    
    // Classify the activity
    const classification = await this.activityClassifier.classifyActivity(activity);
    
    // Get current context and update it
    const currentContext = await this.getCurrentContext(userId);
    const updatedContext: WorkContext = {
      ...currentContext,
      activityType: classification.activityType,
      timestamp: new Date(),
      confidence: classification.confidence
    };

    await this.updateContext(userId, updatedContext);
  }

  private async processGitEvents(data: any): Promise<void> {
    const { userId, gitEvent } = data;
    
    const currentContext = await this.getCurrentContext(userId);
    const updatedProjectContext = {
      ...currentContext.projectContext,
      recentCommits: [gitEvent, ...currentContext.projectContext.recentCommits.slice(0, 9)]
    };

    await this.updateContext(userId, { 
      projectContext: updatedProjectContext 
    });
  }

  private async processCalendarEvents(data: any): Promise<void> {
    const { userId, calendarEvent } = data;
    
    // Determine if user is in a meeting
    const inMeeting = calendarEvent.status === 'busy' && calendarEvent.type === 'meeting';
    
    const currentContext = await this.getCurrentContext(userId);
    const updatedCollaborationState = {
      ...currentContext.collaborationState,
      meetingStatus: inMeeting ? 'in-meeting' as const : 'available' as const
    };

    await this.updateContext(userId, { 
      collaborationState: updatedCollaborationState 
    });
  }

  private async processBiometricData(data: any): Promise<void> {
    const { userId, biometricData } = data;
    
    // Calculate focus level based on biometric indicators
    const focusLevel = this.calculateFocusLevel(biometricData);
    
    await this.updateContext(userId, { focusLevel });
  }

  private calculateFocusLevel(biometricData: any): number {
    // Simple focus level calculation - can be enhanced with ML
    const heartRateVariability = biometricData.heartRateVariability || 50;
    const stressLevel = biometricData.stressLevel || 50;
    
    // Higher HRV and lower stress indicate better focus
    return Math.max(0, Math.min(100, heartRateVariability - stressLevel));
  }

  private async storeContextEvent(
    userId: string, 
    eventType: ContextEvent['eventType'], 
    context: WorkContext, 
    previousContext?: WorkContext
  ): Promise<void> {
    const event: ContextEvent = {
      id: uuidv4(),
      userId,
      eventType,
      context,
      previousContext,
      timestamp: new Date(),
      source: 'context-engine'
    };

    await this.contextCollection.insertOne(event);
  }

  private async publishContextChange(userId: string, context: WorkContext): Promise<void> {
    await this.kafkaProducer.send({
      topic: 'context-changes',
      messages: [{
        key: userId,
        value: JSON.stringify({ userId, context, timestamp: new Date() })
      }]
    });
  }

  private isContextFresh(context: WorkContext): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return context.timestamp > fiveMinutesAgo;
  }

  private createDefaultContext(): WorkContext {
    return {
      activityType: 'coding',
      projectContext: {
        projectId: 'unknown',
        name: 'Unknown Project',
        activeFiles: [],
        recentCommits: []
      },
      focusLevel: 50,
      collaborationState: {
        activeCollaborators: [],
        sharedArtifacts: [],
        communicationChannels: [],
        meetingStatus: 'available'
      },
      environmentFactors: {
        timeOfDay: new Date().toTimeString(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        workingHours: this.isWorkingHours(),
        deviceType: 'desktop',
        networkQuality: 'good'
      },
      timestamp: new Date(),
      confidence: 0.5
    };
  }

  private isWorkingHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17;
  }

  private async createIndexes(): Promise<void> {
    await this.contextCollection.createIndex({ userId: 1, timestamp: -1 });
    await this.contextCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL
  }

  async shutdown(): Promise<void> {
    await this.kafkaProducer.disconnect();
    await this.kafkaConsumer.disconnect();
    this.logger.info('ContextEngineService shut down successfully');
  }
}