import { Request, Response, NextFunction } from "express";
import { logger } from "../logging/logger";

// Extend Express Request interface to store request ID and timestamp
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      user?: {
        id: string;
        email: string;
        role: string;
        tokenVersion: number;
        jti: string;
      };
    }
  }
}

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate request ID
  const requestId = (req.headers["x-request-id"] as string) || 
    (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
  
  req.requestId = requestId;
  req.startTime = Date.now();

  // Attach request ID to response header for client-side correlation
  res.setHeader("X-Request-ID", requestId);

  // Log request start
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "Unknown";

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip,
    userAgent,
  }, requestId);

  // Hook into response finish event to log completion status and duration
  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const level = res.statusCode >= 400 ? "warn" : "info";
    
    const context = {
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id || "anonymous",
    };

    if (res.statusCode >= 500) {
      logger.error(`Request completed with error: ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`, context, requestId);
    } else if (res.statusCode >= 400) {
      logger.warn(`Request completed with warning: ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`, context, requestId);
    } else {
      logger.info(`Request completed successfully: ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`, context, requestId);
    }
  });

  next();
};
