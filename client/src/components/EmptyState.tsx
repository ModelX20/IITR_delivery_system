import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 [&_svg]:size-7">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
