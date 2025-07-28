import { 
  safeValidateGitEvent, 
  safeValidateIDETelemetry, 
  GitEvent, 
  IDETelemetry 
} from '@devflow/shared-types';
import { z } from 'zod';
import winston from 'winston';

export interface ValidationResult {
  isValid: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
}

export interface ValidationContext {
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class EventValidator {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/event-validator.log' })
      ]
    });
  }

  validateGitEvent(data: unknown, context: ValidationContext): ValidationResult {
    const result = safeValidateGitEvent(data);
    
    if (result.success) {
      const warnings = this.checkGitEventWarnings(result.data);
      
      this.logger.debug('Git event validation successful', {
        eventId: result.data.id,
        repository: result.data.repository,
        source: context.source,
        warnings: warnings.length
      });

      return {
        isValid: true,
        data: result.data,
        errors: [],
        warnings
      };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );

      this.logger.warn('Git event validation failed', {
        source: context.source,
        errors,
        data: this.sanitizeForLogging(data)
      });

      return {
        isValid: false,
        errors,
        warnings: []
      };
    }
  }

  validateIDETelemetry(data: unknown, context: ValidationContext): ValidationResult {
    const result = safeValidateIDETelemetry(data);
    
    if (result.success) {
      const warnings = this.checkIDETelemetryWarnings(result.data);
      
      this.logger.debug('IDE telemetry validation successful', {
        eventId: result.data.id,
        userId: result.data.userId,
        eventType: result.data.eventType,
        source: context.source,
        warnings: warnings.length
      });

      return {
        isValid: true,
        data: result.data,
        errors: [],
        warnings
      };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );

      this.logger.warn('IDE telemetry validation failed', {
        source: context.source,
        errors,
        data: this.sanitizeForLogging(data)
      });

      return {
        isValid: false,
        errors,
        warnings: []
      };
    }
  }

  validateCommunicationEvent(data: unknown, context: ValidationContext): ValidationResult {
    // Define communication event schema
    const CommunicationEventSchema = z.object({
      id: z.string().uuid(),
      platform: z.enum(['slack', 'teams', 'discord']),
      channel: z.string().min(1),
      userId: z.string().min(1),
      timestamp: z.date(),
      type: z.enum(['message', 'thread_reply', 'reaction', 'mention']),
      content: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      privacyLevel: z.enum(['public', 'team', 'private']).default('team')
    });

    const result = CommunicationEventSchema.safeParse(data);
    
    if (result.success) {
      const warnings = this.checkCommunicationEventWarnings(result.data);
      
      this.logger.debug('Communication event validation successful', {
        eventId: result.data.id,
        platform: result.data.platform,
        channel: result.data.channel,
        source: context.source,
        warnings: warnings.length
      });

      return {
        isValid: true,
        data: result.data,
        errors: [],
        warnings
      };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );

      this.logger.warn('Communication event validation failed', {
        source: context.source,
        errors,
        data: this.sanitizeForLogging(data)
      });

      return {
        isValid: false,
        errors,
        warnings: []
      };
    }
  }

  validateBatch(
    events: unknown[], 
    eventType: 'git' | 'ide' | 'communication',
    context: ValidationContext
  ): {
    validEvents: any[];
    invalidEvents: Array<{ index: number; data: unknown; errors: string[] }>;
    warnings: string[];
  } {
    const validEvents: any[] = [];
    const invalidEvents: Array<{ index: number; data: unknown; errors: string[] }> = [];
    const allWarnings: string[] = [];

    events.forEach((event, index) => {
      let validationResult: ValidationResult;

      switch (eventType) {
        case 'git':
          validationResult = this.validateGitEvent(event, context);
          break;
        case 'ide':
          validationResult = this.validateIDETelemetry(event, context);
          break;
        case 'communication':
          validationResult = this.validateCommunicationEvent(event, context);
          break;
        default:
          validationResult = {
            isValid: false,
            errors: ['Unknown event type'],
            warnings: []
          };
      }

      if (validationResult.isValid) {
        validEvents.push(validationResult.data);
        allWarnings.push(...validationResult.warnings);
      } else {
        invalidEvents.push({
          index,
          data: event,
          errors: validationResult.errors
        });
      }
    });

    this.logger.info('Batch validation completed', {
      eventType,
      totalEvents: events.length,
      validEvents: validEvents.length,
      invalidEvents: invalidEvents.length,
      warnings: allWarnings.length,
      source: context.source
    });

    return {
      validEvents,
      invalidEvents,
      warnings: allWarnings
    };
  }

  private checkGitEventWarnings(event: GitEvent): string[] {
    const warnings: string[] = [];

    // Check for potentially suspicious patterns
    if (event.metadata.linesAdded && event.metadata.linesAdded > 10000) {
      warnings.push('Unusually large number of lines added');
    }

    if (event.metadata.filesChanged && event.metadata.filesChanged.length > 100) {
      warnings.push('Unusually large number of files changed');
    }

    // Check for missing optional but important metadata
    if (event.type === 'commit' && !event.metadata.commitHash) {
      warnings.push('Commit event missing commit hash');
    }

    if (event.type === 'pull_request' && !event.metadata.pullRequestId) {
      warnings.push('Pull request event missing PR ID');
    }

    return warnings;
  }

  private checkIDETelemetryWarnings(event: IDETelemetry): string[] {
    const warnings: string[] = [];

    // Check for potentially suspicious patterns
    if (event.data.keystrokeCount && event.data.keystrokeCount > 10000) {
      warnings.push('Unusually high keystroke count');
    }

    if (event.data.focusDurationMs && event.data.focusDurationMs > 8 * 60 * 60 * 1000) {
      warnings.push('Focus duration exceeds 8 hours');
    }

    // Check for missing context
    if (event.eventType === 'file_change' && !event.data.fileName) {
      warnings.push('File change event missing file name');
    }

    if (event.eventType === 'build' && !event.data.buildResult) {
      warnings.push('Build event missing build result');
    }

    return warnings;
  }

  private checkCommunicationEventWarnings(event: any): string[] {
    const warnings: string[] = [];

    // Check for potentially suspicious patterns
    if (event.content && event.content.length > 10000) {
      warnings.push('Unusually long message content');
    }

    // Check for missing context
    if (event.type === 'thread_reply' && !event.metadata?.threadId) {
      warnings.push('Thread reply missing thread ID');
    }

    return warnings;
  }

  private sanitizeForLogging(data: unknown): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data as any };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate long strings
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
      }
    }

    return sanitized;
  }
}

// Singleton instance
export const eventValidator = new EventValidator();