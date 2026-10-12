import { MinusIcon, PlusIcon, TrashIcon } from './icons';

export function QuantityStepper({
  quantity,
  max,
  busy,
  onChange,
  onRemove,
  size = 'md',
}: {
  quantity: number;
  max: number;
  busy?: boolean;
  onChange: (quantity: number) => void;
  /** Called when "-" is pressed at quantity 1. */
  onRemove: () => void;
  size?: 'sm' | 'md';
}) {
  const btn = `flex items-center justify-center text-brand-700 transition hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent ${
    size === 'sm' ? 'size-8' : 'size-10'
  } [&_svg]:size-4`;

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-brand-200 bg-white">
      <button
        type="button"
        className={btn}
        disabled={busy}
        onClick={() => (quantity <= 1 ? onRemove() : onChange(quantity - 1))}
        aria-label={quantity <= 1 ? 'Remove from cart' : 'Decrease quantity'}
      >
        {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-slate-900" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={btn}
        disabled={busy || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        title={quantity >= max ? `Only ${max} in stock` : undefined}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
