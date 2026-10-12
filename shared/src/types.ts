// Shapes of API responses. Money values are strings with 2 decimals (e.g. "120.00")
// so no precision is lost going through JSON.
import type { Bhawan, OrderStatus } from './config';

export interface User {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  phone: string;
  bhawan: Bhawan;
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
}
