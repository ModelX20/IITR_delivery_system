import type { Item as DbItem, Order as DbOrder, OrderItem as DbOrderItem, User as DbUser } from '@prisma/client';
import type { Bhawan, Item, OrderDetail, OrderSummary, User } from '@iitr/shared';
import { money } from './money';

export function toUser(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollmentNo: user.enrollmentNo,
    phone: user.phone,
    bhawan: user.bhawan as Bhawan,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toItem(item: DbItem): Item {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: money(item.price),
    imageUrl: item.imageUrl,
    stock: item.stock,
  };
}

export function toOrderSummary(order: DbOrder & { items: Pick<DbOrderItem, 'quantity'>[] }): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    total: money(order.total),
    createdAt: order.createdAt.toISOString(),
  };
}

export function toOrderDetail(order: DbOrder & { items: DbOrderItem[] }): OrderDetail {
  return {
    id: order.id,
    status: order.status,
    subtotal: money(order.subtotal),
    deliveryFee: money(order.deliveryFee),
    total: money(order.total),
    bhawan: order.bhawan,
    roomNo: order.roomNo,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      itemId: i.itemId,
      itemName: i.itemName,
      unitPrice: money(i.unitPrice),
      quantity: i.quantity,
      lineTotal: money(i.lineTotal),
    })),
  };
}
