import { PrivacyRuleEngine } from '../services/privacy-rule-engine';
import { PrivacyRule, PrivacyAction } from '../types/privacy';

describe('PrivacyRuleEngine', () => {
  let ruleEngine: PrivacyRuleEngine;

  beforeEach(() => {
    ruleEngine = new PrivacyRuleEngine();
  });

  describe('Rule Management', () => {
    it('should add and retrieve user-specific rules', () => {
      const rule: PrivacyRule = {
        id: 'test-rule-1',
        userId: 'user123',
        dataType: 'git_event',
        condition: {
          field: 'message',
          operator: 'contains',
          value: 'secret'
        },
        action: PrivacyAction.REDACT,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);
      const userRules = ruleEngine.getUserRules('user123');
      
      expect(userRules).toHaveLength(1);
      expect(userRules[0]).toEqual(rule);
    });

    it('should remove rules correctly', () => {
      const rule: PrivacyRule = {
        id: 'test-rule-2',
        userId: 'user123',
        dataType: 'git_event',
        condition: {
          field: 'message',
          operator: 'contains',
          value: 'test'
        },
        action: PrivacyAction.ALLOW,
        priority: 50,
        isActive: true
      };

      ruleEngine.addRule(rule);
      expect(ruleEngine.getUserRules('user123')).toHaveLength(1);

      const removed = ruleEngine.removeRule('user123', 'test-rule-2');
      expect(removed).toBe(true);
      expect(ruleEngine.getUserRules('user123')).toHaveLength(0);
    });

    it('should sort rules by priority', () => {
      const lowPriorityRule: PrivacyRule = {
        id: 'low-priority',
        userId: 'user123',
        dataType: 'git_event',
        condition: { field: 'test', operator: 'equals', value: 'test' },
        action: PrivacyAction.ALLOW,
        priority: 10,
        isActive: true
      };

      const highPriorityRule: PrivacyRule = {
        id: 'high-priority',
        userId: 'user123',
        dataType: 'git_event',
        condition: { field: 'test', operator: 'equals', value: 'test' },
        action: PrivacyAction.DENY,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(lowPriorityRule);
      ruleEngine.addRule(highPriorityRule);

      const rules = ruleEngine.getUserRules('user123');
      expect(rules[0].id).toBe('high-priority');
      expect(rules[1].id).toBe('low-priority');
    });
  });

  describe('Data Evaluation', () => {
    it('should deny data when DENY rule matches', () => {
      const rule: PrivacyRule = {
        id: 'deny-password',
        userId: 'user123',
        dataType: 'ide_telemetry',
        condition: {
          field: 'content',
          operator: 'contains',
          value: 'password'
        },
        action: PrivacyAction.DENY,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = {
        content: 'user entered password: secret123',
        timestamp: new Date()
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'ide_telemetry');
      
      expect(result.allowed).toBe(false);
      expect(result.processedData).toBeNull();
      expect(result.appliedRules).toContain('default-password-deny');
    });

    it('should redact data when REDACT rule matches', () => {
      const rule: PrivacyRule = {
        id: 'redact-email',
        userId: 'user123',
        dataType: 'communication',
        condition: {
          field: 'message',
          operator: 'contains',
          value: '@'
        },
        action: PrivacyAction.REDACT,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = {
        message: 'Contact john@example.com for details',
        author: 'user123'
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'communication');
      
      expect(result.allowed).toBe(true);
      expect(result.processedData.message).toBe('[REDACTED]');
      expect(result.appliedRules).toContain('redact-email');
    });

    it('should anonymize data when ANONYMIZE rule matches', () => {
      const rule: PrivacyRule = {
        id: 'anonymize-ip',
        userId: 'user123',
        dataType: 'git_event',
        condition: {
          field: 'metadata.ip',
          operator: 'regex',
          value: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/
        },
        action: PrivacyAction.ANONYMIZE,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = {
        commit: 'abc123',
        metadata: {
          ip: '192.168.1.100'
        }
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'git_event');
      
      expect(result.allowed).toBe(true);
      expect(result.processedData.metadata.ip).toMatch(/^anon_[a-z0-9]+$/);
      expect(result.appliedRules).toContain('anonymize-ip');
    });

    it('should apply global rules to all users', () => {
      const testData = {
        content: 'User password is secret123'
      };

      // Global rule should be applied even without user-specific rules
      const result = ruleEngine.evaluateData(testData, 'newuser', 'ide_telemetry');
      
      expect(result.allowed).toBe(false);
      expect(result.appliedRules).toContain('default-password-deny');
    });

    it('should handle nested object conditions', () => {
      const rule: PrivacyRule = {
        id: 'nested-test',
        userId: 'user123',
        dataType: 'git_event',
        condition: {
          field: 'metadata.author.email',
          operator: 'contains',
          value: '@company.com'
        },
        action: PrivacyAction.REDACT,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = {
        commit: 'abc123',
        metadata: {
          author: {
            email: 'john@company.com',
            name: 'John Doe'
          }
        }
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'git_event');
      
      expect(result.allowed).toBe(true);
      expect(result.processedData.metadata.author.email).toBe('[REDACTED]');
    });

    it('should handle regex conditions correctly', () => {
      const rule: PrivacyRule = {
        id: 'regex-test',
        userId: 'user123',
        dataType: 'communication',
        condition: {
          field: 'content',
          operator: 'regex',
          value: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
        },
        action: PrivacyAction.ANONYMIZE,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = {
        content: 'Please email support@example.com or admin@test.org'
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'communication');
      
      expect(result.allowed).toBe(true);
      expect(result.processedData.content).toMatch(/^anon_[a-z0-9]+$/);
    });

    it('should skip inactive rules', () => {
      const rule: PrivacyRule = {
        id: 'inactive-rule',
        userId: 'user123',
        dataType: 'git_event',
        condition: {
          field: 'message',
          operator: 'contains',
          value: 'test'
        },
        action: PrivacyAction.DENY,
        priority: 100,
        isActive: false
      };

      ruleEngine.addRule(rule);

      const testData = {
        message: 'This is a test commit'
      };

      const result = ruleEngine.evaluateData(testData, 'user123', 'git_event');
      
      expect(result.allowed).toBe(true);
      expect(result.appliedRules).not.toContain('inactive-rule');
    });
  });

  describe('Condition Matching', () => {
    it('should match equals condition', () => {
      const rule: PrivacyRule = {
        id: 'equals-test',
        userId: 'user123',
        dataType: 'test',
        condition: {
          field: 'status',
          operator: 'equals',
          value: 'private'
        },
        action: PrivacyAction.DENY,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = { status: 'private' };
      const result = ruleEngine.evaluateData(testData, 'user123', 'test');
      
      expect(result.allowed).toBe(false);
    });

    it('should match startsWith condition', () => {
      const rule: PrivacyRule = {
        id: 'starts-test',
        userId: 'user123',
        dataType: 'test',
        condition: {
          field: 'filename',
          operator: 'startsWith',
          value: 'secret_'
        },
        action: PrivacyAction.REDACT,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = { filename: 'secret_config.json' };
      const result = ruleEngine.evaluateData(testData, 'user123', 'test');
      
      expect(result.allowed).toBe(true);
      expect(result.processedData.filename).toBe('[REDACTED]');
    });

    it('should match endsWith condition', () => {
      const rule: PrivacyRule = {
        id: 'ends-test',
        userId: 'user123',
        dataType: 'test',
        condition: {
          field: 'filename',
          operator: 'endsWith',
          value: '.key'
        },
        action: PrivacyAction.DENY,
        priority: 100,
        isActive: true
      };

      ruleEngine.addRule(rule);

      const testData = { filename: 'private.key' };
      const result = ruleEngine.evaluateData(testData, 'user123', 'test');
      
      expect(result.allowed).toBe(false);
    });
  });
});