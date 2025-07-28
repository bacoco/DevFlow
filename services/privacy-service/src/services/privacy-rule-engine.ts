import { PrivacyRule, PrivacyCondition, PrivacyAction, PrivacySettings } from '../types/privacy';

export class PrivacyRuleEngine {
  private rules: Map<string, PrivacyRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Default rules for sensitive data protection
    const defaultRules: PrivacyRule[] = [
      {
        id: 'default-email-redact',
        userId: '*',
        dataType: 'communication',
        condition: {
          field: 'content',
          operator: 'regex',
          value: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
        },
        action: PrivacyAction.REDACT,
        priority: 100,
        isActive: true
      },
      {
        id: 'default-password-deny',
        userId: '*',
        dataType: 'ide_telemetry',
        condition: {
          field: 'content',
          operator: 'regex',
          value: /(password|pwd|secret|token|key)/i
        },
        action: PrivacyAction.DENY,
        priority: 200,
        isActive: true
      },
      {
        id: 'default-ip-anonymize',
        userId: '*',
        dataType: 'git_event',
        condition: {
          field: 'metadata.ip',
          operator: 'regex',
          value: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/
        },
        action: PrivacyAction.ANONYMIZE,
        priority: 50,
        isActive: true
      }
    ];

    this.rules.set('*', defaultRules);
  }

  addRule(rule: PrivacyRule): void {
    const userRules = this.rules.get(rule.userId) || [];
    userRules.push(rule);
    userRules.sort((a, b) => b.priority - a.priority);
    this.rules.set(rule.userId, userRules);
  }

  removeRule(userId: string, ruleId: string): boolean {
    const userRules = this.rules.get(userId);
    if (!userRules) return false;

    const index = userRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;

    userRules.splice(index, 1);
    return true;
  }

  evaluateData(data: any, userId: string, dataType: string): {
    allowed: boolean;
    processedData: any;
    appliedRules: string[];
  } {
    const userRules = this.rules.get(userId) || [];
    const globalRules = this.rules.get('*') || [];
    const allRules = [...userRules, ...globalRules]
      .filter(rule => rule.dataType === dataType && rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    let processedData = JSON.parse(JSON.stringify(data));
    const appliedRules: string[] = [];
    let allowed = true;

    for (const rule of allRules) {
      if (this.matchesCondition(processedData, rule.condition)) {
        appliedRules.push(rule.id);

        switch (rule.action) {
          case PrivacyAction.DENY:
            allowed = false;
            return { allowed, processedData: null, appliedRules };

          case PrivacyAction.REDACT:
            processedData = this.redactData(processedData, rule.condition);
            break;

          case PrivacyAction.ANONYMIZE:
            processedData = this.anonymizeData(processedData, rule.condition);
            break;

          case PrivacyAction.ALLOW:
            // Explicitly allowed, continue processing
            break;
        }
      }
    }

    return { allowed, processedData, appliedRules };
  }

  private matchesCondition(data: any, condition: PrivacyCondition): boolean {
    const value = this.getNestedValue(data, condition.field);
    if (value === undefined) return false;

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'startsWith':
        return String(value).startsWith(String(condition.value));
      case 'endsWith':
        return String(value).endsWith(String(condition.value));
      case 'regex':
        return condition.value.test(String(value));
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private redactData(data: any, condition: PrivacyCondition): any {
    const value = this.getNestedValue(data, condition.field);
    if (value === undefined) return data;

    const redactedData = JSON.parse(JSON.stringify(data));
    this.setNestedValue(redactedData, condition.field, '[REDACTED]');
    return redactedData;
  }

  private anonymizeData(data: any, condition: PrivacyCondition): any {
    const value = this.getNestedValue(data, condition.field);
    if (value === undefined) return data;

    const anonymizedData = JSON.parse(JSON.stringify(data));
    const anonymizedValue = this.generateAnonymizedValue(String(value));
    this.setNestedValue(anonymizedData, condition.field, anonymizedValue);
    return anonymizedData;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current[key], obj);
    target[lastKey] = value;
  }

  private generateAnonymizedValue(value: string): string {
    // Simple hash-based anonymization
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  getUserRules(userId: string): PrivacyRule[] {
    return this.rules.get(userId) || [];
  }

  getGlobalRules(): PrivacyRule[] {
    return this.rules.get('*') || [];
  }
}