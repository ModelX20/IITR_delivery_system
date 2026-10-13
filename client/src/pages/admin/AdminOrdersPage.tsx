import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BHAWANS, ORDER_STATUSES, type AdminOrderSummary, type Paginated } from '@iitr/shared';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, STATUS_LABEL } from '../../components/StatusBadge';
import { FullPageSpinner } from '../../components/Spinner';
import { ClipboardIcon, SearchIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { formatDateTime, formatPrice, shortOrderId } from '../../lib/format';
import { PageHeader } from './AdminLayout';

const FILTER_KEYS = ['status', 'from', 'to', 'bhawan', 'user', 'page'] as const;

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const [userSearch, setUserSearch] = useState(params.get('user') ?? '');
  const debouncedUser = useDebounced(userSearch.trim());

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page'); // new filters start from page 1
    setParams(next, { replace: true });
  }

  // Push the debounced search box into the URL.
  useEffect(() => {
    if ((params.get('user') ?? '') !== debouncedUser) setParam('user', debouncedUser);
  }, [debouncedUser]);

  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const { data, loading, error } = useApi<Paginated<AdminOrderSummary>>(`/admin/orders?${query}`);
  const hasFilters = FILTER_KEYS.some((k) => k !== 'page' && params.get(k));

  return (
    <div>
      <PageHeader title="Orders" subtitle="All orders, newest first. Dates are in IST." />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Name, email or enrollment"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            aria-label="Search by customer"
          />
        </div>
        <select className="input" value={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select className="input" value={params.get('bhawan') ?? ''} onChange={(e) => setParam('bhawan', e.target.value)} aria-label="Bhawan">
          <option value="">All bhawans</option>
          {BHAWANS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          From
          <input type="date" className="input" value={params.get('from') ?? ''} onChange={(e) => setParam('from', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          To
          <input type="date" className="input" value={params.get('to') ?? ''} onChange={(e) => setParam('to', e.target.value)} />
        </label>
        {hasFilters && (
          <button
            className="btn-ghost justify-self-start px-2 py-1 text-sm sm:col-span-2 lg:col-span-5"
            onClick={() => {
              setUserSearch('');
              setParams({}, { replace: true });
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && !data ? (
        <FullPageSpinner />
      ) : error ? (
        <EmptyState icon={<ClipboardIcon />} title="Couldn't load orders" message={error} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState icon={<ClipboardIcon />} title={hasFilters ? 'No orders match these filters' : 'No orders yet'} />
      ) : (
        <>
          <ul className={`card divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {data.results.map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-x-5 p-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {shortOrderId(o.id)} <span className="font-normal text-slate-500">· {o.customer.name}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(o.createdAt)} · Room {o.roomNo}, {o.bhawan}
                    </p>
                    <p className="text-sm text-slate-600 sm:hidden">
                      {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} · <span className="font-semibold text-slate-900">{formatPrice(o.total)}</span>
                    </p>
                  </div>
                  <span className="hidden text-sm text-slate-600 sm:inline">
                    {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="hidden w-24 text-right font-semibold text-slate-900 sm:inline">{formatPrice(o.total)}</span>
                  <span className="shrink-0 text-right sm:w-36">
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(p) => setParam('page', String(p))} />
        </>
      )}
    </div>
  );
}
