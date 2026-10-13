import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CATEGORIES, type AdminItem } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/Modal';
import { FullPageSpinner } from '../../components/Spinner';
import { PencilIcon, PlusIcon, SearchIcon, TagIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { formatPrice } from '../../lib/format';
import { PageHeader, useAdmin } from './AdminLayout';
import { ItemFormModal } from './ItemFormModal';

export function AdminItemsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebounced(search.trim());
  const category = params.get('category') ?? '';
  const status = params.get('status') ?? 'all';
  const lowStock = params.get('lowStock') === 'true';

  const query = new URLSearchParams();
  if (debouncedSearch) query.set('search', debouncedSearch);
  if (category) query.set('category', category);
  if (status !== 'all') query.set('status', status);
  if (lowStock) query.set('lowStock', 'true');

  const { data, loading, error, setData } = useApi<{ items: AdminItem[] }>(`/admin/items?${query}`);
  const { lowStockCount, refreshLowStock } = useAdmin();

  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<AdminItem | null>(null);
  const [busy, setBusy] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function upsertLocal(item: AdminItem) {
    setData((d) => {
      if (!d) return d;
      const exists = d.items.some((i) => i.id === item.id);
      return { items: exists ? d.items.map((i) => (i.id === item.id ? item : i)) : [item, ...d.items] };
    });
    refreshLowStock();
  }

  async function setActive(item: AdminItem, isActive: boolean) {
    setBusy(true);
    try {
      const { item: saved } = isActive
        ? await api<{ item: AdminItem }>(`/admin/items/${item.id}`, { method: 'PATCH', body: { isActive: true } })
        : await api<{ item: AdminItem }>(`/admin/items/${item.id}`, { method: 'DELETE' });
      upsertLocal(saved);
      toast.success(isActive ? `${item.name} is back on sale` : `${item.name} removed from sale`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setDeactivating(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Removing an item only hides it from students. Past orders keep their history."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            Add item
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>
        <select className="input" value={category} onChange={(e) => setParam('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setParam('status', e.target.value === 'all' ? '' : e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="active">On sale</option>
          <option value="inactive">Removed</option>
        </select>
        <button
          className={`btn ${lowStock ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          onClick={() => setParam('lowStock', lowStock ? '' : 'true')}
          aria-pressed={lowStock}
        >
          Low stock
          <span className={`rounded-full px-1.5 text-xs ${lowStock ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>{lowStockCount}</span>
        </button>
      </div>

      {loading && !data ? (
        <FullPageSpinner />
      ) : error ? (
        <EmptyState icon={<TagIcon />} title="Couldn't load items" message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={<TagIcon />} title="No items found" message="Try different filters, or add a new item." />
      ) : (
        <ul className={`card divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
          {data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:flex-nowrap">
              <img src={item.imageUrl} alt="" className={`size-12 shrink-0 rounded-lg bg-slate-100 object-cover ${item.isActive ? '' : 'opacity-40 grayscale'}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${item.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{item.name}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
              <span className="w-24 text-sm font-semibold text-slate-900 sm:text-right">{formatPrice(item.price)}</span>
              <StockBadge stock={item.stock} />
              <div className="ml-auto flex gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  onClick={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  aria-label={`Edit ${item.name}`}
                >
                  <PencilIcon className="size-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                {item.isActive ? (
                  <button className="btn-ghost px-3 py-1.5 text-red-600 hover:bg-red-50" onClick={() => setDeactivating(item)} disabled={busy}>
                    Remove
                  </button>
                ) : (
                  <button className="btn-ghost px-3 py-1.5 text-emerald-700 hover:bg-emerald-50" onClick={() => setActive(item, true)} disabled={busy}>
                    Restore
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ItemFormModal
        open={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(item) => {
          upsertLocal(item);
          setFormOpen(false);
        }}
      />
      <ConfirmDialog
        open={!!deactivating}
        title={`Remove ${deactivating?.name ?? ''} from sale?`}
        message="Students won't see it any more. Past orders are not affected, and you can restore it at any time."
        confirmLabel="Remove from sale"
        tone="danger"
        busy={busy}
        onConfirm={() => deactivating && setActive(deactivating, false)}
        onClose={() => setDeactivating(null)}
      />
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const { lowStockThreshold } = useAdmin();
  const tone = stock === 0 ? 'bg-red-100 text-red-700' : stock <= lowStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
  return <span className={`w-24 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold ${tone}`}>{stock === 0 ? 'Out of stock' : `${stock} in stock`}</span>;
}
