import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createItem, loggedInAgent, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('GET /api/items', () => {
  it('filters by name search and category, and hides inactive items', async () => {
    await createItem({ name: 'Maggi Noodles', category: 'Food', price: '15.00' });
    await createItem({ name: 'Amul Kool', category: 'Beverages', price: '30.00' });
    await prisma.item.create({
      data: { name: 'Old Maggi', description: '', category: 'Food', price: '1', imageUrl: '', stock: 1, isActive: false },
    });
    const agent = await loggedInAgent();

    const all = await agent.get('/api/items');
    expect(all.body.items).toHaveLength(2);

    const search = await agent.get('/api/items').query({ search: 'maggi' });
    expect(search.body.items.map((i: { name: string }) => i.name)).toEqual(['Maggi Noodles']);
    expect(search.body.items[0].price).toBe('15.00');

    const category = await agent.get('/api/items').query({ category: 'Beverages' });
    expect(category.body.items.map((i: { name: string }) => i.name)).toEqual(['Amul Kool']);
  });
});
