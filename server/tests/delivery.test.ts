import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { adminAgent, app, createItem, loggedInUser, placeOrder, register, resetDb, type Agent } from './helpers';

let admin: Agent;

beforeEach(async () => {
  await resetDb();
  admin = await adminAgent();
});
afterAll(() => prisma.$disconnect());

async function approvedPartner(name = 'Arjun Mehta') {
  const partner = await loggedInUser({ name }, 'DELIVERY_PARTNER');
  await prisma.user.update({ where: { id: partner.id }, data: { partnerStatus: 'APPROVED' } });
  return partner;
}

/** A student order that an admin has confirmed, so partners can see it. */
async function confirmedOrder(quantity = 1) {
  const item = await createItem({ name: 'Veg Thali', price: '120.00', stock: 50 });
  const student = await loggedInUser({ name: 'Riya Sharma', phone: '9123456780' });
  const order = await placeOrder(student.agent, [{ itemId: item.id, quantity }]);
  await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' });
  return { order, student, item };
}

const dashboard = async (agent: Agent) => (await agent.get('/api/delivery/dashboard')).body;
const ids = (orders: { id: string }[]) => orders.map((o) => o.id);

describe('delivery partner: available orders', () => {
  it('shows only confirmed, unassigned orders, without customer contact details', async () => {
    const partner = await approvedPartner();
    const { order } = await confirmedOrder(2);
    const item = await createItem({ stock: 5 });
    const placedOnly = await placeOrder((await loggedInUser()).agent, [{ itemId: item.id, quantity: 1 }]);

    const body = await dashboard(partner.agent);

    expect(ids(body.available)).toEqual([order.id]);
    expect(ids(body.available)).not.toContain(placedOnly.id);
    expect(body.available[0]).toMatchObject({ bhawan: 'Cautley', roomNo: 'B-214', total: '260.00', itemCount: 2, customer: null });
  });

  it('accepting assigns the order, hides it from other partners and reveals the customer contact', async () => {
    const arjun = await approvedPartner('Arjun Mehta');
    const kabir = await approvedPartner('Kabir Rao');
    const { order } = await confirmedOrder();

    const res = await arjun.agent.post(`/api/delivery/orders/${order.id}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.order.customer).toEqual({ name: 'Riya Sharma', phone: '9123456780' });

    expect(ids((await dashboard(arjun.agent)).active)).toEqual([order.id]);
    const kabirView = await dashboard(kabir.agent);
    expect(kabirView.available).toHaveLength(0);
    expect(kabirView.active).toHaveLength(0);

    const late = await kabir.agent.post(`/api/delivery/orders/${order.id}/accept`);
    expect(late.status).toBe(409);
    expect(late.body.error).toMatch(/already accepted/);
  });

  it('lets exactly one partner win when two accept at the same moment', async () => {
    const a = await approvedPartner('Partner One');
    const b = await approvedPartner('Partner Two');
    const { order } = await confirmedOrder();

    const results = await Promise.all([
      a.agent.post(`/api/delivery/orders/${order.id}/accept`),
      b.agent.post(`/api/delivery/orders/${order.id}/accept`),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect([a.id, b.id]).toContain(saved.deliveryPartnerId);
  });

  it('cannot accept orders that are not confirmed yet, or cancelled', async () => {
    const partner = await approvedPartner();
    const item = await createItem();
    const placed = await placeOrder((await loggedInUser()).agent, [{ itemId: item.id, quantity: 1 }]);
    expect((await partner.agent.post(`/api/delivery/orders/${placed.id}/accept`)).status).toBe(409);

    const { order } = await confirmedOrder();
    await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CANCELLED' });
    expect((await partner.agent.post(`/api/delivery/orders/${order.id}/accept`)).status).toBe(409);
    expect((await partner.agent.post('/api/delivery/orders/nope/accept')).status).toBe(404);
  });
});

describe('delivery partner: delivering', () => {
  it('picks up, then delivers; the student sees who is delivering and the history records the partner', async () => {
    const partner = await approvedPartner('Arjun Mehta');
    const { order, student } = await confirmedOrder();
    await partner.agent.post(`/api/delivery/orders/${order.id}/accept`);

    const pickup = await partner.agent.post(`/api/delivery/orders/${order.id}/pickup`);
    expect(pickup.status).toBe(200);
    expect(pickup.body.order.status).toBe('OUT_FOR_DELIVERY');

    const studentView = await student.agent.get(`/api/orders/${order.id}`);
    expect(studentView.body.order.deliveryPartner).toEqual({ name: 'Arjun Mehta', phone: '9876543210' });

    const deliver = await partner.agent.post(`/api/delivery/orders/${order.id}/deliver`);
    expect(deliver.status).toBe(200);
    expect(deliver.body.order.status).toBe('DELIVERED');

    const after = await dashboard(partner.agent);
    expect(after.active).toHaveLength(0);
    expect(ids(after.history)).toEqual([order.id]);
    expect(after.stats).toEqual({ delivered: 1, cashCollected: '140.00' });

    const history = (await student.agent.get(`/api/orders/${order.id}`)).body.order.statusHistory;
    expect(history.map((h: { status: string }) => h.status)).toEqual(['PLACED', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED']);
    expect(history.at(-1).changedBy).toEqual({ name: 'Arjun Mehta', role: 'DELIVERY_PARTNER' });
  });

  it('cannot mark delivered before picking up', async () => {
    const partner = await approvedPartner();
    const { order } = await confirmedOrder();
    await partner.agent.post(`/api/delivery/orders/${order.id}/accept`);

    const res = await partner.agent.post(`/api/delivery/orders/${order.id}/deliver`);
    expect(res.status).toBe(400);
  });

  it("cannot pick up or deliver someone else's order", async () => {
    const arjun = await approvedPartner('Arjun');
    const kabir = await approvedPartner('Kabir');
    const { order } = await confirmedOrder();
    await arjun.agent.post(`/api/delivery/orders/${order.id}/accept`);

    expect((await kabir.agent.post(`/api/delivery/orders/${order.id}/pickup`)).status).toBe(404);
    // Unaccepted orders can't be advanced either.
    const other = await confirmedOrder();
    expect((await kabir.agent.post(`/api/delivery/orders/${other.order.id}/pickup`)).status).toBe(404);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CONFIRMED');
  });
});

describe('delivery partner access', () => {
  it('requires an approved delivery partner', async () => {
    const pending = await loggedInUser({}, 'DELIVERY_PARTNER');
    await prisma.user.update({ where: { id: pending.id }, data: { partnerStatus: 'PENDING' } });
    const rejected = await loggedInUser({}, 'DELIVERY_PARTNER');
    await prisma.user.update({ where: { id: rejected.id }, data: { partnerStatus: 'REJECTED' } });
    const student = await loggedInUser();

    const waiting = await pending.agent.get('/api/delivery/dashboard');
    expect(waiting.status).toBe(403);
    expect(waiting.body.error).toMatch(/waiting for admin approval/);
    expect((await rejected.agent.get('/api/delivery/dashboard')).body.error).toMatch(/not approved/);
    expect((await student.agent.get('/api/delivery/dashboard')).status).toBe(403);
    expect((await admin.get('/api/delivery/dashboard')).status).toBe(403);
    expect((await request(app).get('/api/delivery/dashboard')).status).toBe(401);
  });
});

describe('sign-up with a role', () => {
  const signUp = (role?: string) =>
    register(request.agent(app), {
      name: 'New Person',
      email: `new${Math.random().toString(36).slice(2, 8)}@iitr.ac.in`,
      enrollmentNo: String(Math.floor(10000000 + Math.random() * 89999999)),
      bhawan: 'Azad',
      phone: '9876543210',
      password: 'password123',
      ...(role && { role }),
    });

  it('defaults to student', async () => {
    const res = await signUp();
    expect(res.body.user).toMatchObject({ role: 'STUDENT', partnerStatus: null });
  });

  it('creates delivery partners as pending approval', async () => {
    const res = await signUp('DELIVERY_PARTNER');
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'DELIVERY_PARTNER', partnerStatus: 'PENDING' });
  });

  it('never allows signing up as admin', async () => {
    const res = await signUp('ADMIN');
    expect(res.status).toBe(400);
    expect(await prisma.user.count({ where: { role: 'ADMIN', name: 'New Person' } })).toBe(0);
  });
});

describe('admin approves delivery partners', () => {
  it('approve and reject; only for delivery partners; admin only', async () => {
    const applicant = await loggedInUser({}, 'DELIVERY_PARTNER');
    await prisma.user.update({ where: { id: applicant.id }, data: { partnerStatus: 'PENDING' } });
    const student = await loggedInUser();

    const pendingList = await admin.get('/api/admin/users?partnerStatus=PENDING');
    expect(pendingList.body.results.map((u: { id: string }) => u.id)).toEqual([applicant.id]);
    expect((await admin.get('/api/admin/dashboard')).body.pendingPartners).toBe(1);

    const approve = await admin.patch(`/api/admin/users/${applicant.id}/partner-status`).send({ status: 'APPROVED' });
    expect(approve.status).toBe(200);
    expect(approve.body.user.partnerStatus).toBe('APPROVED');
    expect((await applicant.agent.get('/api/delivery/dashboard')).status).toBe(200);

    await admin.patch(`/api/admin/users/${applicant.id}/partner-status`).send({ status: 'REJECTED' });
    expect((await applicant.agent.get('/api/delivery/dashboard')).status).toBe(403);

    expect((await admin.patch(`/api/admin/users/${student.id}/partner-status`).send({ status: 'APPROVED' })).status).toBe(400);
    expect((await student.agent.patch(`/api/admin/users/${applicant.id}/partner-status`).send({ status: 'APPROVED' })).status).toBe(403);
  });

  it('making someone a delivery partner from the role menu approves them', async () => {
    const { id, agent } = await loggedInUser();
    await admin.patch(`/api/admin/users/${id}/role`).send({ role: 'DELIVERY_PARTNER' });
    expect((await agent.get('/api/delivery/dashboard')).status).toBe(200);
  });
});

describe('dashboard sales totals', () => {
  it('sums today, the last 7 days and this month, excluding cancelled orders', async () => {
    const item = await createItem({ price: '100.00', stock: 50 });
    const student = await loggedInUser();
    const today = await placeOrder(student.agent, [{ itemId: item.id, quantity: 1 }]); // ₹120 with delivery
    const cancelled = await placeOrder(student.agent, [{ itemId: item.id, quantity: 1 }]);
    await student.agent.post(`/api/orders/${cancelled.id}/cancel`);
    const old = await placeOrder(student.agent, [{ itemId: item.id, quantity: 4 }]); // ₹400, free delivery
    await prisma.order.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 10 * 24 * 3600_000) } });
    void today;

    const { sales } = (await admin.get('/api/admin/dashboard')).body;
    expect(sales.today).toEqual({ orders: 1, revenue: '120.00' });
    expect(sales.last7Days).toEqual({ orders: 1, revenue: '120.00' });
    // The 10-day-old order counts for the month only if it falls in this IST calendar month.
    const istMonth = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d).slice(0, 7);
    const tenDaysAgoSameMonth = istMonth(new Date(Date.now() - 10 * 24 * 3600_000)) === istMonth(new Date());
    expect(sales.thisMonth).toEqual(tenDaysAgoSameMonth ? { orders: 2, revenue: '520.00' } : { orders: 1, revenue: '120.00' });
  });
});
