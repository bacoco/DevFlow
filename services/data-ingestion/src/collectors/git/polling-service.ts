import axios from 'axios';
import cron from 'node-cron';
import { GitEventNormalizer } from './normalizer';
import { RepositoryConfig, CollectionResult, NormalizedGitEvent } from './types';
import { GitEventType } from '@devflow/shared-types';

export class GitPollingService {
  private repositories: Map<string, RepositoryConfig> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Add repository for polling
   */
  addRepository(config: RepositoryConfig): void {
    this.repositories.set(config.id, config);
    
    if (config.pollingEnabled) {
      this.schedulePolling(config);
    }
  }

  /**
   * Remove repository from polling
   */
  removeRepository(repositoryId: string): void {
    const job = this.scheduledJobs.get(repositoryId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(repositoryId);
    }
    this.repositories.delete(repositoryId);
  }

  /**
   * Update repository configuration
   */
  updateRepository(repositoryId: string, config: Partial<RepositoryConfig>): void {
    const existing = this.repositories.get(repositoryId);
    if (!existing) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    const updated = { ...existing, ...config };
    this.repositories.set(repositoryId, updated);

    // Reschedule if polling settings changed
    if (config.pollingEnabled !== undefined || config.pollingIntervalMinutes !== undefined) {
      const job = this.scheduledJobs.get(repositoryId);
      if (job) {
        job.stop();
        this.scheduledJobs.delete(repositoryId);
      }

      if (updated.pollingEnabled) {
        this.schedulePolling(updated);
      }
    }
  }

  /**
   * Manually poll a repository
   */
  async pollRepository(repositoryId: string): Promise<CollectionResult> {
    const config = this.repositories.get(repositoryId);
    if (!config) {
      return {
        success: false,
        events: [],
        errors: [`Repository ${repositoryId} not found`],
        metadata: {
          source: 'polling',
          repository: repositoryId,
          processedAt: new Date()
        }
      };
    }

    try {
      const events = await this.fetchRepositoryEvents(config);
      
      // Update last polled timestamp
      config.lastPolledAt = new Date();
      this.repositories.set(repositoryId, config);

      return {
        success: true,
        events,
        errors: [],
        metadata: {
          source: 'polling',
          repository: config.name,
          processedAt: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        events: [],
        errors: [`Polling error: ${error}`],
        metadata: {
          source: 'polling',
          repository: config.name,
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Get all repositories
   */
  getRepositories(): RepositoryConfig[] {
    return Array.from(this.repositories.values());
  }

  /**
   * Get repository by ID
   */
  getRepository(repositoryId: string): RepositoryConfig | undefined {
    return this.repositories.get(repositoryId);
  }

  /**
   * Schedule polling for a repository
   */
  private schedulePolling(config: RepositoryConfig): void {
    const cronExpression = `*/${config.pollingIntervalMinutes} * * * *`;
    
    const job = cron.schedule(cronExpression, async () => {
      try {
        await this.pollRepository(config.id);
      } catch (error) {
        console.error(`Error polling repository ${config.name}:`, error);
      }
    }, {
      scheduled: false
    });

    job.start();
    this.scheduledJobs.set(config.id, job);
  }

  /**
   * Fetch events from repository API
   */
  private async fetchRepositoryEvents(config: RepositoryConfig): Promise<NormalizedGitEvent[]> {
    const events: NormalizedGitEvent[] = [];
    const since = config.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours if never polled

    if (config.provider === 'github') {
      const githubEvents = await this.fetchGitHubEvents(config, since);
      events.push(...githubEvents);
    } else if (config.provider === 'gitlab') {
      const gitlabEvents = await this.fetchGitLabEvents(config, since);
      events.push(...gitlabEvents);
    }

    return events;
  }

  /**
   * Fetch events from GitHub API
   */
  private async fetchGitHubEvents(config: RepositoryConfig, since: Date): Promise<NormalizedGitEvent[]> {
    const events: NormalizedGitEvent[] = [];
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DevFlow-Intelligence'
    };

    if (config.accessToken) {
      headers['Authorization'] = `token ${config.accessToken}`;
    }

    try {
      // Fetch commits
      const commitsResponse = await axios.get(
        `https://api.github.com/repos/${config.name}/commits`,
        {
          headers,
          params: {
            since: since.toISOString(),
            per_page: 100
          }
        }
      );

      for (const commit of commitsResponse.data) {
        events.push({
          type: GitEventType.COMMIT,
          repository: config.name,
          author: commit.commit.author.name,
          timestamp: new Date(commit.commit.author.date),
          metadata: {
            commitHash: commit.sha,
            branch: 'main', // GitHub API doesn't provide branch info in commits endpoint
            filesChanged: [] // Would need additional API call to get file changes
          }
        });
      }

      // Fetch pull requests
      const prsResponse = await axios.get(
        `https://api.github.com/repos/${config.name}/pulls`,
        {
          headers,
          params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: 50
          }
        }
      );

      for (const pr of prsResponse.data) {
        const updatedAt = new Date(pr.updated_at);
        if (updatedAt >= since) {
          events.push({
            type: GitEventType.PULL_REQUEST,
            repository: config.name,
            author: pr.user.login,
            timestamp: updatedAt,
            metadata: {
              pullRequestId: pr.number.toString(),
              branch: pr.head.ref,
              reviewers: pr.requested_reviewers?.map((r: any) => r.login) || [],
              labels: pr.labels?.map((l: any) => l.name) || [],
              isMerge: pr.merged
            }
          });
        }
      }

    } catch (error) {
      console.error(`Error fetching GitHub events for ${config.name}:`, error);
      throw error;
    }

    return events;
  }

  /**
   * Fetch events from GitLab API
   */
  private async fetchGitLabEvents(config: RepositoryConfig, since: Date): Promise<NormalizedGitEvent[]> {
    const events: NormalizedGitEvent[] = [];
    const headers: any = {
      'User-Agent': 'DevFlow-Intelligence'
    };

    if (config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }

    try {
      const projectId = encodeURIComponent(config.name);

      // Fetch commits
      const commitsResponse = await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`,
        {
          headers,
          params: {
            since: since.toISOString(),
            per_page: 100
          }
        }
      );

      for (const commit of commitsResponse.data) {
        events.push({
          type: GitEventType.COMMIT,
          repository: config.name,
          author: commit.author_name,
          timestamp: new Date(commit.created_at),
          metadata: {
            commitHash: commit.id,
            branch: 'main', // GitLab API doesn't provide branch info in commits endpoint
            filesChanged: [] // Would need additional API call to get file changes
          }
        });
      }

      // Fetch merge requests
      const mrsResponse = await axios.get(
        `https://gitlab.com/api/v4/projects/${projectId}/merge_requests`,
        {
          headers,
          params: {
            state: 'all',
            order_by: 'updated_at',
            sort: 'desc',
            per_page: 50
          }
        }
      );

      for (const mr of mrsResponse.data) {
        const updatedAt = new Date(mr.updated_at);
        if (updatedAt >= since) {
          events.push({
            type: GitEventType.PULL_REQUEST,
            repository: config.name,
            author: mr.author.username,
            timestamp: updatedAt,
            metadata: {
              pullRequestId: mr.iid.toString(),
              branch: mr.source_branch,
              reviewers: mr.assignees?.map((a: any) => a.username) || [],
              labels: mr.labels || []
            }
          });
        }
      }

    } catch (error) {
      console.error(`Error fetching GitLab events for ${config.name}:`, error);
      throw error;
    }

    return events;
  }

  /**
   * Stop all polling jobs
   */
  stopAll(): void {
    for (const job of this.scheduledJobs.values()) {
      job.stop();
    }
    this.scheduledJobs.clear();
  }
}