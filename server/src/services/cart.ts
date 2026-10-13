import type { CartSummary } from '@iitr/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { deliveryFeeFor, lineTotal, money, sum } from '../lib/money';

/** The user's cart with all prices and totals computed on the server. */
export async function getCartSummary(userId: string): Promise<CartSummary> {
  const lines = await prisma.cartItem.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { id: 'asc' },
  });

  const lineTotals = lines.map((l) => lineTotal(l.item.price, l.quantity));
  const subtotal = sum(lineTotals);
  const deliveryFee = deliveryFeeFor(subtotal);

  return {
    items: lines.map((l, i) => ({
      itemId: l.itemId,
      name: l.item.name,
      category: l.item.category,
      imageUrl: l.item.imageUrl,
      unitPrice: money(l.item.price),
      quantity: l.quantity,
      lineTotal: money(lineTotals[i]),
      stock: l.item.isActive ? l.item.stock : 0,
    })),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: money(subtotal),
    deliveryFee: money(deliveryFee),
    total: money(subtotal.plus(deliveryFee)),
  };
}

async function findAvailableItem(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) throw new AppError(404, 'Item not found');
  return item;
}

function assertInStock(item: { name: string; stock: number }, quantity: number) {
  if (item.stock === 0) throw new AppError(409, `${item.name} is out of stock`);
  if (quantity > item.stock) throw new AppError(409, `Only ${item.stock} of ${item.name} left in stock`);
}

export async function addToCart(userId: string, itemId: string, quantity: number) {
  const item = await findAvailableItem(itemId);
  const existing = await prisma.cartItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  assertInStock(item, newQuantity);

  await prisma.cartItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, quantity: newQuantity },
    update: { quantity: newQuantity },
  });
}

export async function updateCartQuantity(userId: string, itemId: string, quantity: number) {
  const existing = await prisma.cartItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (!existing) throw new AppError(404, 'This item is not in your cart');
  const item = await findAvailableItem(itemId);
  assertInStock(item, quantity);

  await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
}

export async function removeFromCart(userId: string, itemId: string) {
  await prisma.cartItem.deleteMany({ where: { userId, itemId } });
}
