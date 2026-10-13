// Fire-and-forget work (e.g. sending email) that must never fail or slow down an API response.
// Errors are logged, not thrown. Tasks live only in this process: there is no retry or persistence.

const pending = new Set<Promise<void>>();

export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const promise: Promise<void> = Promise.resolve()
    .then(task)
    .then(
      () => undefined,
      (err) => console.error(`[background] ${label} failed:`, err instanceof Error ? err.message : err),
    )
    .finally(() => pending.delete(promise));
  pending.add(promise);
}

/** Waits until all background work has finished (used by tests, and on shutdown). */
export async function flushBackground(): Promise<void> {
  while (pending.size > 0) await Promise.allSettled([...pending]);
}
