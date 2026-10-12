import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env, isProduction } from '../config/env';

export const AUTH_COOKIE = 'token';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export const authCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: TOKEN_TTL_SECONDS * 1000,
};

export const clearCookieOptions: CookieOptions = baseCookieOptions;

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

/** Returns the user id from a valid token, or null if it is missing, expired or tampered with. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
