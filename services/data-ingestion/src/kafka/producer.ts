import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { getKafkaConfig, getProducerConfig, KAFKA_TOPICS, getPartitionKey } from './config';
import { GitEvent, IDETelemetry } from '@devflow/shared-types';
import winston from 'winston';

export interface EventMessage {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface ProducerResult {
  success: boolean;
  messageId: string;
  partition?: number;
  offset?: string;
  error?: string;
}

export class KafkaEventProducer {
  private kafka: Kafka;
  private producer: Producer;
  private logger: winston.Logger;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka(getKafkaConfig());
    this.producer = this.kafka.producer(getProducerConfig());
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/kafka-producer.log' })
      ]
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.producer.on('producer.connect', () => {
      this.logger.info('Kafka producer connected');
      this.isConnected = true;
    });

    this.producer.on('producer.disconnect', () => {
      this.logger.warn('Kafka producer disconnected');
      this.isConnected = false;
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      this.logger.error('Kafka producer request timeout', payload);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.info('Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.logger.info('Kafka producer disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka producer', { error });
      throw error;
    }
  }

  async publishGitEvent(event: GitEvent): Promise<ProducerResult> {
    const message: EventMessage = {
      id: event.id,
      type: 'git_event',
      timestamp: event.timestamp,
      data: event,
      metadata: {
        repository: event.repository,
        author: event.author,
        eventType: event.type
      }
    };

    const partitionKey = getPartitionKey('git', undefined, event.repository);
    
    return this.publishMessage(KAFKA_TOPICS.GIT_EVENTS, message, partitionKey);
  }

  async publishIDETelemetry(telemetry: IDETelemetry): Promise<ProducerResult> {
    const message: EventMessage = {
      id: telemetry.id,
      type: 'ide_telemetry',
      timestamp: telemetry.timestamp,
      data: telemetry,
      metadata: {
        userId: telemetry.userId,
        sessionId: telemetry.sessionId,
        eventType: telemetry.eventType
      }
    };

    const partitionKey = getPartitionKey('ide', telemetry.userId);
    
    return this.publishMessage(KAFKA_TOPICS.IDE_TELEMETRY, message, partitionKey);
  }

  async publishCommunicationEvent(event: any): Promise<ProducerResult> {
    const message: EventMessage = {
      id: event.id,
      type: 'communication_event',
      timestamp: event.timestamp,
      data: event,
      metadata: {
        platform: event.platform,
        channel: event.channel,
        eventType: event.type
      }
    };

    const partitionKey = getPartitionKey('communication', event.userId, event.channel);
    
    return this.publishMessage(KAFKA_TOPICS.COMMUNICATION_EVENTS, message, partitionKey);
  }

  async publishBatch(messages: Array<{
    topic: string;
    message: EventMessage;
    partitionKey?: string;
  }>): Promise<ProducerResult[]> {
    if (!this.isConnected) {
      throw new Error('Producer is not connected');
    }

    const results: ProducerResult[] = [];
    const topicMessages: Record<string, ProducerRecord> = {};

    // Group messages by topic
    for (const { topic, message, partitionKey } of messages) {
      if (!topicMessages[topic]) {
        topicMessages[topic] = {
          topic,
          messages: []
        };
      }

      topicMessages[topic].messages.push({
        key: partitionKey || message.id,
        value: JSON.stringify(message),
        timestamp: message.timestamp.getTime().toString(),
        headers: {
          messageType: message.type,
          messageId: message.id
        }
      });
    }

    try {
      // Send all topics in a single transaction
      const sendPromises = Object.values(topicMessages).map(record => 
        this.producer.send(record)
      );

      const topicResults = await Promise.all(sendPromises);
      
      // Flatten results
      for (const topicResult of topicResults) {
        for (const recordMetadata of topicResult) {
          results.push({
            success: true,
            messageId: recordMetadata.topicName + ':' + recordMetadata.partition + ':' + recordMetadata.offset,
            partition: recordMetadata.partition,
            offset: recordMetadata.offset
          });
        }
      }

      this.logger.info('Batch messages published successfully', {
        messageCount: messages.length,
        topicCount: Object.keys(topicMessages).length
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to publish batch messages', { error, messageCount: messages.length });
      
      // Return error results for all messages
      return messages.map(({ message }) => ({
        success: false,
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  private async publishMessage(
    topic: string, 
    message: EventMessage, 
    partitionKey?: string
  ): Promise<ProducerResult> {
    if (!this.isConnected) {
      throw new Error('Producer is not connected');
    }

    try {
      const result = await this.producer.send({
        topic,
        messages: [{
          key: partitionKey || message.id,
          value: JSON.stringify(message),
          timestamp: message.timestamp.getTime().toString(),
          headers: {
            messageType: message.type,
            messageId: message.id
          }
        }]
      });

      const recordMetadata = result[0];
      
      this.logger.debug('Message published successfully', {
        topic,
        messageId: message.id,
        partition: recordMetadata.partition,
        offset: recordMetadata.offset
      });

      return {
        success: true,
        messageId: message.id,
        partition: recordMetadata.partition,
        offset: recordMetadata.offset
      };
    } catch (error) {
      this.logger.error('Failed to publish message', {
        topic,
        messageId: message.id,
        error
      });

      return {
        success: false,
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async publishToDeadLetterQueue(
    originalTopic: string,
    originalMessage: any,
    error: string,
    retryCount: number = 0
  ): Promise<ProducerResult> {
    const deadLetterMessage: EventMessage = {
      id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'dead_letter',
      timestamp: new Date(),
      data: {
        originalTopic,
        originalMessage,
        error,
        retryCount,
        failedAt: new Date().toISOString()
      }
    };

    return this.publishMessage(KAFKA_TOPICS.DEAD_LETTER, deadLetterMessage);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.fetchTopicMetadata({
        topics: Object.values(KAFKA_TOPICS)
      });
      
      await admin.disconnect();

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          topics: metadata.topics.map(t => ({
            name: t.name,
            partitions: t.partitions.length
          }))
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: this.isConnected,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Singleton instance
export const kafkaProducer = new KafkaEventProducer();