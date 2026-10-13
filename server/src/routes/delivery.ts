import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import type { DeliveryDashboard, DeliveryOrder } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { money } from '../lib/money';
import { currentUserId } from '../middleware/auth';
import { changeOrderStatus } from '../services/orderStatus';
import { notifyStatusChanged } from '../email/notify';

// Every route here requires an approved delivery partner (enforced in app.ts).
export const deliveryRouter = Router();

const HISTORY_LIMIT = 30;

const deliveryInclude = {
  items: { select: { itemName: true, quantity: true }, orderBy: { itemName: 'asc' } },
  user: { select: { name: true, phone: true } },
} satisfies Prisma.OrderInclude;

type OrderForDelivery = Prisma.OrderGetPayload<{ include: typeof deliveryInclude }>;

function toDeliveryOrder(order: OrderForDelivery, partnerId: string): DeliveryOrder {
  const mine = order.deliveryPartnerId === partnerId;
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    bhawan: order.bhawan,
    roomNo: order.roomNo,
    note: order.note,
    total: money(order.total),
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    items: order.items,
    // Contact details are only shared with the partner who accepted the order.
    customer: mine ? { name: order.user.name, phone: order.user.phone } : null,
  };
}

deliveryRouter.get('/dashboard', async (req, res) => {
  const partnerId = currentUserId(req);

  const [available, active, history, delivered] = await Promise.all([
    // Confirmed by an admin and not yet taken by anyone: oldest first.
    prisma.order.findMany({
      where: { status: 'CONFIRMED', deliveryPartnerId: null },
      include: deliveryInclude,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { deliveryPartnerId: partnerId, status: { in: ['CONFIRMED', 'OUT_FOR_DELIVERY'] } },
      include: deliveryInclude,
      orderBy: { acceptedAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { deliveryPartnerId: partnerId, status: { in: ['DELIVERED', 'CANCELLED'] } },
      include: deliveryInclude,
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
    prisma.order.aggregate({ where: { deliveryPartnerId: partnerId, status: 'DELIVERED' }, _count: true, _sum: { total: true } }),
  ]);

  const body: DeliveryDashboard = {
    available: available.map((o) => toDeliveryOrder(o, partnerId)),
    active: active.map((o) => toDeliveryOrder(o, partnerId)),
    history: history.map((o) => toDeliveryOrder(o, partnerId)),
    stats: { delivered: delivered._count, cashCollected: delivered._sum.total ? money(delivered._sum.total) : '0.00' },
  };
  res.json(body);
});

deliveryRouter.post('/orders/:id/accept', async (req, res) => {
  const partnerId = currentUserId(req);

  // One atomic conditional update: if two partners accept at the same moment, exactly one row update succeeds.
  const { count } = await prisma.order.updateMany({
    where: { id: req.params.id, status: 'CONFIRMED', deliveryPartnerId: null },
    data: { deliveryPartnerId: partnerId, acceptedAt: new Date() },
  });
  if (count === 0) {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, select: { status: true, deliveryPartnerId: true } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.deliveryPartnerId === partnerId) throw new AppError(409, 'You have already accepted this order');
    if (order.deliveryPartnerId) throw new AppError(409, 'Another delivery partner has already accepted this order');
    throw new AppError(409, 'This order is no longer available for pickup');
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: deliveryInclude });
  res.json({ order: toDeliveryOrder(order, partnerId) });
});

async function advance(req: { params: { id: string } } & Parameters<typeof currentUserId>[0], to: 'OUT_FOR_DELIVERY' | 'DELIVERED') {
  const partnerId = currentUserId(req);
  // Scoped to orders assigned to this partner: anyone else's order is "not found".
  await changeOrderStatus({ orderId: req.params.id, to, actorId: partnerId, partnerId });
  notifyStatusChanged(req.params.id, to, 'DELIVERY_PARTNER');
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: deliveryInclude });
  return toDeliveryOrder(order, partnerId);
}

deliveryRouter.post('/orders/:id/pickup', async (req, res) => {
  res.json({ order: await advance(req, 'OUT_FOR_DELIVERY') });
});

deliveryRouter.post('/orders/:id/deliver', async (req, res) => {
  res.json({ order: await advance(req, 'DELIVERED') });
});
