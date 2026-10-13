import type { Item as DbItem, Order as DbOrder, OrderItem as DbOrderItem, User as DbUser } from '@prisma/client';
import type {
  AdminItem,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminUser,
  Bhawan,
  Item,
  OrderDetail,
  OrderSummary,
  User,
} from '@iitr/shared';
import { money } from './money';
import type { AdminOrderWithDetail, OrderWithDetail } from './orderInclude';

export function toUser(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollmentNo: user.enrollmentNo,
    phone: user.phone,
    bhawan: user.bhawan as Bhawan,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAdminUser(user: DbUser & { _count: { orders: number } }): AdminUser {
  return { ...toUser(user), isBlocked: user.isBlocked, orderCount: user._count.orders };
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

export function toAdminItem(item: DbItem): AdminItem {
  return { ...toItem(item), isActive: item.isActive, createdAt: item.createdAt.toISOString() };
}

type OrderWithQuantities = DbOrder & { items: Pick<DbOrderItem, 'quantity'>[] };

export function toOrderSummary(order: OrderWithQuantities): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    total: money(order.total),
    createdAt: order.createdAt.toISOString(),
  };
}

export function toAdminOrderSummary(
  order: OrderWithQuantities & { user: Pick<DbUser, 'id' | 'name' | 'email' | 'enrollmentNo'> },
): AdminOrderSummary {
  return {
    ...toOrderSummary(order),
    customer: { id: order.user.id, name: order.user.name, email: order.user.email, enrollmentNo: order.user.enrollmentNo },
    bhawan: order.bhawan,
    roomNo: order.roomNo,
  };
}

export function toOrderDetail(order: OrderWithDetail): OrderDetail {
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
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt.toISOString(),
      changedBy: { name: h.changedBy.name, role: h.changedBy.role },
    })),
  };
}

export function toAdminOrderDetail(order: AdminOrderWithDetail): AdminOrderDetail {
  return { ...toOrderDetail(order), customer: order.user };
}
