import { MongoClient, Db } from 'mongodb';
import { Logger } from '../utils/Logger';

export async function setupContextDatabase(mongoClient: MongoClient, logger: Logger): Promise<void> {
  try {
    const db: Db = mongoClient.db('devflow_context');
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Context Events Collection
    if (!collectionNames.includes('context_events')) {
      await db.createCollection('context_events');
      logger.info('Created context_events collection');
    }

    // User Contexts Collection (for caching)
    if (!collectionNames.includes('user_contexts')) {
      await db.createCollection('user_contexts');
      logger.info('Created user_contexts collection');
    }

    // Context Patterns Collection (for ML training data)
    if (!collectionNames.includes('context_patterns')) {
      await db.createCollection('context_patterns');
      logger.info('Created context_patterns collection');
    }

    // Create indexes
    await createIndexes(db, logger);
    
    logger.info('Context database schema setup completed');
  } catch (error) {
    logger.error('Failed to setup context database schema:', error);
    throw error;
  }
}

async function createIndexes(db: Db, logger: Logger): Promise<void> {
  const contextEventsCollection = db.collection('context_events');
  const userContextsCollection = db.collection('user_contexts');
  const contextPatternsCollection = db.collection('context_patterns');

  // Context Events indexes
  await contextEventsCollection.createIndex({ userId: 1, timestamp: -1 });
  await contextEventsCollection.createIndex({ eventType: 1 });
  await contextEventsCollection.createIndex({ 'context.activityType': 1 });
  await contextEventsCollection.createIndex({ 'context.projectContext.projectId': 1 });
  
  // TTL index for automatic cleanup (30 days)
  await contextEventsCollection.createIndex(
    { timestamp: 1 }, 
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
  );

  // User Contexts indexes
  await userContextsCollection.createIndex({ userId: 1 }, { unique: true });
  await userContextsCollection.createIndex({ lastUpdated: 1 });
  
  // TTL index for cache cleanup (1 day)
  await userContextsCollection.createIndex(
    { lastUpdated: 1 }, 
    { expireAfterSeconds: 24 * 60 * 60 }
  );

  // Context Patterns indexes
  await contextPatternsCollection.createIndex({ userId: 1 });
  await contextPatternsCollection.createIndex({ patternType: 1 });
  await contextPatternsCollection.createIndex({ confidence: -1 });

  logger.info('Database indexes created successfully');
}

export const contextEventSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['id', 'userId', 'eventType', 'context', 'timestamp', 'source'],
    properties: {
      id: {
        bsonType: 'string',
        description: 'Unique identifier for the context event'
      },
      userId: {
        bsonType: 'string',
        description: 'User identifier'
      },
      eventType: {
        bsonType: 'string',
        enum: ['activity_change', 'focus_change', 'collaboration_change', 'environment_change'],
        description: 'Type of context change event'
      },
      context: {
        bsonType: 'object',
        required: ['activityType', 'projectContext', 'focusLevel', 'collaborationState', 'environmentFactors', 'timestamp', 'confidence'],
        properties: {
          activityType: {
            bsonType: 'string',
            enum: ['coding', 'reviewing', 'planning', 'debugging', 'meeting'],
            description: 'Current activity type'
          },
          projectContext: {
            bsonType: 'object',
            required: ['projectId', 'name', 'activeFiles', 'recentCommits'],
            properties: {
              projectId: { bsonType: 'string' },
              name: { bsonType: 'string' },
              repository: { bsonType: 'string' },
              currentBranch: { bsonType: 'string' },
              activeFiles: { bsonType: 'array', items: { bsonType: 'string' } },
              recentCommits: { bsonType: 'array' }
            }
          },
          focusLevel: {
            bsonType: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Focus level from 0-100'
          },
          collaborationState: {
            bsonType: 'object',
            required: ['activeCollaborators', 'sharedArtifacts', 'communicationChannels'],
            properties: {
              activeCollaborators: { bsonType: 'array', items: { bsonType: 'string' } },
              sharedArtifacts: { bsonType: 'array', items: { bsonType: 'string' } },
              communicationChannels: { bsonType: 'array', items: { bsonType: 'string' } },
              meetingStatus: {
                bsonType: 'string',
                enum: ['in-meeting', 'available', 'busy']
              }
            }
          },
          environmentFactors: {
            bsonType: 'object',
            required: ['timeOfDay', 'dayOfWeek', 'workingHours', 'deviceType', 'networkQuality'],
            properties: {
              timeOfDay: { bsonType: 'string' },
              dayOfWeek: { bsonType: 'string' },
              workingHours: { bsonType: 'bool' },
              location: { bsonType: 'string' },
              deviceType: {
                bsonType: 'string',
                enum: ['desktop', 'mobile', 'tablet']
              },
              networkQuality: {
                bsonType: 'string',
                enum: ['excellent', 'good', 'poor']
              }
            }
          },
          timestamp: { bsonType: 'date' },
          confidence: {
            bsonType: 'number',
            minimum: 0,
            maximum: 1
          }
        }
      },
      previousContext: {
        bsonType: 'object',
        description: 'Previous context state for comparison'
      },
      timestamp: {
        bsonType: 'date',
        description: 'When the event occurred'
      },
      source: {
        bsonType: 'string',
        description: 'Source system that generated the event'
      }
    }
  }
};