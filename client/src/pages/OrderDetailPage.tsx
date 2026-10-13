import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { STUDENT_CANCELLABLE_STATUSES, type OrderDetail } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useOrder } from '../hooks/useOrder';
import { useReorder } from '../hooks/useReorder';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/Modal';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { PaymentNote } from '../components/PaymentNote';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTimeline } from '../components/StatusTimeline';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { ArrowLeftIcon, MapPinIcon, PackageIcon, RefreshIcon, XCircleIcon } from '../components/icons';
import { formatDateTime, shortOrderId } from '../lib/format';

export function OrderDetailPage() {
  const { id } = useParams();
  const { order, loading, error, setOrder } = useOrder(id);
  const { reorder, busyId } = useReorder();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  const canCancel = STUDENT_CANCELLABLE_STATUSES.includes(order.status);

  async function cancelOrder() {
    setCancelling(true);
    try {
      const { order: updated } = await api<{ order: OrderDetail }>(`/orders/${order!.id}/cancel`, { method: 'POST' });
      setOrder(updated);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-medium text-slate-900">Delivery address</p>
              <p className="text-slate-600">
                Room {order.roomNo}, {order.bhawan} Bhawan, IIT Roorkee
              </p>
              {order.note && <p className="mt-1 text-slate-600">Note: {order.note}</p>}
              <PaymentNote className="mt-3" />
              {order.deliveryPartner && (
                <p className="mt-3 text-slate-600">
                  Delivering: <span className="font-medium text-slate-900">{order.deliveryPartner.name}</span>
                  {order.deliveryPartner.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${order.deliveryPartner.phone}`} className="text-brand-700 hover:underline">
                        {order.deliveryPartner.phone}
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="mb-3 text-sm font-medium text-slate-900">Order status</p>
            <StatusTimeline history={order.statusHistory} />
          </div>
        </div>

        <div className="mt-6">
          <OrderBreakdown order={order} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          {canCancel && (
            <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => setConfirmCancel(true)}>
              <XCircleIcon className="size-4" />
              Cancel order
            </button>
          )}
          <button className="btn-primary" onClick={() => reorder(order.id)} disabled={busyId === order.id}>
            {busyId === order.id ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
            Reorder
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="You can cancel while the order hasn't been confirmed yet. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        busy={cancelling}
        onConfirm={cancelOrder}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  );
}
