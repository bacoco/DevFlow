import axios from 'axios';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  CommunicationEvent,
  TeamsWebhookPayload,
  TeamsMessage,
  CommunicationConfig,
  CommunicationCollectionResult
} from './types';

export class TeamsCollector {
  private config: CommunicationConfig['teams'];
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: CommunicationConfig['teams']) {
    this.config = config;
  }

  /**
   * Handle Microsoft Teams webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<CommunicationCollectionResult> {
    try {
      // Validate webhook payload
      if (!this.validateWebhookPayload(req)) {
        res.status(401).json({ error: 'Invalid webhook payload' });
        return {
          success: false,
          eventsCollected: 0,
          errors: ['Invalid webhook payload'],
          metadata: {
            platform: 'teams',
            source: 'webhook',
            processedAt: new Date()
          }
        };
      }

      const payload = req.body as TeamsWebhookPayload;

      // Handle subscription validation
      if (req.query.validationToken) {
        res.status(200).send(req.query.validationToken);
        return {
          success: true,
          eventsCollected: 0,
          errors: [],
          metadata: {
            platform: 'teams',
            source: 'webhook',
            processedAt: new Date()
          }
        };
      }

      // Process message event
      if (payload.changeType === 'created' && payload.resourceData) {
        const event = this.convertTeamsMessage(payload.resourceData);
        
        res.status(200).json({ 
          message: 'Event processed successfully',
          eventsProcessed: event ? 1 : 0
        });

        return {
          success: true,
          eventsCollected: event ? 1 : 0,
          errors: [],
          metadata: {
            platform: 'teams',
            source: 'webhook',
            processedAt: new Date()
          }
        };
      }

      res.status(200).json({ message: 'Event ignored' });
      return {
        success: true,
        eventsCollected: 0,
        errors: [],
        metadata: {
          platform: 'teams',
          source: 'webhook',
          processedAt: new Date()
        }
      };

    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
      return {
        success: false,
        eventsCollected: 0,
        errors: [`Processing error: ${error}`],
        metadata: {
          platform: 'teams',
          source: 'webhook',
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Fetch messages from Teams channel using Graph API
   */
  async fetchChannelMessages(teamId: string, channelId: string, since?: Date): Promise<CommunicationEvent[]> {
    if (!this.config?.enabled) {
      throw new Error('Teams integration not configured');
    }

    try {
      await this.ensureAccessToken();

      const sinceFilter = since ? `&$filter=createdDateTime gt ${since.toISOString()}` : '';
      const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50${sinceFilter}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const events: CommunicationEvent[] = [];
      for (const message of response.data.value) {
        const event = this.convertTeamsMessage(message);
        if (event) {
          events.push(event);
        }
      }

      return events;

    } catch (error) {
      console.error('Error fetching Teams messages:', error);
      throw error;
    }
  }

  /**
   * Fetch replies to a message
   */
  async fetchMessageReplies(teamId: string, channelId: string, messageId: string): Promise<CommunicationEvent[]> {
    if (!this.config?.enabled) {
      throw new Error('Teams integration not configured');
    }

    try {
      await this.ensureAccessToken();

      const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const events: CommunicationEvent[] = [];
      for (const reply of response.data.value) {
        const event = this.convertTeamsMessage(reply, messageId);
        if (event) {
          events.push(event);
        }
      }

      return events;

    } catch (error) {
      console.error('Error fetching Teams message replies:', error);
      throw error;
    }
  }

  /**
   * Convert Teams message to CommunicationEvent
   */
  private convertTeamsMessage(message: TeamsMessage, parentMessageId?: string): CommunicationEvent | null {
    // Skip system messages
    if (message.messageType !== 'message') {
      return null;
    }

    const event: CommunicationEvent = {
      id: uuidv4(),
      type: parentMessageId ? 'thread' : 'message',
      platform: 'teams',
      timestamp: new Date(message.createdDateTime),
      author: message.from.user.displayName,
      content: this.extractTextContent(message.body.content),
      threadId: parentMessageId,
      channelId: message.channelIdentity.channelId,
      metadata: {
        messageId: message.id,
        parentMessageId,
        teamId: message.channelIdentity.teamId,
        mentions: message.mentions?.map(mention => mention.mentioned.user.displayName),
        attachments: message.attachments?.map(attachment => ({
          type: this.getAttachmentType(attachment.contentType),
          name: attachment.name,
          url: attachment.contentUrl
        }))
      }
    };

    return event;
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextContent(htmlContent: string): string {
    // Simple HTML tag removal - in production, use a proper HTML parser
    return htmlContent.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Get attachment type from content type
   */
  private getAttachmentType(contentType: string): 'file' | 'image' | 'link' {
    if (contentType.startsWith('image/')) {
      return 'image';
    }
    if (contentType === 'reference') {
      return 'link';
    }
    return 'file';
  }

  /**
   * Validate webhook payload
   */
  private validateWebhookPayload(req: Request): boolean {
    // Basic validation - in production, implement proper signature verification
    const payload = req.body;
    return payload && (payload.subscriptionId || req.query.validationToken);
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return; // Token is still valid
    }

    if (!this.config?.clientId || !this.config?.clientSecret || !this.config?.tenantId) {
      throw new Error('Teams OAuth configuration missing');
    }

    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // Refresh 1 minute early

    } catch (error) {
      console.error('Error obtaining Teams access token:', error);
      throw new Error('Failed to obtain Teams access token');
    }
  }
}