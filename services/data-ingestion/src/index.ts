import express from 'express';
import { config } from 'dotenv';
import { WebhookHandler } from './collectors/git/webhook-handler';
import { GitPollingService } from './collectors/git/polling-service';
import { SlackCollector } from './collectors/communication/slack-collector';
import { TeamsCollector } from './collectors/communication/teams-collector';
import { CodeReviewExtractor } from './collectors/communication/code-review-extractor';
import { kafkaAdmin, kafkaProducer } from './kafka';
import { eventValidator } from './validation/event-validator';
import { errorHandler } from './validation/error-handler';
import { retryProcessor } from './validation/retry-processor';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Kafka infrastructure
async function initializeKafka() {
  try {
    console.log('Initializing Kafka infrastructure...');
    await kafkaAdmin.initializeCluster();
    await kafkaProducer.connect();
    console.log('Kafka infrastructure initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Kafka infrastructure:', error);
    process.exit(1);
  }
}

// Initialize services
const webhookHandler = new WebhookHandler();
const pollingService = new GitPollingService();
const slackCollector = new SlackCollector({
  enabled: process.env.SLACK_ENABLED === 'true',
  botToken: process.env.SLACK_BOT_TOKEN || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  channels: process.env.SLACK_CHANNELS?.split(',') || []
});
const teamsCollector = new TeamsCollector({
  enabled: process.env.TEAMS_ENABLED === 'true',
  tenantId: process.env.TEAMS_TENANT_ID || '',
  clientId: process.env.TEAMS_CLIENT_ID || '',
  clientSecret: process.env.TEAMS_CLIENT_SECRET || '',
  webhookUrl: process.env.TEAMS_WEBHOOK_URL || ''
});
const codeReviewExtractor = new CodeReviewExtractor({
  github: {
    enabled: process.env.GITHUB_ENABLED === 'true',
    accessToken: process.env.GITHUB_ACCESS_TOKEN || '',
    repositories: process.env.GITHUB_REPOSITORIES?.split(',') || []
  },
  gitlab: {
    enabled: process.env.GITLAB_ENABLED === 'true',
    accessToken: process.env.GITLAB_ACCESS_TOKEN || '',
    repositories: process.env.GITLAB_REPOSITORIES?.split(',') || []
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const kafkaProducerHealth = await kafkaProducer.healthCheck();
    const kafkaAdminHealth = await kafkaAdmin.healthCheck();
    const retryStats = await retryProcessor.getStats();
    
    const overallStatus = kafkaProducerHealth.status === 'healthy' && 
                         kafkaAdminHealth.status === 'healthy' ? 'healthy' : 'unhealthy';
    
    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      service: 'data-ingestion',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      kafka: {
        producer: kafkaProducerHealth,
        admin: kafkaAdminHealth
      },
      retrySystem: {
        isRunning: retryStats.isRunning,
        stats: retryStats.retryStats
      }
    });
  } catch (error) {
    res.status(503).json({
      service: 'data-ingestion',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'DevFlow Intelligence Data Ingestion Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      kafka: {
        status: '/kafka/status',
        topics: '/kafka/topics',
        consumers: '/kafka/consumers'
      },
      retry: {
        stats: '/retry/stats',
        deadLetter: '/retry/dead-letter',
        reprocess: '/retry/reprocess/:jobId'
      },
      metrics: {
        summary: '/metrics/summary',
        prometheus: '/metrics'
      },
      alerts: {
        active: '/alerts/active',
        rules: '/alerts/rules',
        stats: '/alerts/stats'
      },
      webhooks: {
        github: '/webhooks/github',
        gitlab: '/webhooks/gitlab',
        slack: '/webhooks/slack',
        teams: '/webhooks/teams'
      },
      polling: {
        repositories: '/polling/repositories',
        poll: '/polling/repositories/:id/poll'
      },
      communication: {
        slack: '/communication/slack',
        teams: '/communication/teams',
        codeReview: '/communication/code-review'
      },
      telemetry: '/telemetry'
    }
  });
});

// Kafka management endpoints
app.get('/kafka/status', async (req, res) => {
  try {
    const producerHealth = await kafkaProducer.healthCheck();
    const adminHealth = await kafkaAdmin.healthCheck();
    
    res.json({
      producer: producerHealth,
      admin: adminHealth,
      connectionStatus: kafkaProducer.getConnectionStatus()
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get Kafka status: ${error}` });
  }
});

app.get('/kafka/topics', async (req, res) => {
  try {
    const topics = await kafkaAdmin.listTopics();
    const metadata = await kafkaAdmin.getTopicMetadata();
    
    res.json({
      topics,
      metadata: metadata.topics.map((topic: any) => ({
        name: topic.name,
        partitions: topic.partitions.length,
        partitionDetails: topic.partitions.map((p: any) => ({
          partitionId: p.partitionId,
          leader: p.leader,
          replicas: p.replicas.length,
          isr: p.isr.length
        }))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get Kafka topics: ${error}` });
  }
});

app.get('/kafka/consumers', async (req, res) => {
  try {
    const consumerGroups = await kafkaAdmin.getConsumerGroups();
    
    res.json({
      consumerGroups: consumerGroups.groups.map((group: any) => ({
        groupId: group.groupId,
        protocolType: group.protocolType,
        state: group.state
      }))
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get Kafka consumers: ${error}` });
  }
});

// Retry system endpoints
app.get('/retry/stats', async (req, res) => {
  try {
    const stats = await retryProcessor.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: `Failed to get retry stats: ${error}` });
  }
});

app.get('/retry/dead-letter', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const deadLetterJobs = await errorHandler.getDeadLetterJobs(limit);
    res.json({
      jobs: deadLetterJobs,
      count: deadLetterJobs.length
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get dead letter jobs: ${error}` });
  }
});

app.post('/retry/reprocess/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const newJobId = await errorHandler.reprocessDeadLetterJob(jobId);
    
    if (newJobId) {
      res.json({
        message: 'Dead letter job reprocessed successfully',
        originalJobId: jobId,
        newJobId
      });
    } else {
      res.status(404).json({ error: 'Dead letter job not found' });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to reprocess dead letter job: ${error}` });
  }
});

app.post('/retry/cleanup', async (req, res) => {
  try {
    const maxAgeMs = parseInt(req.body.maxAgeMs) || (7 * 24 * 60 * 60 * 1000); // 7 days default
    const cleanedCount = await errorHandler.cleanupExpiredJobs(maxAgeMs);
    
    res.json({
      message: 'Cleanup completed',
      cleanedJobsCount: cleanedCount,
      maxAgeMs
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to cleanup expired jobs: ${error}` });
  }
});

// Metrics endpoints
app.get('/metrics/summary', async (req, res) => {
  try {
    const metricsCollector = errorHandler.getMetricsCollector();
    const summary = await metricsCollector.getMetricsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: `Failed to get metrics summary: ${error}` });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    const { register } = require('./validation/error-metrics');
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: `Failed to get Prometheus metrics: ${error}` });
  }
});

// Alerting endpoints
app.get('/alerts/active', async (req, res) => {
  try {
    const alertingSystem = errorHandler.getAlertingSystem();
    const activeAlerts = alertingSystem.getActiveAlerts();
    res.json({
      alerts: activeAlerts,
      count: activeAlerts.length
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get active alerts: ${error}` });
  }
});

app.get('/alerts/rules', async (req, res) => {
  try {
    const alertingSystem = errorHandler.getAlertingSystem();
    const rules = alertingSystem.getRules();
    res.json({
      rules,
      count: rules.length
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to get alert rules: ${error}` });
  }
});

app.post('/alerts/rules', async (req, res) => {
  try {
    const alertingSystem = errorHandler.getAlertingSystem();
    const rule = req.body;
    
    // Basic validation
    if (!rule.id || !rule.name || !rule.condition) {
      return res.status(400).json({ error: 'Missing required fields: id, name, condition' });
    }
    
    alertingSystem.addRule(rule);
    res.status(201).json({ message: 'Alert rule added successfully', ruleId: rule.id });
  } catch (error) {
    res.status(500).json({ error: `Failed to add alert rule: ${error}` });
  }
});

app.put('/alerts/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    const alertingSystem = errorHandler.getAlertingSystem();
    
    const success = alertingSystem.updateRule(ruleId, updates);
    if (success) {
      res.json({ message: 'Alert rule updated successfully' });
    } else {
      res.status(404).json({ error: 'Alert rule not found' });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to update alert rule: ${error}` });
  }
});

app.delete('/alerts/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const alertingSystem = errorHandler.getAlertingSystem();
    
    const success = alertingSystem.removeRule(ruleId);
    if (success) {
      res.json({ message: 'Alert rule removed successfully' });
    } else {
      res.status(404).json({ error: 'Alert rule not found' });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to remove alert rule: ${error}` });
  }
});

app.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const alertingSystem = errorHandler.getAlertingSystem();
    
    const success = alertingSystem.resolveAlert(alertId);
    if (success) {
      res.json({ message: 'Alert resolved successfully' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to resolve alert: ${error}` });
  }
});

app.get('/alerts/stats', async (req, res) => {
  try {
    const alertingSystem = errorHandler.getAlertingSystem();
    const stats = alertingSystem.getAlertingStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: `Failed to get alerting stats: ${error}` });
  }
});

// Git webhook endpoints
app.post('/webhooks/github', async (req, res) => {
  const context = {
    operation: 'github_webhook',
    source: 'github',
    timestamp: new Date(),
    metadata: { userAgent: req.get('User-Agent') }
  };

  try {
    const result = await errorHandler.executeWithRetry(
      () => webhookHandler.handleGitHubWebhook(req, res),
      context
    );
    
    // Convert normalized events to GitEvent objects
    const { GitEventNormalizer } = require('./collectors/git/normalizer');
    const gitEvents = result.events.map((event: any) => GitEventNormalizer.toGitEvent(event));

    // Validate events before publishing
    const validationResult = eventValidator.validateBatch(
      gitEvents,
      'git',
      context
    );

    // Handle validation errors
    for (const invalidEvent of validationResult.invalidEvents) {
      await errorHandler.handleValidationError(
        invalidEvent.data,
        invalidEvent.errors,
        { ...context, metadata: { ...context.metadata, eventIndex: invalidEvent.index } }
      );
    }

    // Publish valid events to Kafka with retry
    const publishResults = await Promise.all(
      validationResult.validEvents.map(event =>
        errorHandler.executeWithRetry(
          () => kafkaProducer.publishGitEvent(event),
          { ...context, operation: 'kafka_publish', metadata: { eventId: event.id } }
        ).catch(error => {
          errorHandler.handleKafkaError('git_events', event, error, context);
          return { success: false, messageId: event.id, error: error.message };
        })
      )
    );
    
    const successfulPublishes = publishResults.filter(r => r.success).length;
    const failedPublishes = publishResults.filter(r => !r.success).length;
    
    console.log('GitHub webhook processed:', {
      repository: result.metadata.repository,
      totalEvents: result.events.length,
      validEvents: validationResult.validEvents.length,
      invalidEvents: validationResult.invalidEvents.length,
      warnings: validationResult.warnings.length,
      errors: result.errors.length,
      kafkaPublished: successfulPublishes,
      kafkaFailed: failedPublishes
    });
  } catch (error) {
    await errorHandler.handleProcessingError(req.body, error as Error, context);
    res.status(500).json({ error: 'Failed to process GitHub webhook' });
  }
});

app.post('/webhooks/gitlab', async (req, res) => {
  const context = {
    operation: 'gitlab_webhook',
    source: 'gitlab',
    timestamp: new Date(),
    metadata: { userAgent: req.get('User-Agent') }
  };

  try {
    const result = await errorHandler.executeWithRetry(
      () => webhookHandler.handleGitLabWebhook(req, res),
      context
    );
    
    // Convert normalized events to GitEvent objects
    const { GitEventNormalizer } = require('./collectors/git/normalizer');
    const gitEvents = result.events.map((event: any) => GitEventNormalizer.toGitEvent(event));

    // Validate events before publishing
    const validationResult = eventValidator.validateBatch(
      gitEvents,
      'git',
      context
    );

    // Handle validation errors
    for (const invalidEvent of validationResult.invalidEvents) {
      await errorHandler.handleValidationError(
        invalidEvent.data,
        invalidEvent.errors,
        { ...context, metadata: { ...context.metadata, eventIndex: invalidEvent.index } }
      );
    }

    // Publish valid events to Kafka with retry
    const publishResults = await Promise.all(
      validationResult.validEvents.map(event =>
        errorHandler.executeWithRetry(
          () => kafkaProducer.publishGitEvent(event),
          { ...context, operation: 'kafka_publish', metadata: { eventId: event.id } }
        ).catch(error => {
          errorHandler.handleKafkaError('git_events', event, error, context);
          return { success: false, messageId: event.id, error: error.message };
        })
      )
    );
    
    const successfulPublishes = publishResults.filter(r => r.success).length;
    const failedPublishes = publishResults.filter(r => !r.success).length;
    
    console.log('GitLab webhook processed:', {
      repository: result.metadata.repository,
      totalEvents: result.events.length,
      validEvents: validationResult.validEvents.length,
      invalidEvents: validationResult.invalidEvents.length,
      warnings: validationResult.warnings.length,
      errors: result.errors.length,
      kafkaPublished: successfulPublishes,
      kafkaFailed: failedPublishes
    });
  } catch (error) {
    await errorHandler.handleProcessingError(req.body, error as Error, context);
    res.status(500).json({ error: 'Failed to process GitLab webhook' });
  }
});

// Git polling endpoints
app.get('/polling/repositories', (req, res) => {
  const repositories = pollingService.getRepositories();
  res.json({
    repositories: repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      provider: repo.provider,
      webhookEnabled: repo.webhookEnabled,
      pollingEnabled: repo.pollingEnabled,
      pollingIntervalMinutes: repo.pollingIntervalMinutes,
      lastPolledAt: repo.lastPolledAt
    }))
  });
});

app.post('/polling/repositories', (req, res) => {
  try {
    const config = req.body;
    pollingService.addRepository(config);
    res.status(201).json({ message: 'Repository added successfully', id: config.id });
  } catch (error) {
    res.status(400).json({ error: `Failed to add repository: ${error}` });
  }
});

app.put('/polling/repositories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    pollingService.updateRepository(id, updates);
    res.json({ message: 'Repository updated successfully' });
  } catch (error) {
    res.status(400).json({ error: `Failed to update repository: ${error}` });
  }
});

app.delete('/polling/repositories/:id', (req, res) => {
  try {
    const { id } = req.params;
    pollingService.removeRepository(id);
    res.json({ message: 'Repository removed successfully' });
  } catch (error) {
    res.status(400).json({ error: `Failed to remove repository: ${error}` });
  }
});

app.post('/polling/repositories/:id/poll', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pollingService.pollRepository(id);
    
    // Convert normalized events to GitEvent objects
    const { GitEventNormalizer } = require('./collectors/git/normalizer');
    const gitEvents = result.events.map((event: any) => GitEventNormalizer.toGitEvent(event));
    
    // Publish events to Kafka
    const publishResults = await Promise.all(
      gitEvents.map(event => kafkaProducer.publishGitEvent(event))
    );
    
    const successfulPublishes = publishResults.filter(r => r.success).length;
    const failedPublishes = publishResults.filter(r => !r.success).length;
    
    res.json({
      success: result.success,
      eventsCount: result.events.length,
      errors: result.errors,
      metadata: result.metadata,
      kafkaPublished: successfulPublishes,
      kafkaFailed: failedPublishes
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to poll repository: ${error}` });
  }
});

// Communication webhook endpoints
app.post('/webhooks/slack', async (req, res) => {
  try {
    const result = await slackCollector.handleWebhook(req, res);
    console.log('Slack webhook processed:', {
      eventsCount: result.eventsCollected,
      errors: result.errors.length
    });
  } catch (error) {
    console.error('Error processing Slack webhook:', error);
  }
});

app.post('/webhooks/teams', async (req, res) => {
  try {
    const result = await teamsCollector.handleWebhook(req, res);
    console.log('Teams webhook processed:', {
      eventsCount: result.eventsCollected,
      errors: result.errors.length
    });
  } catch (error) {
    console.error('Error processing Teams webhook:', error);
  }
});

// Communication data endpoints
app.get('/communication/slack/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    
    const events = await slackCollector.fetchChannelMessages(channelId, since);
    res.json({
      events: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Slack messages: ${error}` });
  }
});

app.get('/communication/teams/:teamId/channels/:channelId/messages', async (req, res) => {
  try {
    const { teamId, channelId } = req.params;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    
    const events = await teamsCollector.fetchChannelMessages(teamId, channelId, since);
    res.json({
      events: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch Teams messages: ${error}` });
  }
});

app.get('/communication/code-review/:platform/:repository/pull-requests/:prId/comments', async (req, res) => {
  try {
    const { platform, repository, prId } = req.params;
    
    let events;
    if (platform === 'github') {
      events = await codeReviewExtractor.extractGitHubReviewComments(repository, parseInt(prId));
    } else if (platform === 'gitlab') {
      events = await codeReviewExtractor.extractGitLabReviewComments(repository, parseInt(prId));
    } else {
      return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    res.json({
      events: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to extract code review comments: ${error}` });
  }
});

app.post('/communication/code-review/extract', async (req, res) => {
  try {
    const since = req.body.since ? new Date(req.body.since) : undefined;
    const result = await codeReviewExtractor.extractAllReviewComments(since);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to extract code review comments: ${error}` });
  }
});

// IDE telemetry endpoint
app.post('/telemetry', async (req, res) => {
  const context = {
    operation: 'telemetry_ingestion',
    source: 'ide',
    timestamp: new Date(),
    metadata: { 
      userAgent: req.get('User-Agent'),
      batchId: req.body.batchId 
    }
  };

  try {
    const telemetryBatch = req.body;
    
    // Basic validation
    if (!telemetryBatch.events || !Array.isArray(telemetryBatch.events)) {
      return res.status(400).json({ error: 'Invalid telemetry batch format' });
    }

    console.log('Received telemetry batch:', {
      batchId: telemetryBatch.batchId,
      userId: telemetryBatch.userId,
      sessionId: telemetryBatch.sessionId,
      eventCount: telemetryBatch.events.length,
      privacyLevel: telemetryBatch.privacyLevel
    });

    // Convert to standard IDETelemetry format
    const convertedEvents = telemetryBatch.events.map((event: any) => ({
      id: require('uuid').v4(),
      userId: telemetryBatch.userId,
      sessionId: event.sessionId || telemetryBatch.sessionId,
      eventType: event.type,
      timestamp: new Date(event.timestamp),
      data: event.data,
      privacyLevel: telemetryBatch.privacyLevel
    }));

    // Validate events using the new validation system
    const validationResult = eventValidator.validateBatch(
      convertedEvents,
      'ide',
      context
    );

    // Handle validation errors
    for (const invalidEvent of validationResult.invalidEvents) {
      await errorHandler.handleValidationError(
        invalidEvent.data,
        invalidEvent.errors,
        { ...context, metadata: { ...context.metadata, eventIndex: invalidEvent.index } }
      );
    }

    // Publish valid telemetry events to Kafka with retry
    const publishResults = await Promise.all(
      validationResult.validEvents.map(event =>
        errorHandler.executeWithRetry(
          () => kafkaProducer.publishIDETelemetry(event),
          { ...context, operation: 'kafka_publish', metadata: { eventId: event.id } }
        ).catch(error => {
          errorHandler.handleKafkaError('ide_telemetry', event, error, context);
          return { success: false, messageId: event.id, error: error.message };
        })
      )
    );
    
    const successfulPublishes = publishResults.filter(r => r.success).length;
    const failedPublishes = publishResults.filter(r => !r.success).length;

    res.json({
      message: 'Telemetry batch processed successfully',
      totalEvents: telemetryBatch.events.length,
      validEvents: validationResult.validEvents.length,
      invalidEvents: validationResult.invalidEvents.length,
      warnings: validationResult.warnings.length,
      batchId: telemetryBatch.batchId,
      kafkaPublished: successfulPublishes,
      kafkaFailed: failedPublishes
    });

  } catch (error) {
    await errorHandler.handleProcessingError(req.body, error as Error, context);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully`);
  
  try {
    // Stop retry processor
    await retryProcessor.stop();
    
    // Stop polling services
    pollingService.stopAll();
    
    // Shutdown error handler (disconnects retry storage)
    await errorHandler.shutdown();
    
    // Disconnect Kafka
    await kafkaProducer.disconnect();
    await kafkaAdmin.disconnect();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function startServer() {
  try {
    // Initialize Kafka first
    await initializeKafka();
    
    // Start retry processor
    await retryProcessor.start();
    console.log('Retry processor started successfully');
    
    // Start the HTTP server
    app.listen(PORT, () => {
      console.log(`Data Ingestion Service running on port ${PORT}`);
      console.log('Available endpoints:');
      console.log('  - GET /health - Health check with Kafka status');
      console.log('  - GET /kafka/status - Kafka connection status');
      console.log('  - GET /kafka/topics - Kafka topics information');
      console.log('  - GET /kafka/consumers - Kafka consumer groups');
      console.log('  - POST /webhooks/github - GitHub webhook handler');
      console.log('  - POST /webhooks/gitlab - GitLab webhook handler');
      console.log('  - GET /polling/repositories - List polling repositories');
      console.log('  - POST /polling/repositories - Add polling repository');
      console.log('  - PUT /polling/repositories/:id - Update polling repository');
      console.log('  - DELETE /polling/repositories/:id - Remove polling repository');
      console.log('  - POST /polling/repositories/:id/poll - Manually poll repository');
      console.log('  - POST /webhooks/slack - Slack webhook handler');
      console.log('  - POST /webhooks/teams - Teams webhook handler');
      console.log('  - GET /communication/slack/channels/:channelId/messages - Fetch Slack messages');
      console.log('  - GET /communication/teams/:teamId/channels/:channelId/messages - Fetch Teams messages');
      console.log('  - GET /communication/code-review/:platform/:repository/pull-requests/:prId/comments - Extract code review comments');
      console.log('  - POST /communication/code-review/extract - Extract all code review comments');
      console.log('  - POST /telemetry - IDE telemetry ingestion endpoint');
      console.log('  - GET /retry/stats - Retry system statistics');
      console.log('  - GET /retry/dead-letter - Dead letter jobs');
      console.log('  - POST /retry/reprocess/:jobId - Reprocess dead letter job');
      console.log('  - POST /retry/cleanup - Cleanup expired retry jobs');
      console.log('  - GET /metrics/summary - Error metrics summary');
      console.log('  - GET /metrics - Prometheus metrics');
      console.log('  - GET /alerts/active - Active alerts');
      console.log('  - GET /alerts/rules - Alert rules');
      console.log('  - POST /alerts/rules - Add alert rule');
      console.log('  - PUT /alerts/rules/:ruleId - Update alert rule');
      console.log('  - DELETE /alerts/rules/:ruleId - Remove alert rule');
      console.log('  - POST /alerts/:alertId/resolve - Resolve alert');
      console.log('  - GET /alerts/stats - Alerting statistics');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();