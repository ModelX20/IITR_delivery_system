import { MinusIcon, PlusIcon } from './icons';

/** Green "− 2 +" stepper, shown in place of the ADD button once an item is in the cart. */
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
  const btn = `flex items-center justify-center text-white transition hover:bg-black/10 disabled:opacity-40 disabled:hover:bg-transparent ${
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  } [&_svg]:size-4 [&_svg]:stroke-[3]`;

  return (
    <div className={`inline-flex items-center overflow-hidden rounded-lg bg-brand-600 shadow-sm shadow-brand-600/30 ${busy ? 'opacity-80' : ''}`}>
      <button
        type="button"
        className={btn}
        disabled={busy}
        onClick={() => (quantity <= 1 ? onRemove() : onChange(quantity - 1))}
        aria-label={quantity <= 1 ? 'Remove from cart' : 'Decrease quantity'}
      >
        <MinusIcon />
      </button>
      <span className="min-w-6 text-center text-sm font-extrabold text-white tabular-nums" aria-live="polite">
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
