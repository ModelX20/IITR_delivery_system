import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROLES, type AdminUser, type Paginated, type Role } from '@iitr/shared';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { FullPageSpinner } from '../../components/Spinner';
import { BanIcon, SearchIcon, UsersIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { PageHeader } from './AdminLayout';

const ROLE_LABEL: Record<Role, string> = { STUDENT: 'Student', DELIVERY_PARTNER: 'Delivery partner', ADMIN: 'Admin' };

type PendingAction = { user: AdminUser; kind: 'role'; role: Role } | { user: AdminUser; kind: 'block'; isBlocked: boolean };

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebounced(search.trim());

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) setParam('search', debouncedSearch);
  }, [debouncedSearch]);

  const query = new URLSearchParams();
  for (const key of ['search', 'role', 'blocked', 'page']) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const { data, loading, error, setData } = useApi<Paginated<AdminUser>>(`/admin/users?${query}`);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply(action: PendingAction) {
    setBusy(true);
    try {
      const { user } =
        action.kind === 'role'
          ? await api<{ user: AdminUser }>(`/admin/users/${action.user.id}/role`, { method: 'PATCH', body: { role: action.role } })
          : await api<{ user: AdminUser }>(`/admin/users/${action.user.id}/block`, { method: 'PATCH', body: { isBlocked: action.isBlocked } });
      setData((d) => d && { ...d, results: d.results.map((u) => (u.id === user.id ? user : u)) });
      toast.success(
        action.kind === 'role'
          ? `${user.name} is now ${ROLE_LABEL[user.role].toLowerCase()}`
          : `${user.name} has been ${user.isBlocked ? 'blocked' : 'unblocked'}`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Change roles or block accounts. Blocked users are logged out immediately." />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Name, email or enrollment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <select className="input" value={params.get('role') ?? ''} onChange={(e) => setParam('role', e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <select className="input" value={params.get('blocked') ?? ''} onChange={(e) => setParam('blocked', e.target.value)} aria-label="Account status">
          <option value="">Active and blocked</option>
          <option value="false">Active only</option>
          <option value="true">Blocked only</option>
        </select>
      </div>

      {loading && !data ? (
        <FullPageSpinner />
      ) : error ? (
        <EmptyState icon={<UsersIcon />} title="Couldn't load users" message={error} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title="No users found" />
      ) : (
        <>
          <ul className={`card divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {data.results.map((u) => {
              const isMe = u.id === me?.id;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                      {u.name}
                      {isMe && <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">You</span>}
                      {u.isBlocked && (
                        <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-700">
                          <BanIcon className="size-3" />
                          Blocked
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {u.email} · {u.enrollmentNo} · {u.bhawan} · {u.orderCount} {u.orderCount === 1 ? 'order' : 'orders'}
                    </p>
                  </div>
                  <select
                    className="input w-auto py-1.5"
                    value={u.role}
                    disabled={isMe || busy}
                    title={isMe ? "You can't change your own role" : undefined}
                    onChange={(e) => setPending({ user: u, kind: 'role', role: e.target.value as Role })}
                    aria-label={`Role for ${u.name}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`btn px-3 py-1.5 ${u.isBlocked ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' : 'text-red-600 hover:bg-red-50'}`}
                    disabled={isMe || busy}
                    onClick={() => setPending({ user: u, kind: 'block', isBlocked: !u.isBlocked })}
                  >
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        title={
          pending?.kind === 'role'
            ? `Make ${pending.user.name} ${ROLE_LABEL[pending.role].toLowerCase()}?`
            : pending?.isBlocked
              ? `Block ${pending?.user.name}?`
              : `Unblock ${pending?.user.name}?`
        }
        message={
          pending?.kind === 'role'
            ? pending.role === 'ADMIN'
              ? 'Admins can manage items, all orders and all users.'
              : 'Their access changes on their next action. No need to log out.'
            : pending?.isBlocked
              ? "They'll be logged out immediately and won't be able to log in."
              : 'They will be able to log in again.'
        }
        confirmLabel={pending?.kind === 'role' ? 'Change role' : pending?.isBlocked ? 'Block user' : 'Unblock user'}
        tone={pending?.kind === 'block' && pending.isBlocked ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={() => pending && apply(pending)}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
