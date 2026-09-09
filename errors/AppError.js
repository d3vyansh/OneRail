// Base class for any error we raise deliberately, with a known HTTP status
// and a message that's safe to show to a client. `details` is optional
// structured extra info (e.g. a zod validation error) sent alongside the
// message. Anything thrown that is NOT an AppError is treated as an
// unexpected/programmer error by the centralized error handler and reduced
// to a generic "Internal Server Error" — its real message and stack never
// reach the client.
class AppError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

// Used when this server, acting as a client to an upstream API (IRCTC
// RapidAPI, AWS SES), gets back a failure or invalid response. 502 is the
// semantically correct status for "the upstream we depend on failed" — the
// caller's request to us wasn't malformed, our dependency let us down.
class BadGatewayError extends AppError {
  constructor(message = 'Bad Gateway') {
    super(message, 502);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadGatewayError,
};
