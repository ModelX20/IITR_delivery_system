import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { app, register, resetDb, userData } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('creates a user, sets an httpOnly cookie and never returns the password hash', async () => {
    const res = await register(request.agent(app), userData({ email: 'Asha@IITR.ac.in' }));

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@iitr.ac.in');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const stored = await prisma.user.findUnique({ where: { email: 'asha@iitr.ac.in' } });
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects an email that is not @iitr.ac.in', async () => {
    const res = await request(app).post('/api/auth/register').send(userData({ email: 'someone@gmail.com' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/iitr/i);
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects lookalike domains', async () => {
    for (const email of ['a@iitr.ac.in.evil.com', 'a@notiitr.ac.in']) {
      const res = await request(app).post('/api/auth/register').send(userData({ email }));
      expect(res.status, email).toBe(400);
    }
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send(userData({ password: 'short' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it('rejects an email that is already registered', async () => {
    await register(request.agent(app), userData({ email: 'dup@iitr.ac.in' }));
    const res = await request(app).post('/api/auth/register').send(userData({ email: 'dup@iitr.ac.in' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register(request.agent(app), userData({ email: 'login@iitr.ac.in', password: 'correct-horse' }));
  });

  it('logs in with the right password and the cookie works for /me', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email: 'login@iitr.ac.in', password: 'correct-horse' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@iitr.ac.in');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('login@iitr.ac.in');
  });

  it('returns 401 with a clear message for a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@iitr.ac.in', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Incorrect password' });
  });

  it('returns 401 for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@iitr.ac.in', password: 'whatever1' });
    expect(res.status).toBe(401);
  });

  it('logout clears the cookie so /me is rejected afterwards', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'login@iitr.ac.in', password: 'correct-horse' });

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(String(out.headers['set-cookie'])).toMatch(/token=;/);

    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('protected routes', () => {
  it('reject requests without a valid token', async () => {
    for (const path of ['/api/auth/me', '/api/items', '/api/cart', '/api/orders']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
      expect(res.body).toHaveProperty('error');
    }
    const forged = await request(app).get('/api/cart').set('Cookie', 'token=not-a-real-jwt');
    expect(forged.status).toBe(401);
  });
});
