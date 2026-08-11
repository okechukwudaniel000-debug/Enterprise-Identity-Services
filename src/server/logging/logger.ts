export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  SECURITY = "SECURITY",
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  message: string;
  context?: Record<string, any>;
}

class StructuredLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;

  private formatMessage(entry: LogEntry): string {
    const timestampStr = entry.timestamp;
    const reqIdStr = entry.requestId ? ` [Req: ${entry.requestId}]` : "";
    const ctxStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : "";
    
    let levelColor = "\x1b[36m"; // Cyan
    if (entry.level === LogLevel.WARN) levelColor = "\x1b[33m"; // Yellow
    if (entry.level === LogLevel.ERROR) levelColor = "\x1b[31m"; // Red
    if (entry.level === LogLevel.SECURITY) levelColor = "\x1b[35m"; // Magenta
    const resetColor = "\x1b[0m";

    return `${levelColor}[${entry.level}]${resetColor} ${timestampStr}${reqIdStr} - ${entry.message}${ctxStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, requestId?: string) {
    const entry: LogEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level,
      requestId,
      message,
      context,
    };

    // Keep logs in memory for the developer explorer console
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Print to stdout/stderr
    if (process.env.NODE_ENV !== "test") {
      if (level === LogLevel.ERROR) {
        console.error(this.formatMessage(entry));
      } else {
        console.log(this.formatMessage(entry));
      }
    }
  }

  public info(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.INFO, message, context, requestId);
  }

  public warn(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.WARN, message, context, requestId);
  }

  public error(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.ERROR, message, context, requestId);
  }

  public security(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.SECURITY, message, context, requestId);
  }

  public getInMemoryLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const logger = new StructuredLogger();
