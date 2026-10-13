import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { googleAuth, type GoogleProfile } from '../src/services/google';
import { app, createItem, loggedInUser, resetDb, sentEmails, type Agent } from './helpers';

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const CLIENT = 'http://localhost:5173';

function profile(overrides: Partial<GoogleProfile> = {}): GoogleProfile {
  return { sub: 'google-123', email: 'asha@iitr.ac.in', emailVerified: true, name: 'Asha Verma', ...overrides };
}

/** Runs the whole redirect dance with Google stubbed out. Returns the agent and the final redirect target. */
async function googleLogin(googleProfile: GoogleProfile | Error, agent: Agent = request.agent(app)) {
  const stub = vi.spyOn(googleAuth, 'profileFromCode');
  if (googleProfile instanceof Error) stub.mockRejectedValue(googleProfile);
  else stub.mockResolvedValue(googleProfile);

  const start = await agent.get('/api/auth/google');
  expect(start.status).toBe(302);
  const state = new URL(start.headers.location).searchParams.get('state')!;

  const callback = await agent.get(`/api/auth/google/callback?code=fake-code&state=${state}`);
  expect(callback.status).toBe(302);
  return { agent, location: callback.headers.location as string, callback };
}

const hasSessionCookie = (res: request.Response) => String(res.headers['set-cookie'] ?? '').includes('token=ey');

describe('Google sign-in', () => {
  it('starts by redirecting to Google with a state cookie', async () => {
    const res = await request(app).get('/api/auth/google');

    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.host).toBe('accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(url.searchParams.get('scope')).toContain('email');
    const state = url.searchParams.get('state');
    expect(String(res.headers['set-cookie'])).toContain(`oauth_state=${state}`);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
  });

  it('creates a new student, sends them to complete their profile, and blocks ordering until they do', async () => {
    const { agent, location } = await googleLogin(profile());

    expect(location).toBe(`${CLIENT}/complete-profile`);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toMatchObject({ email: 'asha@iitr.ac.in', name: 'Asha Verma', role: 'STUDENT', profileComplete: false, enrollmentNo: null });

    // Browsing is fine, ordering is not.
    expect((await agent.get('/api/items')).status).toBe(200);
    const cart = await agent.get('/api/cart');
    expect(cart.status).toBe(403);
    expect(cart.body.error).toMatch(/complete your profile/);

    const done = await agent.patch('/api/auth/profile').send({ enrollmentNo: '22114001', bhawan: 'Ganga', phone: '9876501234' });
    expect(done.status).toBe(200);
    expect(done.body.user.profileComplete).toBe(true);

    const item = await createItem();
    expect((await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 })).status).toBe(201);
  });

  it('sends a welcome email only on the first sign-in', async () => {
    await googleLogin(profile());
    await googleLogin(profile());

    const welcome = (await sentEmails()).filter((e) => e.subject === 'Welcome to IITR Delivery');
    expect(welcome).toHaveLength(1);
    expect(welcome[0].to).toBe('asha@iitr.ac.in');
  });

  it('accepts Gmail accounts', async () => {
    const { location } = await googleLogin(profile({ email: 'someone@gmail.com', sub: 'g-gmail' }));
    expect(location).toBe(`${CLIENT}/complete-profile`);
  });

  it.each([
    ['other domains', profile({ email: 'someone@yahoo.com' }), 'google_domain'],
    ['lookalike domains', profile({ email: 'x@gmail.com.evil.io' }), 'google_domain'],
    ['unverified emails', profile({ emailVerified: false }), 'google_unverified'],
  ])('rejects %s without creating an account', async (_label, googleProfile, error) => {
    const { location, callback } = await googleLogin(googleProfile);

    expect(location).toBe(`${CLIENT}/login?error=${error}`);
    expect(hasSessionCookie(callback)).toBe(false);
    expect(await prisma.user.count()).toBe(0);
  });

  it('links to an existing account with the same email, keeping its data and password', async () => {
    const existing = await loggedInUser({ email: 'asha@iitr.ac.in', password: 'my-password' });

    const { agent, location } = await googleLogin(profile());

    expect(location).toBe(`${CLIENT}/`);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toMatchObject({ id: existing.id, profileComplete: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).googleId).toBe('google-123');
    expect(await prisma.user.count()).toBe(1);
    expect((await request(app).post('/api/auth/login').send({ email: 'asha@iitr.ac.in', password: 'my-password' })).status).toBe(200);
  });

  it('refuses to link an email that is already linked to a different Google account', async () => {
    await googleLogin(profile({ sub: 'first-google-account' }));
    const { location } = await googleLogin(profile({ sub: 'second-google-account' }));
    expect(location).toBe(`${CLIENT}/login?error=google_mismatch`);
  });

  it("sends admins to the admin panel", async () => {
    const admin = await loggedInUser({ email: 'boss@iitr.ac.in' }, 'ADMIN');
    void admin;
    const { location } = await googleLogin(profile({ email: 'boss@iitr.ac.in' }));
    expect(location).toBe(`${CLIENT}/admin`);
  });

  it('rejects blocked users', async () => {
    const { id } = await loggedInUser({ email: 'asha@iitr.ac.in' });
    await prisma.user.update({ where: { id }, data: { isBlocked: true } });

    const { location, callback } = await googleLogin(profile());
    expect(location).toBe(`${CLIENT}/login?error=blocked`);
    expect(hasSessionCookie(callback)).toBe(false);
  });

  it('rejects a callback whose state does not match the cookie (CSRF)', async () => {
    const stub = vi.spyOn(googleAuth, 'profileFromCode').mockResolvedValue(profile());
    const agent = request.agent(app);
    await agent.get('/api/auth/google');

    const forged = await agent.get('/api/auth/google/callback?code=fake-code&state=attacker-chosen-state');
    expect(forged.headers.location).toBe(`${CLIENT}/login?error=google_state`);

    const noCookie = await request(app).get('/api/auth/google/callback?code=fake-code&state=anything');
    expect(noCookie.headers.location).toBe(`${CLIENT}/login?error=google_state`);

    expect(stub).not.toHaveBeenCalled();
  });

  it('handles the user cancelling on Google, and Google errors', async () => {
    const agent = request.agent(app);
    const start = await agent.get('/api/auth/google');
    const state = new URL(start.headers.location).searchParams.get('state');
    const cancelled = await agent.get(`/api/auth/google/callback?error=access_denied&state=${state}`);
    expect(cancelled.headers.location).toBe(`${CLIENT}/login?error=google_cancelled`);

    const { location } = await googleLogin(new Error('invalid_grant'));
    expect(location).toBe(`${CLIENT}/login?error=google_failed`);
  });

  it('reports whether Google sign-in is configured, and is unavailable when it is not', async () => {
    expect((await request(app).get('/api/auth/config')).body).toEqual({ googleEnabled: true });

    vi.spyOn(googleAuth, 'isEnabled').mockReturnValue(false);
    expect((await request(app).get('/api/auth/config')).body).toEqual({ googleEnabled: false });
    expect((await request(app).get('/api/auth/google')).status).toBe(404);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('validates input and rejects an enrollment number used by someone else', async () => {
    await loggedInUser({ enrollmentNo: '22114001' });
    const { agent } = await googleLogin(profile());

    expect((await agent.patch('/api/auth/profile').send({ enrollmentNo: 'abc', bhawan: 'Ganga', phone: '9876501234' })).status).toBe(400);
    expect((await agent.patch('/api/auth/profile').send({ enrollmentNo: '22114002', bhawan: 'Hogwarts', phone: '9876501234' })).status).toBe(400);

    const taken = await agent.patch('/api/auth/profile').send({ enrollmentNo: '22114001', bhawan: 'Ganga', phone: '9876501234' });
    expect(taken.status).toBe(409);
  });

  it('requires login', async () => {
    expect((await request(app).patch('/api/auth/profile').send({})).status).toBe(401);
  });
});
