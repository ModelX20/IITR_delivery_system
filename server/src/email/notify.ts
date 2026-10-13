// Every function here returns immediately; the email is built and sent in the background.
// Call them only after the related database transaction has committed.
import type { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { money } from '../lib/money';
import { runInBackground } from '../lib/background';
import { mailer } from './mailer';
import {
  orderCancelledEmail,
  orderPlacedEmail,
  orderStatusEmail,
  passwordResetEmail,
  welcomeEmail,
  type OrderForEmail,
} from './templates';

async function loadOrder(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  const forEmail: OrderForEmail = {
    id: order.id,
    total: money(order.total),
    subtotal: money(order.subtotal),
    deliveryFee: money(order.deliveryFee),
    bhawan: order.bhawan,
    roomNo: order.roomNo,
    items: order.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity, lineTotal: money(i.lineTotal) })),
  };
  return { user: order.user, order: forEmail };
}

export function notifyWelcome(user: { name: string; email: string }) {
  runInBackground('welcome email', () => mailer.send({ to: user.email, ...welcomeEmail(user.name) }));
}

export function notifyOrderPlaced(orderId: string) {
  runInBackground('order placed email', async () => {
    const { user, order } = await loadOrder(orderId);
    await mailer.send({ to: user.email, ...orderPlacedEmail(user.name, order) });
  });
}

/** Sends "cancelled" or "status changed" depending on the new status. */
export function notifyStatusChanged(orderId: string, status: OrderStatus, changedByRole: Role) {
  runInBackground(`order ${status.toLowerCase()} email`, async () => {
    const { user, order } = await loadOrder(orderId);
    const template =
      status === 'CANCELLED'
        ? orderCancelledEmail(user.name, order, changedByRole !== 'STUDENT')
        : orderStatusEmail(user.name, order, status);
    await mailer.send({ to: user.email, ...template });
  });
}

export function notifyPasswordReset(user: { name: string; email: string }, resetUrl: string) {
  runInBackground('password reset email', () => mailer.send({ to: user.email, ...passwordResetEmail(user.name, resetUrl) }));
}
