import { GitEventType, GitEventMetadata, PrivacyLevel } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { 
  GitHubWebhookPayload, 
  GitLabWebhookPayload, 
  NormalizedGitEvent 
} from './types';

export class GitEventNormalizer {
  /**
   * Normalize GitHub webhook payload to standard GitEvent format
   */
  static normalizeGitHubWebhook(payload: GitHubWebhookPayload, eventType: string): NormalizedGitEvent[] {
    const events: NormalizedGitEvent[] = [];
    const repository = payload.repository.full_name;
    const timestamp = new Date();

    switch (eventType) {
      case 'push':
        if (payload.commits) {
          payload.commits.forEach(commit => {
            events.push({
              type: GitEventType.COMMIT,
              repository,
              author: commit.author.name,
              timestamp,
              metadata: {
                commitHash: commit.id,
                branch: payload.ref?.replace('refs/heads/', ''),
                linesAdded: commit.added.length,
                linesDeleted: commit.removed.length,
                filesChanged: [...commit.added, ...commit.removed, ...commit.modified]
              }
            });
          });

          // Add push event
          events.push({
            type: GitEventType.PUSH,
            repository,
            author: payload.sender.login,
            timestamp,
            metadata: {
              branch: payload.ref?.replace('refs/heads/', ''),
              parentCommits: [payload.before || '']
            }
          });
        }
        break;

      case 'pull_request':
        if (payload.pull_request) {
          const pr = payload.pull_request;
          events.push({
            type: GitEventType.PULL_REQUEST,
            repository,
            author: pr.user.login,
            timestamp,
            metadata: {
              pullRequestId: pr.number.toString(),
              branch: pr.head.ref,
              reviewers: pr.requested_reviewers.map(r => r.login),
              labels: pr.labels.map(l => l.name),
              isMerge: pr.merged
            }
          });
        }
        break;

      case 'create':
        if (payload.ref_type === 'branch') {
          events.push({
            type: GitEventType.BRANCH_CREATE,
            repository,
            author: payload.sender.login,
            timestamp,
            metadata: {
              branch: payload.ref
            }
          });
        }
        break;

      case 'delete':
        if (payload.ref_type === 'branch') {
          events.push({
            type: GitEventType.BRANCH_DELETE,
            repository,
            author: payload.sender.login,
            timestamp,
            metadata: {
              branch: payload.ref
            }
          });
        }
        break;
    }

    return events;
  }

  /**
   * Normalize GitLab webhook payload to standard GitEvent format
   */
  static normalizeGitLabWebhook(payload: GitLabWebhookPayload): NormalizedGitEvent[] {
    const events: NormalizedGitEvent[] = [];
    const repository = payload.project.path_with_namespace;
    const timestamp = new Date();

    switch (payload.object_kind) {
      case 'push':
        if (payload.commits) {
          payload.commits.forEach(commit => {
            events.push({
              type: GitEventType.COMMIT,
              repository,
              author: commit.author.name,
              timestamp,
              metadata: {
                commitHash: commit.id,
                branch: payload.ref?.replace('refs/heads/', ''),
                linesAdded: commit.added.length,
                linesDeleted: commit.removed.length,
                filesChanged: [...commit.added, ...commit.removed, ...commit.modified]
              }
            });
          });

          // Add push event
          events.push({
            type: GitEventType.PUSH,
            repository,
            author: payload.user.username,
            timestamp,
            metadata: {
              branch: payload.ref?.replace('refs/heads/', ''),
              parentCommits: [payload.before || '']
            }
          });
        }
        break;

      case 'merge_request':
        if (payload.merge_request) {
          const mr = payload.merge_request;
          events.push({
            type: GitEventType.PULL_REQUEST,
            repository,
            author: mr.author.username,
            timestamp,
            metadata: {
              pullRequestId: mr.iid.toString(),
              branch: mr.source_branch,
              reviewers: mr.assignees.map(a => a.username),
              labels: mr.labels.map(l => l.title)
            }
          });
        }
        break;
    }

    return events;
  }

  /**
   * Convert normalized event to full GitEvent with validation
   */
  static toGitEvent(normalizedEvent: NormalizedGitEvent): any {
    return {
      id: uuidv4(),
      type: normalizedEvent.type,
      repository: normalizedEvent.repository,
      author: normalizedEvent.author,
      timestamp: normalizedEvent.timestamp,
      metadata: normalizedEvent.metadata,
      privacyLevel: PrivacyLevel.TEAM
    };
  }

  /**
   * Validate and sanitize event data
   */
  static validateEvent(event: NormalizedGitEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.repository || event.repository.trim().length === 0) {
      errors.push('Repository name is required');
    }

    if (!event.author || event.author.trim().length === 0) {
      errors.push('Author is required');
    }

    if (!event.timestamp || isNaN(event.timestamp.getTime())) {
      errors.push('Valid timestamp is required');
    }

    if (!Object.values(GitEventType).includes(event.type)) {
      errors.push('Invalid event type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}