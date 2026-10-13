// Shapes of API responses. Money values are strings with 2 decimals (e.g. "120.00")
// so no precision is lost going through JSON.
import type { Bhawan, OrderStatus, Role } from './config';

export interface User {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  phone: string;
  bhawan: Bhawan;
  role: Role;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  stock: number;
}

export interface CartLine {
  itemId: string;
  name: string;
  imageUrl: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  stock: number;
}

export interface CartSummary {
  items: CartLine[];
  itemCount: number;
  subtotal: string;
  deliveryFee: string;
  total: string;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  itemCount: number;
  total: string;
  createdAt: string;
}

export interface OrderLine {
  itemId: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderDetail {
  id: string;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  total: string;
  bhawan: string;
  roomNo: string;
  note: string | null;
  createdAt: string;
  items: OrderLine[];
  statusHistory: StatusChange[];
}

export interface StatusChange {
  status: OrderStatus;
  changedAt: string;
  changedBy: { name: string; role: Role };
}

export interface ReorderResult {
  cart: CartSummary;
  added: { name: string; quantity: number }[];
  skipped: { name: string; reason: string }[];
}

// ---------- Admin ----------

export interface Paginated<T> {
  results: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminItem extends Item {
  isActive: boolean;
  createdAt: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  phone: string;
}

export interface AdminOrderSummary extends OrderSummary {
  customer: Pick<OrderCustomer, 'id' | 'name' | 'email' | 'enrollmentNo'>;
  bhawan: string;
  roomNo: string;
}

export interface AdminOrderDetail extends OrderDetail {
  customer: OrderCustomer;
}

export interface AdminUser extends User {
  isBlocked: boolean;
  orderCount: number;
}

export interface StoreSettings {
  lowStockThreshold: number;
}

export interface AdminDashboard {
  ordersToday: number;
  revenueToday: string;
  ordersByStatus: Record<OrderStatus, number>;
  totalStudents: number;
  activeItems: number;
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockItems: AdminItem[];
  recentOrders: AdminOrderSummary[];
}
