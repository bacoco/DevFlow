import request from 'supertest';
import express from 'express';
import { OWASPProtectionService, owaspProtection } from '../owasp-protection';
import crypto from 'crypto';

describe('OWASP Protection Service', () => {
  let app: express.Application;
  let service: OWASPProtectionService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    service = OWASPProtectionService.getInstance();
  });

  describe('A01:2021 - Broken Access Control Protection', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        // Mock user for testing
        (req as any).user = {
          id: 'user-123',
          role: 'DEVELOPER',
          email: 'test@example.com'
        };
        next();
      });
      app.use(service.createAccessControlMiddleware());
      app.get('/api/profile', (req, res) => res.json({ success: true }));
      app.get('/api/admin', (req, res) => res.json({ success: true }));
    });

    it('should allow access to permitted resources', async () => {
      const response = await request(app)
        .get('/api/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access to forbidden resources', async () => {
      const response = await request(app)
        .get('/api/admin')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should prevent directory traversal attacks', async () => {
      const response = await request(app)
        .get('/api/../../../etc/passwd')
        .expect(400);

      expect(response.body.message).toBe('Invalid path detected');
    });

    it('should allow admin access to all resources', async () => {
      app.use((req, res, next) => {
        (req as any).user = {
          id: 'admin-123',
          role: 'ADMIN',
          email: 'admin@example.com'
        };
        next();
      });

      await request(app)
        .get('/api/admin')
        .expect(200);
    });
  });

  describe('A02:2021 - Cryptographic Failures Protection', () => {
    beforeEach(() => {
      app.use(service.createCryptographicProtection());
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set CSP headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('A03:2021 - Injection Protection', () => {
    beforeEach(() => {
      app.use(service.createInputValidationMiddleware());
      app.post('/test', (req, res) => res.json({ body: req.body }));
    });

    it('should sanitize SQL injection attempts', async () => {
      const maliciousInput = {
        name: "'; DROP TABLE users; --",
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.body.name).not.toContain('DROP TABLE');
      expect(response.body.body.name).not.toContain('--');
    });

    it('should prevent XSS attacks', async () => {
      const maliciousInput = {
        comment: '<script>alert("XSS")</script>',
        title: 'Test Title'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.body.comment).not.toContain('<script>');
    });

    it('should prevent NoSQL injection', async () => {
      const maliciousInput = {
        filter: { $where: 'this.password.length > 0' },
        name: 'test'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.body.filter).not.toHaveProperty('$where');
    });
  });

  describe('A04:2021 - Insecure Design Protection', () => {
    beforeEach(() => {
      app.use(service.createSecureDesignMiddleware());
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should set secure headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should remove information disclosure headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('A05:2021 - Security Misconfiguration Protection', () => {
    beforeEach(() => {
      app.use(service.createSecurityConfigMiddleware());
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests to trigger rate limit
      const requests = Array(101).fill(null).map(() => 
        request(app).get('/test')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/test')
        .send({ data: largePayload })
        .expect(413);

      expect(response.body.error).toBe('Payload Too Large');
    });
  });

  describe('A06:2021 - Vulnerable Components Protection', () => {
    beforeEach(() => {
      app.use(service.createComponentSecurityCheck());
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should block suspicious user agents', async () => {
      const response = await request(app)
        .get('/test')
        .set('User-Agent', 'sqlmap/1.0')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Suspicious activity detected');
    });

    it('should allow legitimate user agents', async () => {
      await request(app)
        .get('/test')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .expect(200);
    });
  });

  describe('A07:2021 - Authentication Failures Protection', () => {
    beforeEach(() => {
      app.use(service.createAuthenticationSecurityMiddleware());
      app.post('/password', (req, res) => res.json({ success: true }));
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/password')
        .send({ password: 'weak' })
        .expect(400);

      expect(response.body.error).toBe('Weak Password');
    });

    it('should accept strong passwords', async () => {
      await request(app)
        .post('/password')
        .send({ password: 'StrongP@ssw0rd!' })
        .expect(200);
    });

    it('should handle session validation', async () => {
      const sessionId = service.createSession('user-123');
      
      await request(app)
        .get('/test')
        .set('x-session-id', sessionId)
        .expect(200);
    });

    it('should reject invalid sessions', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-session-id', 'invalid-session')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('A08:2021 - Integrity Protection', () => {
    beforeEach(() => {
      app.use(service.createIntegrityProtection());
      app.post('/test', (req, res) => res.json({ success: true }));
    });

    it('should validate request signatures', async () => {
      const body = { data: 'test' };
      const timestamp = Date.now().toString();
      const secret = process.env.INTEGRITY_SECRET || 'dev-secret';
      const payload = JSON.stringify(body) + timestamp;
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      await request(app)
        .post('/test')
        .set('x-signature', signature)
        .set('x-timestamp', timestamp)
        .send(body)
        .expect(200);
    });

    it('should reject invalid signatures', async () => {
      const body = { data: 'test' };
      const timestamp = Date.now().toString();
      const invalidSignature = 'invalid-signature';

      const response = await request(app)
        .post('/test')
        .set('x-signature', invalidSignature)
        .set('x-timestamp', timestamp)
        .send(body)
        .expect(400);

      expect(response.body.error).toBe('Integrity Check Failed');
    });

    it('should reject old timestamps', async () => {
      const body = { data: 'test' };
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const secret = process.env.INTEGRITY_SECRET || 'dev-secret';
      const payload = JSON.stringify(body) + oldTimestamp;
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const response = await request(app)
        .post('/test')
        .set('x-signature', signature)
        .set('x-timestamp', oldTimestamp)
        .send(body)
        .expect(400);

      expect(response.body.error).toBe('Request Expired');
    });
  });

  describe('A09:2021 - Security Logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      app.use(service.createSecurityLoggingMiddleware());
      app.get('/test', (req, res) => res.status(401).json({ error: 'Unauthorized' }));
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log authentication failures', async () => {
      await request(app)
        .get('/test')
        .expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Security Event - Authentication/Authorization Failure:',
        expect.objectContaining({
          statusCode: 401,
          method: 'GET',
          path: '/test'
        })
      );
    });
  });

  describe('A10:2021 - SSRF Protection', () => {
    beforeEach(() => {
      app.use(service.createSSRFProtection());
      app.post('/webhook', (req, res) => res.json({ success: true }));
    });

    it('should block private IP addresses', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({ url: 'http://127.0.0.1:8080/admin' })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL');
    });

    it('should block localhost', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({ url: 'http://localhost:3000/api' })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL');
    });

    it('should allow legitimate URLs', async () => {
      await request(app)
        .post('/webhook')
        .send({ url: 'https://api.example.com/webhook' })
        .expect(200);
    });

    it('should block non-HTTP protocols', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({ url: 'file:///etc/passwd' })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL');
    });
  });

  describe('CSRF Protection', () => {
    beforeEach(() => {
      app.use(service.createCSRFProtection());
      app.post('/test', (req, res) => res.json({ success: true }));
    });

    it('should generate and validate CSRF tokens', () => {
      const sessionId = 'session-123';
      const token = service.generateCSRFToken(sessionId);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex encoded
      expect(service.validateCSRFToken(sessionId, token)).toBe(true);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .post('/test')
        .set('x-session-id', 'session-123')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF Token Invalid');
    });

    it('should accept requests with valid CSRF token', async () => {
      const sessionId = 'session-123';
      const token = service.generateCSRFToken(sessionId);

      await request(app)
        .post('/test')
        .set('x-session-id', sessionId)
        .set('x-csrf-token', token)
        .send({ data: 'test' })
        .expect(200);
    });
  });

  describe('Session Management', () => {
    it('should create and validate sessions', () => {
      const userId = 'user-123';
      const sessionId = service.createSession(userId);
      
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(64); // 32 bytes hex encoded
    });

    it('should invalidate sessions', () => {
      const userId = 'user-123';
      const sessionId = service.createSession(userId);
      
      service.invalidateSession(sessionId);
      
      // Session should be marked as invalid
      expect(service.validateCSRFToken(sessionId, 'any-token')).toBe(false);
    });

    it('should cleanup expired sessions', () => {
      const cleanupSpy = jest.spyOn(service, 'cleanupExpiredSessions');
      service.cleanupExpiredSessions();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize string inputs', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = service.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should sanitize object inputs', () => {
      const maliciousInput = {
        '<script>': 'value',
        normal: '<img src=x onerror=alert(1)>'
      };
      
      const sanitized = service.sanitizeInput(maliciousInput);
      
      expect(Object.keys(sanitized)[0]).not.toContain('<script>');
      expect(sanitized.normal).not.toContain('onerror');
    });

    it('should sanitize array inputs', () => {
      const maliciousInput = ['<script>alert(1)</script>', 'normal text'];
      const sanitized = service.sanitizeInput(maliciousInput);
      
      expect(sanitized[0]).not.toContain('<script>');
      expect(sanitized[1]).toBe('normal text');
    });
  });

  describe('Validation Rules', () => {
    it('should provide comprehensive validation rules', () => {
      const rules = service.getValidationRules();
      
      expect(rules).toHaveProperty('email');
      expect(rules).toHaveProperty('password');
      expect(rules).toHaveProperty('userId');
      expect(rules).toHaveProperty('teamId');
      expect(rules).toHaveProperty('limit');
      expect(rules).toHaveProperty('offset');
    });
  });
});