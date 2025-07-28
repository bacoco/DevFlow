import { Kafka, Admin, ITopicConfig } from 'kafkajs';
import { getKafkaConfig, TOPIC_CONFIGS, TopicConfig } from './config';
import winston from 'winston';

export class KafkaAdminService {
  private kafka: Kafka;
  private admin: Admin;
  private logger: winston.Logger;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka(getKafkaConfig());
    this.admin = this.kafka.admin();
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/kafka-admin.log' })
      ]
    });
  }

  async connect(): Promise<void> {
    try {
      await this.admin.connect();
      this.isConnected = true;
      this.logger.info('Kafka admin connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka admin', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.admin.disconnect();
      this.isConnected = false;
      this.logger.info('Kafka admin disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka admin', { error });
      throw error;
    }
  }

  async createTopics(topicConfigs?: TopicConfig[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    const configs = topicConfigs || Object.values(TOPIC_CONFIGS);
    
    try {
      const existingTopics = await this.listTopics();
      const topicsToCreate = configs.filter(config => 
        !existingTopics.includes(config.topic)
      );

      if (topicsToCreate.length === 0) {
        this.logger.info('All topics already exist');
        return;
      }

      const topicCreationConfigs: ITopicConfig[] = topicsToCreate.map(config => ({
        topic: config.topic,
        numPartitions: config.numPartitions,
        replicationFactor: config.replicationFactor,
        configEntries: config.configEntries
      }));

      const result = await this.admin.createTopics({
        topics: topicCreationConfigs,
        waitForLeaders: true,
        timeout: 30000
      });

      if (result) {
        this.logger.info('Topics created successfully', {
          topics: topicsToCreate.map(t => t.topic)
        });
      } else {
        this.logger.warn('Some topics may already exist or creation failed');
      }
    } catch (error) {
      this.logger.error('Failed to create topics', { error });
      throw error;
    }
  }

  async deleteTopics(topicNames: string[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      await this.admin.deleteTopics({
        topics: topicNames,
        timeout: 30000
      });

      this.logger.info('Topics deleted successfully', { topics: topicNames });
    } catch (error) {
      this.logger.error('Failed to delete topics', { error, topics: topicNames });
      throw error;
    }
  }

  async listTopics(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      const topics = await this.admin.listTopics();
      return topics;
    } catch (error) {
      this.logger.error('Failed to list topics', { error });
      throw error;
    }
  }

  async getTopicMetadata(topics?: string[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      const metadata = await this.admin.fetchTopicMetadata({
        topics: topics || Object.values(TOPIC_CONFIGS).map(c => c.topic)
      });

      return metadata;
    } catch (error) {
      this.logger.error('Failed to fetch topic metadata', { error });
      throw error;
    }
  }

  async getConsumerGroups(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      const groups = await this.admin.listGroups();
      return groups;
    } catch (error) {
      this.logger.error('Failed to list consumer groups', { error });
      throw error;
    }
  }

  async getConsumerGroupDetails(groupIds: string[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      const groupDetails = await this.admin.describeGroups(groupIds);
      return groupDetails;
    } catch (error) {
      this.logger.error('Failed to describe consumer groups', { error, groupIds });
      throw error;
    }
  }

  async resetConsumerGroupOffsets(
    groupId: string, 
    topic: string, 
    toEarliest: boolean = false
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      await this.admin.resetOffsets({
        groupId,
        topic,
        earliest: toEarliest
      });

      this.logger.info('Consumer group offsets reset', { 
        groupId, 
        topic, 
        toEarliest 
      });
    } catch (error) {
      this.logger.error('Failed to reset consumer group offsets', { 
        error, 
        groupId, 
        topic 
      });
      throw error;
    }
  }

  async getClusterInfo(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Admin is not connected');
    }

    try {
      // Get all topics first
      const allTopics = await this.admin.listTopics();
      const metadata = await this.admin.fetchTopicMetadata({ topics: allTopics });
      const topics = metadata.topics;

      // Get broker information from cluster metadata
      const clusterMetadata = await this.admin.describeCluster();

      return {
        brokers: clusterMetadata.brokers.map((broker: any) => ({
          nodeId: broker.nodeId,
          host: broker.host,
          port: broker.port
        })),
        topics: topics.map((topic: any) => ({
          name: topic.name,
          partitions: topic.partitions.length,
          partitionDetails: topic.partitions.map((partition: any) => ({
            partitionId: partition.partitionId,
            leader: partition.leader,
            replicas: partition.replicas,
            isr: partition.isr
          }))
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get cluster info', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const clusterInfo = await this.getClusterInfo();
      const consumerGroups = await this.getConsumerGroups();

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          brokerCount: clusterInfo.brokers.length,
          topicCount: clusterInfo.topics.length,
          consumerGroupCount: consumerGroups.groups.length,
          brokers: clusterInfo.brokers,
          topics: clusterInfo.topics.map((t: any) => ({
            name: t.name,
            partitions: t.partitions
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

  async initializeCluster(): Promise<void> {
    this.logger.info('Initializing Kafka cluster...');
    
    try {
      await this.connect();
      await this.createTopics();
      
      this.logger.info('Kafka cluster initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka cluster', { error });
      throw error;
    }
  }
}

// Singleton instance
export const kafkaAdmin = new KafkaAdminService();