import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ORDER_STATUSES, type AdminDashboard, type StoreSettings } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge, STATUS_LABEL } from '../../components/StatusBadge';
import { FullPageSpinner, Spinner } from '../../components/Spinner';
import { AlertIcon, ClipboardIcon, GridIcon, TagIcon, UsersIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { formatDateTime, formatPrice, shortOrderId } from '../../lib/format';
import { PageHeader, useAdmin } from './AdminLayout';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 sm:flex">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="text-lg font-bold break-words text-slate-900 sm:text-xl">{value}</p>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data, loading, error, reload } = useApi<AdminDashboard>('/admin/dashboard');
  const { refreshLowStock } = useAdmin();

  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setThreshold(String(data.lowStockThreshold));
  }, [data]);

  if (loading && !data) return <FullPageSpinner />;
  if (error || !data) return <EmptyState icon={<GridIcon />} title="Couldn't load the dashboard" message={error} />;

  async function saveThreshold(e: FormEvent) {
    e.preventDefault();
    const value = Number(threshold);
    if (!Number.isInteger(value) || value < 0) return toast.error('Threshold must be a whole number, 0 or more');
    setSaving(true);
    try {
      await api<{ settings: StoreSettings }>('/admin/settings', { method: 'PATCH', body: { lowStockThreshold: value } });
      toast.success('Low-stock threshold updated');
      reload();
      refreshLowStock();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today at a glance (IST)" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders today" value={data.ordersToday} icon={<ClipboardIcon />} />
        <StatCard label="Revenue today" value={formatPrice(data.revenueToday)} icon={<span className="text-lg font-bold">₹</span>} />
        <StatCard label="Students" value={data.totalStudents} icon={<UsersIcon />} />
        <StatCard label="Items on sale" value={data.activeItems} icon={<TagIcon />} />
      </div>

      <section className="card mt-6 p-5" aria-label="Orders by status">
        <h2 className="mb-3 font-semibold text-slate-900">Orders by status</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <Link
              key={s}
              to={`/admin/orders?status=${s}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="font-bold text-slate-900 tabular-nums">{data.ordersByStatus[s]}</span>
              <span className="text-slate-600">{STATUS_LABEL[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-label="Low stock">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <AlertIcon className="size-5 text-red-500" />
              Low stock
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{data.lowStockCount}</span>
            </h2>
            <form onSubmit={saveThreshold} className="flex items-center gap-2 text-sm">
              <label htmlFor="threshold" className="text-slate-600">
                Alert at ≤
              </label>
              <input
                id="threshold"
                type="number"
                min={0}
                className="input w-20 py-1.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <button className="btn-secondary px-3 py-1.5" disabled={saving || threshold === String(data.lowStockThreshold)}>
                {saving ? <Spinner className="size-4" /> : 'Save'}
              </button>
            </form>
          </div>
          {data.lowStockItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">All items are well stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm font-medium text-slate-800">{item.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      item.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.stock === 0 ? 'Out of stock' : `${item.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/items?lowStock=true" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            Restock items →
          </Link>
        </section>

        <section className="card p-5" aria-label="Recent orders">
          <h2 className="mb-4 font-semibold text-slate-900">Recent orders</h2>
          {data.recentOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {shortOrderId(o.id)} · {o.customer.name}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/orders" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            All orders →
          </Link>
        </section>
      </div>
    </div>
  );
}
