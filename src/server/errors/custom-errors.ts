export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any) {
    super(message, 400, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed. Invalid or missing credentials.") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Authorization failed. Insufficient privileges.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429);
  }
}
