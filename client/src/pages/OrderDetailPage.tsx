import { Link, useParams } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import { EmptyState } from '../components/EmptyState';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { StatusBadge } from '../components/StatusBadge';
import { FullPageSpinner } from '../components/Spinner';
import { ArrowLeftIcon, MapPinIcon, PackageIcon } from '../components/icons';
import { formatDateTime, shortOrderId } from '../lib/format';

export function OrderDetailPage() {
  const { id } = useParams();
  const { order, loading, error } = useOrder(id);

  if (loading) return <FullPageSpinner />;
  if (error || !order) {
    return (
      <EmptyState
        icon={<PackageIcon />}
        title="Order not found"
        message={error || 'This order does not exist or does not belong to you.'}
        action={<Link to="/orders" className="btn-primary">Back to my orders</Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeftIcon className="size-4" />
        All orders
      </Link>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Order {shortOrderId(order.id)}</h1>
            <p className="text-sm text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm">
          <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">Delivery address</p>
            <p className="text-slate-600">
              Room {order.roomNo}, {order.bhawan} Bhawan, IIT Roorkee
            </p>
            {order.note && <p className="mt-1 text-slate-600">Note: {order.note}</p>}
          </div>
        </div>

        <div className="mt-6">
          <OrderBreakdown order={order} />
        </div>
      </div>
    </div>
  );
}
