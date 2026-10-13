import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ORDER_TRANSITIONS, type AdminOrderDetail, type OrderStatus } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/Modal';
import { OrderBreakdown } from '../../components/OrderBreakdown';
import { PaymentNote } from '../../components/PaymentNote';
import { StatusBadge, STATUS_LABEL } from '../../components/StatusBadge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { FullPageSpinner, Spinner } from '../../components/Spinner';
import { ArrowLeftIcon, ClipboardIcon, MailIcon, MapPinIcon, PhoneIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { formatDateTime, shortOrderId } from '../../lib/format';
import { useAdmin } from './AdminLayout';

const ACTION_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Mark placed', // never offered: nothing transitions back to PLACED
  CONFIRMED: 'Confirm order',
  OUT_FOR_DELIVERY: 'Mark out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data, loading, error, setData } = useApi<{ order: AdminOrderDetail }>(`/admin/orders/${encodeURIComponent(id ?? '')}`);
  const { refreshLowStock } = useAdmin();
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading && !data) return <FullPageSpinner />;
  if (error || !data) {
    return (
      <EmptyState
        icon={<ClipboardIcon />}
        title="Order not found"
        message={error}
        action={<Link to="/admin/orders" className="btn-primary">All orders</Link>}
      />
    );
  }

  const { order } = data;
  const nextStatuses = ORDER_TRANSITIONS[order.status];

  async function changeStatus(status: OrderStatus) {
    setPendingStatus(status);
    try {
      const result = await api<{ order: AdminOrderDetail }>(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status } });
      setData(result);
      toast.success(`Order ${shortOrderId(order.id)} is now ${STATUS_LABEL[status].toLowerCase()}`);
      if (status === 'CANCELLED') refreshLowStock();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPendingStatus(null);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
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

        {nextStatuses.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 rounded-lg bg-brand-50/60 p-3">
            <span className="mr-auto self-center text-sm font-medium text-brand-900">Update status:</span>
            {nextStatuses.map((status) =>
              status === 'CANCELLED' ? (
                <button key={status} className="btn-secondary text-red-600 hover:bg-red-50" disabled={!!pendingStatus} onClick={() => setConfirmCancel(true)}>
                  {ACTION_LABEL[status]}
                </button>
              ) : (
                <button key={status} className="btn-primary" disabled={!!pendingStatus} onClick={() => changeStatus(status)}>
                  {pendingStatus === status && <Spinner className="size-4" />}
                  {ACTION_LABEL[status]}
                </button>
              ),
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-900">{order.customer.name}</p>
            <p className="text-slate-500">Enrollment {order.customer.enrollmentNo}</p>
            <a href={`mailto:${order.customer.email}`} className="mt-2 flex items-center gap-2 break-all text-brand-700 hover:underline">
              <MailIcon className="size-4 shrink-0" />
              {order.customer.email}
            </a>
            <a href={`tel:${order.customer.phone}`} className="mt-1 flex items-center gap-2 text-brand-700 hover:underline">
              <PhoneIcon className="size-4 shrink-0" />
              {order.customer.phone}
            </a>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-medium text-slate-900">
                Room {order.roomNo}, {order.bhawan} Bhawan
              </p>
              {order.note && <p className="mt-1 text-slate-600">Note: {order.note}</p>}
              <PaymentNote className="mt-2" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 p-4">
            <p className="mb-3 text-sm font-medium text-slate-900">History</p>
            <StatusTimeline history={order.statusHistory} showActor />
          </div>
        </div>

        <div className="mt-6">
          <OrderBreakdown order={order} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel order ${shortOrderId(order.id)}?`}
        message="The items will be returned to stock. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        busy={pendingStatus === 'CANCELLED'}
        onConfirm={() => changeStatus('CANCELLED')}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  );
}
