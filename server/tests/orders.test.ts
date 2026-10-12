import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createItem, loggedInAgent, resetDb } from './helpers';

const delivery = { bhawan: 'Cautley', roomNo: 'B-214', note: 'Call when outside' };

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/orders', () => {
  it('creates an order with price snapshots, decrements stock and clears the cart', async () => {
    const maggi = await createItem({ name: 'Maggi', price: '15.00', stock: 10 });
    const coffee = await createItem({ name: 'Cold Coffee', price: '50.00', stock: 5 });
    const agent = await loggedInAgent();
    await agent.post('/api/cart').send({ itemId: maggi.id, quantity: 3 });
    await agent.post('/api/cart').send({ itemId: coffee.id, quantity: 1 });

    const res = await agent.post('/api/orders').send(delivery);

    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: 'PLACED',
      subtotal: '95.00',
      deliveryFee: '20.00',
      total: '115.00',
      bhawan: 'Cautley',
      roomNo: 'B-214',
      note: 'Call when outside',
    });
    expect(res.body.order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemName: 'Maggi', unitPrice: '15.00', quantity: 3, lineTotal: '45.00' }),
        expect.objectContaining({ itemName: 'Cold Coffee', unitPrice: '50.00', quantity: 1, lineTotal: '50.00' }),
      ]),
    );

    expect((await prisma.item.findUnique({ where: { id: maggi.id } }))?.stock).toBe(7);
    expect((await prisma.item.findUnique({ where: { id: coffee.id } }))?.stock).toBe(4);
    expect((await agent.get('/api/cart')).body.items).toHaveLength(0);
  });

  it('keeps the old price on the order after the item price changes', async () => {
    const item = await createItem({ price: '30.00' });
    const agent = await loggedInAgent();
    await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 });
    const { body } = await agent.post('/api/orders').send(delivery);

    await prisma.item.update({ where: { id: item.id }, data: { price: '99.00' } });

    const detail = await agent.get(`/api/orders/${body.order.id}`);
    expect(detail.body.order.items[0].unitPrice).toBe('30.00');
    expect(detail.body.order.total).toBe('50.00');
  });

  it('rolls everything back when one item is out of stock', async () => {
    const inStock = await createItem({ name: 'Parle-G', price: '10.00', stock: 10 });
    const scarce = await createItem({ name: 'Veg Thali', price: '120.00', stock: 2 });
    const agent = await loggedInAgent();
    await agent.post('/api/cart').send({ itemId: inStock.id, quantity: 4 });
    await agent.post('/api/cart').send({ itemId: scarce.id, quantity: 2 });

    // Someone else buys the last thali between "add to cart" and "place order".
    await prisma.item.update({ where: { id: scarce.id }, data: { stock: 0 } });

    const res = await agent.post('/api/orders').send(delivery);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Veg Thali is out of stock/);

    // Nothing was committed: no order, stock of the in-stock item untouched, cart intact.
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect((await prisma.item.findUnique({ where: { id: inStock.id } }))?.stock).toBe(10);
    expect((await agent.get('/api/cart')).body.items).toHaveLength(2);
  });

  it('never oversells when two orders race for the last unit', async () => {
    const item = await createItem({ name: 'Last One', stock: 1 });
    const a = await loggedInAgent();
    const b = await loggedInAgent();
    await a.post('/api/cart').send({ itemId: item.id, quantity: 1 });
    await b.post('/api/cart').send({ itemId: item.id, quantity: 1 });

    const results = await Promise.all([a.post('/api/orders').send(delivery), b.post('/api/orders').send(delivery)]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await prisma.item.findUnique({ where: { id: item.id } }))?.stock).toBe(0);
  });

  it('rejects an empty cart and invalid delivery details', async () => {
    const agent = await loggedInAgent();

    const empty = await agent.post('/api/orders').send(delivery);
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual({ error: 'Your cart is empty' });

    const badBhawan = await agent.post('/api/orders').send({ ...delivery, bhawan: 'Hogwarts' });
    expect(badBhawan.status).toBe(400);
  });
});

describe('GET /api/orders', () => {
  it('lists only my orders, newest first', async () => {
    const item = await createItem({ stock: 10 });
    const me = await loggedInAgent();
    const other = await loggedInAgent();

    for (const qty of [1, 2]) {
      await me.post('/api/cart').send({ itemId: item.id, quantity: qty });
      await me.post('/api/orders').send(delivery);
    }
    await other.post('/api/cart').send({ itemId: item.id, quantity: 1 });
    await other.post('/api/orders').send(delivery);

    const res = await me.get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.orders[0].itemCount).toBe(2);
    expect(res.body.orders[1].itemCount).toBe(1);
  });

  it("does not let a user read another user's order", async () => {
    const item = await createItem({ stock: 10 });
    const owner = await loggedInAgent();
    const intruder = await loggedInAgent();
    await owner.post('/api/cart').send({ itemId: item.id, quantity: 1 });
    const { body } = await owner.post('/api/orders').send(delivery);

    expect((await owner.get(`/api/orders/${body.order.id}`)).status).toBe(200);

    const res = await intruder.get(`/api/orders/${body.order.id}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Order not found' });
  });
});
