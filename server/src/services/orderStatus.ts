import type { OrderStatus, Prisma } from '@prisma/client';
import { STUDENT_CANCELLABLE_STATUSES, canTransition } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { orderDetailInclude } from '../lib/orderInclude';

const LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

interface ChangeStatusInput {
  orderId: string;
  to: OrderStatus;
  actorId: string;
  /** When set, the order must belong to this user (otherwise it is treated as not found). */
  ownerId?: string;
  /** When set, the order must be assigned to this delivery partner (otherwise it is treated as not found). */
  partnerId?: string;
  /** Extra rule for students: which statuses they may cancel from. */
  allowedFrom?: readonly OrderStatus[];
}

/**
 * Moves an order to a new status in one transaction:
 * validate the transition, update the status (only if nobody changed it meanwhile),
 * restore stock when cancelling, and record the change in the status history.
 */
export async function changeOrderStatus({ orderId, to, actorId, ownerId, partnerId, allowedFrom }: ChangeStatusInput) {
  return prisma.$transaction(async (tx) => {
    const where: Prisma.OrderWhereInput = { id: orderId };
    if (ownerId) where.userId = ownerId;
    if (partnerId) where.deliveryPartnerId = partnerId;

    const order = await tx.order.findFirst({ where, include: { items: true } });
    if (!order) throw new AppError(404, 'Order not found');

    if (allowedFrom && !allowedFrom.includes(order.status)) {
      throw new AppError(400, `This order is already ${LABELS[order.status].toLowerCase()} and can no longer be cancelled`);
    }
    if (!canTransition(order.status, to)) {
      throw new AppError(400, `Cannot change an order from ${LABELS[order.status]} to ${LABELS[to]}`);
    }

    // Conditional update: fails if another request changed the status after we read it.
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status, ...(partnerId && { deliveryPartnerId: partnerId }) },
      data: { status: to },
    });
    if (count === 0) throw new AppError(409, 'This order was just updated. Please refresh and try again.');

    if (to === 'CANCELLED') {
      for (const line of order.items) {
        await tx.item.update({ where: { id: line.itemId }, data: { stock: { increment: line.quantity } } });
      }
    }

    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: to, changedById: actorId } });

    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderDetailInclude });
  });
}

export function cancelOwnOrder(orderId: string, userId: string) {
  return changeOrderStatus({
    orderId,
    to: 'CANCELLED',
    actorId: userId,
    ownerId: userId,
    allowedFrom: STUDENT_CANCELLABLE_STATUSES,
  });
}
