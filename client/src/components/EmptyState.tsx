import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  emoji,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  /** A large emoji illustration, used instead of the icon. */
  emoji?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex animate-fade-in flex-col items-center px-6 py-14 text-center">
      {emoji ? (
        <div className="relative mb-5 flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100">
          <span className="text-6xl" aria-hidden="true">
            {emoji}
          </span>
        </div>
      ) : (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 [&_svg]:size-7">{icon}</div>
      )}
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
