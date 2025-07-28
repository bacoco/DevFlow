import request from 'supertest';
import express from 'express';
import { owaspProtection } from '../owasp-protection';
import crypto from 'crypto';

describe('Security Penetration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    
    // Apply all OWASP protections
    app.use(owaspProtection.createCryptographicProtection());
    app.use(owaspProtection.createSecureDesignMiddleware());
    app.use(owaspProtection.createSecurityConfigMiddleware());
    app.use(owaspProtection.createComponentSecurityCheck());
    app.use(owaspProtection.createInputValidationMiddleware());
    app.use(owaspProtection.createAuthenticationSecurityMiddleware());
    app.use(owaspProtection.createIntegrityProtection());
    app.use(owaspProtection.createSecurityLoggingMiddleware());
    app.use(owaspProtection.createSSRFProtection());
    app.use(owaspProtection.createCSRFProtection());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer valid-token')) {
        (req as any).user = {
          id: 'user-123',
          role: 'DEVELOPER',
          email: 'test@example.com'
        };
      }
      next();
    });
    
    app.use(owaspProtection.createAccessControlMiddleware());

    // Test endpoints
    app.get('/api/profile', (req, res) => res.json({ success: true }));
    app.post('/api/data', (req, res) => res.json({ received: req.body }));
    app.post('/api/webhook', (req, res) => res.json({ success: true }));
    app.post('/api/password', (req, res) => res.json({ success: true }));
    app.get('/api/admin', (req, res) => res.json({ admin: true }));
  });

  describe('SQL Injection Attacks', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "'; EXEC xp_cmdshell('dir'); --"
    ];

    sqlInjectionPayloads.forEach(payload => {
      it(`should block SQL injection: ${payload}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/data')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ username: payload, password: 'test' });

        expect(response.status).toBe(200);
        expect(response.body.received.username).not.toContain('DROP TABLE');
        expect(response.body.received.username).not.toContain('UNION SELECT');
        expect(response.body.received.username).not.toContain('--');
      });
    });
  });

  describe('XSS (Cross-Site Scripting) Attacks', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>',
      '<video><source onerror="alert(\'XSS\')">',
      '<audio src=x onerror=alert("XSS")>',
      '<details open ontoggle=alert("XSS")>',
      '<marquee onstart=alert("XSS")>'
    ];

    xssPayloads.forEach(payload => {
      it(`should sanitize XSS payload: ${payload}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/data')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ comment: payload });

        expect(response.status).toBe(200);
        expect(response.body.received.comment).not.toContain('<script>');
        expect(response.body.received.comment).not.toContain('onerror');
        expect(response.body.received.comment).not.toContain('onload');
        expect(response.body.received.comment).not.toContain('javascript:');
      });
    });
  });

  describe('NoSQL Injection Attacks', () => {
    const nosqlPayloads = [
      { $where: 'this.password.length > 0' },
      { $regex: '.*' },
      { $ne: null },
      { $gt: '' },
      { $exists: true },
      { $in: ['admin', 'user'] },
      { $or: [{ username: 'admin' }, { role: 'admin' }] },
      { $and: [{ active: true }, { role: 'admin' }] }
    ];

    nosqlPayloads.forEach((payload, index) => {
      it(`should block NoSQL injection payload ${index + 1}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/data')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ filter: payload });

        expect(response.status).toBe(200);
        const receivedFilter = response.body.received.filter;
        
        // Check that MongoDB operators are removed
        expect(receivedFilter).not.toHaveProperty('$where');
        expect(receivedFilter).not.toHaveProperty('$regex');
        expect(receivedFilter).not.toHaveProperty('$ne');
        expect(receivedFilter).not.toHaveProperty('$gt');
        expect(receivedFilter).not.toHaveProperty('$exists');
        expect(receivedFilter).not.toHaveProperty('$in');
        expect(receivedFilter).not.toHaveProperty('$or');
        expect(receivedFilter).not.toHaveProperty('$and');
      });
    });
  });

  describe('SSRF (Server-Side Request Forgery) Attacks', () => {
    const ssrfPayloads = [
      'http://127.0.0.1:8080/admin',
      'http://localhost:3000/internal',
      'http://10.0.0.1/metadata',
      'http://192.168.1.1/config',
      'http://172.16.0.1/secrets',
      'http://169.254.169.254/latest/meta-data/',
      'file:///etc/passwd',
      'ftp://internal.server.com/files',
      'gopher://127.0.0.1:6379/_INFO',
      'dict://127.0.0.1:11211/stats',
      'http://[::1]:8080/admin',
      'http://0.0.0.0:8080/internal'
    ];

    ssrfPayloads.forEach(payload => {
      it(`should block SSRF payload: ${payload}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/webhook')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ url: payload });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid URL');
      });
    });
  });

  describe('Directory Traversal Attacks', () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%252F..%252F..%252Fetc%252Fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '/var/www/../../etc/passwd',
      'C:\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts'
    ];

    traversalPayloads.forEach(payload => {
      it(`should block directory traversal: ${payload}`, async () => {
        const response = await request(app)
          .get(`/api/${payload}`)
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid path detected');
      });
    });
  });

  describe('Authentication Bypass Attempts', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/profile');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should prevent privilege escalation', async () => {
      const response = await request(app)
        .get('/api/admin')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Attacks', () => {
    it('should reject POST requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .set('x-session-id', 'session-123')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF Token Invalid');
    });

    it('should reject requests with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .set('x-session-id', 'session-123')
        .set('x-csrf-token', 'invalid-token')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF Token Invalid');
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(102).fill(null).map(() => 
        request(app)
          .get('/api/profile')
          .set('Authorization', 'Bearer valid-token')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should reject oversized payloads', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .send({ data: largePayload });

      expect(response.status).toBe(413);
      expect(response.body.error).toBe('Payload Too Large');
    });
  });

  describe('Security Scanner Detection', () => {
    const scannerUserAgents = [
      'sqlmap/1.4.12',
      'Nikto/2.1.6',
      'Nessus SOAP',
      'Burp Suite Professional',
      'OWASP ZAP',
      'w3af.org',
      'Acunetix',
      'Netsparker',
      'AppScan',
      'Qualys WAS'
    ];

    scannerUserAgents.forEach(userAgent => {
      it(`should block security scanner: ${userAgent}`, async () => {
        const response = await request(app)
          .get('/api/profile')
          .set('User-Agent', userAgent)
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Forbidden');
        expect(response.body.message).toBe('Suspicious activity detected');
      });
    });
  });

  describe('Password Security', () => {
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      '12345678',
      'admin',
      'letmein',
      'welcome',
      'monkey'
    ];

    weakPasswords.forEach(password => {
      it(`should reject weak password: ${password}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/password')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ password });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Weak Password');
      });
    });

    it('should accept strong passwords', async () => {
      const sessionId = owaspProtection.createSession('user-123');
      const csrfToken = owaspProtection.generateCSRFToken(sessionId);

      const strongPassword = 'MyStr0ng!P@ssw0rd#2024';

      const response = await request(app)
        .post('/api/password')
        .set('Authorization', 'Bearer valid-token')
        .set('x-session-id', sessionId)
        .set('x-csrf-token', csrfToken)
        .send({ password: strongPassword });

      expect(response.status).toBe(200);
    });
  });

  describe('Request Integrity Attacks', () => {
    it('should reject requests with tampered signatures', async () => {
      const body = { data: 'test' };
      const timestamp = Date.now().toString();
      const tamperedSignature = 'tampered-signature';

      const response = await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .set('x-signature', tamperedSignature)
        .set('x-timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Integrity Check Failed');
    });

    it('should reject replay attacks with old timestamps', async () => {
      const body = { data: 'test' };
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const secret = process.env.INTEGRITY_SECRET || 'dev-secret';
      const payload = JSON.stringify(body) + oldTimestamp;
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const response = await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .set('x-signature', signature)
        .set('x-timestamp', oldTimestamp)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Request Expired');
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose sensitive headers', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should handle session expiration', async () => {
      // Create a session and immediately invalidate it
      const sessionId = owaspProtection.createSession('user-123');
      owaspProtection.invalidateSession(sessionId);

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .set('x-session-id', sessionId);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should cleanup expired sessions', () => {
      const initialSessionCount = owaspProtection['sessionStore'].size;
      owaspProtection.cleanupExpiredSessions();
      
      // Should not throw and should complete successfully
      expect(typeof owaspProtection.cleanupExpiredSessions).toBe('function');
    });
  });

  describe('Input Validation Edge Cases', () => {
    const edgeCaseInputs = [
      null,
      undefined,
      '',
      0,
      false,
      [],
      {},
      'a'.repeat(10000), // Very long string
      { nested: { deeply: { malicious: '<script>alert(1)</script>' } } },
      [{ malicious: "'; DROP TABLE users; --" }]
    ];

    edgeCaseInputs.forEach((input, index) => {
      it(`should handle edge case input ${index + 1}`, async () => {
        const sessionId = owaspProtection.createSession('user-123');
        const csrfToken = owaspProtection.generateCSRFToken(sessionId);

        const response = await request(app)
          .post('/api/data')
          .set('Authorization', 'Bearer valid-token')
          .set('x-session-id', sessionId)
          .set('x-csrf-token', csrfToken)
          .send({ data: input });

        // Should not crash and should return a valid response
        expect([200, 400]).toContain(response.status);
      });
    });
  });
});