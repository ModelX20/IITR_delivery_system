import type { Prisma } from '@prisma/client';

/** Everything needed to render an order's detail page. */
export const orderDetailInclude = {
  items: { orderBy: { itemName: 'asc' } },
  statusHistory: {
    orderBy: { changedAt: 'asc' },
    include: { changedBy: { select: { name: true, role: true } } },
  },
} satisfies Prisma.OrderInclude;

export const adminOrderDetailInclude = {
  ...orderDetailInclude,
  user: { select: { id: true, name: true, email: true, enrollmentNo: true, phone: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;
export type AdminOrderWithDetail = Prisma.OrderGetPayload<{ include: typeof adminOrderDetailInclude }>;
