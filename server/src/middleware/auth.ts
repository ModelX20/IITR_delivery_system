import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE, verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    throw new AppError(401, 'Please log in to continue');
  }
  req.userId = userId;
  next();
}

/** The authenticated user's id. Only call in routes behind requireAuth. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, 'Please log in to continue');
  return req.userId;
}
