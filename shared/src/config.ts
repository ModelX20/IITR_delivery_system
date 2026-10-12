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

export const IITR_EMAIL_DOMAIN = '@iitr.ac.in';

export type Bhawan = (typeof BHAWANS)[number];
export type Category = (typeof CATEGORIES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
