import { Link, useParams } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import { EmptyState } from '../components/EmptyState';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { PaymentNote } from '../components/PaymentNote';
import { FullPageSpinner } from '../components/Spinner';
import { CheckCircleIcon, MapPinIcon, PackageIcon } from '../components/icons';
import { formatDateTime, formatPrice, shortOrderId } from '../lib/format';

export function OrderConfirmationPage() {
  const { id } = useParams();
  const { order, loading, error } = useOrder(id);

  if (loading) return <FullPageSpinner />;
  if (error || !order) {
    return <EmptyState icon={<PackageIcon />} title="Order not found" message={error} action={<Link to="/orders" className="btn-primary">My orders</Link>} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card overflow-hidden">
        <div className="bg-brand-900 px-6 py-8 text-center text-white">
          <CheckCircleIcon className="mx-auto size-14 text-gold-400" strokeWidth={1.6} />
          <h1 className="mt-3 text-2xl font-bold">Order placed!</h1>
          <p className="mt-1 text-brand-100">
            Order {shortOrderId(order.id)} · {formatPrice(order.total)}
          </p>
        </div>
        <div className="space-y-6 p-6">
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-medium text-slate-900">
                Delivering to Room {order.roomNo}, {order.bhawan} Bhawan
              </p>
              <p className="text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
              {order.note && <p className="mt-1 text-slate-600">Note: {order.note}</p>}
              <PaymentNote className="mt-2" />
            </div>
          </div>
          <OrderBreakdown order={order} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={`/orders/${order.id}`} className="btn-secondary flex-1">
              View order details
            </Link>
            <Link to="/" className="btn-primary flex-1">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
