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

/** Roles a person may choose when signing up. Admins are only ever created by another admin. */
export const SIGNUP_ROLES = ['STUDENT', 'DELIVERY_PARTNER'] as const;

export const PARTNER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

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

/** Google accounts from these domains may sign in (password sign-up stays IITR-only). */
export const GOOGLE_ALLOWED_DOMAINS = [IITR_EMAIL_DOMAIN, '@gmail.com'] as const;

export function isAllowedGoogleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return GOOGLE_ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

export const PASSWORD_RESET_TTL_MINUTES = 30;

/** Email verification codes sent during sign-up. */
export const SIGNUP_CODE = {
  length: 6,
  ttlMinutes: 10,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxResends: 5,
} as const;

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
export type SignupRole = (typeof SIGNUP_ROLES)[number];
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
