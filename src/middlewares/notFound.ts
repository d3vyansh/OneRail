import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/AppError';

// Registered after all routes, before the error handler. Anything that
// falls through to here didn't match any route.
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
