import type { OrderDetail } from '@iitr/shared';
import { formatPrice } from '../lib/format';
import { BillDetails } from './BillDetails';

/** Items list + bill for an order, using the prices saved when the order was placed. */
export function OrderBreakdown({ order }: { order: OrderDetail }) {
  return (
    <div>
      <ul className="space-y-3">
        {order.items.map((i) => (
          <li key={i.itemId} className="flex items-start justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-5 min-w-7 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-600 tabular-nums">
                {i.quantity}×
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{i.itemName}</p>
                <p className="text-xs text-slate-500">{formatPrice(i.unitPrice)} each</p>
              </div>
            </div>
            <span className="font-semibold whitespace-nowrap text-ink">{formatPrice(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="bill-divider mt-5 pt-5">
        <BillDetails subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} totalLabel="Total" />
      </div>
    </div>
  );
}
