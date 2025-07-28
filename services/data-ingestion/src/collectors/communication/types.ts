// Communication data types and interfaces

export interface CommunicationEvent {
  id: string;
  type: 'message' | 'thread' | 'reaction' | 'mention' | 'code_review_comment';
  platform: 'slack' | 'teams' | 'github' | 'gitlab';
  timestamp: Date;
  author: string;
  content?: string;
  threadId?: string;
  channelId?: string;
  metadata: CommunicationMetadata;
}

export interface CommunicationMetadata {
  messageId?: string;
  parentMessageId?: string;
  channelName?: string;
  teamId?: string;
  reactions?: Reaction[];
  mentions?: string[];
  attachments?: Attachment[];
  codeReviewContext?: CodeReviewContext;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Attachment {
  type: 'file' | 'image' | 'link';
  name: string;
  url: string;
  size?: number;
}

export interface CodeReviewContext {
  repositoryName: string;
  pullRequestId: string;
  fileName?: string;
  lineNumber?: number;
  diffHunk?: string;
  reviewType: 'comment' | 'approval' | 'request_changes';
}

// Slack API interfaces
export interface SlackMessage {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
  files?: Array<{
    name: string;
    url_private: string;
    size: number;
    mimetype: string;
  }>;
}

export interface SlackEvent {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackMessage;
  type: string;
  event_id: string;
  event_time: number;
}

// Microsoft Teams interfaces
export interface TeamsMessage {
  id: string;
  messageType: string;
  createdDateTime: string;
  from: {
    user: {
      id: string;
      displayName: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  channelIdentity: {
    teamId: string;
    channelId: string;
  };
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user: {
        id: string;
        displayName: string;
      };
    };
  }>;
  attachments?: Array<{
    id: string;
    contentType: string;
    name: string;
    contentUrl: string;
  }>;
}

export interface TeamsWebhookPayload {
  subscriptionId: string;
  changeType: string;
  resource: string;
  resourceData: TeamsMessage;
}

// GitHub/GitLab code review interfaces
export interface GitHubReviewComment {
  id: number;
  user: {
    login: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  path: string;
  position?: number;
  line?: number;
  pull_request_review_id: number;
  diff_hunk: string;
  in_reply_to_id?: number;
}

export interface GitLabReviewComment {
  id: number;
  author: {
    username: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  position?: {
    new_path: string;
    new_line: number;
    old_path: string;
    old_line: number;
  };
  resolvable: boolean;
  resolved: boolean;
}

// Collection configuration
export interface CommunicationConfig {
  slack?: {
    enabled: boolean;
    botToken: string;
    signingSecret: string;
    channels: string[];
  };
  teams?: {
    enabled: boolean;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    webhookUrl: string;
  };
  github?: {
    enabled: boolean;
    accessToken: string;
    repositories: string[];
  };
  gitlab?: {
    enabled: boolean;
    accessToken: string;
    repositories: string[];
  };
}

// Collection result
export interface CommunicationCollectionResult {
  success: boolean;
  eventsCollected: number;
  errors: string[];
  metadata: {
    platform: string;
    source: string;
    processedAt: Date;
  };
}