import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WebSocketGateway } from '../websocket/gateway';
import { generateToken } from '../middleware/auth';
import { User, UserRole, createDefaultPrivacySettings, createDefaultUserPreferences } from '@devflow/shared-types';

describe('WebSocket Gateway Integration Tests', () => {
  let server: any;
  let wsServer: WebSocketServer;
  let gateway: WebSocketGateway;
  let port: number;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    teamIds: ['team-1'],
    privacySettings: createDefaultPrivacySettings('123e4567-e89b-12d3-a456-426614174000'),
    preferences: createDefaultUserPreferences(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  const mockTeamLead: User = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    email: 'teamlead@example.com',
    name: 'Team Lead',
    role: UserRole.TEAM_LEAD,
    teamIds: ['team-1'],
    privacySettings: createDefaultPrivacySettings('456e7890-e89b-12d3-a456-426614174001'),
    preferences: createDefaultUserPreferences(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  beforeAll((done) => {
    server = createServer();
    port = 0; // Let the system assign a port
    
    server.listen(port, () => {
      port = server.address().port;
      
      wsServer = new WebSocketServer({
        server,
        path: '/ws'
      });
      
      gateway = new WebSocketGateway(wsServer);
      done();
    });
  });

  afterAll((done) => {
    gateway.shutdown();
    server.close(done);
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection with valid token', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connection_established') {
          expect(message.data.user.id).toBe(mockUser.id);
          expect(message.data.connectionId).toBeDefined();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should reject connection without valid token', (done) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);

      ws.on('close', (code, reason) => {
        expect(code).toBe(1008); // Authentication required
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });

    it('should handle connection cleanup on disconnect', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        const initialCount = gateway.getConnectionCount();
        ws.close();
        
        setTimeout(() => {
          const finalCount = gateway.getConnectionCount();
          expect(finalCount).toBeLessThan(initialCount);
          done();
        }, 100);
      });
    });
  });

  describe('Subscription Management', () => {
    let ws: WebSocket;
    let token: string;

    beforeEach((done) => {
      token = generateToken(mockUser);
      ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);
      
      ws.on('open', () => {
        // Wait for connection established message
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connection_established') {
            done();
          }
        });
      });
    });

    afterEach(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    it('should handle metric subscription for own user', (done) => {
      const subscriptionMessage = {
        type: 'subscribe',
        data: {
          topic: 'metric_updated',
          filters: { userId: mockUser.id }
        }
      };

      ws.send(JSON.stringify(subscriptionMessage));

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscription_confirmed') {
          expect(message.data.topic).toBe('metric_updated');
          expect(message.data.filters.userId).toBe(mockUser.id);
          done();
        }
      });
    });

    it('should reject subscription to other user metrics for regular user', (done) => {
      const subscriptionMessage = {
        type: 'subscribe',
        data: {
          topic: 'metric_updated',
          filters: { userId: 'other-user-id' }
        }
      };

      ws.send(JSON.stringify(subscriptionMessage));

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          expect(message.data.message).toContain('Insufficient permissions');
          done();
        }
      });
    });

    it('should handle unsubscription', (done) => {
      const subscriptionMessage = {
        type: 'subscribe',
        data: {
          topic: 'alert_created',
          filters: { userId: mockUser.id }
        }
      };

      const unsubscriptionMessage = {
        type: 'unsubscribe',
        data: {
          topic: 'alert_created',
          filters: { userId: mockUser.id }
        }
      };

      let subscribed = false;

      ws.send(JSON.stringify(subscriptionMessage));

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          ws.send(JSON.stringify(unsubscriptionMessage));
        } else if (message.type === 'unsubscription_confirmed') {
          expect(message.data.topic).toBe('alert_created');
          done();
        }
      });
    });
  });

  describe('Permission-based Subscriptions', () => {
    it('should allow team lead to subscribe to team metrics', (done) => {
      const token = generateToken(mockTeamLead);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        const subscriptionMessage = {
          type: 'subscribe',
          data: {
            topic: 'metric_updated',
            filters: { teamId: 'team-1' }
          }
        };

        ws.send(JSON.stringify(subscriptionMessage));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscription_confirmed') {
          expect(message.data.topic).toBe('metric_updated');
          expect(message.data.filters.teamId).toBe('team-1');
          ws.close();
          done();
        }
      });
    });

    it('should reject team subscription for regular developer', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        const subscriptionMessage = {
          type: 'subscribe',
          data: {
            topic: 'metric_updated',
            filters: { teamId: 'other-team' }
          }
        };

        ws.send(JSON.stringify(subscriptionMessage));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          expect(message.data.message).toContain('Insufficient permissions');
          ws.close();
          done();
        }
      });
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast to specific user', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        // Wait for connection established, then broadcast
        setTimeout(() => {
          gateway.broadcastToUser(mockUser.id, {
            type: 'test_message',
            data: { content: 'Hello user!' }
          });
        }, 100);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'test_message') {
          expect(message.data.content).toBe('Hello user!');
          ws.close();
          done();
        }
      });
    });

    it('should broadcast to team members', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        // Wait for connection established, then broadcast
        setTimeout(() => {
          gateway.broadcastToTeam('team-1', {
            type: 'team_message',
            data: { content: 'Hello team!' }
          });
        }, 100);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'team_message') {
          expect(message.data.content).toBe('Hello team!');
          ws.close();
          done();
        }
      });
    });
  });

  describe('Heartbeat and Connection Health', () => {
    it('should respond to ping messages', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'ping',
          data: {}
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          expect(message.data.timestamp).toBeDefined();
          ws.close();
          done();
        }
      });
    });

    it('should handle invalid message format gracefully', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        ws.send('invalid json');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          expect(message.data.message).toContain('Invalid message format');
          ws.close();
          done();
        }
      });
    });
  });

  describe('Gateway Statistics', () => {
    it('should track connection count', (done) => {
      const initialCount = gateway.getConnectionCount();
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        setTimeout(() => {
          const newCount = gateway.getConnectionCount();
          expect(newCount).toBeGreaterThan(initialCount);
          ws.close();
          done();
        }, 100);
      });
    });

    it('should find connections by user', (done) => {
      const token = generateToken(mockUser);
      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

      ws.on('open', () => {
        setTimeout(() => {
          const userConnections = gateway.getConnectionsByUser(mockUser.id);
          expect(userConnections.length).toBeGreaterThan(0);
          expect(userConnections[0].user.id).toBe(mockUser.id);
          ws.close();
          done();
        }, 100);
      });
    });
  });
});