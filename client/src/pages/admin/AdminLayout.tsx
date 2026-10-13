import { createContext, useContext } from 'react';
import type { AdminItem, StoreSettings } from '@iitr/shared';
import { Shell } from '../../components/Layout';
import { ClipboardIcon, GridIcon, TagIcon, UsersIcon } from '../../components/icons';
import { useApi } from '../../hooks/useApi';

interface AdminContextValue {
  lowStockCount: number;
  lowStockThreshold: number;
  /** Call after anything that changes stock (item edits, cancellations). */
  refreshLowStock: () => void;
}

const AdminContext = createContext<AdminContextValue>({ lowStockCount: 0, lowStockThreshold: 5, refreshLowStock: () => {} });

export function AdminLayout() {
  const lowStock = useApi<{ items: AdminItem[] }>('/admin/items?lowStock=true');
  const settings = useApi<{ settings: StoreSettings }>('/admin/settings');
  const lowStockCount = lowStock.data?.items.length ?? 0;
  const lowStockThreshold = settings.data?.settings.lowStockThreshold ?? 5;
  const refreshLowStock = () => {
    lowStock.reload();
    settings.reload();
  };

  return (
    <AdminContext.Provider value={{ lowStockCount, lowStockThreshold, refreshLowStock }}>
      <Shell
        items={[
          { to: '/admin', label: 'Dashboard', icon: <GridIcon />, end: true },
          { to: '/admin/items', label: 'Items', icon: <TagIcon />, badge: lowStockCount, badgeTone: 'red' },
          { to: '/admin/orders', label: 'Orders', icon: <ClipboardIcon /> },
          { to: '/admin/users', label: 'Users', icon: <UsersIcon /> },
        ]}
      />
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
