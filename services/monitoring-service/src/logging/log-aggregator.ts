import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { logger } from '../utils/logger';

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

interface LogQuery {
  services?: string[];
  levels?: string[];
  correlationId?: string;
  userId?: string;
  traceId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  search?: string;
}

interface LogAnalysis {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  serviceBreakdown: Record<string, number>;
  levelBreakdown: Record<string, number>;
  topErrors: Array<{ message: string; count: number; service: string }>;
  correlationTraces: Array<{ correlationId: string; services: string[]; duration: number }>;
}

export class LogAggregator extends EventEmitter {
  private logDirectory: string;
  private maxLogAge: number; // in milliseconds
  private cleanupInterval: NodeJS.Timeout;

  constructor(logDirectory: string = 'logs', maxLogAgeDays: number = 30) {
    super();
    this.logDirectory = logDirectory;
    this.maxLogAge = maxLogAgeDays * 24 * 60 * 60 * 1000;
    
    // Start cleanup process
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  public async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const logFiles = await this.getLogFiles();

    for (const logFile of logFiles) {
      const fileLogs = await this.readLogFile(logFile, query);
      logs.push(...fileLogs);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (query.limit) {
      return logs.slice(0, query.limit);
    }

    return logs;
  }

  public async getCorrelationTrace(correlationId: string): Promise<LogEntry[]> {
    return this.queryLogs({ correlationId });
  }

  public async getUserActivity(userId: string, startTime?: Date, endTime?: Date): Promise<LogEntry[]> {
    return this.queryLogs({ 
      userId, 
      startTime, 
      endTime,
      limit: 1000 
    });
  }

  public async getServiceLogs(service: string, level?: string, limit: number = 100): Promise<LogEntry[]> {
    return this.queryLogs({ 
      services: [service], 
      levels: level ? [level] : undefined,
      limit 
    });
  }

  public async analyzeLogs(startTime?: Date, endTime?: Date): Promise<LogAnalysis> {
    const logs = await this.queryLogs({ startTime, endTime });
    
    const analysis: LogAnalysis = {
      totalLogs: logs.length,
      errorCount: 0,
      warningCount: 0,
      serviceBreakdown: {},
      levelBreakdown: {},
      topErrors: [],
      correlationTraces: []
    };

    const errorMessages: Record<string, { count: number; service: string }> = {};
    const correlationTraces: Record<string, { services: Set<string>; timestamps: Date[] }> = {};

    for (const log of logs) {
      // Count by level
      analysis.levelBreakdown[log.level] = (analysis.levelBreakdown[log.level] || 0) + 1;
      
      if (log.level === 'error') {
        analysis.errorCount++;
        
        // Track error messages
        const errorKey = `${log.message}:${log.service}`;
        if (!errorMessages[errorKey]) {
          errorMessages[errorKey] = { count: 0, service: log.service };
        }
        errorMessages[errorKey].count++;
      }
      
      if (log.level === 'warn') {
        analysis.warningCount++;
      }

      // Count by service
      analysis.serviceBreakdown[log.service] = (analysis.serviceBreakdown[log.service] || 0) + 1;

      // Track correlation traces
      if (log.correlationId && log.correlationId !== 'no-correlation') {
        if (!correlationTraces[log.correlationId]) {
          correlationTraces[log.correlationId] = {
            services: new Set(),
            timestamps: []
          };
        }
        correlationTraces[log.correlationId].services.add(log.service);
        correlationTraces[log.correlationId].timestamps.push(new Date(log.timestamp));
      }
    }

    // Get top errors
    analysis.topErrors = Object.entries(errorMessages)
      .map(([message, data]) => ({
        message: message.split(':')[0],
        count: data.count,
        service: data.service
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate correlation trace durations
    analysis.correlationTraces = Object.entries(correlationTraces)
      .map(([correlationId, data]) => {
        const timestamps = data.timestamps.sort((a, b) => a.getTime() - b.getTime());
        const duration = timestamps.length > 1 
          ? timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime()
          : 0;
        
        return {
          correlationId,
          services: Array.from(data.services),
          duration
        };
      })
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20);

    return analysis;
  }

  public async searchLogs(searchTerm: string, limit: number = 100): Promise<LogEntry[]> {
    return this.queryLogs({ search: searchTerm, limit });
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDirectory);
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDirectory, file));
    } catch (error) {
      logger.error('Error reading log directory:', error);
      return [];
    }
  }

  private async readLogFile(filePath: string, query: LogQuery): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    
    try {
      const fileStream = createReadStream(filePath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        
        try {
          const logEntry: LogEntry = JSON.parse(line);
          
          if (this.matchesQuery(logEntry, query)) {
            logs.push(logEntry);
          }
        } catch (parseError) {
          // Skip malformed log lines
          continue;
        }
      }
    } catch (error) {
      logger.error(`Error reading log file ${filePath}:`, error);
    }

    return logs;
  }

  private matchesQuery(log: LogEntry, query: LogQuery): boolean {
    // Filter by services
    if (query.services && !query.services.includes(log.service)) {
      return false;
    }

    // Filter by levels
    if (query.levels && !query.levels.includes(log.level)) {
      return false;
    }

    // Filter by correlation ID
    if (query.correlationId && log.correlationId !== query.correlationId) {
      return false;
    }

    // Filter by user ID
    if (query.userId && log.userId !== query.userId) {
      return false;
    }

    // Filter by trace ID
    if (query.traceId && log.traceId !== query.traceId) {
      return false;
    }

    // Filter by time range
    const logTime = new Date(log.timestamp);
    if (query.startTime && logTime < query.startTime) {
      return false;
    }
    if (query.endTime && logTime > query.endTime) {
      return false;
    }

    // Filter by search term
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(searchLower);
      const metadataMatch = log.metadata && 
        JSON.stringify(log.metadata).toLowerCase().includes(searchLower);
      const errorMatch = log.error && 
        (log.error.message.toLowerCase().includes(searchLower) ||
         log.error.name.toLowerCase().includes(searchLower));
      
      if (!messageMatch && !metadataMatch && !errorMatch) {
        return false;
      }
    }

    return true;
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDirectory);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > this.maxLogAge) {
          await fs.unlink(filePath);
          logger.info(`Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error during log cleanup:', error);
    }
  }

  public async exportLogs(query: LogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.queryLogs(query);
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'service', 'correlationId', 'message', 'userId'];
      const csvLines = [headers.join(',')];
      
      for (const log of logs) {
        const row = [
          log.timestamp,
          log.level,
          log.service,
          log.correlationId,
          `"${log.message.replace(/"/g, '""')}"`,
          log.userId || ''
        ];
        csvLines.push(row.join(','));
      }
      
      return csvLines.join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}