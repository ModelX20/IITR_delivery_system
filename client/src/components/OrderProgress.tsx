import type { OrderStatus, StatusChange } from '@iitr/shared';

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'PLACED', label: 'Placed', emoji: '📝' },
  { status: 'CONFIRMED', label: 'Confirmed', emoji: '👍' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the way', emoji: '🛵' },
  { status: 'DELIVERED', label: 'Delivered', emoji: '🏠' },
];

/** What the customer sees for each status: a big emoji, a headline and a short message. */
export const STATUS_HERO: Record<OrderStatus, { emoji: string; title: string; message: string; className: string }> = {
  PLACED: {
    emoji: '🧾',
    title: 'Order placed',
    message: 'Waiting for the store to confirm your order.',
    className: 'from-zinc-900 to-zinc-700',
  },
  CONFIRMED: {
    emoji: '🛍️',
    title: 'Packing your order',
    message: 'The store confirmed your order. A delivery partner will pick it up soon.',
    className: 'from-brand-500 to-rose-500',
  },
  OUT_FOR_DELIVERY: {
    emoji: '🛵',
    title: 'On the way!',
    message: 'Your order is out for delivery. Keep the cash ready.',
    className: 'from-amber-500 to-brand-500',
  },
  DELIVERED: {
    emoji: '🎉',
    title: 'Delivered',
    message: 'Your order was delivered. Enjoy!',
    className: 'from-fresh-500 to-teal-500',
  },
  CANCELLED: {
    emoji: '🚫',
    title: 'Order cancelled',
    message: "This order was cancelled. You haven't been charged.",
    className: 'from-slate-500 to-slate-600',
  },
};

const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Horizontal Placed → Confirmed → On the way → Delivered tracker. */
export function OrderProgress({ status, history }: { status: OrderStatus; history: StatusChange[] }) {
  const current = STEPS.findIndex((s) => s.status === status);
  const reachedAt = (s: OrderStatus) => history.find((h) => h.status === s)?.changedAt;

  return (
    <ol className="flex items-start" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current && status !== 'DELIVERED';
        const at = reachedAt(step.status);
        return (
          <li key={step.status} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && (
              <span className="absolute top-5 right-1/2 -z-0 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span className={`block h-full rounded-full bg-fresh-500 transition-all duration-700 ${done ? 'w-full' : 'w-0'}`} />
              </span>
            )}
            <span
              className={`relative z-10 flex size-10 items-center justify-center rounded-full text-lg transition ${
                done ? 'bg-fresh-500 shadow-md shadow-fresh-500/30' : 'bg-slate-100 grayscale'
              } ${active ? 'ring-4 ring-fresh-500/25' : ''}`}
            >
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-fresh-500/30" aria-hidden="true" />}
              <span aria-hidden="true">{step.emoji}</span>
            </span>
            <span className={`mt-2 text-xs font-bold ${done ? 'text-ink' : 'text-slate-400'}`}>{step.label}</span>
            <span className="text-[11px] text-slate-500">{at ? timeFormat.format(new Date(at)) : '\u00a0'}</span>
          </li>
        );
      })}
    </ol>
  );
}
