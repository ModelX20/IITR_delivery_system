import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return <p className="mt-4 text-sm text-slate-500">{total} total</p>;

  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <button className="btn-secondary px-3 py-2" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeftIcon className="size-4" />
        </button>
        <button className="btn-secondary px-3 py-2" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </nav>
  );
}
