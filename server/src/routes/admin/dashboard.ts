import { Router } from 'express';
import { ORDER_STATUSES, updateSettingsSchema, type AdminDashboard, type OrderStatus } from '@iitr/shared';
import { prisma } from '../../lib/prisma';
import { money } from '../../lib/money';
import { toAdminItem, toAdminOrderSummary } from '../../lib/serialize';
import { istDayStart, istToday } from '../../lib/time';
import { getSettings, updateSettings } from '../../services/settings';
import { adminOrderSummaryInclude } from './orders';

export const adminDashboardRouter = Router();

adminDashboardRouter.get('/dashboard', async (_req, res) => {
  const { lowStockThreshold } = await getSettings();
  const todayStart = istDayStart(istToday());

  const [ordersToday, revenueToday, byStatus, totalStudents, activeItems, lowStockItems, recentOrders] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } } }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.item.count({ where: { isActive: true } }),
    prisma.item.findMany({
      where: { isActive: true, stock: { lte: lowStockThreshold } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    }),
    prisma.order.findMany({ include: adminOrderSummaryInclude, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const row of byStatus) ordersByStatus[row.status] = row._count;

  const body: AdminDashboard = {
    ordersToday,
    revenueToday: revenueToday._sum.total ? money(revenueToday._sum.total) : '0.00',
    ordersByStatus,
    totalStudents,
    activeItems,
    lowStockThreshold,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.map(toAdminItem),
    recentOrders: recentOrders.map(toAdminOrderSummary),
  };
  res.json(body);
});

adminDashboardRouter.get('/settings', async (_req, res) => {
  res.json({ settings: await getSettings() });
});

adminDashboardRouter.patch('/settings', async (req, res) => {
  const data = updateSettingsSchema.parse(req.body);
  res.json({ settings: await updateSettings(data) });
});
