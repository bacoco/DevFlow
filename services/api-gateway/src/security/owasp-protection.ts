import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthContext } from '../middleware/auth';

// OWASP Top 10 Protection Service
export class OWASPProtectionService {
  private static instance: OWASPProtectionService;
  private csrfTokens: Map<string, { token: string; expires: Date }> = new Map();
  private sessionStore: Map<string, { userId: string; expires: Date; isValid: boolean }> = new Map();

  public static getInstance(): OWASPProtectionService {
    if (!OWASPProtectionService.instance) {
      OWASPProtectionService.instance = new OWASPProtectionService();
    }
    return OWASPProtectionService.instance;
  }

  // A01:2021 - Broken Access Control Protection
  public createAccessControlMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Implement principle of least privilege
      const user = (req as any).user;
      const path = req.path;
      const method = req.method;

      // Check if user has permission for this resource
      if (!this.hasPermission(user, path, method)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions for this resource'
        });
      }

      // Prevent directory traversal
      if (path.includes('../') || path.includes('..\\')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid path detected'
        });
      }

      next();
    };
  }

  private hasPermission(user: any, path: string, method: string): boolean {
    if (!user) return false;

    // Admin has access to everything
    if (user.role === 'ADMIN') return true;

    // Define role-based access rules
    const accessRules = {
      'MANAGER': [
        { path: '/api/teams', methods: ['GET', 'POST', 'PUT'] },
        { path: '/api/users', methods: ['GET'] },
        { path: '/api/metrics', methods: ['GET'] },
        { path: '/api/reports', methods: ['GET', 'POST'] }
      ],
      'TEAM_LEAD': [
        { path: '/api/teams', methods: ['GET'] },
        { path: '/api/users', methods: ['GET'] },
        { path: '/api/metrics', methods: ['GET'] }
      ],
      'DEVELOPER': [
        { path: '/api/profile', methods: ['GET', 'PUT'] },
        { path: '/api/metrics/personal', methods: ['GET'] }
      ]
    };

    const userRules = accessRules[user.role as keyof typeof accessRules] || [];
    return userRules.some(rule => 
      path.startsWith(rule.path) && rule.methods.includes(method)
    );
  }

  // A02:2021 - Cryptographic Failures Protection
  public createCryptographicProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set security headers manually
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    };
  }

  // A03:2021 - Injection Protection
  public createInputValidationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeInput(req.body);
      }
      
      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeInput(req.query);
      }
      
      next();
    };
  }

  // A04:2021 - Insecure Design Protection
  public createSecureDesignMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Implement secure defaults
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      // Prevent information disclosure
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  // A05:2021 - Security Misconfiguration Protection
  public createSecurityConfigMiddleware() {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();
    
    return [
      // Simple rate limiting implementation
      (req: Request, res: Response, next: NextFunction) => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxRequests = 100;
        
        const clientData = requestCounts.get(clientIp);
        
        if (!clientData || now > clientData.resetTime) {
          requestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
          return next();
        }
        
        if (clientData.count >= maxRequests) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.'
          });
        }
        
        clientData.count++;
        next();
      },

      // Request size limiting
      (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.get('content-length') || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (contentLength > maxSize) {
          return res.status(413).json({
            error: 'Payload Too Large',
            message: 'Request body too large'
          });
        }
        next();
      }
    ];
  }

  // A06:2021 - Vulnerable and Outdated Components Protection
  public createComponentSecurityCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Log security-relevant headers for monitoring
      const securityHeaders = {
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        referer: req.get('Referer'),
        xForwardedFor: req.get('X-Forwarded-For')
      };

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nessus/i,
        /burp/i,
        /owasp/i,
        /zap/i
      ];

      const userAgent = securityHeaders.userAgent || '';
      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        console.warn('Suspicious user agent detected:', userAgent);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Suspicious activity detected'
        });
      }

      next();
    };
  }

  // A07:2021 - Identification and Authentication Failures Protection
  public createAuthenticationSecurityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = req.headers['x-session-id'] as string;
      
      if (sessionId) {
        const session = this.sessionStore.get(sessionId);
        
        if (!session || session.expires < new Date() || !session.isValid) {
          this.sessionStore.delete(sessionId);
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired session'
          });
        }

        // Extend session
        session.expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      // Password strength validation for password change endpoints
      if (req.path.includes('/password') && req.method === 'POST') {
        const password = req.body.password;
        if (password && !this.isPasswordStrong(password)) {
          return res.status(400).json({
            error: 'Weak Password',
            message: 'Password does not meet security requirements'
          });
        }
      }

      next();
    };
  }

  private isPasswordStrong(password: string): boolean {
    // Minimum 8 characters
    if (password.length < 8) return false;

    // Must contain uppercase, lowercase, number, and special character
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasUpper && hasLower && hasNumber && hasSpecial;
  }

  // A08:2021 - Software and Data Integrity Failures Protection
  public createIntegrityProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Verify request integrity
      const signature = req.headers['x-signature'] as string;
      const timestamp = req.headers['x-timestamp'] as string;

      if (req.method !== 'GET' && signature && timestamp) {
        const expectedSignature = this.generateSignature(req.body, timestamp);
        
        if (!crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )) {
          return res.status(400).json({
            error: 'Integrity Check Failed',
            message: 'Request signature verification failed'
          });
        }

        // Check timestamp to prevent replay attacks
        const requestTime = parseInt(timestamp);
        const currentTime = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (Math.abs(currentTime - requestTime) > maxAge) {
          return res.status(400).json({
            error: 'Request Expired',
            message: 'Request timestamp is too old'
          });
        }
      }

      next();
    };
  }

  private generateSignature(body: any, timestamp: string): string {
    const secret = process.env.INTEGRITY_SECRET || 'dev-secret';
    const payload = JSON.stringify(body) + timestamp;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  // A09:2021 - Security Logging and Monitoring Failures Protection
  public createSecurityLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(body) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Log security events
        const securityEvent = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode,
          responseTime,
          userId: (req as any).user?.id,
          sessionId: req.headers['x-session-id']
        };

        // Log failed authentication attempts
        if (res.statusCode === 401 || res.statusCode === 403) {
          console.warn('Security Event - Authentication/Authorization Failure:', securityEvent);
        }

        // Log suspicious activity
        if (res.statusCode === 429 || responseTime > 5000) {
          console.warn('Security Event - Suspicious Activity:', securityEvent);
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  // A10:2021 - Server-Side Request Forgery (SSRF) Protection
  public createSSRFProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check for SSRF in URL parameters
      const urlParams = ['url', 'callback', 'redirect', 'webhook'];
      
      for (const param of urlParams) {
        const value = req.query[param] || req.body[param];
        
        if (value && typeof value === 'string') {
          if (!this.isUrlSafe(value)) {
            return res.status(400).json({
              error: 'Invalid URL',
              message: 'URL contains potentially dangerous content'
            });
          }
        }
      }

      next();
    };
  }

  private isUrlSafe(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Block private IP ranges
      const hostname = parsedUrl.hostname;
      const privateRanges = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/
      ];

      if (privateRanges.some(range => range.test(hostname))) {
        return false;
      }

      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Block localhost variations
      const localhostVariations = ['localhost', '0.0.0.0', '[::]'];
      if (localhostVariations.includes(hostname)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // CSRF Protection
  public generateCSRFToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    this.csrfTokens.set(sessionId, { token, expires });
    return token;
  }

  public validateCSRFToken(sessionId: string, token: string): boolean {
    const storedToken = this.csrfTokens.get(sessionId);
    
    if (!storedToken || storedToken.expires < new Date()) {
      this.csrfTokens.delete(sessionId);
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(storedToken.token),
      Buffer.from(token)
    );
  }

  public createCSRFProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const sessionId = req.headers['x-session-id'] as string;
        const csrfToken = req.headers['x-csrf-token'] as string;

        if (!sessionId || !csrfToken || !this.validateCSRFToken(sessionId, csrfToken)) {
          return res.status(403).json({
            error: 'CSRF Token Invalid',
            message: 'Invalid or missing CSRF token'
          });
        }
      }

      next();
    };
  }

  // Session Management
  public createSession(userId: string): string {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    this.sessionStore.set(sessionId, {
      userId,
      expires,
      isValid: true
    });

    return sessionId;
  }

  public invalidateSession(sessionId: string): void {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.isValid = false;
    }
  }

  public cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.expires < now) {
        this.sessionStore.delete(sessionId);
      }
    }

    for (const [sessionId, token] of this.csrfTokens.entries()) {
      if (token.expires < now) {
        this.csrfTokens.delete(sessionId);
      }
    }
  }

  // Input sanitization utilities
  public sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Basic HTML escaping
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        // Remove SQL injection patterns
        .replace(/('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/)|(\bUNION\b)|(\bSELECT\b)|(\bINSERT\b)|(\bUPDATE\b)|(\bDELETE\b)|(\bDROP\b)|(\bCREATE\b)|(\bALTER\b)/gi, '')
        // Remove script tags and event handlers
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Remove MongoDB operators
        if (key.startsWith('$')) {
          continue;
        }
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  // Validation utilities
  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  public validateInteger(value: string, min?: number, max?: number): boolean {
    const num = parseInt(value, 10);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }
}

// Export singleton instance
export const owaspProtection = OWASPProtectionService.getInstance();