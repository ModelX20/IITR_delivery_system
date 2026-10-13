import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { ReorderResult } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useCart } from '../context/CartContext';

/** Adds a past order's items to the cart and tells the user what was added or skipped. */
export function useReorder() {
  const { replace } = useCart();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reorder(orderId: string) {
    setBusyId(orderId);
    try {
      const result = await api<ReorderResult>(`/orders/${orderId}/reorder`, { method: 'POST' });
      replace(result.cart);

      const skipped = result.skipped.map((s) => `• ${s.name}: ${s.reason}`).join('\n');
      if (result.added.length === 0) {
        toast.error(`Nothing could be added to your cart.\n${skipped}`, { duration: 6000 });
        return;
      }
      const count = result.added.reduce((n, a) => n + a.quantity, 0);
      if (skipped) {
        toast(`Added ${count} item${count === 1 ? '' : 's'} at current prices. Some items were skipped:\n${skipped}`, {
          icon: '⚠️',
          duration: 7000,
        });
      } else {
        toast.success(`Added ${count} item${count === 1 ? '' : 's'} to your cart at current prices`);
      }
      navigate('/cart');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return { reorder, busyId };
}
