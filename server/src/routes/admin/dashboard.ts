import { Router } from 'express';
import { ORDER_STATUSES, updateSettingsSchema, type AdminDashboard, type OrderStatus, type SalesTotals } from '@iitr/shared';
import { prisma } from '../../lib/prisma';
import { money } from '../../lib/money';
import { toAdminItem, toAdminOrderSummary } from '../../lib/serialize';
import { istDayStart, istMonthStart, istToday } from '../../lib/time';
import { getSettings, updateSettings } from '../../services/settings';
import { adminOrderSummaryInclude } from './orders';

export const adminDashboardRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Orders and revenue since `from`, excluding cancelled orders. */
async function salesSince(from: Date): Promise<SalesTotals> {
  const result = await prisma.order.aggregate({
    where: { createdAt: { gte: from }, status: { not: 'CANCELLED' } },
    _count: true,
    _sum: { total: true },
  });
  return { orders: result._count, revenue: result._sum.total ? money(result._sum.total) : '0.00' };
}

adminDashboardRouter.get('/dashboard', async (_req, res) => {
  const { lowStockThreshold } = await getSettings();
  const today = istToday();
  const todayStart = istDayStart(today);

  const [salesToday, last7Days, thisMonth, pendingPartners] = await Promise.all([
    salesSince(todayStart),
    salesSince(new Date(todayStart.getTime() - 6 * DAY_MS)), // today plus the 6 days before it
    salesSince(istMonthStart(today)),
    prisma.user.count({ where: { role: 'DELIVERY_PARTNER', partnerStatus: 'PENDING' } }),
  ]);

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
    sales: { today: salesToday, last7Days, thisMonth },
    pendingPartners,
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
