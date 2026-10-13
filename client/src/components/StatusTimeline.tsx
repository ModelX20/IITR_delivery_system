import type { OrderStatus, Role, StatusChange } from '@iitr/shared';
import { formatDateTime } from '../lib/format';
import { STATUS_LABEL } from './StatusBadge';

const DOT: Record<OrderStatus, string> = {
  PLACED: 'bg-sky-500',
  CONFIRMED: 'bg-indigo-500',
  OUT_FOR_DELIVERY: 'bg-amber-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

const ROLE_LABEL: Record<Role, string> = { STUDENT: 'Student', DELIVERY_PARTNER: 'Delivery partner', ADMIN: 'Admin' };

/** Vertical timeline of an order's status changes, oldest first. */
export function StatusTimeline({ history, showActor = false }: { history: StatusChange[]; showActor?: boolean }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
      {history.map((h, i) => {
        const latest = i === history.length - 1;
        return (
          <li key={`${h.status}-${h.changedAt}`} className="relative">
            <span
              className={`absolute top-1 -left-[31px] size-3.5 rounded-full ring-4 ring-white ${DOT[h.status]} ${
                latest ? '' : 'opacity-60'
              }`}
            />
            <p className={`text-sm font-semibold ${latest ? 'text-slate-900' : 'text-slate-600'}`}>{STATUS_LABEL[h.status]}</p>
            <p className="text-xs text-slate-500">
              {formatDateTime(h.changedAt)}
              {showActor && (
                <>
                  {' '}
                  · by {h.changedBy.name} ({ROLE_LABEL[h.changedBy.role]})
                </>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
