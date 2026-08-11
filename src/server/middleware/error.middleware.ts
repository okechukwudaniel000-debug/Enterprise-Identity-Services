import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/custom-errors";
import { logger } from "../logging/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || "N/A";
  const timestamp = new Date().toISOString();

  let statusCode = 500;
  let message = "An internal server error occurred. Please contact administrator.";
  let errors: any = undefined;

  // Handle custom application errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else {
    // Unhandled exception - log the error stack securely
    logger.error(`Unhandled Exception: ${err.message}`, {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    }, requestId);
  }

  // Under non-production, append the raw error message if it was a system error
  const developmentDetails = process.env.NODE_ENV !== "production" && statusCode === 500
    ? { rawMessage: err.message, stack: err.stack }
    : undefined;

  // Create unified response envelope
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(developmentDetails ? { debug: developmentDetails } : {}),
    requestId,
    timestamp,
  });
};
