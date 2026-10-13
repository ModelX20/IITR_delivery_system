import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env, isProduction } from '../config/env';

export const AUTH_COOKIE = 'token';
export const OAUTH_STATE_COOKIE = 'oauth_state';
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

// Lax is required: the cookie must come back on Google's top-level redirect to our callback.
export const oauthStateCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: '/api/auth/google',
  maxAge: 10 * 60 * 1000,
};

/** The session token carries the user's tokenVersion; bumping it in the DB revokes every older token. */
export function signToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, v: tokenVersion }, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

/** Returns the user id and token version, or null if the token is missing, expired or tampered with. */
export function verifyToken(token: string): { userId: string; version: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') return null;
    // Tokens issued before versioning existed count as version 0.
    return { userId: payload.sub, version: typeof payload.v === 'number' ? payload.v : 0 };
  } catch {
    return null;
  }
}

export function startSession(res: Response, user: { id: string; tokenVersion: number }) {
  res.cookie(AUTH_COOKIE, signToken(user.id, user.tokenVersion), authCookieOptions);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Students need enrollment number, phone and bhawan before ordering (Google sign-ups start without them). */
export function isProfileComplete(user: { enrollmentNo: string | null; phone: string | null; bhawan: string | null }) {
  return Boolean(user.enrollmentNo && user.phone && user.bhawan);
}
