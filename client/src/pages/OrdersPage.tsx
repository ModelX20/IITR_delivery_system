import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderSummary } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { FullPageSpinner } from '../components/Spinner';
import { PackageIcon } from '../components/icons';
import { formatDateTime, formatPrice, shortOrderId } from '../lib/format';

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 transition hover:border-brand-200 hover:shadow-md sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{shortOrderId(o.id)}</p>
                <p className="text-sm text-slate-500">{formatDateTime(o.createdAt)}</p>
              </div>
              <p className="text-sm text-slate-600">
                {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="w-24 text-right font-semibold text-slate-900">{formatPrice(o.total)}</p>
              <div className="w-36 text-right">
                <StatusBadge status={o.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
