import { GitEvent, GitEventType, GitEventMetadata } from '@devflow/shared-types';

// Raw webhook payload interfaces
export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    name: string;
    full_name: string;
    clone_url: string;
  };
  sender: {
    login: string;
    id: number;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  pull_request?: {
    id: number;
    number: number;
    title: string;
    state: string;
    user: {
      login: string;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    requested_reviewers: Array<{
      login: string;
    }>;
    labels: Array<{
      name: string;
    }>;
    merged: boolean;
  };
  ref?: string;
  ref_type?: string;
  before?: string;
  after?: string;
}

export interface GitLabWebhookPayload {
  event_type?: string;
  object_kind: string;
  project: {
    name: string;
    path_with_namespace: string;
    git_http_url: string;
  };
  user: {
    username: string;
    id: number;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  merge_request?: {
    id: number;
    iid: number;
    title: string;
    state: string;
    author: {
      username: string;
    };
    source_branch: string;
    target_branch: string;
    assignees: Array<{
      username: string;
    }>;
    labels: Array<{
      title: string;
    }>;
  };
  ref?: string;
  before?: string;
  after?: string;
}

// Normalized event interface
export interface NormalizedGitEvent {
  type: GitEventType;
  repository: string;
  author: string;
  timestamp: Date;
  metadata: GitEventMetadata;
}

// Repository configuration for polling
export interface RepositoryConfig {
  id: string;
  name: string;
  url: string;
  provider: 'github' | 'gitlab';
  accessToken?: string;
  webhookEnabled: boolean;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
  lastPolledAt?: Date;
}

// Event collection result
export interface CollectionResult {
  success: boolean;
  events: NormalizedGitEvent[];
  errors: string[];
  metadata: {
    source: 'webhook' | 'polling';
    repository: string;
    processedAt: Date;
  };
}