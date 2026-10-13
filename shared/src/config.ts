// Edit these lists to change the options shown in the app. Used by both client and server.

export const BHAWANS = [
  'Rajendra',
  'Radhakrishnan',
  'Cautley',
  'Ganga',
  'Govind',
  'Jawahar',
  'Kasturba',
  'Sarojini',
  'Azad',
  'Ravindra',
  'Malviya',
  'Rajiv',
  'Vigyan Kunj',
  'Himalaya',
] as const;

export const CATEGORIES = ['Snacks', 'Beverages', 'Stationery', 'Essentials', 'Food'] as const;

export const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

export const ROLES = ['STUDENT', 'DELIVERY_PARTNER', 'ADMIN'] as const;

/** Allowed order status changes. Anything not listed here is rejected by the server. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Students may cancel their own order only while it is in one of these statuses. */
export const STUDENT_CANCELLABLE_STATUSES: readonly OrderStatus[] = ['PLACED'];

export const IITR_EMAIL_DOMAIN = '@iitr.ac.in';

/** Where each role lands after logging in. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/',
  DELIVERY_PARTNER: '/delivery',
  ADMIN: '/admin',
};

export const PAYMENT_METHOD_LABEL = 'Cash on Delivery';

export type Bhawan = (typeof BHAWANS)[number];
export type Category = (typeof CATEGORIES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Role = (typeof ROLES)[number];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
