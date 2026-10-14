import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { mailer } from '../src/email/mailer';
import { app, latestSignupCode, register, resetDb, sentEmails, userData } from './helpers';

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const start = (data: Record<string, string>) => request(app).post('/api/auth/register').send(data);
const verify = (email: string, code: string, agent = request.agent(app)) =>
  agent.post('/api/auth/register/verify').send({ email, code });
const resend = (email: string) => request(app).post('/api/auth/register/resend').send({ email });

/** Pretend the last code was sent long enough ago to allow a resend. */
const skipCooldown = (email: string) =>
  prisma.pendingRegistration.update({ where: { email }, data: { lastSentAt: new Date(Date.now() - 61_000) } });

const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

describe('sign-up with an emailed code', () => {
  it('emails a 6-digit code and creates no account until it is verified', async () => {
    const data = userData({ email: 'asha@iitr.ac.in', name: 'Asha Verma' });

    const res = await start(data);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'asha@iitr.ac.in', expiresInMinutes: 10, resendAfterSeconds: 60 });
    expect(await prisma.user.count()).toBe(0);
    expect(res.headers['set-cookie']).toBeUndefined();

    const mail = (await sentEmails()).find((e) => e.to === 'asha@iitr.ac.in')!;
    expect(mail.subject).toMatch(/^\d{6} is your IITR Delivery verification code$/);
    expect(mail.text).toContain('expires in 10 minutes');
  });

  it('creates the account and logs in only with the right code', async () => {
    const data = userData({ email: 'asha@iitr.ac.in', role: 'DELIVERY_PARTNER' });
    await start(data);
    const agent = request.agent(app);

    const res = await verify(data.email, latestSignupCode(data.email), agent);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'asha@iitr.ac.in', role: 'DELIVERY_PARTNER', partnerStatus: 'PENDING' });
    expect(String(res.headers['set-cookie'])).toMatch(/^token=.*HttpOnly/i);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect(await prisma.pendingRegistration.count()).toBe(0);
    // The password still works for normal login: no code needed there.
    const login = await request(app).post('/api/auth/login').send({ email: data.email, password: data.password });
    expect(login.status).toBe(200);
  });

  it('stores only a hash of the code and of the password', async () => {
    const data = userData();
    await start(data);
    const code = latestSignupCode(data.email);

    const row = await prisma.pendingRegistration.findUniqueOrThrow({ where: { email: data.email } });
    expect(row.codeHash).not.toContain(code);
    expect(JSON.stringify(row.data)).not.toContain(data.password);
  });

  it('rejects a wrong code, counts down attempts, and cancels after 5 wrong tries', async () => {
    const data = userData();
    await start(data);
    const code = latestSignupCode(data.email);

    const first = await verify(data.email, wrongCode(code));
    expect(first.status).toBe(400);
    expect(first.body.error).toBe('That code is incorrect. 4 attempts left.');

    for (let i = 0; i < 3; i++) await verify(data.email, wrongCode(code));
    const last = await verify(data.email, wrongCode(code));
    expect(last.body.error).toMatch(/Too many incorrect codes/);

    // Even the right code no longer works: they must fill in the form again.
    const tooLate = await verify(data.email, code);
    expect(tooLate.status).toBe(400);
    expect(tooLate.body.error).toMatch(/fill in the form again/);
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects an expired code', async () => {
    const data = userData();
    await start(data);
    await prisma.pendingRegistration.update({ where: { email: data.email }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await verify(data.email, latestSignupCode(data.email));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/);
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects badly formatted codes and unknown emails', async () => {
    expect((await verify('nobody@iitr.ac.in', '123456')).body.error).toMatch(/No sign-up is in progress/);
    const data = userData();
    await start(data);
    expect((await verify(data.email, '12345')).status).toBe(400);
    expect((await verify(data.email, 'abcdef')).status).toBe(400);
  });

  it('resends a new code after the cooldown, and the old code stops working', async () => {
    const data = userData();
    await start(data);
    const oldCode = latestSignupCode(data.email);

    const tooSoon = await resend(data.email);
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.error).toMatch(/Please wait \d+ seconds/);

    await skipCooldown(data.email);
    expect((await resend(data.email)).status).toBe(200);
    const newCode = latestSignupCode(data.email);

    if (newCode !== oldCode) expect((await verify(data.email, oldCode)).status).toBe(400);
    expect((await verify(data.email, newCode)).status).toBe(201);
  });

  it('limits how many codes can be requested', async () => {
    const data = userData();
    await start(data);
    for (let i = 0; i < 5; i++) {
      await skipCooldown(data.email);
      expect((await resend(data.email)).status).toBe(200);
    }
    await skipCooldown(data.email);
    const res = await resend(data.email);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many codes/);
  });

  it('re-submitting the form is refused during the cooldown, then replaces the pending sign-up', async () => {
    const data = userData();
    await start(data);
    expect((await start({ ...data, name: 'Changed Name' })).status).toBe(429);

    await skipCooldown(data.email);
    expect((await start({ ...data, name: 'Changed Name' })).status).toBe(200);
    const res = await verify(data.email, latestSignupCode(data.email));
    expect(res.body.user.name).toBe('Changed Name');
  });

  it('refuses emails and enrollment numbers that are already registered, before sending anything', async () => {
    const taken = userData({ email: 'taken@iitr.ac.in', enrollmentNo: '22114001' });
    await register(request.agent(app), taken);
    const before = (await sentEmails()).length;

    expect((await start(userData({ email: 'taken@iitr.ac.in' }))).status).toBe(409);
    expect((await start(userData({ enrollmentNo: '22114001' }))).status).toBe(409);
    expect((await sentEmails()).length).toBe(before);
  });

  it('never allows signing up as admin', async () => {
    const res = await start(userData({ role: 'ADMIN' }));
    expect(res.status).toBe(400);
    expect(await prisma.pendingRegistration.count()).toBe(0);
  });

  it('tells the user when the code email could not be sent, and keeps nothing', async () => {
    vi.spyOn(mailer, 'send').mockRejectedValue(new Error('SMTP down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await start(userData());

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/couldn't send the verification email/);
    expect(await prisma.pendingRegistration.count()).toBe(0);
  });

  it('handles the email being registered by someone else while the code was pending', async () => {
    const data = userData({ email: 'race@iitr.ac.in' });
    await start(data);
    await prisma.user.create({ data: { name: 'Someone', email: 'race@iitr.ac.in' } });

    const res = await verify(data.email, latestSignupCode(data.email));
    expect(res.status).toBe(409);
  });
});
