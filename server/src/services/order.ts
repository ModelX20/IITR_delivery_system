import type { PlaceOrderInput } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { deliveryFeeFor, lineTotal, sum } from '../lib/money';
import { orderDetailInclude } from '../lib/orderInclude';

/**
 * Places an order from the user's cart in a single transaction:
 * check + decrement stock, create the order with price snapshots and its first status-history entry, clear the cart.
 * Any thrown error rolls the whole transaction back.
 */
export async function placeOrder(userId: string, input: PlaceOrderInput) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cartItem.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { id: 'asc' },
    });
    if (cart.length === 0) throw new AppError(400, 'Your cart is empty');

    for (const line of cart) {
      if (!line.item.isActive) {
        throw new AppError(409, `${line.item.name} is no longer available. Please remove it from your cart.`);
      }
      // Conditional decrement: only succeeds if enough stock is left at this moment,
      // so two concurrent orders can never oversell the same item.
      const { count } = await tx.item.updateMany({
        where: { id: line.itemId, isActive: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (count === 0) {
        const current = await tx.item.findUnique({ where: { id: line.itemId }, select: { stock: true } });
        const left = current?.stock ?? 0;
        throw new AppError(
          409,
          left === 0
            ? `${line.item.name} is out of stock. Please remove it from your cart.`
            : `Only ${left} of ${line.item.name} left in stock. Please reduce the quantity.`,
        );
      }
    }

    const lines = cart.map((line) => ({
      itemId: line.itemId,
      itemName: line.item.name,
      unitPrice: line.item.price,
      quantity: line.quantity,
      lineTotal: lineTotal(line.item.price, line.quantity),
    }));
    const subtotal = sum(lines.map((l) => l.lineTotal));
    const deliveryFee = deliveryFeeFor(subtotal);

    const order = await tx.order.create({
      data: {
        userId,
        subtotal,
        deliveryFee,
        total: subtotal.plus(deliveryFee),
        bhawan: input.bhawan,
        roomNo: input.roomNo,
        note: input.note || null,
        items: { create: lines },
        statusHistory: { create: { status: 'PLACED', changedById: userId } },
      },
      include: orderDetailInclude,
    });

    await tx.cartItem.deleteMany({ where: { userId } });
    return order;
  });
}
