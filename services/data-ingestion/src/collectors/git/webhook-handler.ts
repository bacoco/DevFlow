import { Request, Response } from 'express';
import crypto from 'crypto';
import { GitEventNormalizer } from './normalizer';
import { GitHubWebhookPayload, GitLabWebhookPayload, CollectionResult } from './types';
import { validateGitEvent } from '@devflow/shared-types';

export class WebhookHandler {
  private readonly githubSecret: string;
  private readonly gitlabSecret: string;

  constructor(githubSecret?: string, gitlabSecret?: string) {
    this.githubSecret = githubSecret || process.env.GITHUB_WEBHOOK_SECRET || '';
    this.gitlabSecret = gitlabSecret || process.env.GITLAB_WEBHOOK_SECRET || '';
  }

  /**
   * Handle GitHub webhook requests
   */
  async handleGitHubWebhook(req: Request, res: Response): Promise<CollectionResult> {
    try {
      // Verify webhook signature
      if (!this.verifyGitHubSignature(req)) {
        res.status(401).json({ error: 'Invalid signature' });
        return {
          success: false,
          events: [],
          errors: ['Invalid webhook signature'],
          metadata: {
            source: 'webhook',
            repository: 'unknown',
            processedAt: new Date()
          }
        };
      }

      const eventType = req.headers['x-github-event'] as string;
      const payload = req.body as GitHubWebhookPayload;

      // Normalize events
      const normalizedEvents = GitEventNormalizer.normalizeGitHubWebhook(payload, eventType);
      const validEvents = [];
      const errors = [];

      // Validate each event
      for (const event of normalizedEvents) {
        const validation = GitEventNormalizer.validateEvent(event);
        if (validation.valid) {
          const gitEvent = GitEventNormalizer.toGitEvent(event);
          try {
            validateGitEvent(gitEvent);
            validEvents.push(event);
          } catch (validationError) {
            errors.push(`Validation failed: ${validationError}`);
          }
        } else {
          errors.push(...validation.errors);
        }
      }

      res.status(200).json({ 
        message: 'Webhook processed successfully',
        eventsProcessed: validEvents.length,
        errors: errors.length
      });

      return {
        success: true,
        events: validEvents,
        errors,
        metadata: {
          source: 'webhook',
          repository: payload.repository?.full_name || 'unknown',
          processedAt: new Date()
        }
      };

    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
      return {
        success: false,
        events: [],
        errors: [`Processing error: ${error}`],
        metadata: {
          source: 'webhook',
          repository: 'unknown',
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Handle GitLab webhook requests
   */
  async handleGitLabWebhook(req: Request, res: Response): Promise<CollectionResult> {
    try {
      // Verify webhook token
      if (!this.verifyGitLabToken(req)) {
        res.status(401).json({ error: 'Invalid token' });
        return {
          success: false,
          events: [],
          errors: ['Invalid webhook token'],
          metadata: {
            source: 'webhook',
            repository: 'unknown',
            processedAt: new Date()
          }
        };
      }

      const payload = req.body as GitLabWebhookPayload;

      // Normalize events
      const normalizedEvents = GitEventNormalizer.normalizeGitLabWebhook(payload);
      const validEvents = [];
      const errors = [];

      // Validate each event
      for (const event of normalizedEvents) {
        const validation = GitEventNormalizer.validateEvent(event);
        if (validation.valid) {
          const gitEvent = GitEventNormalizer.toGitEvent(event);
          try {
            validateGitEvent(gitEvent);
            validEvents.push(event);
          } catch (validationError) {
            errors.push(`Validation failed: ${validationError}`);
          }
        } else {
          errors.push(...validation.errors);
        }
      }

      res.status(200).json({ 
        message: 'Webhook processed successfully',
        eventsProcessed: validEvents.length,
        errors: errors.length
      });

      return {
        success: true,
        events: validEvents,
        errors,
        metadata: {
          source: 'webhook',
          repository: payload.project?.path_with_namespace || 'unknown',
          processedAt: new Date()
        }
      };

    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
      return {
        success: false,
        events: [],
        errors: [`Processing error: ${error}`],
        metadata: {
          source: 'webhook',
          repository: 'unknown',
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Verify GitHub webhook signature
   */
  private verifyGitHubSignature(req: Request): boolean {
    if (!this.githubSecret) {
      return true; // Skip verification if no secret configured
    }

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.githubSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignatureWithPrefix)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify GitLab webhook token
   */
  private verifyGitLabToken(req: Request): boolean {
    if (!this.gitlabSecret) {
      return true; // Skip verification if no secret configured
    }

    const token = req.headers['x-gitlab-token'] as string;
    return token === this.gitlabSecret;
  }
}