import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AUTH_COOKIE, clearCookieOptions, verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const BLOCKED_MESSAGE = 'Your account has been blocked. Please contact the admin.';

/**
 * Verifies the session cookie and loads the user's current role and blocked flag from the database,
 * so role changes and blocks take effect on the very next request, even for existing sessions.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const userId = token ? verifyToken(token) : null;
  if (!userId) throw new AppError(401, 'Please log in to continue');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isBlocked: true },
  });
  if (!user) {
    res.clearCookie(AUTH_COOKIE, clearCookieOptions);
    throw new AppError(401, 'Please log in to continue');
  }
  if (user.isBlocked) {
    res.clearCookie(AUTH_COOKIE, clearCookieOptions);
    throw new AppError(403, BLOCKED_MESSAGE);
  }

  req.user = { id: user.id, role: user.role };
  next();
}

/** Allows the request only if the logged-in user has one of the given roles. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'Please log in to continue');
    if (!roles.includes(req.user.role)) throw new AppError(403, "You don't have permission to do that");
    next();
  };
}

/** The authenticated user. Only call in routes behind requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, 'Please log in to continue');
  return req.user;
}

export function currentUserId(req: Request): string {
  return currentUser(req).id;
}
