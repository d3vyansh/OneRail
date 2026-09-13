import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const auth = function (req: Request, _res: Response, next: NextFunction): void {
  const tokenHeader = req.headers.token;
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

  if (!token) {
    throw new UnauthorizedError('Access Denied. No token provided.');
  }

  try {
    const decodedData = jwt.verify(token, JWT_SECRET) as { id: string };
    req.userId = decodedData.id;
    next();
  } catch (error) {
    throw new ForbiddenError('Invalid Token');
  }
};
