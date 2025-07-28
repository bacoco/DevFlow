import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { SlackCollector } from '../slack-collector';
import { SlackEvent } from '../types';

describe('SlackCollector', () => {
  let app: express.Application;
  let slackCollector: SlackCollector;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    slackCollector = new SlackCollector({
      enabled: true,
      botToken: 'xoxb-test-token',
      signingSecret: 'test-signing-secret',
      channels: ['C1234567890']
    });
  });

  describe('webhook handling', () => {
    it('should handle URL verification challenge', async () => {
      const payload = {
        token: 'verification-token',
        challenge: 'test-challenge',
        type: 'url_verification'
      };

      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(`v0:${Math.floor(Date.now() / 1000)}:${JSON.stringify(payload)}`)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', Math.floor(Date.now() / 1000).toString())
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.challenge).toBe('test-challenge');
    });

    it('should process message events', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload: SlackEvent = {
        token: 'verification-token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hello, world!',
          ts: timestamp.toString()
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: timestamp
      };

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(sigBasestring)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', timestamp.toString())
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event processed successfully');
      expect(response.body.eventsProcessed).toBe(1);
    });

    it('should reject invalid signatures', async () => {
      const payload = {
        token: 'verification-token',
        type: 'event_callback',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hello, world!',
          ts: Math.floor(Date.now() / 1000).toString()
        }
      };

      app.post('/slack/events', async (req, res) => {
        try {
          await slackCollector.handleWebhook(req, res);
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', 'v0=invalid-signature')
        .set('x-slack-request-timestamp', Math.floor(Date.now() / 1000).toString())
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should handle thread messages', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const threadTs = (timestamp - 100).toString();
      
      const payload: SlackEvent = {
        token: 'verification-token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'This is a reply',
          ts: timestamp.toString(),
          thread_ts: threadTs
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: timestamp
      };

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(sigBasestring)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        const result = await slackCollector.handleWebhook(req, res);
        // Verify the event was processed as a thread message
        expect(result.eventsCollected).toBe(1);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', timestamp.toString())
        .send(payload);

      expect(response.status).toBe(200);
    });

    it('should handle messages with reactions', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const payload: SlackEvent = {
        token: 'verification-token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Great work!',
          ts: timestamp.toString(),
          reactions: [
            {
              name: 'thumbsup',
              count: 2,
              users: ['U1234567890', 'U0987654321']
            }
          ]
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: timestamp
      };

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(sigBasestring)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', timestamp.toString())
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.eventsProcessed).toBe(1);
    });

    it('should extract mentions from message text', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const payload: SlackEvent = {
        token: 'verification-token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hey <@U0987654321>, can you review this?',
          ts: timestamp.toString()
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: timestamp
      };

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(sigBasestring)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', timestamp.toString())
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.eventsProcessed).toBe(1);
    });

    it('should ignore bot messages', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const payload: SlackEvent = {
        token: 'verification-token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'USLACKBOT',
          text: 'This is a bot message',
          ts: timestamp.toString()
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: timestamp
      };

      const sigBasestring = `v0:${timestamp}:${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', 'test-signing-secret')
        .update(sigBasestring)
        .digest('hex');

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', `v0=${signature}`)
        .set('x-slack-request-timestamp', timestamp.toString())
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.eventsProcessed).toBe(0); // Bot message should be ignored
    });
  });

  describe('error handling', () => {
    it('should handle malformed payloads', async () => {
      app.use((error: any, req: any, res: any, next: any) => {
        if (error instanceof SyntaxError) {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
        res.status(500).json({ error: 'Internal server error' });
      });

      app.post('/slack/events', async (req, res) => {
        try {
          await slackCollector.handleWebhook(req, res);
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', 'v0=invalid')
        .set('x-slack-request-timestamp', Math.floor(Date.now() / 1000).toString())
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400); // Express handles malformed JSON
    });

    it('should handle missing headers', async () => {
      const payload = {
        type: 'event_callback',
        event: {
          type: 'message',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'Hello',
          ts: Math.floor(Date.now() / 1000).toString()
        }
      };

      app.post('/slack/events', async (req, res) => {
        await slackCollector.handleWebhook(req, res);
      });

      const response = await request(app)
        .post('/slack/events')
        .send(payload);

      expect(response.status).toBe(401);
    });
  });
});