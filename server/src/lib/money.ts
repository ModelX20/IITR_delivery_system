import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export const DELIVERY_FEE = new Decimal('20.00');
export const FREE_DELIVERY_ABOVE = new Decimal('300.00');

/** Flat ₹20 delivery, free when the subtotal is above ₹300. No fee for an empty cart. */
export function deliveryFeeFor(subtotal: Decimal): Decimal {
  if (subtotal.isZero() || subtotal.greaterThan(FREE_DELIVERY_ABOVE)) return new Decimal(0);
  return DELIVERY_FEE;
}

export function lineTotal(unitPrice: Decimal, quantity: number): Decimal {
  return unitPrice.times(quantity);
}

export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0));
}

/** Serialise money for JSON as a fixed 2-decimal string, e.g. "120.00". */
export function money(value: Decimal): string {
  return value.toFixed(2);
}
