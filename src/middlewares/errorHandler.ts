import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const body: { message: string; error?: unknown } = { message: err.message };
    if (err.details) {
      body.error = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Not one of our deliberate AppErrors — an unexpected failure (a bug, a
  // driver throwing something we didn't anticipate, etc). Log the real
  // error for debugging, but never leak it to the client.
  logger.error({ err }, 'Unexpected error');
  res.status(500).json({ message: 'Internal Server Error' });
};
