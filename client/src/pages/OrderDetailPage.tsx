import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PAYMENT_METHOD_LABEL, STUDENT_CANCELLABLE_STATUSES, type OrderDetail } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useOrder } from '../hooks/useOrder';
import { useReorder } from '../hooks/useReorder';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/Modal';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { OrderProgress, STATUS_HERO } from '../components/OrderProgress';
import { StatusTimeline } from '../components/StatusTimeline';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { ArrowLeftIcon, MapPinIcon, PhoneIcon, RefreshIcon, WalletIcon, XCircleIcon } from '../components/icons';
import { formatDateTime, shortOrderId } from '../lib/format';
import { PHOTOS, unsplash } from '../lib/photos';

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
        emoji="🔎"
        title="Order not found"
        message={error || 'This order does not exist or does not belong to you.'}
        action={
          <Link to="/orders" className="btn-primary">
            Back to my orders
          </Link>
        }
      />
    );
  }

  const canCancel = STUDENT_CANCELLABLE_STATUSES.includes(order.status);
  const hero = STATUS_HERO[order.status];

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
    <div className="mx-auto max-w-4xl">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-brand-600">
        <ArrowLeftIcon className="size-4" />
        All orders
      </Link>

      {/* Status hero + tracker */}
      <section className="card overflow-hidden">
        <div className={`relative bg-gradient-to-r px-5 py-6 text-white sm:px-6 ${hero.className}`}>
          <img src={unsplash(PHOTOS.hero, 1200, 500)} alt="" className="absolute inset-0 size-full object-cover opacity-30 mix-blend-overlay" />
          <span className="absolute -top-12 -right-10 size-44 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute right-6 bottom-2 text-6xl drop-shadow-lg sm:text-7xl" aria-hidden="true">
            {hero.emoji}
          </span>
          <p className="relative text-xs font-bold tracking-wide text-white/80 uppercase">
            Order {shortOrderId(order.id)} · {formatDateTime(order.createdAt)}
          </p>
          <h1 className="relative mt-1 text-2xl font-extrabold sm:text-3xl">{hero.title}</h1>
          <p className="relative mt-1 max-w-[70%] text-sm text-white/90">{hero.message}</p>
        </div>
        {order.status !== 'CANCELLED' && (
          <div className="px-3 py-5 sm:px-6">
            <OrderProgress status={order.status} history={order.statusHistory} />
          </div>
        )}
        {order.deliveryPartner && (
          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-xl" aria-hidden="true">
              🧑‍🦱
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">Your delivery partner</p>
              <p className="truncate font-extrabold text-ink">{order.deliveryPartner.name}</p>
            </div>
            {order.deliveryPartner.phone && (
              <a href={`tel:${order.deliveryPartner.phone}`} className="btn-success px-4 py-2" aria-label={`Call ${order.deliveryPartner.name}`}>
                <PhoneIcon className="size-4" />
                Call
              </a>
            )}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <section className="card p-4 sm:p-5" aria-label="Order items">
          <h2 className="mb-4 flex items-center gap-2 font-extrabold text-ink">
            <span aria-hidden="true">🛍️</span> IITR Campus Store
          </h2>
          <OrderBreakdown order={order} />
        </section>

        <div className="space-y-4">
          <section className="card space-y-4 p-4 text-sm sm:p-5" aria-label="Delivery details">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPinIcon className="size-5" />
              </span>
              <div>
                <p className="font-extrabold text-ink">Delivery address</p>
                <p className="text-slate-600">
                  Room {order.roomNo}, {order.bhawan} Bhawan, IIT Roorkee
                </p>
                {order.note && <p className="mt-1 text-slate-500 italic">“{order.note}”</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-fresh-50 text-fresh-600">
                <WalletIcon className="size-5" />
              </span>
              <div>
                <p className="font-extrabold text-ink">Payment</p>
                <p className="text-slate-600">{PAYMENT_METHOD_LABEL}</p>
              </div>
            </div>
          </section>

          <section className="card p-4 sm:p-5" aria-label="Status history">
            <h2 className="mb-4 font-extrabold text-ink">Status history</h2>
            <StatusTimeline history={order.statusHistory} />
          </section>

          <div className="flex flex-col gap-3">
            <button className="btn-primary py-3" onClick={() => reorder(order.id)} disabled={busyId === order.id}>
              {busyId === order.id ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
              Reorder
            </button>
            {canCancel && (
              <button className="btn-secondary py-3 text-red-600 hover:border-red-200 hover:bg-red-50" onClick={() => setConfirmCancel(true)}>
                <XCircleIcon className="size-4" />
                Cancel order
              </button>
            )}
          </div>
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
