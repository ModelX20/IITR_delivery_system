import type { ReorderResult } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { getCartSummary } from './cart';

/** Same per-line limit as the cart API's quantity validation. */
const MAX_CART_QUANTITY = 50;

/**
 * Adds a past order's items to the user's cart at current prices (the cart is always priced live).
 * Items that are no longer sold or out of stock are skipped; quantities are capped by available stock.
 */
export async function reorder(orderId: string, userId: string): Promise<ReorderResult> {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
  if (!order) throw new AppError(404, 'Order not found');

  const added: ReorderResult['added'] = [];
  const skipped: ReorderResult['skipped'] = [];

  await prisma.$transaction(async (tx) => {
    for (const line of order.items) {
      const item = await tx.item.findUnique({ where: { id: line.itemId } });
      if (!item || !item.isActive) {
        skipped.push({ name: line.itemName, reason: 'No longer available' });
        continue;
      }
      if (item.stock === 0) {
        skipped.push({ name: item.name, reason: 'Out of stock' });
        continue;
      }

      const inCart = await tx.cartItem.findUnique({ where: { userId_itemId: { userId, itemId: item.id } } });
      const current = inCart?.quantity ?? 0;
      const room = Math.min(item.stock, MAX_CART_QUANTITY) - current;
      if (room <= 0) {
        skipped.push({ name: item.name, reason: 'Your cart already has all available stock' });
        continue;
      }

      const quantity = Math.min(line.quantity, room);
      await tx.cartItem.upsert({
        where: { userId_itemId: { userId, itemId: item.id } },
        create: { userId, itemId: item.id, quantity },
        update: { quantity: current + quantity },
      });
      added.push({ name: item.name, quantity });
      if (quantity < line.quantity) {
        skipped.push({ name: item.name, reason: `Only ${quantity} of ${line.quantity} added (limited stock)` });
      }
    }
  });

  return { cart: await getCartSummary(userId), added, skipped };
}
