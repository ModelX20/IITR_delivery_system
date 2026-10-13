import { useState } from 'react';
import { categoryTile, itemIcon } from '../lib/itemVisual';

const ICON_SIZE = { lg: 'text-6xl', md: 'text-4xl', sm: 'text-2xl' } as const;

/**
 * The item's photo if it has one (and it loads); otherwise an illustrated tile.
 * Fills its parent, so the parent sets the size and corner radius.
 */
export function ItemImage({
  name,
  category,
  imageUrl,
  size = 'lg',
  dimmed = false,
}: {
  name: string;
  category: string;
  imageUrl: string;
  size?: keyof typeof ICON_SIZE;
  dimmed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const fade = dimmed ? 'opacity-50 grayscale' : '';

  if (imageUrl && !failed) {
    return <img src={imageUrl} alt={name} loading="lazy" onError={() => setFailed(true)} className={`size-full object-cover ${fade}`} />;
  }

  return (
    <div role="img" aria-label={name} className={`flex size-full items-center justify-center bg-gradient-to-br ${categoryTile(category)} ${fade}`}>
      <span className={`${ICON_SIZE[size]} drop-shadow-sm select-none`} aria-hidden="true">
        {itemIcon(name, category)}
      </span>
    </div>
  );
}
