import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BHAWANS, placeOrderSchema, type OrderDetail, type PlaceOrderInput } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { EmptyState } from '../components/EmptyState';
import { Field, fieldProps } from '../components/Field';
import { QuantityStepper } from '../components/QuantityStepper';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { CartIcon, TrashIcon } from '../components/icons';
import { formatPrice } from '../lib/format';
import { validate, type FieldErrors } from '../lib/forms';

const FREE_DELIVERY_ABOVE = 300;

export function CartPage() {
  const { user } = useAuth();
  const { cart, loading, pending, setQuantity, remove, refresh } = useCart();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState({ bhawan: user?.bhawan ?? '', roomNo: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors<PlaceOrderInput>>({});
  const [placing, setPlacing] = useState(false);

  if (loading) return <FullPageSpinner />;

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon />}
        title="Your cart is empty"
        message="Add snacks, stationery or essentials and we'll bring them to your room."
        action={
          <Link to="/" className="btn-primary">
            Browse items
          </Link>
        }
      />
    );
  }

  const set = (key: keyof typeof delivery) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDelivery((d) => ({ ...d, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = validate(placeOrderSchema, { ...delivery, note: delivery.note || undefined });
    if (errors) return setErrors(errors);

    setPlacing(true);
    try {
      const { order } = await api<{ order: OrderDetail }>('/orders', { method: 'POST', body: data });
      toast.success('Order placed!');
      navigate(`/orders/${order.id}/confirmation`, { replace: true });
      refresh(); // cart is now empty on the server; update the navbar badge
    } catch (err) {
      toast.error(errorMessage(err));
      // Stock may have changed; show the latest cart.
      await refresh();
    } finally {
      setPlacing(false);
    }
  }

  const anyOverStock = cart.items.some((i) => i.quantity > i.stock);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your cart</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <section className="card divide-y divide-slate-100" aria-label="Cart items">
          {cart.items.map((line) => {
            const busy = pending.has(line.itemId);
            const overStock = line.quantity > line.stock;
            return (
              <div key={line.itemId} className={`flex gap-4 p-4 ${busy ? 'opacity-60' : ''}`}>
                <img src={line.imageUrl} alt="" className="size-20 shrink-0 rounded-lg bg-slate-100 object-cover sm:size-24" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-900">{line.name}</h2>
                      <p className="text-sm text-slate-500">{formatPrice(line.unitPrice)} each</p>
                    </div>
                    <p className="font-semibold whitespace-nowrap text-slate-900">{formatPrice(line.lineTotal)}</p>
                  </div>
                  {overStock && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {line.stock === 0 ? 'Out of stock. Please remove it.' : `Only ${line.stock} left. Please reduce the quantity.`}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <QuantityStepper
                      size="sm"
                      quantity={line.quantity}
                      max={Math.max(line.stock, 1)}
                      busy={busy}
                      onChange={(q) => setQuantity(line.itemId, q).catch(() => {})}
                      onRemove={() => remove(line.itemId).catch(() => {})}
                    />
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50"
                      disabled={busy}
                      onClick={() => remove(line.itemId).catch(() => {})}
                    >
                      <TrashIcon className="size-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <form onSubmit={placeOrder} noValidate className="space-y-6 lg:sticky lg:top-24">
          <section className="card p-5" aria-label="Delivery details">
            <h2 className="mb-4 font-semibold text-slate-900">Delivery details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field id="bhawan" label="Bhawan" error={errors.bhawan}>
                  <select {...fieldProps('bhawan', errors.bhawan)} className="input" value={delivery.bhawan} onChange={set('bhawan')}>
                    <option value="" disabled>
                      Select
                    </option>
                    {BHAWANS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="roomNo" label="Room number" error={errors.roomNo}>
                  <input {...fieldProps('roomNo', errors.roomNo)} className="input" placeholder="e.g. B-214" value={delivery.roomNo} onChange={set('roomNo')} />
                </Field>
              </div>
              <Field id="note" label="Note (optional)" error={errors.note}>
                <textarea
                  {...fieldProps('note', errors.note)}
                  rows={2}
                  className="input resize-none"
                  placeholder="e.g. Call when you reach the gate"
                  value={delivery.note}
                  onChange={set('note')}
                />
              </Field>
            </div>
          </section>

          <section className="card p-5" aria-label="Order summary">
            <h2 className="mb-4 font-semibold text-slate-900">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal ({cart.itemCount} items)</dt>
                <dd className="font-medium">{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery fee</dt>
                <dd className="font-medium">
                  {Number(cart.deliveryFee) === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(cart.deliveryFee)}
                </dd>
              </div>
              {Number(cart.deliveryFee) > 0 && (
                <p className="rounded-lg bg-gold-400/10 px-3 py-2 text-xs text-amber-800">
                  Free delivery on orders above {formatPrice(FREE_DELIVERY_ABOVE)}. You're at {formatPrice(cart.subtotal)}.
                </p>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-slate-900">{formatPrice(cart.total)}</dd>
              </div>
            </dl>
            <button type="submit" className="btn-primary mt-5 w-full py-3" disabled={placing || anyOverStock || pending.size > 0}>
              {placing && <Spinner className="size-4" />}
              {placing ? 'Placing order…' : `Place Order · ${formatPrice(cart.total)}`}
            </button>
            {anyOverStock && <p className="mt-2 text-center text-xs text-red-600">Fix the stock issues above to continue.</p>}
          </section>
        </form>
      </div>
    </div>
  );
}
