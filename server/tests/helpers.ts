import request from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

export type Agent = ReturnType<typeof request.agent>;

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "OrderStatusHistory", "OrderItem", "Order", "CartItem", "Item", "User" RESTART IDENTITY CASCADE',
  );
  await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: { lowStockThreshold: 5 } });
}

export async function createItem(
  overrides: Partial<{ id: string; name: string; price: string; stock: number; category: string; isActive: boolean }> = {},
) {
  return prisma.item.create({
    data: {
      name: 'Maggi Noodles',
      description: 'Test item',
      category: 'Food',
      price: '15.00',
      imageUrl: 'https://placehold.co/400x300',
      stock: 10,
      ...overrides,
    },
  });
}

let userCounter = 0;

export function userData(overrides: Record<string, string> = {}) {
  userCounter += 1;
  return {
    name: 'Test Student',
    email: `student${userCounter}@iitr.ac.in`,
    enrollmentNo: String(21110000 + userCounter),
    bhawan: 'Rajendra',
    phone: '9876543210',
    password: 'password123',
    ...overrides,
  };
}

/** Registers a new user and returns a supertest agent that carries their auth cookie. */
export async function loggedInAgent(overrides: Record<string, string> = {}) {
  return (await loggedInUser(overrides)).agent;
}

/** Like loggedInAgent, but also returns the user's id and email. */
export async function loggedInUser(overrides: Record<string, string> = {}, role: Role = 'STUDENT') {
  const agent = request.agent(app);
  const data = userData(overrides);
  const res = await agent.post('/api/auth/register').send(data);
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (role !== 'STUDENT') await prisma.user.update({ where: { id: res.body.user.id }, data: { role } });
  return { agent, id: res.body.user.id as string, email: data.email, password: data.password };
}

export async function adminAgent() {
  return (await loggedInUser({ name: 'Store Admin' }, 'ADMIN')).agent;
}

/** Student places an order for the given items and returns the order body. */
export async function placeOrder(agent: Agent, lines: { itemId: string; quantity: number }[]) {
  for (const line of lines) {
    const res = await agent.post('/api/cart').send(line);
    if (res.status !== 201) throw new Error(`Add to cart failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const res = await agent.post('/api/orders').send({ bhawan: 'Cautley', roomNo: 'B-214' });
  if (res.status !== 201) throw new Error(`Place order failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.order as { id: string; status: string };
}

export async function stockOf(itemId: string) {
  return (await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).stock;
}
