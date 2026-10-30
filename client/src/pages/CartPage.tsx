import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BHAWANS, PAYMENT_METHOD_LABEL, placeOrderSchema, type OrderDetail, type PlaceOrderInput } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { BillDetails } from '../components/BillDetails';
import { EmptyState } from '../components/EmptyState';
import { Field, fieldProps } from '../components/Field';
import { ItemImage } from '../components/ItemImage';
import { QuantityStepper } from '../components/QuantityStepper';
import { FullPageSpinner, Spinner } from '../components/Spinner';
import { ArrowLeftIcon, CheckCircleIcon, MapPinIcon, PlusIcon, WalletIcon } from '../components/icons';
import { formatPrice } from '../lib/format';
import { PHOTOS, unsplash } from '../lib/photos';
import { validate, type FieldErrors } from '../lib/forms';

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5" aria-label={title}>
      <h2 className="mb-4 flex items-center gap-3 text-base font-extrabold text-ink">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CartPage() {
  const { user } = useAuth();
  const { cart, loading, pending, setQuantity, remove, refresh } = useCart();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<{ bhawan: string; roomNo: string; note: string }>({ bhawan: user?.bhawan ?? '', roomNo: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors<PlaceOrderInput>>({});
  const [placing, setPlacing] = useState(false);

  if (loading) return <FullPageSpinner />;

  if (cart.items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Your cart is empty"
        message="Good food and campus essentials are just a tap away. Add something and we'll bring it to your room."
        action={
          <Link to="/" className="btn-primary px-6">
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
    if (errors) {
      setErrors(errors);
      document.getElementById('delivery-address')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

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
  const disabled = placing || anyOverStock || pending.size > 0;
  const buttonLabel = placing ? 'Placing order…' : 'Place order';

  return (
    <form onSubmit={placeOrder} noValidate>
      <div className="mb-5 flex items-center gap-3">
        <Link to="/" className="flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-soft hover:bg-slate-50" aria-label="Back to shop">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Checkout</h1>
          <p className="text-sm text-slate-500">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · To pay {formatPrice(cart.total)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          {/* Items */}
          <section className="card overflow-hidden" aria-label="Cart items">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <img src={unsplash(PHOTOS.hero, 120, 120)} alt="" className="size-11 rounded-xl object-cover" />
              <div>
                <p className="font-extrabold text-ink">IITR Campus Store</p>
                <p className="text-xs text-slate-500">Delivering to {delivery.bhawan ? `${delivery.bhawan} Bhawan` : 'your bhawan'}</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {cart.items.map((line) => {
                const busy = pending.has(line.itemId);
                const overStock = line.quantity > line.stock;
                return (
                  <li key={line.itemId} className={`flex items-center gap-3 px-4 py-3.5 transition sm:px-5 ${busy ? 'opacity-60' : ''}`}>
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5">
                      <ItemImage name={line.name} category={line.category} imageUrl={line.imageUrl} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-bold text-ink">{line.name}</h3>
                      <p className="text-xs text-slate-500">{formatPrice(line.unitPrice)} each</p>
                      {overStock && (
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          {line.stock === 0 ? 'Out of stock. Please remove it.' : `Only ${line.stock} left. Please reduce the quantity.`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <QuantityStepper
                        size="sm"
                        quantity={line.quantity}
                        max={Math.max(line.stock, 1)}
                        busy={busy}
                        onChange={(q) => setQuantity(line.itemId, q).catch(() => {})}
                        onRemove={() => remove(line.itemId).catch(() => {})}
                      />
                      <p className="text-sm font-bold text-ink">{formatPrice(line.lineTotal)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link to="/" className="flex items-center gap-2 border-t border-dashed border-slate-200 px-4 py-3.5 text-sm font-bold text-brand-600 hover:bg-brand-50/50 sm:px-5">
              <PlusIcon className="size-4" />
              Add more items
            </Link>
          </section>

          {/* Address */}
          <div id="delivery-address">
            <Step icon={<MapPinIcon />} title="Delivery address">
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
                <Field id="note" label="Instructions for the delivery partner (optional)" error={errors.note}>
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
            </Step>
          </div>

          {/* Payment */}
          <Step icon={<WalletIcon />} title="Payment method">
            <div className="flex items-center gap-3 rounded-xl border-2 border-fresh-500 bg-fresh-50/60 p-3.5">
              <span className="text-2xl" aria-hidden="true">
                💵
              </span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-ink">{PAYMENT_METHOD_LABEL}</p>
                <p className="text-xs text-slate-500">Pay in cash when your order arrives</p>
              </div>
              <CheckCircleIcon className="size-6 text-fresh-500" />
            </div>
          </Step>
        </div>

        {/* Bill */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="card p-4 sm:p-5" aria-label="Order summary">
            <BillDetails
              subtotal={cart.subtotal}
              deliveryFee={cart.deliveryFee}
              total={cart.total}
              itemCount={cart.itemCount}
              showFreeDeliveryProgress
            />
            <button type="submit" className="btn-primary mt-5 hidden w-full py-3.5 text-base lg:flex" disabled={disabled}>
              {placing && <Spinner className="size-4" />}
              {buttonLabel} · {formatPrice(cart.total)}
            </button>
            {anyOverStock && <p className="mt-2 text-center text-xs font-semibold text-red-600">Fix the stock issues above to continue.</p>}
          </section>
          <p className="px-2 text-xs leading-relaxed text-slate-500">
            <span className="font-bold text-slate-600">Cancellation policy:</span> you can cancel your order for free until the store confirms it.
          </p>
        </aside>
      </div>

      {/* Sticky pay bar on phones and tablets */}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-20 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)] md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0">
            <p className="text-lg leading-tight font-extrabold text-ink">{formatPrice(cart.total)}</p>
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">To pay · Cash</p>
          </div>
          <button type="submit" className="btn-primary ml-auto flex-1 py-3.5 text-base sm:max-w-xs" disabled={disabled}>
            {placing && <Spinner className="size-4" />}
            {buttonLabel}
          </button>
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </form>
  );
}
