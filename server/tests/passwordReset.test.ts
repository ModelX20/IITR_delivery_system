import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { app, loggedInUser, resetDb, sentEmails } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const SAME_MESSAGE = "If an account exists for that email, we've sent a link to reset your password. It expires in 30 minutes.";

async function requestReset(email: string) {
  const res = await request(app).post('/api/auth/forgot-password').send({ email });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: SAME_MESSAGE });
  const mail = (await sentEmails()).filter((e) => e.to === email && e.subject.includes('Reset'));
  if (mail.length === 0) return null;
  const link = /http:\/\/localhost:5173\/reset-password\?token=([\w%-]+)/.exec(mail.at(-1)!.text)!;
  return decodeURIComponent(link[1]);
}

const reset = (token: string, password: string) => request(app).post('/api/auth/reset-password').send({ token, password });
const login = (email: string, password: string) => request(app).post('/api/auth/login').send({ email, password });

describe('forgot password', () => {
  it('gives the same answer for unknown emails and sends nothing', async () => {
    const token = await requestReset('nobody@iitr.ac.in');
    expect(token).toBeNull();
    expect(await sentEmails()).toHaveLength(0);
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it('emails a reset link and stores only a hash of the token', async () => {
    const { email } = await loggedInUser({ email: 'asha@iitr.ac.in' });
    const token = await requestReset(email);

    expect(token).toBeTruthy();
    const stored = await prisma.passwordResetToken.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toBe(createHash('sha256').update(token!).digest('hex'));
    const minutes = (stored.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  it('does not send a link to blocked users (same response)', async () => {
    const { id, email } = await loggedInUser();
    await prisma.user.update({ where: { id }, data: { isBlocked: true } });
    expect(await requestReset(email)).toBeNull();
  });
});

describe('reset password', () => {
  it('sets the new password and logs out every existing session', async () => {
    const { agent: oldSession, email, password } = await loggedInUser();
    expect((await oldSession.get('/api/auth/me')).status).toBe(200);

    const token = await requestReset(email);
    const res = await reset(token!, 'brand-new-password');

    expect(res.status).toBe(200);
    expect((await login(email, password)).status).toBe(401);
    expect((await login(email, 'brand-new-password')).status).toBe(200);

    const stale = await oldSession.get('/api/auth/me');
    expect(stale.status).toBe(401);
    expect(stale.body.error).toMatch(/session has expired/);
  });

  it('works only once', async () => {
    const { email } = await loggedInUser();
    const token = (await requestReset(email))!;

    expect((await reset(token, 'first-new-password')).status).toBe(200);
    const again = await reset(token, 'second-new-password');
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/invalid or has expired/);
    expect((await login(email, 'first-new-password')).status).toBe(200);
  });

  it('rejects an expired token', async () => {
    const { email, password } = await loggedInUser();
    const token = (await requestReset(email))!;
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await reset(token, 'brand-new-password')).status).toBe(400);
    expect((await login(email, password)).status).toBe(200);
  });

  it('invalidates the previous link when a new one is requested', async () => {
    const { email } = await loggedInUser();
    const first = (await requestReset(email))!;
    const second = (await requestReset(email))!;

    expect((await reset(first, 'brand-new-password')).status).toBe(400);
    expect((await reset(second, 'brand-new-password')).status).toBe(200);
  });

  it('rejects made-up tokens and short passwords', async () => {
    const { email } = await loggedInUser();
    const token = (await requestReset(email))!;

    expect((await reset('x'.repeat(43), 'brand-new-password')).status).toBe(400);
    const short = await reset(token, 'short');
    expect(short.status).toBe(400);
    expect(short.body.error).toMatch(/8 characters/);
  });

  it('lets a Google-only account set a password, after which password login works', async () => {
    const user = await prisma.user.create({ data: { name: 'Gmail User', email: 'gmailuser@gmail.com', googleId: 'g-1' } });

    const before = await login('gmailuser@gmail.com', 'anything123');
    expect(before.status).toBe(401);
    expect(before.body.error).toMatch(/uses Google sign-in/);

    const token = (await requestReset(user.email))!;
    expect((await reset(token, 'my-new-password')).status).toBe(200);
    expect((await login('gmailuser@gmail.com', 'my-new-password')).status).toBe(200);
  });
});
