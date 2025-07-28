import { Router } from 'express';
import crypto from 'crypto';
import { databaseService } from '../services/database';
import { pubsub } from '../graphql/resolvers';
import winston from 'winston';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Webhook signature verification middleware
const verifyWebhookSignature = (secret: string) => (req: any, res: any, next: any) => {
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-signature-256'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
};

// GitHub webhook endpoint
router.post('/github', 
  verifyWebhookSignature(process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret'),
  async (req, res) => {
    try {
      const event = req.headers['x-github-event'];
      const payload = req.body;

      logger.info('GitHub webhook received', { event, repository: payload.repository?.name });

      switch (event) {
        case 'push':
          await handleGitHubPushEvent(payload);
          break;
        case 'pull_request':
          await handleGitHubPullRequestEvent(payload);
          break;
        case 'pull_request_review':
          await handleGitHubReviewEvent(payload);
          break;
        default:
          logger.info('Unhandled GitHub event', { event });
      }

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('GitHub webhook error', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
);

// GitLab webhook endpoint
router.post('/gitlab',
  verifyWebhookSignature(process.env.GITLAB_WEBHOOK_SECRET || 'dev-secret'),
  async (req, res) => {
    try {
      const event = req.headers['x-gitlab-event'];
      const payload = req.body;

      logger.info('GitLab webhook received', { event, project: payload.project?.name });

      switch (event) {
        case 'Push Hook':
          await handleGitLabPushEvent(payload);
          break;
        case 'Merge Request Hook':
          await handleGitLabMergeRequestEvent(payload);
          break;
        default:
          logger.info('Unhandled GitLab event', { event });
      }

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('GitLab webhook error', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
);

// Slack webhook endpoint for notifications
router.post('/slack/notifications', async (req, res) => {
  try {
    const { token, team_id, event } = req.body;

    // Verify Slack token
    if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return res.status(401).json({ error: 'Invalid Slack token' });
    }

    // Handle Slack URL verification
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    logger.info('Slack webhook received', { event: event?.type, team: team_id });

    // Process Slack events (e.g., message events for communication analysis)
    if (event?.type === 'message' && !event.bot_id) {
      await handleSlackMessageEvent(event, team_id);
    }

    res.status(200).json({ message: 'Event processed' });
  } catch (error) {
    logger.error('Slack webhook error', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Generic webhook endpoint for external systems
router.post('/external/:systemId',
  async (req, res) => {
    try {
      const { systemId } = req.params;
      const payload = req.body;

      logger.info('External webhook received', { systemId, payload });

      // Store webhook event for processing
      await databaseService.db.collection('webhook_events').insertOne({
        systemId,
        payload,
        timestamp: new Date(),
        processed: false
      });

      // Publish webhook event for real-time processing
      pubsub.publish('WEBHOOK_RECEIVED', {
        webhookReceived: {
          systemId,
          payload,
          timestamp: new Date()
        }
      });

      res.status(200).json({ 
        message: 'Webhook received and queued for processing',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('External webhook error', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
);

// Webhook status and health endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'healthy',
    endpoints: {
      github: '/api/webhooks/github',
      gitlab: '/api/webhooks/gitlab',
      slack: '/api/webhooks/slack/notifications',
      external: '/api/webhooks/external/:systemId'
    },
    security: {
      signatureVerification: 'enabled',
      supportedAlgorithms: ['sha256']
    },
    timestamp: new Date().toISOString()
  });
});

// Helper functions for processing webhook events

async function handleGitHubPushEvent(payload: any) {
  const gitEvent = {
    id: crypto.randomUUID(),
    type: 'push' as const,
    repository: payload.repository.full_name,
    author: payload.pusher.name,
    timestamp: new Date(payload.head_commit.timestamp),
    metadata: {
      commitHash: payload.head_commit.id,
      branch: payload.ref.replace('refs/heads/', ''),
      linesAdded: payload.head_commit.added?.length || 0,
      linesDeleted: payload.head_commit.removed?.length || 0,
      filesChanged: payload.head_commit.modified || []
    },
    privacyLevel: 'team' as const
  };

  await databaseService.gitEvents.insertOne(gitEvent);
  
  // Publish real-time update
  pubsub.publish('GIT_EVENT_CREATED', { gitEventCreated: gitEvent });
}

async function handleGitHubPullRequestEvent(payload: any) {
  const gitEvent = {
    id: crypto.randomUUID(),
    type: 'pull_request' as const,
    repository: payload.repository.full_name,
    author: payload.pull_request.user.login,
    timestamp: new Date(payload.pull_request.created_at),
    metadata: {
      pullRequestId: payload.pull_request.number.toString(),
      branch: payload.pull_request.head.ref,
      reviewers: payload.pull_request.requested_reviewers?.map((r: any) => r.login) || [],
      labels: payload.pull_request.labels?.map((l: any) => l.name) || []
    },
    privacyLevel: 'team' as const
  };

  await databaseService.gitEvents.insertOne(gitEvent);
  pubsub.publish('GIT_EVENT_CREATED', { gitEventCreated: gitEvent });
}

async function handleGitHubReviewEvent(payload: any) {
  // Process code review events for collaboration metrics
  logger.info('Processing GitHub review event', {
    reviewer: payload.review.user.login,
    pullRequest: payload.pull_request.number,
    state: payload.review.state
  });
}

async function handleGitLabPushEvent(payload: any) {
  const gitEvent = {
    id: crypto.randomUUID(),
    type: 'push' as const,
    repository: payload.project.path_with_namespace,
    author: payload.user_name,
    timestamp: new Date(payload.commits[0]?.timestamp || new Date()),
    metadata: {
      commitHash: payload.commits[0]?.id,
      branch: payload.ref.replace('refs/heads/', ''),
      linesAdded: payload.total_commits_count || 0,
      filesChanged: payload.commits[0]?.modified || []
    },
    privacyLevel: 'team' as const
  };

  await databaseService.gitEvents.insertOne(gitEvent);
  pubsub.publish('GIT_EVENT_CREATED', { gitEventCreated: gitEvent });
}

async function handleGitLabMergeRequestEvent(payload: any) {
  const gitEvent = {
    id: crypto.randomUUID(),
    type: 'pull_request' as const,
    repository: payload.project.path_with_namespace,
    author: payload.user.name,
    timestamp: new Date(payload.object_attributes.created_at),
    metadata: {
      pullRequestId: payload.object_attributes.iid.toString(),
      branch: payload.object_attributes.source_branch,
      isMerge: payload.object_attributes.state === 'merged'
    },
    privacyLevel: 'team' as const
  };

  await databaseService.gitEvents.insertOne(gitEvent);
  pubsub.publish('GIT_EVENT_CREATED', { gitEventCreated: gitEvent });
}

async function handleSlackMessageEvent(event: any, teamId: string) {
  // Process Slack messages for communication analysis
  logger.info('Processing Slack message event', {
    user: event.user,
    channel: event.channel,
    team: teamId
  });
  
  // Store communication data (with privacy considerations)
  // This would be processed by the communication data ingester
}

export { router as webhookRoutes };