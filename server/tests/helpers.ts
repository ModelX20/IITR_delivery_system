import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "OrderItem", "Order", "CartItem", "Item", "User" RESTART IDENTITY CASCADE',
  );
}

export async function createItem(overrides: Partial<{ id: string; name: string; price: string; stock: number; category: string }> = {}) {
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
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(userData(overrides));
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
