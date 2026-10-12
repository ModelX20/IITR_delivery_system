import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { CartSummary } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from './AuthContext';

const EMPTY_CART: CartSummary = { items: [], itemCount: 0, subtotal: '0.00', deliveryFee: '0.00', total: '0.00' };

interface CartContextValue {
  cart: CartSummary;
  loading: boolean;
  /** Item ids with a request in flight, to disable their buttons. */
  pending: Set<string>;
  quantityOf: (itemId: string) => number;
  add: (itemId: string, name: string) => Promise<void>;
  setQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      setCart(await api<CartSummary>('/cart'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refresh();
    } else {
      setCart(EMPTY_CART);
    }
  }, [user, refresh]);

  /** Runs a cart request, marks the item as busy meanwhile, and stores the server's updated cart. */
  const mutate = useCallback(async (itemId: string, request: () => Promise<CartSummary>) => {
    setPending((s) => new Set(s).add(itemId));
    try {
      setCart(await request());
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(itemId);
        return next;
      });
    }
  }, []);

  const add = useCallback(
    async (itemId: string, name: string) => {
      await mutate(itemId, () => api<CartSummary>('/cart', { method: 'POST', body: { itemId, quantity: 1 } }));
      toast.success(`${name} added to cart`);
    },
    [mutate],
  );

  const setQuantity = useCallback(
    (itemId: string, quantity: number) =>
      mutate(itemId, () => api<CartSummary>(`/cart/${itemId}`, { method: 'PATCH', body: { quantity } })),
    [mutate],
  );

  const remove = useCallback(
    (itemId: string) => mutate(itemId, () => api<CartSummary>(`/cart/${itemId}`, { method: 'DELETE' })),
    [mutate],
  );

  const quantityOf = useCallback(
    (itemId: string) => cart.items.find((i) => i.itemId === itemId)?.quantity ?? 0,
    [cart],
  );

  const value = useMemo(
    () => ({ cart, loading, pending, quantityOf, add, setQuantity, remove, refresh }),
    [cart, loading, pending, quantityOf, add, setQuantity, remove, refresh],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
