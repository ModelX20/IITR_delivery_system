import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { adminAgent, createItem, loggedInAgent, loggedInUser, placeOrder, resetDb, stockOf, type Agent } from './helpers';

let admin: Agent;

beforeEach(async () => {
  await resetDb();
  admin = await adminAgent();
});
afterAll(() => prisma.$disconnect());

async function freshOrder(quantity = 2) {
  const item = await createItem({ stock: 10 });
  const student = await loggedInAgent();
  const order = await placeOrder(student, [{ itemId: item.id, quantity }]);
  return { item, student, order };
}

const setStatus = (id: string, status: string) => admin.patch(`/api/admin/orders/${id}/status`).send({ status });

describe('order status transitions', () => {
  it('follows PLACED → CONFIRMED → OUT_FOR_DELIVERY → DELIVERED and records history', async () => {
    const { order, student } = await freshOrder();

    for (const status of ['CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      const res = await setStatus(order.id, status);
      expect(res.status, status).toBe(200);
      expect(res.body.order.status).toBe(status);
    }

    const detail = await student.get(`/api/orders/${order.id}`);
    expect(detail.body.order.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      'PLACED',
      'CONFIRMED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    expect(detail.body.order.statusHistory[0].changedBy.role).toBe('STUDENT');
    expect(detail.body.order.statusHistory[1].changedBy).toEqual({ name: 'Store Admin', role: 'ADMIN' });
  });

  it.each([
    [[], 'DELIVERED'],
    [[], 'OUT_FOR_DELIVERY'],
    [[], 'PLACED'],
    [['CONFIRMED'], 'PLACED'],
    [['CONFIRMED', 'OUT_FOR_DELIVERY'], 'CANCELLED'],
    [['CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED'], 'CANCELLED'],
    [['CANCELLED'], 'PLACED'],
    [['CANCELLED'], 'CONFIRMED'],
  ])('after %j, rejects a change to %s with 400', async (path, invalid) => {
    const { order } = await freshOrder();
    for (const status of path) expect((await setStatus(order.id, status)).status).toBe(200);

    const res = await setStatus(order.id, invalid);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot change an order/);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(path.length + 1);
  });

  it('rejects an unknown status value', async () => {
    const { order } = await freshOrder();
    expect((await setStatus(order.id, 'LOST')).status).toBe(400);
  });

  it('restores stock when the admin cancels a CONFIRMED order', async () => {
    const { order, item } = await freshOrder(3);
    expect(await stockOf(item.id)).toBe(7);
    await setStatus(order.id, 'CONFIRMED');

    expect((await setStatus(order.id, 'CANCELLED')).status).toBe(200);
    expect(await stockOf(item.id)).toBe(10);
  });

  it('returns 404 for an unknown order', async () => {
    expect((await setStatus('nope', 'CONFIRMED')).status).toBe(404);
  });
});

describe('admin order list', () => {
  it('shows all users’ orders with customer details and supports filters', async () => {
    const item = await createItem({ stock: 50 });
    const asha = await loggedInUser({ name: 'Asha Verma', email: 'asha@iitr.ac.in' });
    const rahul = await loggedInUser({ name: 'Rahul Singh', email: 'rahul@iitr.ac.in' });

    const a1 = await placeOrder(asha.agent, [{ itemId: item.id, quantity: 1 }]);
    const a2 = await placeOrder(asha.agent, [{ itemId: item.id, quantity: 1 }]);
    const r1 = await placeOrder(rahul.agent, [{ itemId: item.id, quantity: 1 }]);
    await setStatus(a2.id, 'CONFIRMED');
    await prisma.order.update({ where: { id: r1.id }, data: { bhawan: 'Azad', createdAt: new Date('2026-01-10T20:00:00+05:30') } });

    const ids = async (query: string) =>
      (await admin.get(`/api/admin/orders?${query}`)).body.results.map((o: { id: string }) => o.id).sort();

    const all = await admin.get('/api/admin/orders');
    expect(all.body.total).toBe(3);
    expect(all.body.results[0].customer).toMatchObject({ name: expect.any(String), email: expect.any(String) });

    expect(await ids('status=CONFIRMED')).toEqual([a2.id]);
    expect(await ids('bhawan=Azad')).toEqual([r1.id]);
    expect(await ids('user=asha')).toEqual([a1.id, a2.id].sort());
    // Date range uses IST calendar days, "to" inclusive.
    expect(await ids('from=2026-01-10&to=2026-01-10')).toEqual([r1.id]);
    expect(await ids('to=2026-01-09')).toEqual([]);
  });

  it('paginates 20 per page', async () => {
    const item = await createItem({ stock: 100 });
    const student = await loggedInAgent();
    for (let i = 0; i < 21; i++) await placeOrder(student, [{ itemId: item.id, quantity: 1 }]);

    const page2 = await admin.get('/api/admin/orders?page=2');
    expect(page2.body).toMatchObject({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
    expect(page2.body.results).toHaveLength(1);
  });

  it('shows full order details including customer contact and history', async () => {
    const { order } = await freshOrder();
    const res = await admin.get(`/api/admin/orders/${order.id}`);

    expect(res.status).toBe(200);
    expect(res.body.order.customer).toMatchObject({ phone: '9876543210', enrollmentNo: expect.any(String) });
    expect(res.body.order.statusHistory).toHaveLength(1);
  });

  it('counts orders by status on the dashboard', async () => {
    const { order } = await freshOrder();
    await freshOrder();
    await setStatus(order.id, 'CONFIRMED');

    const dash = await admin.get('/api/admin/dashboard');
    expect(dash.body.ordersByStatus).toMatchObject({ PLACED: 1, CONFIRMED: 1, DELIVERED: 0 });
    expect(dash.body.ordersToday).toBe(2);
    expect(dash.body.recentOrders).toHaveLength(2);
  });
});

describe('admin users', () => {
  it('lists users with search and role filters', async () => {
    await loggedInUser({ name: 'Priya Rao', email: 'priya@iitr.ac.in' });
    await loggedInUser({ name: 'Delivery Dev' }, 'DELIVERY_PARTNER');

    const search = await admin.get('/api/admin/users?search=priya');
    expect(search.body.results.map((u: { name: string }) => u.name)).toEqual(['Priya Rao']);
    expect(search.body.results[0]).toMatchObject({ isBlocked: false, orderCount: 0, role: 'STUDENT' });
    expect(search.body.results[0]).not.toHaveProperty('passwordHash');

    const partners = await admin.get('/api/admin/users?role=DELIVERY_PARTNER');
    expect(partners.body.results.map((u: { name: string }) => u.name)).toEqual(['Delivery Dev']);
  });

  it("changes a user's role", async () => {
    const { id } = await loggedInUser();
    const res = await admin.patch(`/api/admin/users/${id}/role`).send({ role: 'DELIVERY_PARTNER' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('DELIVERY_PARTNER');
    expect((await admin.patch(`/api/admin/users/${id}/role`).send({ role: 'SUPERUSER' })).status).toBe(400);
  });

  it('does not let an admin demote or block themselves', async () => {
    const me = await loggedInUser({}, 'ADMIN');

    const demote = await me.agent.patch(`/api/admin/users/${me.id}/role`).send({ role: 'STUDENT' });
    expect(demote.status).toBe(400);
    const block = await me.agent.patch(`/api/admin/users/${me.id}/block`).send({ isBlocked: true });
    expect(block.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.id } })).role).toBe('ADMIN');
  });

  it('returns 404 for an unknown user', async () => {
    expect((await admin.patch('/api/admin/users/nope/block').send({ isBlocked: true })).status).toBe(404);
  });
});
