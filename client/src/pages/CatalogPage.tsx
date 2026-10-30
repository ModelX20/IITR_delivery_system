import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, type Item } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { SearchIcon, XIcon } from '../components/icons';
import { useDebounced } from '../hooks/useDebounced';
import { CATEGORY_ICONS } from '../lib/itemVisual';
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from '../lib/photos';

type Sort = 'relevance' | 'price-asc' | 'price-desc';

/** Photo banners; tapping one jumps to its category. */
const OFFERS = [
  { title: 'Midnight Maggi', body: 'Hot noodles to your room, even at 2 AM', cta: 'Order now', category: 'Food', photo: PHOTOS.maggiBowl },
  { title: 'Chai & snack break', body: 'Masala chai, biscuits and namkeen', cta: 'Grab a bite', category: 'Snacks', photo: PHOTOS.samosa },
  { title: 'Exam season', body: 'Registers, pens and calculators', cta: 'Stock up', category: 'Stationery', photo: PHOTOS.calculator },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-slate-200/70" />
      <div className="mt-6 space-y-2">
        <div className="h-3 w-1/3 rounded bg-slate-200/70" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-12 rounded bg-slate-200" />
      </div>
    </div>
  );
}

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5';

export function CatalogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('relevance');
  const [under50, setUnder50] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
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

  // Sorting and quick filters run on the already-loaded list.
  const visible = useMemo(() => {
    let list = items;
    if (under50) list = list.filter((i) => Number(i.price) < 50);
    if (inStockOnly) list = list.filter((i) => i.stock > 0);
    if (sort !== 'relevance') {
      const dir = sort === 'price-asc' ? 1 : -1;
      list = [...list].sort((a, b) => (Number(a.price) - Number(b.price)) * dir);
    }
    return list;
  }, [items, sort, under50, inStockOnly]);

  const filtersActive = sort !== 'relevance' || under50 || inStockOnly;
  // With no search, category or filter, show the menu grouped into sections, like a restaurant page.
  const grouped = !debouncedSearch && !category && !filtersActive;
  const sections = useMemo(
    () => (grouped ? CATEGORIES.map((c) => ({ category: c, items: visible.filter((i) => i.category === c) })).filter((s) => s.items.length) : []),
    [grouped, visible],
  );

  function clearAll() {
    setSearch('');
    setCategory('');
    setSort('relevance');
    setUnder50(false);
    setInStockOnly(false);
  }

  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
      active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`;

  return (
    <div>
      {/* Photo hero with search */}
      <section className="relative -mx-4 -mt-4 mb-8 overflow-hidden bg-ink sm:-mt-6 md:mx-0 md:mt-0 md:rounded-3xl">
        <img src={unsplash(PHOTOS.hero, 1600, 700)} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 photo-scrim" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" aria-hidden="true" />
        <div className="relative flex min-h-[300px] flex-col justify-end px-5 pt-10 pb-6 text-white sm:min-h-[360px] sm:px-10 sm:pb-10">
          <p className="text-sm font-semibold text-white/80">
            {greeting()}, {user?.name.split(' ')[0]} 👋
          </p>
          <h1 className="mt-1 max-w-xl text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">Campus cravings, delivered to your door.</h1>
          <div className="relative mt-5 max-w-2xl">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-brand-600" />
            <input
              type="search"
              className="input rounded-2xl border-transparent py-4 pr-11 pl-12 text-[15px] shadow-float [&::-webkit-search-cancel-button]:hidden"
              placeholder='Search "Maggi", "cold coffee", "pen"…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search items by name"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Photo offer banners */}
      {!debouncedSearch && (
        <section aria-label="Offers" className="-mx-4 mb-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          {OFFERS.map((o) => (
            <button
              key={o.title}
              type="button"
              onClick={() => setCategory(o.category)}
              className="group relative flex h-44 w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl bg-ink text-left text-white shadow-soft sm:w-auto"
            >
              <img src={unsplash(o.photo, 700, 400)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-110" />
              <span className="absolute inset-0 photo-scrim-left" aria-hidden="true" />
              <span className="relative flex max-w-[75%] flex-col justify-end p-4">
                <span className="text-xl leading-tight font-extrabold">{o.title}</span>
                <span className="mt-1 text-sm text-white/85">{o.body}</span>
                <span className="mt-3 w-fit rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  {o.cta} →
                </span>
              </span>
            </button>
          ))}
        </section>
      )}

      {/* "What's on your mind?" photo circles */}
      <section className="mb-6" aria-label="Categories">
        <h2 className="mb-4 text-xl font-extrabold text-ink sm:text-2xl">{user?.name.split(' ')[0]}, what's on your mind?</h2>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pt-1.5 pb-2 no-scrollbar sm:gap-7" role="group" aria-label="Filter by category">
          {[{ value: '', label: 'All', photo: PHOTOS.hero }, ...CATEGORIES.map((c) => ({ value: c, label: c, photo: CATEGORY_PHOTOS[c] }))].map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={active}
                className="group flex w-[76px] shrink-0 flex-col items-center gap-2 sm:w-28"
              >
                <span
                  className={`size-[76px] overflow-hidden rounded-full bg-slate-200 shadow-soft transition sm:size-28 ${
                    active ? 'ring-[3px] ring-brand-600 ring-offset-2' : ''
                  }`}
                >
                  <img
                    src={unsplash(c.photo, 240, 240)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </span>
                <span className={`text-sm font-bold ${active ? 'text-brand-600' : 'text-slate-700'}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sort and quick filters */}
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-slate-100 bg-[#f7f7f8]/95 px-4 py-3 backdrop-blur md:top-[72px]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <label className={`${chip(sort !== 'relevance')} relative pr-8`}>
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="cursor-pointer appearance-none bg-transparent font-semibold outline-none"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <span className="pointer-events-none absolute right-3 text-[10px]" aria-hidden="true">
              ▼
            </span>
          </label>
          <button type="button" className={chip(under50)} onClick={() => setUnder50((v) => !v)} aria-pressed={under50}>
            Under ₹50
          </button>
          <button type="button" className={chip(inStockOnly)} onClick={() => setInStockOnly((v) => !v)} aria-pressed={inStockOnly}>
            In stock
          </button>
          {(filtersActive || category || search) && (
            <button type="button" onClick={clearAll} className="flex shrink-0 items-center gap-1 px-2 text-[13px] font-bold text-brand-600 hover:underline">
              <XIcon className="size-3.5" />
              Clear all
            </button>
          )}
          {!loading && !error && (
            <p className="ml-auto shrink-0 pl-2 text-xs font-semibold text-slate-500">
              {visible.length} {visible.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <EmptyState emoji="😕" title="Couldn't load items" message={error} />
      ) : loading && items.length === 0 ? (
        <div className={GRID}>
          {Array.from({ length: 10 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="No items found"
          message={debouncedSearch ? `We couldn't find anything for "${debouncedSearch}". Try another search or category.` : 'Try a different category or filter.'}
          action={
            <button className="btn-outline" onClick={clearAll}>
              Clear filters
            </button>
          }
        />
      ) : grouped ? (
        <div className={`space-y-10 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {sections.map((s) => (
            <section key={s.category} aria-labelledby={`cat-${s.category}`}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id={`cat-${s.category}`} className="text-lg font-extrabold text-ink sm:text-xl">
                  <span aria-hidden="true">{CATEGORY_ICONS[s.category]}</span> {s.category}
                  <span className="ml-2 text-sm font-semibold text-slate-400">({s.items.length})</span>
                </h2>
                <button type="button" onClick={() => setCategory(s.category)} className="shrink-0 text-sm font-bold text-brand-600 hover:underline">
                  See all ›
                </button>
              </div>
              <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:gap-5">
                {s.items.map((item) => (
                  <div key={item.id} className="w-[42%] shrink-0 snap-start sm:w-44 lg:w-48">
                    <ItemCard item={item} showCategory={false} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={`${GRID} transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
