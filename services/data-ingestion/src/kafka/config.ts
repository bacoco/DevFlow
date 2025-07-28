import { KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs';

export interface KafkaClusterConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout: number;
  requestTimeout: number;
  retry: {
    initialRetryTime: number;
    retries: number;
  };
}

export interface TopicConfig {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
  configEntries?: Array<{
    name: string;
    value: string;
  }>;
}

export const KAFKA_TOPICS = {
  GIT_EVENTS: 'devflow.git.events',
  IDE_TELEMETRY: 'devflow.ide.telemetry',
  COMMUNICATION_EVENTS: 'devflow.communication.events',
  PROCESSED_METRICS: 'devflow.metrics.processed',
  ALERTS: 'devflow.alerts',
  DEAD_LETTER: 'devflow.dead-letter'
} as const;

export const getKafkaConfig = (): KafkaConfig => {
  const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
  
  return {
    clientId: process.env.KAFKA_CLIENT_ID || 'devflow-data-ingestion',
    brokers,
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '3000'),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
    retry: {
      initialRetryTime: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME || '100'),
      retries: parseInt(process.env.KAFKA_RETRIES || '8')
    },
    logLevel: process.env.NODE_ENV === 'production' ? 2 : 4 // ERROR in prod, DEBUG in dev
  };
};

export const getProducerConfig = (): ProducerConfig => ({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

export const getConsumerConfig = (groupId: string): ConsumerConfig => ({
  groupId,
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
  minBytes: 1,
  maxBytes: 10485760, // 10MB
  maxWaitTimeInMs: 5000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

export const TOPIC_CONFIGS: Record<string, TopicConfig> = {
  [KAFKA_TOPICS.GIT_EVENTS]: {
    topic: KAFKA_TOPICS.GIT_EVENTS,
    numPartitions: 6,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '604800000' }, // 7 days
      { name: 'compression.type', value: 'snappy' }
    ]
  },
  [KAFKA_TOPICS.IDE_TELEMETRY]: {
    topic: KAFKA_TOPICS.IDE_TELEMETRY,
    numPartitions: 12,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '259200000' }, // 3 days
      { name: 'compression.type', value: 'lz4' }
    ]
  },
  [KAFKA_TOPICS.COMMUNICATION_EVENTS]: {
    topic: KAFKA_TOPICS.COMMUNICATION_EVENTS,
    numPartitions: 4,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '1209600000' }, // 14 days
      { name: 'compression.type', value: 'snappy' }
    ]
  },
  [KAFKA_TOPICS.PROCESSED_METRICS]: {
    topic: KAFKA_TOPICS.PROCESSED_METRICS,
    numPartitions: 8,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'compact' },
      { name: 'compression.type', value: 'snappy' }
    ]
  },
  [KAFKA_TOPICS.ALERTS]: {
    topic: KAFKA_TOPICS.ALERTS,
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '2592000000' }, // 30 days
      { name: 'compression.type', value: 'gzip' }
    ]
  },
  [KAFKA_TOPICS.DEAD_LETTER]: {
    topic: KAFKA_TOPICS.DEAD_LETTER,
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '2592000000' }, // 30 days
      { name: 'compression.type', value: 'gzip' }
    ]
  }
};

export const getPartitionKey = (eventType: string, userId?: string, repository?: string): string => {
  // Partition strategy to ensure related events go to the same partition
  if (userId) {
    return `${eventType}:${userId}`;
  }
  if (repository) {
    return `${eventType}:${repository}`;
  }
  return eventType;
};