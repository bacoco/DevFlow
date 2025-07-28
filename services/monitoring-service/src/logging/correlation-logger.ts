import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for correlation context
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

interface CorrelationContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  service: string;
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  correlationId: string;
  service: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  metadata?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class CorrelationLogger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          const context = correlationStorage.getStore();
          const logEntry: LogEntry = {
            level: info.level,
            message: info.message,
            timestamp: info.timestamp,
            correlationId: context?.correlationId || 'no-correlation',
            service: context?.service || this.serviceName,
            userId: context?.userId,
            sessionId: context?.sessionId,
            requestId: context?.requestId,
            traceId: context?.traceId,
            metadata: info.metadata,
            ...(info.error && typeof info.error === 'object' && 'name' in info.error && {
              error: {
                name: (info.error as Error).name,
                message: (info.error as Error).message,
                stack: (info.error as Error).stack
              }
            })
          };

          return JSON.stringify(logEntry);
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => {
              const context = correlationStorage.getStore();
              const correlationId = context?.correlationId || 'no-correlation';
              const service = context?.service || this.serviceName;
              return `[${info.timestamp}] [${service}] [${correlationId}] ${info.level}: ${info.message}`;
            })
          )
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.json()
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json()
        })
      ]
    });
  }

  // Create correlation context and run callback within it
  public withCorrelation<T>(
    context: Partial<CorrelationContext>,
    callback: () => T
  ): T {
    const fullContext: CorrelationContext = {
      correlationId: context.correlationId || uuidv4(),
      service: context.service || this.serviceName,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      traceId: context.traceId
    };

    return correlationStorage.run(fullContext, callback);
  }

  // Create correlation context for async operations
  public async withCorrelationAsync<T>(
    context: Partial<CorrelationContext>,
    callback: () => Promise<T>
  ): Promise<T> {
    const fullContext: CorrelationContext = {
      correlationId: context.correlationId || uuidv4(),
      service: context.service || this.serviceName,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      traceId: context.traceId
    };

    return correlationStorage.run(fullContext, callback);
  }

  // Get current correlation context
  public getContext(): CorrelationContext | undefined {
    return correlationStorage.getStore();
  }

  // Update current correlation context
  public updateContext(updates: Partial<CorrelationContext>): void {
    const current = correlationStorage.getStore();
    if (current) {
      Object.assign(current, updates);
    }
  }

  // Logging methods with correlation context
  public info(message: string, metadata?: any): void {
    this.logger.info(message, { metadata });
  }

  public error(message: string, error?: Error, metadata?: any): void {
    this.logger.error(message, { error, metadata });
  }

  public warn(message: string, metadata?: any): void {
    this.logger.warn(message, { metadata });
  }

  public debug(message: string, metadata?: any): void {
    this.logger.debug(message, { metadata });
  }

  public verbose(message: string, metadata?: any): void {
    this.logger.verbose(message, { metadata });
  }

  // Structured logging for specific events
  public logApiRequest(method: string, path: string, statusCode: number, duration: number, metadata?: any): void {
    this.info('API Request', {
      event: 'api_request',
      method,
      path,
      statusCode,
      duration,
      ...metadata
    });
  }

  public logDatabaseQuery(operation: string, collection: string, duration: number, metadata?: any): void {
    this.info('Database Query', {
      event: 'database_query',
      operation,
      collection,
      duration,
      ...metadata
    });
  }

  public logBusinessEvent(eventType: string, entityId: string, metadata?: any): void {
    this.info('Business Event', {
      event: 'business_event',
      eventType,
      entityId,
      ...metadata
    });
  }

  public logSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: any): void {
    this.warn('Security Event', {
      event: 'security_event',
      eventType,
      severity,
      ...metadata
    });
  }

  public logPerformanceMetric(metricName: string, value: number, unit: string, metadata?: any): void {
    this.info('Performance Metric', {
      event: 'performance_metric',
      metricName,
      value,
      unit,
      ...metadata
    });
  }

  // Create child logger with additional context
  public child(additionalContext: Partial<CorrelationContext>): CorrelationLogger {
    const childLogger = new CorrelationLogger(this.serviceName);
    const currentContext = this.getContext();
    
    if (currentContext) {
      const mergedContext = { ...currentContext, ...additionalContext };
      return {
        ...childLogger,
        getContext: () => mergedContext
      } as CorrelationLogger;
    }
    
    return childLogger;
  }
}

// Express middleware for correlation context
export function correlationMiddleware(serviceName: string) {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || 
                         req.headers['x-request-id'] || 
                         uuidv4();
    
    const context: CorrelationContext = {
      correlationId,
      service: serviceName,
      requestId: req.headers['x-request-id'],
      traceId: req.headers['x-trace-id'],
      userId: req.user?.id,
      sessionId: req.session?.id
    };

    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);

    correlationStorage.run(context, () => {
      next();
    });
  };
}

// GraphQL context enhancer
export function enhanceGraphQLContext(context: any, serviceName: string): any {
  const correlationId = context.req?.headers['x-correlation-id'] || 
                       context.req?.headers['x-request-id'] || 
                       uuidv4();

  const correlationContext: CorrelationContext = {
    correlationId,
    service: serviceName,
    requestId: context.req?.headers['x-request-id'],
    traceId: context.req?.headers['x-trace-id'],
    userId: context.user?.id,
    sessionId: context.req?.session?.id
  };

  return correlationStorage.run(correlationContext, () => context);
}

// Factory function to create service-specific loggers
export function createLogger(serviceName: string): CorrelationLogger {
  return new CorrelationLogger(serviceName);
}

export { CorrelationLogger, CorrelationContext, correlationStorage };