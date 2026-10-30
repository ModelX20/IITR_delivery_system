import { formatPrice } from '../lib/format';
import { ReceiptIcon } from './icons';

const FREE_DELIVERY_ABOVE = 300;

/** "Bill details" block: item total, delivery fee and the amount to pay. */
export function BillDetails({
  subtotal,
  deliveryFee,
  total,
  itemCount,
  showFreeDeliveryProgress = false,
  totalLabel = 'To pay',
}: {
  subtotal: string;
  deliveryFee: string;
  total: string;
  itemCount?: number;
  /** Show how far the cart is from free delivery (cart page only). */
  showFreeDeliveryProgress?: boolean;
  totalLabel?: string;
}) {
  const free = Number(deliveryFee) === 0;
  const remaining = Math.max(0, FREE_DELIVERY_ABOVE - Number(subtotal));

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
        <ReceiptIcon className="size-4 text-slate-500" />
        Bill details
      </h3>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Item total{itemCount !== undefined && ` (${itemCount} item${itemCount === 1 ? '' : 's'})`}</dt>
          <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Delivery fee</dt>
          <dd className="font-medium">{free ? <span className="font-bold text-fresh-600">FREE</span> : <span className="text-ink">{formatPrice(deliveryFee)}</span>}</dd>
        </div>
      </dl>

      {showFreeDeliveryProgress &&
        (free ? (
          <p className="mt-3 rounded-xl bg-fresh-50 px-3 py-2.5 text-xs font-bold text-fresh-700">🎉 Yay! You get free delivery on this order</p>
        ) : (
          <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
            <p>
              Add items worth <span className="font-extrabold">{formatPrice(remaining)}</span> more for <span className="font-extrabold">FREE delivery</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200/60" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (Number(subtotal) / FREE_DELIVERY_ABOVE) * 100)}%` }}
              />
            </div>
          </div>
        ))}

      <div className="bill-divider mt-4 flex items-center justify-between pt-4">
        <span className="text-[15px] font-extrabold text-ink uppercase">{totalLabel}</span>
        <span className="text-lg font-extrabold text-ink">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
