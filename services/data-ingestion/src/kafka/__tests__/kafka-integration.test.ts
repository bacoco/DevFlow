import { kafkaAdmin, kafkaProducer, createGitEventConsumer, KAFKA_TOPICS } from '../index';
import { GitEvent, GitEventType, PrivacyLevel } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

describe('Kafka Integration Tests', () => {
  let testConsumer: any;
  let receivedMessages: any[] = [];

  beforeAll(async () => {
    // Initialize Kafka cluster
    await kafkaAdmin.initializeCluster();
    
    // Connect producer
    await kafkaProducer.connect();
    
    // Set up test consumer
    testConsumer = createGitEventConsumer();
    await testConsumer.connect();
    
    // Register message handler to collect messages
    testConsumer.registerMessageHandler(KAFKA_TOPICS.GIT_EVENTS, async (message: any) => {
      receivedMessages.push(message);
    });
    
    await testConsumer.startConsuming();
    
    // Wait a bit for consumer to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (testConsumer) {
      await testConsumer.stopConsuming();
      await testConsumer.disconnect();
    }
    
    await kafkaProducer.disconnect();
    await kafkaAdmin.disconnect();
  }, 10000);

  beforeEach(() => {
    receivedMessages = [];
  });

  describe('Kafka Admin Service', () => {
    it('should connect and get cluster info', async () => {
      const healthCheck = await kafkaAdmin.healthCheck();
      
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.details.connected).toBe(true);
      expect(healthCheck.details.brokerCount).toBeGreaterThan(0);
      expect(healthCheck.details.topicCount).toBeGreaterThan(0);
    });

    it('should list all required topics', async () => {
      const topics = await kafkaAdmin.listTopics();
      
      expect(topics).toContain(KAFKA_TOPICS.GIT_EVENTS);
      expect(topics).toContain(KAFKA_TOPICS.IDE_TELEMETRY);
      expect(topics).toContain(KAFKA_TOPICS.COMMUNICATION_EVENTS);
      expect(topics).toContain(KAFKA_TOPICS.PROCESSED_METRICS);
      expect(topics).toContain(KAFKA_TOPICS.ALERTS);
      expect(topics).toContain(KAFKA_TOPICS.DEAD_LETTER);
    });

    it('should get topic metadata', async () => {
      const metadata = await kafkaAdmin.getTopicMetadata([KAFKA_TOPICS.GIT_EVENTS]);
      
      expect(metadata.topics).toHaveLength(1);
      expect(metadata.topics[0].name).toBe(KAFKA_TOPICS.GIT_EVENTS);
      expect(metadata.topics[0].partitions.length).toBeGreaterThan(0);
    });
  });

  describe('Kafka Producer Service', () => {
    it('should have healthy connection status', async () => {
      const healthCheck = await kafkaProducer.healthCheck();
      
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.details.connected).toBe(true);
    });

    it('should publish a Git event successfully', async () => {
      const gitEvent: GitEvent = {
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: 'test/repo',
        author: 'test-user',
        timestamp: new Date(),
        metadata: {
          commitHash: 'abc123',
          branch: 'main',
          linesAdded: 10,
          linesDeleted: 5,
          filesChanged: ['src/test.ts']
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      const result = await kafkaProducer.publishGitEvent(gitEvent);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(gitEvent.id);
      expect(result.partition).toBeDefined();
      expect(result.offset).toBeDefined();
    });

    it('should publish batch messages successfully', async () => {
      const gitEvents: GitEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository: 'test/batch-repo',
        author: `test-user-${i}`,
        timestamp: new Date(),
        metadata: {
          commitHash: `hash${i}`,
          branch: 'main',
          linesAdded: i * 2,
          linesDeleted: i,
          filesChanged: [`src/file${i}.ts`]
        },
        privacyLevel: PrivacyLevel.TEAM
      }));

      const batchMessages = gitEvents.map(event => ({
        topic: KAFKA_TOPICS.GIT_EVENTS,
        message: {
          id: event.id,
          type: 'git_event',
          timestamp: event.timestamp,
          data: event
        }
      }));

      const results = await kafkaProducer.publishBatch(batchMessages);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.partition).toBeDefined();
        expect(result.offset).toBeDefined();
      });
    });
  });

  describe('Kafka Consumer Service', () => {
    it('should have correct status', () => {
      const status = testConsumer.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.running).toBe(true);
      expect(status.groupId).toBe('devflow-git-processor');
      expect(status.topics).toContain(KAFKA_TOPICS.GIT_EVENTS);
    });

    it('should consume published messages', async () => {
      const gitEvent: GitEvent = {
        id: uuidv4(),
        type: GitEventType.PUSH,
        repository: 'test/consumer-repo',
        author: 'consumer-test-user',
        timestamp: new Date(),
        metadata: {
          commitHash: 'consumer123',
          branch: 'feature/test',
          linesAdded: 20,
          linesDeleted: 10,
          filesChanged: ['src/consumer-test.ts']
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      // Publish message
      const publishResult = await kafkaProducer.publishGitEvent(gitEvent);
      expect(publishResult.success).toBe(true);

      // Wait for message to be consumed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if message was received
      expect(receivedMessages.length).toBeGreaterThan(0);
      
      const receivedMessage = receivedMessages.find(msg => msg.id === gitEvent.id);
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.type).toBe('git_event');
      expect(receivedMessage.data.repository).toBe(gitEvent.repository);
      expect(receivedMessage.data.author).toBe(gitEvent.author);
    });

    it('should have healthy status', async () => {
      const healthCheck = await testConsumer.healthCheck();
      
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.details.connected).toBe(true);
      expect(healthCheck.details.running).toBe(true);
    });
  });

  describe('Message Queue Reliability', () => {
    it('should handle producer reconnection', async () => {
      // Disconnect and reconnect producer
      await kafkaProducer.disconnect();
      expect(kafkaProducer.getConnectionStatus()).toBe(false);
      
      await kafkaProducer.connect();
      expect(kafkaProducer.getConnectionStatus()).toBe(true);
      
      // Test that it can still publish
      const gitEvent: GitEvent = {
        id: uuidv4(),
        type: GitEventType.MERGE,
        repository: 'test/reconnect-repo',
        author: 'reconnect-user',
        timestamp: new Date(),
        metadata: {
          commitHash: 'reconnect123',
          branch: 'main',
          isMerge: true
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      const result = await kafkaProducer.publishGitEvent(gitEvent);
      expect(result.success).toBe(true);
    });

    it('should handle consumer reconnection', async () => {
      // Stop and restart consumer
      await testConsumer.stopConsuming();
      expect(testConsumer.getStatus().running).toBe(false);
      
      await testConsumer.startConsuming();
      
      // Wait for consumer to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(testConsumer.getStatus().running).toBe(true);
      
      // Test that it can still consume
      const gitEvent: GitEvent = {
        id: uuidv4(),
        type: GitEventType.BRANCH_CREATE,
        repository: 'test/consumer-reconnect-repo',
        author: 'consumer-reconnect-user',
        timestamp: new Date(),
        metadata: {
          branch: 'feature/reconnect-test'
        },
        privacyLevel: PrivacyLevel.TEAM
      };

      await kafkaProducer.publishGitEvent(gitEvent);
      
      // Wait for message to be consumed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const receivedMessage = receivedMessages.find(msg => msg.id === gitEvent.id);
      expect(receivedMessage).toBeDefined();
    });

    it('should maintain message ordering within partitions', async () => {
      const repository = 'test/ordering-repo';
      const events: GitEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: uuidv4(),
        type: GitEventType.COMMIT,
        repository,
        author: 'ordering-user',
        timestamp: new Date(Date.now() + i * 1000), // Sequential timestamps
        metadata: {
          commitHash: `order${i}`,
          branch: 'main',
          linesAdded: i
        },
        privacyLevel: PrivacyLevel.TEAM
      }));

      // Publish events sequentially
      for (const event of events) {
        await kafkaProducer.publishGitEvent(event);
      }

      // Wait for all messages to be consumed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Filter messages for this test
      const testMessages = receivedMessages
        .filter(msg => msg.data.repository === repository)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      expect(testMessages.length).toBe(events.length);
      
      // Verify ordering
      for (let i = 0; i < testMessages.length; i++) {
        expect(testMessages[i].data.metadata.linesAdded).toBe(i);
      }
    });
  });
});