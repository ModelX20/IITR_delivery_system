import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { DeliveryDashboard, DeliveryOrder } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { FullPageSpinner, Spinner } from '../../components/Spinner';
import { ClipboardIcon, MapPinIcon, PackageIcon, PhoneIcon, RefreshIcon, TruckIcon, WalletIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { formatDateTime, formatPrice, shortOrderId } from '../../lib/format';

/** New orders appear without a manual refresh (real-time updates come in a later phase). */
const POLL_MS = 20_000;

export function DeliveryHomePage() {
  const { user } = useAuth();
  if (user?.partnerStatus !== 'APPROVED') return <AwaitingApproval />;
  return <DeliveryDashboardView />;
}

function AwaitingApproval() {
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const rejected = user?.partnerStatus === 'REJECTED';

  async function check() {
    setChecking(true);
    try {
      await refreshUser();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <EmptyState
      icon={<TruckIcon />}
      title={rejected ? 'Application not approved' : 'Waiting for approval'}
      message={
        rejected
          ? 'An admin did not approve your delivery partner request. Please contact the store if you think this is a mistake.'
          : `Thanks for signing up to deliver, ${user?.name.split(' ')[0]}! An admin will review your request. You'll be able to accept orders once you're approved.`
      }
      action={
        !rejected && (
          <button className="btn-secondary" onClick={check} disabled={checking}>
            {checking ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
            Check again
          </button>
        )
      }
    />
  );
}

type PendingAction = { order: DeliveryOrder; kind: 'accept' | 'pickup' | 'deliver' };

const ACTION_COPY = {
  accept: { path: 'accept', done: 'Order accepted. It is now yours to deliver.' },
  pickup: { path: 'pickup', done: 'Marked as out for delivery' },
  deliver: { path: 'deliver', done: 'Delivered! Nice work.' },
} as const;

function DeliveryDashboardView() {
  const { data, loading, error, reload } = useApi<DeliveryDashboard>('/delivery/dashboard');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeliver, setConfirmDeliver] = useState<DeliveryOrder | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  async function run({ order, kind }: PendingAction) {
    setBusyId(order.id);
    try {
      await api(`/delivery/orders/${order.id}/${ACTION_COPY[kind].path}`, { method: 'POST' });
      toast.success(ACTION_COPY[kind].done);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
      setConfirmDeliver(null);
      reload(); // always resync: someone else may have taken the order
    }
  }

  if (loading && !data) return <FullPageSpinner />;
  if (error || !data) return <EmptyState icon={<TruckIcon />} title="Couldn't load deliveries" message={error} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Deliveries</h1>
          <p className="mt-1 text-sm text-slate-500">Accept a confirmed order, pick it up, deliver it, and collect cash.</p>
        </div>
        <button className="btn-secondary" onClick={reload} disabled={loading}>
          {loading ? <Spinner className="size-4" /> : <RefreshIcon className="size-4" />}
          Refresh
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="In progress" value={data.active.length} />
        <Stat label="Delivered" value={data.stats.delivered} />
        <Stat label="Cash collected" value={formatPrice(data.stats.cashCollected)} />
      </div>

      <Section title="My deliveries" count={data.active.length}>
        {data.active.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-slate-500">You're not delivering anything right now. Accept an order below.</p>
        ) : (
          data.active.map((order) => (
            <OrderCard key={order.id} order={order}>
              {order.status === 'CONFIRMED' ? (
                <button className="btn-primary w-full sm:w-auto" disabled={busyId === order.id} onClick={() => run({ order, kind: 'pickup' })}>
                  {busyId === order.id && <Spinner className="size-4" />}
                  Picked up: out for delivery
                </button>
              ) : (
                <button
                  className="btn w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                  disabled={busyId === order.id}
                  onClick={() => setConfirmDeliver(order)}
                >
                  Mark delivered
                </button>
              )}
            </OrderCard>
          ))
        )}
      </Section>

      <Section title="Available orders" count={data.available.length} hint="Confirmed by the store and waiting for a delivery partner.">
        {data.available.length === 0 ? (
          <EmptyState icon={<PackageIcon />} title="No orders waiting" message="New orders show up here as soon as the store confirms them." />
        ) : (
          data.available.map((order) => (
            <OrderCard key={order.id} order={order}>
              <button className="btn-primary w-full sm:w-auto" disabled={busyId === order.id} onClick={() => run({ order, kind: 'accept' })}>
                {busyId === order.id && <Spinner className="size-4" />}
                Accept delivery
              </button>
            </OrderCard>
          ))
        )}
      </Section>

      <section>
        <button className="mb-3 text-sm font-semibold text-brand-700 hover:underline" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide' : 'Show'} delivery history ({data.history.length})
        </button>
        {showHistory &&
          (data.history.length === 0 ? (
            <p className="text-sm text-slate-500">No completed deliveries yet.</p>
          ) : (
            <ul className="card divide-y divide-slate-100">
              {data.history.map((o) => (
                <li key={o.id} className="flex items-center gap-4 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {shortOrderId(o.id)} · Room {o.roomNo}, {o.bhawan}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      <ConfirmDialog
        open={!!confirmDeliver}
        title={`Deliver ${confirmDeliver ? shortOrderId(confirmDeliver.id) : ''}?`}
        message={
          confirmDeliver && (
            <>
              Confirm you've handed over the order and collected <strong>{formatPrice(confirmDeliver.total)}</strong> in cash.
            </>
          )
        }
        confirmLabel="Yes, delivered"
        cancelLabel="Not yet"
        busy={busyId === confirmDeliver?.id}
        onConfirm={() => confirmDeliver && run({ order: confirmDeliver, kind: 'deliver' })}
        onClose={() => setConfirmDeliver(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{value}</p>
    </div>
  );
}

function Section({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        {title}
        <span className="rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-600">{count}</span>
      </h2>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function OrderCard({ order, children }: { order: DeliveryOrder; children: ReactNode }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{shortOrderId(order.id)}</p>
          <p className="text-xs text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <p className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <span>
            <span className="font-medium text-slate-900">Room {order.roomNo}</span>, {order.bhawan} Bhawan
            {order.note && <span className="block text-xs text-slate-500">Note: {order.note}</span>}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <ClipboardIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <span className="text-slate-600">{order.items.map((i) => `${i.itemName} × ${i.quantity}`).join(', ')}</span>
        </p>
        <p className="flex items-start gap-2">
          <WalletIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            Collect <span className="font-bold text-slate-900">{formatPrice(order.total)}</span> cash
          </span>
        </p>
      </div>

      {order.customer && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="font-medium text-slate-900">{order.customer.name}</span>
          {order.customer.phone && (
            <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1.5 text-brand-700 hover:underline">
              <PhoneIcon className="size-4" />
              {order.customer.phone}
            </a>
          )}
        </p>
      )}

      <div className="mt-4 flex justify-end">{children}</div>
    </article>
  );
}
