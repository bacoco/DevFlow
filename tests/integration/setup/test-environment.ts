import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { MongoClient } from 'mongodb';
import { createClient as createRedisClient } from 'redis';
import { Kafka } from 'kafkajs';
import axios from 'axios';

export interface TestServices {
  mongodb: {
    container: StartedTestContainer;
    client: MongoClient;
    connectionString: string;
  };
  redis: {
    container: StartedTestContainer;
    client: any;
    connectionString: string;
  };
  kafka: {
    container: StartedTestContainer;
    client: Kafka;
    brokers: string[];
  };
  influxdb: {
    container: StartedTestContainer;
    url: string;
    token: string;
  };
}

export class TestEnvironment {
  private services: Partial<TestServices> = {};
  private serviceUrls: Record<string, string> = {};

  async setup(): Promise<void> {
    console.log('Setting up test environment...');
    
    // Start infrastructure containers
    await this.startMongoDB();
    await this.startRedis();
    await this.startKafka();
    await this.startInfluxDB();
    
    // Wait for services to be ready
    await this.waitForServices();
    
    console.log('Test environment ready');
  }

  async teardown(): Promise<void> {
    console.log('Tearing down test environment...');
    
    // Close clients
    if (this.services.mongodb?.client) {
      await this.services.mongodb.client.close();
    }
    if (this.services.redis?.client) {
      await this.services.redis.client.quit();
    }
    
    // Stop containers
    const containers = [
      this.services.mongodb?.container,
      this.services.redis?.container,
      this.services.kafka?.container,
      this.services.influxdb?.container
    ].filter(Boolean);
    
    await Promise.all(containers.map(container => container?.stop()));
    
    console.log('Test environment torn down');
  }

  private async startMongoDB(): Promise<void> {
    const container = await new GenericContainer('mongo:6.0')
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: 'testuser',
        MONGO_INITDB_ROOT_PASSWORD: 'testpass'
      })
      .withExposedPorts(27017)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const connectionString = `mongodb://testuser:testpass@${host}:${port}/testdb?authSource=admin`;
    
    const client = new MongoClient(connectionString);
    await client.connect();
    
    this.services.mongodb = {
      container,
      client,
      connectionString
    };
    
    this.serviceUrls.mongodb = connectionString;
  }

  private async startRedis(): Promise<void> {
    const container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(6379);
    const connectionString = `redis://${host}:${port}`;
    
    const client = createRedisClient({ url: connectionString });
    await client.connect();
    
    this.services.redis = {
      container,
      client,
      connectionString
    };
    
    this.serviceUrls.redis = connectionString;
  }

  private async startKafka(): Promise<void> {
    const container = await new GenericContainer('confluentinc/cp-kafka:latest')
      .withEnvironment({
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092',
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1'
      })
      .withExposedPorts(9092)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(9092);
    const brokers = [`${host}:${port}`];
    
    const client = new Kafka({
      clientId: 'test-client',
      brokers
    });
    
    this.services.kafka = {
      container,
      client,
      brokers
    };
    
    this.serviceUrls.kafka = brokers.join(',');
  }

  private async startInfluxDB(): Promise<void> {
    const container = await new GenericContainer('influxdb:2.7')
      .withEnvironment({
        INFLUXDB_DB: 'testdb',
        INFLUXDB_ADMIN_USER: 'admin',
        INFLUXDB_ADMIN_PASSWORD: 'testpass',
        INFLUXDB_USER: 'testuser',
        INFLUXDB_USER_PASSWORD: 'testpass'
      })
      .withExposedPorts(8086)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(8086);
    const url = `http://${host}:${port}`;
    
    this.services.influxdb = {
      container,
      url,
      token: 'test-token'
    };
    
    this.serviceUrls.influxdb = url;
  }

  private async waitForServices(): Promise<void> {
    const maxRetries = 30;
    const retryDelay = 1000;
    
    // Wait for MongoDB
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.services.mongodb?.client.admin().ping();
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Wait for Redis
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.services.redis?.client.ping();
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Wait for InfluxDB
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${this.services.influxdb?.url}/health`);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  getService<K extends keyof TestServices>(serviceName: K): TestServices[K] {
    return this.services[serviceName] as TestServices[K];
  }

  getServiceUrl(serviceName: string): string {
    return this.serviceUrls[serviceName];
  }

  async createTestData(): Promise<void> {
    // Create test users
    const usersCollection = this.services.mongodb?.client.db('testdb').collection('users');
    await usersCollection?.insertMany([
      {
        _id: 'user1',
        email: 'test1@example.com',
        name: 'Test User 1',
        role: 'developer',
        teamIds: ['team1'],
        privacySettings: {
          dataCollection: { ideTelemtry: true, gitActivity: true },
          sharing: { teamMetrics: true },
          retention: { months: 12 }
        }
      },
      {
        _id: 'user2',
        email: 'test2@example.com',
        name: 'Test User 2',
        role: 'team_lead',
        teamIds: ['team1'],
        privacySettings: {
          dataCollection: { ideTelemtry: true, gitActivity: true },
          sharing: { teamMetrics: true },
          retention: { months: 24 }
        }
      }
    ]);

    // Create test teams
    const teamsCollection = this.services.mongodb?.client.db('testdb').collection('teams');
    await teamsCollection?.insertMany([
      {
        _id: 'team1',
        name: 'Test Team',
        memberIds: ['user1', 'user2'],
        projectIds: ['project1'],
        settings: {
          dashboardLayout: 'default',
          alertThresholds: { productivity: 0.7 }
        }
      }
    ]);

    // Create test projects
    const projectsCollection = this.services.mongodb?.client.db('testdb').collection('projects');
    await projectsCollection?.insertMany([
      {
        _id: 'project1',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        teamId: 'team1',
        settings: {
          trackingEnabled: true,
          privacyLevel: 'team'
        }
      }
    ]);
  }

  async cleanTestData(): Promise<void> {
    const db = this.services.mongodb?.client.db('testdb');
    const collections = ['users', 'teams', 'projects', 'metrics', 'alerts'];
    
    for (const collection of collections) {
      await db?.collection(collection).deleteMany({});
    }
    
    // Clear Redis cache
    await this.services.redis?.client.flushAll();
  }
}