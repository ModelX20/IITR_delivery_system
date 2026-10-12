export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Calls the API with the auth cookie and returns parsed JSON, or throws ApiError with the server's message. */
export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // A protected request was rejected: the session expired, so send the user back to login.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, data?.error ?? 'Something went wrong. Please try again.');
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
