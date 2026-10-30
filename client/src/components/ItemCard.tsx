import type { Item } from '@iitr/shared';
import { useCart } from '../context/CartContext';
import { formatPriceShort } from '../lib/format';
import { CATEGORY_ICONS } from '../lib/itemVisual';
import { ItemImage } from './ItemImage';
import { QuantityStepper } from './QuantityStepper';
import { Spinner } from './Spinner';

export function ItemCard({ item, showCategory = true }: { item: Item; showCategory?: boolean }) {
  const { quantityOf, pending, add, setQuantity, remove } = useCart();
  const inCart = quantityOf(item.id);
  const busy = pending.has(item.id);
  const outOfStock = item.stock === 0;
  const lowStock = !outOfStock && item.stock <= 5;

  return (
    <article className="group flex flex-col">
      <div className="relative">
        <div
          className={`aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5 transition duration-300 group-hover:shadow-float ${
            inCart > 0 ? 'ring-2 ring-brand-500/60' : ''
          }`}
        >
          <div className="size-full transition duration-500 group-hover:scale-105">
            <ItemImage name={item.name} category={item.category} imageUrl={item.imageUrl} dimmed={outOfStock} />
          </div>
        </div>

        {lowStock && (
          <span className="absolute top-2.5 left-0 rounded-r-md bg-brand-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase shadow-sm">
            Only {item.stock} left
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-ink/85 px-3 py-1 text-xs font-bold text-white">
            Sold out
          </span>
        )}

        {/* ADD button overlapping the bottom edge of the photo */}
        <div className="absolute inset-x-0 -bottom-4 flex justify-center">
          {inCart > 0 ? (
            <div className="animate-pop">
              <QuantityStepper
                size="sm"
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
              className="flex h-8 min-w-24 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-5 text-sm font-extrabold text-brand-600 uppercase shadow-[0_4px_12px_-4px_rgb(0_0_0/0.2)] transition hover:bg-brand-50 active:scale-95 disabled:cursor-not-allowed disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-white"
              disabled={outOfStock || busy}
              onClick={() => add(item.id).catch(() => {})}
              aria-label={outOfStock ? `${item.name} is sold out` : `Add ${item.name} to cart`}
            >
              {busy ? <Spinner className="size-4" /> : outOfStock ? 'Sold out' : 'Add'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col px-0.5">
        {showCategory && (
        <p className="mb-1.5 flex w-fit items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
          <span aria-hidden="true">{CATEGORY_ICONS[item.category] ?? '🛍️'}</span>
          {item.category}
        </p>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-ink">{item.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.description}</p>
        <p className="mt-auto pt-1.5 text-[15px] font-extrabold text-ink">{formatPriceShort(item.price)}</p>
      </div>
    </article>
  );
}
