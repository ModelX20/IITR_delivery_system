import type { Item } from '@iitr/shared';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { QuantityStepper } from './QuantityStepper';
import { CartIcon } from './icons';
import { Spinner } from './Spinner';

function StockLabel({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-xs font-medium text-red-600">Out of stock</span>;
  if (stock <= 5) return <span className="text-xs font-medium text-amber-700">Only {stock} left</span>;
  return <span className="text-xs font-medium text-emerald-700">In stock</span>;
}

export function ItemCard({ item }: { item: Item }) {
  const { quantityOf, pending, add, setQuantity, remove } = useCart();
  const inCart = quantityOf(item.id);
  const busy = pending.has(item.id);
  const outOfStock = item.stock === 0;

  return (
    <article className="card flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-slate-100">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className={`size-full object-cover ${outOfStock ? 'opacity-50 grayscale' : ''}`}
        />
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-snug text-slate-900">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-lg font-bold text-brand-800">{formatPrice(item.price)}</span>
          <StockLabel stock={item.stock} />
        </div>

        <div className="mt-4 pt-0">
          {inCart > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-600">In cart</span>
              <QuantityStepper
                quantity={inCart}
                max={item.stock}
                busy={busy}
                onChange={(q) => setQuantity(item.id, q).catch(() => {})}
                onRemove={() => remove(item.id).catch(() => {})}
              />
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={outOfStock || busy}
              onClick={() => add(item.id, item.name).catch(() => {})}
            >
              {busy ? <Spinner className="size-4" /> : <CartIcon className="size-4" />}
              {outOfStock ? 'Out of stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
