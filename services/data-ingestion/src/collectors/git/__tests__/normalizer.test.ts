import { GitEventNormalizer } from '../normalizer';
import { GitEventType } from '@devflow/shared-types';
import { GitHubWebhookPayload, GitLabWebhookPayload } from '../types';

describe('GitEventNormalizer', () => {
  describe('normalizeGitHubWebhook', () => {
    it('should normalize GitHub push webhook', () => {
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
            removed: ['file2.js'],
            modified: ['file3.js']
          }
        ],
        ref: 'refs/heads/main',
        before: 'def456',
        after: 'abc123'
      };

      const events = GitEventNormalizer.normalizeGitHubWebhook(payload, 'push');

      expect(events).toHaveLength(2); // commit + push events
      
      const commitEvent = events.find(e => e.type === GitEventType.COMMIT);
      expect(commitEvent).toBeDefined();
      expect(commitEvent?.repository).toBe('user/test-repo');
      expect(commitEvent?.author).toBe('Test User');
      expect(commitEvent?.metadata.commitHash).toBe('abc123');
      expect(commitEvent?.metadata.branch).toBe('main');
      expect(commitEvent?.metadata.filesChanged).toEqual(['file1.js', 'file2.js', 'file3.js']);

      const pushEvent = events.find(e => e.type === GitEventType.PUSH);
      expect(pushEvent).toBeDefined();
      expect(pushEvent?.repository).toBe('user/test-repo');
      expect(pushEvent?.author).toBe('testuser');
      expect(pushEvent?.metadata.branch).toBe('main');
    });

    it('should normalize GitHub pull request webhook', () => {
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
          requested_reviewers: [
            { login: 'reviewer1' },
            { login: 'reviewer2' }
          ],
          labels: [
            { name: 'bug' },
            { name: 'urgent' }
          ],
          merged: false
        }
      };

      const events = GitEventNormalizer.normalizeGitHubWebhook(payload, 'pull_request');

      expect(events).toHaveLength(1);
      
      const prEvent = events[0];
      expect(prEvent.type).toBe(GitEventType.PULL_REQUEST);
      expect(prEvent.repository).toBe('user/test-repo');
      expect(prEvent.author).toBe('prauthor');
      expect(prEvent.metadata.pullRequestId).toBe('42');
      expect(prEvent.metadata.branch).toBe('feature-branch');
      expect(prEvent.metadata.reviewers).toEqual(['reviewer1', 'reviewer2']);
      expect(prEvent.metadata.labels).toEqual(['bug', 'urgent']);
      expect(prEvent.metadata.isMerge).toBe(false);
    });

    it('should normalize GitHub branch create webhook', () => {
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
        ref: 'feature-branch',
        ref_type: 'branch'
      };

      const events = GitEventNormalizer.normalizeGitHubWebhook(payload, 'create');

      expect(events).toHaveLength(1);
      
      const branchEvent = events[0];
      expect(branchEvent.type).toBe(GitEventType.BRANCH_CREATE);
      expect(branchEvent.repository).toBe('user/test-repo');
      expect(branchEvent.author).toBe('testuser');
      expect(branchEvent.metadata.branch).toBe('feature-branch');
    });
  });

  describe('normalizeGitLabWebhook', () => {
    it('should normalize GitLab push webhook', () => {
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
            removed: ['file2.js'],
            modified: ['file3.js']
          }
        ],
        ref: 'refs/heads/main',
        before: 'def456',
        after: 'abc123'
      };

      const events = GitEventNormalizer.normalizeGitLabWebhook(payload);

      expect(events).toHaveLength(2); // commit + push events
      
      const commitEvent = events.find(e => e.type === GitEventType.COMMIT);
      expect(commitEvent).toBeDefined();
      expect(commitEvent?.repository).toBe('user/test-repo');
      expect(commitEvent?.author).toBe('Test User');
      expect(commitEvent?.metadata.commitHash).toBe('abc123');
      expect(commitEvent?.metadata.branch).toBe('main');

      const pushEvent = events.find(e => e.type === GitEventType.PUSH);
      expect(pushEvent).toBeDefined();
      expect(pushEvent?.repository).toBe('user/test-repo');
      expect(pushEvent?.author).toBe('testuser');
    });

    it('should normalize GitLab merge request webhook', () => {
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
          assignees: [
            { username: 'assignee1' },
            { username: 'assignee2' }
          ],
          labels: [
            { title: 'bug' },
            { title: 'urgent' }
          ]
        }
      };

      const events = GitEventNormalizer.normalizeGitLabWebhook(payload);

      expect(events).toHaveLength(1);
      
      const mrEvent = events[0];
      expect(mrEvent.type).toBe(GitEventType.PULL_REQUEST);
      expect(mrEvent.repository).toBe('user/test-repo');
      expect(mrEvent.author).toBe('mrauthor');
      expect(mrEvent.metadata.pullRequestId).toBe('42');
      expect(mrEvent.metadata.branch).toBe('feature-branch');
      expect(mrEvent.metadata.reviewers).toEqual(['assignee1', 'assignee2']);
      expect(mrEvent.metadata.labels).toEqual(['bug', 'urgent']);
    });
  });

  describe('validateEvent', () => {
    it('should validate correct event', () => {
      const event = {
        type: GitEventType.COMMIT,
        repository: 'user/test-repo',
        author: 'Test User',
        timestamp: new Date(),
        metadata: {
          commitHash: 'abc123'
        }
      };

      const result = GitEventNormalizer.validateEvent(event);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject event with missing repository', () => {
      const event = {
        type: GitEventType.COMMIT,
        repository: '',
        author: 'Test User',
        timestamp: new Date(),
        metadata: {}
      };

      const result = GitEventNormalizer.validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository name is required');
    });

    it('should reject event with missing author', () => {
      const event = {
        type: GitEventType.COMMIT,
        repository: 'user/test-repo',
        author: '',
        timestamp: new Date(),
        metadata: {}
      };

      const result = GitEventNormalizer.validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Author is required');
    });

    it('should reject event with invalid timestamp', () => {
      const event = {
        type: GitEventType.COMMIT,
        repository: 'user/test-repo',
        author: 'Test User',
        timestamp: new Date('invalid'),
        metadata: {}
      };

      const result = GitEventNormalizer.validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid timestamp is required');
    });

    it('should reject event with invalid type', () => {
      const event = {
        type: 'invalid_type' as any,
        repository: 'user/test-repo',
        author: 'Test User',
        timestamp: new Date(),
        metadata: {}
      };

      const result = GitEventNormalizer.validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid event type');
    });
  });
});