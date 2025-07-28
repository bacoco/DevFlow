export * from './config';
export * from './producer';
export * from './consumer';
export * from './admin';

// Re-export commonly used instances
export { kafkaProducer } from './producer';
export { kafkaAdmin } from './admin';
export { 
  createGitEventConsumer,
  createIDETelemetryConsumer,
  createCommunicationEventConsumer,
  createDeadLetterConsumer
} from './consumer';