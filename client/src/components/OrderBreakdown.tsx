import type { OrderDetail } from '@iitr/shared';
import { formatPrice } from '../lib/format';

/** Items table + totals for an order, using the prices saved when the order was placed. */
export function OrderBreakdown({ order }: { order: OrderDetail }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-center font-medium">Qty</th>
              <th className="py-2 pl-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((i) => (
              <tr key={i.itemId}>
                <td className="py-3 pr-3 font-medium text-slate-900">{i.itemName}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-slate-600">{formatPrice(i.unitPrice)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{i.quantity}</td>
                <td className="py-3 pl-3 text-right font-medium whitespace-nowrap">{formatPrice(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 ml-auto max-w-xs space-y-2 border-t border-slate-200 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Subtotal</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Delivery fee</dt>
          <dd>{Number(order.deliveryFee) === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(order.deliveryFee)}</dd>
        </div>
        <div className="flex justify-between text-base font-bold text-slate-900">
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
