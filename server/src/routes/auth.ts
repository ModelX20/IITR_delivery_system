import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import {
  PASSWORD_RESET_TTL_MINUTES,
  ROLE_HOME,
  completeProfileSchema,
  forgotPasswordSchema,
  isAllowedGoogleEmail,
  loginSchema,
  registerSchema,
  resendSignupCodeSchema,
  resetPasswordSchema,
  verifySignupSchema,
  type AuthConfig,
} from '@iitr/shared';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { runInBackground } from '../lib/background';
import {
  AUTH_COOKIE,
  OAUTH_STATE_COOKIE,
  clearCookieOptions,
  isProfileComplete,
  oauthStateCookieOptions,
  randomToken,
  safeEqual,
  sha256,
  startSession,
} from '../lib/auth';
import { toUser } from '../lib/serialize';
import { BLOCKED_MESSAGE, currentUserId, requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { notifyPasswordReset, notifyWelcome } from '../email/notify';
import { googleAuth } from '../services/google';
import { resendSignupCode, startSignup, verifySignup } from '../services/signup';

const BCRYPT_ROUNDS = 10;

export const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. It expires in 30 minutes.";
const INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.';

export const authRouter = Router();

authRouter.get('/config', (_req, res) => {
  const config: AuthConfig = { googleEnabled: googleAuth.isEnabled() };
  res.json(config);
});

// ---------- Email + password ----------

// Sign-up is two steps: /register emails a 6-digit code, /register/verify creates the account if it's right.
authRouter.post('/register', authRateLimit, async (req, res) => {
  res.json(await startSignup(registerSchema.parse(req.body)));
});

authRouter.post('/register/resend', authRateLimit, async (req, res) => {
  const { email } = resendSignupCodeSchema.parse(req.body);
  res.json(await resendSignupCode(email));
});

authRouter.post('/register/verify', authRateLimit, async (req, res) => {
  const { email, code } = verifySignupSchema.parse(req.body);
  const user = await verifySignup(email, code);

  startSession(res, user);
  notifyWelcome(user);
  res.status(201).json({ user: toUser(user) });
});

authRouter.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'No account found with this email');
  if (!user.passwordHash) {
    throw new AppError(401, 'This account uses Google sign-in. Sign in with Google, or use "Forgot password?" to set a password.');
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Incorrect password');
  }
  // Checked after the password so the blocked status is only revealed to the account owner.
  if (user.isBlocked) throw new AppError(403, BLOCKED_MESSAGE);

  startSession(res, user);
  res.json({ user: toUser(user) });
});

authRouter.post('/logout', requireAuth, (_req, res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  // requireAuth has already checked that the user exists and is not blocked.
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUserId(req) } });
  res.json({ user: toUser(user) });
});

/** Google sign-ups add these before they can order. Also lets anyone update them later. */
authRouter.patch('/profile', requireAuth, async (req, res) => {
  const data = completeProfileSchema.parse(req.body);
  const userId = currentUserId(req);

  const taken = await prisma.user.findFirst({ where: { enrollmentNo: data.enrollmentNo, NOT: { id: userId } } });
  if (taken) throw new AppError(409, 'This enrollment number is already registered');

  const user = await prisma.user.update({ where: { id: userId }, data });
  res.json({ user: toUser(user) });
});

// ---------- Forgot / reset password ----------

authRouter.post('/forgot-password', authRateLimit, async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  // Respond first and do the lookup in the background, so neither the message nor the
  // response time reveals whether an account exists for this email.
  res.json({ message: FORGOT_PASSWORD_MESSAGE });

  runInBackground('forgot password', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isBlocked) return;

    const token = randomToken();
    await prisma.$transaction([
      // Only the newest link works.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
        },
      }),
    ]);
    notifyPasswordReset(user, `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`);
  });
});

authRouter.post('/reset-password', authRateLimit, async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new AppError(400, INVALID_RESET_MESSAGE);

    // Conditional update makes the token single-use even if two resets race.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw new AppError(400, INVALID_RESET_MESSAGE);

    // New password, and every existing session (on any device) is logged out.
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
  });

  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: 'Your password has been reset. Please log in with your new password.' });
});

// ---------- Google sign-in ----------

/** Error codes the login page knows how to explain. */
type GoogleError = 'google_cancelled' | 'google_state' | 'google_failed' | 'google_unverified' | 'google_domain' | 'google_mismatch' | 'blocked';

function loginRedirect(res: Response, error: GoogleError) {
  res.redirect(`${env.CLIENT_URL}/login?error=${error}`);
}

authRouter.get('/google', authRateLimit, (_req, res) => {
  if (!googleAuth.isEnabled()) throw new AppError(404, 'Google sign-in is not configured');

  const state = randomToken();
  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);
  res.redirect(googleAuth.authUrl(state));
});

authRouter.get('/google/callback', authRateLimit, async (req, res) => {
  if (!googleAuth.isEnabled()) throw new AppError(404, 'Google sign-in is not configured');

  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { ...oauthStateCookieOptions, maxAge: undefined });

  const { code, state, error } = req.query;
  if (error) return loginRedirect(res, 'google_cancelled');
  if (typeof state !== 'string' || typeof expectedState !== 'string' || !safeEqual(state, expectedState)) {
    return loginRedirect(res, 'google_state');
  }
  if (typeof code !== 'string' || !code) return loginRedirect(res, 'google_failed');

  let profile;
  try {
    profile = await googleAuth.profileFromCode(code);
  } catch (err) {
    console.error('[google] code exchange failed:', err instanceof Error ? err.message : err);
    return loginRedirect(res, 'google_failed');
  }
  if (!profile.emailVerified) return loginRedirect(res, 'google_unverified');
  if (!isAllowedGoogleEmail(profile.email)) return loginRedirect(res, 'google_domain');

  let user: User | null = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing?.googleId) return loginRedirect(res, 'google_mismatch'); // email already linked to another Google account
    user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { googleId: profile.sub } }) // link
      : await prisma.user.create({ data: { name: profile.name, email: profile.email, googleId: profile.sub } });
    if (!existing) notifyWelcome(user);
  }
  if (user.isBlocked) return loginRedirect(res, 'blocked');

  startSession(res, user);
  const next = user.role === 'STUDENT' && !isProfileComplete(user) ? '/complete-profile' : ROLE_HOME[user.role];
  res.redirect(`${env.CLIENT_URL}${next}`);
});
