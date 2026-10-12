const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** "120" or "120.00" -> "₹120.00" (display only; all maths happens on the server). */
export function formatPrice(value: string | number): string {
  return currency.format(Number(value));
}

const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Short, readable order reference, e.g. "#K3F9X2QA". */
export function shortOrderId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}
