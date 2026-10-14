// Email-verified sign-up: the form is validated and parked as a PendingRegistration, a 6-digit code is emailed,
// and the account is only created once the right code comes back.
import { createHmac, randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma, type Role, type User } from '@prisma/client';
import { SIGNUP_CODE, type RegisterInput, type SignupStarted } from '@iitr/shared';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { safeEqual } from '../lib/auth';
import { mailer } from '../email/mailer';
import { signupCodeEmail } from '../email/templates';

const BCRYPT_ROUNDS = 10;
const MINUTE_MS = 60_000;

const NO_SIGNUP_MESSAGE = 'No sign-up is in progress for this email. Please fill in the form again.';
const TOO_MANY_ATTEMPTS_MESSAGE = 'Too many incorrect codes. Please fill in the form again.';

/** What we keep until the email is verified (the password only as a hash). */
interface PendingData {
  name: string;
  enrollmentNo: string;
  bhawan: string;
  phone: string;
  role: Role;
  passwordHash: string;
}

function newCode(): string {
  return String(randomInt(0, 10 ** SIGNUP_CODE.length)).padStart(SIGNUP_CODE.length, '0');
}

/** Keyed hash: a leaked database row can't be brute-forced back to the code without the server secret. */
function hashCode(email: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

function started(email: string): SignupStarted {
  return { email, expiresInMinutes: SIGNUP_CODE.ttlMinutes, resendAfterSeconds: SIGNUP_CODE.resendCooldownSeconds };
}

function assertCooldownOver(lastSentAt: Date) {
  const waitMs = lastSentAt.getTime() + SIGNUP_CODE.resendCooldownSeconds * 1000 - Date.now();
  if (waitMs > 0) {
    throw new AppError(429, `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.`);
  }
}

/** Sent synchronously (unlike other emails): without the code the user can't continue, so they must know if it failed. */
async function sendCode(email: string, name: string, code: string) {
  try {
    await mailer.send({ to: email, ...signupCodeEmail(name, code) });
  } catch (err) {
    console.error('[signup] sending verification code failed:', err instanceof Error ? err.message : err);
    throw new AppError(502, "We couldn't send the verification email right now. Please try again in a minute.");
  }
}

export async function startSignup(input: RegisterInput): Promise<SignupStarted> {
  const { email, password, ...profile } = input;

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError(409, 'An account with this email is already registered');
  }
  if (await prisma.user.findUnique({ where: { enrollmentNo: profile.enrollmentNo } })) {
    throw new AppError(409, 'This enrollment number is already registered');
  }

  // Housekeeping: forget sign-ups abandoned more than a day ago.
  await prisma.pendingRegistration.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * MINUTE_MS) } } });

  const existing = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (existing) assertCooldownOver(existing.lastSentAt);

  const data: PendingData = { ...profile, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) };
  const code = newCode();
  const fields = {
    data: data as unknown as Prisma.InputJsonObject,
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + SIGNUP_CODE.ttlMinutes * MINUTE_MS),
    attempts: 0,
    resendCount: 0,
    lastSentAt: new Date(),
  };
  await prisma.pendingRegistration.upsert({ where: { email }, create: { email, ...fields }, update: fields });

  try {
    await sendCode(email, profile.name, code);
  } catch (err) {
    await prisma.pendingRegistration.deleteMany({ where: { email } });
    throw err;
  }
  return started(email);
}

export async function resendSignupCode(email: string): Promise<SignupStarted> {
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (!pending) throw new AppError(404, NO_SIGNUP_MESSAGE);
  assertCooldownOver(pending.lastSentAt);
  if (pending.resendCount >= SIGNUP_CODE.maxResends) {
    await prisma.pendingRegistration.delete({ where: { id: pending.id } });
    throw new AppError(429, "You've requested too many codes. Please fill in the form again.");
  }

  const code = newCode();
  await prisma.pendingRegistration.update({
    where: { id: pending.id },
    data: {
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + SIGNUP_CODE.ttlMinutes * MINUTE_MS),
      attempts: 0,
      resendCount: { increment: 1 },
      lastSentAt: new Date(),
    },
  });
  await sendCode(email, (pending.data as unknown as PendingData).name, code);
  return started(email);
}

/** Checks the code and, only if it's right, creates the account. */
export async function verifySignup(email: string, code: string): Promise<User> {
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (!pending) throw new AppError(400, NO_SIGNUP_MESSAGE);
  if (pending.expiresAt <= new Date()) {
    throw new AppError(400, 'This code has expired. Use "Resend code" to get a new one.');
  }

  // Count the attempt atomically before comparing, so parallel guesses can't exceed the limit.
  const { count } = await prisma.pendingRegistration.updateMany({
    where: { id: pending.id, attempts: { lt: SIGNUP_CODE.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (count === 0) {
    await prisma.pendingRegistration.deleteMany({ where: { id: pending.id } });
    throw new AppError(400, TOO_MANY_ATTEMPTS_MESSAGE);
  }

  if (!safeEqual(hashCode(email, code), pending.codeHash)) {
    const left = SIGNUP_CODE.maxAttempts - (pending.attempts + 1);
    if (left <= 0) {
      await prisma.pendingRegistration.deleteMany({ where: { id: pending.id } });
      throw new AppError(400, TOO_MANY_ATTEMPTS_MESSAGE);
    }
    throw new AppError(400, `That code is incorrect. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`);
  }

  const data = pending.data as unknown as PendingData;
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: data.name,
          enrollmentNo: data.enrollmentNo,
          bhawan: data.bhawan,
          phone: data.phone,
          role: data.role,
          // Delivery partners can log in straight away but can only deliver once an admin approves them.
          partnerStatus: data.role === 'DELIVERY_PARTNER' ? 'PENDING' : null,
          passwordHash: data.passwordHash,
        },
      });
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      return user;
    });
  } catch (err) {
    // Someone registered the same email or enrollment number while this code was pending.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await prisma.pendingRegistration.deleteMany({ where: { id: pending.id } });
      throw new AppError(409, 'This email or enrollment number has just been registered by another account.');
    }
    throw err;
  }
}
