import { Router } from 'express';
import bcrypt from 'bcrypt';
import { loginSchema, registerSchema } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { AUTH_COOKIE, authCookieOptions, clearCookieOptions, signToken } from '../lib/auth';
import { toUser } from '../lib/serialize';
import { BLOCKED_MESSAGE, currentUserId, requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const BCRYPT_ROUNDS = 10;

export const authRouter = Router();

authRouter.post('/register', authRateLimit, async (req, res) => {
  const { password, ...data } = registerSchema.parse(req.body);

  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new AppError(409, 'An account with this email is already registered');
  }
  if (await prisma.user.findUnique({ where: { enrollmentNo: data.enrollmentNo } })) {
    throw new AppError(409, 'This enrollment number is already registered');
  }

  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
  });

  res.cookie(AUTH_COOKIE, signToken(user.id), authCookieOptions);
  res.status(201).json({ user: toUser(user) });
});

authRouter.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'No account found with this email');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Incorrect password');
  }
  // Checked after the password so the blocked status is only revealed to the account owner.
  if (user.isBlocked) throw new AppError(403, BLOCKED_MESSAGE);

  res.cookie(AUTH_COOKIE, signToken(user.id), authCookieOptions);
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
