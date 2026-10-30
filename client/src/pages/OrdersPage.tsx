import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderStatus, OrderSummary } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { STATUS_HERO } from '../components/OrderProgress';
import { StatusBadge } from '../components/StatusBadge';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { useReorder } from '../hooks/useReorder';
import { ChevronRightIcon, RefreshIcon } from '../components/icons';
import { formatDateTime, formatPrice, shortOrderId } from '../lib/format';

const ACTIVE: OrderStatus[] = ['PLACED', 'CONFIRMED', 'OUT_FOR_DELIVERY'];

function ActiveOrderCard({ order }: { order: OrderSummary }) {
  const hero = STATUS_HERO[order.status];
  return (
    <Link
      to={`/orders/${order.id}`}
      className={`relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r p-4 text-white shadow-float transition hover:brightness-105 ${hero.className}`}
    >
      <span className="absolute -top-10 -right-6 size-32 rounded-full bg-white/10" aria-hidden="true" />
      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur" aria-hidden="true">
        {hero.emoji}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-white/80 uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          Live · {shortOrderId(order.id)}
        </span>
        <span className="mt-0.5 block text-lg font-extrabold">{hero.title}</span>
        <span className="block truncate text-sm text-white/85">
          {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {formatPrice(order.total)}
        </span>
      </span>
      <span className="relative flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-ink">
        Track
        <ChevronRightIcon className="size-4" />
      </span>
    </Link>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { reorder, busyId } = useReorder();

  useEffect(() => {
    api<{ orders: OrderSummary[] }>('/orders')
      .then(({ orders }) => setOrders(orders))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (error) return <EmptyState emoji="😕" title="Couldn't load your orders" message={error} />;

  if (orders.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="No orders yet"
        message="Your first order is just a few taps away. Once you place it, you can track it here."
        action={
          <Link to="/" className="btn-primary px-6">
            Start shopping
          </Link>
        }
      />
    );
  }

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your orders</h1>
      <p className="mb-6 text-sm text-slate-500">Track live orders and reorder your favourites.</p>

      {active.length > 0 && (
        <section className="mb-8" aria-labelledby="active-orders">
          <h2 id="active-orders" className="mb-3 text-sm font-extrabold tracking-wide text-slate-500 uppercase">
            In progress
          </h2>
          <div className="space-y-3">
            {active.map((o) => (
              <ActiveOrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-orders">
          <h2 id="past-orders" className="mb-3 text-sm font-extrabold tracking-wide text-slate-500 uppercase">
            Past orders
          </h2>
          <ul className="space-y-3">
            {past.map((o) => (
              <li key={o.id} className="card overflow-hidden transition hover:shadow-float">
                <Link to={`/orders/${o.id}`} className="flex items-center gap-3 p-4">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-2xl"
                    aria-hidden="true"
                  >
                    {STATUS_HERO[o.status].emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-ink">IITR Campus Store</p>
                    <p className="text-xs text-slate-500">
                      {shortOrderId(o.id)} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
                <div className="bill-divider mx-4 flex items-center justify-between gap-3 py-3">
                  <p className="text-sm text-slate-600">
                    {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · <span className="font-extrabold text-ink">{formatPrice(o.total)}</span>
                  </p>
                  <button
                    className="btn-outline px-3.5 py-2"
                    onClick={() => reorder(o.id)}
                    disabled={busyId === o.id}
                    aria-label={`Reorder ${shortOrderId(o.id)}`}
                  >
                    {busyId === o.id ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
                    Reorder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
