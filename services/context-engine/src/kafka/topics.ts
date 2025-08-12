import { Kafka, Admin } from 'kafkajs';
import { Logger } from '../utils/Logger';

export interface KafkaTopicConfig {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
  configEntries?: Array<{ name: string; value: string }>;
}

export const CONTEXT_TOPICS: KafkaTopicConfig[] = [
  {
    topic: 'ide-activity',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
      { name: 'cleanup.policy', value: 'delete' }
    ]
  },
  {
    topic: 'git-events',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 days
      { name: 'cleanup.policy', value: 'delete' }
    ]
  },
  {
    topic: 'calendar-events',
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '86400000' }, // 1 day
      { name: 'cleanup.policy', value: 'delete' }
    ]
  },
  {
    topic: 'biometric-data',
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '86400000' }, // 1 day
      { name: 'cleanup.policy', value: 'delete' }
    ]
  },
  {
    topic: 'context-changes',
    numPartitions: 5,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
      { name: 'cleanup.policy', value: 'delete' }
    ]
  },
  {
    topic: 'context-predictions',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '3600000' }, // 1 hour
      { name: 'cleanup.policy', value: 'delete' }
    ]
  }
];

export async function setupKafkaTopics(kafka: Kafka, logger: Logger): Promise<void> {
  const admin: Admin = kafka.admin();
  
  try {
    await admin.connect();
    logger.info('Connected to Kafka admin');

    // Get existing topics
    const existingTopics = await admin.listTopics();
    logger.info(`Existing Kafka topics: ${existingTopics.join(', ')}`);

    // Create topics that don't exist
    const topicsToCreate = CONTEXT_TOPICS.filter(
      topicConfig => !existingTopics.includes(topicConfig.topic)
    );

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(config => ({
          topic: config.topic,
          numPartitions: config.numPartitions,
          replicationFactor: config.replicationFactor,
          configEntries: config.configEntries
        }))
      });

      logger.info(`Created Kafka topics: ${topicsToCreate.map(t => t.topic).join(', ')}`);
    } else {
      logger.info('All required Kafka topics already exist');
    }

    // Verify topic configurations
    await verifyTopicConfigurations(admin, logger);

  } catch (error) {
    logger.error('Failed to setup Kafka topics:', error);
    throw error;
  } finally {
    await admin.disconnect();
  }
}

async function verifyTopicConfigurations(admin: Admin, logger: Logger): Promise<void> {
  try {
    const topicMetadata = await admin.fetchTopicMetadata({
      topics: CONTEXT_TOPICS.map(t => t.topic)
    });

    topicMetadata.topics.forEach(topic => {
      logger.info(`Topic ${topic.name}: ${topic.partitions.length} partitions`);
      
      if (topic.partitions.length === 0) {
        logger.warn(`Topic ${topic.name} has no partitions`);
      }
    });

  } catch (error) {
    logger.error('Failed to verify topic configurations:', error);
  }
}

export const KAFKA_MESSAGE_SCHEMAS = {
  'ide-activity': {
    userId: 'string',
    activity: {
      fileType: 'string',
      actionType: 'string', // 'editing', 'viewing', 'debugging'
      keywordFrequency: 'object',
      timeSpentInFile: 'number',
      numberOfEdits: 'number',
      projectId: 'string',
      projectName: 'string',
      activeFile: 'string',
      repository: 'string',
      branch: 'string',
      collaborators: 'array',
      continuousEditingTime: 'number',
      interruptionCount: 'number',
      keystrokePattern: 'string'
    },
    timestamp: 'date'
  },
  
  'git-events': {
    userId: 'string',
    gitEvent: {
      hash: 'string',
      message: 'string',
      author: 'string',
      timestamp: 'date',
      files: 'array',
      type: 'string' // 'commit', 'push', 'pull_request', 'merge', 'branch'
    },
    timestamp: 'date'
  },
  
  'calendar-events': {
    userId: 'string',
    calendarEvent: {
      status: 'string', // 'busy', 'free', 'tentative'
      type: 'string', // 'meeting', 'focus-time', 'break'
      inMeeting: 'boolean',
      meetingParticipants: 'array',
      meetingType: 'string'
    },
    timestamp: 'date'
  },
  
  'biometric-data': {
    userId: 'string',
    biometricData: {
      heartRate: 'number',
      heartRateVariability: 'number',
      stressLevel: 'number',
      concentration: 'number'
    },
    timestamp: 'date'
  },
  
  'context-changes': {
    userId: 'string',
    context: 'object', // WorkContext
    timestamp: 'date'
  },
  
  'context-predictions': {
    userId: 'string',
    predictions: 'array', // PredictedAction[]
    context: 'object', // WorkContext
    timestamp: 'date'
  }
};