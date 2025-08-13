import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'BiometricService'}] ${level}: ${message} ${metaStr}`;
  })
);

export const createLogger = (service: string): winston.Logger => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logsDir, 'biometric-service.log'),
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Error file transport
      new winston.transports.File({
        filename: path.join(logsDir, 'biometric-service-error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'biometric-service-exceptions.log')
      })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'biometric-service-rejections.log')
      })
    ]
  });
};

// Create default logger instance
export const logger = createLogger('BiometricService');

// Export log levels for convenience
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};