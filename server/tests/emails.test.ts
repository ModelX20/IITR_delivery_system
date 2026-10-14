import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { mailer } from '../src/email/mailer';
import { adminAgent, app, createItem, loggedInUser, placeOrder, register, resetDb, sentEmails, userData } from './helpers';

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

// Sign-up verification codes are covered in signup.test.ts; these tests look at notification emails.
const subjects = async (to: string) =>
  (await sentEmails()).filter((e) => e.to === to && !e.subject.includes('verification code')).map((e) => e.subject);

describe('email notifications', () => {
  it('sends a welcome email on registration', async () => {
    const { email } = await loggedInUser({ email: 'asha@iitr.ac.in' });
    expect(await subjects(email)).toEqual(['Welcome to IITR Delivery']);
  });

  it('sends order placed and every status change', async () => {
    const item = await createItem({ name: 'Veg Thali', price: '120.00' });
    const { agent, email } = await loggedInUser();
    const admin = await adminAgent();
    const order = await placeOrder(agent, [{ itemId: item.id, quantity: 2 }]);
    const ref = `#${order.id.slice(-8).toUpperCase()}`;

    for (const status of ['CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status });
    }

    // Background sends can finish in any order.
    expect((await subjects(email)).sort()).toEqual(
      [
        'Welcome to IITR Delivery',
        `Order ${ref} placed`,
        `Order ${ref}: confirmed`,
        `Order ${ref}: out for delivery`,
        `Order ${ref}: delivered`,
      ].sort(),
    );
    const placed = (await sentEmails()).find((e) => e.subject === `Order ${ref} placed`)!;
    expect(placed.html).toContain('Veg Thali × 2');
    expect(placed.html).toContain('₹240.00');
    expect(placed.text).toContain('Cash on Delivery');
  });

  it('sends a cancellation email, worded by who cancelled', async () => {
    const item = await createItem({ stock: 10 });
    const { agent, email } = await loggedInUser();
    const admin = await adminAgent();
    const mine = await placeOrder(agent, [{ itemId: item.id, quantity: 1 }]);
    const theirs = await placeOrder(agent, [{ itemId: item.id, quantity: 1 }]);

    await agent.post(`/api/orders/${mine.id}/cancel`);
    await admin.patch(`/api/admin/orders/${theirs.id}/status`).send({ status: 'CANCELLED' });

    const cancelled = (await sentEmails()).filter((e) => e.to === email && e.subject.endsWith('cancelled'));
    const textFor = (orderId: string) => cancelled.find((e) => e.subject.includes(orderId.slice(-8).toUpperCase()))!.text;
    expect(cancelled).toHaveLength(2);
    expect(textFor(mine.id)).toContain('As requested');
    expect(textFor(theirs.id)).toContain('The store had to cancel');
  });

  it('escapes user-entered text in email HTML', async () => {
    const { email } = await loggedInUser({ name: '<img/src=x/onerror=alert(1)>Asha Verma' });
    const [welcome] = (await sentEmails()).filter((e) => e.to === email);
    expect(welcome.html).not.toContain('<img/src=x');
    expect(welcome.html).toContain('&lt;img/src=x/onerror=alert(1)&gt;Asha');
  });

  it('never fails the request when sending email fails', async () => {
    // Notification emails fail; the sign-up code itself still gets through (it has its own error handling).
    const realSend = mailer.send.bind(mailer);
    const send = vi.spyOn(mailer, 'send').mockImplementation(async (email) => {
      if (email.subject.includes('verification code')) return realSend(email);
      throw new Error('SMTP server down');
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const item = await createItem();

    const registered = await register(request.agent(app), userData());
    expect(registered.status).toBe(201);

    const { agent } = await loggedInUser();
    const order = await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 }).then(() =>
      agent.post('/api/orders').send({ bhawan: 'Azad', roomNo: '12' }),
    );
    expect(order.status).toBe(201);

    expect((await request(app).post('/api/auth/forgot-password').send({ email: 'student1@iitr.ac.in' })).status).toBe(200);

    await sentEmails(); // wait for the background sends
    expect(send).toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('[background]'), 'SMTP server down');
  });
});
