import { Kafka, Consumer, EachMessagePayload, EachBatchPayload } from 'kafkajs';
import { getKafkaConfig, getConsumerConfig, KAFKA_TOPICS } from './config';
import { EventMessage } from './producer';
import winston from 'winston';

export interface MessageHandler {
  (message: EventMessage, metadata: {
    topic: string;
    partition: number;
    offset: string;
    timestamp: string;
  }): Promise<void>;
}

export interface BatchMessageHandler {
  (messages: Array<{
    message: EventMessage;
    metadata: {
      topic: string;
      partition: number;
      offset: string;
      timestamp: string;
    };
  }>): Promise<void>;
}

export interface ConsumerOptions {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  batchProcessing?: boolean;
  batchSize?: number;
  batchTimeout?: number;
}

export class KafkaEventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private logger: winston.Logger;
  private isConnected: boolean = false;
  private isRunning: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private batchHandlers: Map<string, BatchMessageHandler> = new Map();
  private options: ConsumerOptions;

  constructor(options: ConsumerOptions) {
    this.options = options;
    this.kafka = new Kafka(getKafkaConfig());
    this.consumer = this.kafka.consumer(getConsumerConfig(options.groupId));
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `logs/kafka-consumer-${options.groupId}.log` })
      ]
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.consumer.on('consumer.connect', () => {
      this.logger.info('Kafka consumer connected', { groupId: this.options.groupId });
      this.isConnected = true;
    });

    this.consumer.on('consumer.disconnect', () => {
      this.logger.warn('Kafka consumer disconnected', { groupId: this.options.groupId });
      this.isConnected = false;
    });

    this.consumer.on('consumer.stop', () => {
      this.logger.info('Kafka consumer stopped', { groupId: this.options.groupId });
      this.isRunning = false;
    });

    this.consumer.on('consumer.crash', ({ payload }) => {
      this.logger.error('Kafka consumer crashed', { 
        groupId: this.options.groupId,
        error: payload.error 
      });
      this.isRunning = false;
    });

    this.consumer.on('consumer.rebalancing', () => {
      this.logger.info('Kafka consumer rebalancing', { groupId: this.options.groupId });
    });
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      
      // Subscribe to topics
      await this.consumer.subscribe({
        topics: this.options.topics,
        fromBeginning: this.options.fromBeginning || false
      });

      this.logger.info('Kafka consumer connected and subscribed', {
        groupId: this.options.groupId,
        topics: this.options.topics
      });
    } catch (error) {
      this.logger.error('Failed to connect Kafka consumer', { 
        groupId: this.options.groupId,
        error 
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      this.logger.info('Kafka consumer disconnected', { groupId: this.options.groupId });
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka consumer', { 
        groupId: this.options.groupId,
        error 
      });
      throw error;
    }
  }

  registerMessageHandler(topic: string, handler: MessageHandler): void {
    this.messageHandlers.set(topic, handler);
    this.logger.info('Message handler registered', { 
      groupId: this.options.groupId,
      topic 
    });
  }

  registerBatchHandler(topic: string, handler: BatchMessageHandler): void {
    this.batchHandlers.set(topic, handler);
    this.logger.info('Batch handler registered', { 
      groupId: this.options.groupId,
      topic 
    });
  }

  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected');
    }

    if (this.isRunning) {
      this.logger.warn('Consumer is already running', { groupId: this.options.groupId });
      return;
    }

    this.isRunning = true;

    if (this.options.batchProcessing) {
      await this.consumer.run({
        eachBatch: this.handleBatch.bind(this),
        partitionsConsumedConcurrently: 3
      });
    } else {
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
        partitionsConsumedConcurrently: 3
      });
    }

    this.logger.info('Kafka consumer started', {
      groupId: this.options.groupId,
      batchProcessing: this.options.batchProcessing
    });
  }

  async stopConsuming(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    await this.consumer.stop();
    this.logger.info('Kafka consumer stopped', { groupId: this.options.groupId });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      if (!message.value) {
        this.logger.warn('Received message with no value', { topic, partition });
        return;
      }

      const eventMessage: EventMessage = JSON.parse(message.value.toString());
      const handler = this.messageHandlers.get(topic);

      if (!handler) {
        this.logger.warn('No handler registered for topic', { topic });
        return;
      }

      const metadata = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp || Date.now().toString()
      };

      await handler(eventMessage, metadata);

      this.logger.debug('Message processed successfully', {
        topic,
        partition,
        offset: message.offset,
        messageId: eventMessage.id
      });

    } catch (error) {
      this.logger.error('Failed to process message', {
        topic,
        partition,
        offset: message.offset,
        error
      });

      // Optionally send to dead letter queue
      await this.handleProcessingError(payload, error);
    }
  }

  private async handleBatch(payload: EachBatchPayload): Promise<void> {
    const { batch } = payload;
    const { topic, partition } = batch;

    try {
      const messages = batch.messages
        .filter(message => message.value)
        .map(message => {
          const eventMessage: EventMessage = JSON.parse(message.value!.toString());
          return {
            message: eventMessage,
            metadata: {
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp || Date.now().toString()
            }
          };
        });

      if (messages.length === 0) {
        return;
      }

      const handler = this.batchHandlers.get(topic);
      if (!handler) {
        this.logger.warn('No batch handler registered for topic', { topic });
        return;
      }

      await handler(messages);

      this.logger.debug('Batch processed successfully', {
        topic,
        partition,
        messageCount: messages.length,
        firstOffset: messages[0]?.metadata.offset,
        lastOffset: messages[messages.length - 1]?.metadata.offset
      });

    } catch (error) {
      this.logger.error('Failed to process batch', {
        topic,
        partition,
        messageCount: batch.messages.length,
        error
      });

      // Process individual messages to identify problematic ones
      for (const message of batch.messages) {
        try {
          await this.handleMessage({
            topic,
            partition,
            message,
            heartbeat: payload.heartbeat,
            pause: payload.pause
          });
        } catch (messageError) {
          await this.handleProcessingError({
            topic,
            partition,
            message,
            heartbeat: payload.heartbeat,
            pause: payload.pause
          }, messageError);
        }
      }
    }
  }

  private async handleProcessingError(
    payload: EachMessagePayload, 
    error: any
  ): Promise<void> {
    const { topic, partition, message } = payload;
    
    // Log the error
    this.logger.error('Message processing failed', {
      topic,
      partition,
      offset: message.offset,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Optionally implement dead letter queue logic here
    // For now, we'll just log and continue
    
    // In a production system, you might want to:
    // 1. Send to dead letter queue after N retries
    // 2. Implement exponential backoff
    // 3. Alert monitoring systems
  }

  getStatus(): {
    connected: boolean;
    running: boolean;
    groupId: string;
    topics: string[];
    handlers: {
      messageHandlers: string[];
      batchHandlers: string[];
    };
  } {
    return {
      connected: this.isConnected,
      running: this.isRunning,
      groupId: this.options.groupId,
      topics: this.options.topics,
      handlers: {
        messageHandlers: Array.from(this.messageHandlers.keys()),
        batchHandlers: Array.from(this.batchHandlers.keys())
      }
    };
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const groupDescription = await admin.describeGroups([this.options.groupId]);
      
      await admin.disconnect();

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          running: this.isRunning,
          groupId: this.options.groupId,
          groupState: groupDescription.groups[0]?.state || 'unknown'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: this.isConnected,
          running: this.isRunning,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Factory function to create consumers for different services
export const createGitEventConsumer = () => new KafkaEventConsumer({
  groupId: 'devflow-git-processor',
  topics: [KAFKA_TOPICS.GIT_EVENTS],
  fromBeginning: false
});

export const createIDETelemetryConsumer = () => new KafkaEventConsumer({
  groupId: 'devflow-ide-processor',
  topics: [KAFKA_TOPICS.IDE_TELEMETRY],
  fromBeginning: false,
  batchProcessing: true,
  batchSize: 100,
  batchTimeout: 5000
});

export const createCommunicationEventConsumer = () => new KafkaEventConsumer({
  groupId: 'devflow-communication-processor',
  topics: [KAFKA_TOPICS.COMMUNICATION_EVENTS],
  fromBeginning: false
});

export const createDeadLetterConsumer = () => new KafkaEventConsumer({
  groupId: 'devflow-dead-letter-processor',
  topics: [KAFKA_TOPICS.DEAD_LETTER],
  fromBeginning: false
});