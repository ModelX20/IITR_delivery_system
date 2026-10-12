import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createItem, loggedInAgent, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('cart', () => {
  it('adds an item and computes totals on the server', async () => {
    const item = await createItem({ name: 'Cold Coffee', price: '50.00', stock: 10 });
    const agent = await loggedInAgent();

    const res = await agent.post('/api/cart').send({ itemId: item.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.itemCount).toBe(2);
    expect(res.body.items[0]).toMatchObject({ itemId: item.id, unitPrice: '50.00', quantity: 2, lineTotal: '100.00' });
    expect(res.body).toMatchObject({ subtotal: '100.00', deliveryFee: '20.00', total: '120.00' });
  });

  it('adding the same item again increases its quantity', async () => {
    const item = await createItem({ stock: 10 });
    const agent = await loggedInAgent();

    await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 });
    const res = await agent.post('/api/cart').send({ itemId: item.id, quantity: 2 });

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
  });

  it('ignores any price sent by the client', async () => {
    const item = await createItem({ price: '60.00' });
    const agent = await loggedInAgent();

    const res = await agent.post('/api/cart').send({ itemId: item.id, quantity: 1, price: '0.01', unitPrice: '0.01' });

    expect(res.body.items[0].unitPrice).toBe('60.00');
    expect(res.body.subtotal).toBe('60.00');
  });

  it('makes delivery free when the subtotal is above ₹300', async () => {
    const item = await createItem({ price: '160.00', stock: 5 });
    const agent = await loggedInAgent();

    const res = await agent.post('/api/cart').send({ itemId: item.id, quantity: 2 });

    expect(res.body).toMatchObject({ subtotal: '320.00', deliveryFee: '0.00', total: '320.00' });
  });

  it('rejects out-of-stock items and quantities above stock', async () => {
    const soldOut = await createItem({ name: 'Sold Out', stock: 0 });
    const limited = await createItem({ name: 'Limited', stock: 2 });
    const agent = await loggedInAgent();

    const a = await agent.post('/api/cart').send({ itemId: soldOut.id, quantity: 1 });
    expect(a.status).toBe(409);
    expect(a.body.error).toMatch(/out of stock/);

    const b = await agent.post('/api/cart').send({ itemId: limited.id, quantity: 3 });
    expect(b.status).toBe(409);
    expect(b.body.error).toMatch(/Only 2/);
  });

  it('updates quantity and removes items', async () => {
    const item = await createItem({ stock: 10 });
    const agent = await loggedInAgent();
    await agent.post('/api/cart').send({ itemId: item.id, quantity: 1 });

    const updated = await agent.patch(`/api/cart/${item.id}`).send({ quantity: 4 });
    expect(updated.status).toBe(200);
    expect(updated.body.items[0].quantity).toBe(4);

    const removed = await agent.delete(`/api/cart/${item.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.items).toHaveLength(0);
    expect(removed.body.total).toBe('0.00');
  });

  it('returns 404 for an unknown item', async () => {
    const agent = await loggedInAgent();
    const res = await agent.post('/api/cart').send({ itemId: 'does-not-exist', quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Item not found' });
  });
});
