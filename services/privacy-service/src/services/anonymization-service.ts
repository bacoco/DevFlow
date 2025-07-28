import crypto from 'crypto';
import { AnonymizationLevel, AnonymizationResult } from '../types/privacy';

export class AnonymizationService {
  private saltMap: Map<string, string> = new Map();

  constructor() {
    // Initialize with a master salt for consistent anonymization
    this.generateSalt('master');
  }

  private generateSalt(key: string): string {
    if (!this.saltMap.has(key)) {
      this.saltMap.set(key, crypto.randomBytes(32).toString('hex'));
    }
    return this.saltMap.get(key)!;
  }

  anonymizeData(data: any, level: AnonymizationLevel, userId?: string): AnonymizationResult {
    const originalData = JSON.parse(JSON.stringify(data));
    let anonymizedData: any;

    switch (level) {
      case AnonymizationLevel.NONE:
        anonymizedData = originalData;
        break;
      case AnonymizationLevel.BASIC:
        anonymizedData = this.basicAnonymization(originalData, userId);
        break;
      case AnonymizationLevel.ENHANCED:
        anonymizedData = this.enhancedAnonymization(originalData, userId);
        break;
      case AnonymizationLevel.FULL:
        anonymizedData = this.fullAnonymization(originalData, userId);
        break;
      default:
        anonymizedData = originalData;
    }

    return {
      originalData,
      anonymizedData,
      method: `${level}_anonymization`,
      level
    };
  }

  private basicAnonymization(data: any, userId?: string): any {
    const anonymized = JSON.parse(JSON.stringify(data));
    
    // Hash user identifiers
    if (anonymized.userId) {
      anonymized.userId = this.hashValue(anonymized.userId, 'user');
    }
    if (anonymized.email) {
      anonymized.email = this.hashValue(anonymized.email, 'email');
    }
    if (anonymized.author) {
      anonymized.author = this.hashValue(anonymized.author, 'author');
    }

    // Remove or hash IP addresses
    if (anonymized.ip) {
      anonymized.ip = this.anonymizeIP(anonymized.ip);
    }

    // Recursively process nested objects
    this.processNestedObjects(anonymized, (obj) => {
      if (obj.ip) obj.ip = this.anonymizeIP(obj.ip);
      if (obj.clientIp) obj.clientIp = this.anonymizeIP(obj.clientIp);
      if (obj.userId) obj.userId = this.hashValue(obj.userId, 'user');
      if (obj.email) obj.email = this.hashValue(obj.email, 'email');
    });

    return anonymized;
  }

  private enhancedAnonymization(data: any, userId?: string): any {
    const anonymized = this.basicAnonymization(data, userId);

    // Additional anonymization for enhanced level
    if (anonymized.filename) {
      anonymized.filename = this.anonymizeFilename(anonymized.filename);
    }
    if (anonymized.repository) {
      anonymized.repository = this.hashValue(anonymized.repository, 'repo');
    }
    if (anonymized.branch) {
      anonymized.branch = this.hashValue(anonymized.branch, 'branch');
    }

    // Anonymize commit messages and comments
    if (anonymized.message) {
      anonymized.message = this.anonymizeText(anonymized.message);
    }
    if (anonymized.comment) {
      anonymized.comment = this.anonymizeText(anonymized.comment);
    }

    // Process nested objects
    this.processNestedObjects(anonymized, (obj) => {
      if (obj.filename) obj.filename = this.anonymizeFilename(obj.filename);
      if (obj.name) obj.name = this.anonymizeFilename(obj.name);
      if (obj.repository) obj.repository = this.hashValue(obj.repository, 'repo');
      if (obj.message) obj.message = this.anonymizeText(obj.message);
      if (obj.author) obj.author = this.hashValue(obj.author, 'author');
    });

    return anonymized;
  }

  private fullAnonymization(data: any, userId?: string): any {
    const anonymized = this.enhancedAnonymization(data, userId);

    // Remove all potentially identifying content
    const fieldsToRemove = [
      'name', 'fullName', 'displayName', 'username',
      'phone', 'address', 'location', 'timezone',
      'personalNotes', 'privateData'
    ];

    this.removeFields(anonymized, fieldsToRemove);

    // Anonymize timestamps to time ranges
    if (anonymized.timestamp) {
      anonymized.timestamp = this.anonymizeTimestamp(anonymized.timestamp);
    }
    if (anonymized.createdAt) {
      anonymized.createdAt = this.anonymizeTimestamp(anonymized.createdAt);
    }

    // Process nested objects
    this.processNestedObjects(anonymized, (obj) => {
      fieldsToRemove.forEach(field => delete obj[field]);
      if (obj.timestamp) obj.timestamp = this.anonymizeTimestamp(obj.timestamp);
      if (obj.createdAt) obj.createdAt = this.anonymizeTimestamp(obj.createdAt);
    });

    return anonymized;
  }

  private hashValue(value: string, type: string): string {
    const salt = this.generateSalt(type);
    return crypto.createHash('sha256')
      .update(value + salt)
      .digest('hex')
      .substring(0, 16);
  }

  private anonymizeIP(ip: string): string {
    // For IPv4, zero out the last octet
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }
    // For IPv6, zero out the last 64 bits
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return parts.slice(0, 4).join(':') + '::';
      }
    }
    return 'anonymized_ip';
  }

  private anonymizeFilename(filename: string): string {
    const extension = filename.split('.').pop();
    const hash = this.hashValue(filename, 'filename');
    return extension ? `file_${hash}.${extension}` : `file_${hash}`;
  }

  private anonymizeText(text: string): string {
    // Replace words with generic placeholders while preserving structure
    return text
      .replace(/\b[A-Z][a-zA-Z]*\b/g, 'Name')
      .replace(/\b[a-z]+\b/g, 'word')
      .replace(/\b\d+\b/g, 'NUM')
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, 'email@domain.com');
  }

  private anonymizeTimestamp(timestamp: Date | string): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'invalid-date';
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  private removeFields(obj: any, fields: string[]): void {
    fields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        delete obj[field];
      }
    });
  }

  private processNestedObjects(obj: any, processor: (obj: any) => void, isRoot: boolean = true): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(item => this.processNestedObjects(item, processor, false));
    } else {
      if (!isRoot) {
        processor(obj);
      }
      Object.values(obj).forEach(value => {
        this.processNestedObjects(value, processor, false);
      });
    }
  }

  // Utility method to check if data contains PII
  containsPII(data: any): boolean {
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/, // IP Address
      /(password|pwd|secret|token|key|api_key)/i // Sensitive keywords
    ];

    const dataString = JSON.stringify(data);
    return piiPatterns.some(pattern => pattern.test(dataString));
  }
}