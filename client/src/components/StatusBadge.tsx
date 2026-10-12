import type { OrderStatus } from '@iitr/shared';

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  PLACED: { label: 'Placed', className: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-amber-50 text-amber-800 ring-amber-600/25' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-red-700 ring-red-600/20' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
