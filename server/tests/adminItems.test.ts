import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { adminAgent, createItem, loggedInAgent, placeOrder, resetDb, type Agent } from './helpers';

const validItem = {
  name: 'Bournvita',
  description: 'Health drink, 500 g',
  category: 'Beverages',
  price: '245.50',
  imageUrl: 'https://placehold.co/400x300',
  stock: 12,
};

let admin: Agent;

beforeEach(async () => {
  await resetDb();
  admin = await adminAgent();
});
afterAll(() => prisma.$disconnect());

describe('admin items', () => {
  it('creates an item with an exact decimal price', async () => {
    const res = await admin.post('/api/admin/items').send(validItem);

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ name: 'Bournvita', price: '245.50', stock: 12, isActive: true });
    const stored = await prisma.item.findUniqueOrThrow({ where: { id: res.body.item.id } });
    expect(stored.price.toFixed(2)).toBe('245.50');
  });

  it.each([
    [{ price: '-5' }, /Price/],
    [{ price: '12.345' }, /2 decimals/],
    [{ price: '0' }, /greater than 0/],
    [{ stock: -1 }, /negative/],
    [{ stock: 2.5 }, /whole number/],
    [{ category: 'Electronics' }, /category/],
    [{ imageUrl: 'javascript:alert(1)' }, /image URL/],
    [{ name: '' }, /at least 2/],
  ])('rejects invalid data %o', async (override, message) => {
    const res = await admin.post('/api/admin/items').send({ ...validItem, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  it('edits only the fields sent', async () => {
    const item = await createItem({ name: 'Old name', price: '10.00', isActive: false });

    const res = await admin.patch(`/api/admin/items/${item.id}`).send({ price: '12.00', stock: 3 });

    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ name: 'Old name', price: '12.00', stock: 3, isActive: false });
  });

  it('soft-deletes: hidden from students but kept for past orders', async () => {
    const item = await createItem({ name: 'Veg Thali' });
    const student = await loggedInAgent();
    const order = await placeOrder(student, [{ itemId: item.id, quantity: 1 }]);

    const res = await admin.delete(`/api/admin/items/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.item.isActive).toBe(false);

    expect(await prisma.item.count({ where: { id: item.id } })).toBe(1);
    expect((await student.get('/api/items')).body.items).toHaveLength(0);
    const detail = await student.get(`/api/orders/${order.id}`);
    expect(detail.body.order.items[0].itemName).toBe('Veg Thali');
  });

  it('returns 404 for unknown items', async () => {
    expect((await admin.patch('/api/admin/items/nope').send({ stock: 1 })).status).toBe(404);
    expect((await admin.delete('/api/admin/items/nope')).status).toBe(404);
  });

  it('lists items with search, status and low-stock filters', async () => {
    await createItem({ name: 'Maggi', stock: 50 });
    await createItem({ name: 'Red Bull', stock: 3 });
    await createItem({ name: 'Old Maggi', stock: 1, isActive: false });

    const names = async (query: string) =>
      (await admin.get(`/api/admin/items?${query}`)).body.items.map((i: { name: string }) => i.name).sort();

    expect(await names('')).toEqual(['Maggi', 'Old Maggi', 'Red Bull']);
    expect(await names('search=maggi')).toEqual(['Maggi', 'Old Maggi']);
    expect(await names('status=inactive')).toEqual(['Old Maggi']);
    // Low stock only counts items still on sale.
    expect(await names('lowStock=true')).toEqual(['Red Bull']);
  });
});

describe('low-stock threshold', () => {
  it('drives the dashboard list and can be changed by the admin', async () => {
    await createItem({ name: 'A', stock: 2 });
    await createItem({ name: 'B', stock: 5 });
    await createItem({ name: 'C', stock: 8 });

    let dash = await admin.get('/api/admin/dashboard');
    expect(dash.body.lowStockThreshold).toBe(5);
    expect(dash.body.lowStockCount).toBe(2);
    expect(dash.body.lowStockItems.map((i: { name: string }) => i.name)).toEqual(['A', 'B']);

    const update = await admin.patch('/api/admin/settings').send({ lowStockThreshold: 10 });
    expect(update.body.settings.lowStockThreshold).toBe(10);

    dash = await admin.get('/api/admin/dashboard');
    expect(dash.body.lowStockCount).toBe(3);
  });

  it('rejects an invalid threshold', async () => {
    expect((await admin.patch('/api/admin/settings').send({ lowStockThreshold: -1 })).status).toBe(400);
    expect((await admin.patch('/api/admin/settings').send({ lowStockThreshold: 'ten' })).status).toBe(400);
  });
});
