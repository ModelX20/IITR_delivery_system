import { Router } from 'express';
import { placeOrderSchema } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { toOrderDetail, toOrderSummary } from '../lib/serialize';
import { currentUserId } from '../middleware/auth';
import { placeOrder } from '../services/order';

export const ordersRouter = Router();

ordersRouter.post('/', async (req, res) => {
  const input = placeOrderSchema.parse(req.body);
  const order = await placeOrder(currentUserId(req), input);
  res.status(201).json({ order: toOrderDetail(order) });
});

ordersRouter.get('/', async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: currentUserId(req) },
    include: { items: { select: { quantity: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map(toOrderSummary) });
});

ordersRouter.get('/:id', async (req, res) => {
  // Scoped to the current user: another user's order looks exactly like a missing one.
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: currentUserId(req) },
    include: { items: { orderBy: { itemName: 'asc' } } },
  });
  if (!order) throw new AppError(404, 'Order not found');
  res.json({ order: toOrderDetail(order) });
});
