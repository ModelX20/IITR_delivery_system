import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { adminOrdersQuerySchema, updateOrderStatusSchema } from '@iitr/shared';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { adminOrderDetailInclude } from '../../lib/orderInclude';
import { pageArgs, paginated } from '../../lib/pagination';
import { toAdminOrderDetail, toAdminOrderSummary } from '../../lib/serialize';
import { istDayStart, istNextDayStart } from '../../lib/time';
import { currentUser } from '../../middleware/auth';
import { notifyStatusChanged } from '../../email/notify';
import { changeOrderStatus } from '../../services/orderStatus';

export const adminOrdersRouter = Router();

export const adminOrderSummaryInclude = {
  items: { select: { quantity: true } },
  user: { select: { id: true, name: true, email: true, enrollmentNo: true } },
} satisfies Prisma.OrderInclude;

adminOrdersRouter.get('/', async (req, res) => {
  const { status, from, to, bhawan, user, page } = adminOrdersQuerySchema.parse(req.query);

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (bhawan) where.bhawan = bhawan;
  if (from || to) {
    // Dates are IST calendar days; "to" is inclusive.
    where.createdAt = { ...(from && { gte: istDayStart(from) }), ...(to && { lt: istNextDayStart(to) }) };
  }
  if (user) {
    where.user = {
      OR: [
        { name: { contains: user, mode: 'insensitive' } },
        { email: { contains: user, mode: 'insensitive' } },
        { enrollmentNo: { contains: user } },
      ],
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: adminOrderSummaryInclude, orderBy: { createdAt: 'desc' }, ...pageArgs(page) }),
    prisma.order.count({ where }),
  ]);
  res.json(paginated(orders.map(toAdminOrderSummary), total, page));
});

adminOrdersRouter.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: adminOrderDetailInclude });
  if (!order) throw new AppError(404, 'Order not found');
  res.json({ order: toAdminOrderDetail(order) });
});

adminOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status } = updateOrderStatusSchema.parse(req.body);
  const actor = currentUser(req);
  await changeOrderStatus({ orderId: req.params.id, to: status, actorId: actor.id });
  notifyStatusChanged(req.params.id, status, actor.role);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: adminOrderDetailInclude });
  res.json({ order: toAdminOrderDetail(order) });
});
