import axios from 'axios';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  CommunicationEvent,
  SlackEvent,
  SlackMessage,
  CommunicationConfig,
  CommunicationCollectionResult
} from './types';

export class SlackCollector {
  private config: CommunicationConfig['slack'];

  constructor(config: CommunicationConfig['slack']) {
    this.config = config;
  }

  /**
   * Handle Slack event webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<CommunicationCollectionResult> {
    try {
      // Verify Slack signature
      if (!this.verifySlackSignature(req)) {
        res.status(401).json({ error: 'Invalid signature' });
        return {
          success: false,
          eventsCollected: 0,
          errors: ['Invalid webhook signature'],
          metadata: {
            platform: 'slack',
            source: 'webhook',
            processedAt: new Date()
          }
        };
      }

      const payload = req.body;

      // Handle URL verification challenge
      if (payload.type === 'url_verification') {
        res.json({ challenge: payload.challenge });
        return {
          success: true,
          eventsCollected: 0,
          errors: [],
          metadata: {
            platform: 'slack',
            source: 'webhook',
            processedAt: new Date()
          }
        };
      }

      // Process event
      if (payload.type === 'event_callback') {
        const slackEvent = payload as SlackEvent;
        const events = await this.processSlackEvent(slackEvent);
        
        res.status(200).json({ 
          message: 'Event processed successfully',
          eventsProcessed: events.length
        });

        return {
          success: true,
          eventsCollected: events.length,
          errors: [],
          metadata: {
            platform: 'slack',
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
          platform: 'slack',
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
          platform: 'slack',
          source: 'webhook',
          processedAt: new Date()
        }
      };
    }
  }

  /**
   * Fetch messages from Slack channels
   */
  async fetchChannelMessages(channelId: string, since?: Date): Promise<CommunicationEvent[]> {
    if (!this.config?.enabled || !this.config.botToken) {
      throw new Error('Slack integration not configured');
    }

    try {
      const oldest = since ? Math.floor(since.getTime() / 1000).toString() : undefined;
      
      const response = await axios.get('https://slack.com/api/conversations.history', {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          channel: channelId,
          oldest,
          limit: 100
        }
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const events: CommunicationEvent[] = [];
      for (const message of response.data.messages) {
        const event = this.convertSlackMessage(message, channelId);
        if (event) {
          events.push(event);
        }
      }

      return events;

    } catch (error) {
      console.error('Error fetching Slack messages:', error);
      throw error;
    }
  }

  /**
   * Fetch thread messages
   */
  async fetchThreadMessages(channelId: string, threadTs: string): Promise<CommunicationEvent[]> {
    if (!this.config?.enabled || !this.config.botToken) {
      throw new Error('Slack integration not configured');
    }

    try {
      const response = await axios.get('https://slack.com/api/conversations.replies', {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          channel: channelId,
          ts: threadTs
        }
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const events: CommunicationEvent[] = [];
      for (const message of response.data.messages) {
        const event = this.convertSlackMessage(message, channelId);
        if (event) {
          events.push(event);
        }
      }

      return events;

    } catch (error) {
      console.error('Error fetching Slack thread messages:', error);
      throw error;
    }
  }

  /**
   * Process Slack event from webhook
   */
  private async processSlackEvent(slackEvent: SlackEvent): Promise<CommunicationEvent[]> {
    const events: CommunicationEvent[] = [];

    if (slackEvent.event.type === 'message') {
      const event = this.convertSlackMessage(slackEvent.event, slackEvent.event.channel);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Convert Slack message to CommunicationEvent
   */
  private convertSlackMessage(message: SlackMessage, channelId: string): CommunicationEvent | null {
    // Skip bot messages and system messages
    if (message.user === 'USLACKBOT' || message.type !== 'message') {
      return null;
    }

    const event: CommunicationEvent = {
      id: uuidv4(),
      type: message.thread_ts ? 'thread' : 'message',
      platform: 'slack',
      timestamp: new Date(parseFloat(message.ts) * 1000),
      author: message.user,
      content: message.text,
      threadId: message.thread_ts,
      channelId,
      metadata: {
        messageId: message.ts,
        parentMessageId: message.thread_ts,
        reactions: message.reactions?.map(reaction => ({
          emoji: reaction.name,
          count: reaction.count,
          users: reaction.users
        })),
        mentions: this.extractMentions(message.text),
        attachments: message.files?.map(file => ({
          type: this.getAttachmentType(file.mimetype),
          name: file.name,
          url: file.url_private,
          size: file.size
        }))
      }
    };

    return event;
  }

  /**
   * Extract mentions from message text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Get attachment type from MIME type
   */
  private getAttachmentType(mimetype: string): 'file' | 'image' | 'link' {
    if (mimetype.startsWith('image/')) {
      return 'image';
    }
    return 'file';
  }

  /**
   * Verify Slack webhook signature
   */
  private verifySlackSignature(req: Request): boolean {
    if (!this.config?.signingSecret) {
      return true; // Skip verification if no secret configured
    }

    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp) {
      return false;
    }

    try {
      // Check timestamp to prevent replay attacks
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        return false; // Request is older than 5 minutes
      }

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(req.body)}`;
      const expectedSignature = 'v0=' + crypto
        .createHmac('sha256', this.config.signingSecret)
        .update(sigBasestring)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }
}