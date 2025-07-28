/**
 * MongoDB Migration: Initial Schema Setup
 * Creates collections and indexes for DevFlow Intelligence
 */

const migration = {
  version: '001',
  description: 'Initial schema setup for DevFlow Intelligence',
  
  async up(db) {
    console.log('Running migration 001: Initial schema setup');
    
    // Create Users collection with indexes
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'email', 'name', 'role', 'teamIds', 'privacySettings', 'preferences', 'createdAt', 'updatedAt'],
          properties: {
            id: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            email: { bsonType: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
            name: { bsonType: 'string', minLength: 1, maxLength: 100 },
            role: { enum: ['developer', 'team_lead', 'manager', 'admin'] },
            teamIds: { bsonType: 'array', items: { bsonType: 'string' } },
            privacySettings: { bsonType: 'object' },
            preferences: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            lastActiveAt: { bsonType: 'date' },
            isActive: { bsonType: 'bool' }
          }
        }
      }
    });
    
    await db.collection('users').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
      { key: { role: 1 } },
      { key: { teamIds: 1 } },
      { key: { isActive: 1 } },
      { key: { createdAt: 1 } },
      { key: { lastActiveAt: 1 } }
    ]);
    
    // Create Teams collection with indexes
    await db.createCollection('teams', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'name', 'memberIds', 'projectIds', 'settings', 'createdAt', 'updatedAt'],
          properties: {
            id: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            name: { bsonType: 'string', minLength: 1, maxLength: 100 },
            description: { bsonType: 'string', maxLength: 500 },
            memberIds: { bsonType: 'array', items: { bsonType: 'string' } },
            projectIds: { bsonType: 'array', items: { bsonType: 'string' } },
            settings: { bsonType: 'object' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            isActive: { bsonType: 'bool' }
          }
        }
      }
    });
    
    await db.collection('teams').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { name: 1 } },
      { key: { memberIds: 1 } },
      { key: { projectIds: 1 } },
      { key: { isActive: 1 } },
      { key: { createdAt: 1 } }
    ]);
    
    // Create GitEvents collection with indexes
    await db.createCollection('gitEvents', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'type', 'repository', 'author', 'timestamp', 'metadata', 'privacyLevel'],
          properties: {
            id: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            type: { enum: ['commit', 'push', 'pull_request', 'merge', 'branch_create', 'branch_delete'] },
            repository: { bsonType: 'string', minLength: 1 },
            author: { bsonType: 'string', minLength: 1 },
            timestamp: { bsonType: 'date' },
            metadata: { bsonType: 'object' },
            privacyLevel: { enum: ['public', 'team', 'private'] }
          }
        }
      }
    });
    
    await db.collection('gitEvents').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { type: 1 } },
      { key: { repository: 1 } },
      { key: { author: 1 } },
      { key: { timestamp: 1 } },
      { key: { privacyLevel: 1 } },
      { key: { repository: 1, timestamp: -1 } },
      { key: { author: 1, timestamp: -1 } },
      // TTL index for data retention (expires after 2 years)
      { key: { timestamp: 1 }, expireAfterSeconds: 63072000 }
    ]);
    
    // Create IDETelemetry collection with indexes
    await db.createCollection('ideTelemetry', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'userId', 'sessionId', 'eventType', 'timestamp', 'data', 'privacyLevel'],
          properties: {
            id: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            userId: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            sessionId: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            eventType: { enum: ['keystroke', 'file_change', 'debug', 'focus', 'build', 'test_run'] },
            timestamp: { bsonType: 'date' },
            data: { bsonType: 'object' },
            privacyLevel: { enum: ['public', 'team', 'private'] }
          }
        }
      }
    });
    
    await db.collection('ideTelemetry').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { sessionId: 1 } },
      { key: { eventType: 1 } },
      { key: { timestamp: 1 } },
      { key: { privacyLevel: 1 } },
      { key: { userId: 1, timestamp: -1 } },
      { key: { sessionId: 1, timestamp: 1 } },
      // TTL index for data retention (expires after 1 year for telemetry)
      { key: { timestamp: 1 }, expireAfterSeconds: 31536000 }
    ]);
    
    // Create FlowStates collection with indexes
    await db.createCollection('flowStates', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'sessionId', 'startTime', 'interruptionCount', 'focusScore', 'activities', 'totalFocusTimeMs', 'deepWorkPercentage'],
          properties: {
            userId: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            sessionId: { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
            startTime: { bsonType: 'date' },
            endTime: { bsonType: 'date' },
            interruptionCount: { bsonType: 'int', minimum: 0 },
            focusScore: { bsonType: 'double', minimum: 0, maximum: 1 },
            activities: { bsonType: 'array' },
            totalFocusTimeMs: { bsonType: 'long', minimum: 0 },
            deepWorkPercentage: { bsonType: 'double', minimum: 0, maximum: 1 }
          }
        }
      }
    });
    
    await db.collection('flowStates').createIndexes([
      { key: { userId: 1 } },
      { key: { sessionId: 1 }, unique: true },
      { key: { startTime: 1 } },
      { key: { userId: 1, startTime: -1 } },
      { key: { focusScore: 1 } },
      // TTL index for data retention
      { key: { startTime: 1 }, expireAfterSeconds: 63072000 }
    ]);
    
    console.log('Migration 001 completed successfully');
  },
  
  async down(db) {
    console.log('Rolling back migration 001');
    
    await db.collection('users').drop();
    await db.collection('teams').drop();
    await db.collection('gitEvents').drop();
    await db.collection('ideTelemetry').drop();
    await db.collection('flowStates').drop();
    
    console.log('Migration 001 rollback completed');
  }
};

module.exports = migration;