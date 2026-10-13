import type { NextFunction, Request, Response } from 'express';
import type { PartnerStatus, Role } from '@prisma/client';
import { AUTH_COOKIE, clearCookieOptions, isProfileComplete, verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  role: Role;
  partnerStatus: PartnerStatus | null;
  profileComplete: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const BLOCKED_MESSAGE = 'Your account has been blocked. Please contact the admin.';

export const INCOMPLETE_PROFILE_MESSAGE = 'Please complete your profile (enrollment number, bhawan and phone) before ordering.';

/**
 * Verifies the session cookie and loads the user's current role, blocked flag and token version from the
 * database, so role changes, blocks and password resets take effect on the very next request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const session = token ? verifyToken(token) : null;
  if (!session) throw new AppError(401, 'Please log in to continue');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, partnerStatus: true, isBlocked: true, tokenVersion: true, enrollmentNo: true, phone: true, bhawan: true },
  });
  if (!user || user.tokenVersion !== session.version) {
    res.clearCookie(AUTH_COOKIE, clearCookieOptions);
    throw new AppError(401, user ? 'Your session has expired. Please log in again.' : 'Please log in to continue');
  }
  if (user.isBlocked) {
    res.clearCookie(AUTH_COOKIE, clearCookieOptions);
    throw new AppError(403, BLOCKED_MESSAGE);
  }

  req.user = { id: user.id, role: user.role, partnerStatus: user.partnerStatus, profileComplete: isProfileComplete(user) };
  next();
}

/** Delivery routes: the user must be a delivery partner whose application an admin has approved. Use after requireAuth. */
export function requireApprovedPartner(req: Request, _res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (user.role !== 'DELIVERY_PARTNER') throw new AppError(403, "You don't have permission to do that");
  if (user.partnerStatus !== 'APPROVED') {
    throw new AppError(403, user.partnerStatus === 'REJECTED'
      ? 'Your delivery partner application was not approved.'
      : 'Your delivery partner account is waiting for admin approval.');
  }
  next();
}

/** Blocks ordering until a Google sign-up has added enrollment number, bhawan and phone. Use after requireAuth. */
export function requireCompleteProfile(req: Request, _res: Response, next: NextFunction) {
  if (!currentUser(req).profileComplete) throw new AppError(403, INCOMPLETE_PROFILE_MESSAGE);
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
