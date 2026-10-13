import type { Item } from '@iitr/shared';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { ItemImage } from './ItemImage';
import { QuantityStepper } from './QuantityStepper';
import { PlusIcon } from './icons';
import { Spinner } from './Spinner';

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-white">Sold out</span>;
  if (stock <= 5) return <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">Only {stock} left</span>;
  return null;
}

export function ItemCard({ item }: { item: Item }) {
  const { quantityOf, pending, add, setQuantity, remove } = useCart();
  const inCart = quantityOf(item.id);
  const busy = pending.has(item.id);
  const outOfStock = item.stock === 0;

  return (
    <article className="card flex flex-col p-3 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <ItemImage name={item.name} category={item.category} imageUrl={item.imageUrl} dimmed={outOfStock} />
        <span className="absolute top-2 left-2">
          <StockBadge stock={item.stock} />
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{item.category}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-slate-900 sm:text-base">{item.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-bold text-slate-900">{formatPrice(item.price)}</span>
          {inCart > 0 ? (
            <QuantityStepper
              size="sm"
              quantity={inCart}
              max={item.stock}
              busy={busy}
              onChange={(q) => setQuantity(item.id, q).catch(() => {})}
              onRemove={() => remove(item.id).catch(() => {})}
            />
          ) : (
            <button
              type="button"
              className="btn border border-brand-200 bg-brand-50 px-3 py-1.5 text-brand-800 hover:border-brand-300 hover:bg-brand-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              disabled={outOfStock || busy}
              onClick={() => add(item.id, item.name).catch(() => {})}
              aria-label={outOfStock ? `${item.name} is sold out` : `Add ${item.name} to cart`}
            >
              {busy ? <Spinner className="size-4" /> : !outOfStock && <PlusIcon className="size-4" />}
              {outOfStock ? 'Sold out' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
