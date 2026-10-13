import { useEffect, useState } from 'react';
import { CATEGORIES, type Item } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { SearchIcon } from '../components/icons';
import { useDebounced } from '../hooks/useDebounced';
import { CATEGORY_ICONS } from '../lib/itemVisual';

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-3">
      <div className="aspect-square rounded-lg bg-slate-100" />
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-1/3 rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 w-12 rounded bg-slate-200" />
          <div className="h-8 w-16 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function CatalogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearch = useDebounced(search.trim(), 300);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (category) params.set('category', category);

    setLoading(true);
    setError('');
    api<{ items: Item[] }>(`/items?${params}`)
      .then(({ items }) => !cancelled && setItems(items))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, category]);

  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-brand-800 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 to-brand-900 px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-gold-400/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-brand-200">Hi {user?.name.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">What can we bring you today?</h1>
          <p className="mt-1 text-sm text-brand-100">
            Delivering to <span className="font-semibold text-white">{user?.bhawan} Bhawan</span> · Free delivery above ₹300 · Cash on Delivery
          </p>
          <div className="relative mt-5 max-w-xl">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="input border-transparent py-3 pl-11 shadow-sm"
              placeholder="Search for Maggi, registers, chai…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search items by name"
            />
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
          <button type="button" className={chip(category === '')} onClick={() => setCategory('')} aria-pressed={category === ''}>
            <span aria-hidden="true">🛍️</span> All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)} aria-pressed={category === c}>
              <span aria-hidden="true">{CATEGORY_ICONS[c]}</span> {c}
            </button>
          ))}
        </div>
        {!loading && !error && (
          <p className="text-sm text-slate-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        )}
      </div>

      {error ? (
        <EmptyState icon={<SearchIcon />} title="Couldn't load items" message={error} />
      ) : loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No items found"
          message="Try a different search or category."
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch('');
                setCategory('');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div
          className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}
          aria-busy={loading}
        >
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
