import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  CommunicationEvent,
  GitHubReviewComment,
  GitLabReviewComment,
  CommunicationConfig,
  CommunicationCollectionResult
} from './types';

export class CodeReviewExtractor {
  private githubConfig?: CommunicationConfig['github'];
  private gitlabConfig?: CommunicationConfig['gitlab'];

  constructor(config: { github?: CommunicationConfig['github']; gitlab?: CommunicationConfig['gitlab'] }) {
    this.githubConfig = config.github;
    this.gitlabConfig = config.gitlab;
  }

  /**
   * Extract code review comments from GitHub
   */
  async extractGitHubReviewComments(repository: string, pullRequestNumber: number): Promise<CommunicationEvent[]> {
    if (!this.githubConfig?.enabled || !this.githubConfig.accessToken) {
      throw new Error('GitHub integration not configured');
    }

    try {
      const events: CommunicationEvent[] = [];

      // Fetch review comments
      const reviewCommentsResponse = await axios.get(
        `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}/comments`,
        {
          headers: {
            'Authorization': `token ${this.githubConfig.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      for (const comment of reviewCommentsResponse.data) {
        const event = this.convertGitHubReviewComment(comment, repository, pullRequestNumber.toString());
        events.push(event);
      }

      // Fetch general PR comments
      const issueCommentsResponse = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${pullRequestNumber}/comments`,
        {
          headers: {
            'Authorization': `token ${this.githubConfig.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      for (const comment of issueCommentsResponse.data) {
        const event = this.convertGitHubIssueComment(comment, repository, pullRequestNumber.toString());
        events.push(event);
      }

      return events;

    } catch (error) {
      console.error('Error extracting GitHub review comments:', error);
      throw error;
    }
  }

  /**
   * Extract code review comments from GitLab
   */
  async extractGitLabReviewComments(projectId: string, mergeRequestIid: number): Promise<CommunicationEvent[]> {
    if (!this.gitlabConfig?.enabled || !this.gitlabConfig.accessToken) {
      throw new Error('GitLab integration not configured');
    }

    try {
      const events: CommunicationEvent[] = [];

      // Fetch merge request discussions
      const discussionsResponse = await axios.get(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/discussions`,
        {
          headers: {
            'Authorization': `Bearer ${this.gitlabConfig.accessToken}`
          }
        }
      );

      for (const discussion of discussionsResponse.data) {
        for (const note of discussion.notes) {
          if (note.type === 'DiffNote' || note.system === false) {
            const event = this.convertGitLabNote(note, projectId, mergeRequestIid.toString(), discussion.id);
            events.push(event);
          }
        }
      }

      return events;

    } catch (error) {
      console.error('Error extracting GitLab review comments:', error);
      throw error;
    }
  }

  /**
   * Extract all review comments for repositories
   */
  async extractAllReviewComments(since?: Date): Promise<CommunicationCollectionResult> {
    const allEvents: CommunicationEvent[] = [];
    const errors: string[] = [];

    try {
      // Extract from GitHub repositories
      if (this.githubConfig?.enabled && this.githubConfig.repositories) {
        for (const repo of this.githubConfig.repositories) {
          try {
            const repoEvents = await this.extractGitHubRepositoryComments(repo, since);
            allEvents.push(...repoEvents);
          } catch (error) {
            errors.push(`GitHub ${repo}: ${error}`);
          }
        }
      }

      // Extract from GitLab repositories
      if (this.gitlabConfig?.enabled && this.gitlabConfig.repositories) {
        for (const repo of this.gitlabConfig.repositories) {
          try {
            const repoEvents = await this.extractGitLabRepositoryComments(repo, since);
            allEvents.push(...repoEvents);
          } catch (error) {
            errors.push(`GitLab ${repo}: ${error}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        eventsCollected: allEvents.length,
        errors,
        metadata: {
          platform: 'code_review',
          source: 'api',
          processedAt: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        eventsCollected: 0,
        errors: [`Extraction failed: ${error}`],
        metadata: {
          platform: 'code_review',
          source: 'api',
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Extract comments from all recent pull requests in a GitHub repository
   */
  private async extractGitHubRepositoryComments(repository: string, since?: Date): Promise<CommunicationEvent[]> {
    const events: CommunicationEvent[] = [];
    
    // Get recent pull requests
    const sinceParam = since ? `&since=${since.toISOString()}` : '';
    const prsResponse = await axios.get(
      `https://api.github.com/repos/${repository}/pulls?state=all&sort=updated&direction=desc&per_page=50${sinceParam}`,
      {
        headers: {
          'Authorization': `token ${this.githubConfig!.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    // Extract comments from each PR
    for (const pr of prsResponse.data) {
      const prEvents = await this.extractGitHubReviewComments(repository, pr.number);
      events.push(...prEvents);
    }

    return events;
  }

  /**
   * Extract comments from all recent merge requests in a GitLab repository
   */
  private async extractGitLabRepositoryComments(projectId: string, since?: Date): Promise<CommunicationEvent[]> {
    const events: CommunicationEvent[] = [];
    
    // Get recent merge requests
    const sinceParam = since ? `&updated_after=${since.toISOString()}` : '';
    const mrsResponse = await axios.get(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests?state=all&order_by=updated_at&sort=desc&per_page=50${sinceParam}`,
      {
        headers: {
          'Authorization': `Bearer ${this.gitlabConfig!.accessToken}`
        }
      }
    );

    // Extract comments from each MR
    for (const mr of mrsResponse.data) {
      const mrEvents = await this.extractGitLabReviewComments(projectId, mr.iid);
      events.push(...mrEvents);
    }

    return events;
  }

  /**
   * Convert GitHub review comment to CommunicationEvent
   */
  private convertGitHubReviewComment(comment: GitHubReviewComment, repository: string, pullRequestId: string): CommunicationEvent {
    return {
      id: uuidv4(),
      type: 'code_review_comment',
      platform: 'github',
      timestamp: new Date(comment.created_at),
      author: comment.user.login,
      content: comment.body,
      metadata: {
        messageId: comment.id.toString(),
        parentMessageId: comment.in_reply_to_id?.toString(),
        codeReviewContext: {
          repositoryName: repository,
          pullRequestId,
          fileName: comment.path,
          lineNumber: comment.line || comment.position,
          diffHunk: comment.diff_hunk,
          reviewType: 'comment'
        }
      }
    };
  }

  /**
   * Convert GitHub issue comment to CommunicationEvent
   */
  private convertGitHubIssueComment(comment: any, repository: string, pullRequestId: string): CommunicationEvent {
    return {
      id: uuidv4(),
      type: 'code_review_comment',
      platform: 'github',
      timestamp: new Date(comment.created_at),
      author: comment.user.login,
      content: comment.body,
      metadata: {
        messageId: comment.id.toString(),
        codeReviewContext: {
          repositoryName: repository,
          pullRequestId,
          reviewType: 'comment'
        }
      }
    };
  }

  /**
   * Convert GitLab note to CommunicationEvent
   */
  private convertGitLabNote(note: any, projectId: string, mergeRequestId: string, discussionId: string): CommunicationEvent {
    return {
      id: uuidv4(),
      type: 'code_review_comment',
      platform: 'gitlab',
      timestamp: new Date(note.created_at),
      author: note.author.username,
      content: note.body,
      threadId: discussionId,
      metadata: {
        messageId: note.id.toString(),
        codeReviewContext: {
          repositoryName: projectId,
          pullRequestId: mergeRequestId,
          fileName: note.position?.new_path,
          lineNumber: note.position?.new_line,
          reviewType: note.resolvable ? 'comment' : 'comment'
        }
      }
    };
  }
}