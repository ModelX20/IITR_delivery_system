import { useEffect, useState } from 'react';
import type { OrderDetail } from '@iitr/shared';
import { api, errorMessage } from '../api/client';

export function useOrder(id: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api<{ order: OrderDetail }>(`/orders/${encodeURIComponent(id)}`)
      .then(({ order }) => !cancelled && setOrder(order))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { order, loading, error };
}
