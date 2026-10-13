import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { adminAgent, createItem, loggedInAgent, placeOrder, resetDb, stockOf } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('student cancels an order', () => {
  it('cancels a PLACED order, restores stock and records history', async () => {
    const item = await createItem({ stock: 10 });
    const student = await loggedInAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 4 }]);
    expect(await stockOf(item.id)).toBe(6);

    const res = await student.post(`/api/orders/${order.id}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('CANCELLED');
    expect(await stockOf(item.id)).toBe(10);
    expect(res.body.order.statusHistory.map((h: { status: string }) => h.status)).toEqual(['PLACED', 'CANCELLED']);
    expect(res.body.order.statusHistory[1].changedBy.role).toBe('STUDENT');
  });

  it('cannot cancel once the order is confirmed', async () => {
    const item = await createItem({ stock: 10 });
    const student = await loggedInAgent();
    const admin = await adminAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 1 }]);
    await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' });

    const res = await student.post(`/api/orders/${order.id}/cancel`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/can no longer be cancelled/);
    expect(await stockOf(item.id)).toBe(9);
  });

  it('cannot cancel twice (stock is restored only once)', async () => {
    const item = await createItem({ stock: 10 });
    const student = await loggedInAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 2 }]);

    await student.post(`/api/orders/${order.id}/cancel`);
    expect((await student.post(`/api/orders/${order.id}/cancel`)).status).toBe(400);
    expect(await stockOf(item.id)).toBe(10);
  });

  it("cannot cancel another student's order", async () => {
    const item = await createItem({ stock: 10 });
    const owner = await loggedInAgent();
    const other = await loggedInAgent();
    const order = await placeOrder(owner, [{ itemId: item.id, quantity: 1 }]);

    const res = await other.post(`/api/orders/${order.id}/cancel`);

    expect(res.status).toBe(404);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PLACED');
  });

  it('handles a cancel racing an admin confirm: exactly one wins, stock stays consistent', async () => {
    const item = await createItem({ stock: 10 });
    const student = await loggedInAgent();
    const admin = await adminAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 3 }]);

    const [cancel, confirm] = await Promise.all([
      student.post(`/api/orders/${order.id}/cancel`),
      admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }),
    ]);

    const winners = [cancel, confirm].filter((r) => r.status === 200);
    expect(winners).toHaveLength(1);
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(await stockOf(item.id)).toBe(final.status === 'CANCELLED' ? 10 : 7);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(2);
  });
});

describe('reorder', () => {
  it('adds items at current prices and explains every skipped item', async () => {
    const maggi = await createItem({ name: 'Maggi', price: '15.00', stock: 20 });
    const coffee = await createItem({ name: 'Cold Coffee', price: '50.00', stock: 20 });
    const thali = await createItem({ name: 'Veg Thali', price: '120.00', stock: 20 });
    const chips = await createItem({ name: 'Chips', price: '20.00', stock: 20 });
    const student = await loggedInAgent();
    const order = await placeOrder(student, [
      { itemId: maggi.id, quantity: 2 },
      { itemId: coffee.id, quantity: 3 },
      { itemId: thali.id, quantity: 1 },
      { itemId: chips.id, quantity: 1 },
    ]);

    await prisma.item.update({ where: { id: maggi.id }, data: { price: '18.00' } }); // price went up
    await prisma.item.update({ where: { id: coffee.id }, data: { stock: 2 } }); // only 2 left
    await prisma.item.update({ where: { id: thali.id }, data: { stock: 0 } }); // sold out
    await prisma.item.update({ where: { id: chips.id }, data: { isActive: false } }); // discontinued

    const res = await student.post(`/api/orders/${order.id}/reorder`);

    expect(res.status).toBe(200);
    expect(res.body.added).toEqual([
      { name: 'Maggi', quantity: 2 },
      { name: 'Cold Coffee', quantity: 2 },
    ]);
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([
        { name: 'Cold Coffee', reason: 'Only 2 of 3 added (limited stock)' },
        { name: 'Veg Thali', reason: 'Out of stock' },
        { name: 'Chips', reason: 'No longer available' },
      ]),
    );
    const maggiLine = res.body.cart.items.find((l: { itemId: string }) => l.itemId === maggi.id);
    expect(maggiLine).toMatchObject({ unitPrice: '18.00', quantity: 2, lineTotal: '36.00' });
    expect(res.body.cart.subtotal).toBe('136.00');
  });

  it('adds to items already in the cart without exceeding stock', async () => {
    const item = await createItem({ name: 'Maggi', stock: 5 });
    const student = await loggedInAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 3 }]); // stock now 2
    await student.post('/api/cart').send({ itemId: item.id, quantity: 2 });

    const res = await student.post(`/api/orders/${order.id}/reorder`);

    expect(res.body.added).toEqual([]);
    expect(res.body.skipped).toEqual([{ name: 'Maggi', reason: 'Your cart already has all available stock' }]);
    expect(res.body.cart.items[0].quantity).toBe(2);
  });

  it("cannot reorder another student's order", async () => {
    const item = await createItem();
    const owner = await loggedInAgent();
    const other = await loggedInAgent();
    const order = await placeOrder(owner, [{ itemId: item.id, quantity: 1 }]);

    expect((await other.post(`/api/orders/${order.id}/reorder`)).status).toBe(404);
    expect((await other.get('/api/cart')).body.items).toHaveLength(0);
  });
});
