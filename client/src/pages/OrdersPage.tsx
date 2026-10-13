import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderSummary } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { useReorder } from '../hooks/useReorder';
import { PackageIcon, RefreshIcon } from '../components/icons';
import { formatDateTime, formatPrice, shortOrderId } from '../lib/format';

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
  if (error) return <EmptyState icon={<PackageIcon />} title="Couldn't load your orders" message={error} />;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<PackageIcon />}
        title="No orders yet"
        message="When you place an order, it will show up here."
        action={
          <Link to="/" className="btn-primary">
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My orders</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition hover:border-brand-200 hover:shadow-md sm:flex-nowrap">
            <Link to={`/orders/${o.id}`} className="flex min-w-0 flex-1 items-center gap-x-6">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{shortOrderId(o.id)}</p>
                <p className="text-sm text-slate-500">{formatDateTime(o.createdAt)}</p>
                <p className="text-sm text-slate-600 sm:hidden">
                  {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} · <span className="font-semibold text-slate-900">{formatPrice(o.total)}</span>
                </p>
              </div>
              <p className="hidden text-sm text-slate-600 sm:block">
                {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="hidden w-24 text-right font-semibold text-slate-900 sm:block">{formatPrice(o.total)}</p>
              <div className="shrink-0 text-right sm:w-36">
                <StatusBadge status={o.status} />
              </div>
            </Link>
            <button
              className="btn-secondary w-full px-3 py-2 sm:w-auto"
              onClick={() => reorder(o.id)}
              disabled={busyId === o.id}
              aria-label={`Reorder ${shortOrderId(o.id)}`}
            >
              {busyId === o.id ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
              Reorder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
