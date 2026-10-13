import { useEffect, useState } from 'react';
import { CATEGORIES, type Item } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { SearchIcon } from '../components/icons';
import { useDebounced } from '../hooks/useDebounced';

function SkeletonCard() {
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="h-10 rounded-lg bg-slate-100" />
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
    `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-brand-800 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          What do you need{user ? `, ${user.name.split(' ')[0]}` : ''}?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Delivered to {user?.bhawan} Bhawan · free delivery above ₹300
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input py-3 pl-10"
            placeholder="Search items, e.g. Maggi, register, chai…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search items by name"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by category">
          <button type="button" className={chip(category === '')} onClick={() => setCategory('')} aria-pressed={category === ''}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)} aria-pressed={category === c}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <EmptyState icon={<SearchIcon />} title="Couldn't load items" message={error} />
      ) : loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
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
          className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-5 md:grid-cols-3 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}
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
