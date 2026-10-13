// Shapes of API responses. Money values are strings with 2 decimals (e.g. "120.00")
// so no precision is lost going through JSON.
import type { Bhawan, OrderStatus, PartnerStatus, Role } from './config';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Null until a Google sign-up completes their profile. */
  enrollmentNo: string | null;
  phone: string | null;
  bhawan: Bhawan | null;
  role: Role;
  /** Delivery partners only: they can deliver once an admin has APPROVED them. */
  partnerStatus: PartnerStatus | null;
  /** True once enrollment number, phone and bhawan are all set. Students need this to order. */
  profileComplete: boolean;
  createdAt: string;
}

export interface AuthConfig {
  googleEnabled: boolean;
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
  category: string;
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
  /** Who is delivering it, once a partner has accepted. */
  deliveryPartner: { name: string; phone: string | null } | null;
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
  enrollmentNo: string | null;
  phone: string | null;
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

export interface SalesTotals {
  orders: number;
  revenue: string;
}

export interface AdminDashboard {
  ordersToday: number;
  revenueToday: string;
  /** Non-cancelled orders, by IST calendar periods. */
  sales: { today: SalesTotals; last7Days: SalesTotals; thisMonth: SalesTotals };
  pendingPartners: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalStudents: number;
  activeItems: number;
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockItems: AdminItem[];
  recentOrders: AdminOrderSummary[];
}

// ---------- Delivery partners ----------

export interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  createdAt: string;
  acceptedAt: string | null;
  bhawan: string;
  roomNo: string;
  note: string | null;
  /** Cash to collect from the student (Cash on Delivery). */
  total: string;
  itemCount: number;
  items: { itemName: string; quantity: number }[];
  /** Only shown once the order is assigned to you. */
  customer: { name: string; phone: string | null } | null;
}

export interface DeliveryDashboard {
  available: DeliveryOrder[];
  active: DeliveryOrder[];
  history: DeliveryOrder[];
  stats: { delivered: number; cashCollected: string };
}
