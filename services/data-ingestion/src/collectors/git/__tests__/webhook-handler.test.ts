import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { WebhookHandler } from '../webhook-handler';
import { GitHubWebhookPayload, GitLabWebhookPayload } from '../types';

describe('WebhookHandler', () => {
  let app: express.Application;
  let webhookHandler: WebhookHandler;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    webhookHandler = new WebhookHandler('github-secret', 'gitlab-secret');
    
    // Add error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
      if (error instanceof SyntaxError) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  describe('GitHub webhook handling', () => {
    it('should process valid GitHub push webhook', async () => {
      const payload: GitHubWebhookPayload = {
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          clone_url: 'https://github.com/user/test-repo.git'
        },
        sender: {
          login: 'testuser',
          id: 123
        },
        commits: [
          {
            id: 'abc123',
            message: 'Test commit',
            author: {
              name: 'Test User',
              email: 'test@example.com'
            },
            added: ['file1.js'],
            removed: [],
            modified: []
          }
        ],
        ref: 'refs/heads/main'
      };

      const signature = crypto
        .createHmac('sha256', 'github-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      app.post('/webhook/github', async (req, res) => {
        const result = await webhookHandler.handleGitHubWebhook(req, res);
        // Additional assertions can be made on result if needed
      });

      const response = await request(app)
        .post('/webhook/github')
        .set('x-github-event', 'push')
        .set('x-hub-signature-256', `sha256=${signature}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
      expect(response.body.eventsProcessed).toBeGreaterThan(0);
    });

    it('should reject GitHub webhook with invalid signature', async () => {
      const payload: GitHubWebhookPayload = {
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          clone_url: 'https://github.com/user/test-repo.git'
        },
        sender: {
          login: 'testuser',
          id: 123
        }
      };

      app.post('/webhook/github', async (req, res) => {
        try {
          await webhookHandler.handleGitHubWebhook(req, res);
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      const response = await request(app)
        .post('/webhook/github')
        .set('x-github-event', 'push')
        .set('x-hub-signature-256', 'sha256=invalid-signature')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should process GitHub pull request webhook', async () => {
      const payload: GitHubWebhookPayload = {
        action: 'opened',
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          clone_url: 'https://github.com/user/test-repo.git'
        },
        sender: {
          login: 'testuser',
          id: 123
        },
        pull_request: {
          id: 1,
          number: 42,
          title: 'Test PR',
          state: 'open',
          user: {
            login: 'prauthor'
          },
          head: {
            ref: 'feature-branch',
            sha: 'abc123'
          },
          base: {
            ref: 'main'
          },
          requested_reviewers: [],
          labels: [],
          merged: false
        }
      };

      const signature = crypto
        .createHmac('sha256', 'github-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      app.post('/webhook/github', async (req, res) => {
        await webhookHandler.handleGitHubWebhook(req, res);
      });

      const response = await request(app)
        .post('/webhook/github')
        .set('x-github-event', 'pull_request')
        .set('x-hub-signature-256', `sha256=${signature}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
    });
  });

  describe('GitLab webhook handling', () => {
    it('should process valid GitLab push webhook', async () => {
      const payload: GitLabWebhookPayload = {
        object_kind: 'push',
        project: {
          name: 'test-repo',
          path_with_namespace: 'user/test-repo',
          git_http_url: 'https://gitlab.com/user/test-repo.git'
        },
        user: {
          username: 'testuser',
          id: 123
        },
        commits: [
          {
            id: 'abc123',
            message: 'Test commit',
            author: {
              name: 'Test User',
              email: 'test@example.com'
            },
            added: ['file1.js'],
            removed: [],
            modified: []
          }
        ],
        ref: 'refs/heads/main'
      };

      app.post('/webhook/gitlab', async (req, res) => {
        await webhookHandler.handleGitLabWebhook(req, res);
      });

      const response = await request(app)
        .post('/webhook/gitlab')
        .set('x-gitlab-token', 'gitlab-secret')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
    });

    it('should reject GitLab webhook with invalid token', async () => {
      const payload: GitLabWebhookPayload = {
        object_kind: 'push',
        project: {
          name: 'test-repo',
          path_with_namespace: 'user/test-repo',
          git_http_url: 'https://gitlab.com/user/test-repo.git'
        },
        user: {
          username: 'testuser',
          id: 123
        }
      };

      app.post('/webhook/gitlab', async (req, res) => {
        await webhookHandler.handleGitLabWebhook(req, res);
      });

      const response = await request(app)
        .post('/webhook/gitlab')
        .set('x-gitlab-token', 'invalid-token')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should process GitLab merge request webhook', async () => {
      const payload: GitLabWebhookPayload = {
        object_kind: 'merge_request',
        project: {
          name: 'test-repo',
          path_with_namespace: 'user/test-repo',
          git_http_url: 'https://gitlab.com/user/test-repo.git'
        },
        user: {
          username: 'testuser',
          id: 123
        },
        merge_request: {
          id: 1,
          iid: 42,
          title: 'Test MR',
          state: 'opened',
          author: {
            username: 'mrauthor'
          },
          source_branch: 'feature-branch',
          target_branch: 'main',
          assignees: [],
          labels: []
        }
      };

      app.post('/webhook/gitlab', async (req, res) => {
        await webhookHandler.handleGitLabWebhook(req, res);
      });

      const response = await request(app)
        .post('/webhook/gitlab')
        .set('x-gitlab-token', 'gitlab-secret')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON payload', async () => {
      app.post('/webhook/github', async (req, res) => {
        try {
          await webhookHandler.handleGitHubWebhook(req, res);
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      const response = await request(app)
        .post('/webhook/github')
        .set('x-github-event', 'push')
        .set('x-hub-signature-256', 'sha256=invalid')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400); // Express will handle malformed JSON
    });

    it('should handle missing headers', async () => {
      const payload = {
        repository: {
          name: 'test-repo',
          full_name: 'user/test-repo',
          clone_url: 'https://github.com/user/test-repo.git'
        },
        sender: {
          login: 'testuser',
          id: 123
        }
      };

      app.post('/webhook/github', async (req, res) => {
        await webhookHandler.handleGitHubWebhook(req, res);
      });

      const response = await request(app)
        .post('/webhook/github')
        .send(payload);

      expect(response.status).toBe(401);
    });
  });
});