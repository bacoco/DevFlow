export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export class Logger {
  private serviceName: string;
  private correlationId?: string;

  constructor(serviceName: string, correlationId?: string) {
    this.serviceName = serviceName;
    this.correlationId = correlationId;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      metadata: {
        service: this.serviceName,
        ...metadata
      },
      correlationId: this.correlationId
    };

    // In production, this would send to a centralized logging system
    console.log(JSON.stringify(entry));
  }

  withCorrelationId(correlationId: string): Logger {
    return new Logger(this.serviceName, correlationId);
  }
}