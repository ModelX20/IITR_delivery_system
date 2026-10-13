import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { adminAgent, app, createItem, loggedInUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const ADMIN_ROUTES: [method: 'get' | 'post' | 'patch' | 'delete', path: string][] = [
  ['get', '/api/admin/dashboard'],
  ['get', '/api/admin/settings'],
  ['patch', '/api/admin/settings'],
  ['get', '/api/admin/items'],
  ['post', '/api/admin/items'],
  ['patch', '/api/admin/items/some-id'],
  ['delete', '/api/admin/items/some-id'],
  ['get', '/api/admin/orders'],
  ['get', '/api/admin/orders/some-id'],
  ['patch', '/api/admin/orders/some-id/status'],
  ['get', '/api/admin/users'],
  ['patch', '/api/admin/users/some-id/role'],
  ['patch', '/api/admin/users/some-id/block'],
];

describe('role-based access', () => {
  it('rejects every admin route without login (401)', async () => {
    for (const [method, path] of ADMIN_ROUTES) {
      const res = await request(app)[method](path).send({});
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it.each(['STUDENT', 'DELIVERY_PARTNER'] as const)('rejects every admin route for %s (403)', async (role) => {
    const { agent } = await loggedInUser({}, role);
    for (const [method, path] of ADMIN_ROUTES) {
      const res = await agent[method](path).send({ status: 'CONFIRMED', role: 'ADMIN', isBlocked: false });
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(res.body).toEqual({ error: "You don't have permission to do that" });
    }
  });

  it.each(['DELIVERY_PARTNER', 'ADMIN'] as const)('blocks %s from shopping routes (students only)', async (role) => {
    const item = await createItem();
    const { agent } = await loggedInUser({}, role);

    expect((await agent.get('/api/items')).status).toBe(403);
    expect((await agent.get('/api/cart')).status).toBe(403);
    expect((await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 })).status).toBe(403);
    expect((await agent.get('/api/orders')).status).toBe(403);
    expect((await agent.post('/api/orders').send({ bhawan: 'Azad', roomNo: '1' })).status).toBe(403);
  });

  it('applies a role change on the next request, without logging in again', async () => {
    const { agent, id } = await loggedInUser();
    expect((await agent.get('/api/admin/dashboard')).status).toBe(403);

    await prisma.user.update({ where: { id }, data: { role: 'ADMIN' } });

    expect((await agent.get('/api/admin/dashboard')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user.role).toBe('ADMIN');
  });

  it('returns the role from /me and login', async () => {
    const { agent, email, password } = await loggedInUser({}, 'DELIVERY_PARTNER');
    expect((await agent.get('/api/auth/me')).body.user.role).toBe('DELIVERY_PARTNER');

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.body.user.role).toBe('DELIVERY_PARTNER');
  });
});

describe('blocked users', () => {
  it('cannot log in, and get a clear message', async () => {
    const { id, email, password } = await loggedInUser();
    await prisma.user.update({ where: { id }, data: { isBlocked: true } });

    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/blocked/);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('do not learn they are blocked from a wrong password', async () => {
    const { id, email } = await loggedInUser();
    await prisma.user.update({ where: { id }, data: { isBlocked: true } });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Incorrect password' });
  });

  it('lose access immediately on an existing session, and the cookie is cleared', async () => {
    const admin = await adminAgent();
    const { agent, id } = await loggedInUser();
    expect((await agent.get('/api/cart')).status).toBe(200);

    expect((await admin.patch(`/api/admin/users/${id}/block`).send({ isBlocked: true })).status).toBe(200);

    const res = await agent.get('/api/cart');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/blocked/);
    expect(String(res.headers['set-cookie'])).toMatch(/token=;/);
  });

  it('can log in again after being unblocked', async () => {
    const admin = await adminAgent();
    const { id, email, password } = await loggedInUser();
    await admin.patch(`/api/admin/users/${id}/block`).send({ isBlocked: true });
    await admin.patch(`/api/admin/users/${id}/block`).send({ isBlocked: false });

    expect((await request(app).post('/api/auth/login').send({ email, password })).status).toBe(200);
  });
});
