export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class LoggerService {
  private context: string;

  constructor(context: string = 'System') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, metadata?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, metadata));
    }
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    console.log(this.formatMessage(LogLevel.INFO, message, metadata));
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, metadata));
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, metadata));
  }
}

export const logger = new LoggerService('ARP-Backend');
