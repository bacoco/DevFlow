import { Kafka, Consumer, Producer } from 'kafkajs';
import { StreamJob, StreamJobConfig, StreamEvent, ProcessedEvent } from '../types/stream-processing';
import { DefaultEventRouter } from '../core/event-router';
import { WindowManager } from '../core/window-manager';
import { MetricsProcessor } from '../processors/metrics-processor';
import { safeValidateGitEvent, safeValidateIDETelemetry } from '@devflow/shared-types';
import winston from 'winston';

export class FlinkStyleStreamJob implements StreamJob {
  public readonly config: StreamJobConfig;
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private eventRouter: DefaultEventRouter;
  private windowManager: WindowManager;
  private metricsProcessor: MetricsProcessor;
  private logger: winston.Logger;
  private isRunning: boolean = false;
  private status: 'running' | 'stopped' | 'failed' = 'stopped';

  constructor(config: StreamJobConfig, kafkaConfig: any) {
    this.config = config;
    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer({ groupId: `${config.name}-consumer` });
    this.producer = this.kafka.producer();
    this.eventRouter = new DefaultEventRouter();
    this.windowManager = new WindowManager(config.windowConfig);
    this.metricsProcessor = new MetricsProcessor();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'stream-job', job: config.name },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `logs/${config.name}.log` })
      ]
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting stream job', { config: this.config });
      
      await this.consumer.connect();
      await this.producer.connect();
      
      await this.consumer.subscribe({ 
        topics: this.config.inputTopics,
        fromBeginning: false 
      });

      this.isRunning = true;
      this.status = 'running';

      await this.consumer.run({
        partitionsConsumedConcurrently: this.config.parallelism,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            await this.processMessage(topic, message);
          } catch (error) {
            this.logger.error('Error processing message', { 
              error: error instanceof Error ? error.message : String(error),
              topic,
              partition 
            });
          }
        }
      });

      // Start window processing timer
      this.startWindowProcessing();

      this.logger.info('Stream job started successfully');
    } catch (error) {
      this.status = 'failed';
      this.logger.error('Failed to start stream job', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping stream job');
      this.isRunning = false;
      
      await this.consumer.disconnect();
      await this.producer.disconnect();
      
      this.status = 'stopped';
      this.logger.info('Stream job stopped successfully');
    } catch (error) {
      this.status = 'failed';
      this.logger.error('Error stopping stream job', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  getStatus(): 'running' | 'stopped' | 'failed' {
    return this.status;
  }

  private async processMessage(topic: string, message: any): Promise<void> {
    if (!message.value) return;

    try {
      const rawEvent = JSON.parse(message.value.toString());
      const streamEvent = this.parseStreamEvent(rawEvent);
      
      if (!streamEvent) {
        this.logger.warn('Failed to parse stream event', { rawEvent });
        return;
      }

      // Route event to appropriate processors
      const routes = this.eventRouter.route(streamEvent);
      
      // Add event to time windows
      const affectedWindows = this.windowManager.addEvent(streamEvent, streamEvent.userId);
      
      this.logger.debug('Event processed', {
        eventId: streamEvent.id,
        eventType: streamEvent.type,
        routes,
        windowsAffected: affectedWindows.length
      });

    } catch (error) {
      this.logger.error('Error processing message', {
        error: error instanceof Error ? error.message : String(error),
        topic
      });
    }
  }

  private parseStreamEvent(rawEvent: any): StreamEvent | null {
    try {
      // Determine event type and validate
      let eventData: any;
      let eventType: 'git' | 'ide' | 'communication';

      if (rawEvent.type === 'git') {
        const validation = safeValidateGitEvent(rawEvent.data);
        if (!validation.success) {
          this.logger.warn('Invalid git event', { errors: validation.error?.errors });
          return null;
        }
        eventData = validation.data;
        eventType = 'git';
      } else if (rawEvent.type === 'ide') {
        const validation = safeValidateIDETelemetry(rawEvent.data);
        if (!validation.success) {
          this.logger.warn('Invalid IDE event', { errors: validation.error?.errors });
          return null;
        }
        eventData = validation.data;
        eventType = 'ide';
      } else {
        // Communication or other event types
        eventData = rawEvent.data;
        eventType = 'communication';
      }

      return {
        id: rawEvent.id || `${Date.now()}-${Math.random()}`,
        type: eventType,
        timestamp: new Date(rawEvent.timestamp),
        userId: rawEvent.userId || eventData.userId,
        data: eventData,
        metadata: rawEvent.metadata
      };
    } catch (error) {
      this.logger.error('Error parsing stream event', {
        error: error instanceof Error ? error.message : String(error),
        rawEvent
      });
      return null;
    }
  }

  private startWindowProcessing(): void {
    const processWindows = async () => {
      if (!this.isRunning) return;

      try {
        // Process completed windows for all users
        const userIds = this.getUserIds();
        
        for (const userId of userIds) {
          const processedEvents = this.windowManager.applyWindowFunction(
            userId,
            {
              apply: (events, windowStart, windowEnd) => {
                return this.metricsProcessor.processWindow(events, windowStart, windowEnd);
              }
            }
          );

          // Send processed events to output topics
          for (const processedEvent of processedEvents) {
            await this.sendProcessedEvent(processedEvent);
          }
        }

        // Schedule next processing
        setTimeout(processWindows, this.config.checkpointInterval);
      } catch (error) {
        this.logger.error('Error in window processing', {
          error: error instanceof Error ? error.message : String(error)
        });
        setTimeout(processWindows, this.config.checkpointInterval * 2); // Back off on error
      }
    };

    setTimeout(processWindows, this.config.checkpointInterval);
  }

  private getUserIds(): string[] {
    // In a real implementation, this would track active user sessions
    // For now, we'll return a default set of user IDs for testing
    // In production, you'd maintain a user registry from processed events
    return ['550e8400-e29b-41d4-a716-446655440002']; // Default test user
  }

  private async sendProcessedEvent(processedEvent: ProcessedEvent): Promise<void> {
    try {
      for (const topic of this.config.outputTopics) {
        await this.producer.send({
          topic,
          messages: [{
            key: processedEvent.userId,
            value: JSON.stringify(processedEvent),
            timestamp: processedEvent.timestamp.getTime().toString()
          }]
        });
      }
    } catch (error) {
      this.logger.error('Error sending processed event', {
        error: error instanceof Error ? error.message : String(error),
        eventId: processedEvent.id
      });
    }
  }

  // Metrics and monitoring
  async getJobMetrics(): Promise<Record<string, number>> {
    const windowStats = this.windowManager.getWindowStats();
    
    return {
      'job.status': this.status === 'running' ? 1 : 0,
      'windows.active': windowStats.activeWindows,
      'events.total': windowStats.totalEvents,
      'processor.throughput': await this.metricsProcessor.getThroughput()
    };
  }
}