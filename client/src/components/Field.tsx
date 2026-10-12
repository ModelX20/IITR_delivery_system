import type { ReactNode } from 'react';

/** Label + control + inline error message. The control should set aria-invalid and aria-describedby itself. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function fieldProps(id: string, error?: string) {
  return {
    id,
    name: id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}
